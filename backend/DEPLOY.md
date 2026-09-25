# Deploy — Online Store Guliston

## Mahalliy ishga tushirish (SQLite, Redis/PostgreSQL siz)
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser   # yoki test: adm_test / pw12345
python manage.py runserver 0.0.0.0:8000
```
- Storefront: http://localhost:8000/
- Admin: http://localhost:8000/admin/login/

## Docker (PostgreSQL + Redis + Gunicorn + Celery)
```bash
cp .env.example .env        # kalitlarni to'ldiring
docker compose up --build
```
Servislar: `db` (postgres), `redis`, `web` (gunicorn), `worker` (celery), `beat` (kunlik reyting).

## Muhim sozlamalar (.env)
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_WEBHOOK_URL` — Telegram botni faollashtiradi.
- `AI_API_KEY` — OpenAI real generatsiyani yoqadi (bo'sh bo'lsa shablon fallback).
- `CLICK_*` / `PAYME_*` / `UZCARD_*` — real to'lov provayderlari (bo'sh bo'lsa mock).
- `POSTGRES_*` / `REDIS_URL` — agar to'ldirilsa SQLite o'rniga ishlatiladi.
- `S3_*` — media fayllar uchun (bo'sh bo'lsa local media/).

## Reyting (AI)
```bash
python manage.py recompute_ranking     # bir martalik
# yoki Celery beat bilan avtomatik (har kun)
```

## Statika (production)
`DEBUG=False` bo'lganda WhiteNoise `collectstatic` ni xizmat qiladi. Dockerfile avtomatik bajaradi.
