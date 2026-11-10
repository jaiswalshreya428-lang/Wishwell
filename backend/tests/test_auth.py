"""
Authentication Tests
Validates self-registration restrictions, bcrypt verification, short-lived JWT,
rate limiting, generic error messages, and failed login audit logging.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from app.models.entities import AuditLog
from tests.conftest import TestAsyncSessionLocal

@pytest.mark.asyncio
async def test_donor_self_registration_success(async_client: AsyncClient):
    """Proves: A donor can self-register and receives an active JWT token."""
    payload = {
        "email": "newdonor@example.com",
        "password": "Password123!",
        "full_name": "New Donor",
        "role": "donor"
    }
    response = await async_client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "newdonor@example.com"
    assert data["user"]["role"] == "donor"

@pytest.mark.asyncio
async def test_institution_self_registration_success(async_client: AsyncClient):
    """Proves: An institution can self-register, creating linked profile in pending state."""
    payload = {
        "email": "newhome@example.com",
        "password": "Password123!",
        "full_name": "Father John",
        "role": "institution",
        "institution": {
            "name": "New Hope Orphanage",
            "registration_number": "REG-TEST-9999",
            "address": "45 Charity Road",
            "city": "Bengaluru",
            "state": "Karnataka",
            "postal_code": "560001",
            "phone": "+91 80 9876 5432",
            "description": "Safe haven for children."
        }
    }
    response = await async_client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "institution"
    assert data["user"]["institution"]["name"] == "New Hope Orphanage"
    assert data["user"]["institution"]["status"] == "pending"

@pytest.mark.asyncio
async def test_admin_self_registration_forbidden(async_client: AsyncClient):
    """Proves: Self-registration as admin is forbidden (403)."""
    payload = {
        "email": "fakeadmin@example.com",
        "password": "Password123!",
        "full_name": "Fake Admin",
        "role": "admin"
    }
    response = await async_client.post("/api/auth/register", json=payload)
    assert response.status_code == 403
    assert "restricted" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_verifier_self_registration_forbidden(async_client: AsyncClient):
    """Proves: Self-registration as verifier is forbidden (403)."""
    payload = {
        "email": "fakeverifier@example.com",
        "password": "Password123!",
        "full_name": "Fake Verifier",
        "role": "verifier"
    }
    response = await async_client.post("/api/auth/register", json=payload)
    assert response.status_code == 403
    assert "restricted" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_duplicate_email_registration_conflict(async_client: AsyncClient):
    """Proves: Registering with an existing email returns 409 Conflict."""
    payload = {
        "email": "donor@wishwell.org", # Already seeded in conftest
        "password": "Password123!",
        "full_name": "Duplicate Donor",
        "role": "donor"
    }
    response = await async_client.post("/api/auth/register", json=payload)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_login_success(async_client: AsyncClient):
    """Proves: Correct credentials return valid JWT token."""
    response = await async_client.post("/api/auth/login", json={
        "email": "donor@wishwell.org",
        "password": "Password123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "donor@wishwell.org"

@pytest.mark.asyncio
async def test_login_wrong_password_generic_error_and_audit(async_client: AsyncClient):
    """
    Proves:
    1. Wrong password returns generic 401 error (preventing user enumeration).
    2. Writes an entry to audit_log table.
    """
    response = await async_client.post("/api/auth/login", json={
        "email": "donor@wishwell.org",
        "password": "WrongPassword!"
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"

    # Verify audit_log entry in database
    async with TestAsyncSessionLocal() as session:
        stmt = select(AuditLog).where(AuditLog.action == "LOGIN_FAILED")
        result = await session.execute(stmt)
        logs = result.scalars().all()
        assert len(logs) > 0
        last_details = logs[-1].details or ""
        assert "donor@wishwell.org" in last_details

@pytest.mark.asyncio
async def test_login_nonexistent_email_generic_error(async_client: AsyncClient):
    """Proves: Non-existent email returns identical generic 401 error."""
    response = await async_client.post("/api/auth/login", json={
        "email": "ghost@wishwell.org",
        "password": "Password123!"
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"

@pytest.mark.asyncio
async def test_login_rate_limiting(async_client: AsyncClient):
    """Proves: More than 5 failed login attempts trigger HTTP 429 Too Many Requests."""
    for attempt in range(5):
        res = await async_client.post("/api/auth/login", json={
            "email": "donor@wishwell.org",
            "password": f"WrongAttempt{attempt}"
        })
        assert res.status_code == 401

    # 6th attempt should be blocked by rate limiter
    blocked_res = await async_client.post("/api/auth/login", json={
        "email": "donor@wishwell.org",
        "password": "WrongAttempt6"
    })
    assert blocked_res.status_code == 429
    assert "too many" in blocked_res.json()["detail"].lower()

@pytest.mark.asyncio
async def test_me_endpoint_success(async_client: AsyncClient, donor_token: str):
    """Proves: Valid token grants access to /me endpoint."""
    response = await async_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {donor_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "donor@wishwell.org"
    assert data["role"] == "donor"

@pytest.mark.asyncio
async def test_me_endpoint_unauthenticated_fails(async_client: AsyncClient):
    """Proves: Unauthenticated request to /me gets 401."""
    response = await async_client.get("/api/auth/me")
    assert response.status_code == 401
