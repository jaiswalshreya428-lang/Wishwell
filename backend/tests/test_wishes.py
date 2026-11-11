"""
Test Suite for Wish Management (Task 4)

Covers:
1. Wish creation by verified institutions (and rejection for unverified).
2. Input validation (positive quantities, future needed_by timestamps).
3. Non-ML, explainable duplicate-need check (normalized exact match & Jaccard token overlap).
4. Duplicate override via confirm_duplicate=True flag.
5. Wish editing restrictions (strictly permitted only when no active claims exist).
6. Wish cancellation restrictions (strictly permitted only when no active claims exist).
7. Server-side pagination and filtering on dbo.v_open_wishes view (category, institution, dates, search).
8. Detail endpoint with dynamic remaining quantity calculation.
"""

from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy import select, update
from app.core.database import get_db
from app.models.entities import Institution, Wish, WishClaim, Category, User, AuditLog
from tests.conftest import TestAsyncSessionLocal

future_date_str = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
far_future_date_str = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
past_date_str = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()

async def ensure_institution_verified():
    """Helper to transition default test institution (id=1, user_id=3) to 'verified' status."""
    async with TestAsyncSessionLocal() as session:
        stmt = update(Institution).where(Institution.id == 1).values(status="verified")
        await session.execute(stmt)
        await session.commit()

@pytest.mark.asyncio
async def test_create_wish_verified_institution_success(async_client: AsyncClient, institution_token: str):
    await ensure_institution_verified()

    payload = {
        "title": "Mathematics Exercise Books",
        "description": "Square ruled notebooks for Grade 5 and Grade 6 math classes.",
        "item_name": "Classmate Square Ruled Notebooks A4",
        "qty_requested": 50,
        "needed_by": future_date_str,
        "category_id": 1,
        "confirm_duplicate": False
    }

    response = await async_client.post(
        "/api/wishes",
        json=payload,
        headers={"Authorization": f"Bearer {institution_token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["title"] == "Mathematics Exercise Books"
    assert data["item_name"] == "Classmate Square Ruled Notebooks A4"
    assert data["qty_requested"] == 50
    assert data["status"] == "open"
    assert data["institution_id"] == 1

@pytest.mark.asyncio
async def test_create_wish_unverified_institution_forbidden(async_client: AsyncClient, institution_token: str):
    # Ensure institution is 'pending'
    async with TestAsyncSessionLocal() as session:
        await session.execute(update(Institution).where(Institution.id == 1).values(status="pending"))
        await session.commit()

    payload = {
        "title": "Mathematics Books",
        "description": "Math books",
        "item_name": "Math Textbooks",
        "qty_requested": 10,
        "needed_by": future_date_str,
        "category_id": 1
    }

    response = await async_client.post(
        "/api/wishes",
        json=payload,
        headers={"Authorization": f"Bearer {institution_token}"}
    )
    assert response.status_code == 403
    assert "Only verified institutions can post wishes" in response.json()["detail"]

@pytest.mark.asyncio
async def test_create_wish_past_needed_by_fails(async_client: AsyncClient, institution_token: str):
    await ensure_institution_verified()

    payload = {
        "title": "Science Kit",
        "description": "Physics and chemistry laboratory kit",
        "item_name": "Science Experiment Box",
        "qty_requested": 5,
        "needed_by": past_date_str,
        "category_id": 1
    }

    response = await async_client.post(
        "/api/wishes",
        json=payload,
        headers={"Authorization": f"Bearer {institution_token}"}
    )
    assert response.status_code == 400
    assert "needed_by date must be strictly in the future" in response.json()["detail"]

@pytest.mark.asyncio
async def test_create_wish_exact_duplicate_warning_409(async_client: AsyncClient, institution_token: str):
    await ensure_institution_verified()

    # Create initial wish
    initial_payload = {
        "title": "English Story Books",
        "description": "Illustrated fairy tales and adventure stories.",
        "item_name": "Puffin Classic Story Books",
        "qty_requested": 25,
        "needed_by": future_date_str,
        "category_id": 1,
        "confirm_duplicate": False
    }
    r1 = await async_client.post("/api/wishes", json=initial_payload, headers={"Authorization": f"Bearer {institution_token}"})
    assert r1.status_code == 201

    # Attempt to create duplicate wish with case and punctuation variation
    duplicate_payload = {
        "title": "More English Books",
        "description": "Extra story books needed for new students.",
        "item_name": "puffin classic, story books!",  # normalized match
        "qty_requested": 15,
        "needed_by": far_future_date_str,
        "category_id": 1,
        "confirm_duplicate": False
    }
    r2 = await async_client.post("/api/wishes", json=duplicate_payload, headers={"Authorization": f"Bearer {institution_token}"})
    assert r2.status_code == 409
    data = r2.json()["detail"]
    assert data["duplicate_detected"] is True
    assert len(data["similar_wishes"]) >= 1
    assert data["similar_wishes"][0]["item_name"] == "Puffin Classic Story Books"
    assert "Exact normalized item name match" in data["similar_wishes"][0]["match_reason"]

@pytest.mark.asyncio
async def test_create_wish_token_overlap_warning_409(async_client: AsyncClient, institution_token: str):
    await ensure_institution_verified()

    # Create initial wish
    initial_payload = {
        "title": "Geometry Instrument Boxes",
        "description": "Geometry sets for middle school students.",
        "item_name": "Camlin Geometry Instrument Box Set",
        "qty_requested": 30,
        "needed_by": future_date_str,
        "category_id": 1,
        "confirm_duplicate": False
    }
    r1 = await async_client.post("/api/wishes", json=initial_payload, headers={"Authorization": f"Bearer {institution_token}"})
    assert r1.status_code == 201

    # Attempt to create similar wish with high token overlap (Jaccard >= 0.5)
    similar_payload = {
        "title": "Extra Geometry Sets",
        "description": "Geometry boxes for students.",
        "item_name": "Geometry Instrument Box Camlin",
        "qty_requested": 20,
        "needed_by": far_future_date_str,
        "category_id": 1,
        "confirm_duplicate": False
    }
    r2 = await async_client.post("/api/wishes", json=similar_payload, headers={"Authorization": f"Bearer {institution_token}"})
    assert r2.status_code == 409
    data = r2.json()["detail"]
    assert data["duplicate_detected"] is True
    assert len(data["similar_wishes"]) >= 1
    assert data["similar_wishes"][0]["similarity_score"] >= 0.5

@pytest.mark.asyncio
async def test_create_wish_confirm_duplicate_override_success(async_client: AsyncClient, institution_token: str):
    await ensure_institution_verified()

    # 1. Post initial wish
    initial_payload = {
        "title": "Art Supplies",
        "description": "Watercolor paint sets for art therapy.",
        "item_name": "Camel Watercolor Tubes (Pack of 12)",
        "qty_requested": 20,
        "needed_by": future_date_str,
        "category_id": 1,
        "confirm_duplicate": False
    }
    r1 = await async_client.post("/api/wishes", json=initial_payload, headers={"Authorization": f"Bearer {institution_token}"})
    assert r1.status_code == 201

    # 2. Resubmit with confirm_duplicate=True flag
    override_payload = {
        "title": "Art Supplies for Seniors",
        "description": "Additional watercolor sets for senior high students.",
        "item_name": "Camel Watercolor Tubes (Pack of 12)",
        "qty_requested": 15,
        "needed_by": far_future_date_str,
        "category_id": 1,
        "confirm_duplicate": True  # Override flag!
    }
    r2 = await async_client.post("/api/wishes", json=override_payload, headers={"Authorization": f"Bearer {institution_token}"})
    assert r2.status_code == 201
    assert r2.json()["qty_requested"] == 15

@pytest.mark.asyncio
async def test_edit_wish_success_when_no_active_claims(async_client: AsyncClient, institution_token: str):
    await ensure_institution_verified()

    # Create wish
    create_res = await async_client.post("/api/wishes", json={
        "title": "Colored Pencils",
        "description": "12-shade pencil sets",
        "item_name": "Faber-Castell Color Pencils",
        "qty_requested": 30,
        "needed_by": future_date_str,
        "category_id": 1
    }, headers={"Authorization": f"Bearer {institution_token}"})
    wish_id = create_res.json()["id"]

    # Edit wish
    edit_payload = {
        "title": "Colored Pencils (24 Shades)",
        "description": "Updated to 24-shade pencil sets as requested by teacher.",
        "item_name": "Faber-Castell 24 Color Pencils",
        "qty_requested": 40
    }
    edit_res = await async_client.put(
        f"/api/wishes/{wish_id}",
        json=edit_payload,
        headers={"Authorization": f"Bearer {institution_token}"}
    )
    assert edit_res.status_code == 200
    data = edit_res.json()
    assert data["title"] == "Colored Pencils (24 Shades)"
    assert data["qty_requested"] == 40
    assert data["item_name"] == "Faber-Castell 24 Color Pencils"

@pytest.mark.asyncio
async def test_edit_wish_rejected_when_active_claims_exist(async_client: AsyncClient, institution_token: str):
    await ensure_institution_verified()

    # Create wish
    create_res = await async_client.post("/api/wishes", json={
        "title": "Writing Pads",
        "description": "Legal writing pads",
        "item_name": "Ruled Writing Pads",
        "qty_requested": 20,
        "needed_by": future_date_str,
        "category_id": 1
    }, headers={"Authorization": f"Bearer {institution_token}"})
    wish_id = create_res.json()["id"]

    # Simulate active donor claim in database
    async with TestAsyncSessionLocal() as session:
        claim = WishClaim(
            wish_id=wish_id,
            donor_id=4,  # donor user id
            qty=5,
            deadline=datetime.now(timezone.utc) + timedelta(days=5),
            status="active"
        )
        session.add(claim)
        await session.commit()

    # Attempt to edit wish
    edit_res = await async_client.put(
        f"/api/wishes/{wish_id}",
        json={"qty_requested": 25},
        headers={"Authorization": f"Bearer {institution_token}"}
    )
    assert edit_res.status_code == 400
    assert "active donor claims" in edit_res.json()["detail"]

@pytest.mark.asyncio
async def test_cancel_wish_success_when_no_active_claims(async_client: AsyncClient, institution_token: str):
    await ensure_institution_verified()

    # Create wish
    create_res = await async_client.post("/api/wishes", json={
        "title": "Drawing Sheets",
        "description": "A3 drawing cartridge papers",
        "item_name": "Cartridge Drawing Sheets A3",
        "qty_requested": 100,
        "needed_by": future_date_str,
        "category_id": 1
    }, headers={"Authorization": f"Bearer {institution_token}"})
    wish_id = create_res.json()["id"]

    # Cancel wish
    cancel_res = await async_client.post(
        f"/api/wishes/{wish_id}/cancel",
        headers={"Authorization": f"Bearer {institution_token}"}
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"

    # Verify audit log recorded the cancellation
    async with TestAsyncSessionLocal() as session:
        audit = await session.scalar(
            select(AuditLog).where(AuditLog.entity_type == "wish", AuditLog.entity_id == wish_id)
        )
        assert audit is not None
        assert audit.action == "cancel"
        assert audit.new_status == "cancelled"

@pytest.mark.asyncio
async def test_cancel_wish_rejected_when_active_claims_exist(async_client: AsyncClient, institution_token: str):
    await ensure_institution_verified()

    # Create wish
    create_res = await async_client.post("/api/wishes", json={
        "title": "School Backpacks",
        "description": "Durable school bags",
        "item_name": "Waterproof School Backpacks",
        "qty_requested": 15,
        "needed_by": future_date_str,
        "category_id": 1
    }, headers={"Authorization": f"Bearer {institution_token}"})
    wish_id = create_res.json()["id"]

    # Simulate active donor claim in database
    async with TestAsyncSessionLocal() as session:
        claim = WishClaim(
            wish_id=wish_id,
            donor_id=4,
            qty=3,
            deadline=datetime.now(timezone.utc) + timedelta(days=3),
            status="active"
        )
        session.add(claim)
        await session.commit()

    # Attempt to cancel wish
    cancel_res = await async_client.post(
        f"/api/wishes/{wish_id}/cancel",
        headers={"Authorization": f"Bearer {institution_token}"}
    )
    assert cancel_res.status_code == 400
    assert "active donor claims" in cancel_res.json()["detail"]

@pytest.mark.asyncio
async def test_list_wishes_from_view_with_pagination(async_client: AsyncClient, institution_token: str):
    await ensure_institution_verified()

    items = [
        ("Mathematics Textbooks", "Grade 8 standard textbooks", 10),
        ("Science Laboratory Beakers", "Borosilicate glass 250ml beakers", 15),
        ("Crayon Boxes", "Wax crayons 24 shades", 25),
        ("Eraser Packs", "Dust-free non-toxic erasers", 50),
        ("Sharpeners", "Metal single-hole sharpeners", 40),
    ]

    # Create multiple wishes with confirm_duplicate=True to allow rapid setup
    for i, (item_name, desc, qty) in enumerate(items, start=1):
        resp = await async_client.post("/api/wishes", json={
            "title": f"Supply Batch #{i}",
            "description": desc,
            "item_name": item_name,
            "qty_requested": qty,
            "needed_by": (datetime.now(timezone.utc) + timedelta(days=i + 1)).isoformat(),
            "category_id": 1,
            "confirm_duplicate": True
        }, headers={"Authorization": f"Bearer {institution_token}"})
        assert resp.status_code == 201

    # Test page 1 with page_size = 2
    r_page1 = await async_client.get("/api/wishes?page=1&page_size=2")
    assert r_page1.status_code == 200
    data1 = r_page1.json()
    assert data1["total"] >= 5
    assert len(data1["items"]) == 2
    assert data1["page"] == 1
    assert data1["page_size"] == 2
    assert data1["total_pages"] >= 3

    # Test page 2 with page_size = 2
    r_page2 = await async_client.get("/api/wishes?page=2&page_size=2")
    assert r_page2.status_code == 200
    data2 = r_page2.json()
    assert len(data2["items"]) == 2
    assert data2["page"] == 2
    assert data1["total_pages"] >= 3

    # Verify fields from dbo.v_open_wishes
    first_item = data1["items"][0]
    assert "wish_id" in first_item
    assert "institution_name" in first_item
    assert "category_name" in first_item
    assert "qty_remaining" in first_item
    assert first_item["qty_remaining"] > 0

@pytest.mark.asyncio
async def test_list_wishes_search_filter(async_client: AsyncClient, institution_token: str):
    await ensure_institution_verified()

    # Create specific searchable wish
    await async_client.post("/api/wishes", json={
        "title": "Special Robotic Kits",
        "description": "STEM robotics kits for high school students",
        "item_name": "Arduino Starter Robot Kit",
        "qty_requested": 5,
        "needed_by": future_date_str,
        "category_id": 1
    }, headers={"Authorization": f"Bearer {institution_token}"})

    # Search for "Arduino"
    search_res = await async_client.get("/api/wishes?search=Arduino")
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert search_data["total"] >= 1
    assert any("Arduino" in item["item_name"] for item in search_data["items"])

@pytest.mark.asyncio
async def test_get_wish_detail_success(async_client: AsyncClient, institution_token: str):
    await ensure_institution_verified()

    create_res = await async_client.post("/api/wishes", json={
        "title": "Encyclopedia Britannica Set",
        "description": "Complete illustrated children's reference encyclopedia.",
        "item_name": "Children Reference Encyclopedia",
        "qty_requested": 4,
        "needed_by": future_date_str,
        "category_id": 1
    }, headers={"Authorization": f"Bearer {institution_token}"})
    wish_id = create_res.json()["id"]

    detail_res = await async_client.get(f"/api/wishes/{wish_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == wish_id
    assert detail["title"] == "Encyclopedia Britannica Set"
    assert detail["qty_requested"] == 4
    assert detail["qty_claimed"] == 0
    assert detail["qty_remaining"] == 4
    assert detail["institution_name"] == "St. Mary's Test Haven"
    assert detail["category_name"] == "Educational Supplies"

@pytest.mark.asyncio
async def test_get_wish_detail_not_found(async_client: AsyncClient):
    res = await async_client.get("/api/wishes/999999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"]

@pytest.mark.asyncio
async def test_list_wishes_filters_category_and_institution(async_client: AsyncClient, institution_token: str):
    await ensure_institution_verified()

    # Add second category
    async with TestAsyncSessionLocal() as session:
        cat2 = Category(name="Sports Equipment", description="Footballs, cricket bats")
        session.add(cat2)
        await session.commit()
        cat2_id = cat2.id

    # Create wish in category 1
    await async_client.post("/api/wishes", json={
        "title": "Geometry Tools",
        "description": "Math set",
        "item_name": "Geometry Compasses",
        "qty_requested": 10,
        "needed_by": future_date_str,
        "category_id": 1
    }, headers={"Authorization": f"Bearer {institution_token}"})

    # Create wish in category 2
    await async_client.post("/api/wishes", json={
        "title": "Soccer Balls",
        "description": "Standard size 5 balls",
        "item_name": "Leather Soccer Balls",
        "qty_requested": 8,
        "needed_by": future_date_str,
        "category_id": cat2_id
    }, headers={"Authorization": f"Bearer {institution_token}"})

    # Filter by category 2
    r_cat2 = await async_client.get(f"/api/wishes?category_id={cat2_id}")
    assert r_cat2.status_code == 200
    data = r_cat2.json()
    assert data["total"] == 1
    assert data["items"][0]["item_name"] == "Leather Soccer Balls"

    # Filter by institution 1
    r_inst = await async_client.get("/api/wishes?institution_id=1")
    assert r_inst.status_code == 200
    assert r_inst.json()["total"] >= 2

    # Filter by non-existent institution 999
    r_none = await async_client.get("/api/wishes?institution_id=999")
    assert r_none.status_code == 200
    assert r_none.json()["total"] == 0

@pytest.mark.asyncio
async def test_list_wishes_needed_by_range_filter(async_client: AsyncClient, institution_token: str):
    await ensure_institution_verified()

    near_future = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    distant_future = (datetime.now(timezone.utc) + timedelta(days=40)).isoformat()

    await async_client.post("/api/wishes", json={
        "title": "Urgent Blankets",
        "description": "Needed in 5 days",
        "item_name": "Fleece Blankets Urgent",
        "qty_requested": 12,
        "needed_by": near_future,
        "category_id": 1,
        "confirm_duplicate": True
    }, headers={"Authorization": f"Bearer {institution_token}"})

    await async_client.post("/api/wishes", json={
        "title": "Future Exam Guides",
        "description": "Needed in 40 days",
        "item_name": "Exam Preparation Guides",
        "qty_requested": 6,
        "needed_by": distant_future,
        "category_id": 1,
        "confirm_duplicate": True
    }, headers={"Authorization": f"Bearer {institution_token}"})

    # Range filter that covers only the near future wish (days 1 to 10)
    range_from = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    range_to = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()

    r_range = await async_client.get(
        "/api/wishes",
        params={"needed_by_from": range_from, "needed_by_to": range_to}
    )
    assert r_range.status_code == 200
    items = r_range.json()["items"]
    assert any(item["item_name"] == "Fleece Blankets Urgent" for item in items)
    assert not any(item["item_name"] == "Exam Preparation Guides" for item in items)

@pytest.mark.asyncio
async def test_category_plain_text_and_script_tag_rendering(async_client: AsyncClient, institution_token: str):
    """
    Test that categories and wishes with special characters (like '&' and '<script>')
    are stored and returned as clean plain text without double-escaping entities into '&amp;'
    and without XSS execution risk (React renders text safely).
    """
    await ensure_institution_verified()

    # 1. Insert a category named 'A & B'
    async with TestAsyncSessionLocal() as session:
        cat_ab = Category(name="A & B", description="Bedding & Linen and Notebooks & Geometry")
        session.add(cat_ab)
        await session.commit()
        cat_id = cat_ab.id

    # 2. Verify GET /api/categories returns exact plain text 'A & B', NOT 'A &amp; B'
    cat_resp = await async_client.get("/api/categories")
    assert cat_resp.status_code == 200
    categories = cat_resp.json()
    matched = [c for c in categories if c["id"] == cat_id]
    assert len(matched) == 1
    assert matched[0]["name"] == "A & B"
    assert "&amp;" not in matched[0]["name"]
    assert matched[0]["description"] == "Bedding & Linen and Notebooks & Geometry"
    assert "&amp;" not in matched[0]["description"]

    # 3. Create a wish with '<script>' tag in title and description
    script_payload = {
        "title": "<script>alert('xss')</script> Science Kits",
        "description": "Safe STEM kits & microscopes with <script> tags for testing",
        "item_name": "STEM Microscope & Slides",
        "qty_requested": 10,
        "needed_by": future_date_str,
        "category_id": cat_id,
        "confirm_duplicate": True
    }
    wish_resp = await async_client.post(
        "/api/wishes",
        json=script_payload,
        headers={"Authorization": f"Bearer {institution_token}"}
    )
    assert wish_resp.status_code == 201
    created_wish = wish_resp.json()

    # Must preserve plain text <script> without &lt;script&gt; double-escaping
    # (React renders JSX text nodes safely as text, ensuring zero script execution)
    assert created_wish["title"] == "<script>alert('xss')</script> Science Kits"
    assert created_wish["item_name"] == "STEM Microscope & Slides"
    assert "&amp;" not in created_wish["item_name"]
    assert "&amp;" not in created_wish["description"]

    # 4. Verify detail and open wishes views also return exact plain text
    detail_resp = await async_client.get(f"/api/wishes/{created_wish['id']}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["title"] == "<script>alert('xss')</script> Science Kits"
    assert detail["category_name"] == "A & B"
    assert "&amp;" not in detail["category_name"]


