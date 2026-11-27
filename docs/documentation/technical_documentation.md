# WishWell — Technical Documentation

> **Document Scope:** Internal engineering reference covering frontend architecture, backend services, ORM & T-SQL design, concurrency control, security primitives, configuration, and local execution commands.  
> **Related Documents:** [architecture.md](./architecture.md) | [database_documentation.md](./database_documentation.md) | [api_documentation.md](./api_documentation.md) | [security_documentation.md](./security_documentation.md) | [testing_documentation.md](./testing_documentation.md)

---

## 1. System Architecture Summary

WishWell follows a decoupled client–server architecture (see [architecture.md](./architecture.md)):
- **Frontend SPA (`frontend/`):** React 18 + TypeScript + Vite single-page application communicating over JSON/multipart REST calls (`fetch`).
- **Backend API (`backend/`):** Python FastAPI ASGI server structured into `api/` (routers), `core/` (config, database, security, RBAC, storage, Cosmos, audit, scheduler, duplicate detection, rate limiting), `models/` (SQLAlchemy 2.0 ORM), and `schemas/` (Pydantic v2 contracts).
- **Persistence (`db/` & cloud/local stores):** Dual-dialect SQLAlchemy supporting Microsoft SQL Server 2022 / Azure SQL (`aioodbc`) and SQLite (`aiosqlite` via `wishwell.db`), paired with Azure Blob Storage / Azurite (private containers) and optional Azure Cosmos DB (NoSQL API).

---

## 2. Frontend Structure & Components (`frontend/src/`)

| Directory / File | Responsibility |
|---|---|
| `App.tsx` | Top-level `AuthProvider` + `ToastProvider`, hash/path router (`normalizeRoute`), role guard helper (`requireRoles`), modals, and layout shell. |
| `api/client.ts` | `apiRequest<T>()` wrapper around `fetch`, `VITE_API_BASE` configuration, in-memory + `sessionStorage` token storage (`getAuthToken`, `setAuthToken`), and typed `ApiError`, `DuplicateWishError`, `OverClaimError`. |
| `api/endpoints.ts` | Namespaced API client (`api.auth`, `api.wishes`, `api.claims`, `api.deliveries`, `api.verifications`, `api.admin`). |
| `context/AuthContext.tsx` | Manages `user`, `token`, `login`, `register`, `logout`, `refreshUser`, and `quickDemoLogin`. |
| `context/ToastContext.tsx` | Non-blocking toast notification queue. |
| `types/index.ts` | TypeScript interfaces matching backend responses. |
| `components/layout/` | `DemoRoleBar.tsx`, `Navbar.tsx`, `Footer.tsx`, `WorkPageHeader.tsx`, `WishWellLogo.tsx`. |
| `components/public/` | `LandingPage.tsx`, `BrowseWishes.tsx` (paginated filterable catalog), `WishDetailModal.tsx`. |
| `components/auth/` | `AuthModal.tsx` (Sign In, Register Donor/Institution, One-Click Demo Profiles). |
| `components/donor/` | `ClaimModal.tsx`, `MyClaims.tsx`, `DonorImpact.tsx`, `DonorNotifications.tsx`. |
| `components/institution/` | `InstitutionOnboarding.tsx`, `MyWishesList.tsx`, `CreateWishForm.tsx`, `ConfirmDeliveryModal.tsx`, `SendThankYouModal.tsx`. |
| `components/verifier/` | `VerifierQueue.tsx` (pending inspections + SAS document links + recommend/reject modal). |
| `components/admin/` | `AdminApprovalQueue.tsx`, `AdminAnalyticsDashboard.tsx`, `AdminAuditLogViewer.tsx`. |
| `components/common/` & `atmosphere/` | Reusable UI (`Modal`, `StatusBadge`, `LoadingSpinner`, `EmptyState`, `SkeletonCard`) and visual effects (`PaperGrain`, `ScrollProgressBar`, `SuccessBurst`, `VintageWishingWell`, `StorybookGiftScene`). |

---

## 3. Backend Structure & API Routes (`backend/app/`)

`backend/app/main.py` initializes `FastAPI` with `lifespan` (starting/stopping `APScheduler`), registers `SecurityHeadersMiddleware`, `CORSMiddleware`, `global_exception_handler`, root routes (`/`, `/health`), and mounts `api_router` (`/api`) from `backend/app/api/router.py`:
- `auth.py` (`/api/auth/*`)
- `institutions.py` (`/api/institutions/*`)
- `verifications.py` (`/api/verifications/*`)
- `wishes.py` (`/api/wishes/*`)
- `claims.py` (`/api/categories`, `/api/wishes/{id}/claim`, `/api/claims/*`, `/api/admin/claims/release-stale`)
- `deliveries.py` (`/api/claims/{id}/deliver`, `/api/deliveries/*`)
- `notifications.py` (`/api/notifications/*`)
- `impact.py` (`/api/donors/impact`, `/api/impact/donor`, aliases)
- `admin_analytics.py` (`/api/admin/audit/*`, `/api/admin/analytics/*`, `/api/admin/claims/release-stale`)

*(Full route table, payloads, roles, and error codes are documented in [api_documentation.md](./api_documentation.md).)*

---

## 4. Database Integration, Normalization & SQL Objects

### 4.1 SQLAlchemy 2.0 Async Setup (`backend/app/core/database.py`)
`create_async_engine` builds `async_engine` with `pool_pre_ping=True`, `pool_size=10`, and `max_overflow=20`. `_resolve_database_url()` checks `pyodbc.drivers()` when using `mssql` URLs and falls back from `ODBC Driver 18 for SQL Server` to `ODBC Driver 17 for SQL Server` if Driver 18 is absent. The `get_db()` dependency yields a scoped `AsyncSession`, rolls back on unhandled exceptions, and closes the session in `finally`.

### 4.2 ORM Models & Schema (`backend/app/models/entities.py`, `db/schema.sql`)
All 11 tables (`users`, `institutions`, `institution_documents`, `verification_records`, `categories`, `wishes`, `wish_claims`, `deliveries`, `thank_you_notes`, `notifications`, `audit_log`) plus `OpenWishView` (`v_open_wishes`) are mapped with SQLAlchemy 2.0 `Mapped[...]` annotations, `ForeignKey`, `CheckConstraint`, and `UniqueConstraint`. Details of all columns, 3NF proofs, 6 SQL views, 8 T-SQL triggers, and stored procedure `dbo.sp_release_stale_claims` are provided in [database_documentation.md](./database_documentation.md).

---

## 5. Core Workflows & Code Walkthroughs

### 5.1 Authentication, Bcrypt & JWT (`backend/app/core/security.py`, `dependencies.py`)
- `hash_password()` generates a 12-round salt via `bcrypt.gensalt(rounds=12)` and hashes UTF-8 password bytes with `bcrypt.hashpw()`.
- `verify_password()` uses `bcrypt.checkpw()` for constant-time comparison.
- `create_access_token()` embeds `sub`, `email`, `role`, `name`, `iat`, and `exp` (`now + timedelta(minutes=15)`), signed via `jwt.encode(..., algorithm="HS256")`.
- `require_role(*roles)` (`dependencies.py`) chains `Depends(get_current_user)`, validates the Bearer token, reloads the `User` from SQL, and raises `HTTP 403` if `current_user.role not in roles`:
  ```python
  def require_role(*roles: str) -> Callable[[User], Any]:
      async def role_checker(current_user: User = Depends(get_current_user)) -> User:
          if current_user.role not in roles:
              raise HTTPException(
                  status_code=status.HTTP_403_FORBIDDEN,
                  detail=f"Access forbidden: requires role in [{', '.join(roles)}]. Current role: '{current_user.role}'."
              )
          return current_user
      return role_checker
  ```

### 5.2 Database Transactions & Two-Tier Concurrency Control (`claims.py`, `concurrency.py`)
To prevent race conditions when concurrent donors pledge on the same wish:
1. **Application Mutex (`backend/app/core/concurrency.py`):** `async with get_wish_lock(wish_id):` serializes concurrent asyncio coroutines per `wish_id`.
2. **SQL Server Row Lock (`backend/app/api/claims.py` lines 62–66):**
   ```python
   wish_stmt = (
       select(Wish)
       .where(Wish.id == wish_id)
       .with_hint(Wish, "WITH (UPDLOCK, HOLDLOCK)", dialect_name="mssql")
   )
   ```
3. **Atomic Calculation & Trigger Guard:** Inside the lock, `claim_wish` sums active `WishClaim.qty`, rejects `payload.qty > remaining_qty` with `HTTP 409`, inserts the `WishClaim` (`deadline = min(now + 14d, wish.needed_by)`), updates `wish.status`, writes an audit log block, and commits atomically. At the database layer, `trg_wish_claims_enforce_active_qty_limit` rolls back any over-allocation.

### 5.3 Explainable Duplicate-Need Detection (`backend/app/core/duplicate_detector.py`)
When an institution posts a wish (`POST /api/wishes`) with `confirm_duplicate=False`:
1. Normalizes strings (`lowercase`, replaces `[^\w\s]` with space, collapses whitespace).
2. Returns `1.0` on exact normalized match.
3. Computes Jaccard similarity $J = \frac{|A \cap B|}{|A \cup B|}$ and, when one token set is a subset of the other, containment score $C = \frac{|A \cap B|}{\min(|A|, |B|)}$, setting `effective_score = max(jaccard_score, containment_score * 0.8)`.
4. Any open/partially claimed wish in the same institution and category with `score >= 0.5` triggers `HTTP 409 Conflict` listing `similar_wishes` and `match_reason`.

### 5.4 File Upload, EXIF Stripping & Storage Workflow (`backend/app/core/storage.py`)
- **`upload_document` (Verification Proofs):** Enforces `<= 5 MB`, inspects magic bytes (`%PDF-`, `\x89PNG\r\n\x1a\n`, `\xff\xd8\xff`), renames to `<uuid>.<ext>`, uploads to private container `institution-documents` (falling back to `_mock_blobs` if Azurite/Azure Blob is unreachable), and issues 15-minute read-only SAS URLs via `_generate_container_sas_url()` using `self.blob_service_client.url`.
- **`upload_delivery_proof` (Delivery Confirmations):** Restricts magic bytes to JPEG/PNG, validates via `Image.open` + `img.verify()`, converts to RGB, re-encodes as clean JPEG (`quality=85, optimize=True`) with zero EXIF/GPS metadata (`sanitize_and_strip_exif`), and uploads to private container `delivery-proofs`.

### 5.5 Cryptographic Audit Hash Chain & Background Scheduler (`audit.py`, `cosmos.py`, `scheduler.py`)
- `record_audit_event()` optionally persists a JSON document to Azure Cosmos DB (`audit_events`, PK `/entity`), computes its sorted-JSON SHA-256 hash (`canonical_json_hash`), fetches the latest `AuditLog.record_hash` (or `GENESIS_HASH = "0"*64`), computes the chained SHA-256 hash, and adds the `AuditLog` row to the active SQL transaction.
- `APScheduler` (`AsyncIOScheduler`) schedules `_scheduled_stale_claim_job` every **15 minutes**, executing `EXEC dbo.sp_release_stale_claims` on `mssql` or the equivalent atomic ORM transaction on SQLite.

### 5.6 Input Validation & Global Error Handling (`main.py`, `schemas/*.py`)
- Pydantic v2 schemas enforce field bounds and emit structured `HTTP 422` responses on invalid payloads.
- `global_exception_handler` preserves `HTTPException` and `RequestValidationError`, while logging unhandled exceptions with a generated `incident_id` UUID and returning a generic `HTTP 500` body.

---

## 6. Environment Variables & Configuration (`backend/app/core/config.py`)

| Variable | Local Default (`.env` / `config.py`) | Purpose |
|---|---|---|
| `ENVIRONMENT` | `development` | Enables SQL echo in dev; enables HSTS and production secret check in `production`. |
| `DATABASE_URL` | `sqlite+aiosqlite:///.../wishwell.db` (`.env`) / MSSQL (`config.py`) | Async SQLAlchemy connection string. |
| `DATABASE_SYNC_URL` | `sqlite:///.../wishwell.db` (`.env`) / MSSQL (`config.py`) | Sync connection string for scripts/migrations. |
| `AZURE_STORAGE_CONNECTION_STRING` | Local Azurite string | Azure Blob Storage / Azurite connection string. |
| `AZURE_STORAGE_CONTAINER_NAME` | `delivery-photos` | Configured default container setting (`storage.py` uses `institution-documents` and `delivery-proofs`). |
| `COSMOS_ENDPOINT`, `COSMOS_KEY` | `None` (empty) | Optional Azure Cosmos DB URI and key; blank enables in-memory fallback. |
| `COSMOS_DATABASE_NAME` | `wishwell-nosql` | Cosmos DB database name. |
| `JWT_SECRET_KEY` | Dev fallback key | HS256 signing secret (blocked in `production` if unchanged). |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Defined in `Settings` (note: `security.py` currently uses 15-minute expiry). |
| `CORS_ORIGINS` | `["http://localhost:5173", ...]` | Whitelisted frontend origins (accepts JSON array or comma-separated string). |
| `VITE_API_BASE` *(Frontend)* | `http://localhost:8000/api` | Target API base URL used by `frontend/src/api/client.ts`. |

---

## 7. Local Setup & Execution Commands

```powershell
# 1. Initialize or reset local SQLite demo database (optional; wishwell.db already exists)
.\.venv\Scripts\python.exe scripts\init_local_db.py

# 2. Start Backend API (Terminal 1)
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# 3. Start Frontend Dev Server (Terminal 2)
cd frontend
npm run dev

# 4. Run Backend Tests (75 tests)
cd backend
..\.venv\Scripts\python.exe -m pytest -v
```
