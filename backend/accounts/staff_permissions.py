"""
Xodim profili va ruxsatlarini tahrirlash qoidalari (Xodimlar sahifasi, `accounts/interfaces/api/staff_admin.py`).

Bu yerda faqat QOIDALAR (HTTP yo'q): kim kimni tahrirlay oladi, kim qaysi ruxsatni bera oladi, login/ruxsat ro'yxatlarini
tekshirish. Katalog va samarali hisob — `web/capabilities.py`.

Qat'iy qoidalar:
  • o'z ruxsatlarini o'zgartirib bo'lmaydi; egasi va super_admin ruxsatlari/roli/logini boshqa hech kim o'zgartira olmaydi
    (egasi o'z loginini o'zgartirishi mumkin);
  • eskalatsiya taqiqi: tahrir qiluvchi o'zida YO'Q ruxsatni boshqaga bera olmaydi;
  • maxfiy ruxsatlarni (moliya, xodimlar, sozlamalar) faqat egasi (shop_owner / super_admin) bera oladi;
  • egasi bo'lmagan xodim (boshqaruvchi yoki unga `staff_admin` berilgan boshqa rol) egani va boshqa boshqaruvchilarni tahrirlay olmaydi.
"""
import re

from django.core.validators import validate_email
from django.core.exceptions import ValidationError

from accounts.models import AdminUser
from backend.api_input import InputError, parse_text
from web.capabilities import (
    CATALOG,
    CAPABILITY_KEYS,
    OWNER_ROLES,
    RESTAURANT_MANAGER_ROLES,
    SENSITIVE_CAPABILITIES,
    effective_capabilities_for,
    normalize_overrides,
    role_default_capabilities,
)
from web.restaurant_auth import capabilities_of, user_role

USERNAME_RE = re.compile(r'[A-Za-z0-9_.-]{3,30}')
USERNAME_HELP = "Login 3–30 belgidan iborat bo'lishi va faqat lotin harflari, raqam, «_», «.», «-» dan iborat bo'lishi kerak (bo'sh joy bo'lmasin)"
MAX_CAPABILITY_LIST = 50
_LABELS = {c['key']: c['label'] for c in CATALOG}


def is_owner_actor(actor):
    """Egasi yoki super_admin: hamma ruxsat va maxfiy ruxsatlarni berish huquqi."""
    return user_role(actor) in OWNER_ROLES


def is_protected_target(target):
    """Egasi / super_admin hisobi: roli, logini va ruxsatlarini boshqa hech kim o'zgartira olmaydi."""
    return target.role in OWNER_ROLES or bool(getattr(target, 'is_superuser', False))


def stored_overrides(user):
    """Saqlangan (extra, revoked) — joriy rolga moslab tozalangan holda."""
    return normalize_overrides(user.role, user.extra_capabilities, user.revoked_capabilities)


def permission_state(user):
    """{role_defaults, extra, revoked, effective} — kalitlar ro'yxati (katalog tartibida)."""
    extra, revoked = stored_overrides(user)
    return {
        'role_defaults': role_default_capabilities(user.role),
        'extra': extra,
        'revoked': revoked,
        'effective': effective_capabilities_for(user.role, extra, revoked),
    }


def can_edit_permissions(actor, target):
    """Joriy foydalanuvchi shu xodimning ruxsatlarini o'zgartira oladimi (o'zini va egalarni — hech qachon)."""
    if actor is None or actor.pk == target.pk or is_protected_target(target):
        return False
    return is_owner_actor(actor) or target.role not in RESTAURANT_MANAGER_ROLES


def grantable_capabilities(actor):
    """Tahrir qiluvchi boshqalarga bera oladigan kalitlar: egasi — hammasi; boshqalar — o'zida bor, maxfiy bo'lmaganlar."""
    if is_owner_actor(actor):
        return list(CAPABILITY_KEYS)
    own = set(capabilities_of(actor))
    return [key for key in CAPABILITY_KEYS if key in own and key not in SENSITIVE_CAPABILITIES]


def escalation_error(actor, granted):
    """Yangi beriladigan ruxsatlar (`granted`) tahrir qiluvchiga ruxsat etilganmi: xato matni yoki None."""
    if not granted or is_owner_actor(actor):
        return None
    sensitive = [key for key in granted if key in SENSITIVE_CAPABILITIES]
    if sensitive:
        names = ', '.join(f'«{_LABELS[key]}»' for key in sensitive)
        return f"Maxfiy ruxsatni ({names}) faqat restoran egasi bera oladi."
    own = set(capabilities_of(actor))
    missing = [key for key in granted if key not in own]
    if missing:
        names = ', '.join(f'«{_LABELS[key]}»' for key in missing)
        return f"O'zingizda yo'q ruxsatni ({names}) boshqaga bera olmaysiz."
    return None


def parse_capability_list(value, field):
    """So'rovdagi ruxsat ro'yxati: JSON massiv, faqat katalogdagi matn kalitlari. Noma'lum kalit yoki buzuq shakl — 400."""
    if not isinstance(value, (list, tuple)):
        raise InputError(f"«{field}» kalitlar ro'yxati (massiv) bo'lishi kerak", field)
    if len(value) > MAX_CAPABILITY_LIST:
        raise InputError(f"«{field}» ro'yxati {MAX_CAPABILITY_LIST} tadan oshmasligi kerak", field)
    keys = []
    for item in value:
        if not isinstance(item, str) or item not in CAPABILITY_KEYS:
            shown = str(item)[:40]
            raise InputError(f"Noma'lum ruxsat: «{shown}»", field)
        if item not in keys:
            keys.append(item)
    return keys


def parse_username(value, *, exclude_pk=None):
    """Yangi login: 3–30 belgi, [A-Za-z0-9_.-], katta-kichik harfsiz noyob. Noto'g'ri yoki band bo'lsa — 400 (field=username)."""
    text = parse_text(value, 'username', max_length=150, required=True)
    if not USERNAME_RE.fullmatch(text):
        raise InputError(USERNAME_HELP, 'username')
    taken = AdminUser.objects.filter(username__iexact=text)
    if exclude_pk is not None:
        taken = taken.exclude(pk=exclude_pk)
    if taken.exists():
        raise InputError(f"«{text}» logini band. Boshqa login tanlang.", 'username')
    return text


def parse_email(value):
    """Ixtiyoriy e-pochta: bo'sh qiymat — o'chirish; aks holda to'g'ri format (254 belgigacha)."""
    text = parse_text(value, 'email', max_length=254)
    if text:
        try:
            validate_email(text)
        except ValidationError:
            raise InputError("E-pochta manzili noto'g'ri", 'email') from None
    return text


_PASSWORD_MESSAGES = {
    'password_too_short': "Parol kamida 8 belgidan iborat bo'lsin.",
    'password_too_common': "Bu parol juda oddiy (ko'p ishlatiladi). Murakkabroq parol tanlang.",
    'password_entirely_numeric': "Parol faqat raqamlardan iborat bo'lmasin.",
    'password_too_similar': "Parol login yoki ism-familiyaga juda o'xshash. Boshqa parol tanlang.",
}


def password_problems(exc):
    """Django `validate_password` xatosi → o'zbekcha tushuntirish (noma'lum validator xabari o'zgarishsiz qoladi)."""
    messages = []
    for error in getattr(exc, 'error_list', None) or [exc]:
        text = _PASSWORD_MESSAGES.get(getattr(error, 'code', None)) or ' '.join(getattr(error, 'messages', None) or [str(error)])
        if text not in messages:
            messages.append(text)
    return ' '.join(messages)
