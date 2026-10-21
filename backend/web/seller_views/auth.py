import logging
logger = logging.getLogger(__name__)
from datetime import timedelta
from django.contrib import messages
from django.conf import settings
from django.db.models import Avg, Sum, Q, Count
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from web.seller_decorators import seller_required
from django.views.decorators.clickjacking import xframe_options_exempt
from shops.models import Shop, ShopPage, SHOP_SECTION_TYPES
from products.models import Product
from orders.models import Order, OrderItem
from accounts.models import Customer, AdminUser
from notifications.models import TelegramSubscriber
from categories.models import Category
from django.contrib.auth import authenticate, login
def seller_login(request):
    """Sotuvchi uchun alohida login — faqat shop_owner/shop_manager."""
    if request.user.is_authenticated:
        role = getattr(request.user, 'role', '')
        if role == 'waiter':
            return redirect('waiter_panel_web')
        if role in ('shop_owner', 'shop_manager'):
            return redirect('seller_dashboard_web')
        elif role == 'super_admin':
            return redirect('admin_dashboard')
    if request.method == 'POST':
        from django.core.cache import cache
        from backend.ratelimit import client_ip
        ip = client_ip(request)
        cache_key = f"seller_login_attempts_{ip}"
        attempts = cache.get(cache_key, 0)
        if attempts >= 7:
            messages.error(request, "Xavfsizlik: Ko'p marotaba xato urinish bo'ldi. Iltimos 5 daqiqadan so'ng qayta urinib ko'ring.")
            return render(request, 'seller/login.html')

        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '').strip()
        user = authenticate(request, username=username, password=password)
        if user and user.is_approved and getattr(user, 'role', '') in ('shop_owner', 'shop_manager', 'super_admin'):
            cache.delete(cache_key)
            login(request, user)
            if getattr(user, 'role', '') == 'super_admin':
                return redirect('admin_dashboard')
            return redirect('seller_dashboard_web')
        cache.set(cache_key, attempts + 1, timeout=300)
        messages.error(request, 'Login yoki parol xato yoki hisob tasdiqlanmagan.')
    return render(request, 'seller/login.html')


def seller_register(request):
    """Sotuvchi ro'yxatdan o'tish — yangi do'kon ochish."""
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '').strip()
        phone = request.POST.get('phone', '').strip()
        shop_name = request.POST.get('shop_name', '').strip()
        if not username or not password or not shop_name:
            messages.error(request, "Barcha maydonlarni to'ldiring.")
        elif AdminUser.objects.filter(username=username).exists():
            messages.error(request, 'Bu username allaqachon mavjud.')
        else:
            user = AdminUser.objects.create_user(
                username=username, email=email, password=password,
                phone=phone, role='shop_owner', is_approved=True, is_active=True,
            )
            # Do'kon yaratish — barcha majburiy maydonlar bilan
            from django.utils.text import slugify
            slug = slugify(shop_name) or f"shop-{user.pk}"
            base_slug = slug
            i = 1
            while Shop.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{i}"
                i += 1
            Shop.objects.create(
                name=shop_name, slug=slug, owner=user, is_open=True,
                address="Guliston shahri", phone=phone or "+998901234567",
                latitude=40.12, longitude=67.84,
                description="", working_hours="08:00-22:00",
            )
            messages.success(request, "Do'koningiz yaratildi! Endi kiring.")
            return redirect('seller_login')
    return render(request, 'seller/register.html')

