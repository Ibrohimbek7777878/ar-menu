"""V12 — UNIVERSAL BIZNES PRESETLAR: 14 biznes turi uchun tayyor sozlamalar.
Har tur: yorliqlar (3 til), taklif etilgan shablon kategoriyasi, ikonka.
Sotuvchi do'kon yaratganda preset avtomatik qo'llanadi, keyin qo'lda o'zgartirishi mumkin.
"""

BUSINESS_PRESETS = {
    'shop':         {'menu_label': {"uz": "Mahsulotlar", "ru": "Товары", "en": "Products"}, 'order_label': {"uz": "Buyurtma", "ru": "Заказ", "en": "Order"}, 'suggested_template': 'grocery', 'icon': '🛒', 'unit': 'dona'},
    'restaurant':   {'menu_label': {"uz": "Menyu", "ru": "Меню", "en": "Menu"}, 'order_label': {"uz": "Buyurtma", "ru": "Заказ", "en": "Order"}, 'suggested_template': 'food', 'icon': '🍽️', 'unit': 'porsiya'},
    'cafe':         {'menu_label': {"uz": "Menyu", "ru": "Меню", "en": "Menu"}, 'order_label': {"uz": "Buyurtma", "ru": "Заказ", "en": "Order"}, 'suggested_template': 'creative', 'icon': '☕', 'unit': 'piyola'},
    'bar':          {'menu_label': {"uz": "Karta", "ru": "Карта", "en": "Drinks"}, 'order_label': {"uz": "Buyurtma", "ru": "Заказ", "en": "Order"}, 'suggested_template': 'bold', 'icon': '🍸', 'unit': 'bokal'},
    'construction': {'menu_label': {"uz": "Katalog", "ru": "Каталог", "en": "Catalog"}, 'order_label': {"uz": "So'rov", "ru": "Заявка", "en": "Request"}, 'suggested_template': 'corporate', 'icon': '🧱', 'unit': 'dona'},
    'clothing':     {'menu_label': {"uz": "Kolleksiya", "ru": "Коллекция", "en": "Collection"}, 'order_label': {"uz": "Buyurtma", "ru": "Заказ", "en": "Order"}, 'suggested_template': 'fashion', 'icon': '👗', 'unit': 'dona'},
    'sport':        {'menu_label': {"uz": "Katalog", "ru": "Каталог", "en": "Catalog"}, 'order_label': {"uz": "Buyurtma", "ru": "Заказ", "en": "Order"}, 'suggested_template': 'sports', 'icon': '⚽', 'unit': 'dona'},
    'electronics':  {'menu_label': {"uz": "Katalog", "ru": "Каталог", "en": "Catalog"}, 'order_label': {"uz": "Buyurtma", "ru": "Заказ", "en": "Order"}, 'suggested_template': 'electronics', 'icon': '📱', 'unit': 'dona'},
    'agro':         {'menu_label': {"uz": "Hosil / Mahsulotlar", "ru": "Урожай / Продукты", "en": "Produce"}, 'order_label': {"uz": "Buyurtma", "ru": "Заказ", "en": "Order"}, 'suggested_template': 'grocery', 'icon': '🌱', 'unit': 'kg'},
    'beauty':       {'menu_label': {"uz": "Xizmatlar", "ru": "Услуги", "en": "Services"}, 'order_label': {"uz": "Bron", "ru": "Запись", "en": "Booking"}, 'suggested_template': 'beauty', 'icon': '💄', 'unit': 'xizmat'},
    'auto':         {'menu_label': {"uz": "Ehtiyot qismlar", "ru": "Запчасти", "en": "Parts"}, 'order_label': {"uz": "So'rov", "ru": "Заявка", "en": "Request"}, 'suggested_template': 'automotive', 'icon': '🚗', 'unit': 'dona'},
    'books':        {'menu_label': {"uz": "Katalog", "ru": "Каталог", "en": "Catalog"}, 'order_label': {"uz": "Buyurtma", "ru": "Заказ", "en": "Order"}, 'suggested_template': 'books', 'icon': '📚', 'unit': 'nusxa'},
    'flowers':      {'menu_label': {"uz": "Buketlar", "ru": "Букеты", "en": "Bouquets"}, 'order_label': {"uz": "Buyurtma", "ru": "Заказ", "en": "Order"}, 'suggested_template': 'elegant', 'icon': '💐', 'unit': 'buket'},
    'bakery':       {'menu_label': {"uz": "Mahsulotlar", "ru": "Изделия", "en": "Products"}, 'order_label': {"uz": "Buyurtma", "ru": "Заказ", "en": "Order"}, 'suggested_template': 'bakery', 'icon': '🥖', 'unit': 'dona'},
}


def apply_business_preset(shop):
    """Do'kon yaratilganda store_type bo'yicha preset qo'llash (qo'lda o'zgartirish mumkin)."""
    preset = BUSINESS_PRESETS.get(shop.store_type, BUSINESS_PRESETS['shop'])
    if not shop.business_profile:
        shop.business_profile = dict(preset)
    return shop
