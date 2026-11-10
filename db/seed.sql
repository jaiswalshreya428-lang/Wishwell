-- ==============================================================================
-- WishWell Seed Data (T-SQL)
-- Fictional data for testing and demonstration.
-- 
-- CONTENTS:
-- - 1 Admin
-- - 1 Verifier
-- - 3 Institutions (1 Verified, 1 Recommended, 1 Pending)
-- - 4 Donors
-- - 6 Wish Categories
-- - 15 Diverse Wishes
-- - Verification Records, Claims, Deliveries, Thank-You Notes, and Notifications
-- 
-- ARCHITECTURE NOTE: All passwords hash to 'Password123!' using standard 12-round bcrypt.
-- All photo URLs point to item-only blobs in local Azurite emulator.
-- Absolutely NO personal data or images of children.
-- ==============================================================================

USE wishwell;
GO

SET NOCOUNT ON;

-- Reusable Bcrypt Hash for 'Password123!'
DECLARE @DefaultHash NVARCHAR(255) = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj404nF/3nhe';

-- ==============================================================================
-- 1. SEED USERS
-- ==============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE email = 'admin@wishwell.org')
BEGIN
    INSERT INTO dbo.users (email, password_hash, full_name, role)
    VALUES 
        ('admin@wishwell.org', @DefaultHash, 'Elena Vance (Admin)', 'admin'),
        ('verifier@wishwell.org', @DefaultHash, 'Marcus Chen (Field Verifier)', 'verifier'),
        ('contact@stmaryshaven.org', @DefaultHash, 'Sister Teresa Ramos', 'institution'),
        ('info@sunshinehome.org', @DefaultHash, 'David Kim', 'institution'),
        ('director@hopevillage.org', @DefaultHash, 'Amina Al-Mansoor', 'institution'),
        ('sarah.jenkins@example.com', @DefaultHash, 'Sarah Jenkins', 'donor'),
        ('rohit.sharma@example.com', @DefaultHash, 'Rohit Sharma', 'donor'),
        ('emily.watson@example.com', @DefaultHash, 'Emily Watson', 'donor'),
        ('liam.patel@example.com', @DefaultHash, 'Liam Patel', 'donor');
END
GO

-- ==============================================================================
-- 2. SEED INSTITUTIONS
-- ==============================================================================
DECLARE @inst1_user INT = (SELECT id FROM dbo.users WHERE email = 'contact@stmaryshaven.org');
DECLARE @inst2_user INT = (SELECT id FROM dbo.users WHERE email = 'info@sunshinehome.org');
DECLARE @inst3_user INT = (SELECT id FROM dbo.users WHERE email = 'director@hopevillage.org');

IF NOT EXISTS (SELECT 1 FROM dbo.institutions WHERE registration_number = 'REG-MH-2018-0912')
BEGIN
    INSERT INTO dbo.institutions (user_id, name, registration_number, address, city, state, postal_code, phone, website_url, description, status)
    VALUES 
        (@inst1_user, 'St. Mary''s Children''s Haven', 'REG-MH-2018-0912', '42 Sanctuary Way, Hill View', 'Mumbai', 'Maharashtra', '400050', '+91 22 2640 1122', 'https://stmaryshaven.org', 'Home providing shelter, healthcare, and education for 45 resident children.', 'verified'),
        (@inst2_user, 'Sunshine Youth Sanctuary', 'REG-KA-2020-4418', '88 Sunrise Colony, Koramangala', 'Bengaluru', 'Karnataka', '560034', '+91 80 4112 8899', 'https://sunshineyouth.org', 'Community residential center fostering creative arts and academic tutoring.', 'recommended'),
        (@inst3_user, 'Hope Village Child Center', 'REG-DL-2022-7731', '14 Green Meadows Lane, Mehrauli', 'New Delhi', 'Delhi', '110030', '+91 11 2680 5500', NULL, 'Newly founded shelter supporting rural migrant children needing schooling support.', 'pending');
END
GO

-- ==============================================================================
-- 3. SEED VERIFICATION RECORDS
-- ==============================================================================
DECLARE @verifier_id INT = (SELECT id FROM dbo.users WHERE email = 'verifier@wishwell.org');
DECLARE @admin_id INT = (SELECT id FROM dbo.users WHERE email = 'admin@wishwell.org');
DECLARE @inst1_id INT = (SELECT id FROM dbo.institutions WHERE registration_number = 'REG-MH-2018-0912');
DECLARE @inst2_id INT = (SELECT id FROM dbo.institutions WHERE registration_number = 'REG-KA-2020-4418');
DECLARE @inst3_id INT = (SELECT id FROM dbo.institutions WHERE registration_number = 'REG-DL-2022-7731');

IF NOT EXISTS (SELECT 1 FROM dbo.verification_records WHERE institution_id = @inst1_id)
BEGIN
    -- Institution 1: Fully verified through 2-step verification process
    INSERT INTO dbo.verification_records (institution_id, recommended_by, recommended_at, approved_by, approved_at, decision, reason)
    VALUES 
        (@inst1_id, @verifier_id, DATEADD(day, -45, SYSUTCDATETIME()), @admin_id, DATEADD(day, -40, SYSUTCDATETIME()), 'verified', 'Physical inspection completed. Valid registration documents, fire safety compliance, and financial records verified.');

    -- Institution 2: Recommended by verifier, pending final admin signoff
    INSERT INTO dbo.verification_records (institution_id, recommended_by, recommended_at, approved_by, approved_at, decision, reason)
    VALUES 
        (@inst2_id, @verifier_id, DATEADD(day, -5, SYSUTCDATETIME()), NULL, NULL, 'recommended', 'On-site visit confirmed excellent premises. Recommending for admin approval pending tax exemption certificate upload.');

    -- Institution 3: Initial application received, pending verifier review
    INSERT INTO dbo.verification_records (institution_id, recommended_by, recommended_at, approved_by, approved_at, decision, reason)
    VALUES 
        (@inst3_id, NULL, NULL, NULL, NULL, 'pending', 'Application received. Queued for regional field verifier dispatch.');
END
GO

-- ==============================================================================
-- 4. SEED CATEGORIES (6 Categories)
-- ==============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.categories WHERE name = 'Educational Supplies')
BEGIN
    INSERT INTO dbo.categories (name, description)
    VALUES 
        ('Educational Supplies', 'Notebooks, textbooks, stationery, school bags, and scientific calculators.'),
        ('Clothing & Footwear', 'School uniforms, sweaters, winter coats, walking shoes, and socks.'),
        ('Health & Hygiene', 'Toothbrushes, soaps, sanitizers, sanitary pads, and first-aid kits.'),
        ('Bedding & Linens', 'Fleece blankets, cotton bedsheets, pillows, and mattress protectors.'),
        ('Sports & Recreation', 'Soccer balls, cricket gear, chess sets, indoor games, and art supplies.'),
        ('Nutrition & Essentials', 'Multigrain cereals, milk formula, healthy snacks, and dry pulses.');
END
GO

-- ==============================================================================
-- 5. SEED WISHES (15 Wishes)
-- ==============================================================================
DECLARE @inst1 INT = (SELECT id FROM dbo.institutions WHERE registration_number = 'REG-MH-2018-0912');
DECLARE @inst2 INT = (SELECT id FROM dbo.institutions WHERE registration_number = 'REG-KA-2020-4418');

DECLARE @cat_edu INT = (SELECT id FROM dbo.categories WHERE name = 'Educational Supplies');
DECLARE @cat_cloth INT = (SELECT id FROM dbo.categories WHERE name = 'Clothing & Footwear');
DECLARE @cat_hygiene INT = (SELECT id FROM dbo.categories WHERE name = 'Health & Hygiene');
DECLARE @cat_bed INT = (SELECT id FROM dbo.categories WHERE name = 'Bedding & Linens');
DECLARE @cat_sport INT = (SELECT id FROM dbo.categories WHERE name = 'Sports & Recreation');
DECLARE @cat_nutri INT = (SELECT id FROM dbo.categories WHERE name = 'Nutrition & Essentials');

IF NOT EXISTS (SELECT 1 FROM dbo.wishes WHERE title = '50 Oxford Spiral Math Notebooks')
BEGIN
    INSERT INTO dbo.wishes (institution_id, category_id, title, description, item_name, qty_requested, needed_by, status)
    VALUES 
        (@inst1, @cat_edu, '50 Oxford Spiral Math Notebooks', 'Single-line ruled 200-page spiral notebooks for middle school mathematics classes.', 'Oxford Spiral Math Notebooks', 50, DATEADD(day, 25, SYSUTCDATETIME()), 'open'),
        (@inst1, @cat_cloth, '25 Pairs of Waterproof Winter Boots', 'Durable waterproof children boots (sizes 3 to 6) for upcoming monsoon and winter season.', 'Waterproof Children Boots', 25, DATEADD(day, 18, SYSUTCDATETIME()), 'open'),
        (@inst1, @cat_hygiene, '40 Dental Care Kits', 'Complete oral health set containing soft-bristle toothbrush, fluoride toothpaste, and rinse cup.', 'Oral Hygiene Pack', 40, DATEADD(day, 30, SYSUTCDATETIME()), 'open'),
        (@inst1, @cat_bed, '30 Warm Fleece Blankets', 'Single-bed plush fleece thermal blankets for resident dormitory beds.', 'Fleece Dormitory Blankets', 30, DATEADD(day, 21, SYSUTCDATETIME()), 'open'),
        (@inst1, @cat_sport, '10 Official Size 5 Soccer Balls', 'High-durability stitched footballs for evening outdoor athletics.', 'Size 5 Footballs', 10, DATEADD(day, 40, SYSUTCDATETIME()), 'open'),
        (@inst1, @cat_edu, '15 Sets of Scientific Calculators', 'Standard Casio fx-82MS calculators for high school STEM students.', 'Casio Scientific Calculator', 15, DATEADD(day, 15, SYSUTCDATETIME()), 'open'),
        (@inst1, @cat_cloth, '35 Hooded Rain Ponchos', 'Lightweight waterproof reusable rain ponchos for children walking to school.', 'Hooded Rain Ponchos', 35, DATEADD(day, 12, SYSUTCDATETIME()), 'open'),
        (@inst1, @cat_nutri, '20 Tins of Infant Nutrition Powder', 'Pediatrician-approved fortified milk powder for toddlers under 4.', 'Infant Fortified Milk Powder', 20, DATEADD(day, 14, SYSUTCDATETIME()), 'open'),
        (@inst1, @cat_edu, '100 Blue Ballpoint Pens & Geometry Sets', 'Bulk pens and student mathematical instrument boxes for annual examinations.', 'Ballpoint Pens & Geometry Sets', 100, DATEADD(day, 35, SYSUTCDATETIME()), 'open'),
        (@inst1, @cat_bed, '20 Twin Bed Cotton Sheet Sets', '100% breathable cotton fitted bedsheets with matching pillow covers.', 'Cotton Twin Bedsheet Sets', 20, DATEADD(day, 28, SYSUTCDATETIME()), 'open'),
        (@inst1, @cat_sport, '12 Tournament Wooden Chess Sets', 'Handcrafted wooden chess boards and Staunton-style wooden pieces for chess club.', 'Wooden Chess Sets', 12, DATEADD(day, 45, SYSUTCDATETIME()), 'open'),
        (@inst1, @cat_hygiene, '25 First Aid Emergency Medical Kits', 'Wall-mountable emergency kits with bandages, antiseptic solution, burn cream, and gauze.', 'Comprehensive First Aid Kit', 25, DATEADD(day, 22, SYSUTCDATETIME()), 'open'),
        (@inst1, @cat_cloth, '50 Pairs of Cotton Athletic Socks', 'Cushioned white cotton crew socks for daily school uniform use.', 'White Cotton Crew Socks', 50, DATEADD(day, 30, SYSUTCDATETIME()), 'open'),
        (@inst1, @cat_edu, '30 Illustrated World Atlases', 'Hardcover educational world atlases and reference dictionaries for library.', 'Illustrated World Atlases', 30, DATEADD(day, 60, SYSUTCDATETIME()), 'open'),
        (@inst1, @cat_nutri, '15 Cases of High-Protein Multigrain Cereal', 'Healthy morning breakfast cereals fortified with zinc, iron, and vitamin D.', 'Multigrain Breakfast Cereal Cases', 15, DATEADD(day, 19, SYSUTCDATETIME()), 'open');
END
GO

-- ==============================================================================
-- 6. SEED CLAIMS, DELIVERIES, AND THANK-YOU NOTES
-- Demonstrates the full lifecycle for a couple of wishes:
-- - Wish 1 receives partial claim from Donor 1
-- - Wish 5 receives claim + completed delivery + thank-you note from Institution
-- ==============================================================================
DECLARE @donor1 INT = (SELECT id FROM dbo.users WHERE email = 'sarah.jenkins@example.com');
DECLARE @donor2 INT = (SELECT id FROM dbo.users WHERE email = 'rohit.sharma@example.com');
DECLARE @inst1_id INT = (SELECT id FROM dbo.institutions WHERE registration_number = 'REG-MH-2018-0912');

DECLARE @wish1 INT = (SELECT id FROM dbo.wishes WHERE title = '50 Oxford Spiral Math Notebooks');
DECLARE @wish5 INT = (SELECT id FROM dbo.wishes WHERE title = '10 Official Size 5 Soccer Balls');

IF NOT EXISTS (SELECT 1 FROM dbo.wish_claims WHERE wish_id = @wish1 AND donor_id = @donor1)
BEGIN
    -- Active claim: Sarah claims 20 out of 50 notebooks (Wish becomes 'partially_claimed' automatically via trigger)
    INSERT INTO dbo.wish_claims (wish_id, donor_id, qty, deadline, status)
    VALUES (@wish1, @donor1, 20, DATEADD(day, 7, SYSUTCDATETIME()), 'active');

    -- Fulfilled claim: Rohit claimed 10 soccer balls, delivered and confirmed
    INSERT INTO dbo.wish_claims (wish_id, donor_id, qty, deadline, status)
    VALUES (@wish5, @donor2, 10, DATEADD(day, -3, SYSUTCDATETIME()), 'delivered');

    DECLARE @claim5_id INT = (SELECT id FROM dbo.wish_claims WHERE wish_id = @wish5 AND donor_id = @donor2);

    -- Delivery record with item-only photo proof (strictly items, never children)
    INSERT INTO dbo.deliveries (wish_claim_id, tracking_number, carrier, photo_url, status, delivered_at, confirmed_by, confirmed_at, confirmation_notes)
    VALUES (
        @claim5_id,
        'TRK-FEDEX-99881122',
        'FedEx Express',
        'http://127.0.0.1:10000/devstoreaccount1/delivery-photos/sample_delivered_soccer_balls_items_only.jpg',
        'confirmed',
        DATEADD(day, -2, SYSUTCDATETIME()),
        (SELECT user_id FROM dbo.institutions WHERE id = @inst1_id),
        DATEADD(day, -1, SYSUTCDATETIME()),
        'All 10 official soccer balls arrived in perfect new condition with inflation needles and pump included. Confirmed by facility manager.'
    );

    DECLARE @delivery5_id INT = (SELECT id FROM dbo.deliveries WHERE wish_claim_id = @claim5_id);

    -- Thank you note sent back to donor
    INSERT INTO dbo.thank_you_notes (wish_id, institution_id, donor_id, delivery_id, message, impact_summary, photo_url)
    VALUES (
        @wish5,
        @inst1_id,
        @donor2,
        @delivery5_id,
        'Dear Rohit, thank you so much for your generous gift of 10 official soccer balls! Our children have already begun training with them on our sports ground. Your kindness brings immense joy to our sanctuary.',
        '10 official match soccer balls enabled 45 resident children to participate in physical fitness and football coaching drills.',
        'http://127.0.0.1:10000/devstoreaccount1/delivery-photos/sample_delivered_soccer_balls_items_only.jpg'
    );

    -- Also mark wish 5 as delivered
    UPDATE dbo.wishes SET status = 'delivered' WHERE id = @wish5;
END
GO

