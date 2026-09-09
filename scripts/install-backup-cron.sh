#!/usr/bin/env bash
set -euo pipefail

# Installs (idempotently) the daily DB backup cron on the Lightsail instance.
# Runs at 1am Eastern; CRON_TZ handles DST automatically.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_SCRIPT="$REPO_DIR/scripts/backup-db.sh"
CRON_TZ="America/New_York"
CRON_LINE="0 1 * * * $BACKUP_SCRIPT >> $REPO_DIR/backup-db.log 2>&1"

# 1. Ensure AWS CLI is installed
if ! command -v aws >/dev/null 2>&1; then
  echo "==> Installing AWS CLI (snap)"
  sudo snap install aws-cli --classic
fi

# 2. Make the backup script executable
chmod +x "$BACKUP_SCRIPT"

# 3. Add CRON_TZ if missing
if ! crontab -l 2>/dev/null | grep -q '^CRON_TZ='; then
  ( crontab -l 2>/dev/null; echo "CRON_TZ=$CRON_TZ" ) | crontab -
fi

# 4. Add the backup job if missing
if ! crontab -l 2>/dev/null | grep -q 'backup-db.sh'; then
  ( crontab -l 2>/dev/null; echo "$CRON_LINE" ) | crontab -
fi

echo "==> Cron installed. Current crontab:"
crontab -l
