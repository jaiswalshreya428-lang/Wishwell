# WishWell — Technology Stack Documentation

> **Document Scope:** Complete inventory of languages, frameworks, libraries, databases, and tooling actually present in `backend/requirements.txt`, `backend/pyproject.toml`, `frontend/package.json`, `docker-compose.yml`, and `infra/`.  
> **Related Documents:** [architecture.md](./architecture.md) | [technical_documentation.md](./technical_documentation.md)

---

## 1. Frontend Technologies (`frontend/package.json`)

| Technology | Version Spec | Where Used | Why Selected |
|---|---|---|---|
| **React** | `^18.2.0` | `frontend/src/App.tsx`, `context/`, `components/` | Component-based SPA architecture with Context API (`AuthContext`, `ToastContext`) and clean state management. |
| **React DOM** | `^18.2.0` | `frontend/src/main.tsx` | Browser DOM rendering engine for React 18. |
| **TypeScript** | `^5.2.2` | `frontend/src/**/*.ts`, `*.tsx`, `tsconfig.json` | Compile-time type safety across API payloads (`types/index.ts`, `api/endpoints.ts`), preventing runtime schema mismatches. |
| **Vite** | `^5.4.11` | `frontend/vite.config.ts` | Fast ESM dev server with `/api` proxy to `localhost:8000` and manual Rollup code-splitting (`vendor-react`, `vendor-motion`, `vendor-charts`, `vendor-icons`). |
| **Tailwind CSS** | `^3.4.1` | `frontend/tailwind.config.js`, `src/index.css`, all TSX views | Utility-first styling enabling consistent responsive layouts and custom soothing color/typography tokens. |
| **PostCSS & Autoprefixer** | `^8.4.35`, `^10.4.18` | `frontend/postcss.config.js` | Compiles Tailwind directives and injects cross-browser CSS vendor prefixes. |
| **Recharts** | `^2.12.0` | `LandingPage.tsx`, `AdminAnalyticsDashboard.tsx` | Declarative SVG charts for category fulfillment and administrative analytics trends. |
| **Framer Motion** | `^14.12.0` | `App.tsx`, `BrowseWishes.tsx`, `DonorImpact.tsx`, `LandingPage.tsx` | Smooth page transitions (`AnimatePresence`), staggered cards, and `useReducedMotion` accessibility support. |
| **Lucide React** | `^0.358.0` | `Navbar.tsx`, `BrowseWishes.tsx`, `AdminAnalyticsDashboard.tsx`, `DonorImpact.tsx` | Lightweight tree-shakeable SVG icons for UI affordances and role actions. |

---

## 2. Backend Technologies (`backend/requirements.txt` & `backend/pyproject.toml`)

| Technology | Version Spec | Where Used | Why Selected |
|---|---|---|---|
| **Python** | `>=3.11` (3.14.2 locally; 3.11 in Azure scripts) | `backend/app/`, `scripts/`, `infra/apply_sql.py` | Strong ecosystem for async web APIs, security primitives, and image sanitization. |
| **FastAPI** | `>=0.110.0` | `backend/app/main.py`, `backend/app/api/*.py` | Async ASGI framework with built-in Dependency Injection (`Depends`), OpenAPI/Swagger (`/docs`), and Pydantic integration. |
| **Uvicorn (`[standard]`)** | `>=0.28.0` | `start.ps1`, `Makefile`, `infra/deploy.ps1` | High-performance ASGI server running FastAPI in development (`--reload`) and production. |
| **Pydantic & Pydantic-Settings** | `>=2.6.0`, `>=2.2.0` | `backend/app/schemas/*.py`, `backend/app/core/config.py` | Strict request/response validation (`HTTP 422`), `.env` parsing, and production secret validation. |
| **Email-Validator** | `>=2.0.0` | `backend/app/schemas/auth.py` | Validates RFC-compliant email syntax via `EmailStr`. |
| **SQLAlchemy (`[asyncio]`)** | `>=2.0.28` | `backend/app/core/database.py`, `models/entities.py`, all routers | Async ORM (`AsyncSession`) with parameterized SQL injection protection and cross-dialect support (MSSQL & SQLite). |
| **Greenlet** | `>=3.0.0` | Required by SQLAlchemy async engine | Enables green-thread switching inside SQLAlchemy's asyncio integration. |
| **PyODBC & AioODBC** | `>=5.1.0`, `>=0.5.0` | `database.py`, `db/init_db.py`, `infra/apply_sql.py` | Sync and async ODBC connectivity to Microsoft SQL Server 2022 and Azure SQL Database. |
| **Aiosqlite** | `>=0.20.0` | `.env` (`wishwell.db`), `scripts/init_local_db.py`, `backend/tests/conftest.py` | Zero-configuration async SQLite driver enabling local demos and fast in-memory testing. |
| **Alembic** | `>=1.13.1` | `backend/requirements.txt` | Included in dependencies for database migration tooling (schema currently applied via `db/schema.sql`, `db/init_db.py`, and `infra/apply_sql.py`). |
| **PyJWT & Cryptography** | `>=2.8.0`, `>=42.0.0` | `backend/app/core/security.py` | Signs and validates HS256 JWT tokens without `python-jose` CVEs. |
| **Bcrypt** | `>=4.1.2` | `backend/app/core/security.py` | Direct salted password hashing (12 rounds) and constant-time verification. |
| **Python-Dotenv** | `>=1.0.1` | `db/init_db.py`, `backend/app/core/config.py` | Loads `.env` configuration during local execution. |
| **Python-Multipart** | `>=0.0.9` | `api/institutions.py`, `api/verifications.py`, `api/deliveries.py` | Parses `multipart/form-data` uploads for verification documents and delivery proof photos. |
| **Pillow (PIL)** | `>=10.3.0` | `backend/app/core/storage.py` (`sanitize_and_strip_exif`) | Re-encodes uploaded delivery images into clean JPEGs, stripping all EXIF and GPS metadata. |
| **APScheduler** | `>=3.10.0` | `backend/app/core/scheduler.py` | Runs `release_stale_claims` every 15 minutes inside FastAPI's lifespan context. |
| **Azure-Storage-Blob** | `>=12.19.1` | `backend/app/core/storage.py` | Uploads files to private blob containers and generates 15-minute read-only SAS URLs (works with Azurite or Azure Blob Storage). |
| **Azure-Cosmos** | `>=4.6.0` | `backend/app/core/cosmos.py` | Persists semi-structured `audit_events` and `delivery_metadata` JSON documents when Azure Cosmos DB is configured. |
| **Pytest, Pytest-Asyncio, HTTPX** | `>=8.1.0`, `>=0.23.0`, `>=0.27.0` | `backend/tests/*.py` | Async unit, integration, RBAC, and concurrency testing (`75` test cases). |

---

## 3. Infrastructure, Database & Analytics Tooling

| Technology | Where Used | Why Selected |
|---|---|---|
| **Microsoft SQL Server 2022 / Azure SQL** | `db/schema.sql`, `docker-compose.yml`, `infra/deploy.ps1` | Enterprise RDBMS supporting T-SQL triggers, `INSTEAD OF` audit locks, `UPDLOCK/HOLDLOCK`, `OUTER APPLY`, stored procedures, and Power BI views. |
| **SQLite 3** | `wishwell.db`, `scripts/init_local_db.py`, `tests/conftest.py` | Zero-setup relational engine for local evaluation and automated in-memory testing. |
| **Azurite Emulator** | `docker-compose.yml` (port `10000`) | Local Azure Blob Storage emulator for testing private containers and SAS signatures offline. |
| **Docker & Docker Compose** | `docker-compose.yml` | Reproducible local container orchestration for SQL Server 2022 and Azurite. |
| **Azure Cloud Services (IaC Scripts)** | `infra/deploy.ps1`, `infra/deploy.sh`, `infra/DEPLOYMENT.md`, `frontend/staticwebapp.config.json` | Automated provisioning scripts for Azure App Service (B1), Azure Static Web Apps, Azure SQL Serverless, Azure Key Vault, Blob Storage, and Cosmos DB. |
| **Netlify Config** | `netlify.toml`, `frontend/public/_redirects` | Alternative static SPA hosting config with security headers and `/index.html` fallback. |
| **Microsoft Power BI** | `docs/powerbi.md`, `db/schema.sql` (`vw_*` views, `powerbi_reader`) | Connects to SQL Server / Azure SQL reporting views using a dedicated read-only SQL principal. |
