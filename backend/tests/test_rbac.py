"""
RBAC & Authorization Tests
Explicitly verifies all required role constraints:
1. A donor cannot call institution endpoints (403 Forbidden).
2. A verifier cannot approve (only recommend) (403 Forbidden).
3. An unauthenticated request gets 401 Unauthorized.
"""

import pytest
from httpx import AsyncClient

# ==============================================================================
# 1. Unauthenticated Request Gets 401
# ==============================================================================
@pytest.mark.asyncio
async def test_unauthenticated_request_returns_401(async_client: AsyncClient):
    """Proves: Any protected endpoint without Authorization header gets 401 Unauthorized."""
    endpoints = [
        ("GET", "/api/auth/me"),
        ("GET", "/api/institutions/portal"),
        ("POST", "/api/verifications/1/recommend"),
        ("POST", "/api/verifications/1/approve"),
    ]
    for method, url in endpoints:
        if method == "GET":
            res = await async_client.get(url)
        else:
            res = await async_client.post(url, json={"reason": "Test reason"})
        assert res.status_code == 401, f"Expected 401 for unauthenticated {method} {url}, got {res.status_code}"
        assert "authentication required" in res.json()["detail"].lower() or "not authenticated" in res.json()["detail"].lower()

# ==============================================================================
# 2. Donor Cannot Call Institution Endpoints
# ==============================================================================
@pytest.mark.asyncio
async def test_donor_cannot_call_institution_endpoints(
    async_client: AsyncClient,
    donor_token: str
):
    """Proves: A user with role 'donor' receives HTTP 403 when accessing an institution endpoint."""
    response = await async_client.get(
        "/api/institutions/portal",
        headers={"Authorization": f"Bearer {donor_token}"}
    )
    assert response.status_code == 403
    detail = response.json()["detail"]
    assert "access forbidden" in detail.lower()
    assert "donor" in detail.lower()

@pytest.mark.asyncio
async def test_institution_can_call_institution_endpoint(
    async_client: AsyncClient,
    institution_token: str
):
    """Proves: An authentic institution role CAN access the institution portal."""
    response = await async_client.get(
        "/api/institutions/portal",
        headers={"Authorization": f"Bearer {institution_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "St. Mary's Test Haven"
    assert data["status"] == "pending"

# ==============================================================================
# 3. Verifier Cannot Approve (Only Recommend)
# ==============================================================================
@pytest.mark.asyncio
async def test_verifier_can_recommend_institution(
    async_client: AsyncClient,
    verifier_token: str
):
    """Proves: Verifier is authorized to execute Step 1 recommendation."""
    response = await async_client.post(
        "/api/verifications/1/recommend",
        headers={"Authorization": f"Bearer {verifier_token}"},
        json={"reason": "Physical premises inspected and hygiene confirmed."}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "recommended"

@pytest.mark.asyncio
async def test_verifier_cannot_approve_institution(
    async_client: AsyncClient,
    verifier_token: str
):
    """
    Proves: Verifier attempting to execute Step 2 approval receives HTTP 403 Forbidden.
    Verifiers can ONLY recommend; only admins can approve.
    """
    response = await async_client.post(
        "/api/verifications/1/approve",
        headers={"Authorization": f"Bearer {verifier_token}"},
        json={"reason": "Verifier attempting to approve."}
    )
    assert response.status_code == 403
    detail = response.json()["detail"]
    assert "access forbidden" in detail.lower()
    assert "admin" in detail.lower()
    assert "verifier" in detail.lower()

@pytest.mark.asyncio
async def test_admin_can_approve_institution(
    async_client: AsyncClient,
    verifier_token: str,
    admin_token: str
):
    """Proves: Administrator is authorized to execute final Step 2 approval after verifier recommendation."""
    # Step 1: Recommend
    await async_client.post(
        "/api/verifications/1/recommend",
        headers={"Authorization": f"Bearer {verifier_token}"},
        json={"reason": "Step 1 field verifier inspection passed."}
    )

    # Step 2: Approve
    response = await async_client.post(
        "/api/verifications/1/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"reason": "Final compliance documentation verified by admin."}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "verified"

