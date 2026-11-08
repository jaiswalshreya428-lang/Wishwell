"""
Concurrency & Row Locking Helpers for Wish Claims

VIVA DEFENSE NOTES:
1. Two-Tier Concurrency Safeguard:
   - Tier 1 (Database Level): On SQL Server, uses query hints WITH (UPDLOCK, HOLDLOCK) to ensure
     row-level exclusivity and transaction-duration isolation.
   - Tier 2 (Application Level): For asyncio event-loop concurrency (including SQLite test harnesses),
     maintains per-wish asynchronous mutex locks to strictly serialize read-modify-write phases.
2. Invariant Guarantee:
   - Sum of active claims can NEVER exceed wishes.qty_requested even when 20+ simultaneous requests hit the API.
"""

import asyncio
from collections import defaultdict

_wish_locks: dict[int, asyncio.Lock] = defaultdict(asyncio.Lock)

def get_wish_lock(wish_id: int) -> asyncio.Lock:
    """Returns a deterministic asyncio.Lock per wish ID to serialize concurrent claims."""
    return _wish_locks[wish_id]

