#!/usr/bin/env bash
# ==============================================================================
# Online Store Guliston — 3 Ta Mustaqil Mahsulot Server Holati
# ==============================================================================
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$DIR/backend/logs/server_daemon.pid"
STATUS_FILE="$DIR/backend/logs/server_status.json"

echo "================================================================"
echo "📊 GULISTON 3 TA MUSTAQIL MAHSULOT SERVER HOLATI"
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

echo "🟢 Server holati: ISHLAMOQDA (ACTIVE / ONLINE)"
echo "🆔 Daemon Master PID: $DAEMON_PID"
echo "----------------------------------------------------------------"

if [ -f "$STATUS_FILE" ]; then
    "$DIR/backend/venv/bin/python" - << 'EOF'
import json, sys

try:
    with open('backend/logs/server_status.json', 'r') as f:
        data = json.load(f)
    products = data.get('products', {})

    icons = {
        'restaurant': '🍽',
        'market': '🛍',
        'studio': '🖨'
    }

    for key, p in products.items():
        icon = icons.get(key, '📦')
        name = p.get('name', key.upper())
        port = p.get('port', '')
        g_pid = p.get('gunicorn_pid')
        c_pid = p.get('cloudflared_pid')
        local = p.get('local_url', f"http://127.0.0.1:{port}/")
        tunnel = p.get('tunnel_url') or "⏳ Tunnel ulanmoqda..."

        g_status = f"Faol (PID: {g_pid})" if g_pid else "Yuklanmoqda / to'xtagan"
        c_status = f"Faol (PID: {c_pid})" if c_pid else "Yuklanmoqda / to'xtagan"

        print(f"{icon} [{key.upper()}] {name}")
        print(f"   📍 Port:           {port} (Gunicorn: {g_status})")
        print(f"   🏠 Mahalliy URL:   {local}")
        print(f"   🌐 Global URL:     {tunnel}")
        if key == 'restaurant':
            print(f"   🤖 Telegram Bot:   https://t.me/marketing_orign_bot")
        print("----------------------------------------------------------------")
except Exception as e:
    print(f"Status ko'rsatishda xatolik: {e}")
EOF
else
    echo "⏳ Status fayli yuklanmoqda... Bir necha soniyadan so'ng qayta tekshiring."
fi

echo "💻 Resurs sarfi (CPU / RAM):"
ps -o pid,user,%cpu,%mem,cmd -p "$DAEMON_PID" 2>/dev/null || true
echo "================================================================"
