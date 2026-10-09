#!/bin/bash
# Cursor yozgan kodni avtomatik tekshiradi.
# Ishlatilishi:  bash tekshir_kod.sh /home/user/armenu

PROJ="${1:-/home/user/armenu}"
cd "$PROJ" 2>/dev/null || { echo "❌ Loyiha topilmadi: $PROJ"; exit 1; }

FAIL=0; WARN=0
ok()   { echo "  ✅ $1"; }
no()   { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
warn() { echo "  ⚠️  $1"; WARN=$((WARN+1)); }

echo "═══════════════════════════════════════════════════════"
echo "  ARMENU — KOD TEKSHIRUVI"
echo "  Loyiha: $PROJ"
echo "═══════════════════════════════════════════════════════"

# ─────────────────────────────────────────────────────────
echo
echo "1️⃣  PLACEHOLDER (⛔ taqiq #5)"
P=$(grep -rn "TODO\|FIXME\|XXX:\|shu yerga yozing\|implement later" \
      --include="*.py" --include="*.js" apps/ core/ static/ 2>/dev/null | wc -l)
if [ "$P" -eq 0 ]; then ok "placeholder yo'q"
else
  no "$P ta placeholder topildi:"
  grep -rn "TODO\|FIXME\|shu yerga yozing" --include="*.py" --include="*.js" \
    apps/ core/ static/ 2>/dev/null | head -8 | sed 's/^/       /'
fi

# Bo'sh funksiya (pass yoki ...)
E=$(grep -rn -B1 "^\s*\(pass\|\.\.\.\)\s*$" --include="*.py" apps/ core/ 2>/dev/null \
    | grep -c "def " || true)
[ "${E:-0}" -le 3 ] && ok "bo'sh funksiya yo'q (abstract'lardan tashqari)" \
                    || warn "${E} ta bo'sh funksiya (abstract bo'lishi mumkin)"

# ─────────────────────────────────────────────────────────
echo
echo "2️⃣  IZOLYATSIYA (⛔ taqiq #1-4)"
M=$(grep -rn "mebelcity\|bittada-\|tenant_mebelcity" \
      --include="*.py" --include="*.conf" --include="*.service" \
      apps/ core/ config/ deploy/ 2>/dev/null | wc -l)
[ "$M" -eq 0 ] && ok "mebelcity'ga murojaat yo'q" || no "$M ta mebelcity murojaati!"

PORT=$(grep -rn "804[01]" --include="*.py" --include="*.conf" --include="*.service" \
         config/ deploy/ 2>/dev/null | wc -l)
[ "$PORT" -eq 0 ] && ok "band portlar ishlatilmagan" || no "8040/8041 port ishlatilgan!"

RDB=$(grep -rn "6379/[0-4]\b" --include="*.py" config/ 2>/dev/null | wc -l)
[ "$RDB" -eq 0 ] && ok "Redis db to'g'ri (5/6)" || no "Redis db=0..4 ishlatilgan!"

# ─────────────────────────────────────────────────────────
echo
echo "3️⃣  MULTI-TENANT (✅ qoida #1-2)"
# Har ViewSet TenantScopedMixin ishlatadimi
VS=$(grep -rn "class.*ViewSet" --include="*.py" apps/ 2>/dev/null | wc -l)
TS=$(grep -rn "TenantScopedMixin" --include="*.py" apps/ 2>/dev/null | wc -l)
if [ "$VS" -eq 0 ]; then
  warn "hali ViewSet yo'q"
elif [ "$TS" -ge $((VS / 2)) ]; then
  ok "ViewSet'lar tenant-scoped ($TS/$VS)"
else
  no "ViewSet'larning ko'pi tenant-scoped emas ($TS/$VS)"
  grep -rn "class.*ViewSet" --include="*.py" apps/ 2>/dev/null \
    | grep -v "TenantScoped" | head -5 | sed 's/^/       /'
fi

# Filtrlanmagan .objects.get/all
UF=$(grep -rn "\.objects\.\(get\|all\)(" --include="*.py" apps/ 2>/dev/null \
     | grep -v "restaurant" | grep -v "test" | grep -v "migrations" | wc -l)
[ "$UF" -le 5 ] && ok "filtrlanmagan so'rovlar kam ($UF)" \
                || warn "$UF ta filtrlanmagan .objects.get/all — tekshiring"

# ─────────────────────────────────────────────────────────
echo
echo "4️⃣  UI QOIDALARI (⛔ taqiq #10-11)"
if [ -d static ]; then
  HEX=$(grep -rn "#[0-9a-fA-F]\{6\}\b" --include="*.css" static/ 2>/dev/null \
        | grep -v "tokens.css\|theme.css\|:root" | wc -l)
  [ "$HEX" -le 10 ] && ok "hard-code rang kam ($HEX)" \
                    || no "$HEX ta hard-code rang (var(--*) ishlating)"

  # JS'da o'zbekcha hard-code matn (kirill yoki lotin)
  HC=$(grep -rn "textContent\s*=\s*['\"][A-Za-zА-Яа-я]" --include="*.js" static/ 2>/dev/null \
       | grep -v "t(" | wc -l)
  [ "$HC" -le 5 ] && ok "hard-code matn kam ($HC)" \
                  || no "$HC ta hard-code matn (t('kalit') ishlating)"
else
  warn "static/ hali yo'q"
fi

# ─────────────────────────────────────────────────────────
echo
echo "5️⃣  3 TIL"
if [ -d static/i18n ]; then
  for L in uz ru en; do
    [ -f "static/i18n/$L.json" ] && ok "$L.json mavjud" || no "$L.json yo'q"
  done
  if [ -f static/i18n/uz.json ] && [ -f static/i18n/ru.json ] && [ -f static/i18n/en.json ]; then
    python3 - <<'PY' 2>/dev/null
import json,sys
def flat(d,p=''):
    o={}
    for k,v in d.items():
        key=f'{p}.{k}' if p else k
        o.update(flat(v,key)) if isinstance(v,dict) else o.update({key:v})
    return o
try:
    u=flat(json.load(open('static/i18n/uz.json')))
    r=flat(json.load(open('static/i18n/ru.json')))
    e=flat(json.load(open('static/i18n/en.json')))
    if set(u)==set(r)==set(e):
        print("  ✅ 3 tilda kalitlar mos ({} ta)".format(len(u)))
    else:
        print("  ❌ kalitlar mos emas: ru yetishmaydi {}, en yetishmaydi {}".format(
              len(set(u)-set(r)), len(set(u)-set(e))))
except Exception as ex:
    print("  ⚠️  i18n tekshirib bo'lmadi:", ex)
PY
  fi
else
  warn "static/i18n/ hali yo'q"
fi

# ─────────────────────────────────────────────────────────
echo
echo "6️⃣  N+1 QUERY (✅ qoida #9)"
LOOP=$(grep -rn -A3 "for .* in .*\.objects\." --include="*.py" apps/ 2>/dev/null \
       | grep -c "\.\(table\|dish\|guest\|restaurant\|order\)\." || true)
SR=$(grep -rn "select_related\|prefetch_related" --include="*.py" apps/ 2>/dev/null | wc -l)
if [ "${LOOP:-0}" -eq 0 ]; then ok "N+1 belgisi yo'q"
elif [ "$SR" -ge "${LOOP:-0}" ]; then ok "select_related ishlatilgan ($SR)"
else warn "N+1 xavfi: ${LOOP} ta sikl, $SR ta select_related"; fi

# ─────────────────────────────────────────────────────────
echo
echo "7️⃣  UZOQ ISH → WORKER (⛔ taqiq #12)"
SY=$(grep -rn "requests\.\(get\|post\)" --include="*.py" apps/*/views.py 2>/dev/null | wc -l)
[ "$SY" -eq 0 ] && ok "view'da sinxron tashqi so'rov yo'q" \
                || no "$SY ta view'da sinxron requests — enqueue() ishlating"

# ─────────────────────────────────────────────────────────
echo
echo "8️⃣  TESTLAR"
if [ -d tests ]; then
  TC=$(find tests -name "test_*.py" | wc -l)
  ok "$TC ta test fayli"
  for T in test_tenant_isolation test_i18n_completeness test_order_state \
           test_price_calculation test_payment_idempotency; do
    [ -f "tests/$T.py" ] && ok "  $T.py" || warn "  $T.py hali yo'q"
  done
  if command -v pytest >/dev/null 2>&1; then
    echo "  ── pytest ishga tushirilmoqda..."
    R=$(pytest tests/ -q --tb=no 2>&1 | tail -3)
    echo "$R" | sed 's/^/       /'
    echo "$R" | grep -q "failed\|error" && no "testlar yiqildi" || ok "testlar o'tdi"
  fi
else
  no "tests/ papkasi yo'q"
fi

# ─────────────────────────────────────────────────────────
echo
echo "9️⃣  PROGRESS"
PF="$(dirname "$0")/PROGRESS.md"
if [ -f "$PF" ]; then
  grep -E "OXIRGI_BAJARILGAN|KEYINGI|FAZA:" "$PF" | sed 's/^/  /'
else
  warn "PROGRESS.md topilmadi"
fi

# ─────────────────────────────────────────────────────────
echo
echo "═══════════════════════════════════════════════════════"
if [ "$FAIL" -eq 0 ] && [ "$WARN" -eq 0 ]; then
  echo "  🎉 HAMMASI TOZA — faza qabul qilinishi mumkin"
elif [ "$FAIL" -eq 0 ]; then
  echo "  ⚠️  $WARN ta ogohlantirish — ko'rib chiqing, lekin bloklamaydi"
else
  echo "  ❌ $FAIL ta muammo, $WARN ta ogohlantirish — TUZATISH KERAK"
fi
echo "═══════════════════════════════════════════════════════"
exit $FAIL
