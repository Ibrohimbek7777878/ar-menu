#!/usr/bin/env bash
# Bazani zaxira nusxadan tiklash (TZ: R9-5). DIQQAT: joriy bazadagi ma'lumotlar o'rniga zaxiradagi qo'yiladi.
#   ./deploy/scripts/restore.sh deploy/backups/db_daily_20261022_033000.dump [--yes]
. "$(dirname "${BASH_SOURCE[0]}")/common.sh"

DUMP="${1:-}"; shift || true
YES=0; [ "${1:-}" = "--yes" ] && YES=1
[ -f "$DUMP" ] || { echo "Dump fayli topilmadi: $DUMP"; exit 1; }
if [ -f "$DUMP.sha256" ]; then (cd "$(dirname "$DUMP")" && sha256sum -c "$(basename "$DUMP").sha256") || { echo "Nazorat summasi mos kelmadi — fayl buzilgan"; exit 1; }; fi

if [ "$YES" != 1 ]; then
    read -r -p "'${POSTGRES_DB}' bazasi $(basename "$DUMP") bilan ALMASHTIRILADI. Davom etamizmi? [yes/NO] " ans
    [ "$ans" = "yes" ] || { echo "To'xtatildi"; exit 1; }
fi

log "Veb va ishchi to'xtatilmoqda (yozuv bo'lmasin)..."
dc stop web worker
log "Tiklanmoqda..."
dc exec -T db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner < "$DUMP"
log "Veb va ishchi qayta ishga tushirilmoqda..."
dc start web worker
log "Tiklandi."
alert "♻️ Baza tiklandi: $(basename "$DUMP")"
