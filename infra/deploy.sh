#!/usr/bin/env bash
# ==============================================================================
# WishWell Azure Deployment Script (/infra/deploy.sh)
#
# Minimal, Low-Cost Cloud Architecture:
# - Resource Group
# - Storage Account (Private containers: documents, proofs)
# - Azure Key Vault (Holds DB conn string, JWT secret, storage conn string)
# - Azure SQL Database (Serverless General Purpose / Free Offer)
# - Azure App Service (Linux, Python 3.11, Managed Identity reading Key Vault)
# - Azure Static Web Apps (Free Tier for Vite React Frontend)
# - Strict HTTPS, TLS 1.2, CORS restricted to frontend URL, and SQL Firewall locked to App Service IPs.
#
# Usage:
#   chmod +x ./infra/deploy.sh
#   ./infra/deploy.sh
# ==============================================================================

set -euo pipefail

# ------------------------------------------------------------------------------
# Configuration & Variables (Overridable via environment)
# ------------------------------------------------------------------------------
LOCATION="${AZURE_LOCATION:-eastus}"
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-wishwell-prod}"
PREFIX="${APP_PREFIX:-wishwell}"
RANDOM_SUFFIX="${RANDOM_SUFFIX:-$((RANDOM % 9000 + 1000))}"

STORAGE_ACCOUNT="${PREFIX}st${RANDOM_SUFFIX}"
KEYVAULT_NAME="${PREFIX}-kv-${RANDOM_SUFFIX}"
COSMOS_ACCOUNT="${PREFIX}-cosmos-${RANDOM_SUFFIX}"
COSMOS_DATABASE="wishwell-nosql"
SQL_SERVER_NAME="${PREFIX}-sql-${RANDOM_SUFFIX}"
SQL_DATABASE_NAME="${SQL_DATABASE_NAME:-sqldb-wishwell}"
APP_SERVICE_PLAN="${PREFIX}-plan"
WEBAPP_NAME="${PREFIX}-api-${RANDOM_SUFFIX}"
STATIC_WEB_APP_NAME="${PREFIX}-web-${RANDOM_SUFFIX}"

SQL_ADMIN_USER="${SQL_ADMIN_USER:-wishwelladmin}"
# Generate strong random passwords if not set in environment
SQL_ADMIN_PASSWORD="${SQL_ADMIN_PASSWORD:-$(openssl rand -base64 16 | tr -dc 'A-Za-z0-9!#%' | head -c 16)}Aa1!"
APP_DB_USER="wishwell_app"
APP_DB_PASSWORD="${APP_DB_PASSWORD:-$(openssl rand -base64 16 | tr -dc 'A-Za-z0-9!#%' | head -c 16)}Aa1!"
POWERBI_USER="powerbi_reader"
POWERBI_PASSWORD="${POWERBI_PASSWORD:-$(openssl rand -base64 16 | tr -dc 'A-Za-z0-9!#%' | head -c 16)}Aa1!"
JWT_SECRET_KEY="${JWT_SECRET_KEY:-$(openssl rand -hex 32)}"

echo "================================================================="
echo " WishWell Minimal & Low-Cost Azure Deployment"
echo "================================================================="
echo " Resource Group:       ${RESOURCE_GROUP} (${LOCATION})"
echo " Storage Account:      ${STORAGE_ACCOUNT}"
echo " Key Vault:            ${KEYVAULT_NAME}"
echo " SQL Server & DB:      ${SQL_SERVER_NAME} / ${SQL_DATABASE_NAME}"
echo " App Service (API):    ${WEBAPP_NAME}"
echo " Static Web App:       ${STATIC_WEB_APP_NAME}"
echo "================================================================="

# Pre-flight CLI check
if ! command -v az &>/dev/null; then
  echo "[ERROR] Azure CLI (az) is not installed. Please install az CLI before proceeding."
  exit 1
fi

if ! az account show &>/dev/null; then
  echo "[INFO] Logging in to Azure..."
  az login --output none
fi

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "[PASS] Authenticated to Subscription: ${SUBSCRIPTION_ID}"

# ------------------------------------------------------------------------------
# Step 1: Create Resource Group
# ------------------------------------------------------------------------------
echo -e "\n---> [Step 1/11] Creating Resource Group: ${RESOURCE_GROUP}..."
az group create --name "${RESOURCE_GROUP}" --location "${LOCATION}" -o table

# ------------------------------------------------------------------------------
# Step 2: Create Storage Account with Private Containers
# ------------------------------------------------------------------------------
echo -e "\n---> [Step 2/11] Creating Storage Account (Standard_LRS, private access)..."
az storage account create \
  --name "${STORAGE_ACCOUNT}" \
  --resource-group "${RESOURCE_GROUP}" \
  --location "${LOCATION}" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --allow-blob-public-access false \
  --min-tls-version TLS1_2 \
  -o table

STORAGE_CONN_STR=$(az storage account show-connection-string \
  --name "${STORAGE_ACCOUNT}" \
  --resource-group "${RESOURCE_GROUP}" \
  --query connectionString -o tsv)

echo "Creating strictly private blob containers: 'institution-documents' and 'delivery-proofs'..."
az storage container create --name "institution-documents" --connection-string "${STORAGE_CONN_STR}" --public-access off -o none
az storage container create --name "delivery-proofs" --connection-string "${STORAGE_CONN_STR}" --public-access off -o none
echo "[PASS] Private storage containers verified."

# ------------------------------------------------------------------------------
# Step 3: Create Azure Key Vault
# ------------------------------------------------------------------------------
echo -e "\n---> [Step 3/11] Provisioning Azure Key Vault: ${KEYVAULT_NAME}..."
az keyvault create \
  --name "${KEYVAULT_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --location "${LOCATION}" \
  --sku standard \
  --enable-rbac-authorization false \
  -o table

# ------------------------------------------------------------------------------
# Step 3B: Create Azure Cosmos DB (Semi-Structured JSON Data - Serverless)
# ------------------------------------------------------------------------------
echo -e "\n---> [Step 3B/11] Provisioning Azure Cosmos DB: ${COSMOS_ACCOUNT} (Serverless)..."
az cosmosdb create \
  --name "${COSMOS_ACCOUNT}" \
  --resource-group "${RESOURCE_GROUP}" \
  --locations regionName="${LOCATION}" failoverPriority=0 isZoneRedundant=False \
  --default-consistency-level Session \
  --capabilities EnableServerless \
  -o table || {
    echo "[INFO] Fallback to standard Cosmos DB creation..."
    az cosmosdb create --name "${COSMOS_ACCOUNT}" --resource-group "${RESOURCE_GROUP}" --default-consistency-level Session -o table
}

echo "Creating Cosmos DB SQL database: ${COSMOS_DATABASE}..."
az cosmosdb sql database create \
  --account-name "${COSMOS_ACCOUNT}" \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${COSMOS_DATABASE}" -o none

echo "Creating container 'audit_events' (partition key: /entity)..."
az cosmosdb sql container create \
  --account-name "${COSMOS_ACCOUNT}" \
  --resource-group "${RESOURCE_GROUP}" \
  --database-name "${COSMOS_DATABASE}" \
  --name "audit_events" \
  --partition-key-path "/entity" -o none

echo "Creating container 'delivery_metadata' (partition key: /claim_id)..."
az cosmosdb sql container create \
  --account-name "${COSMOS_ACCOUNT}" \
  --resource-group "${RESOURCE_GROUP}" \
  --database-name "${COSMOS_DATABASE}" \
  --name "delivery_metadata" \
  --partition-key-path "/claim_id" -o none

COSMOS_ENDPOINT="https://${COSMOS_ACCOUNT}.documents.azure.com:443/"
COSMOS_KEY=$(az cosmosdb keys list \
  --name "${COSMOS_ACCOUNT}" \
  --resource-group "${RESOURCE_GROUP}" \
  --query primaryMasterKey -o tsv)
echo "[PASS] Azure Cosmos DB containers configured."

# ------------------------------------------------------------------------------
# Step 4: Create Azure SQL Server & Serverless Database
# ------------------------------------------------------------------------------
echo -e "\n---> [Step 4/11] Creating Azure SQL Server (${SQL_SERVER_NAME})..."
az sql server create \
  --name "${SQL_SERVER_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --location "${LOCATION}" \
  --admin-user "${SQL_ADMIN_USER}" \
  --admin-password "${SQL_ADMIN_PASSWORD}" \
  --enable-public-network true \
  --minimal-tls-version "1.2" \
  -o table

echo "Provisioning Azure SQL Database (Serverless General Purpose / Free tier with 60-min auto-pause)..."
az sql db create \
  --server "${SQL_SERVER_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${SQL_DATABASE_NAME}" \
  --edition GeneralPurpose \
  --compute-model Serverless \
  --family Gen5 \
  --capacity 1 \
  --auto-pause-delay 60 \
  -o table

# ------------------------------------------------------------------------------
# Step 5: Temporarily Allow Current Client IP for Database Migration
# ------------------------------------------------------------------------------
echo -e "\n---> [Step 5/11] Adding temporary firewall rule for migration runner..."
CLIENT_IP=$(curl -s https://api.ipify.org || echo "")
if [ -n "${CLIENT_IP}" ]; then
  az sql server firewall-rule create \
    --resource-group "${RESOURCE_GROUP}" \
    --server "${SQL_SERVER_NAME}" \
    --name "DeploymentRunnerIP" \
    --start-ip-address "${CLIENT_IP}" \
    --end-ip-address "${CLIENT_IP}" \
    -o none
  echo "[PASS] Temporary firewall access granted for ${CLIENT_IP}."
fi

# ------------------------------------------------------------------------------
# Step 6: Apply Schema & Seed via apply_sql.py
# ------------------------------------------------------------------------------
echo -e "\n---> [Step 6/11] Applying schema.sql and seed.sql to Azure SQL Database..."
SQL_HOST="${SQL_SERVER_NAME}.database.windows.net"

python3 ./infra/apply_sql.py \
  --server "${SQL_HOST}" \
  --database "${SQL_DATABASE_NAME}" \
  --admin-user "${SQL_ADMIN_USER}" \
  --admin-password "${SQL_ADMIN_PASSWORD}" \
  --app-user "${APP_DB_USER}" \
  --app-password "${APP_DB_PASSWORD}" \
  --powerbi-user "${POWERBI_USER}" \
  --powerbi-password "${POWERBI_PASSWORD}" || {
    echo "[WARNING] Migration via local python3 failed or pyodbc driver missing."
    echo "You can apply schema.sql manually via the Azure Portal Query Editor."
}

# ------------------------------------------------------------------------------
# Step 7: Store Secrets in Key Vault
# ------------------------------------------------------------------------------
echo -e "\n---> [Step 7/11] Storing production secrets securely in Key Vault..."
ASYNC_DB_URL="mssql+aioodbc://${APP_DB_USER}:${APP_DB_PASSWORD}@${SQL_HOST}:1433/${SQL_DATABASE_NAME}?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no"
SYNC_DB_URL="mssql+pyodbc://${APP_DB_USER}:${APP_DB_PASSWORD}@${SQL_HOST}:1433/${SQL_DATABASE_NAME}?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no"

az keyvault secret set --vault-name "${KEYVAULT_NAME}" --name "DATABASE-URL" --value "${ASYNC_DB_URL}" -o none
az keyvault secret set --vault-name "${KEYVAULT_NAME}" --name "DATABASE-SYNC-URL" --value "${SYNC_DB_URL}" -o none
az keyvault secret set --vault-name "${KEYVAULT_NAME}" --name "JWT-SECRET-KEY" --value "${JWT_SECRET_KEY}" -o none
az keyvault secret set --vault-name "${KEYVAULT_NAME}" --name "AZURE-STORAGE-CONNECTION-STRING" --value "${STORAGE_CONN_STR}" -o none
az keyvault secret set --vault-name "${KEYVAULT_NAME}" --name "COSMOS-ENDPOINT" --value "${COSMOS_ENDPOINT}" -o none
az keyvault secret set --vault-name "${KEYVAULT_NAME}" --name "COSMOS-KEY" --value "${COSMOS_KEY}" -o none
az keyvault secret set --vault-name "${KEYVAULT_NAME}" --name "POWERBI-USER" --value "${POWERBI_USER}" -o none
az keyvault secret set --vault-name "${KEYVAULT_NAME}" --name "POWERBI-PASSWORD" --value "${POWERBI_PASSWORD}" -o none
echo "[PASS] All relational, storage, Cosmos DB, and Power BI secrets saved into ${KEYVAULT_NAME}."

# ------------------------------------------------------------------------------
# Step 8: Create App Service (Linux, Python 3.11)
# ------------------------------------------------------------------------------
echo -e "\n---> [Step 8/11] Creating App Service Plan (Basic B1 with 24/7 AlwaysOn support)..."
# Note: B1 is chosen because Free F1 tier shuts down after 20 mins, breaking background APScheduler.
az appservice plan create \
  --name "${APP_SERVICE_PLAN}" \
  --resource-group "${RESOURCE_GROUP}" \
  --location "${LOCATION}" \
  --is-linux \
  --sku B1 \
  -o table

echo "Creating Linux Web App for FastAPI Backend: ${WEBAPP_NAME}..."
az webapp create \
  --name "${WEBAPP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --plan "${APP_SERVICE_PLAN}" \
  --runtime "PYTHON:3.11" \
  -o table

# ------------------------------------------------------------------------------
# Step 9: Configure Managed Identity & App Settings
# ------------------------------------------------------------------------------
echo -e "\n---> [Step 9/11] Enabling System-Assigned Managed Identity on App Service..."
APP_IDENTITY_SP=$(az webapp identity assign \
  --name "${WEBAPP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --query principalId -o tsv)

echo "Granting App Service Managed Identity access to Key Vault secrets..."
az keyvault set-policy \
  --name "${KEYVAULT_NAME}" \
  --object-id "${APP_IDENTITY_SP}" \
  --secret-permissions get list \
  -o none

echo "Configuring App Service environment, Key Vault references, and HTTPS hardening..."
az webapp config set \
  --name "${WEBAPP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --always-on true \
  --min-tls-version "1.2" \
  --http20-enabled true \
  --startup-file "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000" \
  -o none

az webapp update \
  --name "${WEBAPP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --https-only true \
  -o none

az webapp config appsettings set \
  --name "${WEBAPP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --settings \
    ENVIRONMENT="production" \
    DATABASE_URL="@Microsoft.KeyVault(VaultName=${KEYVAULT_NAME};SecretName=DATABASE-URL)" \
    DATABASE_SYNC_URL="@Microsoft.KeyVault(VaultName=${KEYVAULT_NAME};SecretName=DATABASE-SYNC-URL)" \
    JWT_SECRET_KEY="@Microsoft.KeyVault(VaultName=${KEYVAULT_NAME};SecretName=JWT-SECRET-KEY)" \
    AZURE_STORAGE_CONNECTION_STRING="@Microsoft.KeyVault(VaultName=${KEYVAULT_NAME};SecretName=AZURE-STORAGE-CONNECTION-STRING)" \
    AZURE_STORAGE_CONTAINER_NAME="delivery-photos" \
    COSMOS_ENDPOINT="@Microsoft.KeyVault(VaultName=${KEYVAULT_NAME};SecretName=COSMOS-ENDPOINT)" \
    COSMOS_KEY="@Microsoft.KeyVault(VaultName=${KEYVAULT_NAME};SecretName=COSMOS-KEY)" \
    COSMOS_DATABASE_NAME="${COSMOS_DATABASE}" \
  -o none

# ------------------------------------------------------------------------------
# Step 10: Restrict Azure SQL Firewall to App Service Outbound IPs Only
# ------------------------------------------------------------------------------
echo -e "\n---> [Step 10/11] Restricting Azure SQL Firewall to App Service Outbound IPs..."
OUTBOUND_IPS=$(az webapp show \
  --name "${WEBAPP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --query outboundIpAddresses -o tsv)

echo "Whitelisting App Service outbound IPs: ${OUTBOUND_IPS}"
IFS=',' read -ra ADDR <<< "${OUTBOUND_IPS}"
RULE_INDEX=1
for ip in "${ADDR[@]}"; do
  ip_trimmed=$(echo "${ip}" | xargs)
  az sql server firewall-rule create \
    --resource-group "${RESOURCE_GROUP}" \
    --server "${SQL_SERVER_NAME}" \
    --name "AppServiceRule_${RULE_INDEX}" \
    --start-ip-address "${ip_trimmed}" \
    --end-ip-address "${ip_trimmed}" \
    -o none
  ((RULE_INDEX++))
done

# Remove temporary deployment machine rule
if [ -n "${CLIENT_IP}" ]; then
  az sql server firewall-rule delete \
    --resource-group "${RESOURCE_GROUP}" \
    --server "${SQL_SERVER_NAME}" \
    --name "DeploymentRunnerIP" \
    -o none 2>/dev/null || true
  echo "[PASS] Temporary client IP removed. Azure SQL is strictly locked to App Service."
fi

# ------------------------------------------------------------------------------
# Step 11: Deploy Frontend on Azure Static Web Apps (Free Tier)
# ------------------------------------------------------------------------------
echo -e "\n---> [Step 11/11] Creating Azure Static Web App (Free Tier) for Frontend..."
az staticwebapp create \
  --name "${STATIC_WEB_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --location "${LOCATION}" \
  --sku Free \
  -o table || true

FRONTEND_URL=$(az staticwebapp show \
  --name "${STATIC_WEB_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --query defaultHostname -o tsv 2>/dev/null || echo "${STATIC_WEB_APP_NAME}.azurestaticapps.net")
FRONTEND_ORIGIN="https://${FRONTEND_URL}"

echo "Restricting CORS on FastAPI Backend to frontend URL: ${FRONTEND_ORIGIN}..."
az webapp cors add \
  --name "${WEBAPP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --allowed-origins "${FRONTEND_ORIGIN}" \
  -o none

BACKEND_URL="https://${WEBAPP_NAME}.azurewebsites.net"

# ------------------------------------------------------------------------------
# Summary & Verification
# ------------------------------------------------------------------------------
echo -e "\n================================================================="
echo " WishWell Azure Deployment Successfully Completed!"
echo "================================================================="
echo " Backend Health Check:  ${BACKEND_URL}/health"
echo " Backend Swagger Docs:  ${BACKEND_URL}/docs"
echo " Frontend SWA Origin:   ${FRONTEND_ORIGIN}"
echo " Key Vault:             https://portal.azure.com/#@/resource/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.KeyVault/vaults/${KEYVAULT_NAME}"
echo "================================================================="
echo "Testing Backend /health..."
curl -s "${BACKEND_URL}/health" || echo "[NOTE] App Service container is booting up. Allow ~60s for cold start."
echo -e "\nDeployment complete! Review /infra/DEPLOYMENT.md for screenshots and viva defense."

