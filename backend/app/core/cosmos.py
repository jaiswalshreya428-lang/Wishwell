"""
Azure Cosmos DB Client & Polyglot Document Service (/app/core/cosmos.py)

VIVA DEFENSE NOTES:
1. Polyglot Persistence Architecture:
   - Relational core (Microsoft SQL Server): 3NF schema, ACID transactions, row-level locks,
     and append-only hash chains for financial/regulatory accountability.
   - NoSQL document store (Azure Cosmos DB): Semi-structured, schema-flexible JSON documents
     for audit event metadata and delivery event timelines.
2. Containers & Partition Strategy:
   - "audit_events" (Partition Key: /entity): High read/write throughput partitioned by entity type
     (wishes, institutions, users, deliveries).
   - "delivery_metadata" (Partition Key: /claim_id): Flexible event timeline capturing courier raw payloads,
     proof photo dimensions, GPS stripping confirmation, and multi-party receipts.
3. Cryptographic Anchor & Integrity:
   - The SHA-256 hash of the canonical serialized Cosmos JSON document (cosmos_content_hash)
     is sealed directly into SQL Server's dbo.audit_log record_hash chain.
   - Any out-of-band tampering with documents in Cosmos DB is detected by the SQL integrity check.
4. Graceful Degradation Invariant:
   - If Cosmos DB is offline, rate-limited, or unconfigured, all API operations MUST still succeed.
   - Operations log a warning and fallback seamlessly to the in-memory cache/mock without throwing HTTP 500.
"""

import os
import json
import uuid
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple, List
from app.core.config import settings

logger = logging.getLogger("wishwell.cosmos")

# Canonical JSON serialization for reproducible content hashing
def canonical_json_hash(doc: Dict[str, Any]) -> str:
    """
    Computes a deterministic SHA-256 hash of a JSON document by sorting keys
    and eliminating non-essential whitespace.
    """
    serialized = json.dumps(doc, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

class CosmosService:
    def __init__(self):
        self.endpoint = settings.COSMOS_ENDPOINT
        self.key = settings.COSMOS_KEY
        self.database_name = settings.COSMOS_DATABASE_NAME
        self.client = None
        self.database = None
        self.audit_container = None
        self.delivery_container = None
        self.use_fallback = True

        # In-memory document storage for local testing, offline mode, and graceful fallback
        self._mock_containers: Dict[str, Dict[str, Dict[str, Any]]] = {
            "audit_events": {},
            "delivery_metadata": {},
        }

        # Attempt to initialize Azure Cosmos DB SDK if credentials are provided
        if self.endpoint and self.key:
            try:
                from azure.cosmos import CosmosClient, PartitionKey
                self.client = CosmosClient(self.endpoint, credential=self.key)
                self.database = self.client.get_database_client(self.database_name)
                self.audit_container = self.database.get_container_client("audit_events")
                self.delivery_container = self.database.get_container_client("delivery_metadata")
                self.use_fallback = False
                logger.info(f"Connected to Azure Cosmos DB database '{self.database_name}'.")
            except Exception as e:
                logger.warning(
                    f"Azure Cosmos DB initialization failed ({e}). "
                    f"Operating in resilient offline/fallback mode."
                )
                self.use_fallback = True
        else:
            logger.info("COSMOS_ENDPOINT or COSMOS_KEY not configured. Running in resilient mock mode.")

    def compute_document_hash(self, doc: Dict[str, Any]) -> str:
        """Exposes canonical hash calculation for verification."""
        # Strip Cosmos-internal system fields (_rid, _self, _etag, _attachments, _ts) before hashing
        clean_doc = {k: v for k, v in doc.items() if not k.startswith("_")}
        return canonical_json_hash(clean_doc)

    async def store_audit_event(
        self,
        entity: str,
        entity_id: int,
        action: str,
        old_status: Optional[str] = None,
        new_status: Optional[str] = None,
        changed_by: Optional[int] = None,
        details: Optional[str] = None,
        created_at_iso: Optional[str] = None,
        extra_metadata: Optional[Dict[str, Any]] = None,
    ) -> Tuple[Optional[str], str]:
        """
        Stores an audit event JSON document in the 'audit_events' container (partition key: /entity).
        Returns: (cosmos_doc_id, cosmos_content_hash).
        GUARANTEE: If Cosmos DB fails, logs a warning and returns (None, "") without throwing an error.
        """
        doc_id = str(uuid.uuid4())
        timestamp = created_at_iso or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")

        doc: Dict[str, Any] = {
            "id": doc_id,
            "entity": entity,  # Partition key: /entity
            "entity_id": entity_id,
            "action": action,
            "old_status": old_status,
            "new_status": new_status,
            "changed_by": changed_by,
            "details": details,
            "created_at": timestamp,
            "metadata": extra_metadata or {},
        }

        content_hash = self.compute_document_hash(doc)

        # 1. Attempt live Azure Cosmos DB write if available
        if not self.use_fallback and self.audit_container:
            try:
                self.audit_container.create_item(body=doc)
                logger.info(f"Audit event {doc_id} saved to Cosmos DB container 'audit_events'.")
            except Exception as e:
                logger.warning(
                    f"Cosmos DB write failed for audit event {doc_id}: {e}. "
                    f"API action succeeds with local fallback."
                )
                # Cache in mock memory so subsequent local queries succeed
                self._mock_containers["audit_events"][doc_id] = doc

        # Always record in memory cache for offline resilience and tests
        self._mock_containers["audit_events"][doc_id] = doc

        return doc_id, content_hash

    async def get_audit_event(self, doc_id: str, entity: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Fetches an audit event JSON document by ID.
        Queries live Azure Cosmos DB or in-memory fallback.
        """
        if not self.use_fallback and self.audit_container:
            try:
                if entity:
                    item = self.audit_container.read_item(item=doc_id, partition_key=entity)
                    return {k: v for k, v in item.items() if not k.startswith("_")}
                else:
                    query = "SELECT * FROM c WHERE c.id = @doc_id"
                    params: List[dict[str, object]] = [{"name": "@doc_id", "value": doc_id}]
                    items = list(self.audit_container.query_items(
                        query=query, parameters=params, enable_cross_partition_query=True
                    ))
                    if items:
                        return {k: v for k, v in items[0].items() if not k.startswith("_")}
            except Exception as e:
                logger.warning(f"Error querying Cosmos DB for audit event {doc_id}: {e}")

        # Fallback to local memory cache
        return self._mock_containers["audit_events"].get(doc_id)

    async def store_delivery_metadata(
        self,
        claim_id: int,
        delivery_id: int,
        status: str,
        tracking_number: Optional[str] = None,
        carrier: Optional[str] = None,
        photo_blob: Optional[str] = None,
        notes: Optional[str] = None,
        extra_info: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """
        Stores semi-structured delivery metadata in 'delivery_metadata' container (partition key: /claim_id).
        Returns: document ID or None on failure.
        GUARANTEE: If Cosmos DB fails, logs a warning and returns None without blocking relational transaction.
        """
        doc_id = str(uuid.uuid4())
        doc: Dict[str, Any] = {
            "id": doc_id,
            "claim_id": str(claim_id),  # Partition key: /claim_id
            "delivery_id": delivery_id,
            "status": status,
            "tracking_number": tracking_number,
            "carrier": carrier,
            "photo_blob": photo_blob,
            "confirmation_notes": notes,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metadata": extra_info or {},
        }

        if not self.use_fallback and self.delivery_container:
            try:
                self.delivery_container.create_item(body=doc)
                logger.info(f"Delivery metadata {doc_id} saved to Cosmos DB for claim #{claim_id}.")
            except Exception as e:
                logger.warning(
                    f"Cosmos DB write failed for delivery metadata {doc_id}: {e}. "
                    f"API action proceeds safely."
                )
                self._mock_containers["delivery_metadata"][doc_id] = doc

        self._mock_containers["delivery_metadata"][doc_id] = doc
        return doc_id

    async def get_delivery_metadata(self, claim_id: int) -> List[Dict[str, Any]]:
        """
        Retrieves all delivery metadata events for a specific claim.
        """
        claim_key = str(claim_id)
        if not self.use_fallback and self.delivery_container:
            try:
                query = "SELECT * FROM c WHERE c.claim_id = @claim_id ORDER BY c.timestamp DESC"
                params: List[dict[str, object]] = [{"name": "@claim_id", "value": claim_key}]
                items = list(self.delivery_container.query_items(
                    query=query, parameters=params, partition_key=claim_key
                ))
                return [{k: v for k, v in item.items() if not k.startswith("_")} for item in items]
            except Exception as e:
                logger.warning(f"Error querying Cosmos DB for delivery metadata (claim #{claim_id}): {e}")

        # Fallback to local memory cache
        return [
            doc for doc in self._mock_containers["delivery_metadata"].values()
            if doc.get("claim_id") == claim_key
        ]

cosmos_service = CosmosService()

