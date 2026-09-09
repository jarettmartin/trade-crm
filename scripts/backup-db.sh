#!/usr/bin/env bash
set -euo pipefail

# cron runs with a minimal PATH; ensure aws (snap) and other tools are found.
export PATH="$PATH:/snap/bin:/usr/local/bin"

# Daily PostgreSQL backup to S3 with 7-day retention.
# Runs via cron on the Lightsail instance at 1am Eastern (CRON_TZ handles DST).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${ENV_FILE:-$REPO_DIR/.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-$REPO_DIR/docker-compose.prod.yml}"

S3_BUCKET="${S3_BUCKET:-sprout-crm-backups}"
BACKUP_PREFIX="sprout-crm-db"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Load AWS credentials for the CLI from .env.production
export AWS_ACCESS_KEY_ID="$(grep -E '^AWS_ACCESS_KEY_ID=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"')"
export AWS_SECRET_ACCESS_KEY="$(grep -E '^AWS_SECRET_ACCESS_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"')"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-2}"

# Unix ms timestamp — descriptive and unambiguous.
TS_MS="$(date +%s%3N)"
BACKUP_KEY="${BACKUP_PREFIX}-${TS_MS}.sql.gz"
TMP_FILE="/tmp/${BACKUP_KEY}"

echo "==> pg_dump + gzip -> ${BACKUP_KEY}"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  pg_dump -U postgres -d trade_crm | gzip > "$TMP_FILE"

echo "==> upload s3://${S3_BUCKET}/${BACKUP_KEY}"
aws s3 cp "$TMP_FILE" "s3://${S3_BUCKET}/${BACKUP_KEY}"
rm -f "$TMP_FILE"

echo "==> retention (${RETENTION_DAYS} days)"
CUTOFF_MS="$(( $(date +%s%3N) - RETENTION_DAYS * 86400000 ))"
for KEY in $(aws s3api list-objects-v2 --bucket "$S3_BUCKET" --prefix "$BACKUP_PREFIX-" --query 'Contents[].Key' --output text 2>/dev/null); do
  TS="$(echo "$KEY" | sed -E "s/^${BACKUP_PREFIX}-([0-9]+)\.sql\.gz$/\1/")"
  if [[ "$TS" =~ ^[0-9]+$ ]] && [[ "$TS" -lt "$CUTOFF_MS" ]]; then
    echo "  deleting ${KEY}"
    aws s3 rm "s3://${S3_BUCKET}/${KEY}"
  fi
done
echo "==> done"
