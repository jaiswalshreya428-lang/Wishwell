"""
Pytest Fixtures for WishWell Backend Testing
Sets up in-memory SQLite database, mock sessions, seeds baseline accounts, and test client.

ARCHITECTURE NOTES:
- Uses SQLite in-memory with aiosqlite for ultra-fast, isolated, and deterministic test runs.
- Overrides FastAPI get_db dependency so test queries execute inside the test database.
- Provides token generator fixtures for all four roles: admin, verifier, institution, donor.
"""

import sys
from pathlib import Path
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
from app.core.database import Base, get_db
from app.core.security import hash_password, create_access_token
from app.core.rate_limit import login_rate_limiter
from app.models.entities import User, Institution

# Shared in-memory SQLite database across all test connections
TEST_DATABASE_URL = "sqlite+aiosqlite:///file:wishwell_test_db?mode=memory&cache=shared&uri=true"

test_async_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False
)

TestAsyncSessionLocal = async_sessionmaker(
    bind=test_async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

@pytest_asyncio.fixture(autouse=True)
async def setup_test_database():
    """
    Creates all tables in the in-memory test database, seeds foundational
    test accounts (admin, verifier, institution, donor), and tears down tables afterwards.
    """
    # Reset in-memory rate limiter between tests
    login_rate_limiter._attempts.clear()

    async with test_async_engine.begin() as conn:
        await conn.execute(text("DROP VIEW IF EXISTS v_open_wishes"))
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        # Recreate dbo.v_open_wishes as a true SQL view in SQLite test environment
        await conn.execute(text("DROP TABLE IF EXISTS v_open_wishes"))
        await conn.execute(text("""
            CREATE VIEW v_open_wishes AS
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
        # Database trigger guaranteeing sum of active claims <= qty_requested
        await conn.execute(text("""
            CREATE TRIGGER IF NOT EXISTS trg_wish_claims_enforce_active_qty_limit
            AFTER INSERT ON wish_claims
            WHEN (SELECT COALESCE(SUM(qty), 0) FROM wish_claims WHERE wish_id = NEW.wish_id AND status = 'active') > (SELECT qty_requested FROM wishes WHERE id = NEW.wish_id)
            BEGIN
                SELECT RAISE(FAIL, 'Business Rule Violation: The total quantity of active claims exceeds the requested quantity for this wish.');
            END;
        """))
        # Database triggers enforcing append-only immutability on audit_log
        await conn.execute(text("""
            CREATE TRIGGER IF NOT EXISTS trg_audit_log_prevent_update
            BEFORE UPDATE ON audit_log
            BEGIN
                SELECT RAISE(FAIL, 'Security Violation: audit_log is an append-only ledger. UPDATE operations are strictly forbidden.');
            END;
        """))
        await conn.execute(text("""
            CREATE TRIGGER IF NOT EXISTS trg_audit_log_prevent_delete
            BEFORE DELETE ON audit_log
            BEGIN
                SELECT RAISE(FAIL, 'Security Violation: audit_log is an append-only ledger. DELETE operations are strictly forbidden.');
            END;
        """))

    # Seed foundational test accounts
    async with TestAsyncSessionLocal() as session:
        default_pwd_hash = hash_password("Password123!")

        admin_user = User(
            email="admin@wishwell.org",
            password_hash=default_pwd_hash,
            full_name="Elena Admin",
            role="admin"
        )
        verifier_user = User(
            email="verifier@wishwell.org",
            password_hash=default_pwd_hash,
            full_name="Marcus Verifier",
            role="verifier"
        )
        inst_user = User(
            email="institution@wishwell.org",
            password_hash=default_pwd_hash,
            full_name="Sister Teresa",
            role="institution"
        )
        donor_user = User(
            email="donor@wishwell.org",
            password_hash=default_pwd_hash,
            full_name="Sarah Donor",
            role="donor"
        )
        session.add_all([admin_user, verifier_user, inst_user, donor_user])
        await session.flush()

        # Add institution profile for inst_user
        inst_profile = Institution(
            user_id=inst_user.id,
            name="St. Mary's Test Haven",
            registration_number="REG-TEST-001",
            address="123 Test Street",
            city="Mumbai",
            state="Maharashtra",
            postal_code="400001",
            phone="+91 22 1234 5678",
            status="pending"
        )
        session.add(inst_profile)

        from app.models.entities import Category
        cat = Category(
            name="Educational Supplies",
            description="Books, notebooks, and math supplies"
        )
        session.add(cat)
        await session.commit()

    yield

    async with test_async_engine.begin() as conn:
        await conn.execute(text("DROP VIEW IF EXISTS v_open_wishes"))
        await conn.run_sync(Base.metadata.drop_all)

async def override_get_db():
    async with TestAsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

app.dependency_overrides[get_db] = override_get_db

@pytest_asyncio.fixture
async def async_client():
    """Provides an async HTTP client for calling FastAPI endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

@pytest.fixture
def donor_token():
    return create_access_token({"sub": "4", "email": "donor@wishwell.org", "role": "donor", "name": "Sarah Donor"})

@pytest.fixture
def institution_token():
    return create_access_token({"sub": "3", "email": "institution@wishwell.org", "role": "institution", "name": "Sister Teresa"})

@pytest.fixture
def verifier_token():
    return create_access_token({"sub": "2", "email": "verifier@wishwell.org", "role": "verifier", "name": "Marcus Verifier"})

@pytest.fixture
def admin_token():
    return create_access_token({"sub": "1", "email": "admin@wishwell.org", "role": "admin", "name": "Elena Admin"})
