# Technical Implementation Review & Architectural FAQ

This engineering FAQ provides in-depth technical justifications and implementation details. Every question maps directly to actual source code in the repository with precise file paths and line numbers.

---

### Category 1: Concurrency, Locking & Transactions

#### Q1: How does WishWell prevent two donors from claiming the same last available item simultaneously (race condition)?
* **Model Answer**: We use **pessimistic row-level locking** inside an isolated database transaction. When a claim request arrives, the backend executes `SELECT ... WITH (UPDLOCK, ROWLOCK)` (implemented in SQLAlchemy via `.with_for_update()`). This serializes competing reads: the second donor's transaction is held until the first transaction commits its insert and updates the wish status. If the remaining quantity drops to zero, the second donor receives an immediate, transparent `HTTP 409 Conflict`.
* **Code Reference**: [`backend/app/api/claims.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/api/claims.py#L75-L125) and [`docs/queries.sql`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/queries.sql#L125-L185).

#### Q2: What empirical proof do you have that your concurrency control actually works?
* **Model Answer**: In our automated test `test_concurrency_20_simultaneous_claims_never_exceeds_quantity`, we launch 20 concurrent asynchronous HTTP client tasks against a wish requesting 10 items. Exactly 10 requests receive `HTTP 201 Created` and exactly 10 receive `HTTP 409 Conflict`. Direct database assertion verifies that the sum of active claims in `dbo.wish_claims` is exactly 10/10 (0% over-allocation).
* **Code Reference**: [`backend/tests/test_claims_concurrency.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/tests/test_claims_concurrency.py#L271-L351).

#### Q3: Why did you choose pessimistic locking over optimistic concurrency control (OCC)?
* **Model Answer**: OCC relies on version matching (`rowversion` / `version_id`) and aborts conflicting transactions upon commit. In high-contention charitable drives, OCC creates high abort rates and forces donors to repeatedly retry. In physical-item charity, double-allocations cannot be undone easily like digital shopping carts. Pessimistic row-locking holds the lock for less than 15ms and provides deterministic first-come, first-served fairness without client retries.
* **Code Reference**: [`docs/report/05_concurrency_tradeoff.md`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/report/05_concurrency_tradeoff.md).

---

### Category 2: Database Triggers & Stored Procedures

#### Q4: If an application bug bypassed the API claim checks, how does the database itself prevent over-allocation?
* **Model Answer**: We enforce multi-layer defense-in-depth using the database trigger `trg_wish_claims_enforce_active_qty_limit`. After an `INSERT` on `dbo.wish_claims`, the trigger calculates `COALESCE(SUM(qty), 0)` for all active claims on that wish. If the sum exceeds `wishes.qty_requested`, the trigger raises an error (`RAISERROR` / `THROW`) and rolls back the transaction.
* **Code Reference**: [`db/schema.sql`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/db/schema.sql#L430-L455).

#### Q5: How do you prevent direct database tampering on the audit log table?
* **Model Answer**: We implemented an `INSTEAD OF UPDATE, DELETE` trigger named `trg_audit_log_prevent_mutation` on `dbo.audit_log`. Even if a database administrator or compromised SQL account issues an `UPDATE` or `DELETE` statement, the trigger intercepts the command, raises a security violation, and rolls back the operation.
* **Code Reference**: [`db/schema.sql`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/db/schema.sql#L480-L510).

#### Q6: How are abandoned or stale item pledges handled automatically?
* **Model Answer**: We created the stored procedure `dbo.sp_release_stale_claims`. It identifies claims where `status = 'active'` and `deadline < GETUTCDATE()`. In an atomic transaction, it updates the claim status to `'expired'`, restores the parent wish status to `'open'` or `'partially_claimed'`, and inserts donor notifications. The procedure runs automatically via APScheduler every 30 minutes.
* **Code Reference**: [`db/schema.sql`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/db/schema.sql#L520-L580) and [`backend/app/core/scheduler.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/scheduler.py).

---

### Category 3: Cryptography & Audit Hash Chaining

#### Q7: How does the append-only cryptographic hash chain work?
* **Model Answer**: Every row in `dbo.audit_log` contains two hash columns: `prev_hash` and `record_hash`. The genesis row links to 64 zeros. Every subsequent entry calculates its SHA-256 hash across `prev_hash`, row ID, entity type, entity ID, action, timestamp, and the Cosmos DB content hash. If an attacker modifies even a single character in a past record, the hash of that record changes, breaking the cryptographic chain for all subsequent entries.
* **Code Reference**: [`backend/app/core/audit.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/audit.py#L50-L95).

#### Q8: How can an administrator verify the integrity of the audit log?
* **Model Answer**: The administrator clicks "Verify Integrity" in the admin dashboard, triggering `GET /api/admin/audit/verify`. The endpoint traverses the entire table from genesis forward, recomputing the SHA-256 digest of every record. If all recomputed hashes match stored hashes, it returns `{"is_valid": true, "total_records_verified": N}`.
* **Code Reference**: [`backend/app/api/admin_analytics.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/api/admin_analytics.py#L46-L70).

---

### Category 4: Child Privacy, Media Processing & Cloud Storage

#### Q9: What is WishWell's policy regarding photos of children?
* **Model Answer**: **Zero photos of children are permitted on the platform.** Confirming a delivery requires photographic proof of the physical received items only (boxes, textbooks, supplies). This eliminates the risk of online child exploitation, preserves their dignity, and protects facility locations.
* **Code Reference**: [`backend/app/api/deliveries.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/api/deliveries.py#L10-L16).

#### Q10: How do you prevent attackers from extracting the physical GPS location of children's homes from delivery photos?
* **Model Answer**: Our media pipeline in `app.core.storage` uses Pillow (PIL) to inspect every uploaded image. It reads the raw pixel data and saves a fresh JPEG stream (`Image.new()` / `save()`), completely stripping all EXIF headers, camera serial numbers, and GPS geolocation coordinates before uploading to storage.
* **Code Reference**: [`backend/app/core/storage.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/storage.py#L45-L75).

#### Q11: How do you prevent public users from downloading sensitive certificates or proof photos directly?
* **Model Answer**: All Azure Blob containers (`documents` and `delivery-proofs`) are set to **Private** (`No anonymous public access`). To view a file, the FastAPI server verifies user permissions and mints a short-lived (15-minute) Shared Access Signature (SAS) URL with read-only permissions (`r`).
* **Code Reference**: [`backend/app/core/storage.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/storage.py#L175-L200).

#### Q12: How do you prevent users from uploading malicious executable files disguised as images?
* **Model Answer**: We do not trust file extensions. The function `validate_file_content()` inspects the magic bytes at the beginning of the file buffer (e.g., `%PDF-` for PDFs, `\xFF\xD8\xFF` for JPEG, `\x89PNG` for PNG). Furthermore, client filenames are discarded and replaced with cryptographically random `uuid.uuid4().hex` strings to eliminate path traversal vulnerabilities.
* **Code Reference**: [`backend/app/core/storage.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/storage.py#L98-L147).

---

### Category 5: Authentication, RBAC & Frontend Security

#### Q13: Why did you keep JWT tokens in JavaScript memory rather than `localStorage`?
* **Model Answer**: Storing JWT access tokens in browser `localStorage` or `sessionStorage` exposes them to Cross-Site Scripting (XSS) attacks; any injected malicious script can read `localStorage.getItem("token")` and exfiltrate credentials. In WishWell, tokens are kept strictly in React memory (via React Context). If the page is refreshed, the user re-authenticates or renews via secure HTTP-only cookies.
* **Code Reference**: [`frontend/src/context/AuthContext.tsx`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/frontend/src/context/AuthContext.tsx) and [`docs/report/02_requirements.md`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/report/02_requirements.md#L68-L72).

#### Q14: How is Role-Based Access Control (RBAC) enforced in the backend?
* **Model Answer**: We use FastAPI's dependency injection system via `require_role(*roles)`. It extracts the Bearer token, decodes the claims using our secret key, queries the database to confirm the user exists and is active, and verifies that `user.role` matches the permitted roles. Unauthorized attempts return `HTTP 403 Forbidden`.
* **Code Reference**: [`backend/app/core/dependencies.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/dependencies.py#L77-L96).

#### Q15: Can a Field Verifier grant final verification approval to an institution?
* **Model Answer**: No. We enforce strict **Segregation of Duties**. Field Verifiers are restricted to `POST /api/verifications/{id}/recommend` or `/reject`. The endpoint `POST /api/verifications/{id}/approve` strictly requires the `admin` role. If a verifier calls approve, the endpoint raises `HTTP 403 Forbidden`.
* **Code Reference**: [`backend/app/api/verifications.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/api/verifications.py#L437-L442) and [`backend/tests/test_verification_workflow.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/tests/test_verification_workflow.py#L185-L200).

#### Q16: How do you protect against password cracking and brute-force logins?
* **Model Answer**: Passwords are hashed using `bcrypt.hashpw` with a cryptographically random salt and 12 work rounds, making brute-force dictionary attacks computationally prohibitive. Additionally, we enforce an in-memory sliding-window IP rate limiter (`login_rate_limiter`) that temporarily blocks an IP after 5 consecutive failed login attempts within 15 minutes.
* **Code Reference**: [`backend/app/core/security.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/security.py#L19-L35) and [`backend/app/core/rate_limit.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/rate_limit.py).

---

### Category 6: Database Normalization & Modeling

#### Q17: Prove that your database schema satisfies Third Normal Form (3NF).
* **Model Answer**:
  1. **1NF**: Every column contains atomic scalar values, and every table has a primary key `id`.
  2. **2NF**: All primary keys are single-column integers (`id`). Because there are no composite primary keys, partial functional dependencies on a subset of a key are mathematically impossible.
  3. **3NF**: There are no transitive dependencies. Lookup data (categories), user roles, institution profiles, claims, and delivery logs are decoupled into distinct relations. Non-key attributes depend solely on the primary key.
* **Code Reference**: [`docs/report/06_er_and_normalization.md`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/report/06_er_and_normalization.md) and [`docs/3NF_ANALYSIS.md`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/3NF_ANALYSIS.md).

#### Q18: Why did you not store `qty_remaining` directly as a column in the `wishes` table?
* **Model Answer**: Storing a calculated field like `qty_remaining` in the table violates 3NF because it introduces a functional dependency on an aggregate of another table (`wish_claims`). If a claim expires or is cancelled, a denormalized counter risks falling out of sync (a modification anomaly). Instead, we query the SQL view `dbo.v_open_wishes`, which computes remaining quantity dynamically on-the-fly (`qty_requested - SUM(active claims)`).
* **Code Reference**: [`docs/report/06_er_and_normalization.md`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/report/06_er_and_normalization.md#L115-L135).

#### Q19: How is the fulfillment deadline for a claim determined?
* **Model Answer**: The deadline is dynamically computed as `min(current_time + 14 days, wish.needed_by)`. If an institution needs items urgently in 5 days, the claim deadline is capped at 5 days. If the need is months away, the donor is given a standard 14-day shipment window.
* **Code Reference**: [`backend/app/api/claims.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/api/claims.py#L100-L108).

---

### Category 7: Polyglot Persistence, NoSQL & Performance

#### Q20: Why did you incorporate Azure Cosmos DB alongside Azure SQL?
* **Model Answer**: We implemented polyglot persistence to separate relational accounting from semi-structured telemetry. Azure SQL handles transactional inventory and cryptographic hash chains. Azure Cosmos DB (serverless NoSQL) stores unstructured JSON audit event details (client IP, HTTP headers, full before/after diffs) in `audit_events` and courier webhook payloads in `delivery_metadata`.
* **Code Reference**: [`backend/app/core/cosmos.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/cosmos.py) and [`docs/report/07_data_classification.md`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/report/07_data_classification.md).

#### Q21: What happens if Azure Cosmos DB is offline or throttling? Does the user transaction fail?
* **Model Answer**: No. The platform is designed for **graceful degradation**. If Cosmos DB fails, the API action logs a warning, seals the relational SQL transaction, and returns success to the user. Core fulfillment is never blocked by auxiliary document storage failures.
* **Code Reference**: [`backend/app/core/cosmos.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/cosmos.py#L65-L80).

#### Q22: How do you ensure the public wish feed loads in under 2 seconds?
* **Model Answer**: We created compound index `idx_wishes_status_needed_by` on `dbo.wishes(status, needed_by)` and single-column index `idx_wishes_category_id`. The database engine executes an index seek rather than a full table scan. In our local and Azure benchmarks, query execution takes under 25 milliseconds, well below the 2-second threshold.
* **Code Reference**: [`db/schema.sql`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/db/schema.sql#L345-L358).

---

### Category 8: Algorithms & Infrastructure

#### Q23: How does the duplicate-wish detection algorithm work?
* **Model Answer**: In `app.core.duplicate_detector`, we tokenize item names into normalized character n-grams and words, and calculate the **Jaccard Token Similarity Coefficient** between the new wish and all existing open wishes in that category for that institution. If similarity exceeds 0.5 (50%), the API returns `HTTP 409 Conflict` with an explainable comparison, requiring the institution to pass `confirm_duplicate: true` to override.
* **Code Reference**: [`backend/app/core/duplicate_detector.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/duplicate_detector.py) and [`docs/DUPLICATE_DETECTION.md`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/DUPLICATE_DETECTION.md).

#### Q24: How does Power BI connect securely to Azure SQL without risk of altering operational data?
* **Model Answer**: Power BI connects via a dedicated database user `powerbi_reader`. In `db/schema.sql`, this user is granted `SELECT` permissions strictly on analytical views (`vw_wishes_by_category_month`, `vw_avg_delivery_time`, `vw_institutions_by_status`, `vw_stale_claim_rate`, `vw_top_categories`) with an explicit `DENY INSERT, UPDATE, DELETE` across the entire schema.
* **Code Reference**: [`db/schema.sql`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/db/schema.sql#L1000-L1020) and [`docs/powerbi.md`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/docs/powerbi.md).

#### Q25: How are production secrets managed and kept out of source control?
* **Model Answer**: Zero secrets or `.env` files are stored in the git repository. In Azure, secrets (`DATABASE_URL`, `JWT_SECRET_KEY`, `COSMOS_KEY`) are stored in **Azure Key Vault**. The Linux App Service uses a **System-Assigned Managed Identity** with Key Vault Secret User permissions. Environment variables in App Service reference Key Vault directly via `@Microsoft.KeyVault(SecretUri=...)`, dynamically resolving secrets at runtime.
* **Code Reference**: [`infra/deploy.sh`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/infra/deploy.sh#L220-L245) and [`backend/app/core/config.py`](file:///c:/Users/shubh/OneDrive/Desktop/wishwell/Wishwell/backend/app/core/config.py#L30-L55).

