# WishWell — API Documentation

> **Document Scope:** Complete specification of every HTTP endpoint actually registered in `backend/app/main.py` and `backend/app/api/*.py`.  
> **Interactive OpenAPI Docs (when running locally):** `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc`.  
> **Related Documents:** [technical_documentation.md](./technical_documentation.md) | [security_documentation.md](./security_documentation.md) | [architecture.md](./architecture.md)

---

## 1. Conventions, Authentication & Common Errors

- **Base URL (Local):** `http://localhost:8000` (API routes mounted under `/api`, except root `/` and `/health`).
- **Authentication:** `Authorization: Bearer <jwt_token>` (HS256 JWT with 15-minute expiry from `backend/app/core/security.py`).
- **Standard Error Responses:**
  - `400 Bad Request`: Business-rule or state-transition violation (e.g., invalid `document_type`, past `needed_by`, editing wish with active claims).
  - `401 Unauthorized`: Missing, malformed, or expired Bearer token, or invalid login credentials.
  - `403 Forbidden`: Valid token, insufficient role (`require_role`), ownership mismatch, or conflict of interest.
  - `404 Not Found`: Target entity does not exist.
  - `409 Conflict`: Duplicate email/registration number, duplicate wish detected (`DuplicateWishError`), or insufficient remaining wish quantity (`OverClaimError`).
  - `422 Unprocessable Entity`: Pydantic v2 schema validation failure (`RequestValidationError`).
  - `429 Too Many Requests`: Exceeded login rate limit (5 attempts per 60 seconds per client IP).
  - `500 Internal Server Error`: Sanitized generic message with `incident_id` UUID (never leaks stack traces).

---

## 2. Endpoint Summary Matrix

| Method | Path | Auth / Role | Purpose | Source File |
|---|---|---|---|---|
| `GET` | `/` | Public | API metadata welcome JSON | `main.py` |
| `GET` | `/health` | Public | Root health probe (for load balancers) | `main.py` |
| `GET` | `/api/health` | Public | API health response (`HealthResponse`) | `api/router.py` |
| `GET` | `/api/categories` | Public | List all item categories (ordered by `name ASC`) | `api/router.py` / `api/claims.py` |
| `POST` | `/api/auth/register` | Public | Self-register as `donor` or `institution` | `api/auth.py` |
| `POST` | `/api/auth/login` | Public | Authenticate & issue 15-min JWT (rate-limited) | `api/auth.py` |
| `GET` | `/api/auth/me` | Any Authenticated | Retrieve current user & institution summary | `api/auth.py` |
| `GET` | `/api/institutions/me`, `/api/institutions/portal` | `institution` | Retrieve own institution profile + document SAS URLs | `api/institutions.py` |
| `POST` | `/api/institutions/documents` | `institution` | Upload verification doc (`document_type` validated) | `api/institutions.py` |
| `GET` | `/api/institutions/{institution_id}/documents` | `verifier`, `admin`, owning `institution` | List institution documents with fresh 15-min SAS URLs | `api/institutions.py` |
| `GET` | `/api/verifications/pending` | `verifier`, `admin` | List `pending` institutions with documents | `api/verifications.py` |
| `GET` | `/api/verifications/recommended` | `admin`, `verifier` | List `recommended` institutions + verifier notes | `api/verifications.py` |
| `POST` | `/api/verifications/documents` | `institution` | Upload verification document (unrestricted `document_type` string up to 50 chars) | `api/verifications.py` |
| `POST` | `/api/verifications/submit` | `institution` | Submit institution for field verification (`pending`) | `api/verifications.py` |
| `POST` | `/api/verifications/{institution_id}/recommend` | `verifier` | Step 1: Recommend `pending` institution | `api/verifications.py` |
| `POST` | `/api/verifications/{institution_id}/reject` | `verifier`, `admin` | Reject `pending` or `recommended` institution | `api/verifications.py` |
| `POST` | `/api/verifications/{institution_id}/approve` | `admin` (`verifier` if `decision=rejected`) | Step 2: Approve `recommended` institution (or reject) | `api/verifications.py` |
| `GET` | `/api/wishes` | Public | Paginated & filtered open wishes (`v_open_wishes`) | `api/wishes.py` |
| `GET` | `/api/wishes/categories` | Public | List categories (ordered by `id ASC`) | `api/wishes.py` |
| `GET` | `/api/wishes/{wish_id}` | Public | Full wish detail + active claimed qty | `api/wishes.py` |
| `POST` | `/api/wishes` | `institution` (verified) | Create wish (runs duplicate check unless `confirm_duplicate=true`) | `api/wishes.py` |
| `PUT` | `/api/wishes/{wish_id}` | `institution` (owner) | Edit wish (blocked if active claims > 0) | `api/wishes.py` |
| `POST` / `DELETE` | `/api/wishes/{wish_id}/cancel`, `/api/wishes/{wish_id}` | `institution` (owner) | Cancel wish (blocked if active claims > 0) | `api/wishes.py` |
| `POST` | `/api/wishes/{wish_id}/claim` | `donor` | Pledge quantity atomically (14-day max deadline) | `api/claims.py` |
| `GET` | `/api/claims/my` | `donor` | List donor's pledged claims | `api/claims.py` |
| `POST` | `/api/claims/{claim_id}/release`, `/api/wishes/{wish_id}/claims/{claim_id}/release` | `donor` (owner) | Release active claim back to open pool | `api/claims.py` |
| `POST` | `/api/claims/{claim_id}/deliver` | `donor` (owner) | Mark active claim as delivered with tracking/carrier | `api/deliveries.py` |
| `GET` | `/api/deliveries/institution/pending` | `institution` | List incoming deliveries (`delivered`, `pending_confirmation`) | `api/deliveries.py` |
| `POST` | `/api/deliveries/{delivery_id}/confirm` | `institution` (owner) | Confirm receipt with item-only photo (EXIF stripped) | `api/deliveries.py` |
| `POST` | `/api/deliveries/{delivery_id}/thank-you` | `institution` (owner) | Send 1 thank-you note per confirmed delivery | `api/deliveries.py` |
| `GET` | `/api/donors/impact`, `/api/donors/me/impact`, `/api/impact`, `/api/impact/donor` | `donor` | Donor verified impact metrics & timeline | `api/impact.py` |
| `GET` | `/api/notifications` | Any Authenticated | List user notifications (`?is_read=true\|false`) | `api/notifications.py` |
| `PUT` / `PATCH` / `POST` | `/api/notifications/{notification_id}/read` | Any Authenticated (owner) | Mark single notification as read | `api/notifications.py` |
| `POST` | `/api/notifications/mark-all-read` | Any Authenticated | Mark all unread notifications as read | `api/notifications.py` |
| `GET` / `POST` | `/api/admin/audit/verify` | `admin` | Verify SHA-256 hash chain (+ Cosmos content hashes) | `api/admin_analytics.py` |
| `GET` | `/api/admin/audit/logs` | `admin` | List latest audit log entries (`limit` 1–500, default 50) | `api/admin_analytics.py` |
| `GET` | `/api/admin/audit/events/{doc_id}` | `admin` | Fetch raw Cosmos DB `audit_events` JSON document | `api/admin_analytics.py` |
| `GET` | `/api/admin/analytics/overview` | `admin` | Combined 5-dimension BI analytics payload | `api/admin_analytics.py` |
| `GET` | `/api/admin/analytics/wishes-monthly` | `admin` | Monthly wishes posted vs. fulfilled | `api/admin_analytics.py` |
| `GET` | `/api/admin/analytics/delivery-times` | `admin` | Mean delivery turnaround in hours & days | `api/admin_analytics.py` |
| `GET` | `/api/admin/analytics/stale-rates` | `admin` | Claim distribution & stale expiry rate | `api/admin_analytics.py` |
| `GET` | `/api/admin/analytics/institutions-status` | `admin` | Institution counts & percentages by status | `api/admin_analytics.py` |
| `GET` | `/api/admin/analytics/top-categories` | `admin` | Category demand & fulfillment percentages | `api/admin_analytics.py` |
| `POST` | `/api/admin/claims/release-stale`, `/api/admin/claims/release_stale`, `/api/claims/release-stale` | `admin` | Manually run stale-claim expiry job | `api/claims.py` & `api/admin_analytics.py` |

---

## 3. Detailed Endpoint Specifications & Code Examples

### 3.1 Authentication (`/api/auth`)

#### `POST /api/auth/register` (`201 Created`)
- **Request Body (`RegisterRequest`)**:
  ```json
  {
    "email": "director@newhome.org",
    "password": "StrongPassword123!",
    "full_name": "Asha Nair",
    "role": "institution",
    "institution": {
      "name": "Asha Children's Home",
      "registration_number": "REG-KL-2025-102",
      "address": "12 Palm Grove Road",
      "city": "Kochi",
      "state": "Kerala",
      "postal_code": "682001",
      "phone": "+91 9876543210",
      "website_url": "https://ashahome.org",
      "description": "Shelter and schooling support."
    }
  }
  ```
  *Note:* A `model_validator(mode="before")` in `backend/app/schemas/auth.py` also accepts flat fields (`institution_name`, `registration_number`, `city`, `state`, etc.) as used by `AuthModal.tsx`.
- **Rules**: `role` must be `'donor'` or `'institution'` (`403` for `'admin'`/`'verifier'`). Password length `8..128`. Duplicate email or registration number returns `409`.
- **Response (`TokenResponse`)**: `{ "access_token": "...", "token_type": "bearer", "expires_in": 900, "user": { ... } }`.

#### `POST /api/auth/login` (`200 OK`)
- **Request Body (`LoginRequest`)**: `{ "email": "sarah.jenkins@example.com", "password": "Password123!" }`.
- **Rules**: Rate-limited to 5 attempts per 60s per IP (`429`). Failed attempts log `LOGIN_FAILED` in `audit_log` and return `401` with generic `"Invalid email or password"`.

#### `GET /api/auth/me` (`200 OK`)
- **Response (`UserResponse`)**: Returns `id`, `email`, `full_name`, `role`, `created_at`, and nested `institution` (`InstitutionSummary` or `null`).

---

### 3.2 Institutions & Verification (`/api/institutions`, `/api/verifications`)

#### `POST /api/institutions/documents` & `POST /api/verifications/documents` (`201 Created`)
- **Request (`multipart/form-data`)**: `file` (PDF/JPG/PNG, max 5 MB verified by magic bytes) + `document_type` (on `/institutions/documents`, must be one of `registration_certificate`, `license`, `tax_exemption`, `premises_lease`, `audit_report`, `other`).
- **Response (`DocumentResponse`)**: Includes `id`, `blob_name` (`<uuid>.<ext>`), `file_size_bytes`, `mime_type`, `sas_download_url`, and `sas_url` (15-min expiry).

#### `POST /api/verifications/{institution_id}/recommend` (`200 OK`, role: `verifier`)
- **Request Body (`VerificationActionRequest`)**: `{ "reason": "Premises inspected and legal registration verified." }` (`reason` min 3, max 1000 chars).
- **Rules**: Target must be `'pending'` (`400` otherwise); verifier cannot own the institution (`403`). Transitions status to `'recommended'`.

#### `POST /api/verifications/{institution_id}/approve` (`200 OK`, role: `admin`; or `verifier` only when `decision="rejected"`)
- **Request Body (`VerificationActionRequest`)**: `{ "decision": "verified", "reason": "All compliance checks cleared." }`.
- **Rules**: Cannot skip Step 1 (`status == 'pending'` returns `400` `"Cannot skip verification step..."`). Transitions `'recommended'` → `'verified'`.

---

### 3.3 Wishes & Duplicate Detection (`/api/wishes`)

#### `GET /api/wishes` (`200 OK`, Public)
- **Query Params**: `category_id`, `institution_id`, `needed_by_from`/`needed_by_after`, `needed_by_to`/`needed_by_before`, `search`, `page` (default `1`), `page_size` (default `10`, max `100`), `limit` (alias for `page_size`).
- **Response (`WishListResponse`)**: `{ "items": [OpenWishViewResponse...], "total": 15, "page": 1, "page_size": 10, "limit": 10, "total_pages": 2 }`.

#### `POST /api/wishes` (`201 Created`, role: `institution`)
- **Request Body (`WishCreate`)**:
  ```json
  {
    "category_id": 1,
    "title": "50 A4 Grid Math Notebooks",
    "description": "Ruled notebooks for Grade 8 mathematics classes.",
    "item_name": "A4 Grid Math Notebooks",
    "qty_requested": 50,
    "needed_by": "2027-01-15T23:59:59Z",
    "confirm_duplicate": false
  }
  ```
- **409 Duplicate Warning Response**:
  ```json
  {
    "detail": {
      "message": "Potential duplicate wish detected. Similar open wishes already exist in this category for your institution.",
      "duplicate_detected": true,
      "similar_wishes": [
        {
          "id": 1,
          "title": "Mathematics Notebooks & Geometry Sets",
          "item_name": "A4 Grid Math Notebooks & Geometry Box",
          "qty_requested": 30,
          "status": "open",
          "similarity_score": 0.67,
          "match_reason": "Token overlap (67% similarity, shared words: a4, grid, math, notebooks)"
        }
      ],
      "action_required": "Set confirm_duplicate=true in your request payload to bypass this warning and create the wish anyway."
    }
  }
  ```

---

### 3.4 Claims, Deliveries & Impact (`/api/claims`, `/api/deliveries`, `/api/impact`)

#### `POST /api/wishes/{wish_id}/claim` (`201 Created`, role: `donor`)
- **Request Body (`ClaimCreate`)**: `{ "qty": 5 }` (`1..10000`).
- **Rules**: Serialized via `get_wish_lock(wish_id)` + `WITH (UPDLOCK, HOLDLOCK)`. Rejects if `qty > remaining_qty` (`409 Conflict`). Sets `deadline = min(now + 14 days, wish.needed_by)`.

#### `POST /api/claims/{claim_id}/deliver` (`201 Created`, role: `donor`)
- **Request Body (`DeliveryCreate`, optional)**: `{ "tracking_number": "TRK-12345", "carrier": "FedEx" }`.
- **Effect**: Creates/updates `Delivery` (`status='delivered'`), updates `WishClaim.status='delivered'`, notifies institution, logs `MARKED_DELIVERED` in `audit_log`, and writes to Cosmos `delivery_metadata`.

#### `POST /api/deliveries/{delivery_id}/confirm` (`200 OK`, role: `institution`)
- **Request (`multipart/form-data`)**: `photo` or `file` (JPEG/PNG ≤ 5 MB) + optional `notes` (`Form`, max 1000 chars).
- **Rules**: Only the owning institution can confirm (`403` for donors or other institutions). Pillow strips EXIF/GPS metadata and uploads JPEG to `delivery-proofs`. Updates wish to `delivered` if `confirmed_qty >= qty_requested`.

#### `POST /api/deliveries/{delivery_id}/thank-you` (`201 Created`, role: `institution`)
- **Request Body (`ThankYouNoteCreate`)**: `{ "message": "...", "impact_summary": "..." }`.
- **Rules**: Delivery must be `'confirmed'`; strictly 1 note per delivery (`400` if duplicate).

#### `GET /api/impact/donor` (`200 OK`, role: `donor`)
- **Response (`DonorImpactResponse`)**: Returns `total_wishes_fulfilled`, `total_items_delivered`, `institutions_helped`, `institutions_helped_list`, `items_by_category`, and `timeline` (confirmed deliveries + thank-you notes sorted newest first).

---

### 3.5 Admin Analytics & Audit (`/api/admin`)

- **`GET /api/admin/audit/verify`**: Traverses `dbo.audit_log` ordered by `id ASC`, checks `prev_hash` linkage from `GENESIS_HASH` (`"0" * 64`), recomputes canonical SHA-256 (including Cosmos DB document hash when `cosmos_doc_id` is present, with legacy fallback without Cosmos hash), and returns `AuditVerificationResponse`.
- **`GET /api/admin/analytics/overview`**: Aggregates all 5 analytics dimensions (`monthly_wishes`, `delivery_time`, `stale_claims`, `institutions_by_status`, `top_categories`) into a single JSON payload.
- **`POST /api/admin/claims/release-stale`**: Manually executes `release_stale_claims(db)` and returns `expired_claims_count`.
