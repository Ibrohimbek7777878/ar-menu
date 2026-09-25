"""
Flutter API URLs — Mobile app uchun API endpoint'lar.
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from . import seller_views
from . import courier_views
from . import agro_views

urlpatterns = [
    # ─── AUTH ────────────────────────────────────────────────────
    path('auth/register/', views.api_register, name='api_register'),
    path('auth/login/', views.api_login, name='api_login'),
    path('auth/seller-login/', views.api_seller_login, name='api_seller_login'),
    path('auth/courier-login/', views.api_courier_login, name='api_courier_login'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='api_token_refresh'),
    path('auth/profile/', views.api_profile, name='api_profile'),

    # ─── CATALOG ─────────────────────────────────────────────────
    path('categories/', views.api_categories, name='api_categories'),
    path('shops/', views.api_shops, name='api_shops'),
    path('shops/<slug:slug>/', views.api_shop_detail, name='api_shop_detail'),
    path('shops/<slug:slug>/view/', views.api_shop_view, name='api_shop_view'),
    path('shops/<int:shop_id>/products/', views.api_shop_products, name='api_shop_products'),
    path('products/', views.api_all_products, name='api_all_products'),
    path('products/<slug:slug>/', views.api_product_detail, name='api_product_detail'),
    path('products/<slug:slug>/view/', views.api_product_view, name='api_product_view'),
    path('search/', views.api_search, name='api_search'),
    path('nearby-shops/', views.api_nearby_shops, name='api_nearby_shops'),

    # ─── CART ────────────────────────────────────────────────────
    path('cart/', views.api_cart_detail, name='api_cart_detail'),
    path('cart/add/', views.api_cart_add, name='api_cart_add'),
    path('cart/update/', views.api_cart_update, name='api_cart_update'),
    path('cart/remove/', views.api_cart_remove, name='api_cart_remove'),

    # ─── ORDERS ──────────────────────────────────────────────────
    path('orders/', views.api_orders, name='api_orders'),
    path('orders/create/', views.api_order_create, name='api_order_create'),
    path('orders/<int:pk>/', views.api_order_detail, name='api_order_detail'),
    path('orders/<int:pk>/cancel/', views.api_order_cancel, name='api_order_cancel'),
    path('orders/<int:pk>/tracking/', views.api_order_tracking, name='api_order_tracking'),

    # ─── PAYMENTS ────────────────────────────────────────────────
    path('payments/create/', views.api_payment_create, name='api_payment_create'),
    path('payments/<str:merchant_id>/status/', views.api_payment_status, name='api_payment_status'),

    # ─── DELIVERY ────────────────────────────────────────────────
    path('delivery/quote/', views.api_delivery_quote, name='api_delivery_quote'),

    # ─── COUPONS & WISHLIST ──────────────────────────────────────
    path('coupons/validate/', views.api_coupon_validate, name='api_coupon_validate'),
    path('wishlist/', views.api_wishlist, name='api_wishlist'),
    path('wishlist/toggle/', views.api_wishlist_toggle, name='api_wishlist_toggle'),

    # ─── SELLER DASHBOARD ────────────────────────────────────────
    path('seller/dashboard/', seller_views.seller_dashboard, name='seller_dashboard'),
    path('seller/products/', seller_views.seller_products, name='seller_products'),
    path('seller/products/<int:pk>/', seller_views.seller_product_detail, name='seller_product_detail'),
    path('seller/products/<int:pk>/toggle/', seller_views.seller_product_toggle, name='seller_product_toggle'),
    path('seller/orders/', seller_views.seller_orders, name='seller_orders'),
    path('seller/orders/<int:pk>/', seller_views.seller_order_detail, name='seller_order_detail'),
    path('seller/orders/<int:pk>/confirm/', seller_views.seller_order_confirm, name='seller_order_confirm'),
    path('seller/orders/<int:pk>/preparing/', seller_views.seller_order_preparing, name='seller_order_preparing'),
    path('seller/orders/<int:pk>/ready/', seller_views.seller_order_ready, name='seller_order_ready'),
    path('seller/orders/<int:pk>/cancel/', seller_views.seller_order_cancel, name='seller_order_cancel'),
    path('seller/stats/', seller_views.seller_stats, name='seller_stats'),

    # ─── COURIER ─────────────────────────────────────────────────
    path('courier/dashboard/', courier_views.courier_dashboard, name='courier_dashboard'),
    path('courier/available/', courier_views.courier_available_orders, name='courier_available_orders'),
    path('courier/orders/<int:pk>/', courier_views.courier_order_detail, name='courier_order_detail'),
    path('courier/orders/<int:pk>/accept/', courier_views.courier_accept_order, name='courier_accept_order'),
    path('courier/orders/<int:pk>/deliver/', courier_views.courier_deliver_order, name='courier_deliver_order'),
    path('courier/history/', courier_views.courier_history, name='courier_history'),

    # ─── SHOP TEMPLATES (60+ Figma preview) ──────────────────────
    path('templates/', views.api_templates_list, name='api_templates_list'),
    path('templates/apply/', views.api_template_apply, name='api_template_apply'),
    path('templates/<slug:slug>/', views.api_template_detail, name='api_template_detail'),

    # ─── SHOP BUILDER: product placement 2 usuli ─────────────────
    path('shops/<int:shop_id>/import-products/', views.api_shop_import_products, name='api_shop_import_products'),
    path('shops/<int:shop_id>/manual-products/', views.api_shop_manual_products, name='api_shop_manual_products'),
    path('my-shops/', views.api_my_shops, name='api_my_shops'),

    # ─── AR 3D (hybrid marketplace) ──────────────────────────────
    path('ar/<int:product_id>/', views.api_ar_detail, name='api_ar_detail'),
    path('ar/view/', views.api_ar_view_log, name='api_ar_view_log'),
    path('ar/library/search/', views.api_ar_library_search, name='api_ar_library_search'),
    path('restaurant/<int:shop_id>/tables/', views.api_restaurant_tables, name='api_restaurant_tables'),
    path('t/<uuid:token>/', views.api_table_resolve, name='api_table_resolve'),
    path('table/service-call/', views.api_table_service_call, name='api_table_service_call'),

    # ─── BUNDLE TO'PLAM (S5-3) ─────────────────────────────────
    path('shops/<int:shop_id>/bundles/', views.api_bundles_list, name='api_bundles_list'),
    path('bundles/create/', views.api_bundle_create, name='api_bundle_create'),
    path('bundles/<int:bundle_id>/add-to-cart/', views.api_bundle_add_to_cart, name='api_bundle_add_to_cart'),

    # ─── SHARHLAR (S5-4) ───────────────────────────────────────────
    path('shops/<int:shop_id>/reviews/', views.api_shop_reviews, name='api_shop_reviews'),
    path('reviews/create/', views.api_review_create, name='api_review_create'),

    # ─── AGRO & FOOD FAST ONBOARDING ────────────────────────────
    path('seller/agro/starter-packs/', agro_views.api_agro_starter_packs, name='api_agro_starter_packs'),
    path('seller/agro/starter-packs/apply/', agro_views.api_agro_apply_starter_pack, name='api_agro_apply_starter_pack'),
    path('seller/agro/master-search/', agro_views.api_agro_master_search, name='api_agro_master_search'),
    path('seller/agro/claim-product/', agro_views.api_agro_claim_product, name='api_agro_claim_product'),
    path('seller/agro/quick-price-update/', agro_views.api_agro_quick_price_update, name='api_agro_quick_price_update'),
    path('seller/agro/bulk-grid-save/', agro_views.api_agro_bulk_grid_save, name='api_agro_bulk_grid_save'),
]
