#!/usr/bin/env bash
# ==============================================================================
# Online Store Guliston — Noutbuk Serverini To'xtatish
# ==============================================================================
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$DIR/backend/logs/server_daemon.pid"

echo "🛑 Guliston Noutbuk Server to'xtatilmoqda..."

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill -TERM "$PID" 2>/dev/null || true
        for i in {1..5}; do
            if ! kill -0 "$PID" 2>/dev/null; then
                break
            fi
            sleep 1
        done
        # Agar hali ham o'lmagan bo'lsa
        if kill -0 "$PID" 2>/dev/null; then
            kill -KILL "$PID" 2>/dev/null || true
        fi
    fi
    rm -f "$PID_FILE"
fi

# Gunicorn va Cloudflared ni ham majburiy tozalash
pkill -f "laptop_server_daemon.py" 2>/dev/null || true
pkill -f "gunicorn.*backend.wsgi" 2>/dev/null || true
pkill -f "cloudflared.*tunnel" 2>/dev/null || true
fuser -k 8000/tcp 2>/dev/null || true

echo "✅ Server to'liq to'xtatildi."
