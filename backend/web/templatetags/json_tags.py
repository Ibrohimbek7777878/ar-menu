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


@register.simple_tag(takes_context=True)
def gulistan_palette(context):
    """`<html data-palette="{% gulistan_palette %}">`: 'classic' (standart, yashil-krem) yoki 'orange'. Hech qachon xato bermaydi:
    sahifa palitra tufayli yiqilmasin (xato bo'lsa 'classic')."""
    try:
        from shops.guest_palette import DEFAULT_PALETTE
        from shops.guest_profile import guest_palette_for_shop_id
        from web.restaurant_auth import guest_shop_id, is_restaurant_staff, staff_shop
        request = context.get('request')
        if request is None:
            return DEFAULT_PALETTE
        user = getattr(request, 'user', None)
        shop = staff_shop(request) if (user is not None and is_restaurant_staff(user)) else None
        shop_id = getattr(shop, 'id', None) or guest_shop_id(request)
        return guest_palette_for_shop_id(shop_id, request)
    except Exception:  # noqa: BLE001
        return 'classic'


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
