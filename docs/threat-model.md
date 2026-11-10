# WishWell Threat Model (STRIDE Methodology)

> **Specification & Viva Examination Reference**  
> Comprehensive threat model assessing architectural assets, external actors, trust boundaries, and mitigation controls across the WishWell platform.

---

## 1. System Assets, Actors & Trust Boundaries

### Critical Assets:
* **Child Privacy & Safety**: Photographic anonymity (zero children's faces), stripped camera EXIF/GPS metadata, private address records of children's homes.
* **Identity & Authentication Credentials**: Bcrypt password hashes, asymmetric/symmetric JWT secret keys, Azure storage SAS keys, Cosmos master keys.
* **Inventory & Transactional Integrity**: Wish fulfillment counts, active claim quotas, prevention of over-claiming ($0 < \text{active claims} \le \text{qty requested}$).
* **Accountability & Non-Repudiation**: Append-only cryptographic audit ledger (`dbo.audit_log`), SHA-256 hash chains, Cosmos DB document content hashes.
* **Semi-Structured Document Store**: Cosmos DB audit event payloads (`audit_events`) and courier tracking timelines (`delivery_metadata`).

### System Actors:
* **Anonymous Public**: Browses verified open wishes via read-only SQL view `v_open_wishes`.
* **Donor (`donor`)**: Claims item quantities within 14-day deadlines, marks dispatch with courier tracking numbers.
* **Institution (`institution`)**: Verified children's home; submits item wishes, confirms delivery with item-only photos.
* **Field Verifier (`verifier`)**: Performs premises inspections; recommends or rejects pending institutions.
* **Administrator (`admin`)**: Grants Step-2 verification approval, monitors analytics, verifies audit chain integrity.
* **Adversary / Attacker**: Unauthenticated web actor attempting brute-force, injection, privilege escalation, or data scraping.

### Trust Boundaries:
* **TB1 (Network Perimeter)**: Internet $\rightarrow$ Azure Static Web Apps (CDN) / App Service Reverse Proxy (HTTPS / TLS 1.2+ termination).
* **TB2 (Identity Perimeter)**: React SPA Client $\rightarrow$ FastAPI REST API (JWT Bearer Token authentication & Pydantic input validation).
* **TB3 (Secrets Isolation)**: FastAPI App Service $\rightarrow$ Azure Key Vault (Managed Identity RBAC boundary).
* **TB4 (Relational Storage)**: FastAPI App Service $\rightarrow$ Azure SQL Database (Firewall outbound IP whitelisting & `wishwell_app` least-privilege).
* **TB5 (Blob Storage)**: Client / FastAPI $\rightarrow$ Azure Blob Storage (Private containers without public read; short-lived 15-min SAS tokens).
* **TB6 (NoSQL Document Store)**: FastAPI App Service $\rightarrow$ Azure Cosmos DB (Cryptographic SHA-256 content hash binding into SQL hash chain).

---

## 2. Mermaid Data-Flow Diagram (DFD)

```mermaid
flowchart TD
    subgraph PublicUntrusted["Trust Boundary 1: Public Untrusted Internet"]
        Donor["Donor (Browser)"]
        Institution["Children's Home (Browser)"]
        Verifier["Field Verifier (Mobile/Web)"]
        Admin["Administrator (Browser)"]
        Attacker["Adversary / Threat Actor"]
    end

    subgraph EdgePerimeter["Trust Boundary 2: Azure Edge & Transport Security"]
        SWA["Azure Static Web Apps (CDN / HTTPS)"]
        AppService["FastAPI API Server (App Service / TLS 1.2+)"]
    end

    subgraph AppLogic["FastAPI Application Services"]
        AuthMiddleware["JWT Auth & Login Rate Limiter (5 req/min)"]
        PydanticSanitizer["Pydantic v2 Validator & HTML Output Escaping"]
        ExifEngine["Pillow Image Sanitizer (EXIF / GPS Stripper)"]
        AuditEngine["Cryptographic Hash Chain Engine (SHA-256)"]
        StorageEngine["SAS URL Generator (15-min Expiration)"]
    end

    subgraph CloudDataLayer["Trust Boundary 3-6: Isolated Azure Cloud Data Stores"]
        KeyVault[("Azure Key Vault\n(Managed Identity)")]
        AzureSQL[("Azure SQL Database\n(Firewall IP Whitelist\nAppend-Only Audit Triggers)")]
        BlobStorage[("Azure Blob Storage\n(Private Containers\ninstitution-docs, delivery-proofs)")]
        CosmosDB[("Azure Cosmos DB Serverless\n(audit_events, delivery_metadata)")]
    end

    Donor -->|HTTPS / TLS 1.2+| SWA
    Institution -->|HTTPS / TLS 1.2+| SWA
    Verifier -->|HTTPS / TLS 1.2+| SWA
    Admin -->|HTTPS / TLS 1.2+| SWA
    Attacker -.->|DDoS / Tampering / Injection| AppService

    SWA -->|REST API Calls| AppService
    AppService --> AuthMiddleware
    AuthMiddleware --> PydanticSanitizer
    PydanticSanitizer --> ExifEngine
    PydanticSanitizer --> AuditEngine
    PydanticSanitizer --> StorageEngine

    AppService -.->|Read Secrets (MSI)| KeyVault
    AuditEngine -->|T-SQL UPDLOCK / Hash Linkage| AzureSQL
    StorageEngine -->|Private SAS Signed Upload| BlobStorage
    AuditEngine -->|Semi-Structured JSON Docs| CosmosDB
```

---

## 3. STRIDE Threat Analysis Matrix

| Threat Category | WishWell Specific Threat Scenario | Mitigation Control | Implementation File & Line | Residual Risk & Compensating Control |
|---|---|---|---|---|
| **Spoofing** | Adversary steals or forges JWT tokens to impersonate administrators or verified children's homes. | Signed HS256 JWT tokens with 15-minute expiration; user active record re-verified from database on every request. | [backend/app/core/dependencies.py#L26-L75](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/dependencies.py#L26-L75), [backend/app/core/security.py#L41-L83](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/security.py#L41-L83) | Token interception on client device. Mitigated by keeping tokens in browser memory rather than localStorage. |
| **Tampering** | Rogue actor attempts SQL injection to modify wish quantities, or tampers with the audit log to cover fraud. | SQLAlchemy parameterized queries; T-SQL `INSTEAD OF UPDATE, DELETE` trigger on `audit_log`; SHA-256 cryptographic hash chaining linking SQL ledger to Cosmos DB canonical content hash. | [db/schema.sql#L319-L335](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/db/schema.sql#L319-L335), [backend/app/core/audit.py#L31-L122](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/audit.py#L31-L122), [backend/app/core/cosmos.py#L36-L42](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/cosmos.py#L36-L42) | Privileged cloud administrator direct DB drop. Mitigated by automated point-in-time Azure SQL backups and off-site audit exports. |
| **Repudiation** | Donor claims they fulfilled a pledge, or an institution denies receiving a delivery. | Multi-stage delivery state machine (`in_transit` $\rightarrow$ `delivered` $\rightarrow$ `confirmed`), carrier tracking numbers, mandatory item-only photo proof, thank-you notes, and immutable actor audit logging. | [backend/app/api/deliveries.py#L90-L240](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/api/deliveries.py#L90-L240), [db/schema.sql#L214-L262](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/db/schema.sql#L214-L262) | Courier delivery dispute. Mitigated by attaching third-party carrier tracking APIs and physical signature notes. |
| **Information Disclosure** | Vulnerable children's locations revealed via image EXIF GPS tags; database passwords leaked in error traces. | Automated pixel-level re-encoding via Pillow stripping all EXIF/GPS metadata; magic byte checking; UUID blob filenames; 15-minute SAS tokens; sanitized 500 error handler returning incident UUIDs. | [backend/app/core/storage.py#L42-L74](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/storage.py#L42-L74), [backend/app/core/storage.py#L98-L196](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/storage.py#L98-L196), [backend/app/main.py#L78-L92](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/main.py#L78-L92) | Insider downloading documents during valid 15-min SAS window. Mitigated by role restriction and strict audit logging of document access. |
| **Denial of Service** | Concurrency race conditions over-claiming items (e.g. 20 concurrent pledges on 10 items); brute-force login attacks. | Sliding window rate limiting (5 attempts/min on `/auth/login`); row-level locking (`UPDLOCK, HOLDLOCK`); database trigger `trg_wish_claims_enforce_active_qty_limit` rolling back over-claims. | [backend/app/core/rate_limit.py#L17-L64](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/rate_limit.py#L17-L64), [backend/app/api/claims.py#L78-L95](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/api/claims.py#L78-L95), [db/schema.sql#L505-L558](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/db/schema.sql#L505-L558) | Volumetric L7 DDoS flooding App Service. Mitigated by Azure App Service DDoS basic protection and scale limits. |
| **Elevation of Privilege** | Normal donor or pending institution self-approving verification or invoking admin analytics. | Centralized `require_role(*roles)` dependency; two-step verification workflow (verifier recommends, admin approves); database trigger `trg_wishes_enforce_verified_institution` blocking unverified wishes at SQL engine level. | [backend/app/core/dependencies.py#L77-L96](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/dependencies.py#L77-L96), [backend/app/api/verifications.py#L111-L260](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/api/verifications.py#L111-L260), [db/schema.sql#L475-L494](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/db/schema.sql#L475-L494) | Compromise of master admin credentials. Mitigated by strong bcrypt hashing and Key Vault secret segregation. |

---

## 4. Security Gaps & Backlog Recommendations

In accordance with strict audit transparency, the following controls are identified as future enhancements:
1. **Multi-Factor Authentication (MFA / WebAuthn)**: Administrative logins currently rely solely on email/password; implementing TOTP/FIDO2 will prevent account takeover if admin credentials leak.
2. **Web Application Firewall (WAF)**: Azure App Service is currently protected by custom ASGI middleware and IP whitelisting; deploying Azure Application Gateway WAF / Azure Front Door with OWASP Core Rule Set (CRS 3.2) will add managed layer-7 inspection.
3. **Automated Antivirus Scanning on Blob Uploads**: While magic bytes and EXIF stripping neutralize script embedding in images, integrating Azure Defender for Storage will scan uploaded institution verification PDFs for embedded malware.

