"""
Local SQLite Database Initializer & Seeder
Creates and seeds wishwell.db with full demonstration data
so the app runs out-of-the-box with ZERO Docker or SQL Server dependencies!
"""

import sys
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text, select

from app.core.database import Base
from app.core.security import hash_password
from app.models.entities import (
    User, Institution, VerificationRecord, Category, Wish, WishClaim, Delivery, ThankYouNote, Notification, AuditLog
)

DB_PATH = REPO_ROOT / "wishwell.db"
SQLITE_URL = f"sqlite+aiosqlite:///{DB_PATH.as_posix()}"

async def seed_database():
    print(f"Creating local SQLite database at: {DB_PATH}")
    engine = create_async_engine(SQLITE_URL, echo=False)
    
    async with engine.begin() as conn:
        try:
            await conn.execute(text("DROP TABLE IF EXISTS v_open_wishes"))
        except Exception:
            pass
        try:
            await conn.execute(text("DROP VIEW IF EXISTS v_open_wishes"))
        except Exception:
            pass
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        try:
            await conn.execute(text("DROP TABLE IF EXISTS v_open_wishes"))
        except Exception:
            pass
        await conn.execute(text("""
            CREATE VIEW IF NOT EXISTS v_open_wishes AS
            SELECT
                w.id AS wish_id,
                w.title AS wish_title,
                w.item_name AS item_name,
                w.description AS wish_description,
                w.qty_requested AS qty_requested,
                COALESCE((SELECT SUM(wc.qty) FROM wish_claims wc WHERE wc.wish_id = w.id AND wc.status = 'active'), 0) AS qty_claimed,
                (w.qty_requested - COALESCE((SELECT SUM(wc.qty) FROM wish_claims wc WHERE wc.wish_id = w.id AND wc.status = 'active'), 0)) AS qty_remaining,
                w.needed_by AS needed_by,
                w.status AS wish_status,
                w.created_at AS wish_created_at,
                c.id AS category_id,
                c.name AS category_name,
                i.id AS institution_id,
                i.name AS institution_name,
                i.city AS institution_city,
                i.state AS institution_state,
                i.status AS institution_status
            FROM wishes w
            JOIN categories c ON w.category_id = c.id
            JOIN institutions i ON w.institution_id = i.id
            WHERE w.status IN ('open', 'partially_claimed')
              AND datetime(w.needed_by) > datetime('now')
              AND i.status = 'verified'
        """))

        # Database triggers
        await conn.execute(text("""
            CREATE TRIGGER IF NOT EXISTS trg_wish_claims_enforce_active_qty_limit
            AFTER INSERT ON wish_claims
            WHEN (SELECT COALESCE(SUM(qty), 0) FROM wish_claims WHERE wish_id = NEW.wish_id AND status = 'active') > (SELECT qty_requested FROM wishes WHERE id = NEW.wish_id)
            BEGIN
                SELECT RAISE(FAIL, 'Business Rule Violation: The total quantity of active claims exceeds the requested quantity for this wish.');
            END;
        """))

    SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with SessionLocal() as session:
        pwd_hash = hash_password("Password123!")
        now = datetime.now(timezone.utc)

        # 1. Users
        admin = User(email="admin@wishwell.org", password_hash=pwd_hash, full_name="Elena Vance (Admin)", role="admin")
        verifier = User(email="verifier@wishwell.org", password_hash=pwd_hash, full_name="Marcus Chen (Field Verifier)", role="verifier")
        
        # Add both contact@stmarys.org and contact@stmaryshaven.org
        inst1_user = User(email="contact@stmarys.org", password_hash=pwd_hash, full_name="Sister Teresa Ramos", role="institution")
        inst1_alt = User(email="contact@stmaryshaven.org", password_hash=pwd_hash, full_name="Sister Teresa Ramos", role="institution")
        inst2_user = User(email="info@sunshinehome.org", password_hash=pwd_hash, full_name="David Kim", role="institution")
        inst3_user = User(email="director@hopevillage.org", password_hash=pwd_hash, full_name="Amina Al-Mansoor", role="institution")

        donor1 = User(email="sarah.jenkins@example.com", password_hash=pwd_hash, full_name="Sarah Jenkins", role="donor")
        donor2 = User(email="rohit.sharma@example.com", password_hash=pwd_hash, full_name="Rohit Sharma", role="donor")
        donor3 = User(email="emily.watson@example.com", password_hash=pwd_hash, full_name="Emily Watson", role="donor")
        donor4 = User(email="liam.patel@example.com", password_hash=pwd_hash, full_name="Liam Patel", role="donor")

        session.add_all([admin, verifier, inst1_user, inst1_alt, inst2_user, inst3_user, donor1, donor2, donor3, donor4])
        await session.flush()

        # 2. Institutions
        inst1 = Institution(
            user_id=inst1_user.id,
            name="St. Mary's Children's Haven",
            registration_number="REG-MH-2018-0912",
            address="42 Sanctuary Way, Hill View",
            city="Mumbai",
            state="Maharashtra",
            postal_code="400050",
            phone="+91 22 2640 1122",
            website_url="https://stmaryshaven.org",
            description="Home providing shelter, healthcare, and education for 45 resident children.",
            status="verified"
        )
        inst2 = Institution(
            user_id=inst2_user.id,
            name="Sunshine Youth Sanctuary",
            registration_number="REG-KA-2020-4418",
            address="88 Sunrise Colony, Koramangala",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560034",
            phone="+91 80 4112 8899",
            website_url="https://sunshineyouth.org",
            description="Community residential center fostering creative arts and academic tutoring.",
            status="recommended"
        )
        inst3 = Institution(
            user_id=inst3_user.id,
            name="Hope Village Child Center",
            registration_number="REG-DL-2022-7731",
            address="14 Green Meadows Lane, Mehrauli",
            city="New Delhi",
            state="Delhi",
            postal_code="110030",
            phone="+91 11 2680 5500",
            description="Newly founded shelter supporting rural migrant children needing schooling support.",
            status="pending"
        )
        session.add_all([inst1, inst2, inst3])
        await session.flush()

        # 3. Categories
        categories_data = [
            ("Educational Supplies", "Notebooks, textbooks, stationery, school bags, and scientific calculators."),
            ("Clothing & Footwear", "School uniforms, sweaters, winter coats, walking shoes, and socks."),
            ("Health & Hygiene", "Toothbrushes, soaps, sanitizers, sanitary pads, and first-aid kits."),
            ("Nutrition & Food", "Rice sacks, lentils, infant formula, protein bars, and cooking oil."),
            ("Bedding & Linen", "Single bed mattresses, warm wool blankets, bedsheets, and pillows."),
            ("Sports & Recreation", "Footballs, cricket bats, chess sets, art drawing supplies, and storybooks.")
        ]
        cats = [Category(name=n, description=d) for n, d in categories_data]
        session.add_all(cats)
        await session.flush()

        # 4. Wishes
        future_20d = (now + timedelta(days=20)).replace(tzinfo=None)
        future_15d = (now + timedelta(days=15)).replace(tzinfo=None)
        future_30d = (now + timedelta(days=30)).replace(tzinfo=None)

        w1 = Wish(
            institution_id=inst1.id, category_id=cats[0].id,
            title="Mathematics Notebooks & Geometry Sets",
            description="Spiral grid notebooks and compass boxes for Class 8-10 students.",
            item_name="A4 Grid Math Notebooks & Geometry Box",
            qty_requested=30, needed_by=future_20d, status="open",
            created_at=now, updated_at=now
        )
        w2 = Wish(
            institution_id=inst1.id, category_id=cats[4].id,
            title="Winter Thermal Single Blankets",
            description="Heavy fleece blankets for dormitory single beds during cold nights.",
            item_name="Thermal Fleece Blanket Single Bed",
            qty_requested=20, needed_by=future_15d, status="partially_claimed",
            created_at=now, updated_at=now
        )
        w3 = Wish(
            institution_id=inst1.id, category_id=cats[1].id,
            title="Sturdy School Shoes (Sizes 3-6)",
            description="Black leather school uniform shoes for resident boys and girls.",
            item_name="Black Leather School Shoes (Pair)",
            qty_requested=15, needed_by=future_30d, status="open",
            created_at=now, updated_at=now
        )
        w4 = Wish(
            institution_id=inst1.id, category_id=cats[2].id,
            title="Monthly Hygiene Care Packages",
            description="Kits containing soap bars, toothbrushes, toothpaste, and towels.",
            item_name="Individual Child Hygiene Care Kit",
            qty_requested=45, needed_by=future_20d, status="open",
            created_at=now, updated_at=now
        )
        session.add_all([w1, w2, w3, w4])
        await session.flush()

        # 5. Active Claim on w2
        c1 = WishClaim(
            wish_id=w2.id, donor_id=donor1.id, qty=5,
            deadline=(now + timedelta(days=14)).replace(tzinfo=None),
            status="active", created_at=now, updated_at=now
        )
        session.add(c1)
        await session.flush()

        # 6. Initial Audit Log
        from app.core.audit import GENESIS_HASH
        import hashlib
        h = hashlib.sha256(f"{GENESIS_HASH}:1:users:1:SEED".encode()).hexdigest()
        audit1 = AuditLog(
            entity_type="users", entity_id=1, action="SEED",
            prev_hash=GENESIS_HASH, record_hash=h,
            details="System initial seed data loaded.", created_at=now
        )
        session.add(audit1)

        await session.commit()
    
    await engine.dispose()
    print("Database successfully initialized and seeded with all test accounts!")

if __name__ == "__main__":
    asyncio.run(seed_database())
