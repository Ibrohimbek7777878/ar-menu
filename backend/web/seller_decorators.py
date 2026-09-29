from functools import wraps

from django.contrib.auth.decorators import login_required
from django.http import Http404
from django.shortcuts import redirect


def seller_required(view_func):
    """shop_owner, shop_manager, waiter va super_admin kira oladi."""
    @wraps(view_func)
    @login_required(login_url='seller_login')
    def _wrapped(request, *args, **kwargs):
        user = request.user
        role = getattr(user, 'role', '')
        if role not in ('super_admin', 'shop_owner', 'shop_manager', 'waiter'):
            return redirect('web_login')
        return view_func(request, *args, **kwargs)
    return _wrapped
