from functools import wraps

from django.contrib.auth.decorators import login_required
from django.http import Http404, HttpResponseForbidden
from django.shortcuts import redirect


# Ofitsiant seller panelida faqat o'z ish joyiga kerakli sahifalarni ko'radi
# (moliya, mijozlar bazasi, analitika, mahsulot tahriri — yo'q). TZ: R-SEC-10.
WAITER_ALLOWED_URL_NAMES = frozenset({
    'waiter_panel_web',
    'seller_waiter_web',
    'waiter_table_status_web',
    'seller_kds_web',
    'seller_kds_update_web',
    'seller_order_receipt_web',
})


# Eski `/seller/` bo'limlari ham xodimning SHAXSIY ruxsatlariga bo'ysunadi (aks holda /ra/ da moliya yoki menyudan chetlatilgan
# boshqaruvchi shu sahifalar orqali baribir kira olardi). Yo'l nomi → ruxsat kaliti (web/capabilities.py). Ro'yxatda yo'q sahifa
# oldingidek (faqat rol bo'yicha) ochiladi. Standart rollar uchun natija o'zgarmaydi: rahbariyat hamma kalitga, ofitsiant
# esa o'z sahifalari kalitlariga (pos, kds, tables_read) ega.
SELLER_PAGE_CAPABILITIES = {
    # ofitsiant / oshxona
    'waiter_panel_web': 'pos', 'seller_waiter_web': 'pos', 'waiter_table_status_web': 'tables_read',
    'seller_kds_web': 'kds', 'seller_kds_update_web': 'kds', 'seller_order_receipt_web': 'kds',
    'seller_orders_web': 'kds', 'seller_order_detail_web': 'kds', 'admin_orders': 'kds', 'admin_order_status': 'kds',
    'seller_order_create_web': 'pos',
    # menyu va 3D
    'seller_products_web': 'menu_admin', 'seller_product_create_web': 'menu_admin', 'seller_product_edit_web': 'menu_admin',
    'seller_product_delete_web': 'menu_admin', 'seller_products_import_csv_web': 'menu_admin',
    'seller_products_sample_csv_web': 'menu_admin', 'seller_products_seed_starter_web': 'menu_admin',
    'seller_product_ai3d_web': 'menu_admin', 'seller_product_3d_status_web': 'menu_admin', 'seller_ar_web': 'menu_admin',
    'seller_3d_studio_web': 'menu_admin',
    # stollar, QR va NFC
    'seller_tables_web': 'tables_admin', 'seller_tables_plan_web': 'tables_admin', 'seller_tables_plan_save_web': 'tables_admin',
    'seller_tables_print_stands_web': 'tables_admin', 'seller_tables_print_stands': 'tables_admin',
    'seller_table_qr_svg': 'tables_read', 'seller_menu_qr_svg': 'tables_admin', 'seller_nfc_qr_svg': 'tables_admin',
    'seller_nfc_dashboard_web': 'tables_admin', 'seller_nfc_create_web': 'tables_admin', 'seller_nfc_edit_web': 'tables_admin',
    'seller_nfc_toggle_web': 'tables_admin', 'seller_nfc_delete_web': 'tables_admin', 'seller_nfc_print_stands_web': 'tables_admin',
    # moliya
    'seller_finance_web': 'finance', 'finance_export_excel': 'finance', 'finance_export_pdf': 'finance',
    'finance_install_preset': 'finance', 'seller_analytics_web': 'finance',
    # restoran sozlamalari
    'seller_shop_web': 'settings_admin', 'seller_shop_builder_web': 'settings_admin', 'seller_telegram_web': 'settings_admin',
    'seller_template_gallery': 'settings_admin', 'seller_template_customize': 'settings_admin',
    'seller_template_save_install': 'settings_admin', 'seller_template_draft_save': 'settings_admin',
    'seller_template_preview': 'settings_admin', 'seller_template_preview_page': 'settings_admin',
}


def seller_required(view_func):
    """shop_owner, shop_manager va super_admin kira oladi; waiter — faqat ofitsiant/KDS sahifalariga.
    Qo'shimcha: bo'lim xodimning shaxsiy ruxsatiga bog'liq bo'lsa (SELLER_PAGE_CAPABILITIES) va ruxsat olib tashlangan bo'lsa — 403."""
    @wraps(view_func)
    @login_required(login_url='seller_login')
    def _wrapped(request, *args, **kwargs):
        user = request.user
        role = getattr(user, 'role', '')
        if role not in ('super_admin', 'shop_owner', 'shop_manager', 'waiter'):
            return redirect('web_login')
        match = getattr(request, 'resolver_match', None)
        if role == 'waiter':
            if not match or match.url_name not in WAITER_ALLOWED_URL_NAMES:
                return redirect('waiter_panel_web')
        needed = SELLER_PAGE_CAPABILITIES.get(match.url_name) if match else None
        if needed:
            from web.restaurant_auth import has_role_capability
            if not has_role_capability(user, needed):
                return HttpResponseForbidden("Bu bo'limga ruxsatingiz yo'q.")
        return view_func(request, *args, **kwargs)
    return _wrapped


def restaurant_panel_guard(view_func):
    """
    panel_scope == 'restaurant' rejimida bozorga oid yashirilgan sahifalarga
    to'g'ridan-to'g'ri kirilsa 404 emas, /seller/ ga yo'naltiradi (TZ 2.2).
    """
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        from backend.app_settings import get_choice
        scope = get_choice('panel_scope', 'restaurant', ('restaurant', 'all'))
        if scope == 'restaurant':
            return redirect('seller_dashboard_web')
        return view_func(request, *args, **kwargs)
    return _wrapped

