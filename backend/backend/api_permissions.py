"""
Umumiy (do'konlararo) resurslar uchun DRF ruxsatlari.

Kategoriya, banner, aksiya kabi jadvallarda `shop` maydoni yo'q yoki ular butun platformaga tegishli: bitta restoran/
foydalanuvchi ularni o'zgartirsa, hamma restoranlarga ta'sir qiladi. Shuning uchun o'qish ochiq, yozish — faqat platforma admini.
"""
from rest_framework.permissions import SAFE_METHODS, BasePermission


def is_platform_admin(user):
    """Platforma admini: faol super_admin roli yoki superuser."""
    if not user or not getattr(user, 'is_authenticated', False) or not getattr(user, 'is_active', True):
        return False
    return bool(getattr(user, 'is_superuser', False) or getattr(user, 'role', '') == 'super_admin')


class IsPlatformAdmin(BasePermission):
    message = "Bu amal faqat platforma administratori uchun."

    def has_permission(self, request, view):
        return is_platform_admin(request.user)


class IsPlatformAdminOrReadOnly(BasePermission):
    message = "Umumiy ma'lumotni faqat platforma administratori o'zgartira oladi."

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or is_platform_admin(request.user)


class IsPlatformAdminOrCreateOnly(BasePermission):
    """Ochiq o'qish va yaratish (masalan mijoz sharhi); o'zgartirish/o'chirish — faqat platforma admini."""
    message = "Faqat platforma administratori o'zgartira yoki o'chira oladi."

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or request.method == 'POST' or is_platform_admin(request.user)
