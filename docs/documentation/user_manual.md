# WishWell — User Manual

> **Audience:** Non-technical end users (Donors, Children's Home Directors, Field Verifiers, Administrators, and Project Evaluators).  
> **Related Documents:** [project_report.md](./project_report.md) | [technical_documentation.md](./technical_documentation.md) | [api_documentation.md](./api_documentation.md)

---

## 1. System Requirements

- **Operating System:** Windows 10/11, macOS, or Linux.
- **Web Browser:** Any modern browser (Google Chrome, Microsoft Edge, Firefox, or Safari) with JavaScript enabled.
- **For Running Locally on a Laptop:**
  - Python 3.11+ (with project virtual environment `.venv` configured)
  - Node.js 18+ and `npm`
  - Optional: Docker Desktop (only needed if running local SQL Server 2022 + Azurite containers instead of the pre-seeded `wishwell.db` SQLite database).

---

## 2. How to Access and Start the Application

### Option A: Local Full-Stack Mode (SQLite `wishwell.db` — Recommended for Demo)
Open **two terminal windows** inside the `Wishwell` project folder:

1. **Terminal 1 — Start the Backend API Server:**
   ```powershell
   cd backend
   ..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
   ```
   Wait until you see `Application startup complete.`

2. **Terminal 2 — Start the Frontend Website:**
   ```powershell
   cd frontend
   npm run dev
   ```
   Open **http://localhost:5173** in your web browser.

> *[Screenshot Placeholder 1: WishWell Landing Page (`http://localhost:5173`) showing the 1-Click Role Switcher bar, navigation header, and featured wishes.]*

### Option B: Static Standalone Preview (No Backend Required)
If you only need a quick offline UI preview without starting FastAPI or Node.js:
```powershell
python open_website.py
```
This opens `http://localhost:3000/standalone_preview.html` in your default browser.

---

## 3. Registration and Login

### 3.1 Creating a New Account
1. Click **Sign In** (or **Get Started**) in the top navigation bar to open the authentication modal.
2. Select the **New Registration** tab.
3. Choose your role:
   - **Donor:** Enter Full Name, Email Address, and Password (minimum 8 characters).
   - **Institution (Children's Home):** Also enter Institution Name, Government/NGO Registration Number, City, and State.
4. Click **Create Account**. You are automatically signed in. *(Note: Field Verifier and Administrator accounts cannot self-register; they are pre-provisioned for security.)*

### 3.2 Signing In with Email or 1-Click Role Switcher
- **Standard Login:** Enter your email and password in the **Sign In** tab.
- **1-Click Demo Role Switcher:** For demonstrations, use the top bar (**Donor • Sarah**, **Institution • St. Mary's**, **Verifier • Marcus**, **Admin • Elena**) or the **One-Click Demo Profiles** buttons inside the Sign In modal.

| Role | Demo Email (in `wishwell.db`) | Password |
|---|---|---|
| **Administrator** | `admin@wishwell.org` | `Password123!` |
| **Field Verifier** | `verifier@wishwell.org` | `Password123!` |
| **Institution** | `contact@stmarys.org` | `Password123!` |
| **Donor** | `sarah.jenkins@example.com` | `Password123!` |

> *[Screenshot Placeholder 2: Sign In / Registration Modal displaying One-Click Demo Profiles and registration tabs.]*

---

## 4. Donor Guide

### 4.1 Browsing Verified Wishes
1. Click **Browse Wishes** in the top navigation bar (also accessible without logging in).
2. Use the **Category filter pills** (e.g., *Educational Supplies*, *Clothing & Footwear*, *Health & Hygiene*, *Bedding & Linen*, *Sports & Recreation*) or type keywords into the **Search bar** (e.g., `"notebooks"` or `"blankets"`).
3. Each wish card shows the item name, verified children's home name and city, remaining quantity needed, and target date.
4. Click a card to inspect full details in the **Wish Detail** popup.

> *[Screenshot Placeholder 3: Browse Wishes page showing category filters, search box, and verified wish cards with remaining item counts.]*

### 4.2 Claiming (Pledging) Donations
1. Click **Pledge / Claim Items** on any open wish card.
2. If you are not signed in as a Donor, sign in first.
3. Enter the **Quantity** you want to donate (from `1` up to the remaining needed count). You can pledge partial quantities—other donors can fulfill the rest.
4. Review the **Calculated Fulfillment Deadline** (automatically set to 14 days from today, or the wish's `needed_by` date if earlier).
5. Click **Confirm Pledge**.

> *[Screenshot Placeholder 4: Claim Modal showing remaining quantity selector and 14-day fulfillment deadline.]*

### 4.3 Tracking Claims, Marking Delivered & Releasing Pledges
1. Go to **My Pledges** (`/donor/claims`) in the navbar.
2. Every pledge lists its item name, quantity, home name, deadline, and status (`active`, `delivered`, `released`, or `expired`).
3. **Once you ship or drop off the items:** Click **Mark Delivered** on an `active` claim, optionally enter a courier tracking number, and submit. The children's home is notified to inspect and confirm receipt.
4. **If you can no longer fulfill a pledge:** Click **Release Pledge** before the deadline to immediately return the items to the open pool for other donors.

> *[Screenshot Placeholder 5: Donor "My Active Pledges" screen showing active pledges, Mark Delivered dialog, and Release Pledge button.]*

---

## 5. Institution (Children's Home) Guide

### 5.1 Institution Registration & Verification Status
1. Sign in as an Institution or register a new Institution account.
2. Open **Onboarding** (`/institution/onboarding`) to see your 4-step verification progress tracker:
   - *Registration & Docs* → *Field Verification* → *Admin Approval* → *Posting Privileges*.
3. **Important:** Only institutions with status **`verified`** can post item wishes.

### 5.2 Uploading Verification Documents
1. On the **Onboarding** page, select a **Document Type** (e.g., *Registration Certificate*, *License*, *Tax Exemption*, *Premises Lease*, *Audit Report*).
2. Choose a **PDF, JPG, or PNG** file under **5 MB** and click **Upload Document**.
3. After uploading your proofs, click **Submit for Field Verification** to queue your application for inspection.

> *[Screenshot Placeholder 6: Institution Onboarding page showing 4-step verification tracker and private document upload form.]*

### 5.3 Posting and Managing Wishes
1. Once verified, click **+ Post Wish** (`/institution/wishes/new`).
2. Select a **Category**, enter a **Title**, **Item Name**, **Description**, **Quantity Requested**, and a future **Needed By** date, then click submit.
3. **Duplicate-Need Warning:** If your home already has an open wish in the same category with similar wording (50%+ overlap), WishWell pauses and displays a yellow **Duplicate Warning** listing the matching wish(es). You can either click **Revise Item Details** or confirm intentionally to proceed.
4. Open **My Wishes** (`/institution/wishes`) to view your open wishes. You can click **Cancel Wish** only when **no active donor pledges** exist on that wish. *(Note: Editing existing wishes via UI is currently done via API `PUT /api/wishes/{id}` or by cancelling and re-posting when no active claims exist.)*

> *[Screenshot Placeholder 7: Create Wish form displaying the Duplicate Need Detection warning banner.]*

### 5.4 Confirming Deliveries & Sending Thank-You Notes
1. Open **Deliveries** (`/institution/deliveries`) to view incoming packages dispatched by donors.
2. **Confirming Delivery (Privacy Rule):**
   - Click **Upload Proof Photo** on a pending delivery.
   - **Strict Child Privacy Rule:** Photograph **only the physical boxes or items** on a table or shelf. **Never upload photos containing children.**
   - Select a JPG/PNG image (≤ 5 MB) and click **Confirm Items Received**. WishWell automatically strips all camera EXIF and GPS location metadata before saving.
   *(Implementation Note: In the current frontend build, `App.tsx` checks `status === 'pending_confirmation'` for the upload button while the API sets `status === 'delivered'`; if only the Thank-You button appears, delivery confirmation can also be verified via Swagger UI at `http://localhost:8000/docs` under `POST /api/deliveries/{delivery_id}/confirm`.)*
3. **Sending a Thank-You Note:**
   - After confirmation, write a heartfelt thank-you message in the **Send Thank-You Note** modal and submit. Only one thank-you note is allowed per delivery.

> *[Screenshot Placeholder 8: Confirm Item Delivery Receipt modal showing the "Strict Privacy Rule: Items Only, Zero Children" notice.]*

---

## 6. Field Verifier Workflow

1. Switch to or sign in as a **Verifier** (`verifier@wishwell.org`) and open **Pending Queue** (`/verifier/queue`).
2. Review each newly registered children's home (registration number, city/state, and uploaded compliance documents).
3. Click any uploaded document link to inspect it via a temporary **15-minute secure SAS link**.
4. After physical/document inspection, choose either:
   - **Recommend for Approval:** Enter inspection findings/notes and submit (moves status from `pending` → `recommended`).
   - **Reject Application:** Enter a clear rejection reason (moves status to `rejected`).

> *[Screenshot Placeholder 9: Field Verifier Queue showing pending institution card, uploaded documents, and recommendation dialog.]*

---

## 7. Administrator Workflow

1. Switch to or sign in as an **Admin** (`admin@wishwell.org`).
2. **Final Approvals (`/admin/approvals`):**
   - Review institutions marked `recommended` along with the Field Verifier's inspection notes.
   - Click **Approve Verification** (`recommended` → `verified`) or **Reject**. Administrators cannot bypass Step 1 to approve `pending` homes directly.
3. **Platform Analytics (`/admin/analytics`):**
   - Inspect monthly wish trends, average delivery lead time (hours/days), stale claim expiry rate, institution funnel breakdown, and top item categories.
   - Click **Release Stale Claims** to manually trigger overdue pledge expiration (`sp_release_stale_claims` / ORM maintenance).
4. **Audit Ledger (`/admin/audit`):**
   - View chronological `audit_log` blocks with `prev_hash` and `record_hash`.
   - Click **Verify Chain Integrity** to mathematically recompute every SHA-256 block from the genesis hash and confirm zero tampering.

> *[Screenshot Placeholder 10: Admin Analytics Dashboard and Audit Ledger showing "Audit Log Integrity Intact" verification banner.]*

---

## 8. Notifications and Donor Impact Dashboard

- **Notifications (`/donor/notifications`):** Displays alerts when pledged items are confirmed delivered, when a thank-you note arrives, or when an overdue claim expires. Click any unread notification (or **Mark read**) to mark it read. Unread badge counts appear in the donor navbar.
- **Impact Dashboard (`/donor/impact`):** Displays KPI cards (**Total Wishes Fulfilled**, **Items Handed Over**, **Homes Supported**), category breakdowns, partner homes helped, and a chronological timeline of confirmed deliveries and thank-you notes.

> *[Screenshot Placeholder 11: Donor Impact Dashboard showing KPI cards, category breakdown, and verified delivery timeline.]*

---

## 9. Common Errors and Troubleshooting

| Symptom / Error | Cause | How to Fix |
|---|---|---|
| **`Too many login attempts` (HTTP 429)** | More than 5 failed login attempts in 60 seconds from the same IP. | Wait 60 seconds and try again with the correct password (`Password123!` for demo users). |
| **`Invalid or expired access token` (HTTP 401)** | JWT access tokens expire after 15 minutes for security. | Sign in again (or click your role button in the 1-Click Role Switcher). |
| **`Concurrency Conflict` (HTTP 409) when claiming** | Another donor claimed the remaining items moments earlier. | Reduce your claim quantity to match the updated remaining count. |
| **`Potential duplicate wish detected` (HTTP 409)** | Your home already has a similar open wish in that category. | Review the listed matches; revise the item or confirm creation intentionally. |
| **`Invalid file content` / `File exceeds 5 MB`** | Uploaded file is > 5 MB or is not a genuine PDF/JPG/PNG (magic-byte check). | Use an authentic `.pdf`, `.jpg`, or `.png` file under 5 MB. |
| **Frontend shows network error / blank data** | Backend `uvicorn` server on port `8000` is not running. | Start Terminal 1 (`..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000`) and refresh the page. |
| **`uvicorn` not found when running `start.ps1`** | Packages are installed inside `.venv`, not global Python. | Use `..\.venv\Scripts\python.exe -m uvicorn ...` from `backend/` or activate `.venv\Scripts\Activate.ps1` first. |
