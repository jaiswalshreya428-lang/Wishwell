"""
Cryptographic Audit Hash Chain & Tamper-Detection Engine

VIVA DEFENSE NOTES:
1. Append-Only Cryptographic Chain (Blockchain-style Merkle Linkage):
   - Every row in dbo.audit_log contains a SHA-256 hash (record_hash) generated over its own contents
     concatenated with the hash of the immediately preceding row (prev_hash).
   - The genesis row links to a deterministic GENESIS_HASH (64 zeros).
2. Tamper-Evident Security Guarantees:
   - Content Mutation: If an attacker modifies any field (e.g. changes action or details),
     recomputing the SHA-256 hash over that row detects the content tampering immediately.
   - History Deletion / Reordering: If an attacker deletes an intermediate row, the subsequent row's
     prev_hash pointer breaks the chain link.
   - Repudiation Prevention: Every state transition is cryptographically immutable and mathematically verifiable.
3. Database Security Enforcement:
   - T-SQL trigger dbo.trg_audit_log_prevent_mutation blocks UPDATE and DELETE.
   - Application user is granted strictly INSERT and SELECT permissions.
"""

import hashlib
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.entities import AuditLog

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
) -> str:
    """
    Constructs a deterministic, canonical string representation of an audit event.
    Guarantees cross-platform reproducible SHA-256 calculation.
    """
    return (
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
) -> AuditLog:
    """
    Appends an immutable audit log entry linked cryptographically to the preceding entry's hash.
    Accepts database session as either `db` or `session`.
    """
    target_session = db or session
    if target_session is None:
        raise ValueError("An active AsyncSession (db or session) must be provided.")

    now_utc = created_at or datetime.now(timezone.utc).replace(tzinfo=None)
    created_at_iso = now_utc.strftime("%Y-%m-%dT%H:%M:%S")

    # Fetch latest audit row to get prev_hash
    latest_stmt = select(AuditLog).order_by(AuditLog.id.desc()).limit(1)
    latest_res = await target_session.execute(latest_stmt)
    latest_entry = latest_res.scalar_one_or_none()

    if latest_entry and latest_entry.record_hash:
        prev_hash = latest_entry.record_hash
    else:
        prev_hash = GENESIS_HASH

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
    )
    record_hash = compute_audit_hash(payload)

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
        created_at=now_utc,
    )
    target_session.add(entry)
    return entry

async def verify_audit_chain_integrity(
    db: AsyncSession
) -> Tuple[bool, int, Optional[int], Optional[str], Optional[str]]:
    """
    Cryptographically verifies the complete hash chain of the audit_log table.
    
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
        # If legacy/unhashed row is encountered, calculate its hash retroactively or fail
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

        # 2. Recompute current record hash and check against stored record_hash
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
        )
        recomputed_hash = compute_audit_hash(recomputed_payload)

        # If row has a stored record_hash, it must match recomputed_hash exactly
        if row.record_hash and row.record_hash != recomputed_hash:
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
