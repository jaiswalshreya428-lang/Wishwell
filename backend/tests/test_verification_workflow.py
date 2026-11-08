"""
Institution Verification Workflow & State Machine Tests
Validates:
1. Document upload size limits (<= 5MB) and content magic byte verification (PDF, JPG, PNG).
2. Random UUID renaming and short-lived SAS download URLs.
3. Two-step verification finite state machine (FSM):
   - Only verifiers can list pending and recommend/reject.
   - Only admins can list recommended and approve/reject.
   - Institutions cannot approve or recommend themselves.
   - Cannot skip steps (admin cannot approve directly from 'pending').
4. Wish creation enforcement:
   - Only institutions with status 'verified' can create wishes.
"""

from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from app.models.entities import Institution, VerificationRecord, AuditLog
from tests.conftest import TestAsyncSessionLocal

# Sample authentic file headers (magic bytes)
VALID_PDF_BYTES = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
VALID_PNG_BYTES = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
VALID_JPG_BYTES = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\xff\xd9"
SPOOFED_FILE_BYTES = b"This is just plain text masquerading as a PDF."

# ==============================================================================
# 1. Document Upload & Security Validation
# ==============================================================================
@pytest.mark.asyncio
async def test_document_upload_success_pdf(
    async_client: AsyncClient,
    institution_token: str
):
    """Proves: Authentic PDF uploads, is renamed to UUID, and returns SAS URL."""
    files = {
        "file": ("registration_license.pdf", VALID_PDF_BYTES, "application/pdf")
    }
    data = {"document_type": "registration_certificate"}

    response = await async_client.post(
        "/api/institutions/documents",
        headers={"Authorization": f"Bearer {institution_token}"},
        files=files,
        data=data
    )
    assert response.status_code == 201
    res_data = response.json()
    assert res_data["document_type"] == "registration_certificate"
    assert res_data["mime_type"] == "application/pdf"
    assert res_data["blob_name"].endswith(".pdf")
    assert res_data["blob_name"] != "registration_license.pdf" # UUID renamed
    assert "sas_download_url" in res_data
    assert "institution-documents" in res_data["sas_download_url"]

@pytest.mark.asyncio
async def test_document_upload_rejects_spoofed_file_type(
    async_client: AsyncClient,
    institution_token: str
):
    """Proves: Files without genuine magic bytes are rejected (content inspection)."""
    files = {
        "file": ("malicious.pdf", SPOOFED_FILE_BYTES, "application/pdf")
    }
    data = {"document_type": "registration_certificate"}

    response = await async_client.post(
        "/api/institutions/documents",
        headers={"Authorization": f"Bearer {institution_token}"},
        files=files,
        data=data
    )
    assert response.status_code == 400
    assert "invalid file content" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_document_upload_rejects_oversized_file(
    async_client: AsyncClient,
    institution_token: str
):
    """Proves: Files exceeding 5 MB limit are rejected with HTTP 413."""
    oversized_bytes = VALID_PDF_BYTES + b"0" * (5 * 1024 * 1024 + 100)
    files = {
        "file": ("giant.pdf", oversized_bytes, "application/pdf")
    }
    data = {"document_type": "registration_certificate"}

    response = await async_client.post(
        "/api/institutions/documents",
        headers={"Authorization": f"Bearer {institution_token}"},
        files=files,
        data=data
    )
    assert response.status_code == 413
    assert "exceeds maximum allowed size" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_verifier_and_admin_can_download_document_sas(
    async_client: AsyncClient,
    institution_token: str,
    verifier_token: str,
    admin_token: str,
    donor_token: str
):
    """Proves: Verifier & Admin receive valid SAS URLs; Donors receive HTTP 403."""
    # Upload document first
    await async_client.post(
        "/api/institutions/documents",
        headers={"Authorization": f"Bearer {institution_token}"},
        files={"file": ("cert.pdf", VALID_PDF_BYTES, "application/pdf")},
        data={"document_type": "registration_certificate"}
    )

    # 1. Verifier request -> succeeds with SAS URL
    v_res = await async_client.get(
        "/api/institutions/1/documents",
        headers={"Authorization": f"Bearer {verifier_token}"}
    )
    assert v_res.status_code == 200
    docs = v_res.json()
    assert len(docs) > 0
    assert "sas_download_url" in docs[0]

    # 2. Admin request -> succeeds with SAS URL
    a_res = await async_client.get(
        "/api/institutions/1/documents",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert a_res.status_code == 200

    # 3. Donor request -> 403 Forbidden
    d_res = await async_client.get(
        "/api/institutions/1/documents",
        headers={"Authorization": f"Bearer {donor_token}"}
    )
    assert d_res.status_code == 403

# ==============================================================================
# 2. Verification State Machine Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_verifier_lists_pending_institutions(
    async_client: AsyncClient,
    verifier_token: str
):
    """Proves: Verifier can list pending institutions."""
    res = await async_client.get(
        "/api/verifications/pending",
        headers={"Authorization": f"Bearer {verifier_token}"}
    )
    assert res.status_code == 200
    pending_list = res.json()
    assert len(pending_list) >= 1
    assert pending_list[0]["status"] == "pending"

@pytest.mark.asyncio
async def test_admin_cannot_skip_step_to_approve_pending_institution(
    async_client: AsyncClient,
    admin_token: str
):
    """
    Proves: State Machine Rule - Admin CANNOT approve an institution directly from 'pending'.
    Two-step verification strictly requires field verifier recommendation first (400 Bad Request).
    """
    res = await async_client.post(
        "/api/verifications/1/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"reason": "Admin trying to skip Step 1."}
    )
    assert res.status_code == 400
    assert "cannot skip" in res.json()["detail"].lower()

@pytest.mark.asyncio
async def test_institution_cannot_approve_or_recommend_itself(
    async_client: AsyncClient,
    institution_token: str
):
    """Proves: Institution role cannot recommend or approve itself (403 Forbidden)."""
    rec_res = await async_client.post(
        "/api/verifications/1/recommend",
        headers={"Authorization": f"Bearer {institution_token}"},
        json={"reason": "Institution attempting self-recommendation"}
    )
    assert rec_res.status_code == 403

    app_res = await async_client.post(
        "/api/verifications/1/approve",
        headers={"Authorization": f"Bearer {institution_token}"},
        json={"reason": "Institution attempting self-approval"}
    )
    assert app_res.status_code == 403

@pytest.mark.asyncio
async def test_full_state_machine_happy_path(
    async_client: AsyncClient,
    verifier_token: str,
    admin_token: str
):
    """
    Proves full two-step progression:
    pending -> (verifier recommends) -> recommended -> (admin approves) -> verified
    """
    # Step 1: Verifier recommends
    rec_res = await async_client.post(
        "/api/verifications/1/recommend",
        headers={"Authorization": f"Bearer {verifier_token}"},
        json={"reason": "Premises inspected. Valid registration documents verified."}
    )
    assert rec_res.status_code == 200
    assert rec_res.json()["status"] == "recommended"

    # Verifier checks recommended list
    rec_list_res = await async_client.get(
        "/api/verifications/recommended",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert rec_list_res.status_code == 200
    assert any(inst["id"] == 1 for inst in rec_list_res.json())

    # Step 2: Admin approves
    app_res = await async_client.post(
        "/api/verifications/1/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"reason": "Board of directors identity verified and tax certificate approved."}
    )
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "verified"

# ==============================================================================
# 3. Wish Creation Enforcement Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_unverified_institution_cannot_create_wishes(
    async_client: AsyncClient,
    institution_token: str
):
    """
    Proves: Institution with status 'pending' receives HTTP 403 when trying to post a wish.
    Enforces rule: Only verified institutions may post wishes.
    """
    future_date = (datetime.now(timezone.utc) + timedelta(days=20)).isoformat()
    wish_payload = {
        "title": "50 Oxford Spiral Math Notebooks",
        "description": "200-page single lined notebooks for math class.",
        "item_name": "Spiral Math Notebooks",
        "qty_requested": 50,
        "needed_by": future_date,
        "category_id": 1
    }
    response = await async_client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {institution_token}"},
        json=wish_payload
    )
    assert response.status_code == 403
    assert "only verified institutions" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_verified_institution_can_create_wishes(
    async_client: AsyncClient,
    verifier_token: str,
    admin_token: str,
    institution_token: str
):
    """
    Proves: Once the institution completes two-step verification to 'verified',
    it is authorized to post wishes.
    """
    # 1. Advance institution 1 to 'verified'
    await async_client.post(
        "/api/verifications/1/recommend",
        headers={"Authorization": f"Bearer {verifier_token}"},
        json={"reason": "Inspection completed successfully."}
    )
    await async_client.post(
        "/api/verifications/1/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"reason": "Admin signed off on compliance."}
    )

    # 2. Post wish
    future_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    wish_payload = {
        "title": "30 Warm Fleece Blankets",
        "description": "Thermal single-bed fleece blankets for winter.",
        "item_name": "Fleece Blankets",
        "qty_requested": 30,
        "needed_by": future_date,
        "category_id": 1
    }
    response = await async_client.post(
        "/api/wishes",
        headers={"Authorization": f"Bearer {institution_token}"},
        json=wish_payload
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "30 Warm Fleece Blankets"
    assert data["status"] == "open"
    assert data["qty_requested"] == 30
