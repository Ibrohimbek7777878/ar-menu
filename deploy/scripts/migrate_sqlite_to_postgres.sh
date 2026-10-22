#!/usr/bin/env bash
# SQLite'dagi ma'lumotni (masalan lokal sinov bazasini) production PostgreSQL'ga ko'chirish (TZ: R9-1).
#   ./deploy/scripts/migrate_sqlite_to_postgres.sh /yo'l/db.sqlite3
# DIQQAT: production'da odatda KERAK EMAS — haqiqiy restoran `create_restaurant` bilan toza ochiladi (R9-8); test
# buyurtmalari ko'chirilmaydi. Bu skript faqat saqlab qolish kerak bo'lgan ma'lumot (taomlar, modellar) uchun.
. "$(dirname "${BASH_SOURCE[0]}")/common.sh"

SQLITE="${1:-}"
[ -f "$SQLITE" ] || { echo "SQLite fayli topilmadi: $SQLITE"; exit 1; }
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

log "1/3 SQLite'dan eksport (contenttypes/permissions/sessions chiqarib tashlanadi)..."
(cd "$REPO_DIR/backend" && DJANGO_SKIP_DOTENV=1 DEBUG=True DATABASE_URL="sqlite:///$SQLITE" \
    "${PYTHON:-python3}" manage.py dumpdata --natural-foreign --natural-primary \
    --exclude contenttypes --exclude auth.permission --exclude sessions --exclude admin.logentry \
    --exclude notifications.outboxevent --indent 1 -o "$TMP/data.json")
log "   $(du -h "$TMP/data.json" | cut -f1) eksport qilindi"

log "2/3 PostgreSQL'da sxema (migrate) tayyorlanmoqda..."
dc run --rm -T web python manage.py migrate --noinput

log "3/3 Import..."
# stdin orqali (docker cp fayli root egaligida bo'lib, `app` foydalanuvchisi uni o'chira olmasdi)
dc exec -T web sh -c 'cat > /tmp/data.json' < "$TMP/data.json"
dc exec -T web python manage.py loaddata /tmp/data.json
dc exec -T web rm -f /tmp/data.json
log "Tayyor. Tekshiring: docker compose exec web python manage.py shell -c \"from django.db import connection; print(connection.vendor)\""
