#!/usr/bin/env bash
set -euo pipefail

# Deploys the Sprout CRM stack to the single Lightsail instance.
#
# Requirements:
#   - Instance already created via `infra/lightsail` Terraform.
#   - rsync + ssh installed locally.
#   - `.env.production` present in the repo root (copy from .env.production.example).
#
# Usage:
#   SSH_KEY=~/.ssh/id_ed25519 ./scripts/deploy.sh
#
# Optional overrides:
#   LIGHTSAIL_IP   — instance public IP (defaults to `terraform output public_ip`)
#   SSH_USER       — SSH user (default: ubuntu)

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SSH_USER="${SSH_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-}"

# Resolve the IP from Terraform output when not supplied.
LIGHTSAIL_IP="${LIGHTSAIL_IP:-}"
if [[ -z "$LIGHTSAIL_IP" ]]; then
  LIGHTSAIL_IP="$(terraform -chdir="$REPO_ROOT/infra/lightsail" output -raw public_ip 2>/dev/null || true)"
fi

if [[ -z "$LIGHTSAIL_IP" ]]; then
  echo "ERROR: could not determine the Lightsail instance IP." >&2
  echo "  Set LIGHTSAIL_IP, or run 'terraform apply' in infra/lightsail first." >&2
  exit 1
fi

if [[ ! -f .env.production ]]; then
  echo "ERROR: .env.production not found in the repo root." >&2
  echo "  cp .env.production.example .env.production  # then fill in secrets" >&2
  exit 1
fi

SSH_ARGS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=10)
if [[ -n "$SSH_KEY" ]]; then
  SSH_ARGS+=(-i "$SSH_KEY")
fi

SSH_TARGET="$SSH_USER@$LIGHTSAIL_IP"

echo "==> Syncing repository to $SSH_TARGET"
rsync -az --delete \
  -e "ssh ${SSH_ARGS[*]}" \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude 'postgres_data' \
  --exclude '.terraform' \
  --exclude '*.tfstate*' \
  --exclude '*.tfvars' \
  --exclude '*.log' \
  --exclude '.DS_Store' \
  ./ "$SSH_TARGET:~/trade-crm/"

echo "==> Building and starting the stack on $SSH_TARGET"
ssh "${SSH_ARGS[@]}" "$SSH_TARGET" \
  "cd ~/trade-crm && docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build --remove-orphans"

echo "==> Container status"
ssh "${SSH_ARGS[@]}" "$SSH_TARGET" \
  "cd ~/trade-crm && docker compose -f docker-compose.prod.yml ps"

echo ""
echo "Done. API: https://\${API_DOMAIN}/api/docs (frontend is served from S3 + CloudFront)"
