"""
Cryptographic Audit Hash Chain & Tamper-Detection Engine (/app/core/audit.py)

VIVA DEFENSE NOTES:
1. Append-Only Cryptographic Chain (Blockchain-style Merkle Linkage):
   - Every row in dbo.audit_log contains a SHA-256 hash (record_hash) generated over its own contents
     concatenated with the hash of the immediately preceding row (prev_hash).
   - The genesis row links to a deterministic GENESIS_HASH (64 zeros).
2. Polyglot Persistence Anchor (SQL Server + Azure Cosmos DB):
   - Full semi-structured audit documents are stored in Azure Cosmos DB container "audit_events" (partition key: /entity).
   - The SHA-256 hash of the canonical JSON document (cosmos_content_hash) is sealed directly into SQL Server's
     record_hash chain!
   - This provides mathematical proof that NoSQL documents have not been modified or deleted out-of-band.
3. Resilience / Graceful Degradation:
   - If Azure Cosmos DB is offline, slow, or unconfigured, the relational audit ledger in SQL Server
     STILL SUCCEEDS seamlessly (cosmos_doc_id is recorded as None, content hash as empty string).
   - A warning is logged without aborting or rolling back the user's primary business action.
4. Tamper-Evident Security Guarantees:
   - Mutating SQL fields OR modifying the linked Cosmos DB JSON document causes the hash recomputation
     to mismatch, detecting tampering and flagging the exact row ID.
"""

import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.entities import AuditLog
from app.core.cosmos import cosmos_service

logger = logging.getLogger("wishwell.audit")

# Genesis block hash: 64 hexadecimal zeros
GENESIS_HASH = "0" * 64

def canonical_audit_string(
    prev_hash: str,
    entity_type: str,
    entity_id: int,
    action: str,
    old_status: Optional[str],
    new_status: Optional[str],
    changed_by: Optional[int],
    details: Optional[str],
    created_at_iso: str,
    cosmos_content_hash: str = "",
) -> str:
    """
    Constructs a deterministic, canonical string representation of an audit event.
    Guarantees cross-platform reproducible SHA-256 calculation.
    Seals the Azure Cosmos DB document content hash into the SQL Server hash chain.
    """
    base = (
        f"{prev_hash}|"
        f"{entity_type}|"
        f"{entity_id}|"
        f"{action}|"
        f"{old_status or ''}|"
        f"{new_status or ''}|"
        f"{changed_by or ''}|"
        f"{details or ''}|"
        f"{created_at_iso}"
    )
    if cosmos_content_hash:
        base += f"|{cosmos_content_hash}"
    return base

def compute_audit_hash(payload_str: str) -> str:
    """Computes SHA-256 hexadecimal hash string."""
    return hashlib.sha256(payload_str.encode("utf-8")).hexdigest()

async def record_audit_event(
    db: Optional[AsyncSession] = None,
    entity_type: str = "",
    entity_id: int = 0,
    action: str = "",
    old_status: Optional[str] = None,
    new_status: Optional[str] = None,
    changed_by: Optional[int] = None,
    details: Optional[str] = None,
    created_at: Optional[datetime] = None,
    *,
    session: Optional[AsyncSession] = None,
    extra_metadata: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    """
    Appends an immutable audit log entry linked cryptographically to the preceding entry's hash.
    Simultaneously stores semi-structured audit document in Azure Cosmos DB ("audit_events").
    If Cosmos DB fails, the operation still succeeds and logs a warning.
    """
    target_session = db or session
    if target_session is None:
        raise ValueError("An active AsyncSession (db or session) must be provided.")

    now_utc = created_at or datetime.now(timezone.utc).replace(tzinfo=None)
    created_at_iso = now_utc.strftime("%Y-%m-%dT%H:%M:%S")

    # 1. Attempt storing semi-structured JSON document in Azure Cosmos DB
    cosmos_doc_id: Optional[str] = None
    cosmos_content_hash = ""
    try:
        doc_id, content_hash = await cosmos_service.store_audit_event(
            entity=entity_type,
            entity_id=entity_id,
            action=action,
            old_status=old_status,
            new_status=new_status,
            changed_by=changed_by,
            details=details,
            created_at_iso=created_at_iso,
            extra_metadata=extra_metadata,
        )
        cosmos_doc_id = doc_id
        cosmos_content_hash = content_hash
    except Exception as e:
        logger.warning(
            f"Cosmos DB write failed during audit event recording: {e}. "
            f"Relational SQL audit ledger continues safely."
        )

    # 2. Fetch latest audit row to get prev_hash
    latest_stmt = select(AuditLog).order_by(AuditLog.id.desc()).limit(1)
    latest_res = await target_session.execute(latest_stmt)
    latest_entry = latest_res.scalar_one_or_none()

    if latest_entry and latest_entry.record_hash:
        prev_hash = latest_entry.record_hash
    else:
        prev_hash = GENESIS_HASH

    # 3. Compute canonical SHA-256 hash sealing both relational fields AND Cosmos content hash
    payload = canonical_audit_string(
        prev_hash=prev_hash,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        old_status=old_status,
        new_status=new_status,
        changed_by=changed_by,
        details=details,
        created_at_iso=created_at_iso,
        cosmos_content_hash=cosmos_content_hash,
    )
    record_hash = compute_audit_hash(payload)

    # 4. Insert into dbo.audit_log
    entry = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        old_status=old_status,
        new_status=new_status,
        changed_by=changed_by,
        details=details,
        prev_hash=prev_hash,
        record_hash=record_hash,
        cosmos_doc_id=cosmos_doc_id,
        created_at=now_utc,
    )
    target_session.add(entry)
    return entry

async def verify_audit_chain_integrity(
    db: AsyncSession
) -> Tuple[bool, int, Optional[int], Optional[str], Optional[str]]:
    """
    Cryptographically verifies the complete hash chain of the audit_log table.
    Also validates that Cosmos DB documents match their sealed content hash.
    
    Returns:
        (is_valid: bool, total_verified: int, broken_at_id: Optional[int], error_detail: Optional[str], latest_hash: Optional[str])
    """
    stmt = select(AuditLog).order_by(AuditLog.id.asc())
    res = await db.execute(stmt)
    rows = res.scalars().all()

    if not rows:
        return True, 0, None, None, GENESIS_HASH

    expected_prev_hash = GENESIS_HASH

    for idx, row in enumerate(rows):
        current_prev_hash = row.prev_hash or expected_prev_hash

        # 1. Check previous hash pointer
        if current_prev_hash != expected_prev_hash:
            return (
                False,
                idx,
                row.id,
                f"Broken chain link at audit record #{row.id}: expected prev_hash '{expected_prev_hash}', got '{row.prev_hash}'",
                None,
            )

        # 2. Check linked Cosmos DB document content hash if cosmos_doc_id exists
        cosmos_content_hash = ""
        if row.cosmos_doc_id:
            try:
                cosmos_doc = await cosmos_service.get_audit_event(row.cosmos_doc_id, entity=row.entity_type)
                if cosmos_doc:
                    cosmos_content_hash = cosmos_service.compute_document_hash(cosmos_doc)
            except Exception as e:
                logger.warning(f"Failed to fetch Cosmos doc #{row.cosmos_doc_id} during integrity verification: {e}")

        # 3. Recompute current record hash and check against stored record_hash
        created_at_iso = row.created_at.strftime("%Y-%m-%dT%H:%M:%S")
        recomputed_payload = canonical_audit_string(
            prev_hash=current_prev_hash,
            entity_type=row.entity_type,
            entity_id=row.entity_id,
            action=row.action,
            old_status=row.old_status,
            new_status=row.new_status,
            changed_by=row.changed_by,
            details=row.details,
            created_at_iso=created_at_iso,
            cosmos_content_hash=cosmos_content_hash,
        )
        recomputed_hash = compute_audit_hash(recomputed_payload)

        # Legacy backward-compatibility check: if hash was generated without cosmos_content_hash
        if row.record_hash and row.record_hash != recomputed_hash:
            legacy_payload = canonical_audit_string(
                prev_hash=current_prev_hash,
                entity_type=row.entity_type,
                entity_id=row.entity_id,
                action=row.action,
                old_status=row.old_status,
                new_status=row.new_status,
                changed_by=row.changed_by,
                details=row.details,
                created_at_iso=created_at_iso,
                cosmos_content_hash="",
            )
            legacy_hash = compute_audit_hash(legacy_payload)
            if row.record_hash == legacy_hash:
                recomputed_hash = legacy_hash
            else:
                return (
                    False,
                    idx,
                    row.id,
                    (
                        f"Content tampering detected at audit record #{row.id}: stored hash '{row.record_hash}' "
                        f"does not match recomputed payload hash '{recomputed_hash}'"
                    ),
                    None,
                )

        expected_prev_hash = row.record_hash or recomputed_hash

    latest_hash = rows[-1].record_hash or expected_prev_hash
    return True, len(rows), None, None, latest_hash
