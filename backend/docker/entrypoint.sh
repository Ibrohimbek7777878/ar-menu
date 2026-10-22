#!/bin/sh
# Konteyner kirish nuqtasi: `web` (migratsiya + statika + gunicorn) yoki `worker` (bildirishnoma va 3D ishchi).
set -eu

role="${1:-web}"

wait_for_db() {
    python - <<'PY'
import os, sys, time
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from django.db import connection
for attempt in range(60):
    try:
        connection.ensure_connection()
        sys.exit(0)
    except Exception as exc:
        print(f'[entrypoint] baza kutilmoqda ({attempt + 1}/60): {exc}', flush=True)
        time.sleep(2)
sys.exit('[entrypoint] baza javob bermadi')
PY
}

case "$role" in
    web)
        wait_for_db
        python manage.py migrate --noinput
        python manage.py collectstatic --noinput
        exec gunicorn -c gunicorn.conf.py backend.wsgi:application
        ;;
    worker)
        wait_for_db
        # Migratsiyani web bajaradi; ishchi u tugaguncha kutadi (yangi sxemada ishlamasligi uchun)
        until python manage.py migrate --check >/dev/null 2>&1; do
            echo '[entrypoint] migratsiyalar kutilmoqda...'; sleep 3
        done
        exec python manage.py run_workers
        ;;
    *)
        exec "$@"
        ;;
esac
