# Database Normalization Analysis (Third Normal Form - 3NF)

This document provides a formal mathematical and relational justification of how the **WishWell** database schema satisfies **Third Normal Form (3NF)**. It is structured specifically to prepare the student for academic viva questions and technical architectural review.

---

## 1. Relational Definitions Summary

| Normal Form | Formal Requirement | Practical Implementation in WishWell |
| :--- | :--- | :--- |
| **1NF** (First Normal Form) | All attributes contain atomic (indivisible) values. No repeating groups or multivalued arrays. Each record is uniquely identified by a primary key. | Every column holds atomic scalars (e.g. `NVARCHAR`, `INT`, `DATETIME2`). Multi-item wishes or multiple claims are decomposed into separate rows. All tables define a unique `PRIMARY KEY (id)`. |
| **2NF** (Second Normal Form) | Must be in 1NF, and **no non-prime attribute is partially dependent** on any candidate key. | Every table uses a single-column surrogate primary key (`id INT IDENTITY(1,1)`). Because no table uses a composite primary key, partial functional dependency on a subset of a key is mathematically impossible. |
| **3NF** (Third Normal Form) | Must be in 2NF, and **no non-prime attribute is transitively dependent** on any candidate key ($X \to Y$ and $Y \to Z$ where $X$ is a candidate key and $Z$ is non-prime). | Every non-key attribute depends *only* on the primary key ("the key, the whole key, and nothing but the key"). Lookup data (categories), user roles, institution profiles, claims, and delivery logs are decoupled into distinct relations. |

---

## 2. Table-by-Table 3NF Justification & Functional Dependencies

### A. `users` Table
- **Candidate Keys**: `{id}`, `{email}`
- **Functional Dependencies**:
  - `id -> email, password_hash, full_name, role, created_at, updated_at`
  - `email -> id, password_hash, full_name, role, created_at, updated_at`
- **3NF Justification**:
  Attributes describe solely the authentication principal. Role-specific attributes (such as orphanage registration license or donor payment methods) are **not** stored here; storing them here would introduce null columns or transitive dependencies.

### B. `institutions` Table
- **Candidate Keys**: `{id}`, `{user_id}`, `{registration_number}`
- **Functional Dependencies**:
  - `id -> user_id, name, registration_number, address, city, state, postal_code, phone, website_url, description, status, created_at, updated_at`
  - `user_id -> id, name, registration_number, address, city, state, postal_code, phone, website_url, description, status, created_at, updated_at`
- **3NF Justification**:
  Separating `institutions` from `users` prevents non-institution users from having empty institutional columns. The physical address, city, and state depend directly on the institution entity.

### C. `verification_records` Table
- **Candidate Keys**: `{id}`
- **Functional Dependencies**:
  - `id -> institution_id, recommended_by, recommended_at, approved_by, approved_at, decision, reason, created_at`
- **3NF Justification**:
  Captures the 2-step audit trail (`verifier` recommendation and `admin` approval). Storing this inside `institutions` would create update anomalies or restrict history to a single audit snapshot. The verifier name/email is not stored here (which would be transitive: `id -> recommended_by -> verifier_name`); only foreign keys (`recommended_by`, `approved_by`) referencing `users(id)` are retained.

### D. `categories` Table
- **Candidate Keys**: `{id}`, `{name}`
- **Functional Dependencies**:
  - `id -> name, description, created_at`
- **3NF Justification**:
  If category descriptions were kept inside the `wishes` table, every wish in "Educational Supplies" would duplicate the category description. If the description changed, an **update anomaly** would occur. Extracting `categories` ensures zero data redundancy.

### E. `wishes` Table
- **Candidate Keys**: `{id}`
- **Functional Dependencies**:
  - `id -> institution_id, category_id, title, description, item_name, qty_requested, needed_by, status, created_at, updated_at`
- **3NF Justification**:
  Contains only attributes inherent to the specific wish request.
  - Institution address/contact is NOT duplicated here (accessible via `institution_id`).
  - Active claim counts are NOT statically stored as a denormalized counter; instead, remaining quantities are dynamically calculated via the view `v_open_wishes` to prevent **modification anomalies**.

### F. `wish_claims` Table
- **Candidate Keys**: `{id}`
- **Functional Dependencies**:
  - `id -> wish_id, donor_id, qty, deadline, status, created_at, updated_at`
- **3NF Justification**:
  Supports partial fulfillment (many donors claiming fractions of a single wish). Donor profile details are not copied here; only `donor_id` is maintained.

### G. `deliveries` Table
- **Candidate Keys**: `{id}`, `{wish_claim_id}`
- **Functional Dependencies**:
  - `id -> wish_claim_id, tracking_number, carrier, photo_url, status, delivered_at, confirmed_by, confirmed_at, confirmation_notes, created_at, updated_at`
- **3NF Justification**:
  Delivery logistics (carrier, tracking number, photo confirmation) only exist once a claim is in transit. Keeping delivery fields in `wish_claims` would leave those fields NULL for open or expired claims, violating clean relational design.

### H. `thank_you_notes` Table
- **Candidate Keys**: `{id}`, `{delivery_id}`
- **Functional Dependencies**:
  - `id -> wish_id, institution_id, donor_id, delivery_id, message, impact_summary, photo_url, created_at`
- **3NF Justification**:
  Separates the emotional acknowledgement and impact feedback from transactional logistics. Depends on a verified `delivery_id`.

### I. `notifications` Table
- **Candidate Keys**: `{id}`
- **Functional Dependencies**:
  - `id -> user_id, title, message, type, is_read, created_at`
- **3NF Justification**:
  Independent notification log per user. Completely decoupled from domain entities so user dismissals/reads never modify core transactional rows.

### J. `audit_log` Table
- **Candidate Keys**: `{id}`
- **Functional Dependencies**:
  - `id -> entity_type, entity_id, action, old_status, new_status, changed_by, details, created_at`
- **3NF Justification**:
  Append-only ledger populated by database triggers. Preserves historic snapshots without altering or denormalizing active transactional tables.

---

## 3. Potential Viva Questions and Answers

### Q1: Why did you use single-column surrogate keys instead of natural composite keys?
> **Answer**: Surrogate integer keys (`id INT IDENTITY(1,1)`) provide immutable, compact 4-byte identifiers that yield optimal B-Tree clustering depth in SQL Server. Natural keys like `email` or `registration_number` are protected via `UNIQUE` constraints and non-clustered indexes. Surrogate keys also guarantee that 2NF is automatically satisfied because no non-prime attribute can depend on a subset of a single-column primary key.

### Q2: Why is `remaining_quantity` not stored as a column in the `wishes` table?
> **Answer**: Storing `remaining_quantity` in `wishes` would create a **transitive / derived dependency**, where an attribute's value depends on aggregated rows from another table (`wish_claims`). Any asynchronous update, failure to acquire locks, or manual patch could cause the stored counter to desynchronize from the actual active claims (**update anomaly**). Instead, we enforce 3NF purity by deriving `qty_remaining` dynamically through the indexed view `v_open_wishes`.

### Q3: Why couldn't you enforce `needed_by > SYSUTCDATETIME()` using a standard `CHECK` constraint?
> **Answer**: In ANSI SQL and Microsoft T-SQL, `CHECK` constraints must be deterministic (producing the exact same result given the same row values). Because `SYSUTCDATETIME()` is non-deterministic (it changes every millisecond), SQL Server throws `Error 414`. Therefore, we implemented an `AFTER INSERT` trigger (`trg_wishes_check_needed_by_future`) which evaluates the condition at transaction time and rolls back violations.

