#!/usr/bin/env bash
# Umumiy yordamchilar (deploy skriptlari source qiladi).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd "$DEPLOY_DIR/.." && pwd)"
STATE_DIR="$DEPLOY_DIR/.state"
BACKUP_DIR="${BACKUP_DIR:-$DEPLOY_DIR/backups}"
mkdir -p "$STATE_DIR" "$BACKUP_DIR"

# deploy/.env qiymatlari yuklanadi, lekin allaqachon berilgan muhit o'zgaruvchisini (masalan sinov uchun
# `TELEGRAM_API_BASE=... ./healthcheck.sh`) bosib ketmaydi
if [ -f "$DEPLOY_DIR/.env" ]; then
    while IFS='=' read -r _k _v; do
        [[ "$_k" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
        [ -n "${!_k+x}" ] || export "$_k=$_v"
    done < "$DEPLOY_DIR/.env"
fi

dc() { docker compose -f "$DEPLOY_DIR/docker-compose.yml" --project-directory "$DEPLOY_DIR" "$@"; }

log() { printf '[%s] %s\n' "$(date '+%F %T')" "$*"; }

# Telegram orqali egasiga xabar (ALERT_TELEGRAM_CHAT_ID va TELEGRAM_BOT_TOKEN berilgan bo'lsa); xato skriptni to'xtatmaydi
alert() {
    local text="$1"
    [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${ALERT_TELEGRAM_CHAT_ID:-}" ] || return 0
    curl -fsS -m 10 "${TELEGRAM_API_BASE:-https://api.telegram.org}/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        --data-urlencode "chat_id=${ALERT_TELEGRAM_CHAT_ID}" \
        --data-urlencode "text=${text}" >/dev/null 2>&1 || true
}

# Bu serverning tashqi manzili (health tekshiruvi): standart — Caddy orqali https://DOMAIN, lokal sinovda HTTPS_PORT
site_url() {
    local port="${HTTPS_PORT:-443}"
    if [ "$port" = "443" ]; then echo "https://${DOMAIN}"; else echo "https://${DOMAIN}:${port}"; fi
}
