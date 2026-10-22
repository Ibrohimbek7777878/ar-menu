#!/usr/bin/env bash
# Oldingi versiyaga qaytish (TZ: R9-7).
#   ./deploy/scripts/rollback.sh               # saqlangan oldingi tegga
#   ./deploy/scripts/rollback.sh --tag abc1234 # aniq tegga
# Eslatma: DB migratsiyalari orqaga qaytarilmaydi. Sxemani o'zgartirgan deploy'dan keyin kerak bo'lsa —
# `./deploy/scripts/restore.sh <deploy-oldidan olingan dump>` (pre-deploy zaxira).
. "$(dirname "${BASH_SOURCE[0]}")/common.sh"

TAG=""
while [ $# -gt 0 ]; do case "$1" in --tag) TAG="$2"; shift 2;; *) echo "noma'lum argument: $1"; exit 2;; esac; done
TAG="${TAG:-$(cat "$STATE_DIR/previous" 2>/dev/null || true)}"
[ -n "$TAG" ] || { echo "Qaytiladigan versiya topilmadi (deploy/.state/previous bo'sh)"; exit 1; }
docker image inspect "guliston-app:${TAG}" >/dev/null 2>&1 || { echo "guliston-app:${TAG} rasmi mavjud emas"; exit 1; }

log "Orqaga qaytilmoqda: guliston-app:${TAG}"
APP_TAG="$TAG" dc up -d --no-build --no-deps web worker
sleep 8
if curl -fsSk -m 10 "$(site_url)/health/" >/dev/null 2>&1; then
    echo "$TAG" > "$STATE_DIR/current"
    log "Qaytarildi: ${TAG}"
    alert "↩️ Orqaga qaytarildi: ${TAG}"
else
    log "XATO: qaytarilgan versiya ham javob bermayapti — loglarni ko'ring: docker compose logs web"
    alert "🚨 Orqaga qaytarish ham muvaffaqiyatsiz (${TAG})!"
    exit 1
fi
