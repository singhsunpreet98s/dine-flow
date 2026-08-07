#!/usr/bin/env bash
# =============================================================================
# DineFlow — Azure Infrastructure Provisioning Script
# =============================================================================
# Idempotent: safe to run multiple times. Uses existence checks before creates.
#
# Prerequisites:
#   - az CLI installed and logged in (`az login`)
#   - SQL_ADMIN_PASS exported as an environment variable
#
# Usage:
#   export SQL_ADMIN_PASS="YourStr0ngP@ssword1!"
#   bash scripts/azure-provision.sh
# =============================================================================
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
RESOURCE_GROUP="dineflow-rg"
LOCATION="centralus"

VNET_NAME="dineflow-vnet"

SQL_SERVER_NAME="dineflow-sql-prod"        # globally unique — change if taken
SQL_DB_NAME="DineFlowDb"
SQL_ADMIN_USER="dineflowadmin"
SQL_ADMIN_PASS="${SQL_ADMIN_PASS:?ERROR: SQL_ADMIN_PASS environment variable is required}"

STORAGE_ACCOUNT="dineflowstorageprod"     # 3-24 chars, lowercase alphanumeric only
BLOB_CONTAINER="menu-images"

BACKEND_PLAN="dineflow-backend-plan"
BACKEND_APP="dineflow-api"
STATIC_WEB_APP="dineflow-frontend"

echo "=== DineFlow Azure Provisioning ==="
echo "Resource Group : $RESOURCE_GROUP"
echo "Location       : $LOCATION"
echo ""

# ── Resource Group ────────────────────────────────────────────────────────────
echo "[1/9] Resource Group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

# ── VNet ─────────────────────────────────────────────────────────────────────
echo "[2/9] Virtual Network and Subnets..."
if ! az network vnet show -g "$RESOURCE_GROUP" -n "$VNET_NAME" &>/dev/null; then
  az network vnet create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VNET_NAME" \
    --address-prefixes 10.0.0.0/16 \
    --location "$LOCATION" \
    --output none
fi

# backend-subnet: requires Microsoft.Web/serverFarms delegation for App Service VNet integration
if ! az network vnet subnet show -g "$RESOURCE_GROUP" --vnet-name "$VNET_NAME" -n "backend-subnet" &>/dev/null; then
  az network vnet subnet create \
    --resource-group "$RESOURCE_GROUP" \
    --vnet-name "$VNET_NAME" \
    --name "backend-subnet" \
    --address-prefixes 10.0.1.0/24 \
    --delegations Microsoft.Web/serverFarms \
    --service-endpoints Microsoft.Sql Microsoft.Storage \
    --output none
fi

# db-subnet: for Azure SQL service endpoint
if ! az network vnet subnet show -g "$RESOURCE_GROUP" --vnet-name "$VNET_NAME" -n "db-subnet" &>/dev/null; then
  az network vnet subnet create \
    --resource-group "$RESOURCE_GROUP" \
    --vnet-name "$VNET_NAME" \
    --name "db-subnet" \
    --address-prefixes 10.0.2.0/24 \
    --service-endpoints Microsoft.Sql \
    --disable-private-endpoint-network-policies true \
    --output none
fi

# storage-subnet: for Blob Storage service endpoint
if ! az network vnet subnet show -g "$RESOURCE_GROUP" --vnet-name "$VNET_NAME" -n "storage-subnet" &>/dev/null; then
  az network vnet subnet create \
    --resource-group "$RESOURCE_GROUP" \
    --vnet-name "$VNET_NAME" \
    --name "storage-subnet" \
    --address-prefixes 10.0.3.0/24 \
    --service-endpoints Microsoft.Storage \
    --output none
fi

# ── Azure SQL Server + Database ───────────────────────────────────────────────
echo "[3/9] Azure SQL Server..."
if ! az sql server show -g "$RESOURCE_GROUP" -n "$SQL_SERVER_NAME" &>/dev/null; then
  az sql server create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$SQL_SERVER_NAME" \
    --location "$LOCATION" \
    --admin-user "$SQL_ADMIN_USER" \
    --admin-password "$SQL_ADMIN_PASS" \
    --output none
fi

# Allow Azure services through the SQL firewall (required for App Service → SQL via service endpoint)
az sql server firewall-rule create \
  --resource-group "$RESOURCE_GROUP" \
  --server "$SQL_SERVER_NAME" \
  --name "AllowAzureServices" \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0 \
  --output none

echo "[4/9] Azure SQL Database (Serverless)..."
if ! az sql db show -g "$RESOURCE_GROUP" -s "$SQL_SERVER_NAME" -n "$SQL_DB_NAME" &>/dev/null; then
  az sql db create \
    --resource-group "$RESOURCE_GROUP" \
    --server "$SQL_SERVER_NAME" \
    --name "$SQL_DB_NAME" \
    --edition GeneralPurpose \
    --family Gen5 \
    --capacity 1 \
    --compute-model Serverless \
    --auto-pause-delay 60 \
    --min-capacity 0.5 \
    --zone-redundant false \
    --output none
  # NOTE: Add --free-limit AutoPause above if your Azure subscription supports the SQL Database free offer
  # (100,000 vCore-seconds/month free). Remove it on subscriptions that don't support it.
fi

# ── Azure Storage Account + Blob Container ────────────────────────────────────
echo "[5/9] Azure Storage Account..."
if ! az storage account show -g "$RESOURCE_GROUP" -n "$STORAGE_ACCOUNT" &>/dev/null; then
  az storage account create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$STORAGE_ACCOUNT" \
    --location "$LOCATION" \
    --sku Standard_LRS \
    --kind StorageV2 \
    --allow-blob-public-access true \
    --output none

  # Restrict network access to backend-subnet only
  az storage account network-rule add \
    --resource-group "$RESOURCE_GROUP" \
    --account-name "$STORAGE_ACCOUNT" \
    --vnet-name "$VNET_NAME" \
    --subnet "backend-subnet" \
    --output none
fi

STORAGE_CONN=$(az storage account show-connection-string \
  --resource-group "$RESOURCE_GROUP" \
  --name "$STORAGE_ACCOUNT" \
  --query connectionString -o tsv)

# Create menu-images container with public blob access (images are served directly by URL)
az storage container create \
  --name "$BLOB_CONTAINER" \
  --connection-string "$STORAGE_CONN" \
  --public-access blob \
  --output none 2>/dev/null || true  # idempotent: ignore "already exists" error

# ── App Service Plan (B1 — minimum tier that supports VNet integration) ───────
echo "[6/9] App Service Plan (B1)..."
if ! az appservice plan show -g "$RESOURCE_GROUP" -n "$BACKEND_PLAN" &>/dev/null; then
  az appservice plan create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$BACKEND_PLAN" \
    --location "$LOCATION" \
    --sku B1 \
    --is-linux \
    --output none
fi

# ── Backend App Service (.NET 9) ──────────────────────────────────────────────
echo "[7/9] Backend App Service (.NET 9)..."
if ! az webapp show -g "$RESOURCE_GROUP" -n "$BACKEND_APP" &>/dev/null; then
  az webapp create \
    --resource-group "$RESOURCE_GROUP" \
    --plan "$BACKEND_PLAN" \
    --name "$BACKEND_APP" \
    --runtime "DOTNETCORE:9.0" \
    --output none
fi

# VNet integration — routes outbound traffic (to SQL + Storage) through the VNet
az webapp vnet-integration add \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --vnet "$VNET_NAME" \
  --subnet "backend-subnet" \
  --output none

# ── Azure Static Web Apps (Free tier) ────────────────────────────────────────
echo "[8/9] Azure Static Web App (Free)..."
if ! az staticwebapp show -g "$RESOURCE_GROUP" -n "$STATIC_WEB_APP" &>/dev/null; then
  az staticwebapp create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$STATIC_WEB_APP" \
    --location "centralus" \
    --sku Free \
    --output none
  # NOTE: We do NOT pass --source/--branch here.
  # Deployment is handled by the GitHub Actions workflow using the deploy token,
  # not by the SWA GitHub App integration.
fi

# ── App Service Application Settings (non-secret) ────────────────────────────
echo "[9/9] Configuring App Service settings..."
BACKEND_HOSTNAME=$(az webapp show \
  -g "$RESOURCE_GROUP" -n "$BACKEND_APP" --query defaultHostName -o tsv)
BACKEND_URL="https://${BACKEND_HOSTNAME}"

STATIC_HOSTNAME=$(az staticwebapp show \
  -g "$RESOURCE_GROUP" -n "$STATIC_WEB_APP" --query defaultHostname -o tsv)
STATIC_URL="https://${STATIC_HOSTNAME}"

az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --settings \
    ASPNETCORE_ENVIRONMENT="Production" \
    Jwt__Issuer="DineFlow" \
    Jwt__Audience="DineFlow" \
    Jwt__ExpiryMinutes="480" \
    AllowedOrigins__Frontend="$STATIC_URL" \
  --output none

# Secrets (Jwt__Secret, ConnectionStrings__DefaultConnection, AzureStorage__ConnectionString)
# are set by the GitHub Actions workflow from repository secrets — NOT here —
# to avoid storing sensitive values in shell history or log files.

# ── Output ────────────────────────────────────────────────────────────────────
SQL_CONN="Server=tcp:${SQL_SERVER_NAME}.database.windows.net,1433;Database=${SQL_DB_NAME};User ID=${SQL_ADMIN_USER};Password=${SQL_ADMIN_PASS};Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

echo ""
echo "======================================="
echo "  DineFlow Provisioning Complete ✓"
echo "======================================="
echo ""
echo "Backend URL  : $BACKEND_URL"
echo "Frontend URL : $STATIC_URL"
echo "SQL Server   : ${SQL_SERVER_NAME}.database.windows.net"
echo "Storage      : $STORAGE_ACCOUNT"
echo ""
echo "━━━ Set the following as GitHub Repository Secrets ━━━"
echo ""
echo "VITE_API_URL=$BACKEND_URL"
echo "VITE_SIGNALR_URL=$BACKEND_URL/hubs/orders"
echo ""
echo "AZURE_SQL_CONNECTION_STRING=$SQL_CONN"
echo ""
echo "AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONN"
echo ""
echo "AZURE_STATIC_WEB_APPS_API_TOKEN="
az staticwebapp secrets list \
  --name "$STATIC_WEB_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.apiKey" -o tsv
echo ""
echo "━━━ One-time: create the service principal for CI ━━━"
echo "az ad sp create-for-rbac --name dineflow-ci --role contributor \\"
echo "  --scopes /subscriptions/\$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP \\"
echo "  --sdk-auth"
echo ""
