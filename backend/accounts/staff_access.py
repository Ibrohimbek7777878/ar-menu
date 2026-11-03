"""
Xodimning kirish ma'lumoti: u qaysi havola bilan kiradi va login'dan keyin qaysi sahifaga tushadi.

Egasi xodimga nima yuborishini bilishi kerak ("qayerdan va qanday kiradi"), shuning uchun `/ra/` → Xodimlar javobiga
hisoblangan maydonlar qo'shiladi. Yagona haqiqat manbai — `web.restaurant_auth` (rol → panel) va xodimning o'z login
sahifasi; frontend hech narsani o'zi taxmin qilmaydi.

Parol bu yerda UMUMAN ishtirok etmaydi: havolada ham, javobda ham yo'q (u faqat xodim yaratilgan/yangilangan paytdagi
bir martalik javobda keladi).
"""
from urllib.parse import quote

from django.urls import NoReverseMatch, reverse

from accounts.policy import is_account_approved
from web.restaurant_auth import RESTAURANT_STAFF_ROLES, role_panel

BLOCKED_REASON = "Xodim bloklangan. Kirish uchun avval uni blokdan chiqaring."
NO_PANEL_REASON = "Bu lavozim uchun alohida kirish sahifasi yo'q."
NOT_APPROVED_REASON = "Hisob hali tasdiqlanmagan, shuning uchun xodim kira olmaydi."


def access_origin(request):
    """Havola boshi (`https://domen`): production'da `RESTAURANT_PUBLIC_URL`, bo'lmasa so'rov kelgan sayt.

    Mavjud QR kodlar bilan bir xil qoida (`tables_restaurant.qr.qr_base_url`). So'rov hosti Django'da `ALLOWED_HOSTS`
    bilan tekshirilgan, sxema esa `SECURE_PROXY_SSL_HEADER` orqali to'g'ri aniqlanadi (https orqasida — https).
    """
    from tables_restaurant.qr import qr_base_url
    return qr_base_url(request)


def _login_path():
    try:
        return reverse('restaurant_admin_login')
    except NoReverseMatch:
        return '/admin/login/'


def unavailable_reason(user):
    """Xodim hozir kira olmaydigan sababi (o'zbekcha), kira olsa None."""
    if user.role not in RESTAURANT_STAFF_ROLES:
        return NO_PANEL_REASON
    if not user.is_active:
        return BLOCKED_REASON
    if not is_account_approved(user):
        return NOT_APPROVED_REASON
    return None


def staff_access(user, origin):
    """
    {panel_path, panel_label, login_url, login_unavailable_reason}.

    `login_url` = `<origin>/admin/login/?next=<panel_path>`; `next` har doim bizning ichki yo'limiz (qiymat
    foydalanuvchidan olinmaydi), shuning uchun ochiq yo'naltirish (open redirect) imkoni yo'q — login sahifasi baribir
    `url_has_allowed_host_and_scheme` bilan qayta tekshiradi. Faol bo'lmagan xodim uchun havola o'rniga sabab qaytadi.
    """
    panel = role_panel(user.role)
    reason = unavailable_reason(user)
    login_url = None
    if panel and reason is None:
        login_url = f"{origin.rstrip('/')}{_login_path()}?next={quote(panel['path'], safe='/')}"
    return {
        'panel_path': panel['path'] if panel else None,
        'panel_label': panel['label'] if panel else None,
        'login_url': login_url,
        'login_unavailable_reason': reason,
    }
