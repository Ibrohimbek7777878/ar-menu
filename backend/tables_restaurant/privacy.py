"""
Bron ma'lumotlarini mehmonga xavfsiz ko'rsatish (TZ: R-SEC-04, R-SEC-13).

Mehmon o'z bronini faqat aniq kod (GS-K7QX2) yoki to'liq telefon raqami bilan topadi;
javobda ism va telefon maskalanadi. Kod endi taxmin qilib bo'lmaydi (tasodifiy, 31^5 variant); avval u ketma-ket
`GS-{id+2840}` edi va kodlarni terib begona bronlarning sana/vaqt/stolini yig'ish mumkin edi (TZ: R4).
"""
import re

_CODE_RE = re.compile(r'(?i)\s*GS-?([A-Z0-9]{5})\s*')


def mask_phone(phone):
    """+998 90 *** ** 67"""
    digits = ''.join(ch for ch in str(phone or '') if ch.isdigit())
    if len(digits) < 4:
        return ''
    if len(digits) >= 9:
        return f"+{digits[:3]} {digits[3:5]} *** ** {digits[-2:]}"
    return f"*** {digits[-2:]}"


def mask_name(name):
    """'Muhayyo Karimova' -> 'Muhayyo K.'"""
    parts = str(name or '').split()
    if not parts:
        return ''
    return parts[0] + (f" {parts[1][0]}." if len(parts) > 1 and parts[1] else '')


def find_reservation_by_code_or_phone(res_qs, query):
    """Faqat aniq bron kodi yoki to'liq (kamida 9 raqamli) telefon bo'yicha — qisman moslik yo'q."""
    query = (query or '').strip()
    if not query:
        return None
    code_match = _CODE_RE.fullmatch(query)
    if code_match:
        return res_qs.filter(public_code=f"GS-{code_match.group(1).upper()}").first()
    digits = ''.join(ch for ch in query if ch.isdigit())
    if len(digits) >= 9:
        last9 = digits[-9:]
        for res in res_qs.filter(customer_phone__endswith=last9[-4:]).order_by('-id')[:50]:
            if ''.join(ch for ch in str(res.customer_phone) if ch.isdigit()).endswith(last9):
                return res
    return None
