# ==============================================================================
# WishWell Azure Deployment Script (PowerShell / Windows)
# Location: /infra/deploy.ps1
# ==============================================================================

[CmdletBinding()]
param(
    [string]$Location = "eastus",
    [string]$ResourceGroup = "rg-wishwell-prod",
    [string]$Prefix = "wishwell"
)

$ErrorActionPreference = "Stop"

$RandomSuffix = (Get-Random -Minimum 1000 -Maximum 9999).ToString()
$StorageAccount = "$($Prefix)st$RandomSuffix"
$KeyVaultName = "$($Prefix)-kv-$RandomSuffix"
$CosmosAccount = "$($Prefix)-cosmos-$RandomSuffix"
$CosmosDatabase = "wishwell-nosql"
$SqlServerName = "$($Prefix)-sql-$RandomSuffix"
$SqlDatabaseName = "sqldb-wishwell"
$AppServicePlan = "$($Prefix)-plan"
$WebAppName = "$($Prefix)-api-$RandomSuffix"
$StaticWebAppName = "$($Prefix)-web-$RandomSuffix"

$SqlAdminUser = "wishwelladmin"
$SqlAdminPassword = (-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 14 | ForEach-Object {[char]$_})) + "Aa1!"
$AppDbUser = "wishwell_app"
$AppDbPassword = (-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 14 | ForEach-Object {[char]$_})) + "Aa1!"
$PowerBiUser = "powerbi_reader"
$PowerBiPassword = (-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 14 | ForEach-Object {[char]$_})) + "Aa1!"
$JwtSecretKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " WishWell Minimal & Low-Cost Azure Deployment (PowerShell)" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Resource Group:     $ResourceGroup ($Location)"
Write-Host " Storage Account:    $StorageAccount"
Write-Host " Key Vault:          $KeyVaultName"
Write-Host " SQL Server & DB:    $SqlServerName / $SqlDatabaseName"
Write-Host " Backend Web App:    $WebAppName"
Write-Host " Frontend SWA:       $StaticWebAppName"
Write-Host "================================================================="

# Step 1: Resource Group
Write-Host "`n---> [Step 1/11] Creating Resource Group: $ResourceGroup..." -ForegroundColor Yellow
az group create --name $ResourceGroup --location $Location -o table

# Step 2: Storage Account
Write-Host "`n---> [Step 2/11] Creating Storage Account (Standard_LRS)..." -ForegroundColor Yellow
az storage account create `
  --name $StorageAccount `
  --resource-group $ResourceGroup `
  --location $Location `
  --sku Standard_LRS `
  --kind StorageV2 `
  --allow-blob-public-access false `
  --min-tls-version TLS1_2 `
  -o table

$StorageConnStr = (az storage account show-connection-string --name $StorageAccount --resource-group $ResourceGroup --query connectionString -o tsv)
az storage container create --name "institution-documents" --connection-string $StorageConnStr --public-access off -o none
az storage container create --name "delivery-proofs" --connection-string $StorageConnStr --public-access off -o none
Write-Host "[PASS] Private blob containers configured." -ForegroundColor Green

# Step 3: Key Vault
Write-Host "`n---> [Step 3/11] Provisioning Azure Key Vault..." -ForegroundColor Yellow
az keyvault create --name $KeyVaultName --resource-group $ResourceGroup --location $Location --sku standard --enable-rbac-authorization false -o table

# Step 3B: Azure Cosmos DB (Semi-Structured Data & Polyglot Persistence)
Write-Host "`n---> [Step 3B/11] Provisioning Azure Cosmos DB: $CosmosAccount (Serverless)..." -ForegroundColor Yellow
az cosmosdb create --name $CosmosAccount --resource-group $ResourceGroup --default-consistency-level Session --capabilities EnableServerless -o table 2>$null
if ($LASTEXITCODE -ne 0) {
    az cosmosdb create --name $CosmosAccount --resource-group $ResourceGroup --default-consistency-level Session -o table
}
az cosmosdb sql database create --account-name $CosmosAccount --resource-group $ResourceGroup --name $CosmosDatabase -o none
az cosmosdb sql container create --account-name $CosmosAccount --resource-group $ResourceGroup --database-name $CosmosDatabase --name "audit_events" --partition-key-path "/entity" -o none
az cosmosdb sql container create --account-name $CosmosAccount --resource-group $ResourceGroup --database-name $CosmosDatabase --name "delivery_metadata" --partition-key-path "/claim_id" -o none

$CosmosEndpoint = "https://$CosmosAccount.documents.azure.com:443/"
$CosmosKey = (az cosmosdb keys list --name $CosmosAccount --resource-group $ResourceGroup --query primaryMasterKey -o tsv)
Write-Host "[PASS] Cosmos DB containers configured." -ForegroundColor Green

# Step 4: Azure SQL Server & Database
Write-Host "`n---> [Step 4/11] Creating Azure SQL Server & Serverless Database..." -ForegroundColor Yellow
az sql server create `
  --name $SqlServerName `
  --resource-group $ResourceGroup `
  --location $Location `
  --admin-user $SqlAdminUser `
  --admin-password $SqlAdminPassword `
  --enable-public-network true `
  --minimal-tls-version "1.2" `
  -o table

az sql db create `
  --server $SqlServerName `
  --resource-group $ResourceGroup `
  --name $SqlDatabaseName `
  --edition GeneralPurpose `
  --compute-model Serverless `
  --family Gen5 `
  --capacity 1 `
  --auto-pause-delay 60 `
  -o table

# Step 5: Temporary Firewall Rule for Migration
Write-Host "`n---> [Step 5/11] Adding temporary firewall rule for migration..." -ForegroundColor Yellow
$ClientIp = (Invoke-RestMethod -Uri "https://api.ipify.org")
if ($ClientIp) {
    az sql server firewall-rule create `
      --resource-group $ResourceGroup `
      --server $SqlServerName `
      --name "DeploymentRunnerIP" `
      --start-ip-address $ClientIp `
      --end-ip-address $ClientIp `
      -o none
}

# Step 6: Apply Schema & Seed
Write-Host "`n---> [Step 6/11] Applying schema.sql and seed.sql via apply_sql.py..." -ForegroundColor Yellow
$SqlHost = "$SqlServerName.database.windows.net"
python infra/apply_sql.py `
  --server $SqlHost `
  --database $SqlDatabaseName `
  --admin-user $SqlAdminUser `
  --admin-password $SqlAdminPassword `
  --app-user $AppDbUser `
  --app-password $AppDbPassword `
  --powerbi-user $PowerBiUser `
  --powerbi-password $PowerBiPassword

# Step 7: Secrets into Key Vault
Write-Host "`n---> [Step 7/11] Storing connection strings and secrets in Key Vault..." -ForegroundColor Yellow
$AsyncDbUrl = "mssql+aioodbc://${AppDbUser}:${AppDbPassword}@${SqlHost}:1433/${SqlDatabaseName}?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no"
$SyncDbUrl = "mssql+pyodbc://${AppDbUser}:${AppDbPassword}@${SqlHost}:1433/${SqlDatabaseName}?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no"

az keyvault secret set --vault-name $KeyVaultName --name "DATABASE-URL" --value $AsyncDbUrl -o none
az keyvault secret set --vault-name $KeyVaultName --name "DATABASE-SYNC-URL" --value $SyncDbUrl -o none
az keyvault secret set --vault-name $KeyVaultName --name "JWT-SECRET-KEY" --value $JwtSecretKey -o none
az keyvault secret set --vault-name $KeyVaultName --name "AZURE-STORAGE-CONNECTION-STRING" --value $StorageConnStr -o none
az keyvault secret set --vault-name $KeyVaultName --name "COSMOS-ENDPOINT" --value $CosmosEndpoint -o none
az keyvault secret set --vault-name $KeyVaultName --name "COSMOS-KEY" --value $CosmosKey -o none
az keyvault secret set --vault-name $KeyVaultName --name "POWERBI-USER" --value $PowerBiUser -o none
az keyvault secret set --vault-name $KeyVaultName --name "POWERBI-PASSWORD" --value $PowerBiPassword -o none

# Step 8: App Service Plan & Web App
Write-Host "`n---> [Step 8/11] Creating App Service Plan (B1 Linux) & Web App..." -ForegroundColor Yellow
az appservice plan create --name $AppServicePlan --resource-group $ResourceGroup --location $Location --is-linux --sku B1 -o table
az webapp create --name $WebAppName --resource-group $ResourceGroup --plan $AppServicePlan --runtime "PYTHON:3.11" -o table

# Step 9: Managed Identity & Settings
Write-Host "`n---> [Step 9/11] Setting up Managed Identity, Key Vault references, and HTTPS..." -ForegroundColor Yellow
$PrincipalId = (az webapp identity assign --name $WebAppName --resource-group $ResourceGroup --query principalId -o tsv)
az keyvault set-policy --name $KeyVaultName --object-id $PrincipalId --secret-permissions get list -o none

az webapp config set `
  --name $WebAppName `
  --resource-group $ResourceGroup `
  --always-on true `
  --min-tls-version "1.2" `
  --http20-enabled true `
  --startup-file "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000" `
  -o none

az webapp update --name $WebAppName --resource-group $ResourceGroup --https-only true -o none

az webapp config appsettings set `
  --name $WebAppName `
  --resource-group $ResourceGroup `
  --settings `
    ENVIRONMENT="production" `
    DATABASE_URL="@Microsoft.KeyVault(VaultName=$KeyVaultName;SecretName=DATABASE-URL)" `
    DATABASE_SYNC_URL="@Microsoft.KeyVault(VaultName=$KeyVaultName;SecretName=DATABASE-SYNC-URL)" `
    JWT_SECRET_KEY="@Microsoft.KeyVault(VaultName=$KeyVaultName;SecretName=JWT-SECRET-KEY)" `
    AZURE_STORAGE_CONNECTION_STRING="@Microsoft.KeyVault(VaultName=$KeyVaultName;SecretName=AZURE-STORAGE-CONNECTION-STRING)" `
    AZURE_STORAGE_CONTAINER_NAME="delivery-photos" `
    COSMOS_ENDPOINT="@Microsoft.KeyVault(VaultName=$KeyVaultName;SecretName=COSMOS-ENDPOINT)" `
    COSMOS_KEY="@Microsoft.KeyVault(VaultName=$KeyVaultName;SecretName=COSMOS-KEY)" `
    COSMOS_DATABASE_NAME="$CosmosDatabase" `
  -o none

# Step 10: Lock SQL Server to App Service Outbound IPs
Write-Host "`n---> [Step 10/11] Whitelisting App Service outbound IPs in Azure SQL firewall..." -ForegroundColor Yellow
$OutboundIps = (az webapp show --name $WebAppName --resource-group $ResourceGroup --query outboundIpAddresses -o tsv).Split(',')
$ruleIndex = 1
foreach ($ip in $OutboundIps) {
    $trimmed = $ip.Trim()
    az sql server firewall-rule create `
      --resource-group $ResourceGroup `
      --server $SqlServerName `
      --name "AppServiceRule_$ruleIndex" `
      --start-ip-address $trimmed `
      --end-ip-address $trimmed `
      -o none
    $ruleIndex++
}

if ($ClientIp) {
    az sql server firewall-rule delete --resource-group $ResourceGroup --server $SqlServerName --name "DeploymentRunnerIP" -o none 2>$null
}

# Step 11: Static Web App & CORS
Write-Host "`n---> [Step 11/11] Provisioning Azure Static Web App (Free) & CORS..." -ForegroundColor Yellow
az staticwebapp create --name $StaticWebAppName --resource-group $ResourceGroup --location $Location --sku Free -o table 2>$null
$FrontendHostname = (az staticwebapp show --name $StaticWebAppName --resource-group $ResourceGroup --query defaultHostname -o tsv 2>$null)
if (-not $FrontendHostname) { $FrontendHostname = "$StaticWebAppName.azurestaticapps.net" }
$FrontendOrigin = "https://$FrontendHostname"

az webapp cors add --name $WebAppName --resource-group $ResourceGroup --allowed-origins $FrontendOrigin -o none

$BackendUrl = "https://$WebAppName.azurewebsites.net"

Write-Host "`n=================================================================" -ForegroundColor Green
Write-Host " WishWell Azure Cloud Deployment Finished!" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host " Backend Health:  $BackendUrl/health" -ForegroundColor Cyan
Write-Host " Backend Docs:    $BackendUrl/docs" -ForegroundColor Cyan
Write-Host " Frontend SWA:    $FrontendOrigin" -ForegroundColor Cyan
Write-Host "================================================================="

