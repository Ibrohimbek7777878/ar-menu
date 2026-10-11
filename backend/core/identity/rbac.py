"""
Core Identity & Access Management (RBAC).
"""
from typing import Set

ROLE_SUPER_ADMIN = 'super_admin'
ROLE_SHOP_OWNER = 'shop_owner'
ROLE_SHOP_MANAGER = 'shop_manager'
ROLE_WAITER = 'waiter'
ROLE_KITCHEN = 'kitchen'
ROLE_COURIER = 'courier'
ROLE_CUSTOMER = 'customer'

STAFF_ROLES: Set[str] = {
    ROLE_SUPER_ADMIN,
    ROLE_SHOP_OWNER,
    ROLE_SHOP_MANAGER,
    ROLE_WAITER,
    ROLE_KITCHEN,
    ROLE_COURIER,
}


def is_super_admin(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    return getattr(user, 'is_superuser', False) or getattr(user, 'role', '') == ROLE_SUPER_ADMIN


def is_seller_staff(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if is_super_admin(user):
        return True
    return getattr(user, 'role', '') in (ROLE_SHOP_OWNER, ROLE_SHOP_MANAGER)


def is_waiter(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    return getattr(user, 'role', '') == ROLE_WAITER
