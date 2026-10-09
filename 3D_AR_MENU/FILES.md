# #1 Restoran 3D/AR menyu — Jamlangan fayllar ro'yxati

> Kod KO'CHIRILMADI (ko'chirilsa import sinadi). Barcha oid fayllar shu bitta ro'yxatga jamlangan.
> URLConf: `backend/backend/urls_restaurant.py` | Port 8001

## Backend app'lar (umumiy yadro ichida)
- `backend/ar3d/` — models.py, views.py, urls.py, services.py, generator.py
  (ar_menu, ar_catalog, print_3d_* — print qismi #3 ga tegishli, ar qismi shu yerga)
- `backend/tables_restaurant/` — models.py (Hall, Table, NFCCard), views yo'q (web orqali)
- `backend/web/views.py` — `table_menu_redirect`, `ar_menu_page`, `ar_catalog`, `nfc_tap_handler`
- `backend/web/tma_views.py` — `tma_home, tma_catalog, tma_table_hub, tma_cart, tma_checkout, tma_orders, tma_order_detail`
- `backend/web/seller_views.py` ichidan — `seller_tables`, `seller_kds`, `waiter_panel`, `tables/plan`, `nfc_*`
- `backend/web/telegram_webhook.py` — `restaurant_webhook`
- `backend/web/seller_urls.py` ichidan — tables/kds/waiter/nfc route'lari

## Template'lar (frontend Web)
- `backend/templates/tma/` — HAMMASI (8 fayl): base_tma, home, catalog, table_hub, cart, checkout, orders, order_detail
- `backend/templates/customer/ar_menu.html` — QR menyu (asosiy)
- `backend/templates/customer/ar_catalog.html`, `product_ar.html`, `nfc_not_found.html`
- `backend/templates/seller/tables.html`, `tables_plan.html`, `kds.html`, `waiter.html`
- `backend/templates/seller/nfc_dashboard.html`, `nfc_stands_print.html`, `table_stands_print.html`
- `backend/templates/seller/preview_inner.html` (draft preview — restoran ranglari bilan)
- `backend/templates/components/shop_section.html` (menu position top/left/bottom)

## Flutter / Desktop
- `store_guliston_v1/lib/services/ar_service.dart`
- `store_guliston_v1/lib/widgets/store_type_filter.dart`
- `store_guliston_v1/lib/screens/shop_detail_screen.dart` (Menyu|Stollar tab)
- `air-3d-menu/` + `AR_MENU_LOYIHA/air-3d-menu/` — Node demo (referens)

## Hujjatlar
- `docs/01_PRODUCT_RESTAURANT_3D_AR/` — README, CODEBASE_MAP, MINI_ERP_SPEC, BOT_AND_UI_DESIGN + ARCHIVE_SPECS (TZ_3D_AR_MENU, TZ_BOT_VA_STOLLAR, TZ_RESTORAN_BOT, TZ_AR_MENU_INTEGRATION)
- Ildiz TZ: `TZ_3D_AR_MENU.md`, `TZ_AR_MENU_INTEGRATION.md`, `TZ_BOT_VA_STOLLAR_TIZIMI.md`, `TZ_RESTORAN_BOT_MUSTAQIL.md`
- `products/01_restaurant/README.md` — shartnoma (bu papkada)

## Ishga tushirish
`DJANGO_PRODUCT=restaurant venv/bin/python backend/manage.py runserver 8001` -> `http://127.0.0.1:8001/m/<slug>/`
