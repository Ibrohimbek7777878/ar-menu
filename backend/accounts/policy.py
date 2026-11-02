"""
Hisob tasdig'i qoidasi (TZ_SOTUVGA_TAYYORLASH P0-3).

Ro'yxatdan o'tgan egasi/menejer super-admin tasdiqlamaguncha hech narsa qila olmaydi. Ofitsiant, oshpaz va hostess hisobini
rahbariyat yaratadi, shuning uchun alohida tasdiq talab qilinmaydi. Sessiya orqali kirish (`web/tma_views.py`) shu qoidani
avvaldan qo'llagan; JWT va xodim ruxsatlari tekshiruvi esa bilmas edi, shu sabab tasdiqlanmagan hisob token olib, xodim
API'larini ochardi.
"""

SELF_APPROVED_ROLES = ('waiter', 'kitchen', 'hostess')


def is_account_approved(user):
    if getattr(user, 'is_superuser', False):
        return True
    if getattr(user, 'is_approved', False):
        return True
    return getattr(user, 'role', '') in SELF_APPROVED_ROLES
