from functools import wraps

from django.contrib.auth.decorators import login_required
from django.http import Http404
from django.shortcuts import redirect


def seller_required(view_func):
    """Faqat shop_owner / shop_manager kira oladi. super_admin admin paneliga yo'naltiriladi."""
    @wraps(view_func)
    @login_required(login_url='seller_login')
    def _wrapped(request, *args, **kwargs):
        user = request.user
        role = getattr(user, 'role', '')
        if role == 'super_admin':
            # Admin o'z paneliga yo'nalsin — sotuvchi paneliga kirmasın
            return redirect('admin_dashboard')
        if role not in ('shop_owner', 'shop_manager', 'waiter'):
            return redirect('web_login')
        # Do'kon ixtiyoriy — majburiy yo'naltirish yo'q, view o'zi promo ko'rsatadi
        return view_func(request, *args, **kwargs)
    return _wrapped
