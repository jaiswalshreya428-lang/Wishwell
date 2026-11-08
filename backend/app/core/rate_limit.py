"""
In-Memory Rate Limiting for Authentication Endpoints

VIVA NOTES:
- Rate limiting defends the login route against automated brute-force attacks,
  credential stuffing, and dictionary guessing.
- Uses a sliding window algorithm to enforce a maximum number of attempts
  per IP/identity within a designated time window (e.g. 5 attempts in 60 seconds).
- Kept lightweight and dependency-free to maintain code simplicity and readability.
"""

import time
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, status

class LoginRateLimiter:
    def __init__(self, max_attempts: int = 5, window_seconds: int = 60):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        # Maps client key (e.g. client_ip) to list of epoch timestamps
        self._attempts: Dict[str, List[float]] = defaultdict(list)

    def is_rate_limited(self, key: str) -> bool:
        """
        Checks whether the specified key has exceeded the maximum attempts
        within the sliding time window. Prunes expired timestamps.
        """
        now = time.time()
        window_start = now - self.window_seconds
        
        # Filter out timestamps older than the active window
        valid_attempts = [ts for ts in self._attempts[key] if ts > window_start]
        self._attempts[key] = valid_attempts

        return len(valid_attempts) >= self.max_attempts

    def record_attempt(self, key: str):
        """
        Records a new attempt for the key.
        """
        now = time.time()
        self._attempts[key].append(now)

    def check_and_record(self, key: str):
        """
        Validates rate limit. If exceeded, raises HTTP 429 Too Many Requests.
        Otherwise, records the current attempt.
        """
        if self.is_rate_limited(key):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many login attempts. Please wait {self.window_seconds} seconds before trying again."
            )
        self.record_attempt(key)

    def reset(self, key: str):
        """Resets recorded attempts for a key after successful authentication."""
        if key in self._attempts:
            del self._attempts[key]

# Global singleton instance for auth rate limiting (5 attempts per minute)
login_rate_limiter = LoginRateLimiter(max_attempts=5, window_seconds=60)

