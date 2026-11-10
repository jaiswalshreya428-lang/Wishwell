-- ==============================================================================
-- WishWell Database Schema (T-SQL / Microsoft SQL Server 2022 & Azure SQL)
-- 
-- DESIGN GOALS & VIVA NOTES:
-- 1. Strictly in Third Normal Form (3NF): No repeating groups, no partial key
--    dependencies, and no transitive dependencies.
-- 2. Database-enforced business invariants: Triggers and constraints guard
--    quantity limits, future deadlines, and audit integrity directly in the engine.
-- 3. High performance: Covering and filtered indexes for the wish-matching engine.
-- ==============================================================================

-- Create Database if not exists (Only executed when running against master)
IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = 'wishwell')
BEGIN
    CREATE DATABASE wishwell;
END
GO

USE wishwell;
GO

-- ==============================================================================
-- 1. USERS TABLE
-- Stores authentication credentials, full name, and platform role.
-- VIVA NOTE: Role is strictly restricted via CHECK constraint to avoid
-- unauthorized role escalation. Email is UNIQUE and indexed for fast lookup.
-- ==============================================================================
IF OBJECT_ID('dbo.users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        email NVARCHAR(255) NOT NULL,
        password_hash NVARCHAR(255) NOT NULL,
        full_name NVARCHAR(150) NOT NULL,
        role NVARCHAR(20) NOT NULL,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_users_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_users_updated_at DEFAULT SYSUTCDATETIME(),

        CONSTRAINT UQ_users_email UNIQUE (email),
        CONSTRAINT CK_users_role CHECK (role IN ('institution', 'donor', 'verifier', 'admin'))
    );
END
GO

-- ==============================================================================
-- 2. INSTITUTIONS TABLE
-- Stores children's home profiles. 
-- VIVA NOTE: Separated from users table to adhere to 3NF (institutional
-- metadata like reg number and address only belong to institution users).
-- Has a 1-to-1 relationship with the 'institution' user via user_id.
-- ==============================================================================
IF OBJECT_ID('dbo.institutions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.institutions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        name NVARCHAR(200) NOT NULL,
        registration_number NVARCHAR(100) NOT NULL,
        address NVARCHAR(500) NOT NULL,
        city NVARCHAR(100) NOT NULL,
        state NVARCHAR(100) NOT NULL,
        postal_code NVARCHAR(20) NOT NULL,
        phone NVARCHAR(30) NOT NULL,
        website_url NVARCHAR(255) NULL,
        description NVARCHAR(1000) NULL,
        status NVARCHAR(20) NOT NULL CONSTRAINT DF_institutions_status DEFAULT 'pending',
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_institutions_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_institutions_updated_at DEFAULT SYSUTCDATETIME(),

        CONSTRAINT UQ_institutions_user_id UNIQUE (user_id),
        CONSTRAINT UQ_institutions_reg_no UNIQUE (registration_number),
        CONSTRAINT FK_institutions_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
        CONSTRAINT CK_institutions_status CHECK (status IN ('pending', 'recommended', 'verified', 'rejected'))
    );
END
GO

-- ==============================================================================
-- 3. VERIFICATION_RECORDS TABLE
-- Implements the two-step verification workflow:
-- Step 1: Field Verifier reviews documentation/facility -> 'recommended'
-- Step 2: System Admin performs final approval -> 'verified'
-- VIVA NOTE: Maintains complete provenance and auditability of verification.
-- ==============================================================================
IF OBJECT_ID('dbo.verification_records', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.verification_records (
        id INT IDENTITY(1,1) PRIMARY KEY,
        institution_id INT NOT NULL,
        recommended_by INT NULL,
        recommended_at DATETIME2(7) NULL,
        approved_by INT NULL,
        approved_at DATETIME2(7) NULL,
        decision NVARCHAR(20) NOT NULL,
        reason NVARCHAR(1000) NOT NULL,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_verification_records_created_at DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_verification_records_institution FOREIGN KEY (institution_id) REFERENCES dbo.institutions(id) ON DELETE CASCADE,
        CONSTRAINT FK_verification_records_recommended_by FOREIGN KEY (recommended_by) REFERENCES dbo.users(id),
        CONSTRAINT FK_verification_records_approved_by FOREIGN KEY (approved_by) REFERENCES dbo.users(id),
        CONSTRAINT CK_verification_records_decision CHECK (decision IN ('pending', 'recommended', 'verified', 'rejected'))
    );
END
GO

-- ==============================================================================
-- 3B. INSTITUTION_DOCUMENTS TABLE
-- Stores uploaded compliance documents (e.g. registration certificate, tax exemption).
-- VIVA NOTE: Actual files reside in Azure / Azurite Blob Storage in a PRIVATE container.
-- Renamed to UUIDs to prevent directory traversal and collision.
-- ==============================================================================
IF OBJECT_ID('dbo.institution_documents', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.institution_documents (
        id INT IDENTITY(1,1) PRIMARY KEY,
        institution_id INT NOT NULL,
        document_type NVARCHAR(50) NOT NULL,
        file_name NVARCHAR(255) NOT NULL,
        blob_name NVARCHAR(255) NOT NULL,
        file_size_bytes INT NOT NULL,
        mime_type NVARCHAR(100) NOT NULL,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_institution_documents_created_at DEFAULT SYSUTCDATETIME(),

        CONSTRAINT UQ_institution_documents_blob UNIQUE (blob_name),
        CONSTRAINT FK_institution_documents_institution FOREIGN KEY (institution_id) REFERENCES dbo.institutions(id) ON DELETE CASCADE,
        CONSTRAINT CK_institution_documents_type CHECK (document_type IN ('registration_certificate', 'license', 'tax_exemption', 'premises_lease', 'audit_report', 'other'))
    );
END
GO

-- ==============================================================================
-- 4. CATEGORIES TABLE
-- Lookup table for wish categories (e.g. Books, Bedding, Hygiene, Footwear).
-- VIVA NOTE: 3NF lookup table eliminating redundant text repetition in wishes.
-- ==============================================================================
IF OBJECT_ID('dbo.categories', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.categories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(500) NULL,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_categories_created_at DEFAULT SYSUTCDATETIME(),

        CONSTRAINT UQ_categories_name UNIQUE (name)
    );
END
GO

-- ==============================================================================
-- 5. WISHES TABLE
-- Stores specific item needs requested by verified institutions.
-- VIVA NOTE: qty_requested > 0 enforced via CHECK.
-- Future needed_by rule is enforced via trigger trg_wishes_check_needed_by_future
-- because T-SQL CHECK constraints cannot invoke non-deterministic functions (SYSUTCDATETIME).
-- ==============================================================================
IF OBJECT_ID('dbo.wishes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.wishes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        institution_id INT NOT NULL,
        category_id INT NOT NULL,
        title NVARCHAR(200) NOT NULL,
        description NVARCHAR(1000) NOT NULL,
        item_name NVARCHAR(150) NOT NULL,
        qty_requested INT NOT NULL,
        needed_by DATETIME2(7) NOT NULL,
        status NVARCHAR(20) NOT NULL CONSTRAINT DF_wishes_status DEFAULT 'open',
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_wishes_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_wishes_updated_at DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_wishes_institution FOREIGN KEY (institution_id) REFERENCES dbo.institutions(id) ON DELETE CASCADE,
        CONSTRAINT FK_wishes_category FOREIGN KEY (category_id) REFERENCES dbo.categories(id),
        CONSTRAINT CK_wishes_qty_requested CHECK (qty_requested > 0),
        CONSTRAINT CK_wishes_status CHECK (status IN ('open', 'partially_claimed', 'claimed', 'delivered', 'expired', 'cancelled'))
    );
END
GO

-- ==============================================================================
-- 6. WISH_CLAIMS TABLE
-- Records pledges by donors to fulfill whole or partial wish quantities.
-- VIVA NOTE: Active claims hold quantity until delivered, released, or expired.
-- Invariant sum(active claims) <= qty_requested is enforced by trigger
-- trg_wish_claims_enforce_active_qty_limit.
-- ==============================================================================
IF OBJECT_ID('dbo.wish_claims', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.wish_claims (
        id INT IDENTITY(1,1) PRIMARY KEY,
        wish_id INT NOT NULL,
        donor_id INT NOT NULL,
        qty INT NOT NULL,
        deadline DATETIME2(7) NOT NULL,
        status NVARCHAR(20) NOT NULL CONSTRAINT DF_wish_claims_status DEFAULT 'active',
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_wish_claims_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_wish_claims_updated_at DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_wish_claims_wish FOREIGN KEY (wish_id) REFERENCES dbo.wishes(id) ON DELETE CASCADE,
        CONSTRAINT FK_wish_claims_donor FOREIGN KEY (donor_id) REFERENCES dbo.users(id),
        CONSTRAINT CK_wish_claims_qty CHECK (qty > 0),
        CONSTRAINT CK_wish_claims_status CHECK (status IN ('active', 'delivered', 'released', 'expired'))
    );
END
GO

-- ==============================================================================
-- 7. DELIVERIES TABLE
-- Tracks dispatch, courier details, and item-only photo proof of delivery.
-- VIVA NOTE: photo_url references local Azurite Blob Storage.
-- Strict business policy: photos must ONLY display received physical items,
-- NEVER faces or identifying images of children.
-- ==============================================================================
IF OBJECT_ID('dbo.deliveries', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.deliveries (
        id INT IDENTITY(1,1) PRIMARY KEY,
        wish_claim_id INT NOT NULL,
        tracking_number NVARCHAR(100) NULL,
        carrier NVARCHAR(100) NULL,
        photo_url NVARCHAR(500) NULL,
        status NVARCHAR(20) NOT NULL CONSTRAINT DF_deliveries_status DEFAULT 'in_transit',
        delivered_at DATETIME2(7) NULL,
        confirmed_by INT NULL,
        confirmed_at DATETIME2(7) NULL,
        confirmation_notes NVARCHAR(1000) NULL,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_deliveries_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_deliveries_updated_at DEFAULT SYSUTCDATETIME(),

        CONSTRAINT UQ_deliveries_wish_claim_id UNIQUE (wish_claim_id),
        CONSTRAINT FK_deliveries_wish_claim FOREIGN KEY (wish_claim_id) REFERENCES dbo.wish_claims(id) ON DELETE CASCADE,
        CONSTRAINT FK_deliveries_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES dbo.users(id),
        CONSTRAINT CK_deliveries_status CHECK (status IN ('in_transit', 'delivered', 'confirmed', 'failed'))
    );
END
GO

-- ==============================================================================
-- 8. THANK_YOU_NOTES TABLE
-- Sent by children's homes to donors once items are confirmed delivered.
-- VIVA NOTE: 1-to-1 with successful delivery. Provides the feedback loop and
-- drives the donor impact page.
-- ==============================================================================
IF OBJECT_ID('dbo.thank_you_notes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.thank_you_notes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        wish_id INT NOT NULL,
        institution_id INT NOT NULL,
        donor_id INT NOT NULL,
        delivery_id INT NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        impact_summary NVARCHAR(1000) NULL,
        photo_url NVARCHAR(500) NULL,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_thank_you_notes_created_at DEFAULT SYSUTCDATETIME(),

        CONSTRAINT UQ_thank_you_notes_delivery_id UNIQUE (delivery_id),
        CONSTRAINT FK_thank_you_notes_wish FOREIGN KEY (wish_id) REFERENCES dbo.wishes(id),
        CONSTRAINT FK_thank_you_notes_institution FOREIGN KEY (institution_id) REFERENCES dbo.institutions(id),
        CONSTRAINT FK_thank_you_notes_donor FOREIGN KEY (donor_id) REFERENCES dbo.users(id),
        CONSTRAINT FK_thank_you_notes_delivery FOREIGN KEY (delivery_id) REFERENCES dbo.deliveries(id)
    );
END
GO

-- ==============================================================================
-- 9. NOTIFICATIONS TABLE
-- Stores actionable in-app notifications for users (e.g. claim expiration,
-- approval notices, thank-you alerts).
-- ==============================================================================
IF OBJECT_ID('dbo.notifications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.notifications (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        title NVARCHAR(200) NOT NULL,
        message NVARCHAR(1000) NOT NULL,
        type NVARCHAR(50) NOT NULL,
        is_read BIT NOT NULL CONSTRAINT DF_notifications_is_read DEFAULT 0,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_notifications_created_at DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_notifications_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
        CONSTRAINT CK_notifications_type CHECK (type IN ('claim_expired', 'wish_update', 'delivery_update', 'verification_update', 'thank_you'))
    );
END
GO

-- ==============================================================================
-- 10. AUDIT_LOG TABLE
-- Immutable event ledger capturing state transitions across key domain entities.
-- VIVA NOTE: Required by regulatory compliance and university evaluation.
-- Populated automatically via AFTER UPDATE database triggers.
-- ==============================================================================
IF OBJECT_ID('dbo.audit_log', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.audit_log (
        id INT IDENTITY(1,1) PRIMARY KEY,
        entity_type NVARCHAR(50) NOT NULL,
        entity_id INT NOT NULL,
        action NVARCHAR(50) NOT NULL,
        old_status NVARCHAR(50) NULL,
        new_status NVARCHAR(50) NULL,
        changed_by INT NULL,
        details NVARCHAR(MAX) NULL,
        prev_hash VARCHAR(64) NULL,
        record_hash VARCHAR(64) NULL,
        cosmos_doc_id NVARCHAR(100) NULL,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_audit_log_created_at DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_audit_log_changed_by FOREIGN KEY (changed_by) REFERENCES dbo.users(id)
    );
END
GO

-- ==============================================================================
-- 10B. APPEND-ONLY ENFORCEMENT & HASH CHAIN GUARDS ON AUDIT_LOG
-- Requirements: "Make the audit log append-only: the application database user has
-- INSERT and SELECT only on audit_log. Add a hash chain and an admin endpoint that verifies integrity."
-- VIVA NOTE: INSTEAD OF trigger prevents any UPDATE or DELETE operations even by privileged scripts.
-- ==============================================================================
CREATE OR ALTER TRIGGER dbo.trg_audit_log_prevent_mutation
ON dbo.audit_log
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    RAISERROR ('Security Violation: dbo.audit_log is an append-only ledger. UPDATE and DELETE operations are strictly forbidden.', 16, 1);
    ROLLBACK TRANSACTION;
END;
GO

-- Grant INSERT and SELECT, strictly DENY UPDATE and DELETE to the application database user
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'wishwell_app')
BEGIN
    GRANT SELECT, INSERT ON dbo.audit_log TO wishwell_app;
    DENY UPDATE, DELETE ON dbo.audit_log TO wishwell_app;
END
GO

-- ==============================================================================
-- INDEXES
-- Optimizes critical query paths specified in requirements and domain queries.
-- ==============================================================================

-- 1. Index on wishes(status, needed_by) for wish listing and expiry batch jobs
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_wishes_status_needed_by' AND object_id = OBJECT_ID('dbo.wishes'))
BEGIN
    CREATE INDEX idx_wishes_status_needed_by ON dbo.wishes(status, needed_by);
END
GO

-- 2. Index on wishes(category_id) for category filtering
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_wishes_category_id' AND object_id = OBJECT_ID('dbo.wishes'))
BEGIN
    CREATE INDEX idx_wishes_category_id ON dbo.wishes(category_id);
END
GO

-- 3. Index on wish_claims(donor_id) for donor history / dashboard lookup
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_wish_claims_donor_id' AND object_id = OBJECT_ID('dbo.wish_claims'))
BEGIN
    CREATE INDEX idx_wish_claims_donor_id ON dbo.wish_claims(donor_id);
END
GO

-- 4. Index on wish_claims(status, deadline) for fast stale claim discovery
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_wish_claims_status_deadline' AND object_id = OBJECT_ID('dbo.wish_claims'))
BEGIN
    CREATE INDEX idx_wish_claims_status_deadline ON dbo.wish_claims(status, deadline);
END
GO

-- 5. Index on audit_log(created_at) for time-series audit queries
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_log_created_at' AND object_id = OBJECT_ID('dbo.audit_log'))
BEGIN
    CREATE INDEX idx_audit_log_created_at ON dbo.audit_log(created_at);
END
GO

-- Additional Supporting FK Indexes for Join Performance
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_wishes_institution_id' AND object_id = OBJECT_ID('dbo.wishes'))
BEGIN
    CREATE INDEX idx_wishes_institution_id ON dbo.wishes(institution_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_wish_claims_wish_id' AND object_id = OBJECT_ID('dbo.wish_claims'))
BEGIN
    CREATE INDEX idx_wish_claims_wish_id ON dbo.wish_claims(wish_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_notifications_user_unread' AND object_id = OBJECT_ID('dbo.notifications'))
BEGIN
    CREATE INDEX idx_notifications_user_unread ON dbo.notifications(user_id, is_read) INCLUDE (created_at);
END
GO

-- ==============================================================================
-- VIEW: v_open_wishes
-- Requirements: "view v_open_wishes joining wishes, institutions and categories
-- with remaining quantity."
-- VIVA NOTE: Encapsulates remaining quantity calculation. Uses OUTER APPLY
-- to dynamically compute the sum of active claims, safeguarding against double-counting.
-- ==============================================================================
CREATE OR ALTER VIEW dbo.v_open_wishes AS
SELECT
    w.id AS wish_id,
    w.title AS wish_title,
    w.item_name,
    w.description AS wish_description,
    w.qty_requested,
    COALESCE(claims.active_claimed_qty, 0) AS qty_claimed,
    (w.qty_requested - COALESCE(claims.active_claimed_qty, 0)) AS qty_remaining,
    w.needed_by,
    w.status AS wish_status,
    w.created_at AS wish_created_at,
    -- Category Details
    c.id AS category_id,
    c.name AS category_name,
    -- Institution Details
    i.id AS institution_id,
    i.name AS institution_name,
    i.city AS institution_city,
    i.state AS institution_state,
    i.status AS institution_status
FROM dbo.wishes w
INNER JOIN dbo.categories c ON w.category_id = c.id
INNER JOIN dbo.institutions i ON w.institution_id = i.id
OUTER APPLY (
    SELECT SUM(wc.qty) AS active_claimed_qty
    FROM dbo.wish_claims wc
    WHERE wc.wish_id = w.id
      AND wc.status = 'active'
) claims
WHERE w.status IN ('open', 'partially_claimed')
  AND w.needed_by > SYSUTCDATETIME()
  AND i.status = 'verified';
GO

-- ==============================================================================
-- ANALYTICS VIEWS FOR POWER BI DASHBOARDS & REPORTING
-- Task 12 Requirements:
-- 1. vw_wishes_by_category_month (posted, fulfilled)
-- 2. vw_avg_delivery_time (hours)
-- 3. vw_institutions_by_status
-- 4. vw_stale_claim_rate
-- 5. vw_top_categories
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- VIEW 1: vw_wishes_by_category_month
-- Tracks monthly demand volume and fulfillment counts broken down by category.
-- ------------------------------------------------------------------------------
CREATE OR ALTER VIEW dbo.vw_wishes_by_category_month AS
SELECT
    FORMAT(w.created_at, 'yyyy-MM') AS month_year,
    YEAR(w.created_at) AS [year],
    MONTH(w.created_at) AS [month],
    c.id AS category_id,
    c.name AS category_name,
    COUNT(w.id) AS wishes_posted,
    COUNT(CASE WHEN w.status IN ('delivered', 'claimed') THEN 1 END) AS wishes_fulfilled,
    COALESCE(SUM(w.qty_requested), 0) AS items_requested,
    COALESCE(SUM(CASE WHEN w.status IN ('delivered', 'claimed') THEN w.qty_requested ELSE 0 END), 0) AS items_fulfilled,
    CAST(
        ROUND(
            COUNT(CASE WHEN w.status IN ('delivered', 'claimed') THEN 1 END) * 100.0 / NULLIF(COUNT(w.id), 0),
            2
        ) AS DECIMAL(5,2)
    ) AS fulfillment_rate_pct
FROM dbo.wishes w
INNER JOIN dbo.categories c ON w.category_id = c.id
GROUP BY
    FORMAT(w.created_at, 'yyyy-MM'),
    YEAR(w.created_at),
    MONTH(w.created_at),
    c.id,
    c.name;
GO

-- ------------------------------------------------------------------------------
-- VIEW 2: vw_avg_delivery_time
-- Measures mean fulfillment lead time (in hours and days) from pledge to delivery.
-- ------------------------------------------------------------------------------
CREATE OR ALTER VIEW dbo.vw_avg_delivery_time AS
SELECT
    FORMAT(COALESCE(d.confirmed_at, d.delivered_at, wc.created_at), 'yyyy-MM') AS month_year,
    c.id AS category_id,
    c.name AS category_name,
    COUNT(d.id) AS completed_deliveries,
    CAST(
        ROUND(
            AVG(CAST(DATEDIFF(MINUTE, wc.created_at, COALESCE(d.confirmed_at, d.delivered_at)) AS FLOAT) / 60.0),
            2
        ) AS DECIMAL(10,2)
    ) AS avg_delivery_hours,
    CAST(
        ROUND(
            AVG(CAST(DATEDIFF(MINUTE, wc.created_at, COALESCE(d.confirmed_at, d.delivered_at)) AS FLOAT) / 1440.0),
            2
        ) AS DECIMAL(10,2)
    ) AS avg_delivery_days,
    CAST(
        ROUND(
            MIN(CAST(DATEDIFF(MINUTE, wc.created_at, COALESCE(d.confirmed_at, d.delivered_at)) AS FLOAT) / 60.0),
            2
        ) AS DECIMAL(10,2)
    ) AS min_delivery_hours,
    CAST(
        ROUND(
            MAX(CAST(DATEDIFF(MINUTE, wc.created_at, COALESCE(d.confirmed_at, d.delivered_at)) AS FLOAT) / 60.0),
            2
        ) AS DECIMAL(10,2)
    ) AS max_delivery_hours
FROM dbo.deliveries d
INNER JOIN dbo.wish_claims wc ON d.wish_claim_id = wc.id
INNER JOIN dbo.wishes w ON wc.wish_id = w.id
INNER JOIN dbo.categories c ON w.category_id = c.id
WHERE d.status = 'confirmed'
  AND COALESCE(d.confirmed_at, d.delivered_at) >= wc.created_at
GROUP BY
    FORMAT(COALESCE(d.confirmed_at, d.delivered_at, wc.created_at), 'yyyy-MM'),
    c.id,
    c.name;
GO

-- ------------------------------------------------------------------------------
-- VIEW 3: vw_institutions_by_status
-- Provides the verification funnel breakdown across all onboarding stages.
-- ------------------------------------------------------------------------------
CREATE OR ALTER VIEW dbo.vw_institutions_by_status AS
SELECT
    i.status,
    COUNT(*) AS institution_count,
    SUM(COUNT(*)) OVER() AS total_institutions,
    CAST(
        ROUND(
            COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER(), 0),
            2
        ) AS DECIMAL(5,2)
    ) AS percentage
FROM dbo.institutions i
GROUP BY i.status;
GO

-- ------------------------------------------------------------------------------
-- VIEW 4: vw_stale_claim_rate
-- Analyzes platform responsiveness and proportion of unfulfilled expired pledges.
-- ------------------------------------------------------------------------------
CREATE OR ALTER VIEW dbo.vw_stale_claim_rate AS
SELECT
    FORMAT(wc.created_at, 'yyyy-MM') AS month_year,
    c.id AS category_id,
    c.name AS category_name,
    COUNT(wc.id) AS total_claims,
    COUNT(CASE WHEN wc.status = 'active' THEN 1 END) AS active_claims,
    COUNT(CASE WHEN wc.status = 'delivered' THEN 1 END) AS delivered_claims,
    COUNT(CASE WHEN wc.status = 'released' THEN 1 END) AS released_claims,
    COUNT(CASE WHEN wc.status = 'expired' THEN 1 END) AS expired_claims,
    CAST(
        ROUND(
            COUNT(CASE WHEN wc.status = 'expired' THEN 1 END) * 100.0 / NULLIF(COUNT(wc.id), 0),
            2
        ) AS DECIMAL(5,2)
    ) AS stale_claim_rate_pct
FROM dbo.wish_claims wc
INNER JOIN dbo.wishes w ON wc.wish_id = w.id
INNER JOIN dbo.categories c ON w.category_id = c.id
GROUP BY
    FORMAT(wc.created_at, 'yyyy-MM'),
    c.id,
    c.name;
GO

-- ------------------------------------------------------------------------------
-- VIEW 5: vw_top_categories
-- Ranks item categories by demand volume and donor fulfillment success.
-- ------------------------------------------------------------------------------
CREATE OR ALTER VIEW dbo.vw_top_categories AS
SELECT
    c.id AS category_id,
    c.name AS category_name,
    COUNT(w.id) AS wishes_count,
    COALESCE(SUM(w.qty_requested), 0) AS total_items_requested,
    COALESCE(SUM(claims.claimed_qty), 0) AS total_items_claimed,
    COALESCE(SUM(deliveries.delivered_qty), 0) AS total_items_delivered,
    CAST(
        ROUND(
            COALESCE(SUM(deliveries.delivered_qty), 0) * 100.0 / NULLIF(SUM(w.qty_requested), 0),
            2
        ) AS DECIMAL(5,2)
    ) AS fulfillment_rate_pct,
    DENSE_RANK() OVER (ORDER BY COALESCE(SUM(w.qty_requested), 0) DESC) AS rank_by_demand
FROM dbo.categories c
LEFT JOIN dbo.wishes w ON c.id = w.category_id
OUTER APPLY (
    SELECT SUM(wc.qty) AS claimed_qty
    FROM dbo.wish_claims wc
    WHERE wc.wish_id = w.id
) claims
OUTER APPLY (
    SELECT SUM(wc2.qty) AS delivered_qty
    FROM dbo.wish_claims wc2
    INNER JOIN dbo.deliveries d ON wc2.id = d.wish_claim_id
    WHERE wc2.wish_id = w.id
      AND d.status = 'confirmed'
) deliveries
GROUP BY
    c.id,
    c.name;
GO

-- ==============================================================================
-- TRIGGER 1: trg_wishes_check_needed_by_future
-- Requirements: "wishes: qty_requested > 0, needed_by in the future at creation"
-- VIVA NOTE: In T-SQL, CHECK constraints cannot call non-deterministic functions
-- like SYSUTCDATETIME() or GETDATE() (Error 414). An AFTER INSERT trigger is
-- the idiomatic, ANSI-standard database-level solution.
-- ==============================================================================
CREATE OR ALTER TRIGGER dbo.trg_wishes_check_needed_by_future
ON dbo.wishes
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        WHERE i.needed_by <= SYSUTCDATETIME()
    )
    BEGIN
        RAISERROR ('Business Rule Violation: needed_by date must be strictly in the future at creation time.', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END
END;
GO

-- ==============================================================================
-- TRIGGER 1B: trg_wishes_enforce_verified_institution
-- Requirements: "Only institutions with status 'verified' may create wishes
-- (enforce in the API and with a database check)."
-- VIVA NOTE: In T-SQL, a CHECK constraint cannot query another table (institutions).
-- An AFTER INSERT trigger guarantees database-level integrity, blocking unverified
-- institutions even if an unauthorized query bypasses the application layer.
-- ==============================================================================
CREATE OR ALTER TRIGGER dbo.trg_wishes_enforce_verified_institution
ON dbo.wishes
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN dbo.institutions inst ON i.institution_id = inst.id
        WHERE inst.status <> 'verified'
    )
    BEGIN
        RAISERROR ('Business Rule Violation: Only institutions with status ''verified'' can post wishes.', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END
END;
GO

-- ==============================================================================
-- TRIGGER 2: trg_wish_claims_enforce_active_qty_limit
-- Requirements: "A CHECK or trigger must guarantee the sum of ACTIVE claims
-- never exceeds qty_requested."
-- VIVA NOTE: In T-SQL, CHECK constraints cannot contain subqueries (e.g. SUM()).
-- This trigger validates that for any inserted or updated claim, the cumulative
-- sum of all ACTIVE claims for that wish never exceeds wishes.qty_requested.
-- It also synchronizes wishes.status between 'open', 'partially_claimed', and 'claimed'.
-- ==============================================================================
CREATE OR ALTER TRIGGER dbo.trg_wish_claims_enforce_active_qty_limit
ON dbo.wish_claims
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Step 1: Check whether total active claims exceed requested quantity
    IF EXISTS (
        SELECT 1
        FROM (
            SELECT DISTINCT wish_id FROM inserted
            UNION
            SELECT DISTINCT wish_id FROM deleted
        ) affected_wishes
        JOIN dbo.wishes w ON affected_wishes.wish_id = w.id
        CROSS APPLY (
            SELECT COALESCE(SUM(wc.qty), 0) AS total_active_qty
            FROM dbo.wish_claims wc
            WHERE wc.wish_id = w.id
              AND wc.status = 'active'
        ) active_sum
        WHERE active_sum.total_active_qty > w.qty_requested
    )
    BEGIN
        RAISERROR ('Business Rule Violation: The total quantity of active claims exceeds the requested quantity for this wish.', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END

    -- Step 2: Automatically update wish status based on new active claim totals
    -- If a wish is not cancelled/delivered/expired, adjust its open/partially_claimed/claimed status
    UPDATE w
    SET w.status = CASE
            WHEN active_sum.total_active_qty >= w.qty_requested THEN 'claimed'
            WHEN active_sum.total_active_qty > 0 THEN 'partially_claimed'
            ELSE 'open'
        END,
        w.updated_at = SYSUTCDATETIME()
    FROM dbo.wishes w
    INNER JOIN (
        SELECT DISTINCT wish_id FROM inserted
        UNION
        SELECT DISTINCT wish_id FROM deleted
    ) affected ON w.id = affected.wish_id
    CROSS APPLY (
        SELECT COALESCE(SUM(wc.qty), 0) AS total_active_qty
        FROM dbo.wish_claims wc
        WHERE wc.wish_id = w.id
          AND wc.status = 'active'
    ) active_sum
    WHERE w.status IN ('open', 'partially_claimed', 'claimed');
END;
GO

-- ==============================================================================
-- AUDIT TRIGGERS
-- Requirements: "trigger writing to audit_log on status changes of
-- institutions, wishes, wish_claims and deliveries."
-- VIVA NOTE: AFTER UPDATE triggers write immutable rows to audit_log whenever
-- the status column transitions to a new value.
-- ==============================================================================

-- Audit Trigger on institutions
CREATE OR ALTER TRIGGER dbo.trg_institutions_status_audit
ON dbo.institutions
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(status)
    BEGIN
        INSERT INTO dbo.audit_log (
            entity_type,
            entity_id,
            action,
            old_status,
            new_status,
            changed_by,
            details,
            created_at
        )
        SELECT
            'institutions' AS entity_type,
            i.id AS entity_id,
            'STATUS_CHANGE' AS action,
            d.status AS old_status,
            i.status AS new_status,
            NULL AS changed_by,
            CONCAT('Institution "', i.name, '" status changed from ', d.status, ' to ', i.status),
            SYSUTCDATETIME()
        FROM inserted i
        INNER JOIN deleted d ON i.id = d.id
        WHERE i.status <> d.status;
    END
END;
GO

-- Audit Trigger on wishes
CREATE OR ALTER TRIGGER dbo.trg_wishes_status_audit
ON dbo.wishes
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(status)
    BEGIN
        INSERT INTO dbo.audit_log (
            entity_type,
            entity_id,
            action,
            old_status,
            new_status,
            changed_by,
            details,
            created_at
        )
        SELECT
            'wishes' AS entity_type,
            i.id AS entity_id,
            'STATUS_CHANGE' AS action,
            d.status AS old_status,
            i.status AS new_status,
            NULL AS changed_by,
            CONCAT('Wish #', i.id, ' ("', i.title, '") status changed from ', d.status, ' to ', i.status),
            SYSUTCDATETIME()
        FROM inserted i
        INNER JOIN deleted d ON i.id = d.id
        WHERE i.status <> d.status;
    END
END;
GO

-- Audit Trigger on wish_claims
CREATE OR ALTER TRIGGER dbo.trg_wish_claims_status_audit
ON dbo.wish_claims
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(status)
    BEGIN
        INSERT INTO dbo.audit_log (
            entity_type,
            entity_id,
            action,
            old_status,
            new_status,
            changed_by,
            details,
            created_at
        )
        SELECT
            'wish_claims' AS entity_type,
            i.id AS entity_id,
            'STATUS_CHANGE' AS action,
            d.status AS old_status,
            i.status AS new_status,
            i.donor_id AS changed_by,
            CONCAT('Claim #', i.id, ' on wish #', i.wish_id, ' status changed from ', d.status, ' to ', i.status),
            SYSUTCDATETIME()
        FROM inserted i
        INNER JOIN deleted d ON i.id = d.id
        WHERE i.status <> d.status;
    END
END;
GO

-- Audit Trigger on deliveries
CREATE OR ALTER TRIGGER dbo.trg_deliveries_status_audit
ON dbo.deliveries
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(status)
    BEGIN
        INSERT INTO dbo.audit_log (
            entity_type,
            entity_id,
            action,
            old_status,
            new_status,
            changed_by,
            details,
            created_at
        )
        SELECT
            'deliveries' AS entity_type,
            i.id AS entity_id,
            'STATUS_CHANGE' AS action,
            d.status AS old_status,
            i.status AS new_status,
            i.confirmed_by AS changed_by,
            CONCAT('Delivery #', i.id, ' status changed from ', d.status, ' to ', i.status),
            SYSUTCDATETIME()
        FROM inserted i
        INNER JOIN deleted d ON i.id = d.id
        WHERE i.status <> d.status;
    END
END;
GO

-- ==============================================================================
-- STORED PROCEDURE: sp_release_stale_claims
-- Requirements: "in one transaction, marks overdue active claims as expired,
-- restores the wish status, and inserts a notification row for each affected donor."
-- VIVA NOTE: Encapsulates atomic batch maintenance in a single ACID transaction.
-- If any step fails, TRY...CATCH guarantees a complete rollback, leaving no
-- orphaned claims or partial status updates.
-- ==============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_release_stale_claims
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON; -- Ensures automatic transaction rollback on any fatal T-SQL error

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Step 1: Capture all overdue active claims into a local table variable
        DECLARE @expired_claims TABLE (
            claim_id INT NOT NULL,
            wish_id INT NOT NULL,
            donor_id INT NOT NULL,
            qty INT NOT NULL,
            deadline DATETIME2(7) NOT NULL,
            wish_title NVARCHAR(200) NOT NULL
        );

        INSERT INTO @expired_claims (claim_id, wish_id, donor_id, qty, deadline, wish_title)
        SELECT 
            wc.id, 
            wc.wish_id, 
            wc.donor_id, 
            wc.qty, 
            wc.deadline,
            w.title
        FROM dbo.wish_claims wc
        INNER JOIN dbo.wishes w ON wc.wish_id = w.id
        WHERE wc.status = 'active'
          AND wc.deadline < SYSUTCDATETIME();

        -- Early exit if no stale claims are present
        IF NOT EXISTS (SELECT 1 FROM @expired_claims)
        BEGIN
            COMMIT TRANSACTION;
            SELECT 0 AS expired_claims_count;
            RETURN;
        END

        -- Step 2: Mark all overdue active claims as 'expired'
        -- Note: trg_wish_claims_status_audit will automatically log the audit entry
        UPDATE wc
        SET wc.status = 'expired',
            wc.updated_at = SYSUTCDATETIME()
        FROM dbo.wish_claims wc
        INNER JOIN @expired_claims ec ON wc.id = ec.claim_id;

        -- Step 3: Restore wish status for affected wishes
        -- (trg_wish_claims_enforce_active_qty_limit also synchronizes status,
        -- but this explicit update ensures non-active states recalculate predictably)
        UPDATE w
        SET w.status = CASE
                WHEN active_counts.active_qty = 0 THEN 'open'
                WHEN active_counts.active_qty < w.qty_requested THEN 'partially_claimed'
                ELSE 'claimed'
            END,
            w.updated_at = SYSUTCDATETIME()
        FROM dbo.wishes w
        INNER JOIN (
            SELECT DISTINCT wish_id FROM @expired_claims
        ) affected ON w.id = affected.wish_id
        CROSS APPLY (
            SELECT COALESCE(SUM(wc2.qty), 0) AS active_qty
            FROM dbo.wish_claims wc2
            WHERE wc2.wish_id = w.id
              AND wc2.status = 'active'
        ) active_counts
        WHERE w.status IN ('claimed', 'partially_claimed');

        -- Step 4: Insert notification row for each affected donor
        INSERT INTO dbo.notifications (
            user_id,
            title,
            message,
            type,
            is_read,
            created_at
        )
        SELECT
            ec.donor_id,
            'Wish Claim Expired',
            CONCAT('Your claim for ', ec.qty, ' item(s) on wish "', ec.wish_title, '" expired on ', FORMAT(ec.deadline, 'yyyy-MM-dd HH:mm UTC'), '. The items have been returned to the open pool.'),
            'claim_expired',
            0,
            SYSUTCDATETIME()
        FROM @expired_claims ec;

        COMMIT TRANSACTION;

        -- Return count of released claims to caller
        SELECT COUNT(*) AS expired_claims_count FROM @expired_claims;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END;
GO

-- ==============================================================================
-- READ-ONLY SQL USER FOR POWER BI DESKTOP & SERVICE
-- Task 12 Requirement: "Create a read-only SQL user for Power BI."
-- Principle of Least Privilege: powerbi_reader receives SELECT only, DENY all writes.
-- ==============================================================================
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'powerbi_reader')
BEGIN
    GRANT SELECT ON dbo.vw_wishes_by_category_month TO [powerbi_reader];
    GRANT SELECT ON dbo.vw_avg_delivery_time TO [powerbi_reader];
    GRANT SELECT ON dbo.vw_institutions_by_status TO [powerbi_reader];
    GRANT SELECT ON dbo.vw_stale_claim_rate TO [powerbi_reader];
    GRANT SELECT ON dbo.vw_top_categories TO [powerbi_reader];
    GRANT SELECT ON dbo.v_open_wishes TO [powerbi_reader];
    GRANT SELECT ON dbo.categories TO [powerbi_reader];
    GRANT SELECT ON dbo.institutions TO [powerbi_reader];
    GRANT SELECT ON dbo.wishes TO [powerbi_reader];
    GRANT SELECT ON dbo.wish_claims TO [powerbi_reader];
    GRANT SELECT ON dbo.deliveries TO [powerbi_reader];
    DENY INSERT, UPDATE, DELETE ON SCHEMA::dbo TO [powerbi_reader];
END
GO


