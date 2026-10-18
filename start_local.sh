#!/usr/bin/env bash
# Lokal noutbukda restoran 3D menyu: server (8001-port) + taom rasmidan 3D ishchisi. Tunnel yo'q.
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
echo "────────────────────────────────────────────────────────────"
echo " Restoran 3D menyu — lokal rejim"
echo "  Noutbukda:   http://127.0.0.1:${PORT}/menu/?table=1"
[ -n "$LAN_IP" ] && echo "  Telefonda:   http://${LAN_IP}:${PORT}/menu/?table=1   (bitta Wi-Fi tarmog'ida)"
echo "  Admin:       http://127.0.0.1:${PORT}/seller/login/"
echo "────────────────────────────────────────────────────────────"

# 3D ishchi fonda; skript tugaganda (Ctrl+C) u ham to'xtatiladi
"$PY" manage.py run_3d_worker &
WORKER_PID=$!
trap 'kill "$WORKER_PID" 2>/dev/null || true' EXIT INT TERM

DJANGO_PRODUCT=restaurant "$PY" manage.py runserver "0.0.0.0:${PORT}"
