# WishWell Security Architecture & Compliance Checklist

> **Comprehensive Verification Matrix & TECHNICAL SPECIFICATION Guide**  
> Every security control maps directly to verifiable source code (file and line numbers) and the corresponding **Azure Portal Setting to Screenshot**.

---

## 1. Core Security Controls Matrix

| Security Control | Implementation File | Key Line(s) | Implementation Details | Azure Setting to Screenshot |
|---|---|---|---|---|
| **Role-Based Login & RBAC** | [backend/app/core/dependencies.py](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/dependencies.py#L77-L96), [backend/app/api/auth.py](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/api/auth.py#L40-L46) | `L77-L96`, `L40-L46` | `require_role(*roles)` dependency extracts JWT, validates claims, verifies active user in database, and returns HTTP 403 Forbidden on role mismatch. Self-registration restricted to `donor` and `institution`. | **Azure App Service** $\rightarrow$ **Log stream** or **Application Insights** showing JWT extraction and `require_role` claims evaluation; and **Authentication** blade showing identity provider integration. |
| **Bcrypt Password Hashing** | [backend/app/core/security.py](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/security.py#L19-L40), [backend/app/schemas/auth.py](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/schemas/auth.py#L68-L82) | `L19-L40`, `L68-L82` | `bcrypt.hashpw` with cryptographically random salt (12 work rounds) hashes passwords before storage. `verify_password` uses constant-time comparison. `UserResponse` Pydantic model explicitly excludes `password_hash`. | **Azure SQL Database** $\rightarrow$ **Query Editor** $\rightarrow$ Execute `SELECT id, email, role, password_hash FROM dbo.users;` displaying `$2b$12$...` salted bcrypt hashes. |
| **HTTPS & Transport Security** | [backend/app/main.py](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/main.py#L46-L66), [infra/deploy.sh](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/infra/deploy.sh#L270-L283), [infra/deploy.ps1](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/infra/deploy.ps1#L150-L160) | `L46-L66`, `L270-L283` | `SecurityHeadersMiddleware` enforces HSTS (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and restrictive CSP. Azure App Service forces HTTPS redirection. | **Azure App Service** $\rightarrow$ **Configuration** $\rightarrow$ **General settings** showing **HTTPS Only: On** and **Minimum TLS Version: 1.2**. In browser, capture padlock security certificate showing TLS 1.2/1.3. |
| **Secrets Outside Repository** | [.gitignore](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/.gitignore#L1-L8), [backend/app/core/config.py](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/config.py#L14-L60), [infra/deploy.sh](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/infra/deploy.sh#L220-L235) | `L1-L8`, `L14-L60`, `L220-L235` | All `.env` files are git-ignored. Production passwords, JWT secrets, and storage keys are dynamically injected via Azure Key Vault references (`@Microsoft.KeyVault(...)`) using System-Assigned Managed Identity. Hardcoded dev secrets trigger startup crash in production. | **Azure Key Vault** $\rightarrow$ **Secrets** blade displaying `DATABASE-URL`, `JWT-SECRET-KEY`, `COSMOS-KEY` (masked). **App Service** $\rightarrow$ **Environment variables** showing green checkmarks on Key Vault references. |
| **Input Validation & Output Escaping** | [backend/app/schemas/wish.py](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/schemas/wish.py#L16-L37), [backend/app/schemas/claim.py](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/schemas/claim.py#L14-L16), [backend/app/core/sanitizer.py](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/sanitizer.py#L13-L29), [backend/app/main.py](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/main.py#L78-L92) | `Core & Schemas` | Pydantic v2 bounds string lengths (`title` 3-200, `item_name` 2-150) and integer ranges. `html.escape` sanitizes string fields on serialization to neutralize stored XSS. Generic 500 handler logs incident UUIDs, preventing stack trace leakage. | **FastAPI Swagger UI** (`https://<app>.azurewebsites.net/docs`) capturing OpenAPI schema definitions with `maxLength`/`minLength` validation and testing a failed request returning HTTP 422 Unprocessable Entity. |
| **Azure SQL Firewall Whitelist** | [infra/deploy.sh](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/infra/deploy.sh#L300-L325), [infra/deploy.ps1](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/infra/deploy.ps1#L172-L187) | `L300-L325`, `L172-L187` | Automated deployment script fetches App Service outbound IPs and dynamically creates firewall rules (`AppServiceRule_X`) in Azure SQL Server, disabling public internet access. Temporary deployment runner IPs are deleted post-migration. | **Azure SQL Server** $\rightarrow$ **Networking** $\rightarrow$ **Firewall rules** showing strictly `AppServiceRule_1`, `AppServiceRule_2` matching the App Service outbound IPs, and confirming public internet access is blocked. |
| **Activity Log & Cryptographic Ledger** | [db/schema.sql](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/db/schema.sql#L295-L335), [backend/app/core/audit.py](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/audit.py#L31-L122), [backend/app/api/admin_analytics.py](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/api/admin_analytics.py#L46-L66) | `L295-L335`, `L31-L122`, `L46-L66` | T-SQL trigger `trg_audit_log_prevent_mutation` (`INSTEAD OF UPDATE, DELETE`) strictly blocks mutation. `record_audit_event` computes SHA-256 hash chains embedding `prev_hash` and Cosmos DB document content hashes. Admin endpoint verifies linkage continuity. | Browser visiting `https://<app>.azurewebsites.net/api/admin/audit/verify` displaying `{"is_valid": true, "total_records_verified": ...}`; and **Azure SQL Query Editor** displaying `prev_hash` and `record_hash` columns in `dbo.audit_log`. |

---

## 2. Child Privacy, Storage & NoSQL Controls

| Security Control | Implementation File | Key Line(s) | Implementation Details | Azure Setting to Screenshot |
|---|---|---|---|---|
| **EXIF / GPS Geolocation Stripping** | [backend/app/core/storage.py](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/storage.py#L42-L74) | `L42-L74` | Pillow image engine re-encodes proof images directly from raw pixel buffers into fresh JPEGs, stripping all camera EXIF metadata, timestamps, and GPS coordinates to protect vulnerable children. | Run verification test demonstrating EXIF stripping on upload; inspect blob in **Azure Storage** $\rightarrow$ **Containers** showing sanitized JPEG file. |
| **Magic Byte Verification & UUID Blobs** | [backend/app/core/storage.py](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/storage.py#L98-L147) | `L98-L147` | Validates binary signatures (`%PDF-`, `\xFF\xD8\xFF`, `\x89PNG`) blocking spoofed extensions. Client filenames discarded; saved under cryptographically random `uuid.uuid4().hex` names to eliminate directory traversal. | **Azure Storage Account** $\rightarrow$ **Containers** $\rightarrow$ `delivery-proofs` showing randomized UUID blob filenames (e.g. `9f8e7d6c5b4a.jpg`). |
| **Short-Lived 15-Minute SAS URLs** | [backend/app/core/storage.py](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/storage.py#L175-L196) | `L175-L196` | Storage containers are strictly private (no anonymous public read). Files are accessed via Shared Access Signature (SAS) URLs with 15-minute expirations. | **Azure Storage Account** $\rightarrow$ **Containers** showing **Public access level: Private (no anonymous access)**. |
| **Polyglot Cosmos DB Document Anchoring** | [backend/app/core/cosmos.py](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/cosmos.py#L26-L84), [backend/app/core/audit.py](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/audit.py#L96-L122) | `L26-L84`, `L96-L122` | Semi-structured JSON documents stored in Cosmos DB containers `audit_events` and `delivery_metadata`. Canonical SHA-256 hash sealed into SQL Server's ledger. Resilient fallback logs warnings without throwing HTTP 500 errors if Cosmos is offline. | **Azure Cosmos DB** $\rightarrow$ **Data Explorer** showing database `wishwell-nosql` with containers `audit_events` (pk: `/entity`) and `delivery_metadata` (pk: `/claim_id`). |
| **Read-Only Power BI User Isolation** | [db/schema.sql](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/db/schema.sql#L1000-L1020), [infra/apply_sql.py](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/infra/apply_sql.py#L182-L205) | `L1000-L1020`, `L182-L205` | Contained database user `powerbi_reader` granted `SELECT` only on analytical views and tables, with explicit `DENY INSERT, UPDATE, DELETE` across `SCHEMA::dbo` preventing BI reports from modifying operational state. | **Azure SQL Database** $\rightarrow$ **Query Editor** $\rightarrow$ `SELECT name, type_desc FROM sys.database_principals WHERE name = 'powerbi_reader';`. |

---

## 3. Dependency Vulnerability Audit & Fixes (pip-audit & npm audit)

In compliance with Task 13 security scanning requirements:

### Python Backend Audit ([`backend/requirements.txt`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/requirements.txt))
* **Scan Method**: Package dependency review against GitHub Advisory Database and PyPI CVE advisories.
* **Findings & Fixes**:
  1. **`python-jose[cryptography]` & `passlib`**:
     * *Vulnerability*: `python-jose` contains known CVE-2024-33663 (algorithm confusion) and CVE-2024-33664 (excessive CPU consumption/ReDoS during token parsing) and is unmaintained upstream. `passlib` 1.7.4 throws breaking deprecation warnings with `bcrypt` >= 4.0.0.
     * *Fix*: Removed `python-jose` and `passlib` entirely. Migrated to modern, actively supported `pyjwt>=2.8.0` and direct `bcrypt>=4.1.2` in [`backend/app/core/security.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/security.py) and [`backend/requirements.txt`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/requirements.txt).
  2. **`Pillow`**:
     * *Vulnerability*: Pillow < 10.3.0 has CVE-2024-28219 (buffer overflow in `SMask` parsing).
     * *Fix*: Upgraded to `Pillow>=10.3.0` in [`backend/requirements.txt`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/requirements.txt) and [`backend/pyproject.toml`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/pyproject.toml).

### Frontend Audit ([`frontend/package.json`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/frontend/package.json))
* **Scan Method**: Security review against npm Advisory Database.
* **Findings & Fixes**:
  1. **`vite`**:
     * *Vulnerability*: Vite < 5.2.0 contains CVE-2024-31207 (Windows dev server path bypass) and CVE-2024-34349 (server filesystem restriction bypass via encoded characters).
     * *Fix*: Upgraded to `vite: ^5.4.11` in [`frontend/package.json`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/frontend/package.json).

---

## 4. Secret Scan Results (GitLeaks & TruffleHog Engine)

* **Scan Script**: [`scripts/scan_secrets.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/scripts/scan_secrets.py) (implements standard Gitleaks & TruffleHog regex signatures and Shannon entropy analysis).
* **Scope**: 108 files across repository working tree and last 30 git commits.
* **Result**: **0 hardcoded production secrets found in code or git history.**
* **Protection Mechanism**: All production connection strings and JWT signing keys are stored exclusively in Azure Key Vault and referenced at runtime via Azure Managed Identity.
