# ==============================================================================
# WishWell Azure Deployment Script (PowerShell / Windows)
# Location: /infra/deploy.ps1
# ==============================================================================

[CmdletBinding()]
param(
    [string]$Location = "eastus",
    [string]$StaticWebAppLocation = "eastus2",
    [string]$ResourceGroup = "rg-wishwell-prod",
    [string]$Prefix = "wishwell",
    [string]$RandomSuffix = ""
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw "Azure CLI (az) is not installed or not in PATH. Install Microsoft.AzureCLI first."
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$PythonExe = Join-Path $RepoRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    $PythonExe = "python"
}

if (-not $RandomSuffix) {
    $RandomSuffix = (Get-Random -Minimum 1000 -Maximum 9999).ToString()
}

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
Write-Host " WishWell Full-Stack Azure Deployment (PowerShell)" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Resource Group:     $ResourceGroup ($Location)"
Write-Host " Storage Account:    $StorageAccount"
Write-Host " Key Vault:          $KeyVaultName"
Write-Host " Cosmos DB:          $CosmosAccount"
Write-Host " SQL Server & DB:    $SqlServerName / $SqlDatabaseName"
Write-Host " Backend Web App:    $WebAppName"
Write-Host " Frontend SWA:       $StaticWebAppName ($StaticWebAppLocation)"
Write-Host "================================================================="

# Ensure authenticated
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
az account show -o none 2>$null
$loggedIn = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevEap
if (-not $loggedIn) {
    Write-Host "`n---> Logging in to Azure..." -ForegroundColor Yellow
    az login -o none
    if ($LASTEXITCODE -ne 0) { throw "Azure login failed." }
}

# Step 1: Resource Group
Write-Host "`n---> [Step 1/13] Creating Resource Group: $ResourceGroup..." -ForegroundColor Yellow
az group create --name $ResourceGroup --location $Location -o table

# Step 2: Storage Account
Write-Host "`n---> [Step 2/13] Creating Storage Account (Standard_LRS)..." -ForegroundColor Yellow
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
Write-Host "`n---> [Step 3/13] Provisioning Azure Key Vault..." -ForegroundColor Yellow
az keyvault create --name $KeyVaultName --resource-group $ResourceGroup --location $Location --sku standard --enable-rbac-authorization false -o table

# Step 4: Azure Cosmos DB (Semi-Structured Data & Polyglot Persistence)
Write-Host "`n---> [Step 4/13] Provisioning Azure Cosmos DB: $CosmosAccount (Serverless)..." -ForegroundColor Yellow
$CosmosEndpoint = ""
$CosmosKey = ""
try {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    az cosmosdb create --name $CosmosAccount --resource-group $ResourceGroup --locations regionName=$Location failoverPriority=0 isZoneRedundant=False --default-consistency-level Session --capabilities EnableServerless -o table 2>$null
    $cosmosExit = $LASTEXITCODE
    $ErrorActionPreference = $prevEap
    if ($cosmosExit -ne 0) {
        az cosmosdb create --name $CosmosAccount --resource-group $ResourceGroup --locations regionName=$Location failoverPriority=0 isZoneRedundant=False --default-consistency-level Session -o table
    }
    az cosmosdb sql database create --account-name $CosmosAccount --resource-group $ResourceGroup --name $CosmosDatabase -o none
    az cosmosdb sql container create --account-name $CosmosAccount --resource-group $ResourceGroup --database-name $CosmosDatabase --name "audit_events" --partition-key-path "/entity" -o none
    az cosmosdb sql container create --account-name $CosmosAccount --resource-group $ResourceGroup --database-name $CosmosDatabase --name "delivery_metadata" --partition-key-path "/claim_id" -o none

    $CosmosEndpoint = "https://$CosmosAccount.documents.azure.com:443/"
    $CosmosKey = (az cosmosdb keys list --name $CosmosAccount --resource-group $ResourceGroup --query primaryMasterKey -o tsv)
    Write-Host "[PASS] Cosmos DB containers configured." -ForegroundColor Green
} catch {
    Write-Warning "Cosmos DB provisioning failed or is restricted on this subscription ($($_.Exception.Message)). Continuing with graceful fallback."
}

# Step 5: Azure SQL Server & Database
Write-Host "`n---> [Step 5/13] Creating Azure SQL Server & Serverless Database..." -ForegroundColor Yellow
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

# Step 6: Temporary Firewall Rule for Migration
Write-Host "`n---> [Step 6/13] Adding temporary firewall rule for migration..." -ForegroundColor Yellow
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

# Step 7: Apply Schema & Seed
Write-Host "`n---> [Step 7/13] Applying schema.sql and seed.sql via apply_sql.py..." -ForegroundColor Yellow
$SqlHost = "$SqlServerName.database.windows.net"
& $PythonExe (Join-Path $RepoRoot "infra\apply_sql.py") `
  --server $SqlHost `
  --database $SqlDatabaseName `
  --admin-user $SqlAdminUser `
  --admin-password $SqlAdminPassword `
  --app-user $AppDbUser `
  --app-password $AppDbPassword `
  --powerbi-user $PowerBiUser `
  --powerbi-password $PowerBiPassword
if ($LASTEXITCODE -ne 0) {
    throw "SQL schema/seed migration failed. Ensure ODBC Driver 18 for SQL Server is installed locally."
}

# Step 8: Secrets into Key Vault
Write-Host "`n---> [Step 8/13] Storing connection strings and secrets in Key Vault..." -ForegroundColor Yellow
$AsyncDbUrl = "mssql+aioodbc://${AppDbUser}:${AppDbPassword}@${SqlHost}:1433/${SqlDatabaseName}?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no&Connection+Timeout=60"
$SyncDbUrl = "mssql+pyodbc://${AppDbUser}:${AppDbPassword}@${SqlHost}:1433/${SqlDatabaseName}?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no&Connection+Timeout=60"

az keyvault secret set --vault-name $KeyVaultName --name "DATABASE-URL" --value $AsyncDbUrl -o none
az keyvault secret set --vault-name $KeyVaultName --name "DATABASE-SYNC-URL" --value $SyncDbUrl -o none
az keyvault secret set --vault-name $KeyVaultName --name "JWT-SECRET-KEY" --value $JwtSecretKey -o none
az keyvault secret set --vault-name $KeyVaultName --name "AZURE-STORAGE-CONNECTION-STRING" --value $StorageConnStr -o none
if ($CosmosEndpoint -and $CosmosKey) {
    az keyvault secret set --vault-name $KeyVaultName --name "COSMOS-ENDPOINT" --value $CosmosEndpoint -o none
    az keyvault secret set --vault-name $KeyVaultName --name "COSMOS-KEY" --value $CosmosKey -o none
}
az keyvault secret set --vault-name $KeyVaultName --name "POWERBI-USER" --value $PowerBiUser -o none
az keyvault secret set --vault-name $KeyVaultName --name "POWERBI-PASSWORD" --value $PowerBiPassword -o none

# Step 9: App Service Plan & Web App
Write-Host "`n---> [Step 9/13] Creating App Service Plan (B1 Linux) & Web App..." -ForegroundColor Yellow
az appservice plan create --name $AppServicePlan --resource-group $ResourceGroup --location $Location --is-linux --sku B1 -o table
az webapp create --name $WebAppName --resource-group $ResourceGroup --plan $AppServicePlan --runtime "PYTHON:3.11" -o table

# Step 10: Managed Identity, Static Web App & App Settings
Write-Host "`n---> [Step 10/13] Provisioning Static Web App & configuring Managed Identity / Key Vault..." -ForegroundColor Yellow
az staticwebapp create --name $StaticWebAppName --resource-group $ResourceGroup --location $StaticWebAppLocation --sku Free -o table
$FrontendHostname = (az staticwebapp show --name $StaticWebAppName --resource-group $ResourceGroup --query defaultHostname -o tsv)
if (-not $FrontendHostname) { $FrontendHostname = "$StaticWebAppName.azurestaticapps.net" }
$FrontendOrigin = "https://$FrontendHostname"

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

$AppSettings = @(
    "ENVIRONMENT=production",
    "SCM_DO_BUILD_DURING_DEPLOYMENT=true",
    "DATABASE_URL=@Microsoft.KeyVault(VaultName=$KeyVaultName;SecretName=DATABASE-URL)",
    "DATABASE_SYNC_URL=@Microsoft.KeyVault(VaultName=$KeyVaultName;SecretName=DATABASE-SYNC-URL)",
    "JWT_SECRET_KEY=@Microsoft.KeyVault(VaultName=$KeyVaultName;SecretName=JWT-SECRET-KEY)",
    "AZURE_STORAGE_CONNECTION_STRING=@Microsoft.KeyVault(VaultName=$KeyVaultName;SecretName=AZURE-STORAGE-CONNECTION-STRING)",
    "AZURE_STORAGE_CONTAINER_NAME=delivery-photos",
    "COSMOS_DATABASE_NAME=$CosmosDatabase",
    "CORS_ORIGINS=$FrontendOrigin"
)
if ($CosmosEndpoint -and $CosmosKey) {
    $AppSettings += "COSMOS_ENDPOINT=@Microsoft.KeyVault(VaultName=$KeyVaultName;SecretName=COSMOS-ENDPOINT)"
    $AppSettings += "COSMOS_KEY=@Microsoft.KeyVault(VaultName=$KeyVaultName;SecretName=COSMOS-KEY)"
}

az webapp config appsettings set --name $WebAppName --resource-group $ResourceGroup --settings @AppSettings -o none
az webapp cors add --name $WebAppName --resource-group $ResourceGroup --allowed-origins $FrontendOrigin -o none

# Step 11: Lock SQL Server to App Service Outbound IPs
Write-Host "`n---> [Step 11/13] Whitelisting App Service outbound IPs in Azure SQL firewall..." -ForegroundColor Yellow
$OutboundIps = (az webapp show --name $WebAppName --resource-group $ResourceGroup --query outboundIpAddresses -o tsv).Split(',')
$ruleIndex = 1
foreach ($ip in $OutboundIps) {
    $trimmed = $ip.Trim()
    if ($trimmed) {
        az sql server firewall-rule create `
          --resource-group $ResourceGroup `
          --server $SqlServerName `
          --name "AppServiceRule_$ruleIndex" `
          --start-ip-address $trimmed `
          --end-ip-address $trimmed `
          -o none
        $ruleIndex++
    }
}

if ($ClientIp) {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    az sql server firewall-rule delete --resource-group $ResourceGroup --server $SqlServerName --name "DeploymentRunnerIP" -o none 2>$null
    $ErrorActionPreference = $prevEap
}

# Step 12: Package & Deploy Backend to App Service
Write-Host "`n---> [Step 12/13] Packaging & deploying FastAPI backend to App Service..." -ForegroundColor Yellow
$BackendZip = Join-Path $env:TEMP "wishwell-backend-$RandomSuffix.zip"
if (Test-Path $BackendZip) { Remove-Item $BackendZip -Force }

& $PythonExe -c @"
import os, zipfile
src = r'$RepoRoot\backend'
out = r'$BackendZip'
skip_dirs = {'.venv', 'venv', '__pycache__', '.pytest_cache', 'tests'}
skip_files = {'.env'}
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for f in files:
            if f in skip_files or f.endswith('.pyc') or f.endswith('.db'):
                continue
            full = os.path.join(root, f)
            rel = os.path.relpath(full, src).replace(os.sep, '/')
            zf.write(full, rel)
print('Created backend zip:', out)
"@
if ($LASTEXITCODE -ne 0) { throw "Failed to create backend deployment zip." }

az webapp deploy --resource-group $ResourceGroup --name $WebAppName --src-path $BackendZip --type zip -o table
Remove-Item $BackendZip -Force -ErrorAction SilentlyContinue

# Step 13: Build & Deploy Frontend to Azure Static Web Apps
Write-Host "`n---> [Step 13/13] Building & deploying React frontend to Azure Static Web Apps..." -ForegroundColor Yellow
$BackendUrl = "https://$WebAppName.azurewebsites.net"
Push-Location (Join-Path $RepoRoot "frontend")
try {
    $env:VITE_API_BASE = "$BackendUrl/api"
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend Vite build failed." }

    Copy-Item "staticwebapp.config.json" "dist\staticwebapp.config.json" -Force
    $SwaToken = (az staticwebapp secrets list --name $StaticWebAppName --resource-group $ResourceGroup --query "properties.apiKey" -o tsv)
    if (-not $SwaToken) { throw "Could not retrieve Static Web App deployment token." }

    npx --yes @azure/static-web-apps-cli deploy ./dist --deployment-token $SwaToken --env production
    if ($LASTEXITCODE -ne 0) { throw "Static Web App deployment failed." }
} finally {
    Remove-Item Env:VITE_API_BASE -ErrorAction SilentlyContinue
    Pop-Location
}

Write-Host "`n=================================================================" -ForegroundColor Green
Write-Host " WishWell Azure Cloud Deployment Finished!" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host " Resource Group:  $ResourceGroup"
Write-Host " SQL Server:      $SqlServerName.database.windows.net"
Write-Host " Key Vault:       $KeyVaultName"
Write-Host " Storage Account: $StorageAccount"
Write-Host " Cosmos Account:  $CosmosAccount"
Write-Host " Backend Health:  $BackendUrl/health" -ForegroundColor Cyan
Write-Host " Backend Docs:    $BackendUrl/docs" -ForegroundColor Cyan
Write-Host " Frontend SWA:    $FrontendOrigin" -ForegroundColor Cyan
Write-Host "================================================================="
