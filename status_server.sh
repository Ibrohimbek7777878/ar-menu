#!/usr/bin/env bash
# ==============================================================================
# Online Store Guliston — Noutbuk Server Holatini Tekshirish
# ==============================================================================
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$DIR/backend/logs/server_daemon.pid"
STATUS_FILE="$DIR/backend/logs/server_status.json"
LOG_FILE="$DIR/backend/logs/server_daemon.log"

echo "================================================================"
echo "📊 GULISTON NOUTBUK SERVER HOLATI"
echo "================================================================"

if [ ! -f "$PID_FILE" ]; then
    echo "❌ Server holati: TO'XTATILGAN (OFFLINE)"
    echo "👉 Ishga tushirish uchun: ./start_server.sh"
    exit 1
fi

DAEMON_PID=$(cat "$PID_FILE" 2>/dev/null || true)
if [ -z "$DAEMON_PID" ] || ! kill -0 "$DAEMON_PID" 2>/dev/null; then
    echo "❌ Server holati: TO'XTATILGAN (PID $DAEMON_PID topilmadi)"
    echo "👉 Ishga tushirish uchun: ./start_server.sh"
    exit 1
fi

URL=""
GUNICORN_PID=""
CLOUDFLARED_PID=""

if [ -f "$STATUS_FILE" ]; then
    URL=$("$DIR/backend/venv/bin/python" -c "import json; print(json.load(open('$STATUS_FILE')).get('url', ''))" 2>/dev/null || true)
    GUNICORN_PID=$("$DIR/backend/venv/bin/python" -c "import json; print(json.load(open('$STATUS_FILE')).get('gunicorn_pid', ''))" 2>/dev/null || true)
    CLOUDFLARED_PID=$("$DIR/backend/venv/bin/python" -c "import json; print(json.load(open('$STATUS_FILE')).get('cloudflared_pid', ''))" 2>/dev/null || true)
fi

echo "🟢 Server holati: ISHLAMOQDA (ACTIVE / ONLINE)"
echo "🆔 Daemon PID:     $DAEMON_PID"

if [ -n "$GUNICORN_PID" ] && kill -0 "$GUNICORN_PID" 2>/dev/null; then
    echo "⚙️ Gunicorn:        Faol (PID: $GUNICORN_PID)"
else
    echo "⚠️ Gunicorn:        Yuklanmoqda / to'xtagan"
fi

if [ -n "$CLOUDFLARED_PID" ] && kill -0 "$CLOUDFLARED_PID" 2>/dev/null; then
    echo "🌐 Cloudflared:     Faol (PID: $CLOUDFLARED_PID)"
else
    echo "⚠️ Cloudflared:     Yuklanmoqda / to'xtagan"
fi

echo "----------------------------------------------------------------"
if [ -n "$URL" ] && [[ "$URL" =~ ^https:// ]]; then
    echo "🔗 Asosiy Domen:      $URL"
    echo "🛍 Telegram Mini App:  $URL/tma/"
    echo "🥽 3D / AR Menyu:    $URL/ar/"
    echo "⚙️ Admin Panel:      $URL/admin/"
    echo "🤖 Telegram Bot:     https://t.me/marketing_orign_bot"
else
    echo "⏳ Cloudflare Tunnel ulanmoqda... (10 soniyadan so'ng yana tekshiring)"
fi
echo "----------------------------------------------------------------"

echo "💻 Resurs sarfi (CPU / RAM):"
PIDS_TO_SHOW=""
for p in "$DAEMON_PID" "$GUNICORN_PID" "$CLOUDFLARED_PID"; do
    if [ -n "$p" ] && kill -0 "$p" 2>/dev/null; then
        PIDS_TO_SHOW="${PIDS_TO_SHOW}${PIDS_TO_SHOW:+,}$p"
    fi
done

if [ -n "$PIDS_TO_SHOW" ]; then
    ps -o pid,user,%cpu,%mem,cmd -p "$PIDS_TO_SHOW" 2>/dev/null || true
fi
echo "================================================================"
