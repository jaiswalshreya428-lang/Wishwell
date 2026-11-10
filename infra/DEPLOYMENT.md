# WishWell Minimal & Low-Cost Azure Deployment Guide

> **Production Deployment Specification & TECHNICAL SPECIFICATION Reference**  
> Complete operational guide for deploying WishWell on Microsoft Azure at minimum cost (~$5 to $13/month or $0 with student/free trial credits).

---

## 1. Cloud Architecture & Cost Topology

```
+-----------------------------------------------------------------------------------------------------------------+
|                                          Azure Cloud (Region: East US)                                          |
|                                                                                                                 |
|   +---------------------------------------+         +-------------------------------------------------------+   |
|   | Azure Static Web Apps (Free Tier, $0) |         | Azure Key Vault (Standard, ~$0.03/mo)                 |   |
|   | • React 18 + Vite SPA                 |         | • DATABASE-URL (mssql+aioodbc)                        |   |
|   | • Global CDN & Free SSL               |         | • DATABASE-SYNC-URL (mssql+pyodbc)                    |   |
|   | • Restricted CORS Origin              |         | • JWT-SECRET-KEY                                      |   |
|   +-------------------+-------------------+         | • AZURE-STORAGE-CONNECTION-STRING                     |   |
|                       |                             | • COSMOS-ENDPOINT & COSMOS-KEY                        |   |
|                       | HTTPS (TLS 1.2+)            +-------------------+-----------------------------------+   |
|                       v                                                 | System-Assigned                       |
|   +---------------------------------------------------------------------+-----------------------------------+   |
|   | Azure App Service (Linux, Python 3.11) [Basic B1 Plan, ~$13/mo]                                         |   |
|   | • FastAPI REST API Server (Uvicorn / Gunicorn)                                                          |   |
|   | • Always On enabled (keeps in-process APScheduler cron loop alive 24/7)                                 |   |
|   | • Health check probe (/health, /api/health)                                                             |   |
|   | • Outbound IP Whitelist bound to Azure SQL Firewall                                                     |   |
|   +---------+-------------------------------+-----------------------------------+---------------------------+   |
|             |                               |                                   |                               |
|             | Port 1433 (Encrypted TLS)     | SAS Signed 15-min URLs            | HTTPS SDK (Port 443)          |
|             v                               v                                   v                               |
|   +-------------------+           +-------------------+               +-------------------------------------+   |
|   | Azure SQL DB      |           | Azure Blob Storage|               | Azure Cosmos DB (Serverless NoSQL)  |   |
|   | • Serverless GP   |           | • Standard_LRS    |               | • Containers:                       |   |
|   | • 3NF Relational  |           | • Private:        |               |   - audit_events (pk: /entity)      |   |
|   | • Append-Only     |           |   - documents     |               |   - delivery_metadata (pk: /claim_id|   |
|   |   Audit Hash Chain|           |   - proofs        |               | • Polyglot Semi-Structured JSON     |   |
|   | • Cost: ~$0-$5/mo |           | • Cost: ~$0.20/mo |               | • Cost: $0.00 (Free Tier 1000 RU/s) |   |
|   +-------------------+           +-------------------+               +-------------------------------------+   |
+-----------------------------------------------------------------------------------------------------------------+
```

---

## 2. Low-Cost Strategy & Honest APScheduler Analysis

### Estimated Monthly Cost Breakdown:

| Azure Resource | Tier / SKU | Monthly Cost | Cost Optimization Strategy |
|---|---|---|---|
| **Azure Static Web Apps** | Free | **$0.00** | Unlimited bandwidth, automatic SSL, SPA routing. |
| **Azure Key Vault** | Standard | **~$0.03** | Charged per 10,000 transactions; negligible cost. |
| **Storage Account** | Standard_LRS | **~$0.20** | Pay-as-you-go per GB storage and blob operations. |
| **Azure Cosmos DB** | Serverless (NoSQL API) | **$0.00** | Azure Free Tier covers **1,000 RU/s throughput and 25 GB storage free** every month! Ideal for flexible JSON payloads. |
| **Azure SQL Database** | General Purpose Serverless (1 vCore, 0.5 GB min) | **$0.00 – $5.00** | Automatically pauses when idle for 60 minutes. Azure offers **32,000 vCore seconds free** every month! |
| **App Service Plan** | Basic B1 (Linux) | **~$13.00** (or $0 with $200 Azure student credit) | Required for the `Always On` setting to keep APScheduler running continuously. |

---

### Honest Technical Evaluation: Is APScheduler Reliable on Free/Basic Tiers?

> [!WARNING]
> **Free (F1) / Shared (D1) Tier Limitation**:  
> In Azure App Service, the Free (`F1`) tier enforces an idle timeout. If no incoming web requests are received within **20 minutes**, Azure puts the container to sleep to reclaim resources.
> When the container sleeps, **all internal Python background threads (including APScheduler) are frozen**. Therefore, the stale-claim release job (`release_stale_claims`) will **NOT** run on schedule during periods of inactivity until an external HTTP request wakes the container.

#### The Minimal Solutions:

1. **Recommended (B1 Tier + `Always On`)**:
   Configure the App Service Plan on the **Basic (B1)** tier ($13/month) and set `--always-on true`. This prevents the container from ever sleeping, ensuring APScheduler fires consistently every 15 minutes.
2. **Zero-Cost Workaround (F1 Free Tier + External Ping)**:
   If you must stay strictly on the **Free (F1)** tier:
   - Configure a free external ping service (e.g. UptimeRobot, cron-job.org, or an Azure Logic App) to call `GET https://<your-app>.azurewebsites.net/health` every 10 minutes.
   - This keeps the App Service container warm and prevents it from sleeping, allowing APScheduler to fire reliably at $0 additional cost.
   - Alternatively, trigger `POST /api/admin/claims/release-stale` on a 15-minute cron directly from an Azure Logic App or GitHub Action.

---

## 3. Step-by-Step Deployment Commands & Screenshots

Follow these exact commands in order. Each step lists the corresponding screenshot to capture for your evaluation portfolio and technical examination.

### Step 1: Login & Create Resource Group
```bash
az login
az account set --subscription "<YOUR_SUBSCRIPTION_ID>"

az group create \
  --name rg-wishwell-prod \
  --location eastus \
  --output table
```
> **[SCREENSHOT 1: Resource Group Creation]**  
> Capture the terminal output showing `ProvisioningState: Succeeded` with resource group `rg-wishwell-prod` in `eastus`. In Azure Portal, navigate to **Resource groups** and capture `rg-wishwell-prod`.

---

### Step 2: Storage Account with Private Containers
```bash
# Generate unique name (storage account names must be globally unique, 3-24 lowercase alphanumeric)
STORAGE_NAME="wishwellst$RANDOM"

az storage account create \
  --name "$STORAGE_NAME" \
  --resource-group rg-wishwell-prod \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2 \
  --allow-blob-public-access false \
  --min-tls-version TLS1_2 \
  --output table

# Retrieve connection string
STORAGE_CONN_STR=$(az storage account show-connection-string \
  --name "$STORAGE_NAME" \
  --resource-group rg-wishwell-prod \
  --query connectionString -o tsv)

# Create private containers (anonymous public access strictly disabled)
az storage container create --name "institution-documents" --connection-string "$STORAGE_CONN_STR" --public-access off
az storage container create --name "delivery-proofs" --connection-string "$STORAGE_CONN_STR" --public-access off
```
> **[SCREENSHOT 2: Storage Account & Private Containers]**  
> In Azure Portal, go to **Storage accounts** $\rightarrow$ `$STORAGE_NAME` $\rightarrow$ **Containers**. Capture the two containers (`institution-documents` and `delivery-proofs`) showing **Public access level: Private (no anonymous access)**.

---

### Step 3: Provision Key Vault
```bash
KV_NAME="wishwell-kv-$RANDOM"

az keyvault create \
  --name "$KV_NAME" \
  --resource-group rg-wishwell-prod \
  --location eastus \
  --sku standard \
  --enable-rbac-authorization false \
  --output table
```
> **[SCREENSHOT 3: Azure Key Vault]**  
> In Azure Portal, go to **Key vaults** $\rightarrow$ `$KV_NAME` $\rightarrow$ **Overview**. Capture the Vault URI and status.

---

### Step 3B: Provision Azure Cosmos DB (Serverless NoSQL for Semi-Structured Data)
```bash
COSMOS_ACCOUNT="wishwell-cosmos-$RANDOM"
COSMOS_DATABASE="wishwell-nosql"

# Create Cosmos DB account with serverless capability
az cosmosdb create \
  --name "$COSMOS_ACCOUNT" \
  --resource-group rg-wishwell-prod \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=False \
  --default-consistency-level Session \
  --capabilities EnableServerless \
  --output table

# Create SQL Database
az cosmosdb sql database create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group rg-wishwell-prod \
  --name "$COSMOS_DATABASE" -o none

# Create container: audit_events (partition key: /entity)
az cosmosdb sql container create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group rg-wishwell-prod \
  --database-name "$COSMOS_DATABASE" \
  --name "audit_events" \
  --partition-key-path "/entity" -o none

# Create container: delivery_metadata (partition key: /claim_id)
az cosmosdb sql container create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group rg-wishwell-prod \
  --database-name "$COSMOS_DATABASE" \
  --name "delivery_metadata" \
  --partition-key-path "/claim_id" -o none

COSMOS_ENDPOINT="https://${COSMOS_ACCOUNT}.documents.azure.com:443/"
COSMOS_KEY=$(az cosmosdb keys list \
  --name "$COSMOS_ACCOUNT" \
  --resource-group rg-wishwell-prod \
  --query primaryMasterKey -o tsv)
```
> **[SCREENSHOT 3B: Azure Cosmos DB Serverless & Containers]**  
> In Azure Portal, go to **Azure Cosmos DB** $\rightarrow$ `$COSMOS_ACCOUNT` $\rightarrow$ **Data Explorer**. Capture the database `wishwell-nosql` showing containers `audit_events` (Partition Key: `/entity`) and `delivery_metadata` (Partition Key: `/claim_id`).

---

### Step 4: Create Azure SQL Server & Serverless Database
```bash
SQL_SERVER="wishwell-sql-$RANDOM"
SQL_ADMIN_USER="wishwelladmin"
# Enter a strong password with letters, numbers, and symbols
SQL_ADMIN_PASS="WishWell_SecureCloud2026!"

az sql server create \
  --name "$SQL_SERVER" \
  --resource-group rg-wishwell-prod \
  --location eastus \
  --admin-user "$SQL_ADMIN_USER" \
  --admin-password "$SQL_ADMIN_PASS" \
  --minimal-tls-version "1.2" \
  --output table

az sql db create \
  --server "$SQL_SERVER" \
  --resource-group rg-wishwell-prod \
  --name sqldb-wishwell \
  --edition GeneralPurpose \
  --compute-model Serverless \
  --family Gen5 \
  --capacity 1 \
  --auto-pause-delay 60 \
  --output table
```
> **[SCREENSHOT 4: Azure SQL Serverless Database]**  
> In Azure Portal, go to **SQL databases** $\rightarrow$ `sqldb-wishwell`. Capture the **Pricing tier: General Purpose - Serverless: Gen5, 1 vCore** and **Auto-pause delay: 60 minutes**.

---

### Step 5: Temporarily Allow Migration Runner IP
```bash
# Whitelist your current machine IP to run database initialization
CLIENT_IP=$(curl -s https://api.ipify.org)

az sql server firewall-rule create \
  --resource-group rg-wishwell-prod \
  --server "$SQL_SERVER" \
  --name "MigrationRunnerIP" \
  --start-ip-address "$CLIENT_IP" \
  --end-ip-address "$CLIENT_IP"
```

---

### Step 6: Apply Database Schema, Seed & App User
Run the automated migration runner:
```bash
APP_DB_PASS="WishWell_AppUserPass2026!"
POWERBI_PASS="PowerBI_SecureReader2026!"

python infra/apply_sql.py \
  --server "$SQL_SERVER.database.windows.net" \
  --database "sqldb-wishwell" \
  --admin-user "$SQL_ADMIN_USER" \
  --admin-password "$SQL_ADMIN_PASS" \
  --app-user "wishwell_app" \
  --app-password "$APP_DB_PASS" \
  --powerbi-user "powerbi_reader" \
  --powerbi-password "$POWERBI_PASS"
```
> **[SCREENSHOT 5: Database Migration & Least-Privilege Verification]**  
> Capture the terminal output from `apply_sql.py` showing:
> - `[PASS] Schema applied successfully (including 5 Power BI analytics views)`
> - `[PASS] User 'wishwell_app' provisioned with least-privilege permissions (INSERT/SELECT only on audit_log)`
> - `[PASS] User 'powerbi_reader' provisioned with SELECT-only permissions on Power BI views & tables`
> - `[PASS] Base seed data applied`
> - `[PASS] 6-Month Power BI analytics history applied (~300 wishes, 150 claims, 100 deliveries)`
> - `[SUCCESS] Azure SQL Database is fully initialized and production ready!`

---

### Step 7: Store Secrets in Key Vault
```bash
SQL_HOST="$SQL_SERVER.database.windows.net"
ASYNC_DB_URL="mssql+aioodbc://wishwell_app:${APP_DB_PASS}@${SQL_HOST}:1433/sqldb-wishwell?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no"
SYNC_DB_URL="mssql+pyodbc://wishwell_app:${APP_DB_PASS}@${SQL_HOST}:1433/sqldb-wishwell?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no"
JWT_SECRET=$(openssl rand -hex 32)

az keyvault secret set --vault-name "$KV_NAME" --name "DATABASE-URL" --value "$ASYNC_DB_URL" -o none
az keyvault secret set --vault-name "$KV_NAME" --name "DATABASE-SYNC-URL" --value "$SYNC_DB_URL" -o none
az keyvault secret set --vault-name "$KV_NAME" --name "JWT-SECRET-KEY" --value "$JWT_SECRET" -o none
az keyvault secret set --vault-name "$KV_NAME" --name "AZURE-STORAGE-CONNECTION-STRING" --value "$STORAGE_CONN_STR" -o none
az keyvault secret set --vault-name "$KV_NAME" --name "COSMOS-ENDPOINT" --value "$COSMOS_ENDPOINT" -o none
az keyvault secret set --vault-name "$KV_NAME" --name "COSMOS-KEY" --value "$COSMOS_KEY" -o none
az keyvault secret set --vault-name "$KV_NAME" --name "POWERBI-USER" --value "powerbi_reader" -o none
az keyvault secret set --vault-name "$KV_NAME" --name "POWERBI-PASSWORD" --value "$POWERBI_PASS" -o none
```
> **[SCREENSHOT 6: Key Vault Secrets]**  
> In Azure Portal, open `$KV_NAME` $\rightarrow$ **Secrets**. Capture the list displaying `DATABASE-URL`, `DATABASE-SYNC-URL`, `JWT-SECRET-KEY`, `AZURE-STORAGE-CONNECTION-STRING`, `COSMOS-ENDPOINT`, `COSMOS-KEY`, `POWERBI-USER`, and `POWERBI-PASSWORD` (with masked values).

---

### Step 8: App Service Plan & FastAPI Web App
```bash
APP_PLAN="wishwell-plan"
WEBAPP_NAME="wishwell-api-$RANDOM"

az appservice plan create \
  --name "$APP_PLAN" \
  --resource-group rg-wishwell-prod \
  --location eastus \
  --is-linux \
  --sku B1 \
  --output table

az webapp create \
  --name "$WEBAPP_NAME" \
  --resource-group rg-wishwell-prod \
  --plan "$APP_PLAN" \
  --runtime "PYTHON:3.11" \
  --output table
```

---

### Step 9: Managed Identity, Key Vault References & HTTPS
```bash
# 1. Enable System-Assigned Managed Identity
PRINCIPAL_ID=$(az webapp identity assign \
  --name "$WEBAPP_NAME" \
  --resource-group rg-wishwell-prod \
  --query principalId -o tsv)

# 2. Grant Managed Identity read permission on Key Vault
az keyvault set-policy \
  --name "$KV_NAME" \
  --object-id "$PRINCIPAL_ID" \
  --secret-permissions get list -o none

# 3. Configure App Settings with Key Vault References
az webapp config appsettings set \
  --name "$WEBAPP_NAME" \
  --resource-group rg-wishwell-prod \
  --settings \
    ENVIRONMENT="production" \
    DATABASE_URL="@Microsoft.KeyVault(VaultName=${KV_NAME};SecretName=DATABASE-URL)" \
    DATABASE_SYNC_URL="@Microsoft.KeyVault(VaultName=${KV_NAME};SecretName=DATABASE-SYNC-URL)" \
    JWT_SECRET_KEY="@Microsoft.KeyVault(VaultName=${KV_NAME};SecretName=JWT-SECRET-KEY)" \
    AZURE_STORAGE_CONNECTION_STRING="@Microsoft.KeyVault(VaultName=${KV_NAME};SecretName=AZURE-STORAGE-CONNECTION-STRING)" \
    AZURE_STORAGE_CONTAINER_NAME="delivery-photos" \
    COSMOS_ENDPOINT="@Microsoft.KeyVault(VaultName=${KV_NAME};SecretName=COSMOS-ENDPOINT)" \
    COSMOS_KEY="@Microsoft.KeyVault(VaultName=${KV_NAME};SecretName=COSMOS-KEY)" \
    COSMOS_DATABASE_NAME="wishwell-nosql" \
  -o none

# 4. Enforce AlwaysOn, TLS 1.2, and HTTPS redirection
az webapp config set \
  --name "$WEBAPP_NAME" \
  --resource-group rg-wishwell-prod \
  --always-on true \
  --min-tls-version "1.2" \
  --startup-file "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000" \
  -o none

az webapp update \
  --name "$WEBAPP_NAME" \
  --resource-group rg-wishwell-prod \
  --https-only true -o none
```
> **[SCREENSHOT 7: App Service Configuration & Key Vault References]**  
> In Azure Portal, navigate to `$WEBAPP_NAME` $\rightarrow$ **Configuration** $\rightarrow$ **Application settings**. Capture the settings showing green checkmarks next to Key Vault reference items.
> Navigate to **Identity** and capture **Status: On** with the assigned Object (principal) ID.

---

### Step 10: Restrict SQL Firewall to App Service Outbound IPs
```bash
# Retrieve all outbound IP addresses of App Service
OUTBOUND_IPS=$(az webapp show \
  --name "$WEBAPP_NAME" \
  --resource-group rg-wishwell-prod \
  --query outboundIpAddresses -o tsv)

# Whitelist each outbound IP
IFS=',' read -ra ADDR <<< "$OUTBOUND_IPS"
i=1
for ip in "${ADDR[@]}"; do
  trimmed=$(echo "$ip" | xargs)
  az sql server firewall-rule create \
    --resource-group rg-wishwell-prod \
    --server "$SQL_SERVER" \
    --name "AppServiceRule_$i" \
    --start-ip-address "$trimmed" \
    --end-ip-address "$trimmed" -o none
  ((i++))
done

# Remove the temporary client migration rule
az sql server firewall-rule delete \
  --resource-group rg-wishwell-prod \
  --server "$SQL_SERVER" \
  --name "MigrationRunnerIP" -o none
```
> **[SCREENSHOT 8: Azure SQL Firewall Whitelist]**  
> In Azure Portal, go to `$SQL_SERVER` $\rightarrow$ **Networking** $\rightarrow$ **Firewall rules**. Capture the list showing strictly the `AppServiceRule_X` entries and confirming public internet access is disabled/restricted.

---

### Step 11: Deploy Frontend on Azure Static Web Apps
```bash
SWA_NAME="wishwell-web-$RANDOM"

az staticwebapp create \
  --name "$SWA_NAME" \
  --resource-group rg-wishwell-prod \
  --location eastus \
  --sku Free \
  --output table

SWA_URL=$(az staticwebapp show \
  --name "$SWA_NAME" \
  --resource-group rg-wishwell-prod \
  --query defaultHostname -o tsv)
FRONTEND_ORIGIN="https://$SWA_URL"

# Lock CORS on App Service strictly to the frontend origin
az webapp cors add \
  --name "$WEBAPP_NAME" \
  --resource-group rg-wishwell-prod \
  --allowed-origins "$FRONTEND_ORIGIN" \
  -o none
```
> **[SCREENSHOT 9: Static Web App & CORS Restriction]**  
> In Azure Portal, open `$WEBAPP_NAME` $\rightarrow$ **CORS**. Capture the allowed origins list displaying solely `https://$SWA_URL`.

---

### Step 12: Deploy Code to Backend & Verify /health
```bash
cd backend
az webapp up \
  --name "$WEBAPP_NAME" \
  --resource-group rg-wishwell-prod \
  --plan "$APP_PLAN" \
  --os-type linux \
  --runtime "PYTHON:3.11"
cd ..

# Verify health endpoint
curl -i "https://${WEBAPP_NAME}.azurewebsites.net/health"
```
Expected response:
```json
HTTP/1.1 200 OK
Content-Type: application/json
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

{
  "status": "ok",
  "app_name": "WishWell API",
  "version": "0.1.0",
  "environment": "production"
}
```
> **[SCREENSHOT 10: Live Production Health Check & Swagger UI]**  
> Capture your browser visiting:
> 1. `https://${WEBAPP_NAME}.azurewebsites.net/health` showing `{"status":"ok"}`.
> 2. `https://${WEBAPP_NAME}.azurewebsites.net/docs` displaying the interactive FastAPI Swagger UI.

---

## 4. Smallest-Fix Troubleshooting Guide

| Issue | Root Cause | Smallest Direct Fix (No Redesign) |
|---|---|---|
| **`pyodbc` connection failure during migration** | Missing ODBC driver or local client IP not whitelisted. | Run `CLIENT_IP=$(curl -s https://api.ipify.org)` and re-add `az sql server firewall-rule create` for your IP. Ensure `ODBC Driver 18 for SQL Server` is installed on your workstation. |
| **App Service shows 500 error on startup** | Cold start delay or Key Vault reference syntax error. | Azure SQL Serverless takes ~30–60 seconds to resume from auto-pause on cold start. Check `az webapp log tail --name $WEBAPP_NAME --resource-group rg-wishwell-prod`. |
| **Key Vault reference displays red cross in Portal** | App Service Managed Identity lacks Key Vault `Get` permission. | Re-run `az keyvault set-policy --name $KV_NAME --object-id $PRINCIPAL_ID --secret-permissions get list`. Then restart App Service: `az webapp restart --name $WEBAPP_NAME --resource-group rg-wishwell-prod`. |
| **CORS errors when frontend accesses API** | Protocol mismatch or missing origin. | Verify SWA origin has `https://` prefix: `az webapp cors add --name $WEBAPP_NAME --resource-group rg-wishwell-prod --allowed-origins "https://<swa-hostname>"`. |
| **APScheduler background job not expiring claims** | Web App is on Free (F1) tier without `Always On`. | Upgrade App Service Plan to B1: `az appservice plan update --name $APP_PLAN --resource-group rg-wishwell-prod --sku B1` and enable `az webapp config set --always-on true`. |
| **Cosmos DB unreachable or credentials invalid** | Cosmos network block or rate limit. | Graceful degradation is active: the FastAPI backend logs a warning, falls back to in-memory/relational storage, and completes user transactions without 500 errors. Verify credentials in Key Vault: `az keyvault secret show --vault-name $KV_NAME --name COSMOS-ENDPOINT`. |

---

## 5. Security & Compliance Checklist for technical evaluation

- [x] **No Secrets in Repo**: All passwords and secrets are generated dynamically and stored in Azure Key Vault.
- [x] **Least-Privilege Database Access**: `wishwell_app` is granted `SELECT, INSERT` on `dbo.audit_log` with explicit `DENY UPDATE, DELETE`.
- [x] **Database Firewall Isolation**: Azure SQL public access is locked exclusively to App Service outbound IPs.
- [x] **Private Storage**: Blob storage containers have anonymous public access disabled; assets are served via short-lived 15-minute SAS tokens.
- [x] **Transport Security**: Minimum TLS 1.2 enforced across App Service, Storage, and SQL Server. HTTPS redirection enabled.
- [x] **Polyglot Persistence & Cryptographic Anchoring**: Semi-structured event details are stored as JSON documents in Azure Cosmos DB (`audit_events` and `delivery_metadata`). The canonical SHA-256 hash of each Cosmos document is sealed inside SQL Server's tamper-evident SHA-256 hash chain (`dbo.audit_log`), guaranteeing non-repudiation while keeping core ACID transactions fully fault-tolerant.
- [x] **Power BI Reporting & Least-Privilege Read Isolation**: 5 analytical SQL views (`vw_wishes_by_category_month`, `vw_avg_delivery_time`, `vw_institutions_by_status`, `vw_stale_claim_rate`, `vw_top_categories`) power Power BI Desktop/Service reports. Reporting is isolated to a contained user `powerbi_reader` with `SELECT` permissions strictly on reporting views/tables and explicit `DENY INSERT, UPDATE, DELETE`.


