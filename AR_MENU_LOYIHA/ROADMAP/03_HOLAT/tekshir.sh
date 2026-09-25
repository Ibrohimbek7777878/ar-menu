#!/bin/bash
# ROADMAP butunligini tekshiradi.
# Ishlatilishi: bash ROADMAP/03_HOLAT/tekshir.sh

cd "$(dirname "$0")/../.." || exit 1
FAIL=0
ok()   { echo "  ✅ $1"; }
no()   { echo "  ❌ $1"; FAIL=1; }
warn() { echo "  ⚠️  $1"; }

echo "═══════════════════════════════════════════════════"
echo "  ARMENU ROADMAP — BUTUNLIK TEKSHIRUVI"
echo "═══════════════════════════════════════════════════"

# --- 1. Boshlash fayllari ---
echo
echo "1. Boshlash fayllari"
for f in ROADMAP/START.md \
         ROADMAP/00_BOSHLASH/01_LOYIHA_5_DAQIQADA.md \
         ROADMAP/00_BOSHLASH/02_QOIDALAR.md \
         ROADMAP/00_BOSHLASH/03_MUHIT_TAYYORLASH.md; do
  [ -f "$f" ] && ok "$(basename $f)" || no "$f yo'q"
done

# --- 2. Fazalar ---
echo
echo "2. Fazalar (13 ta bo'lishi kerak)"
declare -A KUTILGAN=( [00]=12 [01]=18 [02]=24 [03]=12 [04]=26 [05]=22 [06]=28 \
                      [07]=8 [08]=20 [09]=16 [10]=18 [11]=14 [12]=16 )
JAMI=0
for n in 00 01 02 03 04 05 06 07 08 09 10 11 12; do
  f=$(ls ROADMAP/01_FAZALAR/FAZA_${n}_*.md 2>/dev/null | head -1)
  if [ -z "$f" ]; then
    no "FAZA_${n} yo'q"
    continue
  fi
  cnt=$(grep -c '^## V-' "$f")
  exp=${KUTILGAN[$n]}
  JAMI=$((JAMI + cnt))
  if [ "$cnt" -eq "$exp" ]; then
    ok "$(basename $f) — $cnt vazifa"
  else
    no "$(basename $f) — $cnt vazifa (kutilgan: $exp)"
  fi
done
echo "  ── Jami vazifa: $JAMI / 234"

# --- 3. Faza zanjiri ---
echo
echo "3. Faza zanjiri (➡️ Keyingi havolalari)"
for n in 00 01 02 03 04 05 06 07 08 09 10 11; do
  f=$(ls ROADMAP/01_FAZALAR/FAZA_${n}_*.md 2>/dev/null | head -1)
  [ -z "$f" ] && continue
  nxt=$(grep -o 'Keyingi:\*\* `FAZA_[^`]*`' "$f" | grep -o 'FAZA_[^`]*')
  if [ -z "$nxt" ]; then
    no "$(basename $f) — 'Keyingi' havolasi yo'q"
  elif [ ! -f "ROADMAP/01_FAZALAR/$nxt" ]; then
    no "$(basename $f) → $nxt (fayl mavjud emas)"
  else
    ok "$(basename $f) → $nxt"
  fi
done

# --- 4. Har fazada qabul bo'limi ---
echo
echo "4. Faza qabul bo'limlari"
for f in ROADMAP/01_FAZALAR/FAZA_*.md; do
  if grep -q "FAZA .* QABUL\|✅ FAZA" "$f"; then
    ok "$(basename $f)"
  else
    no "$(basename $f) — qabul bo'limi yo'q"
  fi
done

# --- 5. Ma'lumotnoma ---
echo
echo "5. Ma'lumotnoma"
for f in ROADMAP/02_MALUMOTNOMA/INDEKS.md \
         ROADMAP/02_MALUMOTNOMA/TEZ_YORDAM.md \
         ROADMAP/02_MALUMOTNOMA/TESTLAR.md; do
  [ -f "$f" ] && ok "$(basename $f)" || no "$f yo'q"
done

# --- 6. Holat ---
echo
echo "6. Holat kuzatuvi"
[ -f ROADMAP/03_HOLAT/PROGRESS.md ] && ok "PROGRESS.md" || no "PROGRESS.md yo'q"
if [ -f ROADMAP/03_HOLAT/update_progress.py ]; then
  python3 ROADMAP/03_HOLAT/update_progress.py --status >/dev/null 2>&1 \
    && ok "update_progress.py ishlaydi" || no "update_progress.py xato beradi"
else
  no "update_progress.py yo'q"
fi

# --- 7. TZ ma'lumotnomasi ---
echo
echo "7. TZ_MASTER"
CNT=$(ls TZ_MASTER/*.md 2>/dev/null | wc -l)
[ "$CNT" -eq 8 ] && ok "8 ta .md fayl" || warn "$CNT ta .md (kutilgan 8)"
[ -f TZ_MASTER/ARMENU_TZ_MASTER.pdf ] && ok "PDF mavjud" || warn "PDF yo'q"

# --- 8. Placeholder ---
echo
echo "8. Placeholder tekshiruvi"
P=$(grep -rl "TODO\|FIXME\|YOUR_KEY\|shu yerga yozing" ROADMAP/01_FAZALAR/*.md 2>/dev/null | wc -l)
[ "$P" -eq 0 ] && ok "placeholder yo'q" || no "$P ta faylda placeholder bor"

# --- Yakun ---
echo
echo "═══════════════════════════════════════════════════"
if [ "$FAIL" -eq 0 ]; then
  echo "  🎉 ROADMAP TO'LIQ — ishni boshlash mumkin"
  echo "  ➡️  cat ROADMAP/START.md"
else
  echo "  ⚠️  Kamchiliklar bor — yuqoridagi ❌ larni tuzating"
fi
echo "═══════════════════════════════════════════════════"
exit $FAIL
