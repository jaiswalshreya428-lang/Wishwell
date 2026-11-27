# WishWell — Testing Documentation

> **Document Scope:** Automated test suites, actual observed execution results from this repository, verification scripts, and known testing limitations.  
> **Related Documents:** [technical_documentation.md](./technical_documentation.md) | [security_documentation.md](./security_documentation.md) | [api_documentation.md](./api_documentation.md)

---

## 1. Testing Architecture (`backend/tests/conftest.py`)

WishWell's automated backend suite uses **Pytest**, **pytest-asyncio** (`asyncio_mode = "auto"` configured in `backend/pyproject.toml`), and **HTTPX** (`AsyncClient` + `ASGITransport(app=app)`).

- **Isolated Test Database:** Uses a shared in-memory SQLite database (`sqlite+aiosqlite:///file:wishwell_test_db?mode=memory&cache=shared&uri=true` with `StaticPool`).
- **Per-Test Fixture (`setup_test_database`, `autouse=True`):**
  1. Clears `login_rate_limiter._attempts`.
  2. Drops and recreates all 11 ORM tables, plus SQLite view `v_open_wishes` and SQLite triggers:
     - `trg_wish_claims_enforce_active_qty_limit` (`AFTER INSERT`)
     - `trg_audit_log_prevent_update` (`BEFORE UPDATE`)
     - `trg_audit_log_prevent_delete` (`BEFORE DELETE`)
  3. Seeds 4 baseline test accounts (`admin@wishwell.org`, `verifier@wishwell.org`, `institution@wishwell.org`, `donor@wishwell.org` with password `Password123!`), 1 pending institution (`St. Mary's Test Haven`), and 1 category (`Educational Supplies`).
- **Dependency Override:** `app.dependency_overrides[get_db] = override_get_db` routes all API queries to the in-memory test database.
- **Storage & Cosmos Resilience:** During tests without Azurite or Cosmos DB running, `StorageService` and `CosmosService` automatically use their in-memory caches (`_mock_blobs`, `_mock_containers`).

---

## 2. Actual Test Suites & Test Cases in `backend/tests/`

There are **75 test functions** across **9 test files** in `backend/tests/`:

| Test File | Test Count | Coverage & Key Test Cases |
|---|---|---|
| `test_health.py` | 2 | `test_root_endpoint` (`GET /`), `test_health_check_endpoint` (`GET /api/health`) |
| `test_auth.py` | 11 | Donor/institution self-registration (`201`), admin/verifier self-registration forbidden (`403`), duplicate email conflict (`409`), login success (`200`), wrong password & nonexistent email generic `401` + `LOGIN_FAILED` audit row, IP rate limiting (`429` after 5 attempts), `/api/auth/me` authenticated (`200`) & unauthenticated (`401`) |
| `test_rbac.py` | 6 | Unauthenticated `401`, donor blocked from institution routes (`403`), institution allowed on portal (`200`), verifier can recommend (`200`) but cannot approve (`403`), admin can approve recommended institution (`200`) |
| `test_verification_workflow.py` | 10 | Valid PDF upload (`201`), spoofed `.exe`/non-magic-byte rejection (`400`), oversized >5 MB upload rejection (`413`), verifier/admin 15-min SAS URL retrieval, pending queue listing, blocking admin Step-1 skip (`400`), self-approval conflict (`403`), full `pending -> recommended -> verified` FSM, unverified institution wish block (`403`), verified institution wish creation (`201`) |
| `test_wishes.py` | 17 | Wish creation (`201`), unverified institution rejection (`403`), past `needed_by` rejection (`400`), exact duplicate & token-overlap `409` warning, `confirm_duplicate=true` override (`201`), edit/cancel allowed when no active claims exist and blocked (`400`) when active claims exist, `v_open_wishes` pagination/search/category/institution/date-range filters, wish detail (`200`/`404`), plain text `&` and `<script>` handling |
| `test_claims_concurrency.py` | 11 | Partial claim & remaining claim (`201`), over-claim (`409`), zero-remaining (`409`), deadline clamped to `min(now+14d, needed_by)`, donor voluntary release & ownership check (`403`), admin manual stale-claim release (`200`) & non-admin block (`403`), overdue claim expiry + donor notification, **20 simultaneous claims on qty=10 (`asyncio.gather`)** guaranteeing active sum never exceeds 10 |
| `test_delivery_impact.py` | 9 | Donor marks claim delivered (`201`), donor blocked from delivering other's claim (`403`), institution confirms receipt with JPEG containing EXIF (verifies Pillow strips EXIF & produces `sig=` SAS URL), donor blocked from confirming own delivery (`403`), wrong institution blocked (`403`), corrupted image rejected (`400`), thank-you note creation (`201`), donor notifications & mark-read, donor impact metrics & timeline (`200`) |
| `test_audit_analytics.py` | 8 | SQLite triggers blocking `UPDATE`/`DELETE` on `audit_log`, SHA-256 chain linkage from `GENESIS_HASH`, `GET /api/admin/audit/verify` valid chain (`is_valid=True`), **tampering detection** (inserting forged hash and verifying endpoint flags `is_valid=False` and `broken_at_id`), non-admin blocked (`403`), admin analytics overview & 5 individual endpoints (`200`), non-admin blocked from analytics (`403`) |
| `test_full_lifecycle_flow.py` | 1 | `test_complete_platform_9_step_lifecycle`: end-to-end 9-step journey from institution registration through verifier recommendation, admin approval, wish creation, donor claim, dispatch, EXIF-stripped confirmation, thank-you note, and donor impact verification |
| **Total** | **75** | **All 75 tests executed and verified** |

---

## 3. Additional Verification Scripts in `/scripts`

1. **`scripts/verify_db.py`** — 5-part static & behavioral database verifier:
   - Validates `db/schema.sql` (11 tables, constraints, 5 core indexes, `v_open_wishes`, 5 Power BI views, 7 checked triggers, `sp_release_stale_claims`).
   - Validates `db/seed.sql` (seed accounts, 3 institutions, 6 categories, 15 wishes).
   - Validates `docs/er.mmd` and `docs/3NF_ANALYSIS.md`.
   - Validates monorepo files across `backend/`, `frontend/`, `db/`.
   - Simulates `sp_release_stale_claims` and claim quantity trigger invariants in Python.
2. **`scripts/scan_secrets.py`** — Scans repository files and git history using Gitleaks/TruffleHog patterns and Shannon entropy checks for accidental secret commits.

---

## 4. Actual Execution Results (Verified in This Session)

All commands below were executed against the current repository state:

| Check | Command | Observed Result |
|---|---|---|
| **Backend Pytest Suite** | `.\.venv\Scripts\python.exe -m pytest -q` (from `backend/`) | **75 passed, 1 warning in 20.63s** (`Command exited with code 0`). Warning: `StarletteDeprecationWarning` on `HTTP_413_REQUEST_ENTITY_TOO_LARGE` fallback in `storage.py:144`. |
| **Database Verification Suite** | `.\.venv\Scripts\python.exe scripts/verify_db.py` | **ALL 5 VERIFICATION SUITES PASSED PERFECTLY!** (`Command exited with code 0`). |
| **Secret Scan** | `.\.venv\Scripts\python.exe scripts/scan_secrets.py` | **183 files scanned; Working Tree True Positives: 0; Git Commit History True Positives: 0 (`[PASS]`).** |
| **Frontend Production Build** | `npm run build` (`tsc && vite build` in `frontend/`) | **Passed in 12.22s** (`✓ 2549 modules transformed`, generated `dist/`). |
| **Live Local API Probe (`wishwell.db`)** | `uvicorn app.main:app` + `Invoke-RestMethod` | `GET /health` (`200`, `"ok"`), `GET /api/health` (`200`, `"ok"`), `GET /api/categories` (`200`, `6` categories), `GET /api/wishes` (`200`), `GET /docs` (`200`), `POST /api/auth/login` (`200`, role `donor`). |

---

## 5. Known Testing Limitations & Failed/Missing Areas

- **No Frontend Automated Test Suite:** `frontend/package.json` contains `dev`, `build`, and `preview` scripts only; there is no Jest, Vitest, or Playwright test suite for React components.
- **SQLite vs. T-SQL Test Parity:** Pytest runs on in-memory SQLite (`aiosqlite`), so T-SQL-specific constructs (`WITH (UPDLOCK, HOLDLOCK)`, `OUTER APPLY`, `dbo.sp_release_stale_claims`, and the 5 Power BI `vw_*` SQL views) are exercised in SQLite fallback mode during `pytest` rather than against a live SQL Server 2022 instance.
- **Windows Restricted-Sandbox Note:** In restricted Windows sandboxes that block loopback TCP socket pairs, Python's `asyncio` `_make_self_pipe` (`socketpair`) cannot initialize; tests must run in a standard Windows terminal or WSL/Linux environment.
- **Non-Fatal Deprecation Warning:** `backend/app/core/storage.py` triggers 1 `StarletteDeprecationWarning` in `test_document_upload_rejects_oversized_file` due to referencing `status.HTTP_413_REQUEST_ENTITY_TOO_LARGE` as a fallback attribute.

---

## 6. Instructions for Running Tests

```powershell
# 1. Run all 75 backend unit, integration, and concurrency tests
cd backend
..\.venv\Scripts\python.exe -m pytest -v

# 2. Run database schema & invariant verification
cd ..
.\.venv\Scripts\python.exe scripts/verify_db.py

# 3. Run repository secret scan
.\.venv\Scripts\python.exe scripts/scan_secrets.py

# 4. Type-check and build the React frontend
cd frontend
npm run build
```
