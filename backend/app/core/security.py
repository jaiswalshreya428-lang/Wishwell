"""
Security & Authentication Utilities
Implements direct bcrypt password hashing and short-lived JWT token management.

ARCHITECTURE NOTES:
- bcrypt automatically incorporates a cryptographically random salt and an
  adaptive work factor (cost) to protect against offline dictionary/rainbow attacks.
- Direct bcrypt usage avoids passlib 1.7.4 compatibility quirks with bcrypt >= 4.0.
- Short-lived JWTs (default 15 minutes) limit the vulnerability window if a bearer
  token is intercepted.
"""

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import bcrypt
import jwt
from app.core.config import settings

def hash_password(password: str) -> str:
    """
    Hashes a plain-text password using bcrypt with a generated salt.
    """
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain-text password against a stored bcrypt hash.
    Constant-time comparison built into bcrypt defends against timing attacks.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Generates a cryptographically signed, short-lived JWT access token.
    Claims:
      - sub: user_id (string representation)
      - email: user email
      - role: user RBAC role ('donor', 'institution', 'verifier', 'admin')
      - iat: issued-at timestamp
      - exp: expiration timestamp
    """
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        # Default short-lived token: 15 minutes
        expire = now + timedelta(minutes=15)
    
    to_encode.update({
        "exp": expire,
        "iat": now
    })

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt

def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decodes and validates JWT token signature and expiration.
    Raises jwt.PyJWTError on failure.
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM]
    )


def password_fingerprint(password_hash: str) -> str:
    """Short fingerprint of the current bcrypt hash so reset tokens are single-use."""
    return hashlib.sha256(password_hash.encode("utf-8")).hexdigest()[:16]


def create_password_reset_token(user_id: int, email: str, current_password_hash: str) -> str:
    """Generates a single-use, 15-minute JWT specifically scoped for password resets."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "purpose": "password_reset",
        "pw_fp": password_fingerprint(current_password_hash),
        "iat": now,
        "exp": now + timedelta(minutes=15),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_password_reset_token(token: str) -> Dict[str, Any]:
    """Decodes a password-reset token and verifies its purpose claim."""
    payload = decode_access_token(token)
    if payload.get("purpose") != "password_reset":
        raise jwt.InvalidTokenError("Token is not a password reset token.")
    return payload
