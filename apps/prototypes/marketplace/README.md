# Mahsulot #2 — Online Store Marketplace (Gipermarket)

> Port: `8002` | URLConf: `backend/backend/urls_market.py` | Product code: `market`
> Umumiy backendga TEGILMAYDI.

## 1. Backend manzili (umumiy yadro ichida)
- `backend/shops/` — `Shop (14 store_type, business_profile)`, `ShopTemplate (123 ta)`, `ShopPage`
- `backend/products/` — `Product (flash_price, video, ar_model, allergens, diet_tags)`, `Review`
- `backend/orders/` — `Order (+table FK, bonus_used/earned)`, `state_machine.py`
- `backend/couriers/`, `backend/banners/`, `backend/categories/`, `backend/maps/`
- `backend/web/views.py`: `customer_home, customer_catalog, customer_shop_detail, customer_cart*, customer_checkout, customer_orders, courier_*`
- `backend/web/seller_views.py`: `seller_products*, seller_orders, seller_template_gallery/customize/save_install`
- `backend/api/` — `templates_list/detail/apply, shop_import/manual, my-shops, seller-login`
- `backend/web/telegram_webhook.py`: `market_webhook`

## 2. URL shartnoma
```
/, /market/, /catalog/, /shop/<slug>/, /product/<slug>/
/cart/*, /checkout/, /orders/, /profile/, /wishlist/
/courier/*, /seller/products/, /seller/orders/, /seller/couriers/
/seller/template-gallery/, /seller/template-customize/<slug>/
/bot/market/webhook/
api/v1/accounts/, categories/, shops/, products/, orders/, couriers/, flutter/, maps/, ai/
```

## 3. Frontend qismlari
- `backend/templates/customer/shop_detail.html, product_detail.html, cart.html, checkout.html`
- `backend/templates/seller/products.html, product_form.html, template_gallery.html, template_customize.html`
- `backend/templates/components/product_carousel.html`
- Flutter: `store_guliston_v1/lib/` — `shop.dart, product.dart (flash*), shop_service.dart, template_picker/detail/builder screens`
- `desktop_version/` — shu mahsulot desktop clienti

## 4. DB jadvallar
`shops_shop, shop_templates, shops_shoppage, products_*, orders_*, couriers_*, banners_*, categories_*`

## 5. ENV
`DJANGO_PRODUCT=market`, `TELEGRAM_MARKET_BOT_TOKEN`, `CLICK_/PAYME_/UZCARD_*`, `MCP_DAILY_BUDGET`

## 6. Ulanish qoidasi
Barcha seller/customer UI faqat `api/v1/...` + seller session orqali. `ar3d` va `tables_restaurant` ga to'g'ridan murojaat YO'Q.
