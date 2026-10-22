#!/usr/bin/env bash
# Bitta buyruq bilan joylashtirish (TZ: R9-7).
#   ./deploy/scripts/deploy.sh            # joriy kodni quradi va ishga tushiradi
# Oldingi muvaffaqiyatli rasm saqlanadi: yangisi sog'lom bo'lmasa, avtomatik orqaga qaytariladi.
. "$(dirname "${BASH_SOURCE[0]}")/common.sh"

[ -f "$DEPLOY_DIR/.env" ] || { echo "deploy/.env topilmadi: .env.production.example dan nusxa oling"; exit 1; }
cd "$REPO_DIR"

TAG="$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)"
if [ -n "$(git status --porcelain 2>/dev/null | grep -v '^??' || true)" ]; then
    TAG="${TAG}-dirty-$(date +%m%d%H%M%S)"      # har deploy'ga noyob teg (aks holda orqaga qaytish yangi rasmga ishora qilardi)
    log "OGOHLANTIRISH: commit qilinmagan o'zgarishlar bor — rasm aynan joriy fayllardan quriladi (teg: ${TAG})"
fi

PREVIOUS="$(cat "$STATE_DIR/current" 2>/dev/null || true)"
log "Quriladi: guliston-app:${TAG} (oldingisi: ${PREVIOUS:-yoq})"
APP_TAG="$TAG" dc build

# Zaxira: migratsiyadan oldin bazaning nusxasi (xato bo'lsa qo'lda tiklanadi)
if dc ps --status running db 2>/dev/null | grep -q db; then
    log "Migratsiyadan oldin zaxira nusxa..."
    "$SCRIPT_DIR/backup.sh" --label pre-deploy || log "OGOHLANTIRISH: zaxira olinmadi"
fi

log "Ishga tushirilmoqda..."
# `up` yangi versiya sog'lom bo'lmasa (caddy web'ga bog'liq) xato bilan chiqadi — bu rollback'ga o'tish kerakligini bildiradi,
# skriptni to'xtatish emas
if ! APP_TAG="$TAG" dc up -d --remove-orphans; then log "up xato bilan tugadi (yangi versiya sog'lom emas)"; fi

# Sog'lomlikni kutish (web konteyner health-check + tashqi manzil). Ketma-ket 'unhealthy' bo'lsa ortiqcha kutilmaydi.
ok=0
for i in $(seq 1 40); do
    status="$(docker inspect -f '{{.State.Health.Status}}' "$(dc ps -q web)" 2>/dev/null || echo starting)"
    if [ "$status" = "healthy" ]; then ok=1; break; fi
    if [ "$status" = "unhealthy" ]; then break; fi
    sleep 3
done

if [ "$ok" = 1 ] && curl -fsSk -m 10 "$(site_url)/health/" >/dev/null 2>&1; then
    [ -n "$PREVIOUS" ] && echo "$PREVIOUS" > "$STATE_DIR/previous"
    echo "$TAG" > "$STATE_DIR/current"
    log "Tayyor: $(site_url)  (teg ${TAG})"
    alert "✅ Deploy muvaffaqiyatli: ${TAG}"
else
    log "XATO: yangi versiya sog'lom emas."
    alert "❌ Deploy muvaffaqiyatsiz (${TAG}) — orqaga qaytarilmoqda"
    if [ -n "$PREVIOUS" ]; then
        "$SCRIPT_DIR/rollback.sh" --tag "$PREVIOUS" || true
    fi
    exit 1
fi
