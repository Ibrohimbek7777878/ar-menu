#!/bin/bash
ok(){ echo "✅ $1"; }
no(){ echo "❌ $1"; FAIL=1; }

[ -d venv ] && ok "venv" || no "venv yo'q"
./venv/bin/python -c "import django" 2>/dev/null && ok "Django" || no "Django yo'q"
./venv/bin/python -c "import channels" 2>/dev/null && ok "Channels" || no "Channels yo'q"
./venv/bin/python -c "import pgvector" 2>/dev/null && ok "pgvector" || no "pgvector yo'q"
[ -f .env ] && ok ".env" || no ".env yo'q"
[ -f manage.py ] && ok "manage.py" || no "manage.py yo'q"
redis-cli -n 5 PING >/dev/null 2>&1 && ok "Redis db=5" || no "Redis yo'q"
psql -d armenu_db -U ibrohim -c "SELECT 1" >/dev/null 2>&1 && ok "PostgreSQL" || no "PostgreSQL yo'q"
npx gltf-transform --version >/dev/null 2>&1 && ok "gltf-transform" || no "gltf-transform yo'q"

[ -z "$FAIL" ] && echo -e "\n🎉 MUHIT TAYYOR — FAZA 0 ga o'ting" || echo -e "\n⚠️ Xatolarni tuzating"
