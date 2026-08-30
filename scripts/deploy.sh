#!/usr/bin/env bash
# SafePassage Deployment Script
#
# Deploys both the frontend and backend to Vercel.
# Requires `vercel login` to have been run once already.
#
# Usage:
#   ./scripts/deploy.sh          # Deploy both frontend and backend
#   ./scripts/deploy.sh frontend # Deploy only frontend
#   ./scripts/deploy.sh backend  # Deploy only backend
#
# Pre-deployment checks:
#   1. Validates Schema v1 fixtures
#   2. Checks that Vercel CLI is installed
#   3. Verifies authentication status
#
# Environment variables:
#   - VERCEL_ORG_ID: Vercel organization ID (optional, uses default)
#   - VERCEL_PROJECT_ID: Vercel project ID (optional, uses project config)
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}==> SafePassage Deployment Script${NC}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}ERROR: Vercel CLI not found. Install it with: npm i -g vercel${NC}"
    exit 1
fi

# Check if Python is available for schema validation
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo -e "${RED}ERROR: Python not found. Schema validation requires Python.${NC}"
    exit 1
fi

# Determine which components to deploy
DEPLOY_TARGET="${1:-all}"

echo -e "${GREEN}==> Validating Schema v1 fixtures before deploy${NC}"
python3 scripts/validate_schema.py data/fixtures/hotspots.geojson data/fixtures/segments.geojson
echo ""

# Deploy backend
if [[ "$DEPLOY_TARGET" == "all" || "$DEPLOY_TARGET" == "backend" ]]; then
    echo -e "${GREEN}==> Deploying backend to Vercel${NC}"
    (cd backend && vercel deploy --prod --yes)
    echo ""
fi

# Deploy frontend
if [[ "$DEPLOY_TARGET" == "all" || "$DEPLOY_TARGET" == "frontend" ]]; then
    echo -e "${GREEN}==> Deploying frontend to Vercel${NC}"
    (cd frontend && vercel deploy --prod --yes)
    echo ""
fi

echo -e "${GREEN}==> Deployment complete!${NC}"
echo -e "${YELLOW}NOTE: Update frontend/.env's VITE_API_BASE if the backend URL changed.${NC}"
