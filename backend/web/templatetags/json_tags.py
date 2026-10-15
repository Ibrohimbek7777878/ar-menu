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
