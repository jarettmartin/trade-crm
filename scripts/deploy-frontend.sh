#!/usr/bin/env bash
set -euo pipefail

# Builds and deploys the frontend SPA to S3, then invalidates CloudFront.
#
# VITE_API_BASE is read from web-trade-crm/.env.production at build time.
#
# Usage:
#   ./scripts/deploy-frontend.sh
#
# Optional overrides:
#   S3_BUCKET                 — target bucket (default: sprout-crm-web)
#   CLOUDFRONT_DISTRIBUTION_ID — distribution to invalidate (default: EUOKGR08LL6O)

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT/web-trade-crm"

S3_BUCKET="${S3_BUCKET:-sprout-crm-web}"
DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-EUOKGR08LL6O}"

echo "==> Building frontend"
npm run build

echo "==> Syncing dist/ to s3://${S3_BUCKET}/"
aws s3 sync dist/ "s3://${S3_BUCKET}/" --delete

echo "==> Invalidating CloudFront (${DISTRIBUTION_ID})"
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*"

echo ""
echo "Done. Frontend: https://sprout-crm.com"
