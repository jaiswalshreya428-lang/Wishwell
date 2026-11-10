#!/usr/bin/env python3
"""
Generates db/seed_analytics.sql for WishWell
Task 12: Analytics for Power BI
Produces 6 months of realistic fictional historical data:
- ~300 wishes
- ~150 claims
- ~100 deliveries (with turnaround times from 12h to 96h)
- 85 thank-you notes
- Read-only user powerbi_reader
"""

import random
from datetime import datetime, timedelta, timezone

def generate_sql():
    # Fixed random seed for 100% reproducible deterministic dataset
    random.seed(42)

    categories = [
        {"id": 1, "name": "Educational Supplies", "items": [
            ("Oxford Ruled Exercise Books", 20, 100),
            ("Elementary STEM Science Kits", 5, 25),
            ("Student Geometry & Drafting Boxes", 15, 60),
            ("English-Hindi Student Dictionaries", 10, 40),
            ("Solar LED Study Lamps", 10, 30),
            ("Ballpoint Pens & Marker Sets", 30, 150),
            ("Wooden Kindergarten Alphabets & Puzzles", 8, 20),
            ("Standard Casio Scientific Calculators", 5, 25),
            ("High School Physics & Biology Lab Manuals", 10, 35),
            ("World Physical Atlases & Wall Maps", 5, 15),
        ]},
        {"id": 2, "name": "Clothing & Footwear", "items": [
            ("Navy Blue Cotton School Uniforms", 15, 50),
            ("Knitted Woolen Sweaters", 20, 60),
            ("All-Weather Waterproof School Shoes", 10, 40),
            ("Monsoon Raincoats with Hoods", 15, 45),
            ("Cotton Daily Wear T-Shirts & Shorts", 25, 80),
            ("Sports Running Shoes", 10, 35),
            ("Winter Thermal Innerwear Sets", 20, 50),
            ("White Athletic Crew Socks Packs", 30, 90),
            ("Protective Canvas Sun Hats", 15, 40),
            ("Sturdy School Backpacks", 15, 50),
        ]},
        {"id": 3, "name": "Health & Hygiene", "items": [
            ("Comprehensive Pediatric First-Aid Kits", 5, 15),
            ("Eco-Friendly Sanitary Pad Bundles", 30, 100),
            ("Antibacterial Liquid Handwash & Soaps", 25, 80),
            ("Oral Care Sets (Toothbrush + Paste)", 20, 60),
            ("Digital Clinical Thermometers", 4, 12),
            ("Child Mosquito Nets & Insect Repellents", 15, 50),
            ("Stainless Steel Personal Water Bottles", 20, 60),
            ("Gentle Baby Shampoo & Moisturizer Packs", 10, 30),
            ("Multi-Surface Disinfectant Liquid 5L", 5, 20),
            ("Clean Water Filtration Cartridges", 4, 10),
        ]},
        {"id": 4, "name": "Bedding & Linens", "items": [
            ("High-Density Single Foam Mattresses", 8, 25),
            ("Plush Winter Polar Fleece Blankets", 15, 45),
            ("100% Breathable Cotton Bedsheet Sets", 20, 50),
            ("Orthopedic Fiber Sleeping Pillows", 15, 40),
            ("Waterproof Quilted Mattress Protectors", 10, 30),
            ("Soft Flannel Receiving Blankets", 12, 35),
            ("Dormitory Window Privacy Curtains", 6, 20),
            ("Absorbent Cotton Bath Towels", 20, 60),
            ("Foldable Sleeping Floor Mats", 10, 30),
            ("Bedside Storage Hanging Organizers", 8, 25),
        ]},
        {"id": 5, "name": "Sports & Recreation", "items": [
            ("Official Match Footballs (Size 5)", 5, 20),
            ("Junior Cricket Sets (Bats, Balls, Stumps)", 4, 12),
            ("Badminton Rackets & Nylon Shuttlecocks", 6, 24),
            ("Tournament Wooden Chess Sets", 6, 18),
            ("Carrom Boards with Coins & Striker", 4, 10),
            ("Skipping Ropes & Agility Rings", 15, 40),
            ("Acrylic Painting & Canvas Art Kits", 10, 30),
            ("Acoustic Guitars for Music Classes", 2, 6),
            ("Table Tennis Rackets & Net Sets", 4, 12),
            ("Color Clay & Kinetic Sand Modeling Kits", 10, 30),
        ]},
        {"id": 6, "name": "Nutrition & Essentials", "items": [
            ("Fortified Toddler Milk Powder Tins", 10, 30),
            ("Multigrain Breakfast Cereal Cartons", 15, 45),
            ("High-Protein Roasted Soy & Peanuts", 20, 60),
            ("Organic Dry Fruit & Nut Mix Packs", 10, 35),
            ("Immunity Zinc & Vitamin D Chewables", 15, 50),
            ("Whole Wheat Pasta & Pulses Bundles", 20, 70),
            ("Pure Natural Forest Honey 1kg Jars", 8, 24),
            ("Jaggery & Sesame Energy Chikki Boxes", 25, 80),
            ("Electrolyte Rehydration Salts Packs", 30, 100),
            ("Cold-Pressed Sesame Cooking Oil 5L", 6, 18),
        ]},
    ]

    donors = [
        {"id": 6, "name": "Sarah Jenkins", "email": "sarah.jenkins@example.com"},
        {"id": 7, "name": "Rohit Sharma", "email": "rohit.sharma@example.com"},
        {"id": 8, "name": "Emily Watson", "email": "emily.watson@example.com"},
        {"id": 9, "name": "Liam Patel", "email": "liam.patel@example.com"},
    ]

    carriers = ["BlueDart Express", "Delhivery Surface", "DTDC Courier", "India Post Speed Post", "FedEx Express"]

    now = datetime(2026, 5, 1, 12, 0, 0) # Baseline current simulation date (May 2026)

    # 300 Wishes generated across 6 months (-180 days to -5 days)
    # Target breakdown:
    # ~100 delivered (with claims and deliveries)
    # ~25 expired claims
    # ~15 active claims
    # ~10 released claims
    # ~150 remaining open or partially claimed
    
    wishes = []
    claims = []
    deliveries = []
    thank_yous = []

    wish_id_counter = 100  # Start higher than seed.sql wishes (1-15)
    claim_id_counter = 100
    delivery_id_counter = 100
    thank_you_id_counter = 100

    # We distribute 300 wishes across 6 months:
    # Month 1 (Nov 2025): 45 wishes
    # Month 2 (Dec 2025): 50 wishes
    # Month 3 (Jan 2026): 52 wishes
    # Month 4 (Feb 2026): 50 wishes
    # Month 5 (Mar 2026): 53 wishes
    # Month 6 (Apr 2026): 50 wishes
    # Total: 300 wishes!

    months_config = [
        {"month_idx": 5, "start_day": 175, "end_day": 150, "wish_count": 48}, # Nov 2025
        {"month_idx": 4, "start_day": 149, "end_day": 120, "wish_count": 50}, # Dec 2025
        {"month_idx": 3, "start_day": 119, "end_day": 90, "wish_count": 52},  # Jan 2026
        {"month_idx": 2, "start_day": 89, "end_day": 60, "wish_count": 50},   # Feb 2026
        {"month_idx": 1, "start_day": 59, "end_day": 30, "wish_count": 50},   # Mar 2026
        {"month_idx": 0, "start_day": 29, "end_day": 2, "wish_count": 50},    # Apr 2026
    ]

    # Pre-plan outcome counts
    total_wishes_needed = 300
    total_delivered = 100
    total_expired = 25
    total_active = 15
    total_released = 10

    outcomes = (
        ["delivered"] * total_delivered +
        ["expired"] * total_expired +
        ["active"] * total_active +
        ["released"] * total_released +
        ["open"] * (total_wishes_needed - (total_delivered + total_expired + total_active + total_released))
    )
    random.shuffle(outcomes)

    outcome_idx = 0

    for m in months_config:
        for _ in range(m["wish_count"]):
            if outcome_idx >= len(outcomes):
                break
            outcome = outcomes[outcome_idx]
            outcome_idx += 1

            cat = random.choice(categories)
            item_tuple = random.choice(cat["items"])
            item_name = item_tuple[0]
            qty_req = random.randint(item_tuple[1], item_tuple[2])

            days_ago = random.randint(m["end_day"], m["start_day"])
            created_at = now - timedelta(days=days_ago, hours=random.randint(1, 23), minutes=random.randint(1, 59))
            needed_by = created_at + timedelta(days=random.randint(20, 45))

            # Institution 1 is St. Mary's Haven (verified in seed.sql)
            institution_id = 1

            wish = {
                "id": wish_id_counter,
                "institution_id": institution_id,
                "category_id": cat["id"],
                "category_name": cat["name"],
                "title": f"{qty_req} {item_name}",
                "description": f"Essential request for {qty_req} units of {item_name.lower()} to support residential children at the haven.",
                "item_name": item_name,
                "qty_requested": qty_req,
                "needed_by": needed_by,
                "status": "delivered" if outcome == "delivered" else ("claimed" if outcome in ("active", "expired") else "open"),
                "created_at": created_at,
                "updated_at": created_at + timedelta(days=random.randint(1, 10))
            }
            wishes.append(wish)

            # Generate claims and deliveries based on outcome
            if outcome in ("delivered", "expired", "active", "released"):
                donor = random.choice(donors)
                claim_qty = qty_req if random.random() > 0.3 else (qty_req // 2)
                claim_created = created_at + timedelta(days=random.randint(1, 4), hours=random.randint(1, 12))
                claim_deadline = claim_created + timedelta(days=14)

                claim_status = outcome
                claim = {
                    "id": claim_id_counter,
                    "wish_id": wish["id"],
                    "donor_id": donor["id"],
                    "donor_name": donor["name"],
                    "qty": claim_qty,
                    "deadline": claim_deadline,
                    "status": claim_status,
                    "created_at": claim_created,
                    "updated_at": claim_created + timedelta(days=random.randint(2, 8))
                }
                claims.append(claim)

                if outcome == "delivered":
                    # Lead time turnaround: 18h to 96h (avg around 48h-54h)
                    turnaround_hours = random.choice([20, 28, 36, 42, 48, 54, 60, 72, 84, 92])
                    delivered_at = claim_created + timedelta(hours=turnaround_hours - 4)
                    confirmed_at = claim_created + timedelta(hours=turnaround_hours)
                    carrier = random.choice(carriers)
                    tracking_no = f"TRK-{carrier[:3].upper()}-{random.randint(10000000, 99999999)}"

                    delivery = {
                        "id": delivery_id_counter,
                        "wish_claim_id": claim["id"],
                        "tracking_number": tracking_no,
                        "carrier": carrier,
                        "photo_url": f"http://127.0.0.1:10000/devstoreaccount1/delivery-photos/proof_item_box_{delivery_id_counter}.jpg",
                        "status": "confirmed",
                        "delivered_at": delivered_at,
                        "confirmed_by": 3, # Sister Teresa Ramos (institution user)
                        "confirmed_at": confirmed_at,
                        "confirmation_notes": f"Successfully received all {claim_qty} package(s) of {item_name}. Inspected and verified by home warden.",
                        "created_at": delivered_at,
                        "updated_at": confirmed_at
                    }
                    deliveries.append(delivery)

                    # Generate thank-you note
                    thank_you = {
                        "id": thank_you_id_counter,
                        "wish_id": wish["id"],
                        "institution_id": institution_id,
                        "donor_id": donor["id"],
                        "delivery_id": delivery["id"],
                        "message": f"Dear {donor['name']}, our children received the {item_name} with immense joy! Thank you for your care and commitment.",
                        "impact_summary": f"Supplied {claim_qty} {item_name} helping 45 children with their daily needs.",
                        "photo_url": delivery["photo_url"],
                        "created_at": confirmed_at + timedelta(hours=random.randint(2, 12))
                    }
                    thank_yous.append(thank_you)
                    thank_you_id_counter += 1
                    delivery_id_counter += 1

                claim_id_counter += 1

            wish_id_counter += 1

    return wishes, claims, deliveries, thank_yous

def build_sql_script():
    wishes, claims, deliveries, thank_yous = generate_sql()

    lines = []
    lines.append("-- ==============================================================================")
    lines.append("-- WishWell Power BI Analytics Historical Dataset (6 Months)")
    lines.append("-- File: /db/seed_analytics.sql")
    lines.append(f"-- Generated: {len(wishes)} Wishes, {len(claims)} Claims, {len(deliveries)} Deliveries, {len(thank_yous)} Thank-You Notes")
    lines.append("-- Compatible with Azure SQL Database & Microsoft SQL Server 2022")
    lines.append("-- ==============================================================================")
    lines.append("")
    lines.append("SET NOCOUNT ON;")
    lines.append("GO")
    lines.append("")
    lines.append("-- ------------------------------------------------------------------------------")
    lines.append("-- STEP 1: Temporarily disable validation triggers for bulk historical seeding")
    lines.append("-- ------------------------------------------------------------------------------")
    lines.append("IF OBJECT_ID('dbo.trg_wishes_check_needed_by_future', 'TR') IS NOT NULL")
    lines.append("    DISABLE TRIGGER dbo.trg_wishes_check_needed_by_future ON dbo.wishes;")
    lines.append("IF OBJECT_ID('dbo.trg_wish_claims_enforce_active_qty_limit', 'TR') IS NOT NULL")
    lines.append("    DISABLE TRIGGER dbo.trg_wish_claims_enforce_active_qty_limit ON dbo.wish_claims;")
    lines.append("IF OBJECT_ID('dbo.trg_wishes_status_audit', 'TR') IS NOT NULL")
    lines.append("    DISABLE TRIGGER dbo.trg_wishes_status_audit ON dbo.wishes;")
    lines.append("IF OBJECT_ID('dbo.trg_wish_claims_status_audit', 'TR') IS NOT NULL")
    lines.append("    DISABLE TRIGGER dbo.trg_wish_claims_status_audit ON dbo.wish_claims;")
    lines.append("IF OBJECT_ID('dbo.trg_deliveries_status_audit', 'TR') IS NOT NULL")
    lines.append("    DISABLE TRIGGER dbo.trg_deliveries_status_audit ON dbo.deliveries;")
    lines.append("GO")
    lines.append("")

    # Batch insert wishes in chunks of 50
    lines.append("-- ------------------------------------------------------------------------------")
    lines.append("-- STEP 2: Insert 6 Months of Historical Wishes (~300 Wishes)")
    lines.append("-- ------------------------------------------------------------------------------")
    lines.append("SET IDENTITY_INSERT dbo.wishes ON;")
    lines.append("GO")
    lines.append("")

    chunk_size = 50
    for i in range(0, len(wishes), chunk_size):
        chunk = wishes[i:i + chunk_size]
        lines.append("INSERT INTO dbo.wishes (id, institution_id, category_id, title, description, item_name, qty_requested, needed_by, status, created_at, updated_at)")
        lines.append("VALUES")
        val_rows = []
        for w in chunk:
            c_iso = w["created_at"].strftime("%Y-%m-%d %H:%M:%S")
            u_iso = w["updated_at"].strftime("%Y-%m-%d %H:%M:%S")
            n_iso = w["needed_by"].strftime("%Y-%m-%d %H:%M:%S")
            title_esc = w["title"].replace("'", "''")
            desc_esc = w["description"].replace("'", "''")
            item_esc = w["item_name"].replace("'", "''")
            val_rows.append(f"  ({w['id']}, {w['institution_id']}, {w['category_id']}, '{title_esc}', '{desc_esc}', '{item_esc}', {w['qty_requested']}, '{n_iso}', '{w['status']}', '{c_iso}', '{u_iso}')")
        lines.append(",\n".join(val_rows) + ";")
        lines.append("GO")
        lines.append("")

    lines.append("SET IDENTITY_INSERT dbo.wishes OFF;")
    lines.append("GO")
    lines.append("")

    # Batch insert claims in chunks of 50
    lines.append("-- ------------------------------------------------------------------------------")
    lines.append("-- STEP 3: Insert Historical Wish Claims (~150 Claims)")
    lines.append("-- ------------------------------------------------------------------------------")
    lines.append("SET IDENTITY_INSERT dbo.wish_claims ON;")
    lines.append("GO")
    lines.append("")

    for i in range(0, len(claims), chunk_size):
        chunk = claims[i:i + chunk_size]
        lines.append("INSERT INTO dbo.wish_claims (id, wish_id, donor_id, qty, deadline, status, created_at, updated_at)")
        lines.append("VALUES")
        val_rows = []
        for c in chunk:
            c_iso = c["created_at"].strftime("%Y-%m-%d %H:%M:%S")
            u_iso = c["updated_at"].strftime("%Y-%m-%d %H:%M:%S")
            d_iso = c["deadline"].strftime("%Y-%m-%d %H:%M:%S")
            val_rows.append(f"  ({c['id']}, {c['wish_id']}, {c['donor_id']}, {c['qty']}, '{d_iso}', '{c['status']}', '{c_iso}', '{u_iso}')")
        lines.append(",\n".join(val_rows) + ";")
        lines.append("GO")
        lines.append("")

    lines.append("SET IDENTITY_INSERT dbo.wish_claims OFF;")
    lines.append("GO")
    lines.append("")

    # Batch insert deliveries in chunks of 50
    lines.append("-- ------------------------------------------------------------------------------")
    lines.append("-- STEP 4: Insert Historical Deliveries (~100 Deliveries)")
    lines.append("-- ------------------------------------------------------------------------------")
    lines.append("SET IDENTITY_INSERT dbo.deliveries ON;")
    lines.append("GO")
    lines.append("")

    for i in range(0, len(deliveries), chunk_size):
        chunk = deliveries[i:i + chunk_size]
        lines.append("INSERT INTO dbo.deliveries (id, wish_claim_id, tracking_number, carrier, photo_url, status, delivered_at, confirmed_by, confirmed_at, confirmation_notes, created_at, updated_at)")
        lines.append("VALUES")
        val_rows = []
        for d in chunk:
            c_iso = d["created_at"].strftime("%Y-%m-%d %H:%M:%S")
            u_iso = d["updated_at"].strftime("%Y-%m-%d %H:%M:%S")
            del_iso = d["delivered_at"].strftime("%Y-%m-%d %H:%M:%S")
            conf_iso = d["confirmed_at"].strftime("%Y-%m-%d %H:%M:%S")
            notes_esc = d["confirmation_notes"].replace("'", "''")
            val_rows.append(f"  ({d['id']}, {d['wish_claim_id']}, '{d['tracking_number']}', '{d['carrier']}', '{d['photo_url']}', '{d['status']}', '{del_iso}', {d['confirmed_by']}, '{conf_iso}', '{notes_esc}', '{c_iso}', '{u_iso}')")
        lines.append(",\n".join(val_rows) + ";")
        lines.append("GO")
        lines.append("")

    lines.append("SET IDENTITY_INSERT dbo.deliveries OFF;")
    lines.append("GO")
    lines.append("")

    # Batch insert thank-you notes in chunks of 50
    lines.append("-- ------------------------------------------------------------------------------")
    lines.append("-- STEP 5: Insert Historical Thank-You Notes")
    lines.append("-- ------------------------------------------------------------------------------")
    lines.append("SET IDENTITY_INSERT dbo.thank_you_notes ON;")
    lines.append("GO")
    lines.append("")

    for i in range(0, len(thank_yous), chunk_size):
        chunk = thank_yous[i:i + chunk_size]
        lines.append("INSERT INTO dbo.thank_you_notes (id, wish_id, institution_id, donor_id, delivery_id, message, impact_summary, photo_url, created_at)")
        lines.append("VALUES")
        val_rows = []
        for t in chunk:
            c_iso = t["created_at"].strftime("%Y-%m-%d %H:%M:%S")
            msg_esc = t["message"].replace("'", "''")
            imp_esc = t["impact_summary"].replace("'", "''")
            val_rows.append(f"  ({t['id']}, {t['wish_id']}, {t['institution_id']}, {t['donor_id']}, {t['delivery_id']}, '{msg_esc}', '{imp_esc}', '{t['photo_url']}', '{c_iso}')")
        lines.append(",\n".join(val_rows) + ";")
        lines.append("GO")
        lines.append("")

    lines.append("SET IDENTITY_INSERT dbo.thank_you_notes OFF;")
    lines.append("GO")
    lines.append("")

    # Re-enable triggers
    lines.append("-- ------------------------------------------------------------------------------")
    lines.append("-- STEP 6: Re-enable database validation & integrity triggers")
    lines.append("-- ------------------------------------------------------------------------------")
    lines.append("IF OBJECT_ID('dbo.trg_wishes_check_needed_by_future', 'TR') IS NOT NULL")
    lines.append("    ENABLE TRIGGER dbo.trg_wishes_check_needed_by_future ON dbo.wishes;")
    lines.append("IF OBJECT_ID('dbo.trg_wish_claims_enforce_active_qty_limit', 'TR') IS NOT NULL")
    lines.append("    ENABLE TRIGGER dbo.trg_wish_claims_enforce_active_qty_limit ON dbo.wish_claims;")
    lines.append("IF OBJECT_ID('dbo.trg_wishes_status_audit', 'TR') IS NOT NULL")
    lines.append("    ENABLE TRIGGER dbo.trg_wishes_status_audit ON dbo.wishes;")
    lines.append("IF OBJECT_ID('dbo.trg_wish_claims_status_audit', 'TR') IS NOT NULL")
    lines.append("    ENABLE TRIGGER dbo.trg_wish_claims_status_audit ON dbo.wish_claims;")
    lines.append("IF OBJECT_ID('dbo.trg_deliveries_status_audit', 'TR') IS NOT NULL")
    lines.append("    ENABLE TRIGGER dbo.trg_deliveries_status_audit ON dbo.deliveries;")
    lines.append("GO")
    lines.append("")

    # Step 7: Read-only user setup
    lines.append("-- ------------------------------------------------------------------------------")
    lines.append("-- STEP 7: Create Read-Only SQL User for Power BI Desktop & Service")
    lines.append("-- ------------------------------------------------------------------------------")
    lines.append("IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'powerbi_reader')")
    lines.append("BEGIN")
    lines.append("    CREATE USER [powerbi_reader] WITH PASSWORD = 'PowerBI_SecureReader2026!';")
    lines.append("END")
    lines.append("ELSE")
    lines.append("BEGIN")
    lines.append("    ALTER USER [powerbi_reader] WITH PASSWORD = 'PowerBI_SecureReader2026!';")
    lines.append("END;")
    lines.append("GO")
    lines.append("")
    lines.append("GRANT SELECT ON dbo.vw_wishes_by_category_month TO [powerbi_reader];")
    lines.append("GRANT SELECT ON dbo.vw_avg_delivery_time TO [powerbi_reader];")
    lines.append("GRANT SELECT ON dbo.vw_institutions_by_status TO [powerbi_reader];")
    lines.append("GRANT SELECT ON dbo.vw_stale_claim_rate TO [powerbi_reader];")
    lines.append("GRANT SELECT ON dbo.vw_top_categories TO [powerbi_reader];")
    lines.append("GRANT SELECT ON dbo.v_open_wishes TO [powerbi_reader];")
    lines.append("GRANT SELECT ON dbo.categories TO [powerbi_reader];")
    lines.append("GRANT SELECT ON dbo.institutions TO [powerbi_reader];")
    lines.append("GRANT SELECT ON dbo.wishes TO [powerbi_reader];")
    lines.append("GRANT SELECT ON dbo.wish_claims TO [powerbi_reader];")
    lines.append("GRANT SELECT ON dbo.deliveries TO [powerbi_reader];")
    lines.append("DENY INSERT, UPDATE, DELETE ON SCHEMA::dbo TO [powerbi_reader];")
    lines.append("GO")
    lines.append("")
    lines.append("PRINT '>>> Power BI Analytics 6-Month Seed Data Successfully Applied! <<<';")
    lines.append("GO")

    return "\n".join(lines)

if __name__ == "__main__":
    sql_content = build_sql_script()
    out_path = "db/seed_analytics.sql"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(sql_content)
    print(f"[SUCCESS] Generated {out_path} with 6-month historical dataset.")

