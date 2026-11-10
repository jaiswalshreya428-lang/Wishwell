-- ==============================================================================
-- WishWell Database Queries & SQL Demonstration Suite
-- Purpose: University Project Demonstration & Technical Engineering Reference
-- Contains:
--   1. Multi-Table Relational Query (5 JOINs across core entities)
--   2. Aggregation & Analytical Query (GROUP BY, SUM, COUNT, AVG, HAVING)
--   3. Database View Query (v_open_wishes with calculated remaining quantities)
--   4. Stored Procedure Execution (sp_release_stale_claims with OUTPUT parameter)
--   5. Full ACID Transaction Example (Pessimistic row-level locking with UPDLOCK)
-- ==============================================================================

USE wishwell;
GO

-- ==============================================================================
-- QUERY 1: MULTI-TABLE RELATIONAL QUERY (5 JOINS)
-- Purpose:
--   Traces the entire item-fulfillment lifecycle from the initial wish to the
--   pledging donor, the physical delivery, and the confirmed receipt status.
-- Demonstrates:
--   - 5 JOINs: wishes, institutions, categories, wish_claims, users (donors), deliveries.
--   - Filtering on active or completed fulfillment records.
-- ==============================================================================
PRINT '--- Running Query 1: Multi-Table Relational Join ---';

SELECT 
    w.id AS wish_id,
    w.title AS wish_title,
    c.name AS category_name,
    i.name AS institution_name,
    i.city AS institution_city,
    u.full_name AS donor_name,
    u.email AS donor_email,
    wc.qty AS items_claimed,
    wc.deadline AS claim_deadline,
    wc.status AS claim_status,
    d.tracking_number,
    d.carrier,
    d.status AS delivery_status,
    d.delivered_at,
    d.confirmed_at
FROM dbo.wishes w
INNER JOIN dbo.institutions i ON w.institution_id = i.id
INNER JOIN dbo.categories c ON w.category_id = c.id
INNER JOIN dbo.wish_claims wc ON w.id = wc.wish_id
INNER JOIN dbo.users u ON wc.donor_id = u.id
LEFT OUTER JOIN dbo.deliveries d ON wc.id = d.wish_claim_id
WHERE wc.status IN ('active', 'fulfilled')
ORDER BY wc.created_at DESC;

-- [TODO: Screenshot Query 1 results grid in Azure Data Studio or SSMS showing rows with joined columns]
GO


-- ==============================================================================
-- QUERY 2: AGGREGATE & ANALYTICAL QUERY
-- Purpose:
--   Calculates institutional performance metrics by category, computing total
--   items requested, total items claimed, and average delivery turnaround time.
-- Demonstrates:
--   - Aggregate functions: COUNT(), SUM(), AVG(), COALESCE().
--   - Date mathematics: DATEDIFF(hour, start, end).
--   - Filtering aggregated groups using the HAVING clause.
-- ==============================================================================
PRINT '--- Running Query 2: Aggregate & Grouped Analytics ---';

SELECT 
    c.name AS category_name,
    i.name AS institution_name,
    COUNT(DISTINCT w.id) AS total_wishes_posted,
    SUM(w.qty_requested) AS total_items_requested,
    COALESCE(SUM(wc.qty), 0) AS total_items_pledged,
    -- Calculate average fulfillment lead time in hours (from pledge to delivery confirmation)
    AVG(CASE 
        WHEN d.confirmed_at IS NOT NULL 
        THEN CAST(DATEDIFF(hour, wc.created_at, d.confirmed_at) AS FLOAT)
        ELSE NULL 
    END) AS avg_delivery_time_hours
FROM dbo.categories c
INNER JOIN dbo.wishes w ON c.id = w.category_id
INNER JOIN dbo.institutions i ON w.institution_id = i.id
LEFT OUTER JOIN dbo.wish_claims wc ON w.id = wc.wish_id AND wc.status IN ('active', 'fulfilled')
LEFT OUTER JOIN dbo.deliveries d ON wc.id = d.wish_claim_id AND d.status = 'confirmed'
GROUP BY c.name, i.name
HAVING SUM(w.qty_requested) >= 5
ORDER BY total_items_requested DESC;

-- [TODO: Screenshot Query 2 results grid showing aggregated categories, sums, and average delivery hours]
GO


-- ==============================================================================
-- QUERY 3: DATABASE VIEW QUERY
-- Purpose:
--   Queries the dynamically calculated view `v_open_wishes`.
-- Demonstrates:
--   - Querying a pre-compiled SQL View rather than re-writing multi-table logic.
--   - View dynamically calculates `qty_remaining` without storing redundant counters.
--   - Filtering on remaining items and specific category.
-- ==============================================================================
PRINT '--- Running Query 3: Querying the v_open_wishes View ---';

SELECT 
    id AS wish_id,
    title,
    item_name,
    qty_requested,
    qty_remaining,
    needed_by,
    status AS wish_status,
    institution_name,
    institution_city,
    category_name
FROM dbo.v_open_wishes
WHERE qty_remaining > 0
  AND needed_by >= GETUTCDATE()
ORDER BY needed_by ASC;

-- [TODO: Screenshot Query 3 results grid showing `qty_remaining` values dynamically computed by the view]
GO


-- ==============================================================================
-- QUERY 4: STORED PROCEDURE EXECUTION
-- Purpose:
--   Executes `sp_release_stale_claims` to automatically cancel claims past their
--   14-day deadline, restore wish capacity, and notify affected donors.
-- Demonstrates:
--   - Declaring local T-SQL variables.
--   - Executing a Stored Procedure with input parameter and an OUTPUT parameter.
--   - Printing execution outcome.
-- ==============================================================================
PRINT '--- Running Query 4: Executing sp_release_stale_claims ---';

DECLARE @stale_threshold_hours INT = 336; -- 14 days = 336 hours
DECLARE @released_claim_count INT;

-- Execute the stored procedure
EXEC dbo.sp_release_stale_claims 
    @expiry_hours = @stale_threshold_hours,
    @expired_count = @released_claim_count OUTPUT;

-- Display the number of expired claims recycled
SELECT @released_claim_count AS [Total Expired Claims Released and Restored];

-- [TODO: Screenshot Query 4 execution in SSMS showing the OUTPUT parameter message: Total Expired Claims Released]
GO


-- ==============================================================================
-- QUERY 5: FULL ACID TRANSACTION (PESSIMISTIC ROW-LEVEL LOCKING)
-- Purpose:
--   Demonstrates how a donor atomically pledges item quantities without race conditions.
-- Demonstrates:
--   - Explicit transaction boundary (`BEGIN TRANSACTION`, `COMMIT TRANSACTION`).
--   - Pessimistic locking hint: `WITH (UPDLOCK, ROWLOCK)` serializing competing reads.
--   - Conditional verification of availability before writing.
--   - Dynamic status transition of the wish (`open` -> `partially_claimed` -> `claimed`).
--   - Transaction rollback on error (`XACT_ABORT` and `TRY...CATCH`).
-- ==============================================================================
PRINT '--- Running Query 5: Atomic Claim Pledging Transaction ---';

SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @TargetWishId INT = 1;
    DECLARE @DonorUserId INT = 4;       -- e.g. sarah.jenkins@example.com
    DECLARE @PledgeQty INT = 2;
    DECLARE @CurrentTime DATETIME2 = SYSUTCDATETIME();
    DECLARE @WishDeadline DATETIME2;
    DECLARE @QtyRequested INT;
    DECLARE @ActiveClaimSum INT;
    DECLARE @CalculatedDeadline DATETIME2;

    -- 1. Lock the specific wish row exclusively for update (blocks competing claims on this wish)
    SELECT 
        @QtyRequested = qty_requested,
        @WishDeadline = needed_by
    FROM dbo.wishes WITH (UPDLOCK, ROWLOCK)
    WHERE id = @TargetWishId AND status IN ('open', 'partially_claimed');

    IF @QtyRequested IS NULL
    BEGIN
        THROW 50001, 'Target wish is not available for claiming or does not exist.', 1;
    END

    -- 2. Calculate current active claims
    SELECT @ActiveClaimSum = COALESCE(SUM(qty), 0)
    FROM dbo.wish_claims WITH (HOLDLOCK)
    WHERE wish_id = @TargetWishId AND status = 'active';

    -- 3. Enforce capacity check
    IF (@ActiveClaimSum + @PledgeQty) > @QtyRequested
    BEGIN
        DECLARE @Remaining INT = @QtyRequested - @ActiveClaimSum;
        DECLARE @ErrMsg NVARCHAR(200) = CONCAT('Cannot claim ', @PledgeQty, ' items. Only ', @Remaining, ' remaining.');
        THROW 50002, @ErrMsg, 1;
    END

    -- 4. Calculate deadline: min(now + 14 days, wish.needed_by)
    DECLARE @FourteenDaysFuture DATETIME2 = DATEADD(day, 14, @CurrentTime);
    IF @FourteenDaysFuture < @WishDeadline
        SET @CalculatedDeadline = @FourteenDaysFuture;
    ELSE
        SET @CalculatedDeadline = @WishDeadline;

    -- 5. Insert the claim record
    INSERT INTO dbo.wish_claims (wish_id, donor_id, qty, deadline, status, created_at, updated_at)
    VALUES (@TargetWishId, @DonorUserId, @PledgeQty, @CalculatedDeadline, 'active', @CurrentTime, @CurrentTime);

    DECLARE @NewClaimId INT = SCOPE_IDENTITY();

    -- 6. Update wish status
    IF (@ActiveClaimSum + @PledgeQty) = @QtyRequested
    BEGIN
        UPDATE dbo.wishes 
        SET status = 'claimed', updated_at = @CurrentTime 
        WHERE id = @TargetWishId;
    END
    ELSE
    BEGIN
        UPDATE dbo.wishes 
        SET status = 'partially_claimed', updated_at = @CurrentTime 
        WHERE id = @TargetWishId;
    END

    -- 7. Commit transaction
    COMMIT TRANSACTION;

    PRINT CONCAT('SUCCESS: Claim #', @NewClaimId, ' created for quantity ', @PledgeQty, ' under ACID transaction.');

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    PRINT CONCAT('TRANSACTION ROLLED BACK: Error ', ERROR_NUMBER(), ': ', ERROR_MESSAGE());
END CATCH;

-- [TODO: Screenshot Query 5 execution showing SUCCESS message and updated wish_claims row]
GO

