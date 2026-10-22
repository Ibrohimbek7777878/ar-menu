#!/usr/bin/env bash
# Lokal noutbukda restoran 3D menyu: server (8001-port) + fon ishchilari (bildirishnoma + taom 3D). Tunnel yo'q.
# TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_LOKAL_RASMDAN_3D_MENYU_2026-10-16.md (8-qadam)
#
# Ishlatish:   ./start_local.sh            (to'xtatish: Ctrl+C — server ham, ishchi ham to'xtaydi)
#              PORT=8005 ./start_local.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
PY="$BACKEND/venv/bin/python"
PORT="${PORT:-8001}"

if [ ! -x "$PY" ]; then
  echo "Xato: $PY topilmadi. Avval: cd backend && python3 -m venv venv && venv/bin/pip install -r requirements.txt" >&2
  exit 1
fi

cd "$BACKEND"
"$PY" manage.py check >/dev/null

LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
# Stol QR havolasi (doimiy tasodifiy token): ?table=1 raqami bilan kirish faqat DEMO_MODE'da ishlaydi
QR_PATH="$("$PY" manage.py shell -c "from tables_restaurant.models import Table; t=Table.objects.filter(is_active=True).order_by('id').first(); print(t.qr_path if t else '/menu/')" 2>/dev/null | tail -1)"
QR_PATH="${QR_PATH:-/menu/}"
echo "────────────────────────────────────────────────────────────"
echo " Restoran 3D menyu — lokal rejim"
echo "  Noutbukda:   http://127.0.0.1:${PORT}${QR_PATH}"
[ -n "$LAN_IP" ] && echo "  Telefonda:   http://${LAN_IP}:${PORT}${QR_PATH}   (bitta Wi-Fi tarmog'ida)"
echo "  Admin:       http://127.0.0.1:${PORT}/seller/login/"
echo "────────────────────────────────────────────────────────────"

# Fon ishchilari (Telegram xabarlar + taom 3D) fonda; skript tugaganda (Ctrl+C) ular ham to'xtatiladi
"$PY" manage.py run_workers &
WORKER_PID=$!
trap 'kill "$WORKER_PID" 2>/dev/null || true' EXIT INT TERM

DJANGO_PRODUCT=restaurant "$PY" manage.py runserver "0.0.0.0:${PORT}"
