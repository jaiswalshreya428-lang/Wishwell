# WishWell — System Architecture Documentation

> **Document Scope:** Verified architectural blueprint derived strictly from the actual source code in the WishWell repository (`backend/`, `frontend/`, `db/`, `infra/`).  
> **Related Documents:** [technical_documentation.md](./technical_documentation.md) | [database_documentation.md](./database_documentation.md) | [api_documentation.md](./api_documentation.md) | [security_documentation.md](./security_documentation.md)

---

## 1. Architectural Overview

WishWell is a full-stack, multi-tier web platform designed to connect verified children's homes (institutions) with physical-item donors through transparent, auditable fulfillment workflows. Its architecture separates presentation, asynchronous REST API logic, relational ACID persistence, private binary object storage, and optional semi-structured NoSQL telemetry.

### Deployment Modes Supported in the Repository
1. **Local Standalone Mode (Active Default in `.env`)**: FastAPI (`uvicorn`) connects asynchronously via `sqlite+aiosqlite` to `wishwell.db`, with automatic in-memory fallbacks in `StorageService` and `CosmosService` when Azurite/Azure Blob or Cosmos DB are unconfigured.
2. **Local Containerized Mode (`docker-compose.yml`)**: FastAPI connects via `mssql+aioodbc` (ODBC Driver 18) to Microsoft SQL Server 2022 (`localhost:1433`) and Azurite Blob Emulator (`localhost:10000`).
3. **Cloud Production Mode (`infra/deploy.ps1`, `infra/deploy.sh`)**: React SPA on Azure Static Web Apps (or Netlify via `netlify.toml`), FastAPI on Azure App Service (Linux Python 3.11), Azure SQL Database Serverless, Azure Blob Storage, Azure Key Vault, and Azure Cosmos DB (Serverless NoSQL).

---

## 2. Overall System Architecture Diagram

```mermaid
flowchart TB
    subgraph ClientTier ["Presentation Layer (Browser)"]
        SPA["React 18 + TypeScript + Vite SPA\n(Tailwind CSS, Recharts, Framer Motion)\nIn-Memory + sessionStorage JWT"]
        PBI["Power BI Desktop / Service\n(Read-Only User: powerbi_reader)"]
    end

    subgraph APITier ["Application & API Layer (FastAPI / Uvicorn ASGI)"]
        MW["SecurityHeadersMiddleware & CORSMiddleware\nGlobal Exception Handler (Incident UUID)"]
        AUTH["Auth & RBAC Router (/api/auth)\nbcrypt (12 rounds) + HS256 JWT + RateLimiter (5/min)"]
        VERIF["Institutions & Verification (/api/institutions, /api/verifications)\n2-Step FSM (pending -> recommended -> verified)"]
        WISH["Wishes & Claims (/api/wishes, /api/claims)\nJaccard Duplicate Detector + asyncio.Lock"]
        DELIV["Deliveries, Impact & Notifications\n(/api/claims/*/deliver, /api/deliveries, /api/impact, /api/notifications)"]
        ADMIN["Admin Analytics & Audit (/api/admin)\nSHA-256 Chain Verifier + Power BI JSON Feeds"]
        SCHED["APScheduler Background Worker\n(Every 15 min: release_stale_claims)"]
        MEDIA["Pillow Image Sanitizer\n(Re-encode JPEG + Strip EXIF/GPS)"]
    end

    subgraph DataTier ["Data & Polyglot Storage Layer"]
        SQL[("Relational Database\nSQL Server 2022 / Azure SQL (Prod)\nSQLite wishwell.db (Local/Tests)\n11 Tables, v_open_wishes, 5 BI Views, Triggers, SP")]
        BLOB[("Azure Blob Storage / Azurite\nPrivate Containers:\n- institution-documents\n- delivery-proofs\n(In-memory fallback if offline)")]
        COSMOS[("Azure Cosmos DB (NoSQL API)\nContainers: audit_events, delivery_metadata\n(In-memory fallback if unconfigured)")]
    end

    SPA -->|"HTTPS / REST JSON & Multipart"| MW
    MW --> AUTH
    MW --> VERIF
    MW --> WISH
    MW --> DELIV
    MW --> ADMIN

    AUTH -->|"Async SQLAlchemy"| SQL
    VERIF -->|"Async SQLAlchemy"| SQL
    WISH -->|"Async SQLAlchemy + UPDLOCK/HOLDLOCK"| SQL
    DELIV -->|"Async SQLAlchemy"| SQL
    ADMIN -->|"Async SQLAlchemy"| SQL
    SCHED -->|"EXEC dbo.sp_release_stale_claims / ORM"| SQL
    PBI -->|"TDS Port 1433 (SELECT Only)"| SQL

    VERIF -->|"UUID Blobs + 15-min SAS"| BLOB
    DELIV --> MEDIA
    MEDIA -->|"EXIF-Stripped JPEG + 15-min SAS"| BLOB

    AUTH -.->|"Audit JSON"| COSMOS
    VERIF -.->|"Audit JSON"| COSMOS
    WISH -.->|"Audit JSON"| COSMOS
    DELIV -.->|"Delivery Metadata & Audit JSON"| COSMOS
    ADMIN -.->|"Inspect Cosmos Event"| COSMOS
```

---

## 3. Frontend–Backend–Database Interaction

### 3.1 Request Lifecycle
1. **Frontend Routing & State (`frontend/src/App.tsx`, `AuthContext.tsx`)**:
   - Uses a hash/path router (`normalizeRoute`) inside `App.tsx` supporting public views (`/`, `/browse`, `/login`) and role-guarded views (`/donor/*`, `/institution/*`, `/verifier/queue`, `/admin/*`).
   - Stores JWT bearer tokens in memory (`_inMemoryToken` in `frontend/src/api/client.ts`) synchronized with `sessionStorage` (`wishwell_session_token`).
2. **Typed API Client (`frontend/src/api/client.ts`, `endpoints.ts`)**:
   - Prepends `VITE_API_BASE` (defaulting to `http://localhost:8000/api`; Vite dev server also proxies `/api` to `http://localhost:8000`).
   - Attaches `Authorization: Bearer <token>` and maps HTTP `409 Conflict` responses to typed `DuplicateWishError` or `OverClaimError` exceptions.
3. **FastAPI Middleware & Dependency Injection (`backend/app/main.py`, `dependencies.py`)**:
   - `SecurityHeadersMiddleware` injects `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`, and `Strict-Transport-Security` (when `ENVIRONMENT != "development"`).
   - `CORSMiddleware` enforces allowed origins from `settings.CORS_ORIGINS`.
   - `require_role(*roles)` validates the JWT, fetches the `User` row from SQL via `get_db()`, and rejects unauthorized roles with HTTP `403`.
4. **Database & Polyglot Persistence (`database.py`, `audit.py`, `cosmos.py`, `storage.py`)**:
   - SQLAlchemy 2.0 `AsyncSession` executes parameterized queries against MSSQL (`aioodbc`) or SQLite (`aiosqlite`).
   - State-changing actions call `record_audit_event()`, which hashes the payload (and optional Cosmos DB canonical JSON hash) into `dbo.audit_log`.

---

## 4. Data Flow Diagrams (DFD)

### 4.1 Level 0 — Context Data Flow Diagram

```mermaid
flowchart LR
    Guest["Public Visitor / Donor"] -->|"Browse Wishes, Register, Login,\nPledge Items, Mark Delivered"| WW(("WishWell\nPlatform"))
    WW -->|"Open Wishes, Claim Deadlines,\nImpact Metrics, Notifications"| Guest

    Inst["Children's Home\n(Institution)"] -->|"Register, Upload Docs, Post Wishes,\nConfirm Delivery + Photo, Thank-You"| WW
    WW -->|"Verification Status, Pending Deliveries,\nWish Status Updates"| Inst

    Ver["Field Verifier"] -->|"Inspect Docs (SAS URL),\nRecommend or Reject"| WW
    WW -->|"Pending Queue, Document SAS Links"| Ver

    Adm["System Administrator"] -->|"Approve/Reject, Trigger Stale Release,\nVerify Hash Chain, View BI Metrics"| WW
    WW -->|"Recommended Queue, Analytics Overview,\nIntegrity Verification Report"| Adm
```

### 4.2 Level 1 — Core Wish Fulfillment & Audit Data Flow

```mermaid
flowchart TD
    D1["1.0 Auth & RBAC\n(/api/auth/*)"]
    D2["2.0 2-Step Verification\n(/api/verifications/*)"]
    D3["3.0 Wish & Duplicate Check\n(/api/wishes)"]
    D4["4.0 Atomic Claim & Expiry\n(/api/wishes/*/claim, APScheduler)"]
    D5["5.0 Delivery, EXIF Strip & Impact\n(/api/deliveries/*, /api/impact/*)"]
    D6["6.0 Audit Chain & Analytics\n(/api/admin/*)"]

    DS_SQL[("SQL Database\n(11 Relational Tables + Views)")]
    DS_BLOB[("Blob Storage\n(institution-documents,\ndelivery-proofs)")]
    DS_COSMOS[("Cosmos DB\n(audit_events,\ndelivery_metadata)")]

    D1 <-->|"users, institutions"| DS_SQL
    D1 -->|"REGISTER / LOGIN_FAILED"| D6
    D2 <-->|"institutions, verification_records,\ninstitution_documents"| DS_SQL
    D2 <-->|"PDF/JPG/PNG + 15-min SAS"| DS_BLOB
    D3 <-->|"wishes, categories, v_open_wishes"| DS_SQL
    D4 <-->|"wish_claims, wishes, notifications"| DS_SQL
    D5 <-->|"deliveries, thank_you_notes,\nnotifications"| DS_SQL
    D5 -->|"EXIF-stripped JPEG"| DS_BLOB
    D5 -->|"Delivery JSON"| DS_COSMOS
    D6 <-->|"audit_log + BI aggregations"| DS_SQL
    D6 <-->|"SHA-256 content anchor"| DS_COSMOS
```

---

## 5. Role-Based Workflow Diagrams

### 5.1 Two-Step Institution Verification State Machine

```mermaid
stateDiagram-v2
    [*] --> pending : "Institution Registers\n& Uploads Documents"
    pending --> recommended : "Field Verifier Recommends\nPOST /verifications/{id}/recommend"
    pending --> rejected : "Verifier/Admin Rejects\nPOST /verifications/{id}/reject"
    recommended --> verified : "Admin Final Approval\nPOST /verifications/{id}/approve"
    recommended --> rejected : "Admin Rejects\nPOST /verifications/{id}/approve (decision=rejected)"
    verified --> [*] : "Eligible to Post Wishes"
    rejected --> [*]
```

### 5.2 Wish, Claim & Delivery Fulfillment Lifecycle

```mermaid
sequenceDiagram
    actor Inst as Institution (Verified)
    participant API as FastAPI Backend
    participant DB as SQL Database
    participant Blob as Blob Storage
    actor Donor as Donor

    Inst->>API: POST /api/wishes (item_name, qty, needed_by)
    API->>API: Check Jaccard similarity >= 0.5
    API->>DB: Insert Wish (status='open')
    Donor->>API: POST /api/wishes/{id}/claim (qty)
    API->>DB: Acquire wish lock + check remaining qty
    DB-->>API: Insert WishClaim (deadline=min(14d, needed_by)), update Wish status
    Donor->>API: POST /api/claims/{claim_id}/deliver (tracking_number)
    API->>DB: Create Delivery (status='delivered'), Claim='delivered', Notify Institution
    Inst->>API: POST /api/deliveries/{id}/confirm (photo multipart)
    API->>API: Validate magic bytes + Strip EXIF/GPS (Pillow)
    API->>Blob: Upload UUID.jpg to delivery-proofs
    API->>DB: Update Delivery (status='confirmed'), Notify Donor
    Inst->>API: POST /api/deliveries/{id}/thank-you (message)
    API->>DB: Insert ThankYouNote (1 per delivery), Notify Donor
```
