# WishWell — Verified Wish-Matching Platform

> **University Project Monorepo & Technical Engineering Reference**  
> Full-Stack Platform connecting verified children's homes with donors for direct, transparent item fulfillment.

---

## 1. Product Overview

**WishWell** solves a critical trust deficit in charitable giving: donor skepticism about whether monetary contributions reach vulnerable children. 

### Key Platform Invariants:
1. **Item-Only Matching**: Verified children's homes request specific physical items (textbooks, clothing, bedding, nutritional supplies), never arbitrary monetary pools.
2. **Two-Step Verification**: Before a home can post wishes, it must complete a physical premises inspection by a Field Verifier, followed by final administrative approval.
3. **Strict Child Privacy**: **Zero photos of children are permitted on the platform.** Confirmations require photographic proof of the physical items only. All EXIF/GPS metadata is stripped before storage.
4. **Append-Only Cryptographic Audit Log**: Every pledge, status change, and delivery confirmation is sealed into a SHA-256 hash chain in SQL Server, protected against direct database tampering by database triggers.

---

## 2. Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide Icons.
- **Backend**: Python 3.14 / 3.11+, FastAPI, SQLAlchemy 2.0 (Asyncio), Pydantic v2, Pillow.
- **Database**: Microsoft SQL Server 2022 (T-SQL) in Docker (compatible with Azure SQL Database).
- **Semi-Structured NoSQL**: Azure Cosmos DB (Core/SQL API) Serverless (containers: `audit_events`, `delivery_metadata`).
- **Storage**: Private Azure Blob Storage / Azurite Emulator with 15-minute SAS URLs.
- **Authentication**: JWT access tokens (HS256) stored in memory, Passlib (bcrypt).
- **Testing**: Pytest (Asyncio), SQLite in-memory test engine with database trigger emulation.

---

## 3. Test Logins for Each Role

The database comes pre-seeded with fictional accounts for all four roles. In the frontend, you can also use the **1-Click interactive demo Switcher** in the top-right navbar menu.

| Role | Email Address | Password | Permissions & Workflow |
|---|---|---|---|
| **Administrator** | `admin@wishwell.org` | `Password123!` | Final 2nd-step verification approval, system analytics (Power BI JSON feed), cryptographic hash chain integrity verification, manual stale-claim procedure execution. |
| **Field Verifier** | `verifier@wishwell.org` | `Password123!` | Pending institution queue, private SAS document inspection, physical premises verification recommendations/rejections. |
| **Institution** | `contact@stmarys.org` | `Password123!` | Verified children's home: post item wishes (with duplicate-need detection), track pledges, confirm item receipt with photo proof, send thank-you notes. |
| **Donor** | `sarah.jenkins@example.com` | `Password123!` | Public wish browsing, item pledging with calculated 14-day deadlines, mark packages as delivered with tracking numbers, voluntary claim release, personal impact report. |

*Additional Seed Donors*: `rohit.sharma@example.com`, `emily.watson@example.com`, `liam.patel@example.com` (All passwords: `Password123!`).

---

## 4. Quickstart & Setup Guide

### Prerequisites
- Docker & Docker Compose
- Python 3.10+ (with `pip`)
- Node.js 18+ (with `npm`)
- ODBC Driver 18 for SQL Server (for direct host connection to SQL Server)

### Step 1: Clone and Configure Environment
```bash
cp .env.example .env
```

### Step 2: Start Infrastructure (Docker Containers)
```bash
docker compose up -d
docker compose ps
```
This starts:
- **Microsoft SQL Server 2022** on `localhost:1433`
- **Azurite Blob Storage Emulator** on `localhost:10000`

### Step 3: Run FastAPI Backend
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- Swagger API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### Step 4: Run Vite Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5. Environment Variables Reference

| Variable | Default Value | Description |
|---|---|---|
| `DATABASE_URL` | `mssql+aioodbc://sa:WishWell_SecureP@ss2026!@localhost:1433/wishwell?...` | Async connection string for SQLAlchemy |
| `DATABASE_SYNC_URL` | `mssql+pyodbc://...` | Synchronous connection string for Alembic/scripts |
| `AZURE_STORAGE_CONNECTION_STRING` | Local Azurite connection string | Connection string for Azure / Azurite Blob Storage |
| `AZURE_STORAGE_CONTAINER_NAME` | `delivery-photos` | Container name for verification proofs and item delivery photos |
| `JWT_SECRET_KEY` | *(Set in .env)* | 32+ character secret key for signing JWT tokens |
| `JWT_ALGORITHM` | `HS256` | Symmetric signature algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` (24 hours) | Token lifespan |
| `ENVIRONMENT` | `development` | Environment mode (`development`, `staging`, `production`) |
| `CORS_ORIGINS` | `["http://localhost:5173", "http://127.0.0.1:5173"]` | Whitelisted frontend origins |
| `COSMOS_ENDPOINT` | *(Optional in local dev)* | Azure Cosmos DB URI (e.g. `https://<account>.documents.azure.com:443/`) |
| `COSMOS_KEY` | *(Optional in local dev)* | Azure Cosmos DB Primary Read/Write Key |
| `COSMOS_DATABASE_NAME` | `wishwell-nosql` | Cosmos DB database name holding semi-structured containers |

---

## 6. How to Run Tests

### Backend Unit & Concurrency Test Suite (73 Tests)
```bash
cd backend
pytest -v
```
Tests cover:
- Authentication & rate limiting (`test_auth.py`)
- Role-based access control (`test_rbac.py`)
- Two-step verification state machine (`test_verification_workflow.py`)
- Wish creation & duplicate detection rule (`test_wishes.py`)
- High-concurrency race condition (20 simultaneous pledges on 10 items) (`test_claims_concurrency.py`)
- Anti-fraud delivery confirmation & EXIF stripping (`test_delivery_impact.py`)
- Append-only database triggers & SHA-256 hash chain integrity (`test_audit_analytics.py`)

### Database Schema & Invariants Simulation Suite
```bash
python scripts/verify_db.py
```
Validates:
- 3NF compliance and table constraints
- T-SQL triggers (`trg_wishes_check_needed_by_future`, `trg_wish_claims_enforce_active_qty_limit`, `trg_audit_log_prevent_mutation`)
- Stored procedure `sp_release_stale_claims` execution
- SQL View `v_open_wishes` remaining quantity calculation

---

## 7. Architecture & Key Architectural Highlights

- **3NF Normalization**: Complete functional dependency analysis in [docs/3NF_ANALYSIS.md](docs/3NF_ANALYSIS.md).
- **Concurrency Control**: Wish claims utilize row locking (`UPDLOCK, HOLDLOCK`) and database triggers guaranteeing active claim sums never exceed requested quantities.
- **Explainable Duplicate Detection**: Simple, transparent Jaccard token overlap ($\ge 50\%$) documented in [docs/DUPLICATE_DETECTION.md](docs/DUPLICATE_DETECTION.md).
- **Zero Children Photos**: Anti-exploitation enforcement through Pillow image re-encoding, EXIF/GPS stripping, and item-only container policy.
- **Append-Only Ledger**: Cryptographic hash chain ($\text{SHA-256}(\text{prev\_hash} \,\|\, \text{payload})$) verified via live endpoint `GET /api/admin/audit/verify`.
- **Polyglot Persistence & Cryptographic Anchoring**: Semi-structured audit event details and delivery/courier metadata are stored as JSON documents in Azure Cosmos DB (`audit_events` partitioned by `/entity`, `delivery_metadata` partitioned by `/claim_id`). The SHA-256 hash of each Cosmos document is sealed inside SQL Server's append-only hash chain (`dbo.audit_log.cosmos_doc_id`), cryptographically binding relational and document stores. Resilient design ensures that if Cosmos DB is unavailable, core relational transactions complete seamlessly with a warning log. Admins can inspect the raw JSON document via `GET /api/admin/audit/events/{doc_id}`.
- **Power BI Analytics & Reporting**: 5 dedicated SQL views (`vw_wishes_by_category_month`, `vw_avg_delivery_time`, `vw_institutions_by_status`, `vw_stale_claim_rate`, `vw_top_categories`), a 6-month historical dataset (~300 wishes, 150 claims, 100 deliveries in `db/seed_analytics.sql`), and a read-only user `powerbi_reader` documented in [docs/powerbi.md](docs/powerbi.md).
