# MUHIT TAYYORLASH

> Buyruqlarni **ketma-ket** bajar. Har blokdan keyin tekshiruvni ishga tushir.

---

## 0. OLDINDAN KERAK

| Nima | Versiya | Tekshirish |
|---|---|---|
| Python | 3.12+ | `python3 --version` |
| PostgreSQL | 15+ | `psql --version` |
| Redis | 7+ | `redis-server --version` |
| Node.js | 20+ | `node --version` (3D optimizatsiya uchun) |
| Git | — | `git --version` |

Yo'q bo'lsa:
```bash
sudo apt update
sudo apt install -y python3.12 python3.12-venv python3-pip \
     postgresql postgresql-contrib redis-server git nodejs npm \
     libpq-dev build-essential
```

---

## 1. LOYIHA PAPKASI

```bash
# ⚠️ mebelcity_platform DAN TASHQARIDA
mkdir -p /home/user/armenu
cd /home/user/armenu
git init
```

**Tekshirish:** `pwd` → `/home/user/armenu`

---

## 2. VIRTUAL MUHIT

```bash
cd /home/user/armenu
python3.12 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
```

**Tekshirish:** `which python` → `/home/user/armenu/venv/bin/python`

---

## 3. PAKETLAR

```bash
cat > requirements.txt <<'EOF'
Django==5.0.9
djangorestframework==3.15.2
channels[daphne]==4.1.0
channels-redis==4.2.0
psycopg[binary]==3.2.3
redis==5.1.1
django-redis==5.4.0
django-cors-headers==4.4.0
drf-spectacular==0.27.2
python-decouple==3.8
Pillow==10.4.0
qrcode[pil]==7.4.2
reportlab==4.2.2
pgvector==0.3.3
gunicorn==22.0.0
sentry-sdk==2.14.0
paytechuz==0.4.0
requests==2.32.3
anthropic==0.40.0
google-genai==0.3.0
openai==1.54.0
groq==0.11.0
pygltflib==1.16.2
python-slugify==8.0.4
bcrypt==4.2.0
PyJWT==2.9.0
pyotp==2.9.0
EOF

cat > requirements-dev.txt <<'EOF'
pytest==8.3.3
pytest-django==4.9.0
pytest-cov==5.0.0
pytest-asyncio==0.24.0
factory-boy==3.3.1
ruff==0.7.0
black==24.10.0
bandit==1.7.10
EOF

pip install -r requirements.txt -r requirements-dev.txt
```

**Tekshirish:** `python -c "import django, channels, rest_framework; print('OK')"`

---

## 4. NODE PAKETLARI (3D optimizatsiya)

```bash
cd /home/user/armenu
npm init -y
npm install --save-dev @gltf-transform/cli
```

**Tekshirish:** `npx gltf-transform --version`

---

## 5. MA'LUMOTLAR BAZASI

```bash
sudo -u postgres psql <<'EOF'
CREATE DATABASE armenu_db;
CREATE USER armenu WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
ALTER ROLE armenu SET client_encoding TO 'utf8';
ALTER ROLE armenu SET default_transaction_isolation TO 'read committed';
ALTER ROLE armenu SET timezone TO 'Asia/Tashkent';
GRANT ALL PRIVILEGES ON DATABASE armenu_db TO armenu;
\c armenu_db
GRANT ALL ON SCHEMA public TO armenu;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
EOF
```

**Tekshirish:**
```bash
PGPASSWORD='CHANGE_ME_STRONG_PASSWORD' psql -h localhost -U armenu -d armenu_db \
  -c "SELECT extname FROM pg_extension;"
# vector, pg_trgm, btree_gin ko'rinishi kerak
```

---

## 6. REDIS

⚠️ **`db=5` ishlatiladi** — mebelcity `db=0..4` ni band qilgan.

```bash
redis-cli -n 5 SET armenu_test "ok"
redis-cli -n 5 GET armenu_test
redis-cli -n 5 DEL armenu_test
```

**Tekshirish:** `ok` chiqishi kerak.

---

## 7. .env FAYL

```bash
cd /home/user/armenu
cat > .env <<'EOF'
# --- Asosiy ---
DEBUG=True
SECRET_KEY=CHANGE_ME_GENERATE_RANDOM_50_CHARS
ALLOWED_HOSTS=localhost,127.0.0.1
PUBLIC_DOMAIN=localhost:8060

# --- Ma'lumotlar bazasi ---
DB_NAME=armenu_db
DB_USER=armenu
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD
DB_HOST=127.0.0.1
DB_PORT=5432

# --- Redis (⚠️ db=5) ---
REDIS_URL=redis://127.0.0.1:6379/5
REDIS_CHANNEL_URL=redis://127.0.0.1:6379/6

# --- AI provayderlar (kamida 2 tasi to'ldirilsin) ---
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
GROQ_API_KEY=
DEEPSEEK_API_KEY=
MISTRAL_API_KEY=

# --- 3D generatsiya ---
MESHY_API_KEY=
TRIPO_API_KEY=

# --- AI limitlari ---
AI_DAILY_LIMIT_PER_RESTAURANT=2.0
AI_MONTHLY_LIMIT_TOTAL=500.0

# --- To'lov (FAZA 10 da) ---
PAYME_MERCHANT_ID=
PAYME_KEY=
CLICK_SERVICE_ID=
CLICK_SECRET=
UZUM_MERCHANT_ID=
UZUM_SECRET=

# --- Fiskal (FAZA 10 da) ---
OFD_PROVIDER=
OFD_LOGIN=
OFD_PASSWORD=

# --- Telegram ---
TELEGRAM_BOT_TOKEN=

# --- Sentry (ixtiyoriy) ---
SENTRY_DSN=
EOF

cat > .gitignore <<'EOF'
venv/
__pycache__/
*.pyc
.env
*.sqlite3
media/
staticfiles/
node_modules/
.pytest_cache/
htmlcov/
.coverage
*.log
.DS_Store
EOF
```

⚠️ **`SECRET_KEY` generatsiya:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```
Natijani `.env` ga qo'y.

**Tekshirish:** `grep -c "=" .env` → 30 dan ko'p

---

## 8. DJANGO SKELET

```bash
cd /home/user/armenu
django-admin startproject config .
mkdir -p core apps static templates locale tests scripts deploy
touch core/__init__.py apps/__init__.py
```

**Tekshirish:** `ls` → `config/ core/ apps/ manage.py` bor

---

## 9. PYTEST SOZLAMASI

```bash
cat > pytest.ini <<'EOF'
[pytest]
DJANGO_SETTINGS_MODULE = config.settings.test
python_files = test_*.py
addopts = --reuse-db --nomigrations -q
testpaths = tests
EOF
```

---

## 10. MAKEFILE (qulaylik)

```bash
cat > Makefile <<'EOF'
.PHONY: run ws worker test lint migrate shell

run:
	python manage.py runserver 0.0.0.0:8060

ws:
	daphne -b 0.0.0.0 -p 8061 config.asgi:application

worker:
	python manage.py run_worker --queue=$(Q)

test:
	pytest -x -q

test-cov:
	pytest --cov=apps --cov=core --cov-report=term-missing

lint:
	ruff check . && black --check .

fmt:
	ruff check --fix . && black .

migrate:
	python manage.py makemigrations && python manage.py migrate

shell:
	python manage.py shell

seed:
	python manage.py loaddata scripts/demo.json
EOF
```

---

## 11. BIRINCHI COMMIT

```bash
cd /home/user/armenu
git add -A
git commit -m "V-001: loyiha skeleti, muhit tayyorlandi"
```

---

## ✅ YAKUNIY TEKSHIRUV

Quyidagi skriptni ishga tushir — hammasi ✅ bo'lishi kerak:

```bash
cat > scripts/check_env.sh <<'EOF'
#!/bin/bash
ok(){ echo "✅ $1"; }
no(){ echo "❌ $1"; FAIL=1; }

[ -d venv ] && ok "venv" || no "venv yo'q"
python -c "import django" 2>/dev/null && ok "Django" || no "Django yo'q"
python -c "import channels" 2>/dev/null && ok "Channels" || no "Channels yo'q"
python -c "import pgvector" 2>/dev/null && ok "pgvector" || no "pgvector yo'q"
[ -f .env ] && ok ".env" || no ".env yo'q"
[ -f manage.py ] && ok "manage.py" || no "manage.py yo'q"
redis-cli -n 5 PING >/dev/null 2>&1 && ok "Redis db=5" || no "Redis yo'q"
PGPASSWORD=$(grep DB_PASSWORD .env|cut -d= -f2) psql -h 127.0.0.1 -U armenu \
  -d armenu_db -c "SELECT 1" >/dev/null 2>&1 && ok "PostgreSQL" || no "PostgreSQL yo'q"
npx gltf-transform --version >/dev/null 2>&1 && ok "gltf-transform" || no "gltf-transform yo'q"

[ -z "$FAIL" ] && echo -e "\n🎉 MUHIT TAYYOR — FAZA 0 ga o'ting" || echo -e "\n⚠️ Xatolarni tuzating"
EOF
chmod +x scripts/check_env.sh
./scripts/check_env.sh
```

---

## 🎯 KEYINGI QADAM

```bash
cat ROADMAP/01_FAZALAR/FAZA_00_TAYYORGARLIK.md
```

Va `PROGRESS.md` da `V-001` ni belgilash:
```bash
python3 ROADMAP/03_HOLAT/update_progress.py V-001 ok
```
