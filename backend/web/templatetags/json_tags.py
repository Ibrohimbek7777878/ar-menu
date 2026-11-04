"""
JSON ma'lumotini <script> ichiga XSS'siz joylash (TZ: R-SEC-05).

Avval shablonlar `{{ data_json|safe }}` qilardi: mijoz ismiga yoki ?t= parametriga
`</script><script>…` yozilsa, kod oshxona/admin brauzerida bajarilardi.
`script_json` Django'ning `json_script` filtri bilan bir xil belgilarni escape qiladi
(<, >, & → \\u003C, \\u003E, \\u0026), lekin `window.__X__ = ...;` shaklini saqlaydi —
React tomonida hech narsa o'zgarmaydi.

Ishlatish:
    {% load json_tags %}
    <script>window.__GULISTON_DATA__ = {{ react_data_json|script_json }};</script>
"""
import json

from django import template
from django.core.serializers.json import DjangoJSONEncoder
from django.utils.safestring import mark_safe

register = template.Library()

_JSON_SCRIPT_ESCAPES = {
    ord('>'): '\\u003E',
    ord('<'): '\\u003C',
    ord('&'): '\\u0026',
    0x2028: '\\u2028',
    0x2029: '\\u2029',
}


@register.simple_tag(takes_context=True)
def gulistan_session(context):
    """<script>window.__GULISTON_SESSION__ = {role, roles, name, demo};</script> — rol faqat serverdan (R1-9)."""
    from web.restaurant_auth import spa_session
    request = context.get('request')
    payload = spa_session(request) if request is not None else {'role': 'guest', 'roles': [], 'demo': False}
    text = json.dumps(payload, ensure_ascii=False).translate(_JSON_SCRIPT_ESCAPES)
    return mark_safe(f'<script>window.__GULISTON_SESSION__ = {text};</script>')


def _page_shop_id(context):
    """Sahifa qaysi restoranniki: xodim — o'z restorani, mehmon/kirmagan — QR stol yoki host tenanti (palitra, brend CSS, shrift, favicon uchun bir xil).
    Platforma hostida restoran yo'q (None): standart klassik ko'rinish."""
    from shops.tenancy import on_platform_host
    from web.restaurant_auth import guest_shop_id, is_restaurant_staff, staff_shop
    request = context.get('request')
    if request is None:
        return None, None
    if on_platform_host():
        return None, request           # platforma hosti (apex/www/app) betaraf: hech bir restoranning brendi/palitrasi qo'llanmaydi
    user = getattr(request, 'user', None)
    shop = staff_shop(request) if (user is not None and is_restaurant_staff(user)) else None
    return (getattr(shop, 'id', None) or guest_shop_id(request)), request


@register.simple_tag(takes_context=True)
def gulistan_palette(context):
    """`<html data-palette="{% gulistan_palette %}">`: 'classic' (standart, yashil-krem), 'orange' yoki 'custom' (restoranning o'z rangi:
    `{% gulistan_brand_css %}` beradi). Hech qachon xato bermaydi: sahifa palitra tufayli yiqilmasin (xato bo'lsa 'classic')."""
    try:
        from shops.guest_palette import DEFAULT_PALETTE
        from shops.guest_profile import guest_palette_for_shop_id
        shop_id, request = _page_shop_id(context)
        if request is None:
            return DEFAULT_PALETTE
        return guest_palette_for_shop_id(shop_id, request)
    except Exception:  # noqa: BLE001
        return 'classic'


@register.simple_tag(takes_context=True)
def gulistan_brand_css(context, scope='all'):
    """`<head>` oxirida: maxsus palitrada `<style id="brand-vars">…</style>` (kun va tun bloklari), aks holda bo'sh.
    `scope`: 'guest' (mehmon sahifalari), 'admin' (/ra/, kirish sahifasi) yoki 'all'. Mehmon va admin neytral tokenlarining nomlari
    qisman bir xil, qiymatlari boshqa — shuning uchun sahifa o'z doirasini aytadi.
    Qiymatlar faqat `#RRGGBB` va sonlar (shops/brand_color.py): bazadagi har qanday matn CSS'ga o'tmaydi (XSS yo'q).
    Hech qachon xato bermaydi."""
    try:
        from shops.guest_profile import guest_brand_css_for_shop_id
        shop_id, request = _page_shop_id(context)
        if request is None:
            return ''
        css = guest_brand_css_for_shop_id(shop_id, request, scope)
        return mark_safe(f'<style id="brand-vars">{css}</style>') if css else ''
    except Exception:  # noqa: BLE001
        return ''


@register.simple_tag(takes_context=True)
def gulistan_font(context):
    """`<html data-font="{% gulistan_font %}">`: 'serif' (standart, Playfair), 'sans' (Plus Jakarta) yoki 'rounded' (Outfit)."""
    try:
        from shops.brand import DEFAULT_FONT
        from shops.guest_profile import guest_brand_for_shop_id
        shop_id, request = _page_shop_id(context)
        brand = guest_brand_for_shop_id(shop_id, request) if request is not None else None
        return (brand or {}).get('font') or DEFAULT_FONT
    except Exception:  # noqa: BLE001
        return 'serif'


@register.simple_tag(takes_context=True)
def gulistan_favicon(context):
    """Restoran favicon'i bo'lsa `<link rel="icon">`, aks holda bo'sh (shablon o'z standart belgisini qo'yadi)."""
    try:
        from django.utils.html import format_html
        from shops.guest_profile import guest_brand_for_shop_id
        shop_id, request = _page_shop_id(context)
        brand = guest_brand_for_shop_id(shop_id, request) if request is not None else None
        url = (brand or {}).get('favicon_url')
        return format_html('<link rel="icon" href="{}">', url) if url else ''
    except Exception:  # noqa: BLE001
        return ''


@register.simple_tag(takes_context=True)
def gulistan_brand(context):
    """Kirish sahifasi uchun: {name, logo_url, initial}. Platforma hostida — «Platforma»; restoran hostida — restoran brendi
    (nom + logotip); restoran topilmasa — «Guliston». Hech qachon xato bermaydi."""
    fallback = {'name': 'Guliston', 'logo_url': None, 'initial': 'G'}
    try:
        from shops.guest_profile import guest_brand_for_shop_id
        from shops.tenancy import on_platform_host
        if on_platform_host():
            return {'name': 'Platforma', 'logo_url': None, 'initial': 'P'}
        shop_id, request = _page_shop_id(context)
        brand = guest_brand_for_shop_id(shop_id, request) if request is not None else None
        name = (brand or {}).get('name') or ''
        if not name:
            return fallback
        return {'name': name, 'logo_url': brand.get('logo_url'), 'initial': name.strip()[:1].upper() or 'G'}
    except Exception:  # noqa: BLE001
        return fallback


@register.filter(is_safe=True)
def script_json(value):
    """
    Satr (oldindan json.dumps qilingan) yoki Python obyekti → <script> uchun xavfsiz JSON.
    JSON'da <, >, & faqat satr ichida uchraydi, shuning uchun \\uXXXX ga almashtirish ma'noni o'zgartirmaydi.
    """
    if value is None or value == '':
        text = 'null'
    elif isinstance(value, (bytes, bytearray)):
        text = value.decode('utf-8')
    elif isinstance(value, str):
        text = value
    else:
        text = json.dumps(value, cls=DjangoJSONEncoder, ensure_ascii=False)
    return mark_safe(text.translate(_JSON_SCRIPT_ESCAPES))
