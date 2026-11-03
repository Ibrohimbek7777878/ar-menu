"""Menyuni rasm/matndan o'qishda AI (uchinchi tomon) ishlatilsinmi: `Shop.business_profile['menu_import_ai']`.

Qiymatlar: `on` (standart) yoki `off`. `off` bo'lsa restoranning rasmi/matni HECH QACHON uchinchi tomonga yuborilmaydi:
faqat lokal usullar (jadval/matn qoidalari, Tesseract OCR) ishlaydi. Noma'lum qiymat saytni buzmaydi: `on`.
Admin: /ra/ sozlamalari ("Menyuni AI orqali o'qish"). Eski usul o'chirilmaydi, faqat yoqiladi/o'chiriladi (AGENTS 4-qoida).

Restoran noma'lum bo'lsa (`shop=None`, id yo'q) javob `off`: maxfiylik sozlamasini tekshirib bo'lmasa, ma'lumot tashqariga chiqmaydi.
"""

MENU_IMPORT_AI_CHOICES = ('on', 'off')
DEFAULT_MENU_IMPORT_AI = 'on'


def normalize_menu_import_ai(value):
    value = str(value or '').strip().lower()
    return value if value in MENU_IMPORT_AI_CHOICES else DEFAULT_MENU_IMPORT_AI


def _load_shop_setting(shop_id):
    from shops.models import Shop
    profile = Shop.objects.filter(pk=shop_id).values_list('business_profile', flat=True).first()
    return normalize_menu_import_ai(profile.get('menu_import_ai') if isinstance(profile, dict) else None)


def menu_import_ai_for_shop_id(shop_id):
    """'on' | 'off'. Jarayon keshidan o'qiladi (qisqa TTL, Shop saqlansa signal bilan tozalanadi). Restoran yo'q -> 'off'."""
    if not shop_id or isinstance(shop_id, bool):
        return 'off'
    from backend.runtime_cache import cached_shop_value
    return cached_shop_value(shop_id, 'menu_import_ai', lambda: _load_shop_setting(shop_id))


def menu_import_ai_for_shop(shop):
    """'on' | 'off'. `shop` — Shop obyekti (eng yangi qiymat: so'rov boshida yuklangan `business_profile`), id yoki None."""
    if shop is None:
        return 'off'
    if hasattr(shop, 'business_profile'):
        profile = shop.business_profile
        return normalize_menu_import_ai(profile.get('menu_import_ai') if isinstance(profile, dict) else None)
    shop_id = shop if isinstance(shop, int) else getattr(shop, 'pk', None)
    return menu_import_ai_for_shop_id(shop_id)


def menu_import_ai_enabled(shop):
    return menu_import_ai_for_shop(shop) == 'on'
