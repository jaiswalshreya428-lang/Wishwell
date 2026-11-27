# WishWell — Security Documentation

> **Document Scope:** Verified security architecture, cryptographic controls, RBAC, storage safeguards, and known security limitations derived strictly from the repository source code.  
> **Related Documents:** [api_documentation.md](./api_documentation.md) | [database_documentation.md](./database_documentation.md) | [technical_documentation.md](./technical_documentation.md)

---

## 1. Authentication & Token Lifecycle

### 1.1 JWT Implementation (`backend/app/core/security.py`)
- **Library:** `pyjwt>=2.8.0` (chosen instead of `python-jose` to avoid known `python-jose` CVEs such as CVE-2024-33663 and CVE-2024-33664).
- **Algorithm:** Symmetric HMAC-SHA256 (`HS256`, configured via `settings.JWT_ALGORITHM`).
- **Token Claims:** `sub` (string `user.id`), `email`, `role`, `name`, `iat` (UTC issued-at), and `exp` (UTC expiration).
- **Expiration:** `create_access_token()` defaults to **15 minutes** (`timedelta(minutes=15)`), returning `expires_in: 900` in `TokenResponse`. *(Implementation note: `settings.ACCESS_TOKEN_EXPIRE_MINUTES = 1440` exists in `config.py` and `.env.example`, but `security.py` enforces 15 minutes.)*
- **Frontend Token Storage (`frontend/src/api/client.ts`):** Tokens are held in an in-memory module variable (`_inMemoryToken`) and mirrored in tab-scoped `sessionStorage` (`wishwell_session_token`), intentionally avoiding persistent `localStorage`. On sign-out, both are cleared.

### 1.2 Brute-Force Rate Limiting (`backend/app/core/rate_limit.py`)
- `LoginRateLimiter` maintains a sliding-window timestamp list per client IP (`max_attempts=5`, `window_seconds=60`).
- `POST /api/auth/login` calls `login_rate_limiter.check_and_record(client_ip)` before database lookup, returning **HTTP `429 Too Many Requests`** if 5 failed attempts occur within 60 seconds. A successful login clears the IP's attempts (`reset(client_ip)`).

### 1.3 User Enumeration Defense (`backend/app/api/auth.py`)
- Invalid email and wrong password both return the identical generic message `"Invalid email or password"` with HTTP `401 Unauthorized`.
- Failed login attempts are recorded in `dbo.audit_log` with action `LOGIN_FAILED` and the client IP.

---

## 2. Password Hashing (`backend/app/core/security.py`)

- **Library:** Direct `bcrypt>=4.1.2` (`hash_password` and `verify_password`), replacing `passlib` to avoid `passlib 1.7.4` incompatibilities with `bcrypt >= 4.0`.
- **Work Factor:** `bcrypt.gensalt(rounds=12)` generates a per-password cryptographic random salt with cost factor 12.
- **Constant-Time Verification:** `bcrypt.checkpw(...)` performs constant-time comparison to resist timing side-channel attacks.
- **Output Exclusion:** `UserResponse` in `backend/app/schemas/auth.py` explicitly excludes `password_hash`, ensuring hashes are never serialized in API responses.

---

## 3. Role-Based Access Control (RBAC) & State Guards

- **Centralized Dependency Factory (`backend/app/core/dependencies.py`):**
  - `get_current_user` extracts `Authorization: Bearer <token>` via `HTTPBearer(auto_error=False)`, decodes and verifies the JWT, and re-queries `User` from the database on every protected request (returning HTTP `401` if missing/expired/deleted).
  - `require_role(*roles)` returns a FastAPI dependency that verifies `current_user.role in roles`, returning HTTP `403 Forbidden` otherwise.
- **Self-Registration Restriction (`backend/app/api/auth.py`):**
  - `POST /api/auth/register` permits only `'donor'` and `'institution'`. Requests attempting `'admin'` or `'verifier'` receive HTTP `403`.
- **Two-Step Verification & Conflict-of-Interest Guards (`backend/app/api/verifications.py`):**
  - `recommend_institution` requires `'verifier'` and `institution.status == 'pending'`.
  - `approve_institution` requires `'admin'` and `institution.status == 'recommended'` (attempting to approve `'pending'` directly returns HTTP `400`).
  - Both endpoints reject self-review (`institution.user_id == current_user.id` returns HTTP `403`).
- **Delivery Receipt Guard (`backend/app/api/deliveries.py`):**
  - Only the `'institution'` user owning the target wish can confirm delivery (`403` for donors and other institutions).

---

## 4. SQL Injection Prevention & Input Validation

- **Parameterized ORM Queries:** All database queries use SQLAlchemy 2.0 `select()`, `update()`, and bound parameters (`where(User.email == payload.email)`). Even `ilike(f"%{search.strip()}%")` in `wishes.py` uses bound parameters rather than string interpolation.
- **Pydantic v2 Schema Validation (`backend/app/schemas/*.py`):**
  - Enforces email syntax (`EmailStr`, `CHECK_DELIVERABILITY=False`), string length bounds (e.g., `password` 8–128, `title` 3–200, `item_name` 2–150, `message` 5–4000), and numeric bounds (`qty_requested` 1–50,000, `ClaimCreate.qty` 1–10,000). Invalid requests automatically yield HTTP `422`.
- **XSS & Output Sanitization (`backend/app/core/sanitizer.py` + React JSX):**
  - React renders values inside JSX expressions without `dangerouslySetInnerHTML`, escaping DOM text automatically. `sanitizer.py` uses `html.unescape` to prevent double-encoded entity artifacts.
- **HTTP Security Headers & Error Sanitization (`backend/app/main.py`):**
  - `SecurityHeadersMiddleware` injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Content-Security-Policy` (`default-src 'self'; frame-ancestors 'none';`, relaxed for Swagger/ReDoc CDN on `/docs`, `/redoc`, `/openapi.json`), and `Strict-Transport-Security` outside `development`.
  - `global_exception_handler` catches unexpected exceptions, logs full tracebacks server-side under a random `incident_id` UUID, and returns a generic HTTP `500` JSON message without leaking stack traces or DB schemas.

---

## 5. File Upload Security & Child Privacy (`backend/app/core/storage.py`)

1. **5 MB File Size Limit:** Both `validate_file_content` and `upload_delivery_proof` reject empty files (`400`) and files exceeding `5 * 1024 * 1024` bytes (`413`).
2. **Magic-Byte Signature Verification:** Inspects leading file bytes rather than trusting client extensions:
   - PDF: `b"%PDF-"`
   - PNG: `b"\x89PNG\r\n\x1a\n"`
   - JPEG: `b"\xff\xd8\xff"`
   - Delivery proofs strictly permit only JPEG and PNG images.
3. **EXIF / GPS Metadata Stripping (`sanitize_and_strip_exif`):**
   - Calls `Image.open(...)` + `img.verify()`, re-opens, converts to clean RGB JPEG (`quality=85, optimize=True`), and writes to a fresh `BytesIO` buffer without any `exif` bytes—eliminating GPS coordinates, device IDs, and timestamps that could reveal children's home locations.
4. **UUID Blob Renaming:** Discards original filenames when storing objects (`f"{uuid.uuid4().hex}.{matched_ext}"`), preventing path traversal and overwrite attacks.
5. **Private Containers & 15-Minute SAS URLs:** `institution-documents` and `delivery-proofs` are created with `public_access=None`/`off`. Authorized viewers receive short-lived read-only (`BlobSasPermissions(read=True)`) SAS tokens valid for **15 minutes**.

---

## 6. Secrets Management & Least-Privilege Isolation

- **Git Isolation:** `.gitignore` excludes `.env`, `.env.local`, `*.env`, and `*.db`. Running `scripts/scan_secrets.py` across 183 repository files and commit history reported **0 working-tree true positives and 0 git-history true positives**.
- **Production Guard (`backend/app/core/config.py`):** `validate_production_secrets` raises `ValueError` at startup if `ENVIRONMENT == "production"` while `JWT_SECRET_KEY` remains the development default.
- **Azure Key Vault & Managed Identity (`infra/deploy.ps1`):** In Azure deployment scripts, production connection strings and JWT keys are stored in Azure Key Vault and injected into App Service via System-Assigned Managed Identity (`@Microsoft.KeyVault(...)`), while Azure SQL firewall rules restrict access to App Service outbound IPs.
- **Database Least Privilege (`infra/apply_sql.py`):** `wishwell_app` is granted `SELECT, INSERT` only on `dbo.audit_log` with `DENY UPDATE, DELETE`; `powerbi_reader` is granted `SELECT` only on reporting views/tables with `DENY INSERT, UPDATE, DELETE`.

---

## 7. Cryptographic Audit Logging (`backend/app/core/audit.py`, `cosmos.py`)

- Every audited event (`REGISTER`, `LOGIN_FAILED`, `SUBMIT_FOR_VERIFICATION`, `RECOMMEND`, `REJECT`, `APPROVE`, `cancel`, `CLAIM_CREATED`, `STATUS_CHANGE`, `MARKED_DELIVERED`, `CONFIRMED`) creates a row in `dbo.audit_log`.
- **SHA-256 Hash Chain:**
  - Genesis links to `GENESIS_HASH = "0" * 64`.
  - Each record computes `SHA-256(prev_hash|entity_type|entity_id|action|old_status|new_status|changed_by|details|created_at_iso[|cosmos_content_hash])`.
  - If Cosmos DB is configured, the canonical sorted-JSON SHA-256 hash of the `audit_events` document is appended before hashing, binding SQL and NoSQL integrity.
- **Database Immutability:** `trg_audit_log_prevent_mutation` (`INSTEAD OF UPDATE, DELETE` in `db/schema.sql`) blocks direct SQL `UPDATE`/`DELETE` attempts.
- **Verification Endpoint:** `GET/POST /api/admin/audit/verify` recomputes the entire chain and identifies the exact `broken_at_id` if any row or linked Cosmos document was tampered with.

---

## 8. Security Limitations & Pending Improvements

1. **Single-Process In-Memory Rate Limiter:** `LoginRateLimiter` stores attempt timestamps in a Python dictionary (`_attempts`), so limits reset on server restart and are not shared across multiple App Service workers; additionally, behind a reverse proxy, `request.client.host` may reflect proxy IP unless `X-Forwarded-For` proxy headers are configured.
2. **Database Triggers Only Populate `audit_log` Without Hashes:** T-SQL triggers (`trg_*_status_audit`) insert rows into `dbo.audit_log` with `prev_hash = NULL, record_hash = NULL` when status updates occur outside `record_audit_event()`. In `verify_audit_chain_integrity`, `row.prev_hash or expected_prev_hash` and `if row.record_hash and ...` skip unhashed rows, meaning trigger-only rows are not hash-sealed.
3. **`wishwell.db` Local Dev vs. Production:** In local SQLite mode (`.env`), `wishwell_app`/`powerbi_reader` permissions and `trg_audit_log_prevent_mutation` are not active (SQLite triggers for `audit_log` are only created in `backend/tests/conftest.py`).
4. **No MFA / WebAuthn Yet:** Admin and verifier logins rely solely on email and password.
5. **No Automated Malware Scanning on PDFs:** Uploaded PDFs are checked for `%PDF-` magic bytes and 5 MB size, but are not scanned by an antivirus engine (e.g., Microsoft Defender for Storage).
6. **`sessionStorage` Trade-off:** `frontend/src/api/client.ts` mirrors the JWT into `sessionStorage` for tab refresh convenience; while safer than `localStorage`, any XSS payload running in the tab could still read `sessionStorage`.
7. **Pydantic `escape_html` Field Validators Not Wired:** `sanitizer.py` is imported in schema modules (`auth.py`, `wish.py`, `delivery.py`, `institution.py`, `analytics.py`), though the schemas rely on React's native JSX escaping rather than calling `field_validator` on string fields.
8. **Static SQL Strings in `apply_sql.py`:** `infra/apply_sql.py` interpolates CLI arguments (`--app-user`, `--app-password`, etc.) directly into `CREATE USER` T-SQL statements (intended only for trusted admin CLI execution during deployment).
