# Mahsulot #3 — 3D Studio & Chop Etish

> Port: `8003` | URLConf: `backend/backend/urls_studio.py` | Product code: `studio`
> Umumiy backendga TEGILMAYDI. Hozir eng kichik mahsulot — keyin to'liq ajratishga tayyor.

## 1. Backend manzili (umumiy yadro ichida)
- `backend/ar3d/views.py:1173 print_3d_studio_page`, `print_3d_service_page`, `print_3d_order_api`, `print_3d_create_order_api`, `print_3d_mark_ready_api`
- `backend/ar3d/urls.py:38 3d-print/` + `ar3d/models.py` ichidan faqat Print3D modellari
- `backend/web/seller_views.py:2332 seller_3d_studio` (Print Queue Kanban)
- `backend/web/telegram_webhook.py`: `studio_webhook`
- `backend/notifications/services/print3d_notification_service.py`

## 2. URL shartnoma
```
/, /studio/, /3d-print/, /3d-print/order/, /3d-print/order/<number>/ready/
seller/studio/ (Kanban)
bot/studio/webhook/
api/v1/accounts/, api/v1/orders/, api/v1/notifications/, api/payments/
```

## 3. Frontend qismlari
- `backend/templates/customer/3d_print_studio.html`
- `backend/templates/ar3d/print_3d_studio.html` (cyberpunk portal)
- `backend/templates/seller/3d_studio.html` + `templates/seller/studio.html` (Kanban)
- STL/OBJ upload + slicer kalkulyator (JS, `/studio/#calculator`)

## 4. DB jadvallar
`ar3d_*` ichidan `print3d_*` + `orders_order (studio buyurtmalari)` — keyin alohida `studio_*` prefixga ko'chiriladi.

## 5. ENV
`DJANGO_PRODUCT=studio`, `TELEGRAM_STUDIO_BOT_TOKEN`

## 6. Ulanish qoidasi + kelajak
Hozir yadro API dan foydalanadi. Keyin uzilganda: shu 3 view + 3 template + 1 seller Kanban + 1 bot ko'chiriladi, `accounts/payments` esa `SHARED_CORE` dan import qilinadi (nusxalanmaydi).
