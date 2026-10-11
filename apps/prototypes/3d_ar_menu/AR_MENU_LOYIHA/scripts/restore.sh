#!/bin/bash
# restore.sh — DB ni tiklash
set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "Ishlatish: ./restore.sh <backup_file.dump>"
    exit 1
fi

BACKUP_FILE="$1"
DB_NAME="${DB_NAME:-armenu_db}"
DB_USER="${DB_USER:-ibrohim}"

# 1. Fayl mavjudligi va hajmini tekshirish (bazani tozalashdan oldin!)
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ XATO: Backup fayli topilmadi: $BACKUP_FILE"
    exit 1
fi

if [ ! -s "$BACKUP_FILE" ]; then
    echo "❌ XATO: Backup fayli bo'sh (0 bayt): $BACKUP_FILE"
    exit 1
fi

# 2. pg_restore yordamida fayl formatini tekshirish
if ! pg_restore --list "$BACKUP_FILE" >/dev/null 2>&1; then
    echo "❌ XATO: $BACKUP_FILE yaroqli PostgreSQL dump fayli emas!"
    exit 1
fi

echo "⚠️  DIQQAT: $DB_NAME bazasi o'chiriladi va $BACKUP_FILE dan qayta tiklanadi!"
read -p "Haqiqatan ham davom etasizmi? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Bekor qilindi."
    exit 0
fi

dropdb -U "$DB_USER" "$DB_NAME" --if-exists
createdb -U "$DB_USER" "$DB_NAME"
pg_restore -U "$DB_USER" -d "$DB_NAME" "$BACKUP_FILE"

echo "✅ DB tiklandi: $DB_NAME"
