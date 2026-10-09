# #2 Marketplace — Jamlangan fayllar ro'yxati

> URLConf: `backend/backend/urls_market.py` | Port 8002

## Backend app'lar
- `backend/shops/` — models (Shop 14 tur, ShopTemplate 123 ta, ShopPage), business.py, views.py, urls.py
- `backend/products/` — models (flash_price, video, ar_model), views, urls
- `backend/orders/` — models, state_machine.py, inventory.py, delivery.py, coupons.py, views, urls
- `backend/couriers/`, `backend/banners/`, `backend/categories/`, `backend/maps/`
- `backend/api/` — serializers.py, views.py (templates_list/detail/apply, import/manual, my-shops, seller-login), urls.py, seller_views.py, courier_views.py
- `backend/web/views.py` — `customer_home, customer_catalog, customer_shop_detail, customer_product_detail, customer_cart*, customer_checkout, customer_orders, courier_*`
- `backend/web/seller_views.py` ichidan — `seller_products*, seller_orders, seller_template_gallery/customize/save_install, seller_shop_create`
- `backend/web/telegram_webhook.py` — `market_webhook`

## Template'lar
- `backend/templates/customer/` — shop_detail, product_detail, catalog, cart, checkout, orders, order_tracking, search, home, wishlist, profile, payment*.html, quick_buy, nearby_stores, repeat_order, map_*.html
- `backend/templates/seller/` — products.html, product_form.html, orders.html, order_detail.html, order_form.html, shop.html, shop_create.html, shop_builder.html, template_gallery.html, template_customize.html, customers.html, finance*.html, analytics.html, reviews.html, dashboard.html
- `backend/templates/components/product_carousel.html`

## Flutter / Desktop
- `store_guliston_v1/` — HAMMASI (93 dart): models/shop.dart, product.dart (flash*), services/api_service+shop_service, screens/shop_builder/*, widgets/product_card+shop_card
- `desktop_version/` — desktop client (shu mahsulotga)
- Ildiz `pubspec.yaml` — mobil app manifesti

## Hujjatlar
- `docs/02_PRODUCT_MARKETPLACE_ONLINE_STORE/` — README, CODEBASE_MAP, MINI_ERP_SPEC, BOT_AND_UI_DESIGN + ARCHIVE_SPECS (8 ta TZ)
- Ildiz TZ: `TZ_USER_SELLER_MARKETPLACE`, `TZ_SHOP_CREATE_60_TEMPLATES_IDEAL`, `TZ_SHOP_CREATE_IDEAL_DROPSHIPPING`, `TZ_PRODUCT_IMPORT_FAST_ONBOARDING_IDEAL`, `TZ_SELLER_PANEL`, `TZ_COMPETITOR_FEATURES`, `TZ_REDESIGN`, `TZ_SHOP_PROMO_FIXES`
- `products/02_marketplace/README.md` — shartnoma

## Ishga tushirish
`DJANGO_PRODUCT=market venv/bin/python backend/manage.py runserver 8002` -> `http://127.0.0.1:8002/market/`
