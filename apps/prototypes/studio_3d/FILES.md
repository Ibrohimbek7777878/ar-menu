# #3 3D Studio Print — Jamlangan fayllar ro'yxati

> URLConf: `backend/backend/urls_studio.py` | Port 8003 | Eng kichik mahsulot

## Backend app'lar
- `backend/ar3d/views.py` — SAFAQAT `print_3d_studio_page`, `print_3d_service_page`, `print_3d_order_api`, `print_3d_create_order_api`, `print_3d_mark_ready_api`
- `backend/ar3d/urls.py` — `3d-print/` route
- `backend/web/seller_views.py:2332 seller_3d_studio` — Print Queue Kanban
- `backend/web/telegram_webhook.py` — `studio_webhook`
- `backend/notifications/services/print3d_notification_service.py`

## Template'lar
- `backend/templates/customer/3d_print_studio.html` — mijoz kalkulyatori (asosiy)
- `backend/templates/seller/3d_studio.html` — Kanban (asosiy)
- Eslatma: `docs/` da `templates/ar3d/print_3d_studio.html` va `templates/seller/studio.html` deb yozilgan — real repo'da bunday yo'l YO'Q, yuqoridagi 2 fayl ishlatiladi.

## Frontend
- Alohida Flutter yo'q — web portal kifoya (`/studio/#calculator` STL/OBJ upload)

## Hujjatlar
- `docs/03_PRODUCT_3D_STUDIO_PRINTING/` — README, CODEBASE_MAP, MINI_ERP_SPEC, BOT_AND_UI_DESIGN
- `products/03_studio/README.md` — shartnoma

## Ishga tushirish
`DJANGO_PRODUCT=studio venv/bin/python backend/manage.py runserver 8003` -> `http://127.0.0.1:8003/studio/`
