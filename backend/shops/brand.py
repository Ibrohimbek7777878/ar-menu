"""Restoran BRENDI: nom, logotip, rang palitrasi, shrift, bosh sahifa matnlari, aloqa, bo'limlar, atamalar.
TZ: docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_MULTITENANT_BRON_BREND_VIDEO_TUR_2026-11-03.md (Bosqich 2).

Saqlash (YAGONA manba, ikkilamchi nusxa yo'q):
- nom                -> `Shop.name`            (brend nomi VA restoran nomi bir xil: bot, kirish sahifasi, chek shu nomdan foydalanadi)
- telefon, manzil    -> `Shop.phone`, `Shop.phone2`, `Shop.address`
- instagram          -> `Shop.instagram_url`
- biznes turi        -> `Shop.business_type`
- palitra            -> `business_profile['guest_palette']` (classic | orange | custom) — mavjud kalit, `brand.palette` shu
- qolgani            -> `business_profile['brand']` (JSON): tagline, logo_path, favicon_path, primary_color, accent_color, font,
                        hero, telegram, website, hours_text, modules (faqat berilganlar), terms (faqat berilganlar)
Shop.color_primary / color_accent — eski ustunlar (nomuvofiq standartlar '#16a34a'/'#1A1A2E', "belgilanmagan"ni ajratib bo'lmaydi);
brend ranglari JSON'da, ustunlarga esa eski sahifalar uchun BIR TOMONLAMA nusxa yoziladi.

O'qish (`build_brand`, `public_brand`) bag'ishlovchi: buzuq/eskirgan qiymat saytni buzmaydi (standart olinadi).
Yozish (`validate_brand_patch`) qat'iy: har xato `InputError` (400) + `field: "brand.hero.title"`; hech narsa jimgina tashlanmaydi.
"""
import copy
import re
import unicodedata
from dataclasses import dataclass, field
from urllib.parse import urlsplit

from backend.api_input import InputError, parse_bool
from shops import brand_color as bcol
from shops.guest_palette import DEFAULT_PALETTE, PALETTE_CHOICES, normalize_palette

FONT_CHOICES = ('serif', 'sans', 'rounded')          # serif = Playfair Display, sans = Plus Jakarta Sans, rounded = Outfit (hammasi LOKAL)
DEFAULT_FONT = 'serif'
# Egasi shrift tanlamagan bo'lsa — palitraning O'Z sarlavha shrifti (orqaga moslik: apelsin palitra avvaldan Outfit bilan edi, klassik — Playfair).
# Shu tufayli `data-font` har doim yoziladi, lekin apelsin palitradagi mavjud restoranlarning ko'rinishi o'zgarmaydi.
PALETTE_DEFAULT_FONT = {'classic': 'serif', 'orange': 'rounded', 'custom': 'serif'}
MODULE_KEYS = ('menu', 'ar360', 'booking', 'tour', 'orders', 'waiter_call')
TERM_KEYS = ('table', 'guest', 'venue')
BUSINESS_TYPES = ('restaurant', 'cafe', 'banquet')

# Biznes turi shablonlari (admin "shablonni qo'llash"): atamalar, bo'limlar va BOSH SAHIFA matnlari standarti.
# `hero` — egasi o'zi yozmagan sarlavha/matn o'rniga ko'rinadigan standart (o'zbekcha); `hero_i18n` — shu standartning ru/en tarjimasi
# (mehmon sessiyasida faqat standartdan olingan maydonlar uchun beriladi, egasi yozgan matn tarjima qilinmaydi).
# RESTORAN: `hero` bo'sh — mehmon ilovasining o'z (tarjima qilingan, "ta'mi" ajratilgan) standart sarlavhasi saqlanadi.
# `cta_text` hamma shablonda bo'sh: ilovaning tarjima qilingan «Menyuni ko'rish» tugmasi qoladi.
BUSINESS_PRESETS = {
    'restaurant': {'label': 'Restoran', 'terms': {'table': 'Stol', 'guest': 'Mehmon', 'venue': 'Restoran'},
                   'modules': {key: True for key in MODULE_KEYS}, 'hero': {}, 'hero_i18n': {}},
    'cafe': {
        'label': 'Kafe', 'terms': {'table': 'Stol', 'guest': 'Mehmon', 'venue': 'Kafe'},
        'modules': {key: True for key in MODULE_KEYS},
        'hero': {'title': "Qahva, shirinlik va iliq muhit",
                 'subtitle': "Menyuni 360° ko'rinishda aylantirib ko'ring, tanlang — buyurtmangiz darrov oshxona va baristaga tushadi."},
        'hero_i18n': {
            'ru': {'title': 'Кофе, десерты и уютная атмосфера',
                   'subtitle': 'Листайте меню в 360°, выбирайте — заказ сразу уходит на кухню и бариста.'},
            'en': {'title': 'Coffee, desserts and a cozy atmosphere',
                   'subtitle': 'Browse the menu in 360°, pick your favourites — your order goes straight to the kitchen and the barista.'},
        },
    },
    'banquet': {
        'label': "To'yxona", 'terms': {'table': 'Zal/Stol', 'guest': 'Mehmon', 'venue': "To'yxona"},
        'modules': {key: True for key in MODULE_KEYS},
        'hero': {'title': "Unutilmas to'y va tantanalar bizning zalda",
                 'subtitle': "Zal va stollarni oldindan ko'ring, joyni band qiling va mehmonlaringiz uchun mazali menyuni tanlang."},
        'hero_i18n': {
            'ru': {'title': 'Незабываемые свадьбы и торжества в нашем зале',
                   'subtitle': 'Осмотрите зал и столы заранее, забронируйте место и выберите вкусное меню для гостей.'},
            'en': {'title': 'Unforgettable weddings and celebrations in our hall',
                   'subtitle': 'Preview the hall and tables, book your spot and choose a delicious menu for your guests.'},
        },
    },
}
DEFAULT_BUSINESS_TYPE = 'restaurant'

# Uzunlik chegaralari (qat'iy rejim)
NAME_MAX = 60
TAGLINE_MAX = 120
HERO_LIMITS = {'title': 80, 'subtitle': 240, 'cta_text': 40}
TERM_MAX = 24
HOURS_TEXT_MAX = 160
ADDRESS_MAX = 300           # mehmon ilovasi (frontend/src/utils/brand.ts) manzilni 300 belgida kesadi: kesilgan manzil bo'lmasin
URL_MAX = 200
WEBSITE_MAX = 120           # ilova havolani 120 belgida kesadi (kesilgan havola ishlamaydi) — shuning uchun server shundan uzunini qabul qilmaydi

# Brend tahririda ruxsat etilgan kalitlar. Faqat o'qiladigan kalitlar (javobda bor, PATCH da e'tiborsiz): mijoz javobni o'zgartirmay
# qaytarib yuborsa ham 400 bermasin.
WRITABLE_KEYS = ('name', 'tagline', 'palette', 'primary_color', 'accent_color', 'font', 'hero', 'contact', 'modules', 'terms')
READ_ONLY_KEYS = ('logo_url', 'favicon_url', 'business_type', 'adjusted', 'adjusted_from', 'accent_adjusted', 'accent_adjusted_from')
CONTACT_KEYS = ('phone', 'phone2', 'address', 'instagram', 'telegram', 'website', 'hours_text')

_BRAND_FILE_RE = re.compile(r'brand/shop_(\d+)/(logo|favicon)-[0-9a-f]{12}\.(?:webp|png)')
_PHONE_RE = re.compile(r'\+?[0-9][0-9 ()\-]{3,19}')
_INSTAGRAM_NAME_RE = re.compile(r'[A-Za-z0-9._]{1,30}')
_TELEGRAM_NAME_RE = re.compile(r'[A-Za-z0-9_]{5,32}')
_HOST_RE = re.compile(r'(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}')
_URL_CHARS_RE = re.compile(r"[A-Za-z0-9\-._~:/?#@!$&()*+,;=%]+")
_BIDI_CONTROLS = frozenset('‎‏‪‫‬‭‮⁦⁧⁨⁩﻿')


# ── Fayl yo'li va manzil ─────────────────────────────────────────────────────────────────────────────────

def owns_brand_file(path, shop_id):
    """`path` shu restoranning brend papkasidagi (brand/shop_<id>/…) to'g'ri nomli fayl yo'limi."""
    if not isinstance(path, str) or shop_id is None:
        return False
    match = _BRAND_FILE_RE.fullmatch(path)
    return bool(match) and int(match.group(1)) == int(shop_id)


def brand_file_url(path, shop_id):
    """Brend fayl yo'lidan ochiq manzil. Yo'l faqat SHU restoranning `brand/shop_<id>/…` papkasida bo'lsa (bazadagi begona yo'l
    boshqa tenant faylini ko'rsatib qo'ymasin); aks holda None."""
    if not owns_brand_file(path, shop_id):
        return None
    try:
        from django.core.files.storage import default_storage
        return default_storage.url(path)
    except Exception:  # noqa: BLE001 — saqlash tizimi vaqtincha ishlamasa sahifa yiqilmasin
        return None


def brand_file_path(shop_id, kind, digest, extension):
    return f'brand/shop_{int(shop_id)}/{kind}-{digest}.{extension}'


# ── O'qish (bag'ishlovchi) ───────────────────────────────────────────────────────────────────────────────

def _clean_text(value, limit):
    if not isinstance(value, str):
        return ''
    return ' '.join(value.replace('\x00', '').split())[:limit]


def _stored(profile):
    brand = profile.get('brand') if isinstance(profile, dict) else None
    return brand if isinstance(brand, dict) else {}


def effective_business_type(value):
    return value if value in BUSINESS_PRESETS else DEFAULT_BUSINESS_TYPE


def effective_terms(business_type, stored):
    terms = dict(BUSINESS_PRESETS[effective_business_type(business_type)]['terms'])
    overrides = stored.get('terms') if isinstance(stored.get('terms'), dict) else {}
    for key in TERM_KEYS:
        text = _clean_text(overrides.get(key), TERM_MAX)
        if text:
            terms[key] = text
    return terms


def effective_modules(business_type, stored):
    modules = dict(BUSINESS_PRESETS[effective_business_type(business_type)]['modules'])
    overrides = stored.get('modules') if isinstance(stored.get('modules'), dict) else {}
    for key in MODULE_KEYS:
        if isinstance(overrides.get(key), bool):
            modules[key] = overrides[key]
    if not any(modules.values()):          # buzuq ma'lumot hamma bo'limni o'chirib saytni bo'sh qoldirmasin
        modules = {key: True for key in MODULE_KEYS}
    return modules


def effective_hero(business_type, stored):
    """Bosh sahifa matnlari: egasi yozgani, yozmagan maydon uchun biznes turi shablonining standarti.
    -> (hero, hero_i18n): `hero_i18n` = {'ru': {...}, 'en': {...}} faqat STANDARTDAN olingan maydonlar uchun (bo'lmasa {})."""
    preset = BUSINESS_PRESETS[effective_business_type(business_type)]
    raw = stored.get('hero') if isinstance(stored.get('hero'), dict) else {}
    hero, defaulted = {}, []
    for key, limit in HERO_LIMITS.items():
        own = _clean_text(raw.get(key), limit)
        hero[key] = own or preset['hero'].get(key, '')
        if not own and preset['hero'].get(key):
            defaulted.append(key)
    i18n = {}
    for lang, texts in preset['hero_i18n'].items():
        picked = {key: texts[key] for key in defaulted if texts.get(key)}
        if picked:
            i18n[lang] = picked
    return hero, i18n


def _palette_colors(palette):
    return bcol.PALETTE_COLORS.get(palette) or bcol.PALETTE_COLORS[DEFAULT_PALETTE]


def build_brand(row, profile, shop_id=None):
    """
    To'liq (admin) brend. `row` — Shop ustunlari (`name, phone, phone2, address, instagram_url, working_hours, business_type`)
    lug'ati yoki obyekti, `profile` — `business_profile`.

    Qo'shimcha (shartnomaga qo'shilgan) kalitlar: `adjusted`, `adjusted_from` (asosiy rang kontrast uchun to'qlashtirilgan),
    `accent_adjusted`, `accent_adjusted_from`. `primary_color` / `accent_color` HAR DOIM #RRGGBB (maxsus palitrada — saytda
    ishlayotgan, kontrastdan o'tgan qiymat; tayyor palitrada — oxirgi saqlangan maxsus rang yoki palitraning o'z rangi).
    """
    get = row.get if isinstance(row, dict) else (lambda key, default='': getattr(row, key, default))
    profile = profile if isinstance(profile, dict) else {}
    stored = _stored(profile)
    business_type = effective_business_type(get('business_type', DEFAULT_BUSINESS_TYPE))
    palette = normalize_palette(profile.get('guest_palette'))

    stored_primary = bcol.normalize_hex(stored.get('primary_color'))
    stored_accent = bcol.normalize_hex(stored.get('accent_color'))
    base_palette = palette if palette in bcol.PALETTE_COLORS else DEFAULT_PALETTE
    if stored_primary or palette == 'custom':
        derived = bcol.derive_brand(stored_primary, stored_accent)
        primary, accent = derived['primary'], derived['accent']
        adjusted, adjusted_from = derived['primary_adjusted'], (derived['primary_from'] if derived['primary_adjusted'] else None)
        accent_adjusted = derived['accent_adjusted']
        accent_adjusted_from = derived['accent_from'] if accent_adjusted else None
    else:
        primary, accent = _palette_colors(base_palette)['primary'], _palette_colors(base_palette)['accent']
        adjusted, adjusted_from, accent_adjusted, accent_adjusted_from = False, None, False, None

    hero, hero_i18n = effective_hero(business_type, stored)
    hours = _clean_text(stored.get('hours_text'), HOURS_TEXT_MAX) or _clean_text(get('working_hours', ''), HOURS_TEXT_MAX)
    font = stored.get('font') if stored.get('font') in FONT_CHOICES else PALETTE_DEFAULT_FONT.get(palette, DEFAULT_FONT)
    brand = {
        'name': get('name', '') or '',
        'tagline': _clean_text(stored.get('tagline'), TAGLINE_MAX),
        'logo_url': brand_file_url(stored.get('logo_path'), shop_id),
        'favicon_url': brand_file_url(stored.get('favicon_path'), shop_id),
        'palette': palette,
        'primary_color': primary,
        'accent_color': accent,
        'adjusted': adjusted,
        'adjusted_from': adjusted_from,
        'accent_adjusted': accent_adjusted,
        'accent_adjusted_from': accent_adjusted_from,
        'font': font,
        'hero': hero,
        'contact': {
            'phone': get('phone', '') or '',
            'phone2': get('phone2', '') or '',
            'address': get('address', '') or '',
            'instagram': get('instagram_url', '') or '',
            'telegram': _clean_text(stored.get('telegram'), URL_MAX),
            'website': _clean_text(stored.get('website'), URL_MAX),
            'hours_text': hours,
        },
        'modules': effective_modules(business_type, stored),
        'business_type': business_type,
        'terms': effective_terms(business_type, stored),
    }
    if hero_i18n:        # faqat standart matn ishlatilayotgan bo'lsa (restoran shablonida hech qachon)
        brand['hero_i18n'] = hero_i18n
    return brand


_ADMIN_ONLY = ('adjusted', 'adjusted_from', 'accent_adjusted', 'accent_adjusted_from', 'business_type')


def public_brand(brand):
    """Mehmon sessiyasiga (`window.__GULISTON_SESSION__.brand`) beriladigan ochiq, KICHIK qism. `primary_color` — saytda ishlayotgan rang."""
    out = {key: copy.deepcopy(value) for key, value in brand.items() if key not in _ADMIN_ONLY and key != 'accent_color'}
    return out


def module_enabled(brand, key):
    """`brand` — `build_brand`/`public_brand` natijasi."""
    return bool((brand or {}).get('modules', {}).get(key, True))


def brand_css_colors(brand, profile):
    """Maxsus palitrada (`custom`) CSS uchun (asosiy, urg'u) xom ranglar (bazadagi qiymat; yaroqsiz bo'lsa None — hisob standartga tushadi),
    aks holda None (CSS kerak emas). Hosilalarni `shops.brand_color.build_brand_css` hisoblaydi va kesh qiladi."""
    if brand.get('palette') != 'custom':
        return None
    stored = _stored(profile)
    return (bcol.normalize_hex(stored.get('primary_color')), bcol.normalize_hex(stored.get('accent_color')))


# ── Yozish: qat'iy tekshiruv ─────────────────────────────────────────────────────────────────────────────

def _text(value, path, limit, *, required=False):
    """Bir qatorli matn: bo'shliqlar yig'iladi, boshqaruv/yo'nalish belgilari rad etiladi, uzunlik chegaralanadi."""
    if value is None:
        value = ''
    if isinstance(value, bool) or not isinstance(value, (str, int, float)):
        raise InputError('Matn bo\'lishi kerak', path)
    raw = str(value).replace('\x00', '')
    if any(ch in _BIDI_CONTROLS or unicodedata.category(ch) == 'Cc' and ch not in '\t\n\r' for ch in raw):
        raise InputError("Matnda maxsus boshqaruv belgilari bo'lishi mumkin emas", path)
    text = ' '.join(raw.split())
    if required and not text:
        raise InputError("Bo'sh bo'lishi mumkin emas", path)
    if len(text) > limit:
        raise InputError(f'{limit} belgidan oshmasligi kerak (hozir: {len(text)})', path)
    return text


def _color(value, path):
    """'' / None — rangni olib tashlash (standart); aks holda qat'iy #RGB / #RRGGBB (-> #RRGGBB, katta harf)."""
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    color = bcol.normalize_hex(value)
    if color is None:
        raise InputError("Rang #RRGGBB ko'rinishida bo'lishi kerak (masalan #2F4836)", path)
    return color


def parse_phone(value, path='phone'):
    """Telefon: bo'sh yoki + va raqamlar/bo'shliq/qavs/defis, 7-15 raqam. Xato -> InputError(path)."""
    text = _text(value, path, 20)
    if text and (not _PHONE_RE.fullmatch(text) or not 7 <= len(re.sub(r'\D', '', text)) <= 15):
        raise InputError("Telefon raqami noto'g'ri (masalan +998 90 123 45 67)", path)
    return text


def _split_url(text, path, label):
    """Havola matnini bo'laklaydi: protokolsiz yozilgan ('instagram.com/x') ham qabul qilinadi; faqat https; kirish ma'lumoti/port yo'q."""
    candidate = text if '://' in text else 'https://' + text
    try:
        parts = urlsplit(candidate)
        port = parts.port
    except ValueError:
        raise InputError(f"{label} havolasi noto'g'ri", path) from None
    if parts.scheme not in ('https', 'http') or parts.username is not None or parts.password is not None or port is not None:
        raise InputError(f"{label} havolasi https:// bilan boshlanishi kerak (kirish ma'lumoti va port bo'lmaydi)", path)
    host = (parts.hostname or '').lower()
    if not _HOST_RE.fullmatch(host):
        raise InputError(f"{label} havolasi noto'g'ri (domen nomi)", path)
    return parts, host


def _social(value, path, *, label, hosts, name_re, base):
    """Instagram/Telegram: '@nom', 'nom' yoki to'liq havola -> `base + nom` (kanonik havola). Bo'sh qiymat — ''."""
    text = _text(value, path, URL_MAX)
    if not text:
        return ''
    if text.startswith('@'):
        name = text[1:]
    elif '/' in text or '://' in text:
        parts, host = _split_url(text, path, label)
        if host.removeprefix('www.') not in hosts:
            raise InputError(f"{label} havolasi {' yoki '.join(sorted(hosts))} manziliga ishora qilishi kerak", path)
        segments = [s for s in parts.path.split('/') if s]
        name = segments[0] if segments else ''
    else:
        name = text
    if not name or name.lower() in hosts or not name_re.fullmatch(name):
        raise InputError(f"{label} nomi noto'g'ri", path)
    return base + name


def _website(value, path):
    text = _text(value, path, WEBSITE_MAX)
    if not text:
        return ''
    if text.lower().startswith('http://'):
        raise InputError("Veb-sayt manzili https:// bilan boshlanishi kerak", path)
    if not _URL_CHARS_RE.fullmatch(text if '://' in text else 'https://' + text):
        raise InputError("Veb-sayt manzilida ruxsat etilmagan belgilar bor", path)
    parts, host = _split_url(text, path, 'Veb-sayt')
    if parts.scheme != 'https':
        raise InputError("Veb-sayt manzili https:// bilan boshlanishi kerak", path)
    rest = text.split('://', 1)[1] if '://' in text else text
    return 'https://' + host + rest[len(parts.netloc):]


@dataclass
class BrandPatch:
    """`validate_brand_patch` natijasi: hali hech narsa yozilmagan, faqat tekshirilgan o'zgarishlar."""
    shop_fields: dict = field(default_factory=dict)      # Shop ustunlari: name, phone, phone2, address, instagram_url
    brand: dict = field(default_factory=dict)            # business_profile['brand'] ga: kalit -> qiymat; None = kalitni olib tashlash
    nested: dict = field(default_factory=dict)           # birlashtiriladigan ichma-ich: hero / modules / terms -> {kalit: qiymat | None}
    palette: str = None                                  # business_profile['guest_palette']
    colors: dict = field(default_factory=dict)           # primary_color / accent_color -> #RRGGBB | None
    notices: dict = field(default_factory=dict)          # javobga: adjusted, adjusted_from, accent_adjusted, accent_adjusted_from


def _dict(value, path):
    if not isinstance(value, dict):
        raise InputError('Obyekt bo\'lishi kerak', path)
    return value


def validate_brand_patch(data, current_name='', profile=None, business_type=DEFAULT_BUSINESS_TYPE):
    """
    `data` — PATCH `brand`. Berilgan kalitlar BIRLASHTIRILADI (to'liq almashtirish emas). Xato -> InputError(field="brand.…").
    Hech narsa yozmaydi; natijani `apply_brand_patch` qo'llaydi.
    """
    data = _dict(data, 'brand')
    profile = profile if isinstance(profile, dict) else {}
    stored = _stored(profile)
    patch = BrandPatch()
    for key in data:
        if key not in WRITABLE_KEYS and key not in READ_ONLY_KEYS:
            raise InputError(f"Noma'lum kalit: «{key}»", f'brand.{key}')

    if 'name' in data:
        name = _text(data['name'], 'brand.name', 200, required=True)
        if name != current_name and len(name) > NAME_MAX:
            raise InputError(f'Nom {NAME_MAX} belgidan oshmasligi kerak (hozir: {len(name)})', 'brand.name')
        patch.shop_fields['name'] = name
    if 'tagline' in data:
        patch.brand['tagline'] = _text(data['tagline'], 'brand.tagline', TAGLINE_MAX) or None
    if 'palette' in data:
        value = data['palette']
        if not isinstance(value, str) or value.strip().lower() not in PALETTE_CHOICES:
            raise InputError(f"Palitra: {', '.join(PALETTE_CHOICES)} dan biri bo'lishi kerak", 'brand.palette')
        patch.palette = value.strip().lower()
    if 'font' in data:
        value = data['font']
        if not isinstance(value, str) or value.strip().lower() not in FONT_CHOICES:
            raise InputError(f"Shrift: {', '.join(FONT_CHOICES)} dan biri bo'lishi kerak", 'brand.font')
        patch.brand['font'] = value.strip().lower()

    for key in ('primary_color', 'accent_color'):
        if key in data:
            patch.colors[key] = _color(data[key], f'brand.{key}')

    if 'hero' in data:
        for key, value in _dict(data['hero'], 'brand.hero').items():
            if key not in HERO_LIMITS:
                raise InputError(f"Noma'lum kalit: «{key}»", f'brand.hero.{key}')
            patch.nested.setdefault('hero', {})[key] = _text(value, f'brand.hero.{key}', HERO_LIMITS[key]) or None

    if 'contact' in data:
        for key, value in _dict(data['contact'], 'brand.contact').items():
            path = f'brand.contact.{key}'
            if key not in CONTACT_KEYS:
                raise InputError(f"Noma'lum kalit: «{key}»", path)
            if key in ('phone', 'phone2'):
                patch.shop_fields[key] = parse_phone(value, path)
            elif key == 'address':
                patch.shop_fields['address'] = _text(value, path, ADDRESS_MAX)
            elif key == 'instagram':
                patch.shop_fields['instagram_url'] = _social(
                    value, path, label='Instagram', hosts={'instagram.com'}, name_re=_INSTAGRAM_NAME_RE,
                    base='https://www.instagram.com/')
            elif key == 'telegram':
                patch.brand['telegram'] = _social(
                    value, path, label='Telegram', hosts={'t.me', 'telegram.me'}, name_re=_TELEGRAM_NAME_RE,
                    base='https://t.me/') or None
            elif key == 'website':
                patch.brand['website'] = _website(value, path) or None
            else:
                patch.brand['hours_text'] = _text(value, path, HOURS_TEXT_MAX) or None

    if 'modules' in data:
        changes = {}
        for key, value in _dict(data['modules'], 'brand.modules').items():
            if key not in MODULE_KEYS:
                raise InputError(f"Noma'lum bo'lim: «{key}»", f'brand.modules.{key}')
            changes[key] = parse_bool(value, f'brand.modules.{key}')
        patch.nested['modules'] = changes
        merged = dict(BUSINESS_PRESETS[effective_business_type(business_type)]['modules'])
        stored_modules = stored.get('modules') if isinstance(stored.get('modules'), dict) else {}
        merged.update({k: v for k, v in stored_modules.items() if k in MODULE_KEYS and isinstance(v, bool)})
        merged.update(changes)
        if not any(merged.values()):
            raise InputError("Kamida bitta bo'lim yoqiq bo'lishi kerak", 'brand.modules')

    if 'terms' in data:
        for key, value in _dict(data['terms'], 'brand.terms').items():
            if key not in TERM_KEYS:
                raise InputError(f"Noma'lum atama: «{key}»", f'brand.terms.{key}')
            patch.nested.setdefault('terms', {})[key] = _text(value, f'brand.terms.{key}', TERM_MAX) or None
    return patch


def apply_brand_patch(patch, profile, shop_id, old_palette=None):
    """
    Tekshirilgan o'zgarishlarni `business_profile` nusxasiga qo'llaydi. -> yangi profil (nusxa). Shop ustunlari `patch.shop_fields` da,
    javob ogohlantirishlari `patch.notices` da.
    Ranglar kontrast uchun to'qlashtiriladi (`patch.notices` to'ldiriladi); tayyor palitradan maxsus palitraga o'tishda rang berilmagan
    bo'lsa, joriy palitraning o'z ranglari boshlang'ich qiymat bo'ladi (sayt ko'rinishi birdan o'zgarmasin).
    """
    new_profile = copy.deepcopy(profile) if isinstance(profile, dict) else {}
    brand = dict(_stored(new_profile))

    for key, value in patch.brand.items():
        if value is None:
            brand.pop(key, None)
        else:
            brand[key] = value

    for group, changes in patch.nested.items():
        current = dict(brand.get(group)) if isinstance(brand.get(group), dict) else {}
        for key, value in changes.items():
            if value is None:
                current.pop(key, None)
            else:
                current[key] = value
        if current:
            brand[group] = current
        else:
            brand.pop(group, None)

    if patch.palette is not None:
        new_profile['guest_palette'] = patch.palette
    palette = normalize_palette(new_profile.get('guest_palette'))

    colors = dict(patch.colors)
    if palette == 'custom' and (old_palette or DEFAULT_PALETTE) != 'custom':
        seed = _palette_colors(old_palette if old_palette in bcol.PALETTE_COLORS else DEFAULT_PALETTE)
        if 'primary_color' not in colors and not bcol.normalize_hex(brand.get('primary_color')):
            colors['primary_color'] = seed['primary']
        if 'accent_color' not in colors and not bcol.normalize_hex(brand.get('accent_color')):
            colors['accent_color'] = seed['accent']

    if colors:
        primary = colors['primary_color'] if 'primary_color' in colors else bcol.normalize_hex(brand.get('primary_color'))
        accent = colors['accent_color'] if 'accent_color' in colors else bcol.normalize_hex(brand.get('accent_color'))
        derived = bcol.derive_brand(primary, accent)
        if primary:
            brand['primary_color'] = derived['primary']
        else:
            brand.pop('primary_color', None)
        if accent:
            brand['accent_color'] = derived['accent']
        else:
            brand.pop('accent_color', None)
        patch.notices = {
            'adjusted': bool(primary) and derived['primary_adjusted'],
            'adjusted_from': derived['primary_from'] if (primary and derived['primary_adjusted']) else None,
            'accent_adjusted': bool(accent) and derived['accent_adjusted'],
            'accent_adjusted_from': derived['accent_from'] if (accent and derived['accent_adjusted']) else None,
        }

    if brand:
        new_profile['brand'] = brand
    else:
        new_profile.pop('brand', None)
    return new_profile


# ── Biznes turi shabloni ─────────────────────────────────────────────────────────────────────────────────

def apply_preset(profile, business_type):
    """Shablonni qo'llaydi: `terms` va `modules` shablon standartiga qaytadi (egasining shaxsiy o'zgartirishlari tozalanadi).
    -> (yangi_profil, oldingi_qiymatlar, qo'llanganlar). Shop.business_type ni chaqiruvchi yozadi."""
    if business_type not in BUSINESS_PRESETS:
        raise InputError(f"Biznes turi: {', '.join(BUSINESS_TYPES)} dan biri bo'lishi kerak", 'business_type')
    new_profile = copy.deepcopy(profile) if isinstance(profile, dict) else {}
    brand = dict(_stored(new_profile))
    previous = {'terms': brand.pop('terms', None), 'modules': brand.pop('modules', None)}
    if brand:
        new_profile['brand'] = brand
    else:
        new_profile.pop('brand', None)
    preset = BUSINESS_PRESETS[business_type]
    return new_profile, previous, {'terms': dict(preset['terms']), 'modules': dict(preset['modules']), 'hero': dict(preset['hero'])}


# ── Shop bilan ishlash ───────────────────────────────────────────────────────────────────────────────────

SHOP_BRAND_COLUMNS = ('name', 'phone', 'phone2', 'address', 'instagram_url', 'working_hours', 'business_type')


def shop_row(shop):
    return {column: getattr(shop, column, '') for column in SHOP_BRAND_COLUMNS}


def brand_of_shop(shop):
    """Shop obyektidan to'liq brend (admin GET)."""
    return build_brand(shop_row(shop), shop.business_profile, shop.pk)


def mirror_legacy_colors(shop, profile):
    """Eski `Shop.color_primary/color_accent` ustunlariga BIR TOMONLAMA nusxa (eski sahifalar bir xil rangni ko'rsin).
    -> o'zgargan ustunlar nomlari."""
    brand = _stored(profile)
    changed = []
    primary = bcol.normalize_hex(brand.get('primary_color'))
    accent = bcol.normalize_hex(brand.get('accent_color'))
    if primary and shop.color_primary != primary:
        shop.color_primary = primary
        changed.append('color_primary')
    if accent and shop.color_accent != accent:
        shop.color_accent = accent
        changed.append('color_accent')
    return changed
