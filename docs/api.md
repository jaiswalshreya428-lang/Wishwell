# WishWell API Specification

> Base URL: `http://localhost:8000/api`  
> Interactive Swagger Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)  
> Redoc Specification: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 1. Authentication & Accounts (`/api/auth`)

### 1.1 Self-Registration
- **Method**: `POST`
- **Path**: `/api/auth/register`
- **Role Access**: **Public** (Self-registration allowed for `donor` and `institution` roles only. `admin` and `verifier` registrations return HTTP 403).
- **Request Body**:
  ```json
  {
    "email": "donor@example.com",
    "password": "Password123!",
    "full_name": "Jane Donor",
    "role": "donor"
  }
  ```
  *(If `role` is `"institution"`, additional nested `institution` object with `name`, `registration_number`, `address`, `city`, `state`, `postal_code`, `phone` is required).*
- **Responses**:
  - `201 Created`: Returns created `UserResponse` (without password hash).
  - `400 Bad Request`: Validation failure.
  - `403 Forbidden`: Attempted self-registration as `admin` or `verifier`.
  - `409 Conflict`: Email address already registered.

### 1.2 Login
- **Method**: `POST`
- **Path**: `/api/auth/login`
- **Role Access**: **Public** (Rate limited: max 5 failed attempts per 5 minutes per IP/email).
- **Request Body**:
  ```json
  {
    "email": "sarah.jenkins@example.com",
    "password": "Password123!"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "access_token": "eyJhbGciOi...",
      "token_type": "bearer",
      "expires_in": 86400,
      "user": {
        "id": 4,
        "email": "sarah.jenkins@example.com",
        "full_name": "Sarah Jenkins",
        "role": "donor",
        "created_at": "2026-10-28T12:00:00Z"
      }
    }
    ```
  - `401 Unauthorized`: Generic error message (`"Invalid email or password."`) logged to `audit_log`.
  - `429 Too Many Requests`: Account locked due to rate limiting.

### 1.3 Current User ("Me")
- **Method**: `GET`
- **Path**: `/api/auth/me`
- **Role Access**: **Authenticated** (`donor`, `institution`, `verifier`, `admin`)
- **Headers**: `Authorization: Bearer <token>`
- **Responses**:
  - `200 OK`: `UserResponse` with institution metadata if applicable.
  - `401 Unauthorized`: Missing or expired JWT.

---

## 2. Institutional Management & Documents (`/api/institutions`)

### 2.1 Institution Portal Overview
- **Method**: `GET`
- **Path**: `/api/institutions/portal`
- **Role Access**: `institution`
- **Description**: Returns profile and verification status for current institution.

### 2.2 Upload Verification Document
- **Method**: `POST`
- **Path**: `/api/institutions/documents`
- **Role Access**: `institution`
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: Document file (PDF, PNG, JPG $\le$ 5 MB).
  - `document_type`: `"registration_certificate"`, `"tax_exemption"`, `"premises_lease"`, `"other"`.
- **Responses**:
  - `201 Created`: Document uploaded to private Azurite Blob storage with 15-minute SAS URL.
  - `400 Bad Request`: Magic bytes check failed (spoofed extension).
  - `413 Payload Too Large`: File exceeds 5 MB.

### 2.3 List Institution Documents
- **Method**: `GET`
- **Path**: `/api/institutions/{institution_id}/documents`
- **Role Access**: `verifier`, `admin`, or owning `institution`.
- **Description**: Returns documents with freshly generated short-lived SAS download URLs.

---

## 3. Two-Step Verification Workflow (`/api/verifications`)

### 3.1 List Pending Institutions
- **Method**: `GET`
- **Path**: `/api/verifications/pending`
- **Role Access**: `verifier`, `admin`
- **Description**: Institutions awaiting Step 1 (field inspection).

### 3.2 List Recommended Institutions
- **Method**: `GET`
- **Path**: `/api/verifications/recommended`
- **Role Access**: `admin`
- **Description**: Institutions that passed Step 1, awaiting final administrative Step 2 approval.

### 3.3 Recommend Institution (Step 1)
- **Method**: `POST`
- **Path**: `/api/verifications/{institution_id}/recommend`
- **Role Access**: `verifier` (Institutions cannot recommend themselves; admins cannot call Step 1).
- **Request Body**: `{"reason": "Visited premises, verified 42 children and valid state registration."}`
- **Responses**:
  - `200 OK`: Status shifts `pending` $\rightarrow$ `recommended`.
  - `400 Bad Request`: Institution not in `pending` status.
  - `403 Forbidden`: Caller lacks `verifier` role or tried self-recommending.

### 3.4 Approve Institution (Step 2)
- **Method**: `POST`
- **Path**: `/api/verifications/{institution_id}/approve`
- **Role Access**: `admin`
- **Request Body**: `{"reason": "All compliance criteria met. State registration verified."}`
- **Responses**:
  - `200 OK`: Status shifts `recommended` $\rightarrow$ `verified`. Unlocks wish posting.
  - `400 Bad Request`: Cannot skip Step 1 (attempting approval directly from `pending` returns 400).

### 3.5 Reject Institution
- **Method**: `POST`
- **Path**: `/api/verifications/{institution_id}/reject`
- **Role Access**: `verifier`, `admin`
- **Request Body**: `{"reason": "Premises address could not be verified."}`
- **Responses**: `200 OK`: Status set to `rejected`.

---

## 4. Wish Management (`/api/wishes`)

### 4.1 Browse Open Wishes (SQL View)
- **Method**: `GET`
- **Path**: `/api/wishes`
- **Role Access**: **Public**
- **Query Parameters**:
  - `page`: Page index (default 1).
  - `limit`: Items per page (default 20, max 100).
  - `category_id`: Optional category ID filter.
  - `institution_id`: Optional institution ID filter.
  - `search`: Search query string matching title or item name.
  - `needed_by_before`, `needed_by_after`: ISO date range filters.
- **Data Source**: Evaluated directly against SQL View `dbo.v_open_wishes`.
- **Response**: `200 OK`: Paginated list of open wishes with calculated `qty_remaining`.

### 4.2 Wish Detail
- **Method**: `GET`
- **Path**: `/api/wishes/{wish_id}`
- **Role Access**: **Public**

### 4.3 Create Wish
- **Method**: `POST`
- **Path**: `/api/wishes`
- **Role Access**: `institution` (Institution must have status `'verified'`).
- **Request Body**:
  ```json
  {
    "category_id": 1,
    "title": "20 Mathematics Textbooks for Grade 8",
    "item_name": "Grade 8 NCERT Mathematics",
    "description": "Standard textbooks needed for the upcoming academic semester.",
    "qty_requested": 20,
    "needed_by": "2026-12-15T23:59:59Z",
    "confirm_duplicate": false
  }
  ```
- **Responses**:
  - `201 Created`: Wish created with status `'open'`.
  - `400 Bad Request`: `needed_by` date in the past, or `qty_requested <= 0`.
  - `403 Forbidden`: Institution is not verified.
  - `409 Conflict`: **Duplicate Need Warning** ($\ge 50\%$ token overlap with existing open wish by same home in same category). Includes `similar_wishes`. Resending with `confirm_duplicate: true` overrides the warning.

### 4.4 Edit Wish
- **Method**: `PUT`
- **Path**: `/api/wishes/{wish_id}`
- **Role Access**: `institution` (Owning institution only).
- **Responses**:
  - `200 OK`: Updated wish entity.
  - `409 Conflict`: Cannot edit wish because active claims already exist.

### 4.5 Cancel Wish
- **Method**: `POST` / `DELETE`
- **Path**: `/api/wishes/{wish_id}/cancel`
- **Role Access**: `institution` (Owning institution only).
- **Responses**:
  - `200 OK`: Wish marked as `'cancelled'`.
  - `409 Conflict`: Cannot cancel wish with active claims.

---

## 5. Claims & Concurrency (`/api/wishes/{id}/claim`, `/api/claims`)

### 5.1 Claim Wish Items
- **Method**: `POST`
- **Path**: `/api/wishes/{wish_id}/claim`
- **Role Access**: `donor`
- **Request Body**: `{"qty": 5}`
- **Concurrency Guarantee**: Executed in ONE database transaction with row-level locks (`UPDLOCK, HOLDLOCK`) and database trigger `trg_wish_claims_enforce_active_qty_limit`.
- **Deadline Calculation**: $\min(\text{now} + 14\text{ days}, \text{wish.needed\_by})$.
- **Responses**:
  - `201 Created`: Active claim created; parent wish synchronized to `'partially_claimed'` or `'claimed'`.
  - `409 Conflict`: Requested quantity exceeds remaining available quantity.

### 5.2 Release Own Claim
- **Method**: `POST`
- **Path**: `/api/claims/{claim_id}/release`
- **Role Access**: `donor` (Owning donor only).
- **Responses**:
  - `200 OK`: Claim status set to `'released'`; quantity returned to open pool; parent wish restored.

### 5.3 Manual Stale Claim Release Job
- **Method**: `POST`
- **Path**: `/api/admin/claims/release-stale`
- **Role Access**: `admin`
- **Description**: Invokes stored procedure `dbo.sp_release_stale_claims` in a single transaction.

---

## 6. Deliveries & Impact (`/api/claims/{id}/deliver`, `/api/deliveries`)

### 6.1 Mark Claim as Delivered
- **Method**: `POST`
- **Path**: `/api/claims/{claim_id}/deliver`
- **Role Access**: `donor` (Owning donor only).
- **Request Body**: `{"tracking_number": "FEDEX-92810"}`
- **Responses**: `201 Created`: Delivery record created; institution director notified.

### 6.2 Confirm Delivery Receipt with Photo Proof
- **Method**: `POST`
- **Path**: `/api/deliveries/{delivery_id}/confirm`
- **Role Access**: `institution` (Owning home only; donors cannot confirm own deliveries).
- **Content-Type**: `multipart/form-data`
- **Form Fields**: `photo`: Item image file (JPEG, PNG $\le$ 5 MB).
- **Image Processing**: Validated by magic bytes, re-encoded via Pillow, **all EXIF and GPS metadata stripped**, stored in private container.
- **Responses**: `200 OK`: Delivery confirmed; parent wish and claim updated to `'delivered'`; donor notified.

### 6.3 Send Thank-You Note
- **Method**: `POST`
- **Path**: `/api/deliveries/{delivery_id}/thank-you`
- **Role Access**: `institution` (Owning home only).
- **Request Body**: `{"message": "Thank you so much for the 10 textbooks! The children love them."}`
- **Rule**: Strictly one thank-you note allowed per delivery (enforced by UNIQUE constraint).

### 6.4 Donor Impact Analytics
- **Method**: `GET`
- **Path**: `/api/impact` (or `/api/donors/me/impact`)
- **Role Access**: `donor`
- **Description**: Returns personal impact metrics (total wishes fulfilled, items by category, homes helped, and timeline).

---

## 7. Admin Analytics & Power BI Feeds (`/api/admin/analytics`)

All endpoints in this section are restricted to role `'admin'`.

### 7.1 Unified Analytics Overview
- **Method**: `GET`
- **Path**: `/api/admin/analytics/overview`
- **Role Access**: `admin`
- **Description**: Unified payload containing monthly trends, SLA durations, stale-claim ratios, institution distributions, and top categories.

### 7.2 Monthly Wish Fulfillment Trend
- **Method**: `GET`
- **Path**: `/api/admin/analytics/wishes-monthly`
- **Role Access**: `admin`
- **Output**: Array of `{ month, wishes_posted, wishes_fulfilled, fulfillment_rate_percentage }`.

### 7.3 Delivery Turnaround Duration (SLA)
- **Method**: `GET`
- **Path**: `/api/admin/analytics/delivery-times`
- **Role Access**: `admin`
- **Output**: `{ average_hours, average_days, total_completed_deliveries }`.

### 7.4 Stale-Claim Rate
- **Method**: `GET`
- **Path**: `/api/admin/analytics/stale-rates`
- **Role Access**: `admin`
- **Output**: `{ total_claims, active_claims, delivered_claims, released_claims, expired_claims, stale_claim_rate_percentage }`.

### 7.5 Institutions by Verification Status
- **Method**: `GET`
- **Path**: `/api/admin/analytics/institutions-status`
- **Role Access**: `admin`
- **Output**: Breakdown by `pending`, `recommended`, `verified`, `rejected` with counts and percentages.

### 7.6 Top Categories by Demand
- **Method**: `GET`
- **Path**: `/api/admin/analytics/top-categories`
- **Role Access**: `admin`
- **Output**: Categories ranked by requested volume and fulfillment percentage.

---

## 8. Cryptographic Audit Log & Integrity Check (`/api/admin/audit`)

### 8.1 Verify Hash Chain Integrity
- **Method**: `GET` / `POST`
- **Path**: `/api/admin/audit/verify`
- **Role Access**: `admin`
- **Description**: Recomputes SHA-256 hashes sequentially across the entire table, verifying linkage continuity:
  $$\text{record\_hash}_n = \text{SHA-256}(\text{prev\_hash}_n \,\|\, \text{payload})$$
- **Responses**:
  - `200 OK`:
    ```json
    {
      "is_valid": true,
      "total_records_checked": 42,
      "broken_link_index": null,
      "tampered_row_id": null,
      "message": "Cryptographic audit chain is 100% valid. Zero broken links or data mutations detected.",
      "checked_at": "2026-10-28T20:00:00Z"
    }
    ```
    *(If tampered, returns `is_valid: false` with exact culprit row ID and broken link index).*

### 8.2 Paginated Audit Ledger
- **Method**: `GET`
- **Path**: `/api/admin/audit/logs`
- **Role Access**: `admin`
- **Query Parameters**: `limit` (default 50), `offset` (default 0).
- **Output**: Chronological list of audit entries with `prev_hash`, `record_hash`, and `cosmos_doc_id`.

### 8.3 Fetch Cosmos DB Audit Event Document (Semi-Structured JSON)
- **Method**: `GET`
- **Path**: `/api/admin/audit/events/{doc_id}`
- **Role Access**: `admin`
- **Description**: Fetches the raw semi-structured JSON document stored in Azure Cosmos DB container `audit_events` (or from resilient local fallback cache).
- **Responses**:
  - `200 OK`: JSON payload containing `{ id, entity, entity_id, action, old_status, new_status, changed_by, details, created_at, content_hash }`.
  - `404 Not Found`: Event document with specified `doc_id` was not found.
  - `403 Forbidden`: Caller lacks `admin` role.


