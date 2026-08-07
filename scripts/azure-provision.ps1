# =============================================================================
# DineFlow — Azure Infrastructure Provisioning Script (PowerShell)
# =============================================================================
# Usage:
#   cd "D:\projects\Claude Learn\Dineflow"
#   .\scripts\azure-provision.ps1
# =============================================================================

$ErrorActionPreference = "Stop"

# ── Configuration ─────────────────────────────────────────────────────────────
$RESOURCE_GROUP    = "dineflow-rg"
$LOCATION          = "centralus"
$VNET_NAME         = "dineflow-vnet"

$SQL_SERVER_NAME   = "dineflow-sql-prod"
$SQL_DB_NAME       = "DineFlowDb"
$SQL_ADMIN_USER    = "dineflowadmin"
$SQL_ADMIN_PASS    = "DineFlow@Admin123!"   # change this before going live

$STORAGE_ACCOUNT   = "dineflowstorageprod"
$BLOB_CONTAINER    = "menu-images"

$BACKEND_PLAN      = "dineflow-backend-plan"
$BACKEND_APP       = "dineflow-api"
$STATIC_WEB_APP    = "dineflow-frontend"

Write-Host ""
Write-Host "=== DineFlow Azure Provisioning ===" -ForegroundColor Cyan
Write-Host "Resource Group : $RESOURCE_GROUP"
Write-Host "Location       : $LOCATION"
Write-Host ""

# ── Resource Group ────────────────────────────────────────────────────────────
Write-Host "[1/9] Resource Group..." -ForegroundColor Yellow
az group create --name $RESOURCE_GROUP --location $LOCATION --output none

# ── VNet ─────────────────────────────────────────────────────────────────────
Write-Host "[2/9] Virtual Network and Subnets..." -ForegroundColor Yellow

$vnetExists = az network vnet show -g $RESOURCE_GROUP -n $VNET_NAME --query name -o tsv 2>$null
if (-not $vnetExists) {
    az network vnet create `
        --resource-group $RESOURCE_GROUP --name $VNET_NAME `
        --address-prefixes 10.0.0.0/16 --location $LOCATION --output none
}

$subnetExists = az network vnet subnet show -g $RESOURCE_GROUP --vnet-name $VNET_NAME -n "backend-subnet" --query name -o tsv 2>$null
if (-not $subnetExists) {
    az network vnet subnet create `
        --resource-group $RESOURCE_GROUP --vnet-name $VNET_NAME `
        --name "backend-subnet" --address-prefixes 10.0.1.0/24 `
        --delegations Microsoft.Web/serverFarms `
        --service-endpoints Microsoft.Sql Microsoft.Storage --output none
}

$subnetExists = az network vnet subnet show -g $RESOURCE_GROUP --vnet-name $VNET_NAME -n "db-subnet" --query name -o tsv 2>$null
if (-not $subnetExists) {
    az network vnet subnet create `
        --resource-group $RESOURCE_GROUP --vnet-name $VNET_NAME `
        --name "db-subnet" --address-prefixes 10.0.2.0/24 `
        --service-endpoints Microsoft.Sql `
        --disable-private-endpoint-network-policies true --output none
}

$subnetExists = az network vnet subnet show -g $RESOURCE_GROUP --vnet-name $VNET_NAME -n "storage-subnet" --query name -o tsv 2>$null
if (-not $subnetExists) {
    az network vnet subnet create `
        --resource-group $RESOURCE_GROUP --vnet-name $VNET_NAME `
        --name "storage-subnet" --address-prefixes 10.0.3.0/24 `
        --service-endpoints Microsoft.Storage --output none
}

# ── Azure SQL Server ──────────────────────────────────────────────────────────
Write-Host "[3/9] Azure SQL Server..." -ForegroundColor Yellow
$sqlExists = az sql server show -g $RESOURCE_GROUP -n $SQL_SERVER_NAME --query name -o tsv 2>$null
if (-not $sqlExists) {
    az sql server create `
        --resource-group $RESOURCE_GROUP --name $SQL_SERVER_NAME --location $LOCATION `
        --admin-user $SQL_ADMIN_USER --admin-password $SQL_ADMIN_PASS --output none
}

az sql server firewall-rule create `
    --resource-group $RESOURCE_GROUP --server $SQL_SERVER_NAME `
    --name "AllowAzureServices" `
    --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0 --output none

# ── Azure SQL Database ────────────────────────────────────────────────────────
Write-Host "[4/9] Azure SQL Database (Serverless)..." -ForegroundColor Yellow
$dbExists = az sql db show -g $RESOURCE_GROUP -s $SQL_SERVER_NAME -n $SQL_DB_NAME --query name -o tsv 2>$null
if (-not $dbExists) {
    az sql db create `
        --resource-group $RESOURCE_GROUP --server $SQL_SERVER_NAME --name $SQL_DB_NAME `
        --edition GeneralPurpose --family Gen5 --capacity 1 `
        --compute-model Serverless --auto-pause-delay 60 --min-capacity 0.5 `
        --zone-redundant false --output none
}

# ── Storage Account ───────────────────────────────────────────────────────────
Write-Host "[5/9] Azure Storage Account..." -ForegroundColor Yellow
$storageExists = az storage account show -g $RESOURCE_GROUP -n $STORAGE_ACCOUNT --query name -o tsv 2>$null
if (-not $storageExists) {
    az storage account create `
        --resource-group $RESOURCE_GROUP --name $STORAGE_ACCOUNT --location $LOCATION `
        --sku Standard_LRS --kind StorageV2 --allow-blob-public-access true --output none

    az storage account network-rule add `
        --resource-group $RESOURCE_GROUP --account-name $STORAGE_ACCOUNT `
        --vnet-name $VNET_NAME --subnet "backend-subnet" --output none
}

$STORAGE_CONN = az storage account show-connection-string `
    --resource-group $RESOURCE_GROUP --name $STORAGE_ACCOUNT --query connectionString -o tsv

az storage container create `
    --name $BLOB_CONTAINER --connection-string $STORAGE_CONN `
    --public-access blob --output none 2>$null

# ── App Service Plan (B1) ─────────────────────────────────────────────────────
Write-Host "[6/9] App Service Plan (B1)..." -ForegroundColor Yellow
$planExists = az appservice plan show -g $RESOURCE_GROUP -n $BACKEND_PLAN --query name -o tsv 2>$null
if (-not $planExists) {
    az appservice plan create `
        --resource-group $RESOURCE_GROUP --name $BACKEND_PLAN --location $LOCATION `
        --sku B1 --is-linux --output none
}

# ── Backend App Service ───────────────────────────────────────────────────────
Write-Host "[7/9] Backend App Service (.NET 9)..." -ForegroundColor Yellow
$appExists = az webapp show -g $RESOURCE_GROUP -n $BACKEND_APP --query name -o tsv 2>$null
if (-not $appExists) {
    az webapp create `
        --resource-group $RESOURCE_GROUP --plan $BACKEND_PLAN `
        --name $BACKEND_APP --runtime "DOTNETCORE:9.0" --output none
}

az webapp vnet-integration add `
    --resource-group $RESOURCE_GROUP --name $BACKEND_APP `
    --vnet $VNET_NAME --subnet "backend-subnet" --output none

# ── Static Web App ────────────────────────────────────────────────────────────
Write-Host "[8/9] Azure Static Web App (Free)..." -ForegroundColor Yellow
$swaExists = az staticwebapp show -g $RESOURCE_GROUP -n $STATIC_WEB_APP --query name -o tsv 2>$null
if (-not $swaExists) {
    az staticwebapp create `
        --resource-group $RESOURCE_GROUP --name $STATIC_WEB_APP `
        --location "centralus" --sku Free --output none
}

# ── App Service Settings ──────────────────────────────────────────────────────
Write-Host "[9/9] Configuring App Service settings..." -ForegroundColor Yellow

$BACKEND_URL  = "https://$(az webapp show -g $RESOURCE_GROUP -n $BACKEND_APP --query defaultHostName -o tsv)"
$STATIC_URL   = "https://$(az staticwebapp show -g $RESOURCE_GROUP -n $STATIC_WEB_APP --query defaultHostname -o tsv)"
$SQL_FQDN     = "$SQL_SERVER_NAME.database.windows.net"
$SQL_CONN     = "Server=tcp:$SQL_FQDN,1433;Database=$SQL_DB_NAME;User ID=$SQL_ADMIN_USER;Password=$SQL_ADMIN_PASS;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

az webapp config appsettings set `
    --resource-group $RESOURCE_GROUP --name $BACKEND_APP `
    --settings `
        ASPNETCORE_ENVIRONMENT="Production" `
        Jwt__Issuer="DineFlow" `
        Jwt__Audience="DineFlow" `
        Jwt__ExpiryMinutes="480" `
        AllowedOrigins__Frontend="$STATIC_URL" `
    --output none

# ── Output ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "  DineFlow Provisioning Complete ✓" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend URL  : $BACKEND_URL"
Write-Host "Frontend URL : $STATIC_URL"
Write-Host "SQL Server   : $SQL_FQDN"
Write-Host "Storage      : $STORAGE_ACCOUNT"
Write-Host ""
Write-Host "━━━ Set these as GitHub Repository Secrets ━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "VITE_API_URL=$BACKEND_URL"
Write-Host "VITE_SIGNALR_URL=$BACKEND_URL/hubs/orders"
Write-Host ""
Write-Host "AZURE_SQL_CONNECTION_STRING=$SQL_CONN"
Write-Host ""
Write-Host "AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONN"
Write-Host ""
Write-Host "AZURE_STATIC_WEB_APPS_API_TOKEN=$(az staticwebapp secrets list --name $STATIC_WEB_APP --resource-group $RESOURCE_GROUP --query 'properties.apiKey' -o tsv)"
Write-Host ""
Write-Host "━━━ One-time: create the service principal for CI ━━━" -ForegroundColor Cyan
$subscriptionId = az account show --query id -o tsv
Write-Host "az ad sp create-for-rbac --name dineflow-ci --role contributor --scopes /subscriptions/$subscriptionId/resourceGroups/$RESOURCE_GROUP --sdk-auth"
Write-Host ""
