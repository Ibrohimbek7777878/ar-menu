#!/usr/bin/env bash
# ==============================================================================
# Online Store Guliston — Noutbuk Doimiy Serverini Ishga Tushirish
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$DIR/backend/logs/server_daemon.pid"
STATUS_FILE="$DIR/backend/logs/server_status.json"
LOG_FILE="$DIR/backend/logs/server_daemon.log"

# Agar server allaqachon ishlayotgan bo'lsa
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "⚠️ Server allaqachon ishlab turibdi (PID: $PID)!"
        "$DIR/status_server.sh"
        exit 0
    else
        rm -f "$PID_FILE"
    fi
fi

echo "================================================================"
echo "🚀 Guliston Noutbuk Server ishga tushirilmoqda..."
echo "================================================================"

# Orqa fonda (detached background) to'liq mustaqil ishga tushirish
# Bu jarayon GNOME yoki Niri terminali yopilsa ham to'xtamaydi
nohup "$DIR/backend/venv/bin/python" "$DIR/backend/scripts/laptop_server_daemon.py" > /dev/null 2>&1 &
DAEMON_PID=$!

echo "⏳ Server va Cloudflare Tunnel ulanishi kutilmoqda (5-10 soniya)..."

# Tunnel URL tayyor bo'lishini kutish (maksimal 15 soniya)
for i in {1..15}; do
    sleep 1
    if [ -f "$STATUS_FILE" ]; then
        URL=$(grep -o '"url": *"[^"]*"' "$STATUS_FILE" | cut -d'"' -f4 || true)
        if [[ "$URL" =~ ^https://.*trycloudflare\.com ]]; then
            break
        fi
    fi
done

echo ""
"$DIR/status_server.sh"
