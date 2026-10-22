#!/usr/bin/env bash
# Zaxira nusxa: PostgreSQL dump + media (TZ: R9-5).
#   ./deploy/scripts/backup.sh [--label nom]
# Saqlash: kunlik nusxalar 7 kun, haftalik (yakshanba) nusxalar 5 hafta; "pre-deploy" nusxalar 14 kun.
# Cron (har kuni 03:30):   30 3 * * *  /srv/guliston/deploy/scripts/backup.sh >> /var/log/guliston-backup.log 2>&1
. "$(dirname "${BASH_SOURCE[0]}")/common.sh"

LABEL="daily"
while [ $# -gt 0 ]; do case "$1" in --label) LABEL="$2"; shift 2;; *) echo "noma'lum argument: $1"; exit 2;; esac; done
STAMP="$(date +%Y%m%d_%H%M%S)"
DB_FILE="$BACKUP_DIR/db_${LABEL}_${STAMP}.dump"
MEDIA_FILE="$BACKUP_DIR/media_${LABEL}_${STAMP}.tar.gz"

log "Baza dump: $DB_FILE"
dc exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$DB_FILE.partial"
# Bo'sh yoki buzilgan fayl "muvaffaqiyatli zaxira" bo'lib qolmasin
[ "$(stat -c %s "$DB_FILE.partial")" -gt 1000 ] || { rm -f "$DB_FILE.partial"; alert "❌ Zaxira: dump bo'sh"; echo "dump bo'sh"; exit 1; }
mv "$DB_FILE.partial" "$DB_FILE"

# Hajm hali yo'q bo'lsa (birinchi ishga tushirishdan oldin) uni yaratmaymiz: alpine o'z /media papkasi bilan to'ldirib,
# root egasi qilib qo'yardi. `volume-nocopy` ham shuning uchun.
if [ "$LABEL" != "pre-deploy" ] && docker volume inspect guliston_media >/dev/null 2>&1; then
    log "Media arxivi: $MEDIA_FILE"
    docker run --rm --user "$(id -u):$(id -g)" --mount type=volume,src=guliston_media,dst=/media,readonly,volume-nocopy \
        -v "$BACKUP_DIR":/backup alpine \
        tar czf "/backup/$(basename "$MEDIA_FILE")" -C /media . 2>/dev/null || log "OGOHLANTIRISH: media arxivi olinmadi"
fi

sha256sum "$DB_FILE" > "$DB_FILE.sha256"

# Saqlash siyosati
python3 - "$BACKUP_DIR" <<'PY'
import os, sys, time, datetime
d = sys.argv[1]
now = time.time()
for name in os.listdir(d):
    path = os.path.join(d, name)
    if not os.path.isfile(path):
        continue
    age_days = (now - os.path.getmtime(path)) / 86400
    base = name.split('.')[0]
    parts = base.split('_')
    if len(parts) < 4:
        continue
    kind, stamp = parts[1], parts[2]
    try:
        day = datetime.datetime.strptime(stamp, '%Y%m%d')
    except ValueError:
        continue
    keep = 7 if kind == 'daily' else 14 if kind == 'pre-deploy' else 35
    if kind == 'daily' and day.weekday() == 6:          # yakshanba nusxasi 5 hafta saqlanadi
        keep = 35
    if age_days > keep:
        os.remove(path)
        print('o\'chirildi (eskirgan):', name)
PY

SIZE="$(du -h "$DB_FILE" | cut -f1)"
log "Zaxira tayyor: $(basename "$DB_FILE") ($SIZE)"
echo "$DB_FILE" > "$STATE_DIR/last_backup"
