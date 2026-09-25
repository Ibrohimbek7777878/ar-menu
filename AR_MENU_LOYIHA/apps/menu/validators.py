"""
⚡ IKPU (Yagona mahsulot va xizmatlar tasniflagichi) kodi validatsiyasi.
Format: 17 raqam (ba'zan 10 yoki 14). Faqat raqam.
Package code — o'lchov birligi kodi (soliq bazasidan).
"""
import re
from rest_framework import serializers

IKPU_RE = re.compile(r'^\d{10}$|^\d{14}$|^\d{17}$')
PACKAGE_RE = re.compile(r'^\d{1,10}$')


def validate_ikpu(value: str):
    if not value:
        return ''
    v = re.sub(r'[\s\-]', '', str(value))
    if not IKPU_RE.match(v):
        raise serializers.ValidationError(
            'IKPU kod 10, 14 yoki 17 ta raqamdan iborat bo\'lishi kerak')
    return v


def validate_package_code(value: str):
    if not value:
        return ''
    v = str(value).strip()
    if not PACKAGE_RE.match(v):
        raise serializers.ValidationError('O\'lchov birligi kodi faqat raqam')
    return v


def check_fiscal_readiness(restaurant) -> dict:
    """
    ⚡ Fiskal yoqishdan OLDIN tekshiriladi:
       IKPU'siz taomlar bo'lsa — chek urishda xato bo'ladi.
    """
    from apps.menu.models import Dish
    qs = Dish.objects.filter(restaurant_id=restaurant.id, is_available=True)
    missing = list(qs.filter(ikpu_code='').values('id', 'name_uz')[:50])
    total = qs.count()
    return {
        'ready': len(missing) == 0,
        'total_dishes': total,
        'missing_count': qs.filter(ikpu_code='').count(),
        'missing_sample': missing,
        'message_uz': ('Hammasi tayyor' if not missing
                       else f'{len(missing)}+ taomda IKPU kod yo\'q'),
    }
