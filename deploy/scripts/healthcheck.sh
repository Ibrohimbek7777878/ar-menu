#!/usr/bin/env bash
# Tashqi monitoring (TZ: R9-6): /health/ ni tekshiradi, ketma-ket 2 marta nosoz bo'lsa Telegram'ga xabar yuboradi,
# tiklanganda "ishga tushdi" xabarini yuboradi. Fon ishchi to'xtab navbat to'planib qolsa ham ogohlantiradi.
# Cron (har daqiqa):   * * * * *  /srv/guliston/deploy/scripts/healthcheck.sh
. "$(dirname "${BASH_SOURCE[0]}")/common.sh"

STATE="$STATE_DIR/health_failures"
FAILS="$(cat "$STATE" 2>/dev/null || echo 0)"
URL="$(site_url)/health/"
BODY="$(curl -fsSk -m 10 "$URL" 2>/dev/null || true)"

problem=""
if [ -z "$BODY" ]; then
    problem="sayt javob bermayapti ($URL)"
else
    status="$(printf '%s' "$BODY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("status",""))' 2>/dev/null || echo "")"
    [ "$status" = "healthy" ] || problem="holat: ${status:-nomalum}"
    # Bildirishnoma navbati to'planib qolgan (ishchi ishlamayapti)
    backlog="$(printf '%s' "$BODY" | python3 -c 'import sys,json; o=json.load(sys.stdin).get("services",{}).get("outbox",{}); print(o.get("oldest_pending_seconds") or 0)' 2>/dev/null || echo 0)"
    if [ "${backlog%.*}" -gt 300 ] 2>/dev/null; then problem="${problem:+$problem; }bildirishnoma navbati ${backlog}s to'planib qoldi (ishchi ishlayaptimi?)"; fi
fi

if [ -n "$problem" ]; then
    FAILS=$((FAILS + 1)); echo "$FAILS" > "$STATE"
    log "NOSOZ ($FAILS): $problem"
    if [ "$FAILS" -eq 2 ]; then alert "🚨 ${DOMAIN}: ${problem}"; fi
else
    if [ "$FAILS" -ge 2 ]; then alert "✅ ${DOMAIN}: qayta ishlayapti"; fi
    echo 0 > "$STATE"
fi
exit 0
