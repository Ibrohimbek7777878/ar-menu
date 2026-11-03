"""
Restoranga oid sozlamalarni o'qish (TZ_MULTITENANT Bosqich 0): `Shop.business_profile[kalit]` -> global `AppSetting` -> `.env`.

Avval bu kalitlar butun serverga umumiy edi (`guest_design`, KDS taymeri, `bot_scope`...): bitta restoran o'zgartirsa hammasiga
ta'sir qilardi. Endi har restoran o'zinikini `business_profile` ga yozadi (yozuv: admin sozlamalar API'si, `settings_admin.py`);
qiymat yo'q bo'lsa global qiymat zaxira bo'ladi — mavjud serverlar o'zgarishsiz ishlayveradi (orqaga mosligi).

Qaysi kalit restoranga oid: `SHOP_SCOPED_KEYS`. Qolganlari (`guest_api` kill-switch, `ai_assistant`, `restaurant_default_shop`,
Telegram bot tokeni...) platforma darajasida — ular HALI global (hisobotga qarang). Do'kon uzatilmasa va so'rov tenant hostida
bo'lsa, tenant do'koni ishlatiladi (`shops.tenancy.current_tenant`).
"""

# Restoranga oid kalitlar: `get_int/get_choice/get_bool` do'kon ko'rsatilmagan bo'lsa ham joriy tenantning qiymatini o'qiydi.
SHOP_SCOPED_KEYS = frozenset({
    'guest_design',                 # mehmon dizayni: new | classic
    'kds_warn_minutes',             # KDS taymeri: sariq chegarasi
    'kds_late_minutes',             # KDS taymeri: qizil chegarasi
    'bot_scope',                    # bot klaviaturasi: restaurant | all
    'panel_scope',                  # eski /seller/ paneli ko'rinishi
    'reservation_slot_minutes',     # bron davomiyligi (bron backend: B1)
    'reservation_max_days_ahead',
    'reservation_max_guests',
})


def shop_value(key, shop=None, explicit=False):
    """
    `business_profile[key]` (bo'sh/None bo'lsa None). `shop` berilmasa joriy tenant olinadi, lekin FAQAT `SHOP_SCOPED_KEYS`
    uchun. `explicit=True` (chaqiruvchi do'kon uzatgan) — istalgan kalit.
    """
    key = str(key).lower()
    if shop is None:
        if key not in SHOP_SCOPED_KEYS:
            return None
        from shops.tenancy import current_tenant
        shop = current_tenant()
        if shop is None:
            return None
    elif not explicit and key not in SHOP_SCOPED_KEYS:
        return None
    profile = getattr(shop, 'business_profile', None)
    if not isinstance(profile, dict):
        return None
    value = profile.get(key)
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    return value
