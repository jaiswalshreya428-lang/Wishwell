# 2. Requirements Specification

## 2.1 Functional Requirements (FR)

The system enforces strict Role-Based Access Control (RBAC) across five distinct user views:

### 2.1.1 Public (Unauthenticated Visitors)
- **FR-PUB-01**: View landing page explaining the non-monetary item-fulfillment workflow.
- **FR-PUB-02**: Browse all open and partially claimed wishes without needing to sign in.
- **FR-PUB-03**: Filter wishes by category (Education, Clothing, Hygiene, Nutrition, Bedding, Recreation) and search by keyword or city.
- **FR-PUB-04**: View wish detail page displaying item name, requested quantity, remaining quantity needed, required date, and institution profile.
- **FR-PUB-05**: Register as a new Donor or submit an initial Institution registration application.

### 2.1.2 Donor Role
- **FR-DON-01**: Log in securely using email and password with JWT token authentication stored in memory.
- **FR-DON-02**: Claim/pledge a specific quantity of items on an open wish (bounded between 1 and remaining needed quantity).
- **FR-DON-03**: Automatic fulfillment deadline calculation: set to `min(current_time + 14 days, wish.needed_by)`.
- **FR-DON-04**: View "My Claims" dashboard with active pledges, shipment deadlines, and countdown warnings.
- **FR-DON-05**: Voluntarily release an active claim before shipment, automatically restoring the wish quantity to the public pool.
- **FR-DON-06**: Mark a claim as dispatched/delivered by entering an optional courier tracking number and carrier name.
- **FR-DON-07**: View personalized "Impact Page" aggregating total items pledged, items delivered, homes helped, and thank-you notes received.
- **FR-DON-08**: Receive notifications when a pledged claim is confirmed as received, when a thank-you note is posted, or when a claim expires.

### 2.1.3 Institution Role (Children's Homes)
- **FR-INS-01**: Complete institutional profile registration (government registration number, address, contact numbers, facility description).
- **FR-INS-02**: Upload legal verification documents (PDF/JPG/PNG <= 5MB) into a private secure storage container.
- **FR-INS-03**: Track onboarding verification status (`pending` -> `recommended` -> `verified` or `rejected`).
- **FR-INS-04**: Create a new item wish with title, description, category, item name, quantity, and required deadline date.
- **FR-INS-05**: Automated explainable duplicate-need check: detects similar open wishes within the same category (using token similarity) and presents an explicit confirmation warning before creating.
- **FR-INS-06**: View "My Wishes" dashboard showing item fulfillment progress (open, partially claimed, claimed, delivered).
- **FR-INS-07**: Confirm package delivery receipt by uploading a clear photograph of the received physical items (strictly no children in photos).
- **FR-INS-08**: Send a personalized digital thank-you note to the donor who fulfilled the item claim.

### 2.1.4 Field Verifier Role
- **FR-VER-01**: View dedicated verification queue of pending institution onboarding applications.
- **FR-VER-02**: Inspect institution registration details, address, and legal certificates via temporary 15-minute read-only SAS URLs.
- **FR-VER-03**: Conduct physical inspection of premises and submit a formal recommendation (`recommend`) or rejection (`reject`) with notes.
- **FR-VER-04**: Enforce segregation of duty: Verifiers cannot grant final verification approval.

### 2.1.5 Administrator Role
- **FR-ADM-01**: Review verifier-recommended institutions and grant final verification approval (`approve`).
- **FR-ADM-02**: View platform-wide operational analytics dashboard (wishes by category, monthly trends, average delivery lead times, stale claim rates).
- **FR-ADM-03**: Inspect append-only cryptographic audit log entries with search and filter capabilities.
- **FR-ADM-04**: Execute on-demand cryptographic integrity verification check across the SHA-256 audit log hash chain.
- **FR-ADM-05**: Execute the stale-claim release procedure to automatically cancel expired claims and notify affected donors.

---

## 2.2 Non-Functional Requirements (NFR)

### 2.2.1 Data Integrity & Concurrency
- **NFR-CON-01 (ACID Transactions)**: Item pledging must execute within an isolated database transaction using row-level locking (`SELECT ... WITH (UPDLOCK, ROWLOCK)`).
- **NFR-CON-02 (Zero Over-Claim Invariant)**: Under concurrent load from multiple donors, the total claimed quantity on any wish must mathematically never exceed `qty_requested`. Secondary protection is enforced via a database trigger (`trg_wish_claims_enforce_active_qty_limit`).

### 2.2.2 Child Privacy & Data Protection
- **NFR-PRV-01 (Strict Zero Child Photo Rule)**: Physical items only are photographed.
- **NFR-PRV-02 (Metadata Stripping)**: All uploaded images are re-encoded on the server using Pillow, stripping all EXIF headers, camera serial numbers, and GPS geolocation coordinates.
- **NFR-PRV-03 (Private Storage Containers)**: Verification documents and delivery proof images are stored in private Azure Blob containers. Files are never publicly exposed and can only be accessed using time-limited (15-minute) cryptographically signed Shared Access Signature (SAS) URLs.

### 2.2.3 Auditability & Non-Repudiation
- **NFR-AUD-01 (Cryptographic Hash Chain)**: Every critical state change (user registration, institution verification, wish creation, claim pledging, delivery confirmation) must be recorded in an append-only audit log table.
- **NFR-AUD-02 (SHA-256 Chain)**: Each audit log entry calculates its hash as `SHA256(prev_hash + id + entity_type + entity_id + action + timestamp + cosmos_doc_hash)`. Any alteration of an existing row invalidates all subsequent hashes.
- **NFR-AUD-03 (Database Tamper Protection)**: Direct database `UPDATE` and `DELETE` operations on `dbo.audit_log` are forbidden via T-SQL triggers and restricted database permissions.

### 2.2.4 Security & Authorization
- **NFR-SEC-01 (Password Security)**: All passwords hashed with bcrypt (work factor 12). Plaintext passwords are never stored or logged.
- **NFR-SEC-02 (In-Memory Token Storage)**: JWT access tokens (HS256) are kept in memory inside the React Single Page Application and never stored in `localStorage` or `sessionStorage` to mitigate Cross-Site Scripting (XSS) extraction risks.
- **NFR-SEC-03 (SQL Injection Prevention)**: 100% of database queries use parameterized SQL via SQLAlchemy ORM / async T-SQL stored procedures.
- **NFR-SEC-04 (Brute Force Protection)**: In-memory sliding-window IP rate limiting restricts repeated failed login attempts.

### 2.2.5 Performance & Availability
- **NFR-PER-01 (Response Time < 2s)**: The public wish list (`GET /api/wishes`) must load in under 2.0 seconds under normal load. In production and local benchmarks, indexed queries execute in < 25 milliseconds.
- **NFR-PER-02 (Index Coverage)**: Composite index `idx_wishes_status_needed_by` on `dbo.wishes(status, needed_by)` and single-column index `idx_wishes_category_id` ensure index seeks rather than full table scans.

---

## 2.3 Verification & Screenshots Checklist
- [TODO: Screenshot 1 - Public Wish Browse with category and city filters]
- [TODO: Screenshot 2 - Donor Claim Modal with dynamic quantity slider and deadline calculation]
- [TODO: Screenshot 3 - Institution Duplicate Wish Warning dialog]
- [TODO: Screenshot 4 - Verifier Document Inspection view with SAS link]
- [TODO: Screenshot 5 - Admin Audit Hash-Chain Integrity Verification button showing green "Chain Valid"]

