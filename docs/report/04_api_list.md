# 4. API Endpoints Catalog

WishWell exposes 35 structured RESTful endpoints versioned under the `/api` prefix, verified across frontend and backend integration tests.

---

## 4.1 Authentication & Profile (`/api/auth`)

| Method | Endpoint | Allowed Roles | Request Body | Response / Status | Description |
|---|---|---|---|---|---|
| `POST` | `/api/auth/register` | Public | `UserRegister` (email, password, role, full_name, optional institution data) | `UserResponse` (HTTP 201) | Self-registration for Donors and Institutions. Admins/Verifiers cannot self-register. |
| `POST` | `/api/auth/login` | Public | `LoginRequest` (email, password) | `TokenResponse` (HTTP 200, JWT token + user) | Authenticates user credentials, rate-limited, logs audit trail on failure. |
| `GET` | `/api/auth/me` | Authenticated | None | `UserResponse` (HTTP 200) | Fetches the current logged-in user profile, role, and linked institution ID. |

---

## 4.2 Wishes & Categories (`/api/wishes`, `/api/categories`)

| Method | Endpoint | Allowed Roles | Request Body | Response / Status | Description |
|---|---|---|---|---|---|
| `GET` | `/api/wishes` | Public | Query params: `category_id`, `status`, `search`, `city` | `List[WishResponse]` (HTTP 200) | Public browsable feed of wishes with remaining quantity calculations. |
| `GET` | `/api/wishes/{id}` | Public | None | `WishDetailResponse` (HTTP 200) | Detailed wish information, fulfillment progress, and institution profile. |
| `POST` | `/api/wishes` | Institution | `WishCreate` (title, description, category_id, item_name, qty_requested, needed_by, confirm_duplicate) | `WishResponse` (HTTP 201) | Creates an item wish. Enforces verified institution status and runs duplicate detection. |
| `PUT` | `/api/wishes/{id}` | Institution | `WishUpdate` (title, description, needed_by) | `WishResponse` (HTTP 200) | Updates wish details. Quantity cannot be changed if active claims exist. |
| `DELETE`| `/api/wishes/{id}` | Institution | None | HTTP 204 No Content | Cancels an open wish with zero claims. |
| `GET` | `/api/categories` | Public | None | `List[CategoryResponse]` (HTTP 200) | Retrieves standard item categories (Education, Clothing, etc.). |

---

## 4.3 Pledges & Claims (`/api/claims`, `/api/wishes/{id}/claim`)

| Method | Endpoint | Allowed Roles | Request Body | Response / Status | Description |
|---|---|---|---|---|---|
| `POST` | `/api/wishes/{id}/claim` | Donor | `ClaimCreate` (qty: integer >= 1) | `ClaimResponse` (HTTP 201) | Atomically claims items on a wish using row-level locking (`UPDLOCK`). Rejects over-claims (HTTP 409). |
| `POST` | `/api/claims/{id}/release`| Donor | None | `ClaimResponse` (HTTP 200) | Voluntarily releases an active claim, returning item quantity to the public pool. |
| `GET` | `/api/claims/my` | Donor | None | `List[ClaimResponse]` (HTTP 200) | Lists all active and historical claims pledged by the authenticated donor. |

---

## 4.4 Deliveries & Thank-You Notes (`/api/deliveries`, `/api/claims/{id}/deliver`)

| Method | Endpoint | Allowed Roles | Request Body | Response / Status | Description |
|---|---|---|---|---|---|
| `POST` | `/api/claims/{id}/deliver` | Donor | `DeliveryCreate` (optional tracking_number, carrier) | `DeliveryResponse` (HTTP 201) | Marks a claimed package as dispatched/delivered. |
| `POST` | `/api/deliveries/{id}/confirm`| Institution | Multipart Form: `photo` (binary), `notes` (text) | `DeliveryResponse` (HTTP 200) | Confirms package receipt with mandatory proof photo. Strips EXIF/GPS. Prevents donor self-confirmation. |
| `POST` | `/api/deliveries/{id}/thank-you`| Institution| `ThankYouNoteCreate` (message) | `ThankYouNoteResponse` (HTTP 201) | Sends a thank-you note to the donor (max 1 per delivery). |
| `GET` | `/api/deliveries/institution/pending`| Institution| None | `List[DeliveryResponse]` (HTTP 200) | Lists packages marked as delivered awaiting institution receipt confirmation. |

---

## 4.5 Notifications & Donor Impact (`/api/notifications`, `/api/impact`)

| Method | Endpoint | Allowed Roles | Request Body | Response / Status | Description |
|---|---|---|---|---|---|
| `GET` | `/api/notifications` | Authenticated | None | `NotificationListResponse` (HTTP 200) | Lists user notifications with unread count. |
| `PUT` | `/api/notifications/{id}/read`| Authenticated | None | HTTP 200 OK | Marks a specific notification as read. |
| `GET` | `/api/impact/donor` | Donor | None | `DonorImpactResponse` (HTTP 200) | Aggregates donor impact: total items pledged, items confirmed, homes helped, and thank-you notes. |

---

## 4.6 Institution Verification Workflow (`/api/verifications`, `/api/institutions`)

| Method | Endpoint | Allowed Roles | Request Body | Response / Status | Description |
|---|---|---|---|---|---|
| `GET` | `/api/institutions/me` | Institution | None | `InstitutionResponse` (HTTP 200) | Retrieves current institution profile, onboarding step, and document list. |
| `POST` | `/api/verifications/documents` | Institution | Multipart Form: `file` (PDF/JPG/PNG <= 5MB), `document_type` | `DocumentUploadResponse` (HTTP 201) | Uploads registration certificates into private blob storage with magic-byte inspection. |
| `POST` | `/api/verifications/submit` | Institution | None | `InstitutionResponse` (HTTP 200) | Submits completed application for field inspection. |
| `GET` | `/api/verifications/pending` | Verifier, Admin | None | `List[InstitutionResponse]` (HTTP 200) | Lists institutions awaiting physical premises inspection. Includes 15-min SAS URLs for documents. |
| `GET` | `/api/verifications/recommended`| Admin | None | `List[InstitutionResponse]` (HTTP 200) | Lists institutions recommended by field verifiers awaiting final admin approval. |
| `POST` | `/api/verifications/{id}/recommend`| Verifier | `VerificationActionRequest` (action: "recommend" or "reject", notes) | `VerificationRecordResponse` (HTTP 200) | Field verifier submits premises inspection recommendation. |
| `POST` | `/api/verifications/{id}/approve`| Admin | `VerificationActionRequest` (action: "approve" or "reject", notes) | `VerificationRecordResponse` (HTTP 200) | Administrator grants final verified status to an institution. |

---

## 4.7 Administrative & Analytics (`/api/admin`)

| Method | Endpoint | Allowed Roles | Request Body | Response / Status | Description |
|---|---|---|---|---|---|
| `GET` | `/api/admin/analytics/overview` | Admin | None | `OverviewMetricsResponse` (HTTP 200) | System-wide headline counts (users, wishes, claims, deliveries, verified institutions). |
| `GET` | `/api/admin/analytics/wishes-monthly`| Admin | None | `List[MonthlyWishStatsResponse]` (HTTP 200) | 6-month historical trend of wishes posted vs fulfilled. |
| `GET` | `/api/admin/analytics/delivery-times`| Admin | None | `List[DeliveryTimeResponse]` (HTTP 200) | Average turnaround time in hours from pledge to delivery confirmation by category. |
| `GET` | `/api/admin/analytics/stale-rates`| Admin | None | `StaleClaimRateResponse` (HTTP 200) | Rate of claims that expired without delivery. |
| `GET` | `/api/admin/analytics/institutions-status`| Admin| None | `List[InstitutionStatusCountResponse]` (HTTP 200)| Funnel of institutions across pending, recommended, verified, and rejected statuses. |
| `GET` | `/api/admin/analytics/top-categories`| Admin | None | `List[TopCategoryPerformanceResponse]` (HTTP 200)| Demand and fulfillment percentages by item category. |
| `GET` | `/api/admin/audit/verify` | Admin | None | `AuditChainVerificationResponse` (HTTP 200) | Traverses entire SHA-256 hash chain and returns boolean `is_valid` status. |
| `GET` | `/api/admin/audit/logs` | Admin | Query params: `entity_type`, `limit`, `offset` | `AuditLogListResponse` (HTTP 200) | Paginated audit log records including linked Cosmos DB document IDs. |
| `GET` | `/api/admin/cosmos/audit-events/{doc_id}`| Admin| None | `dict` (HTTP 200) | Retrieves full JSON audit event document from Azure Cosmos DB container. |
| `POST` | `/api/admin/claims/release-stale`| Admin | None | `StaleReleaseResponse` (HTTP 200) | Manually invokes `sp_release_stale_claims` to release abandoned claims immediately. |

---

## 4.8 Health Check (`/api/health`)

| Method | Endpoint | Allowed Roles | Request Body | Response / Status | Description |
|---|---|---|---|---|---|
| `GET` | `/api/health` | Public | None | `HealthResponse` (HTTP 200) | Liveness and readiness probe checking SQL Server connectivity, Cosmos DB status, and Blob storage. |

---

## 4.9 Verification & Screenshots Checklist
- [TODO: Screenshot Swagger UI showing `POST /api/wishes/{id}/claim` documentation]
- [TODO: Screenshot `/api/health` JSON response showing all components healthy: `"status": "healthy"`]

