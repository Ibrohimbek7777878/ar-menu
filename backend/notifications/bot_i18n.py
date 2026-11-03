"""Botning MEHMONGA yuboriladigan matnlari: o'zbekcha / ruscha / inglizcha (Telegram `language_code` bo'yicha).

Faqat mehmon xabarlari (salomlashuv, tugmalar, ofitsiant chaqiruvi javoblari). Xodim/admin xabarlari (buyurtma kartalari,
/kassa, /order ...) o'zbekcha qoladi. Til: foydalanuvchining Telegram tili restoran yoqqan tillar (`guest_languages`) ichida bo'lsa
shu, aks holda restoranning birinchi yoqilgan tili. Tarjimasi yo'q kalit o'zbekcha ko'rinadi.
"""
from shops.guest_languages import normalize_languages

TEXTS = {
    'btn_menu': {'uz': '🍽 Menyuni ochish', 'ru': '🍽 Открыть меню', 'en': '🍽 Open the menu'},
    'btn_table': {'uz': '📍 Mening stolim & Bron', 'ru': '📍 Мой стол и бронь', 'en': '📍 My table & booking'},
    'btn_waiter': {'uz': '🛎 Ofitsiantni chaqirish', 'ru': '🛎 Позвать официанта', 'en': '🛎 Call the waiter'},
    'welcome_table': {
        'uz': '✅ <b>Siz {num}-stolga ulandingiz</b>{hall}\n\nEndi menyudan taom tanlashingiz mumkin.',
        'ru': '✅ <b>Вы подключены к столу {num}</b>{hall}\n\nТеперь можно выбирать блюда из меню.',
        'en': '✅ <b>You are connected to table {num}</b>{hall}\n\nYou can now choose dishes from the menu.',
    },
    'welcome_table_waiter': {
        'uz': " Ofitsiant kerak bo'lsa, pastdagi tugmani bosing.",
        'ru': ' Если нужен официант, нажмите кнопку ниже.',
        'en': ' Need a waiter? Tap the button below.',
    },
    'welcome': {
        'uz': "👋 <b>Xush kelibsiz, {name}!</b>\n\n<b>{shop}</b> menyusini shu yerning o'zida oching, taomni 360° da ko'ring va bir daqiqada buyurtma bering.",
        'ru': '👋 <b>Добро пожаловать, {name}!</b>\n\nОткройте меню <b>{shop}</b> прямо здесь, посмотрите блюдо в 360° и закажите за минуту.',
        'en': '👋 <b>Welcome, {name}!</b>\n\nOpen the <b>{shop}</b> menu right here, view the dish in 360° and order in a minute.',
    },
    'guest_name': {'uz': 'aziz mehmon', 'ru': 'дорогой гость', 'en': 'dear guest'},
    'shop_default': {'uz': 'Restoran', 'ru': 'Ресторан', 'en': 'Restaurant'},
    'table_unknown': {
        'uz': 'Stol aniqlanmadi. Stol ustidagi QR kodni qayta skanerlang.',
        'ru': 'Стол не определён. Отсканируйте QR-код на столе ещё раз.',
        'en': 'Table not recognized. Please scan the QR code on the table again.',
    },
    'table_not_found': {
        'uz': 'Stol topilmadi. Stol ustidagi QR kodni qayta skanerlang.',
        'ru': 'Стол не найден. Отсканируйте QR-код на столе ещё раз.',
        'en': 'Table not found. Please scan the QR code on the table again.',
    },
    'waiter_already': {
        'uz': '⏳ Ofitsiant allaqachon chaqirilgan. Iltimos, biroz kuting.',
        'ru': '⏳ Официант уже вызван. Пожалуйста, подождите немного.',
        'en': '⏳ The waiter has already been called. Please wait a moment.',
    },
    'waiter_error': {
        'uz': "Xatolik yuz berdi. Iltimos, ofitsiantni qo'l ko'tarib chaqiring.",
        'ru': 'Произошла ошибка. Пожалуйста, позовите официанта, подняв руку.',
        'en': 'Something went wrong. Please raise your hand to call the waiter.',
    },
    'waiter_called': {
        'uz': '🛎 Ofitsiant chaqirildi. Stol №{num}',
        'ru': '🛎 Официант вызван. Стол №{num}',
        'en': '🛎 Waiter called. Table №{num}',
    },
}


def bot_lang(language_code, enabled=None):
    """Telegram tili ("ru", "uz-UZ", "en-US", None) -> 'uz' | 'ru' | 'en'; yoqilmagan til bo'lsa restoranning birinchi tili."""
    allowed = normalize_languages(enabled).split(',')
    base = str(language_code or '').strip().lower().replace('_', '-').split('-')[0]
    return base if base in allowed else allowed[0]


def bt(lang, key, **params):
    forms = TEXTS[key]
    text = forms.get(lang) or forms['uz']
    return text.format(**params) if params else text
