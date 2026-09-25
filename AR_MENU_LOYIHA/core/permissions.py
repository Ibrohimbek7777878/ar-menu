"""
⚡ Rol-asosli ruxsatlar. Har ViewSet'da permission_classes ko'rsatilishi SHART.
⛔ Ruxsatsiz ViewSet = ochiq eshik.
"""
from rest_framework.permissions import BasePermission

ROLE_WAITER = 'waiter'
ROLE_COOK = 'cook'
ROLE_CASHIER = 'cashier'
ROLE_ADMIN = 'admin'
ROLE_MANAGER = 'manager'

ADMIN_ROLES = {ROLE_ADMIN, ROLE_MANAGER}


class _RoleBase(BasePermission):
    roles = set()
    message = 'Bu amal uchun ruxsat yo\'q'

    def has_permission(self, request, view):
        if getattr(request, 'user', None) and request.user.is_authenticated and request.user.is_superuser:
            return True
        staff = getattr(request, 'staff', None)
        if staff is None and getattr(request, 'user', None) and request.user.is_authenticated:
            s_roles = getattr(request.user, 'staff_roles', None)
            if s_roles:
                rid = getattr(request, 'restaurant_id', None)
                staff = s_roles.filter(is_active=True, restaurant_id=rid).first() if rid else s_roles.filter(is_active=True).first()
                if staff:
                    request.staff = staff
        if staff is None or not staff.is_active:
            return False
        if getattr(request, 'restaurant_id', None) != staff.restaurant_id:
            return False                       # ⚡ tenant mos kelmadi
        return staff.role in self.roles

    def has_object_permission(self, request, view, obj):
        """⚡ Obyekt boshqa restoranga tegishli bo'lsa — YO'Q"""
        rid = getattr(request, 'restaurant_id', None)
        obj_rid = getattr(obj, 'restaurant_id', None)
        if obj_rid is None and hasattr(obj, 'restaurant'):
            obj_rid = obj.restaurant_id
        return obj_rid is None or obj_rid == rid


class IsStaff(_RoleBase):
    roles = {ROLE_WAITER, ROLE_COOK, ROLE_CASHIER, ROLE_ADMIN, ROLE_MANAGER}


class IsWaiter(_RoleBase):
    roles = {ROLE_WAITER, ROLE_ADMIN, ROLE_MANAGER}
    message = 'Faqat ofitsiant uchun'


class IsCook(_RoleBase):
    roles = {ROLE_COOK, ROLE_ADMIN, ROLE_MANAGER}
    message = 'Faqat oshxona uchun'


class IsCashier(_RoleBase):
    roles = {ROLE_CASHIER, ROLE_ADMIN, ROLE_MANAGER}
    message = 'Faqat kassir uchun'


class IsRestAdmin(_RoleBase):
    roles = ADMIN_ROLES
    message = 'Faqat restoran admini uchun'


class IsRestAdminStrict(_RoleBase):
    """Menejer ham kira olmaydi (moliya, xodim boshqaruvi)"""
    roles = {ROLE_ADMIN}
    message = 'Faqat restoran egasi/admini uchun'


class IsPlatformAdmin(BasePermission):
    """⚡ Super-admin. restaurant_id YO'Q — barcha tenantga kiradi."""
    message = 'Faqat platforma admini uchun'

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and getattr(u, 'is_platform_admin', False))


class ReadOnlyStaff(IsStaff):
    """Faqat-ko'rish roli"""
    def has_permission(self, request, view):
        if request.method not in ('GET', 'HEAD', 'OPTIONS'):
            return False
        return super().has_permission(request, view)
