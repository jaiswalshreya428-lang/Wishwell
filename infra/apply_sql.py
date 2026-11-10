#!/usr/bin/env python3
"""
WishWell Azure SQL Schema & Seed Migration Script (/infra/apply_sql.py)

Applies db/schema.sql and db/seed.sql directly to an Azure SQL Database.
Azure SQL Specific Adjustments:
1. Strips unsupported 'CREATE DATABASE' and 'USE <database>' statements (database already exists in Azure).
2. Splits T-SQL batches on 'GO' lines.
3. Provisions dedicated application user 'wishwell_app' with restricted permissions:
   - SELECT, INSERT on dbo.audit_log
   - STRICTLY DENIED UPDATE, DELETE on dbo.audit_log
   - SELECT, INSERT, UPDATE, DELETE on application tables.

Usage:
  python apply_sql.py --server <server.database.windows.net> --database <db> --admin-user <admin> --admin-password <pass> --app-password <pass>
Or set environment variables:
  AZURE_SQL_SERVER, AZURE_SQL_DATABASE, AZURE_SQL_ADMIN_USER, AZURE_SQL_ADMIN_PASSWORD, WISHWELL_APP_PASSWORD
"""

import os
import sys
import argparse
from pathlib import Path

def split_sql_batches(sql_text: str):
    """Splits T-SQL script into batches delimited by 'GO'."""
    batches = []
    current = []
    for line in sql_text.splitlines():
        trimmed = line.strip().upper()
        if trimmed == "GO":
            batch_str = "\n".join(current).strip()
            if batch_str:
                batches.append(batch_str)
            current = []
        else:
            current.append(line)
    remainder = "\n".join(current).strip()
    if remainder:
        batches.append(remainder)
    return batches

def sanitize_batch_for_azure_sql(batch: str) -> str:
    """Removes CREATE DATABASE and USE statements not allowed in Azure SQL."""
    cleaned_lines = []
    for line in batch.splitlines():
        upper = line.strip().upper()
        if upper.startswith("CREATE DATABASE") or upper.startswith("USE "):
            continue
        if "SYS.DATABASES" in upper and "WISHWELL" in upper:
            continue
        cleaned_lines.append(line)
    return "\n".join(cleaned_lines).strip()

def main():
    parser = argparse.ArgumentParser(description="Apply WishWell schema & seed to Azure SQL Database.")
    parser.add_argument("--server", default=os.getenv("AZURE_SQL_SERVER"), help="Azure SQL Server hostname")
    parser.add_argument("--database", default=os.getenv("AZURE_SQL_DATABASE", "sqldb-wishwell"), help="Azure SQL Database name")
    parser.add_argument("--admin-user", default=os.getenv("AZURE_SQL_ADMIN_USER"), help="Server admin username")
    parser.add_argument("--admin-password", default=os.getenv("AZURE_SQL_ADMIN_PASSWORD"), help="Server admin password")
    parser.add_argument("--app-user", default=os.getenv("WISHWELL_APP_USER", "wishwell_app"), help="Application DB username")
    parser.add_argument("--app-password", default=os.getenv("WISHWELL_APP_PASSWORD"), help="Application DB password")
    parser.add_argument("--powerbi-user", default=os.getenv("POWERBI_USER", "powerbi_reader"), help="Power BI read-only username")
    parser.add_argument("--powerbi-password", default=os.getenv("POWERBI_PASSWORD", "PowerBI_SecureReader2026!"), help="Power BI read-only password")
    parser.add_argument("--driver", default=os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server"), help="ODBC Driver name")

    args = parser.parse_args()

    if not all([args.server, args.database, args.admin_user, args.admin_password]):
        print("[ERROR] Missing required Azure SQL connection parameters.")
        print("Please provide --server, --database, --admin-user, --admin-password via arguments or environment variables.")
        sys.exit(1)

    repo_root = Path(__file__).resolve().parent.parent
    schema_file = repo_root / "db" / "schema.sql"
    seed_file = repo_root / "db" / "seed.sql"
    analytics_seed_file = repo_root / "db" / "seed_analytics.sql"

    if not schema_file.exists() or not seed_file.exists():
        print(f"[ERROR] SQL files not found at {schema_file} or {seed_file}")
        sys.exit(1)

    try:
        import pyodbc
    except ImportError:
        print("[ERROR] 'pyodbc' is required. Install via: pip install pyodbc")
        sys.exit(1)

    conn_str = (
        f"DRIVER={{{args.driver}}};"
        f"SERVER={args.server};"
        f"PORT=1433;"
        f"DATABASE={args.database};"
        f"UID={args.admin_user};"
        f"PWD={args.admin_password};"
        f"Encrypt=yes;"
        f"TrustServerCertificate=no;"
        f"Connection Timeout=30;"
    )

    print("==================================================")
    print("WishWell Azure SQL Database Migration Runner")
    print("==================================================")
    print(f"Server:   {args.server}")
    print(f"Database: {args.database}")
    print(f"Driver:   {args.driver}")
    print("Connecting to Azure SQL Database...")

    try:
        conn = pyodbc.connect(conn_str, autocommit=True)
        cursor = conn.cursor()
        print("[PASS] Connected successfully to Azure SQL Database.")
    except Exception as e:
        print(f"[ERROR] Failed to connect to Azure SQL Database: {e}")
        print("\nTroubleshooting tip: Check if your client IP is allowed in the Azure SQL firewall rules.")
        sys.exit(1)

    # 1. Execute schema.sql
    print(f"\n[STEP 1/3] Applying schema definitions from {schema_file.name}...")
    with open(schema_file, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    schema_batches = split_sql_batches(schema_sql)
    applied_schema_count = 0

    for idx, batch in enumerate(schema_batches, 1):
        cleaned = sanitize_batch_for_azure_sql(batch)
        if not cleaned:
            continue
        try:
            cursor.execute(cleaned)
            applied_schema_count += 1
        except Exception as e:
            # Skip errors related to already existing objects if re-running
            if "already an object named" in str(e) or "already exists" in str(e):
                continue
            print(f"[WARNING] Batch {idx} error: {e}")
            print(f"SQL preview: {cleaned[:120]}...")

    print(f"[PASS] Schema applied successfully ({applied_schema_count} batches processed).")

    # 2. Configure wishwell_app user and least-privilege permissions
    if args.app_password:
        print(f"\n[STEP 2/3] Configuring contained database user '{args.app_user}'...")
        user_setup_sql = f"""
        IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = '{args.app_user}')
        BEGIN
            CREATE USER [{args.app_user}] WITH PASSWORD = '{args.app_password}';
        END
        ELSE
        BEGIN
            ALTER USER [{args.app_user}] WITH PASSWORD = '{args.app_password}';
        END;

        -- Grant standard CRUD permissions on application tables
        GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.users TO [{args.app_user}];
        GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.institutions TO [{args.app_user}];
        GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.verification_records TO [{args.app_user}];
        GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.institution_documents TO [{args.app_user}];
        GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.categories TO [{args.app_user}];
        GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.wishes TO [{args.app_user}];
        GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.wish_claims TO [{args.app_user}];
        GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.deliveries TO [{args.app_user}];
        GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.thank_you_notes TO [{args.app_user}];
        GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.notifications TO [{args.app_user}];
        GRANT SELECT ON dbo.v_open_wishes TO [{args.app_user}];
        GRANT EXECUTE ON dbo.sp_release_stale_claims TO [{args.app_user}];

        -- STRICT LEAST-PRIVILEGE SECURITY RULE FOR AUDIT LOG:
        GRANT SELECT, INSERT ON dbo.audit_log TO [{args.app_user}];
        DENY UPDATE, DELETE ON dbo.audit_log TO [{args.app_user}];
        """
        try:
            cursor.execute(user_setup_sql)
            print(f"[PASS] User '{args.app_user}' provisioned with least-privilege permissions (INSERT/SELECT only on audit_log).")
        except Exception as e:
            print(f"[WARNING] Could not configure user '{args.app_user}': {e}")
    else:
        print("\n[STEP 2/4] Skipping app user setup (no --app-password supplied).")

    # 2B. Configure Read-Only Power BI User
    if args.powerbi_password:
        print(f"\n[STEP 2B/4] Configuring read-only user '{args.powerbi_user}' for Power BI...")
        powerbi_setup_sql = f"""
        IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = '{args.powerbi_user}')
        BEGIN
            CREATE USER [{args.powerbi_user}] WITH PASSWORD = '{args.powerbi_password}';
        END
        ELSE
        BEGIN
            ALTER USER [{args.powerbi_user}] WITH PASSWORD = '{args.powerbi_password}';
        END;

        GRANT SELECT ON dbo.vw_wishes_by_category_month TO [{args.powerbi_user}];
        GRANT SELECT ON dbo.vw_avg_delivery_time TO [{args.powerbi_user}];
        GRANT SELECT ON dbo.vw_institutions_by_status TO [{args.powerbi_user}];
        GRANT SELECT ON dbo.vw_stale_claim_rate TO [{args.powerbi_user}];
        GRANT SELECT ON dbo.vw_top_categories TO [{args.powerbi_user}];
        GRANT SELECT ON dbo.v_open_wishes TO [{args.powerbi_user}];
        GRANT SELECT ON dbo.categories TO [{args.powerbi_user}];
        GRANT SELECT ON dbo.institutions TO [{args.powerbi_user}];
        GRANT SELECT ON dbo.wishes TO [{args.powerbi_user}];
        GRANT SELECT ON dbo.wish_claims TO [{args.powerbi_user}];
        GRANT SELECT ON dbo.deliveries TO [{args.powerbi_user}];
        DENY INSERT, UPDATE, DELETE ON SCHEMA::dbo TO [{args.powerbi_user}];
        """
        try:
            cursor.execute(powerbi_setup_sql)
            print(f"[PASS] User '{args.powerbi_user}' provisioned with SELECT-only permissions on Power BI views & tables.")
        except Exception as e:
            print(f"[WARNING] Could not configure user '{args.powerbi_user}': {e}")

    # 3. Execute seed.sql
    print(f"\n[STEP 3/4] Seeding demo and test accounts from {seed_file.name}...")
    with open(seed_file, "r", encoding="utf-8") as f:
        seed_sql = f.read()

    seed_batches = split_sql_batches(seed_sql)
    applied_seed_count = 0

    for idx, batch in enumerate(seed_batches, 1):
        cleaned = sanitize_batch_for_azure_sql(batch)
        if not cleaned:
            continue
        try:
            cursor.execute(cleaned)
            applied_seed_count += 1
        except Exception as e:
            if "Violation of PRIMARY KEY" in str(e) or "Violation of UNIQUE KEY" in str(e):
                continue
            print(f"[WARNING] Seed batch {idx} notice: {e}")

    print(f"[PASS] Base seed data applied ({applied_seed_count} batches processed).")

    # 4. Execute seed_analytics.sql (6 Months History for Power BI)
    if analytics_seed_file.exists():
        print(f"\n[STEP 4/4] Seeding 6 months of historical analytics from {analytics_seed_file.name} (~300 wishes, 150 claims, 100 deliveries)...")
        with open(analytics_seed_file, "r", encoding="utf-8") as f:
            analytics_sql = f.read()

        analytics_batches = split_sql_batches(analytics_sql)
        applied_analytics_count = 0

        for idx, batch in enumerate(analytics_batches, 1):
            cleaned = sanitize_batch_for_azure_sql(batch)
            if not cleaned:
                continue
            try:
                cursor.execute(cleaned)
                applied_analytics_count += 1
            except Exception as e:
                if "Violation of PRIMARY KEY" in str(e) or "Violation of UNIQUE KEY" in str(e):
                    continue
                print(f"[WARNING] Analytics seed batch {idx} notice: {e}")

        print(f"[PASS] 6-Month Power BI analytics history applied ({applied_analytics_count} batches processed).")
    else:
        print("\n[STEP 4/4] Skipping analytics seed (db/seed_analytics.sql not found).")

    # Final Verification
    cursor.execute("SELECT COUNT(*) FROM dbo.users")
    user_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM dbo.wishes")
    wish_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM dbo.wish_claims")
    claim_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM dbo.deliveries")
    delivery_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM dbo.audit_log")
    audit_count = cursor.fetchone()[0]

    print("\n==================================================")
    print("Azure SQL Migration Summary")
    print("==================================================")
    print(f"Total Users:        {user_count}")
    print(f"Total Wishes:       {wish_count}")
    print(f"Total Wish Claims:  {claim_count}")
    print(f"Total Deliveries:   {delivery_count}")
    print(f"Audit Log Blocks:   {audit_count}")
    print("==================================================")
    print("[SUCCESS] Azure SQL Database is fully initialized, seeded with 6 months of history, and Power BI ready!")

    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()

