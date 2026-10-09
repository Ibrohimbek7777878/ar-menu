# Mahsulot #1 — Restoran 3D/AR & NFC Menyu

> Port: `8001` | URLConf: `backend/backend/urls_restaurant.py` | Product code: `restaurant`
> Umumiy backendga TEGILMAYDI — faqat shu faylda yozilgan chegaralar orqali ulanadi.

## 1. Backend manzili (umumiy yadro ichida, ko'chirilmaydi)
- `backend/ar3d/` — `ProductLibrary`, `Product3DModel`, `ARView`, `print_3d_*` dan TASHQARI `ar_*` viewlar
- `backend/tables_restaurant/` — `Hall`, `Table (qr_token, qr_token_old, x/y/w/h, status)`
- `backend/web/views.py`: `table_menu_redirect`, `ar_menu_page`, `ar_catalog`, `nfc_tap_handler`, `customer_shop_detail (table_info banner)`
- `backend/web/tma_views.py`: `tma_home, tma_catalog, tma_table_hub, tma_cart, tma_checkout, tma_orders`
- `backend/web/seller_urls.py` ichidan faqat: `seller_tables`, `seller_kds`, `waiter_panel`, `tables/plan/`, `template-draft-save/`, `template-preview/`
- `backend/web/telegram_webhook.py`: `restaurant_webhook`

## 2. URL shartnoma (frontend shu yerga suyanadi)
```
/, /restaurant/, /menu/, /tma/ -> tma_home
/catalog/, /table/, /cart/, /checkout/, /orders/
/nfc/<code>/, /t/<uuid>/, /m/<slug>/, /ar/
seller/tables/, seller/kds/, seller/waiter/, seller/tables/plan/
bot/restaurant/webhook/
api/v1/accounts/, api/v1/shops/, api/v1/products/, api/v1/orders/, api/payments/
```

## 3. Frontend qismlari (shu mahsulotga tegishli)
- `backend/templates/customer/ar_menu.html` — QR menyu + model-viewer + savat drawer
- `backend/templates/seller/tables.html, tables_plan.html, kds.html, waiter.html`
- `backend/templates/components/shop_section.html` (menu position: top/left/bottom)
- Flutter: `lib/services/ar_service.dart`, `lib/widgets/store_type_filter.dart`, `screens/shop_detail_screen.dart (Menyu|Stollar tab)`
- `air-3d-menu/` Node demo — faqat referens, prod emas

## 4. DB jadvallar (keyin ajratish uchun)
`ar3d_*`, `tables_restaurant_hall`, `tables_restaurant_table`, `orders_order (table FK)`, `shops_shop (store_type=restaurant/cafe/bar)`

## 5. ENV
`DJANGO_PRODUCT=restaurant`, `@marketing_orign_bot` token, `TELEGRAM_RESTAURANT_BOT_TOKEN`, `PUBLIC_DOMAIN`, `MESHY_API_KEY/TRIPO_API_KEY` (rasm->3D)

## 6. Ulanish qoidasi
Frontend faqat yuqoridagi URL + `GET /api/v1/flutter/...` orqali ishlaydi. To'g'ridan-to'g'ri `shops.models` import TAQIQLANADI — kerak bo'lsa `api/` orqali.
