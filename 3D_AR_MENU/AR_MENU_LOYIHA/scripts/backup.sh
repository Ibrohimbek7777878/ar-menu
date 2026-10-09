#!/bin/bash
# backup.sh — DB + media backup (haftalik crontab)
set -euo pipefail

BACKUP_DIR="/opt/armenu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="${DB_NAME:-armenu_db}"
DB_USER="${DB_USER:-ibrohim}"

mkdir -p "$BACKUP_DIR"

# DB backup
pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc -f "$BACKUP_DIR/db_$DATE.dump"

# Media backup (ixtiyoriy)
if [ -d "/opt/armenu/media" ]; then
    tar czf "$BACKUP_DIR/media_$DATE.tar.gz" -C /opt/armenu media/
fi

# Eski backuplarni tozalash (30 kundan eski)
find "$BACKUP_DIR" -name "*.dump" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

echo "✅ Backup tayyor: $BACKUP_DIR (date=$DATE)"
