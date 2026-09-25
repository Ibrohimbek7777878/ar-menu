"""
⚡ PIN xavfsizligi:
  - 4-6 raqamli PIN, bcrypt (cost=10) bilan hash qilinadi
  - Ochiq matn HECH QAYERDA saqlanmaydi (DB, log, WS, javob)
  - Bir restoran ichida PIN takrorlanmasligi tekshiriladi
"""
import re
import logging
import bcrypt
from django.utils import timezone
from rest_framework import serializers

log = logging.getLogger('accounts.services')

PIN_RE = re.compile(r'^\d{4,6}$')
BCRYPT_ROUNDS = 10

# Juda oson PIN'lar — taqiqlanadi ⛔
WEAK_PINS = {
    '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
    '1234', '4321', '1212', '0123', '000000', '111111', '123456', '654321',
}


def validate_pin(pin: str):
    if not pin or not PIN_RE.match(pin):
        raise serializers.ValidationError('PIN 4-6 ta raqamdan iborat bo\'lishi kerak')
    if pin in WEAK_PINS:
        raise serializers.ValidationError('Bu PIN juda oddiy. Boshqasini tanlang.')


def hash_pin(pin: str) -> str:
    validate_pin(pin)
    return bcrypt.hashpw(pin.encode(), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode()


def verify_pin(pin: str, pin_hash: str) -> bool:
    if not pin or not pin_hash:
        return False
    try:
        return bcrypt.checkpw(pin.encode(), pin_hash.encode())
    except (ValueError, TypeError):
        return False


def set_pin(staff, pin: str, check_unique=True):
    """
    ⚡ PIN o'rnatish. Bir restoran ichida takrorlanmasin —
    aks holda login qaysi xodimni topishi noaniq bo'ladi.
    """
    validate_pin(pin)
    if check_unique:
        from apps.accounts.models import Staff
        others = Staff.objects.filter(
            restaurant_id=staff.restaurant_id, is_active=True
        ).exclude(pk=staff.pk).exclude(pin_hash='')
        for o in others:
            if verify_pin(pin, o.pin_hash):
                raise serializers.ValidationError(
                    'Bu PIN restoranda allaqachon ishlatilgan. Boshqasini tanlang.')
    staff.pin_hash = hash_pin(pin)
    staff.pin_set_at = timezone.now()
    staff.save(update_fields=['pin_hash', 'pin_set_at', 'updated_at'])
    log.info(f'[pin] set staff#{staff.id} rest#{staff.restaurant_id}')


def find_staff_by_pin(restaurant_id: int, pin: str):
    """
    ⚡ PIN bo'yicha xodimni topadi. Faqat SHU restoran ichida —
    cross-tenant PIN mos kelishi mumkin emas.
    Qaytadi: (staff | None)
    """
    from apps.accounts.models import Staff
    qs = Staff.objects.filter(
        restaurant_id=restaurant_id, is_active=True
    ).exclude(pin_hash='').select_related('restaurant')
    for s in qs:
        if verify_pin(pin, s.pin_hash):
            return s
    return None
