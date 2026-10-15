from functools import wraps

from django.contrib.auth.decorators import login_required
from django.http import Http404
from django.shortcuts import redirect


# Ofitsiant seller panelida faqat o'z ish joyiga kerakli sahifalarni ko'radi
# (moliya, mijozlar bazasi, analitika, mahsulot tahriri — yo'q). TZ: R-SEC-10.
WAITER_ALLOWED_URL_NAMES = frozenset({
    'waiter_panel_web',
    'seller_waiter_web',
    'waiter_table_status_web',
    'seller_kds_web',
    'seller_kds_update_web',
    'seller_order_receipt_web',
})


def seller_required(view_func):
    """shop_owner, shop_manager va super_admin kira oladi; waiter — faqat ofitsiant/KDS sahifalariga."""
    @wraps(view_func)
    @login_required(login_url='seller_login')
    def _wrapped(request, *args, **kwargs):
        user = request.user
        role = getattr(user, 'role', '')
        if role not in ('super_admin', 'shop_owner', 'shop_manager', 'waiter'):
            return redirect('web_login')
        if role == 'waiter':
            match = getattr(request, 'resolver_match', None)
            if not match or match.url_name not in WAITER_ALLOWED_URL_NAMES:
                return redirect('waiter_panel_web')
        return view_func(request, *args, **kwargs)
    return _wrapped
