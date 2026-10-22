#!/usr/bin/env bash
# Zaxira nusxani HAQIQATAN tiklab ko'rish (TZ: R9-5 "tiklash sinovi"): oxirgi dump vaqtinchalik bazaga tiklanadi,
# asosiy jadvallar tekshiriladi, baza o'chiriladi. Asosiy baza tegilmaydi.
#   ./deploy/scripts/verify_backup.sh [dump]      # cron: haftada bir marta tavsiya etiladi
. "$(dirname "${BASH_SOURCE[0]}")/common.sh"

DUMP="${1:-$(ls -1t "$BACKUP_DIR"/db_*.dump 2>/dev/null | head -1)}"
[ -n "$DUMP" ] && [ -f "$DUMP" ] || { echo "Tekshiriladigan dump topilmadi"; alert "❌ Zaxira sinovi: dump yo'q"; exit 1; }
if [ -f "$DUMP.sha256" ]; then (cd "$(dirname "$DUMP")" && sha256sum -c "$(basename "$DUMP").sha256" >/dev/null) || { alert "❌ Zaxira sinovi: nazorat summasi mos emas ($(basename "$DUMP"))"; exit 1; }; fi

SCRATCH="verify_$(date +%s)"
cleanup() { dc exec -T db psql -U "$POSTGRES_USER" -d postgres -qc "DROP DATABASE IF EXISTS ${SCRATCH}" >/dev/null 2>&1 || true; }
trap cleanup EXIT

log "Vaqtinchalik baza: $SCRATCH <- $(basename "$DUMP")"
dc exec -T db psql -U "$POSTGRES_USER" -d postgres -qc "CREATE DATABASE ${SCRATCH}"
dc exec -T db pg_restore -U "$POSTGRES_USER" -d "$SCRATCH" --no-owner < "$DUMP" 2>"$STATE_DIR/verify.err" || true

q() { dc exec -T db psql -U "$POSTGRES_USER" -d "$SCRATCH" -Atc "$1" 2>/dev/null | tr -d '[:space:]'; }
TABLES="$(q "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
MIGRATIONS="$(q "SELECT count(*) FROM django_migrations")"
USERS="$(q "SELECT count(*) FROM admin_users")"
ORDERS="$(q "SELECT count(*) FROM orders")"
SHOPS="$(q "SELECT count(*) FROM shops")"
log "Tiklandi: jadvallar=$TABLES migratsiyalar=$MIGRATIONS xodimlar=$USERS do'konlar=$SHOPS buyurtmalar=$ORDERS"

# Mantiqiy tekshiruv: jadvallar bor, migratsiyalar bor va asosiy jadvallar o'qiladi
if [ "${TABLES:-0}" -gt 20 ] && [ "${MIGRATIONS:-0}" -gt 50 ] && [ -n "$USERS" ] && [ -n "$ORDERS" ] && [ -n "$SHOPS" ]; then
    log "ZAXIRA SOG'LOM ✓ ($(basename "$DUMP"))"
    echo "$(date +%s)" > "$STATE_DIR/last_verified"
else
    log "ZAXIRA NOSOZ ✗ — $(head -c 300 "$STATE_DIR/verify.err" 2>/dev/null)"
    alert "❌ Zaxira tiklab bo'lmadi: $(basename "$DUMP")"
    exit 1
fi
