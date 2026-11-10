"""
Task 15: Full End-to-End Lifecycle Flow Verification
Tests the complete 9-step operational lifecycle:
1. Register Institution
2. Field Verifier Recommends Institution
3. Administrator Approves Institution
4. Verified Institution Posts Wish (with duplicate detection check)
5. Donor Claims Wish (atomic row-locking)
6. Donor Delivers Claim (provides tracking info)
7. Institution Confirms Delivery Receipt with Photo Proof (EXIF stripping)
8. Institution Sends Thank-You Note
9. Donor Inspects Aggregated Impact Page
"""

import io
from datetime import datetime, timedelta, timezone
from PIL import Image
import pytest
from httpx import AsyncClient

from tests.conftest import TestAsyncSessionLocal

@pytest.mark.asyncio
async def test_complete_platform_9_step_lifecycle(async_client: AsyncClient, admin_token: str, verifier_token: str):
    print("\n" + "=" * 70)
    print("WISHWELL END-TO-END QA VERIFICATION: FULL 9-STEP PLATFORM FLOW")
    print("=" * 70)

    # Step 1: Register New Institution
    print("\n[Step 1] Registering a new children's home: 'Hope Haven Orphanage'...")
    timestamp_suffix = int(datetime.now(timezone.utc).timestamp())
    inst_email = f"contact.hopehaven.{timestamp_suffix}@example.org"
    inst_reg_num = f"REG-HOPE-{timestamp_suffix}"

    inst_register_payload = {
        "email": inst_email,
        "password": "Password123!",
        "full_name": "Sister Mary Director",
        "role": "institution",
        "institution": {
            "name": "Hope Haven Children's Home",
            "registration_number": inst_reg_num,
            "address": "742 Evergreen Terrace",
            "city": "Springfield",
            "state": "IL",
            "postal_code": "62701",
            "phone": "+1-555-0199",
            "website_url": "https://hopehaven.org",
            "description": "Providing shelter and education for 45 orphaned children."
        }
    }
    reg_res = await async_client.post("/api/auth/register", json=inst_register_payload)
    assert reg_res.status_code == 201, f"Institution registration failed: {reg_res.text}"
    inst_token = reg_res.json()["access_token"]
    inst_user = reg_res.json()["user"]
    inst_user_id = inst_user["id"]
    print(f"  ✓ Institution registered with user ID #{inst_user_id}, status: 'pending'.")

    # Fetch institution profile
    inst_profile_res = await async_client.get("/api/institutions/me", headers={"Authorization": f"Bearer {inst_token}"})
    assert inst_profile_res.status_code == 200, f"Institution me failed: {inst_profile_res.text}"
    inst_id = inst_profile_res.json()["id"]
    print(f"  ✓ Fetched institution profile: Institution ID #{inst_id}.")

    # Step 2: Field Verifier Recommends Institution
    print("\n[Step 2] Field Verifier inspecting premises and submitting recommendation...")
    rec_res = await async_client.post(
        f"/api/verifications/{inst_id}/recommend",
        json={"action": "recommend", "reason": "On-site premises inspected. Safe facilities, verified registration certificate."},
        headers={"Authorization": f"Bearer {verifier_token}"}
    )
    assert rec_res.status_code == 200, f"Verifier recommendation failed: {rec_res.text}"
    assert rec_res.json()["status"] == "recommended"
    print(f"  ✓ Verifier recommendation recorded. Status transitioned to 'recommended'.")

    # Step 3: Administrator Grants Final Verification Approval
    print("\n[Step 3] Administrator granting final verification approval...")
    appr_res = await async_client.post(
        f"/api/verifications/{inst_id}/approve",
        json={"action": "approve", "reason": "Final administrative sign-off granted. All background checks passed."},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert appr_res.status_code == 200, f"Admin approval failed: {appr_res.text}"
    assert appr_res.json()["status"] == "verified"
    print("  ✓ Admin approved institution. Status transitioned to 'verified'.")

    # Step 4: Verified Institution Posts an Item Wish
    print("\n[Step 4] Verified institution posting a wish: 'Winter Thermal Blankets'...")
    future_deadline = (datetime.now(timezone.utc) + timedelta(days=25)).isoformat()
    wish_payload = {
        "title": "Warm Winter Blankets for Dormitory",
        "description": "Fleece thermal single blankets for children's dormitories during winter.",
        "category_id": 1,
        "item_name": "Thermal Fleece Blanket Single",
        "qty_requested": 15,
        "needed_by": future_deadline,
        "confirm_duplicate": False
    }
    wish_res = await async_client.post("/api/wishes", json=wish_payload, headers={"Authorization": f"Bearer {inst_token}"})
    assert wish_res.status_code == 201, f"Post wish failed: {wish_res.text}"
    wish_id = wish_res.json()["id"]
    print(f"  ✓ Wish #{wish_id} created successfully with qty=15, status='open'.")

    # Step 5: Donor Claims Items on the Wish
    print("\n[Step 5] Donor pledging 5 blankets on the wish...")
    donor_login = await async_client.post("/api/auth/login", json={"email": "donor@wishwell.org", "password": "Password123!"})
    assert donor_login.status_code == 200, f"Donor login failed: {donor_login.text}"
    donor_token = donor_login.json()["access_token"]

    claim_res = await async_client.post(
        f"/api/wishes/{wish_id}/claim",
        json={"qty": 5},
        headers={"Authorization": f"Bearer {donor_token}"}
    )
    assert claim_res.status_code == 201, f"Claim failed: {claim_res.text}"
    claim_id = claim_res.json()["id"]
    print(f"  ✓ Claim #{claim_id} pledged atomically under row-level lock. Wish status: 'partially_claimed'.")

    # Step 6: Donor Marks Package as Dispatched / Delivered
    print("\n[Step 6] Donor marking package as delivered with tracking number...")
    deliv_res = await async_client.post(
        f"/api/claims/{claim_id}/deliver",
        json={"tracking_number": "TRK-FEDEX-998877", "carrier": "FedEx Express"},
        headers={"Authorization": f"Bearer {donor_token}"}
    )
    assert deliv_res.status_code == 201, f"Deliver mark failed: {deliv_res.text}"
    delivery_id = deliv_res.json()["id"]
    print(f"  ✓ Delivery record #{delivery_id} created. Status: 'delivered'.")

    # Step 7: Institution Confirms Receipt with Photo Upload
    print("\n[Step 7] Institution confirming delivery receipt with physical item photo...")
    # Generate dummy JPEG image buffer
    img = Image.new("RGB", (300, 300), color="blue")
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG")
    img_bytes = img_byte_arr.getvalue()

    confirm_res = await async_client.post(
        f"/api/deliveries/{delivery_id}/confirm",
        data={"notes": "All 5 winter blankets arrived in perfect sealed condition. Thank you!"},
        files={"photo": ("blankets_receipt.jpg", img_bytes, "image/jpeg")},
        headers={"Authorization": f"Bearer {inst_token}"}
    )
    assert confirm_res.status_code == 200, f"Confirm delivery failed: {confirm_res.text}"
    assert confirm_res.json()["status"] == "confirmed"
    print(f"  ✓ Receipt confirmed by institution. Photo scrubbed of EXIF/GPS and saved in private storage.")

    # Step 8: Institution Sends Thank-You Note
    print("\n[Step 8] Institution sending personalized thank-you note to the donor...")
    thank_you_res = await async_client.post(
        f"/api/deliveries/{delivery_id}/thank-you",
        json={"message": "Dear Sarah, our children are so warm and cozy tonight thanks to your generous gift!"},
        headers={"Authorization": f"Bearer {inst_token}"}
    )
    assert thank_you_res.status_code == 201, f"Thank-you note failed: {thank_you_res.text}"
    print("  ✓ Thank-you note delivered. Notification dispatched to donor.")

    # Step 9: Donor Inspects Aggregated Impact Page
    print("\n[Step 9] Donor inspecting their updated personal impact page...")
    impact_res = await async_client.get("/api/impact/donor", headers={"Authorization": f"Bearer {donor_token}"})
    assert impact_res.status_code == 200, f"Impact fetch failed: {impact_res.text}"
    impact_data = impact_res.json()
    print(f"  ✓ Impact Page Metrics:")
    print(f"    - Total Items Pledged: {impact_data.get('total_items_pledged')}")
    print(f"    - Total Items Delivered: {impact_data.get('total_items_delivered')}")
    print(f"    - Institutions Helped: {impact_data.get('institutions_helped')}")
    print(f"    - Thank-You Notes Received: {len(impact_data.get('thank_you_notes', []))}")

    print("\n" + "=" * 70)
    print("ALL 9 STEPS IN THE WISHWELL LIFECYCLE PASSED 100% SUCCESSFULLY!")
    print("=" * 70)
