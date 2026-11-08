# WishWell Security Architecture & Compliance Checklist

This document maps every required security control directly to the source file and line implementation in the WishWell repository.

---

## 1. Role-Based Access Control (RBAC) & Authentication

| Security Control | Implementation File | Key Line(s) | Implementation Details |
|---|---|---|---|
| **Role Enforcement Dependency** | [backend/app/core/dependencies.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/core/dependencies.py#L38-L75) | `L38-L75` | `require_role(*roles)` dependency extracts JWT, decodes claims, verifies user status in database, and raises HTTP 403 Forbidden if user lacks the required role. |
| **Self-Registration Restriction** | [backend/app/api/auth.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/api/auth.py#L42-L65) | `L42-L65` | Enforces that only `'donor'` and `'institution'` roles can self-register. Registration requests for `'admin'` or `'verifier'` are blocked with HTTP 403. |
| **Login Rate Limiter** | [backend/app/core/security.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/core/security.py#L90-L130) | `L90-L130` | In-memory sliding window rate limiter locks accounts after 5 failed login attempts within a 5-minute window to defend against brute-force attacks. |
| **Generic Credential Failure** | [backend/app/api/auth.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/api/auth.py#L164-L185) | `L164-L185` | Failed logins return a generic `"Invalid email or password."` response regardless of whether the email exists, preventing user enumeration. Failed attempts are logged to `audit_log`. |

---

## 2. Password Hashing & Cryptography

| Security Control | Implementation File | Key Line(s) | Implementation Details |
|---|---|---|---|
| **Bcrypt Key Derivation** | [backend/app/core/security.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/core/security.py#L25-L42) | `L25-L42` | Uses `passlib.context.CryptContext(schemes=["bcrypt"], deprecated="auto")` with adaptive work factor to salt and hash all user passwords. |
| **Secure Hash Verification** | [backend/app/core/security.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/core/security.py#L35-L40) | `L35-L40` | `verify_password(plain, hashed)` performs constant-time string comparison preventing timing attacks. |
| **Password Exclusion in Serialization** | [backend/app/schemas/auth.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/schemas/auth.py#L62-L72) | `L62-L72` | `UserResponse` Pydantic model explicitly omits the `password_hash` column, guaranteeing password hashes are never serialized over the wire. |

---

## 3. HTTPS, Transport Security & Headers

| Security Control | Implementation File | Key Line(s) | Implementation Details |
|---|---|---|---|
| **Strict Transport Security (HSTS)** | [backend/app/main.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/main.py#L55-L62) | `L55-L62` | `SecurityHeadersMiddleware` injects `Strict-Transport-Security: max-age=31536000; includeSubDomains` in non-development environments. |
| **Clickjacking Protection** | [backend/app/main.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/main.py#L50-L54) | `L50-L54` | Injects `X-Frame-Options: DENY`, preventing the application from being embedded in malicious iframes. |
| **MIME Sniffing Prevention** | [backend/app/main.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/main.py#L48-L51) | `L48-L51` | Injects `X-Content-Type-Options: nosniff`. |
| **TLS Termination Architecture** | [docker-compose.yml](file:///c:/Users/jaisw/sih/project%20bytexl/docker-compose.yml) & [docs/api.md](file:///c:/Users/jaisw/sih/project%20bytexl/docs/api.md) | Architectural | Production deployment terminates TLS 1.3 at Azure Application Gateway / Nginx reverse proxy before forwarding requests to the Uvicorn ASGI server. |

---

## 4. Secrets Management Outside the Repository

| Security Control | Implementation File | Key Line(s) | Implementation Details |
|---|---|---|---|
| **Git Exclusion of Secrets** | [.gitignore](file:///c:/Users/jaisw/sih/project%20bytexl/.gitignore#L1-L5) | `L1-L5` | `.env`, `.env.local`, and `*.env` are strictly excluded from version control. |
| **Environment Variable Parsing** | [backend/app/core/config.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/core/config.py#L14-L52) | `L14-L52` | `pydantic_settings.BaseSettings` reads database connection strings, JWT signing keys, and Azurite secrets from external environment variables. |
| **Sanitized Configuration Template** | [.env.example](file:///c:/Users/jaisw/sih/project%20bytexl/.env.example#L1-L35) | `L1-L35` | Provides documented placeholder keys without exposing production secrets. |

---

## 5. Input Validation, Length Limits & Output Escaping

| Security Control | Implementation File | Key Line(s) | Implementation Details |
|---|---|---|---|
| **Wish Input Limits** | [backend/app/schemas/wish.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/schemas/wish.py#L15-L25) | `L15-L25` | `WishBase` enforces string lengths (`title` 3-200, `description` 5-2000, `item_name` 2-150) and bounds `qty_requested` ($0 < \text{qty} \le 50000$). |
| **Claim Input Limits** | [backend/app/schemas/claim.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/schemas/claim.py#L14-L16) | `L14-L16` | `ClaimCreate` bounds pledged items ($0 < \text{qty} \le 10000$). |
| **Delivery Input Limits** | [backend/app/schemas/delivery.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/schemas/delivery.py#L14-L17) | `L14-L17` | Limits courier tracking numbers to 100 characters. |
| **Output HTML Escaping** | [backend/app/core/sanitizer.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/core/sanitizer.py#L14-L26) & [backend/app/schemas/wish.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/schemas/wish.py#L46-L51) | `L14-L26`, `L46-L51` | Uses `html.escape` in Pydantic field validators on all output responses (`WishResponse`, `OpenWishViewResponse`, `ThankYouNoteResponse`, `UserResponse`) to neutralize stored XSS payloads (`<script>` $\rightarrow$ `&lt;script&gt;`). |
| **Non-Verbose Error Handler** | [backend/app/main.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/main.py#L65-L80) | `L65-L80` | Uncaught 500 exceptions return sanitized incident reference UUIDs, preventing stack trace or database table leakage. |

---

## 6. Storage Security & Child Privacy Protection

| Security Control | Implementation File | Key Line(s) | Implementation Details |
|---|---|---|---|
| **Magic Byte Verification** | [backend/app/core/storage.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/core/storage.py#L45-L75) | `L45-L75` | Verifies real binary file headers: PDF (`%PDF`), JPEG (`\xFF\xD8\xFF`), PNG (`\x89PNG\r\n\x1a\n`). Spoofed extension files are rejected. |
| **UUID Filename Sanitization** | [backend/app/core/storage.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/core/storage.py#L80-L95) | `L80-L95` | Original client filenames are discarded; uploaded files are renamed to random `uuid.uuid4()` strings, preventing path traversal attacks. |
| **EXIF / GPS Stripping** | [backend/app/core/storage.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/core/storage.py#L110-L140) | `L110-L140` | Pillow re-encodes proof images from raw pixel data, stripping camera metadata, timestamp, and GPS geolocation coordinates. |
| **Short-Lived Private SAS URLs** | [backend/app/core/storage.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/core/storage.py#L155-L185) | `L155-L185` | Containers are configured without public anonymous read access. Downloads require signed Shared Access Signature (SAS) tokens expiring after 15 minutes. |

---

## 7. Database Firewall & Append-Only Activity Log

| Security Control | Implementation File | Key Line(s) | Implementation Details |
|---|---|---|---|
| **Least-Privilege User & Permissions** | [db/schema.sql](file:///c:/Users/jaisw/sih/project%20bytexl/db/schema.sql#L295-L315) | `L295-L315` | Configures dedicated application user `wishwell_app`. Explicitly grants `SELECT, INSERT` and issues `DENY UPDATE, DELETE ON dbo.audit_log TO wishwell_app;`. |
| **Database Append-Only Trigger** | [db/schema.sql](file:///c:/Users/jaisw/sih/project%20bytexl/db/schema.sql#L205-L225) | `L205-L225` | `dbo.trg_audit_log_prevent_mutation` trigger (`INSTEAD OF UPDATE, DELETE`) raises error `50005` and rolls back any attempt to modify or delete audit rows. |
| **Cryptographic Hash Chain Engine** | [backend/app/core/audit.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/core/audit.py#L30-L115) | `L30-L115` | Implements canonical deterministic serialization and calculates SHA-256 hash chains embedding `prev_hash` of the preceding record. Genesis row starts with 64 zeros. |
| **Admin Chain Verification Endpoint** | [backend/app/api/admin_analytics.py](file:///c:/Users/jaisw/sih/project%20bytexl/backend/app/api/admin_analytics.py#L40-L65) | `L40-L65` | `GET /api/admin/audit/verify` iterates through all audit records sequentially, recomputes SHA-256 hashes, checks linkage continuity, and detects exact tampered rows. |
| **Azure SQL Firewall Note** | [docs/security-checklist.md](file:///c:/Users/jaisw/sih/project%20bytexl/docs/security-checklist.md) | Architectural | In production on Azure SQL Database, the SQL Server firewall is configured to disable public network access (`0.0.0.0/0`) and whitelist strictly the private VNet subnet containing the FastAPI backend service. |

