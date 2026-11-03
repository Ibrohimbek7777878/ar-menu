"""
Restoran xodimlarini boshqarish yordamchilari (TZ: R2-2). `create_staff`/`block_staff` buyruqlari va kelajakdagi
"Xodimlar" sahifasi (R2-4) shu yerdan foydalanadi, shuning uchun qoidalar bir joyda.
"""
import secrets

from django.contrib.auth.password_validation import validate_password
from django.contrib.sessions.models import Session
from django.core.exceptions import ValidationError

from web.capabilities import normalize_overrides

from .models import AdminUser

# Rahbariyat xodimni yaratadi; rahbariyat rollarining o'zini (egasi, super_admin) bu yerdan yaratib bo'lmaydi.
CREATABLE_ROLES = ('waiter', 'kitchen', 'hostess', 'shop_manager')


class StaffError(Exception):
    pass


def _audit(action, user, **extra):
    try:
        from orders.audit import log_audit
        log_audit('account_change', target_type='admin_user', target_id=user.pk,
                  new_value={'event': action, 'username': user.username, 'role': user.role, **extra})
    except Exception:
        pass


def create_staff(shop, username, role, password='', full_name='', phone='', update=False, email=None,
                 extra_capabilities=None, revoked_capabilities=None):
    """Xodim yaratadi (yoki update=True bo'lsa mavjudini yangilaydi). (user, ko'rsatiladigan_parol|None) qaytaradi.

    `extra_capabilities` / `revoked_capabilities` berilsa, rolga moslab tozalanib saqlanadi (web/capabilities.py)."""
    username = (username or '').strip()
    if not username:
        raise StaffError("Login kiritilmagan")
    if role not in CREATABLE_ROLES:
        raise StaffError(f"Noto'g'ri rol: {role}. Mumkin: {', '.join(CREATABLE_ROLES)}")
    if shop is None:
        raise StaffError("Restoran ko'rsatilmagan")

    generated = None
    if not password:
        password = generated = secrets.token_urlsafe(9)
    try:
        validate_password(password)
    except ValidationError as exc:
        raise StaffError("Parol yetarli kuchli emas: " + ' '.join(exc.messages)) from None

    user = AdminUser.objects.filter(username=username).first()
    if user and not update:
        raise StaffError(f"'{username}' logini band. Mavjud xodimni yangilash uchun --update ishlating")
    if user:
        if user.role in ('super_admin', 'shop_owner') or user.is_superuser:
            raise StaffError(f"'{username}' rahbariyat akkaunti — bu buyruq bilan o'zgartirib bo'lmaydi")
        if user.shop_id and user.shop_id != shop.pk:
            raise StaffError(f"'{username}' boshqa restoran xodimi")
        user.role, user.shop = role, shop
        user.is_active = True
        user.set_password(password)
        event = 'staff_updated'
    else:
        user = AdminUser(username=username, role=role, shop=shop, is_active=True, is_approved=True,
                         is_staff=False, is_superuser=False)
        user.set_password(password)
        event = 'staff_created'
    if full_name:
        first, _, last = full_name.strip().partition(' ')
        user.first_name, user.last_name = first[:150], last[:150]
    if phone:
        user.phone = phone[:20]
    if email is not None:
        user.email = email
    if extra_capabilities is not None or revoked_capabilities is not None:
        user.extra_capabilities, user.revoked_capabilities = normalize_overrides(
            role,
            user.extra_capabilities if extra_capabilities is None else extra_capabilities,
            user.revoked_capabilities if revoked_capabilities is None else revoked_capabilities)
    else:
        # Rol o'zgargan bo'lishi mumkin (update=True): eski shaxsiy ruxsatlar yangi rolga moslab tozalanadi
        user.extra_capabilities, user.revoked_capabilities = normalize_overrides(
            role, user.extra_capabilities, user.revoked_capabilities)
    user.is_approved = True
    user.save()
    _audit(event, user, shop=shop.slug)
    return user, generated


def end_sessions(user, keep_session_key=None):
    """Foydalanuvchining barcha ochiq sessiyalarini tugatadi (bloklanganda darhol chiqib ketsin). `keep_session_key` —
    shu sessiya qoldiriladi (o'z parolini o'zgartirgan xodim joriy sessiyadan chiqib ketmasin)."""
    removed = 0
    for session in Session.objects.all().iterator():
        if keep_session_key and session.session_key == keep_session_key:
            continue
        if str(session.get_decoded().get('_auth_user_id')) == str(user.pk):
            session.delete()
            removed += 1
    return removed


def block_staff(username, unblock=False):
    """Xodimni bloklaydi (soft: akkaunt o'chirilmaydi, tarixi saqlanadi) yoki blokdan chiqaradi."""
    user = AdminUser.objects.filter(username=(username or '').strip()).first()
    if not user:
        raise StaffError(f"'{username}' topilmadi")
    if user.role in ('super_admin', 'shop_owner') or user.is_superuser:
        raise StaffError("Rahbariyat akkauntini bu buyruq bilan bloklab bo'lmaydi")
    user.is_active = bool(unblock)
    user.save(update_fields=['is_active'])
    ended = 0 if unblock else end_sessions(user)
    _audit('staff_unblocked' if unblock else 'staff_blocked', user, sessions_ended=ended)
    return user, ended
