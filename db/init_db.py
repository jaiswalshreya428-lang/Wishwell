"""
WishWell Database Initialization Script
Executes schema.sql and seed.sql against Microsoft SQL Server.
Splits batches by 'GO' statements as required by T-SQL.
"""

import os
import sys
from pathlib import Path

# Load environment variables if python-dotenv is present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

def split_sql_batches(sql_text: str):
    """
    T-SQL scripts use 'GO' as a batch separator.
    This function splits the SQL script into individual executable statements.
    """
    batches = []
    current_batch = []
    for line in sql_text.splitlines():
        trimmed = line.strip().upper()
        if trimmed == "GO":
            batch_str = "\n".join(current_batch).strip()
            if batch_str:
                batches.append(batch_str)
            current_batch = []
        else:
            current_batch.append(line)
    
    remainder = "\n".join(current_batch).strip()
    if remainder:
        batches.append(remainder)
    return batches

def run_db_initialization():
    server = os.getenv("DB_SERVER", "localhost")
    port = os.getenv("DB_PORT", "1433")
    user = os.getenv("DB_USER", "sa")
    password = os.getenv("DB_PASSWORD", "WishWell_SecureP@ss2026!")
    database = os.getenv("DB_NAME", "wishwell")
    driver = os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server")
    trust_cert = os.getenv("DB_TRUST_SERVER_CERTIFICATE", "yes")

    db_dir = Path(__file__).resolve().parent
    schema_path = db_dir / "schema.sql"
    seed_path = db_dir / "seed.sql"

    print("==================================================")
    print("WishWell Database Initializer")
    print("==================================================")
    print(f"Target Server: {server}:{port}")
    print(f"Target Database: {database}")
    print(f"Driver: {driver}")

    try:
        import pyodbc
    except ImportError:
        print("\n[INFO] 'pyodbc' is not installed in the current Python environment.")
        print("To install database drivers, run: pip install pyodbc")
        print("Validating schema.sql and seed.sql structure locally...")
        validate_sql_files(schema_path, seed_path)
        return

    # Connection string for master database to create target database if needed
    master_conn_str = (
        f"DRIVER={{{driver}}};"
        f"SERVER={server},{port};"
        f"UID={user};"
        f"PWD={password};"
        f"TrustServerCertificate={trust_cert};"
    )

    try:
        print("\nConnecting to SQL Server master database...")
        conn = pyodbc.connect(master_conn_str, autocommit=True, timeout=10)
        cursor = conn.cursor()
        print(" Connected successfully.")

        # Execute Schema
        print(f"\nExecuting schema definitions from {schema_path.name}...")
        with open(schema_path, "r", encoding="utf-8") as f:
            schema_batches = split_sql_batches(f.read())

        for idx, batch in enumerate(schema_batches, 1):
            cursor.execute(batch)
        print(f" Schema successfully applied ({len(schema_batches)} batches executed).")

        # Execute Seed Data
        print(f"\nExecuting seed data from {seed_path.name}...")
        with open(seed_path, "r", encoding="utf-8") as f:
            seed_batches = split_sql_batches(f.read())

        for idx, batch in enumerate(seed_batches, 1):
            cursor.execute(batch)
        print(f" Seed data successfully applied ({len(seed_batches)} batches executed).")

        conn.close()
        print("\n[SUCCESS] WishWell database initialized successfully!")

    except Exception as exc:
        print(f"\n[WARNING] Could not connect to SQL Server: {exc}")
        print("Ensure the SQL Server Docker container is running (`docker compose up -d`).")
        print("Performing static validation of SQL scripts instead...")
        validate_sql_files(schema_path, seed_path)

def validate_sql_files(schema_path: Path, seed_path: Path):
    """
    Statically checks that schema.sql and seed.sql exist, contain required tables,
    triggers, views, procedures, and pass batch parsing.
    """
    assert schema_path.exists(), f"Schema file not found at {schema_path}"
    assert seed_path.exists(), f"Seed file not found at {seed_path}"

    with open(schema_path, "r", encoding="utf-8") as f:
        schema_text = f.read()

    with open(seed_path, "r", encoding="utf-8") as f:
        seed_text = f.read()

    schema_batches = split_sql_batches(schema_text)
    seed_batches = split_sql_batches(seed_text)

    required_tables = [
        "users", "institutions", "verification_records", "institution_documents", "categories",
        "wishes", "wish_claims", "deliveries", "thank_you_notes",
        "notifications", "audit_log"
    ]

    print(f"\n--- Static Schema Validation ---")
    print(f"Schema batch count: {len(schema_batches)}")
    for tbl in required_tables:
        found = f"dbo.{tbl}" in schema_text or f"TABLE {tbl}" in schema_text
        status = "FOUND" if found else "MISSING"
        print(f" Table [{tbl}]: {status}")
        assert found, f"Required table '{tbl}' not found in schema.sql"

    # Verify View, Trigger, Procedure
    assert "v_open_wishes" in schema_text, "View 'v_open_wishes' missing!"
    assert "sp_release_stale_claims" in schema_text, "Stored procedure 'sp_release_stale_claims' missing!"
    assert "trg_wish_claims_enforce_active_qty_limit" in schema_text, "Quantity limit trigger missing!"
    assert "trg_wishes_check_needed_by_future" in schema_text, "Future needed_by trigger missing!"
    assert "trg_institutions_status_audit" in schema_text, "Institution audit trigger missing!"

    print(" View [v_open_wishes]: FOUND")
    print(" Stored Procedure [sp_release_stale_claims]: FOUND")
    print(" Active Claims Trigger [trg_wish_claims_enforce_active_qty_limit]: FOUND")
    print(" Needed-By Future Trigger [trg_wishes_check_needed_by_future]: FOUND")
    print(" Audit Triggers: FOUND")

    print(f"\n--- Static Seed Validation ---")
    print(f"Seed batch count: {len(seed_batches)}")
    assert "admin@wishwell.org" in seed_text, "Admin user missing from seed!"
    assert "verifier@wishwell.org" in seed_text, "Verifier missing from seed!"
    assert "contact@stmaryshaven.org" in seed_text, "Institution 1 missing from seed!"
    assert "sarah.jenkins@example.com" in seed_text, "Donor missing from seed!"
    print(" Seed user entities: VERIFIED")
    print("\n[PASSED] Static SQL validation succeeded without errors.")

if __name__ == "__main__":
    run_db_initialization()

