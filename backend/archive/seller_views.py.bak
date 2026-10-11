"""
import logging
logger = logging.getLogger(__name__)
Sotuvchi paneli — multi-tenant izolyatsiya.
Har bir view request.tenant_shop bo'yicha filtrlaydi.
"""
from datetime import timedelta

from django.contrib import messages
from django.conf import settings
from django.db.models import Avg, Sum, Q
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from web.seller_decorators import seller_required
from django.views.decorators.clickjacking import xframe_options_exempt
from shops.models import Shop
from products.models import Product
from orders.models import Order
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
        ip = request.META.get('REMOTE_ADDR', 'unknown')
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


@seller_required
def seller_dashboard(request):
    shop = request.tenant_shop
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)

    products_qs = Product.objects.filter(shop=shop)
    orders_qs = Order.objects.filter(shop=shop)
    today_orders = orders_qs.filter(created_at__gte=today_start)
    week_orders = orders_qs.filter(created_at__gte=week_start)

    # 7 kunlik seriya
    series = []
    max_rev = 1
    live_week = week_orders.exclude(status__in=['cancelled', 'failed'])
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).date()
        ds = timezone.datetime(day.year, day.month, day.day, tzinfo=timezone.get_current_timezone())
        de = ds + timedelta(days=1)
        rev = live_week.filter(created_at__gte=ds, created_at__lt=de).aggregate(s=Sum('final_amount'))['s'] or 0
        rev = float(rev)
        max_rev = max(max_rev, rev)
        series.append({'label': day.strftime('%a'), 'rev': rev, 'pct': 0})
    for s in series:
        s['pct'] = int((s['rev'] / max_rev) * 100) if max_rev else 0

    from accounts.models import Customer
    from notifications.models import Review

    ctx = {
        'shop': shop,
        'stats': {
            'total_products': products_qs.count(),
            'total_orders': orders_qs.count(),
            'today_orders': today_orders.count(),
            'today_revenue': today_orders.exclude(status__in=['cancelled', 'failed']).aggregate(s=Sum('final_amount'))['s'] or 0,
            'week_revenue': live_week.aggregate(s=Sum('final_amount'))['s'] or 0,
            'avg_rating': round(products_qs.aggregate(a=Avg('rating'))['a'] or 0, 1),
            'total_customers': Customer.objects.filter(orders__shop=shop).distinct().count(),
            'views': shop.views,
            'bonus_paid': orders_qs.exclude(status__in=['cancelled', 'failed']).aggregate(s=Sum('bonus_earned'))['s'] or 0,
        },
        'revenue_series': series,
        'recent_orders': orders_qs.order_by('-created_at')[:5],
        'quick_links': [
            {'url': 'seller_products_web', 'icon': 'inventory_2', 'label': 'Mahsulotlar'},
            {'url': 'seller_orders_web', 'icon': 'receipt_long', 'label': 'Buyurtmalar'},
            {'url': 'seller_template_gallery', 'icon': 'palette', 'label': 'Dizayn'},
            {'url': 'seller_profile_web', 'icon': 'person', 'label': 'Profil'},
        ],
        'now': now,
    }
    return render(request, 'seller/dashboard.html', ctx)


@seller_required
def seller_products(request):
    shop = request.tenant_shop
    products = Product.objects.filter(shop=shop).select_related('category').order_by('-id')
    q = request.GET.get('search', '').strip()
    if q:
        products = products.filter(name__icontains=q)
    cat = request.GET.get('category')
    if cat:
        products = products.filter(category_id=cat)
    now = timezone.now()
    all_products = Product.objects.filter(shop=shop)
    return render(request, 'seller/products.html', {
        'shop': shop, 'products': products,
        'search': q, 'categories': Category.objects.all(),
        'category_filter': int(cat) if cat and cat.isdigit() else None,
        'available_count': all_products.filter(is_available=True).count(),
        'flash_count': all_products.filter(flash_price__isnull=False, flash_until__gt=now).count(),
        'hit_count': all_products.filter(is_hit=True).count(),
        'ar_count': all_products.filter(has_3d=True).count(),
    })


@seller_required
def seller_orders(request):
    shop = request.tenant_shop
    orders = Order.objects.filter(shop=shop).select_related('shop', 'courier').order_by('-created_at')
    status = request.GET.get('status')
    if status:
        orders = orders.filter(status=status)
    all_orders = Order.objects.filter(shop=shop)
    status_map = [
        ('pending', 'Kutilmoqda'),
        ('confirmed', 'Tasdiqlangan'),
        ('preparing', 'Tayyorlanmoqda'),
        ('ready', 'Tayyor'),
        ('out_for_delivery', 'Yetkazilmoqda'),
        ('delivered', 'Yetkazilgan'),
        ('cancelled', 'Bekor qilindi'),
    ]
    status_counts = [{'label': lbl, 'count': all_orders.filter(status=code).count()} for code, lbl in status_map]
    return render(request, 'seller/orders.html', {
        'shop': shop, 'orders': orders, 'status_filter': status,
        'status_counts': status_counts,
    })


@seller_required
def seller_order_detail(request, pk):
    shop = request.tenant_shop
    order = get_object_or_404(Order.objects.prefetch_related('items'), pk=pk, shop=shop)
    items = order.items.all()
    return render(request, 'seller/order_detail.html', {'shop': shop, 'order': order, 'items': items})


@seller_required
def seller_order_receipt(request, pk):
    """58mm / 80mm ESC/POS Termal chek chiqarish sahifasi."""
    shop = request.tenant_shop
    order = get_object_or_404(Order.objects.prefetch_related('items'), pk=pk, shop=shop)
    receipt_type = request.GET.get('type', 'customer')
    items = order.items.all()
    return render(request, 'seller/receipt_print.html', {
        'shop': shop,
        'order': order,
        'items': items,
        'receipt_type': receipt_type,
    })


@seller_required
def seller_analytics(request):
    shop = request.tenant_shop
    try:
        days = int(request.GET.get('days', 7))
    except:
        days = 7
    if days not in (7, 14, 30):
        days = 7
    now = timezone.now()
    start = now - timedelta(days=days)
    qs = Order.objects.filter(shop=shop, created_at__gte=start).exclude(status__in=['cancelled', 'failed'])
    kpi = {
        'revenue': qs.aggregate(s=Sum('final_amount'))['s'] or 0,
        'orders': qs.count(),
        'avg_check': (qs.aggregate(s=Sum('final_amount'))['s'] or 0) / max(1, qs.count()),
        'shops': 1,
    }
    # Kunlik seriya
    series = []
    max_rev = 1
    for i in range(days-1, -1, -1):
        day = (now - timedelta(days=i)).date()
        ds = timezone.datetime(day.year, day.month, day.day, tzinfo=timezone.get_current_timezone())
        de = ds + timedelta(days=1)
        rev = qs.filter(created_at__gte=ds, created_at__lt=de).aggregate(s=Sum('final_amount'))['s'] or 0
        rev = float(rev)
        max_rev = max(max_rev, rev)
        series.append({'date': day.strftime('%m-%d'), 'revenue': rev})
    # Top products
    from django.db.models import Count
    top_products = (qs.values('items__product__name').annotate(qty=Count('id'), rev=Sum('final_amount')).order_by('-qty')[:5])
    # Transform for template (expects product_name)
    top_products = [{'product_name': x['items__product__name'], 'qty': x['qty'], 'rev': x['rev']} for x in top_products]
    pay_breakdown = list(qs.values('payment_status').annotate(count=Count('id'), sum=Sum('final_amount')))
    for b in pay_breakdown:
        b['provider'] = b.pop('payment_status') or '—'
    return render(request, 'seller/analytics.html', {
        'shop': shop, 'kpi': kpi, 'series': series, 'max_rev': max_rev,
        'top_products': top_products, 'pay_breakdown': pay_breakdown,
        'days': days, 'day_choices': [7, 14, 30],
    })


@seller_required
def seller_shop(request):
    shop = request.tenant_shop
    # Do'koni yo'q bo'lsa — yaratish formini ko'rsatish
    if not shop:
        if request.method == 'POST':
            name = request.POST.get('name', '').strip()
            if not name:
                messages.error(request, "Do'kon nomi kiriting.")
            else:
                from django.utils.text import slugify
                slug = slugify(name) or f"shop-{request.user.pk}"
                base_slug = slug
                i = 1
                while Shop.objects.filter(slug=slug).exists():
                    slug = f"{base_slug}-{i}"
                    i += 1
                shop = Shop.objects.create(
                    name=name, slug=slug, owner=request.user, is_open=True,
                    address=request.POST.get('address', 'Guliston shahri'),
                    phone=request.POST.get('phone', request.user.phone or '+998901234567'),
                    latitude=40.12, longitude=67.84,
                    store_type=request.POST.get('store_type', 'shop'),
                )
                from shops.business import apply_business_preset
                apply_business_preset(shop)
                shop.save(update_fields=['business_profile'])
                messages.success(request, "Do'koningiz yaratildi! Endi dizayn tanlang.")
                return redirect('seller_template_gallery')
                from shops.models import Shop
        return render(request, 'seller/shop_create.html',
                      {'no_shop': True, 'business_types': Shop.STORE_TYPE_CHOICES})
    if request.method == 'POST':
        shop.name = request.POST.get('name', shop.name)
        shop.description = request.POST.get('description', shop.description or '')
        shop.address = request.POST.get('address', shop.address)
        shop.phone = request.POST.get('phone', shop.phone)
        shop.is_fast_delivery = request.POST.get('is_fast_delivery') == 'on'
        shop.save(update_fields=['name', 'description', 'address', 'phone', 'is_fast_delivery'])
        messages.success(request, "Do'kon saqlandi.")
        return redirect('seller_shop_web')
    return render(request, 'seller/shop.html', {'shop': shop})


@seller_required
def seller_reviews(request):
    shop = request.tenant_shop
    from notifications.models import Review
    reviews = Review.objects.filter(product__shop=shop).select_related('product', 'customer').order_by('-created_at')
    return render(request, 'seller/reviews.html', {'shop': shop, 'reviews': reviews})


@seller_required
def seller_customers(request):
    shop = request.tenant_shop
    # Mijozlar — shu do'kondan buyurtma berganlar
    pids = Order.objects.filter(shop=shop).values_list('customer_id', flat=True).distinct()
    customers = Customer.objects.filter(pk__in=pids)
    # Annotate uchun oddiy: har mijozga order count
    for c in customers:
        c.total_orders = Order.objects.filter(shop=shop, customer=c).count()
        c.total_spent = Order.objects.filter(shop=shop, customer=c).exclude(status__in=['cancelled','failed']).aggregate(s=Sum('final_amount'))['s'] or 0
    return render(request, 'seller/customers.html', {'shop': shop, 'customers': customers})


@seller_required
def seller_shop_builder(request):
    shop = request.tenant_shop
    # Reuse admin builder logic — faqat o'z do'koni
    from shops.models import ShopPage
    from django.shortcuts import get_object_or_404
    page, _ = ShopPage.objects.get_or_create(shop=shop, defaults={'layout': []})
    if request.method == 'POST':
        # Sodda saqlash — admin_shop_builder ga o'xshash
        import json
        layout = request.POST.get('layout')
        if layout:
            try:
                page.layout = json.loads(layout)
                page.save(update_fields=['layout'])
                messages.success(request, "Sahifa saqlandi.")
            except Exception as e:
                messages.error(request, f"Xato: {e}")
        return redirect('seller_shop_builder')
    return render(request, 'seller/shop_builder.html', {'shop': shop, 'page': page})


@seller_required
def seller_profile(request):
    """Sotuvchi profili — tahrir, parol o'zgartirish, do'kon statistikasi."""
    user = request.user
    shop = request.tenant_shop

    # Do'kon statistikasi
    shop_stats = None
    if shop:
        from django.db.models import Sum, Count
        from products.models import Product
        shop_stats = {
            'products': Product.objects.filter(shop=shop).count(),
            'orders': Order.objects.filter(shop=shop).count(),
            'revenue': Order.objects.filter(shop=shop).exclude(
                status__in=['cancelled', 'failed']).aggregate(s=Sum('final_amount'))['s'] or 0,
            'is_open': shop.is_open,
            'slug': shop.slug,
        }

    if request.method == 'POST':
        action = request.POST.get('action', 'update_profile')

        if action == 'change_password':
            old_pw = request.POST.get('old_password', '')
            new_pw = request.POST.get('new_password', '')
            new_pw2 = request.POST.get('new_password_confirm', '')
            if not user.check_password(old_pw):
                messages.error(request, 'Eski parol noto\'g\'ri.')
            elif len(new_pw) < 6:
                messages.error(request, 'Yangi parol kamida 6 belgidan iborat bo\'lishi kerak.')
            elif new_pw != new_pw2:
                messages.error(request, 'Yangi parollar mos kelmadi.')
            else:
                user.set_password(new_pw)
                user.save()
                from django.contrib.auth import update_session_auth_hash
                update_session_auth_hash(request, user)
                messages.success(request, 'Parol muvaffaqiyatli o\'zgartirildi!')
        elif action == 'update_shop':
            if shop:
                shop_name = request.POST.get('shop_name', '').strip()
                shop_phone = request.POST.get('shop_phone', '').strip()
                shop_address = request.POST.get('shop_address', '').strip()
                shop_desc = request.POST.get('shop_description', '').strip()
                is_open = request.POST.get('is_open') == 'on'
                if shop_name:
                    shop.name = shop_name
                if shop_phone:
                    shop.phone = shop_phone
                if shop_address:
                    shop.address = shop_address
                shop.description = shop_desc
                shop.is_open = is_open
                shop.save()
                messages.success(request, "Do'kon sozlamalari muvaffaqiyatli saqlandi!")
            return redirect('seller_profile_web')

        # Profil yangilash
        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()
        email = request.POST.get('email', '').strip()
        phone = request.POST.get('phone', '').strip()
        telegram = request.POST.get('telegram_username', '').strip().lstrip('@')
        if first_name:
            user.first_name = first_name
        if last_name:
            user.last_name = last_name
        if email:
            user.email = email
        if phone:
            user.phone = phone
        if 'telegram_username' in request.POST:
            user.telegram_username = telegram
        user.save()
        messages.success(request, 'Profil yangilandi!')
        return redirect('seller_profile_web')

    return render(request, 'seller/profile.html', {
        'user': user,
        'shop': shop,
        'shop_stats': shop_stats,
    })


# ─── SHABLONLAR GALEREYASI (Figma-uslubidagi kartochkalar) ───────────

TEMPLATE_COLOR_KEYS = ['primary', 'accent', 'background', 'surface', 'text_primary', 'text_secondary']


def _template_card_context(templates):
    """Har shablon uchun boyitilgan kartochka ma'lumotlari (ranglar, dark mode, layout)."""
    cards = []
    for t in templates:
        colors = t.get_default_colors()
        bg = str(colors.get('background', '#ffffff')).lstrip('#')
        is_dark = False
        if len(bg) == 6:
            try:
                r, g, b = int(bg[0:2], 16), int(bg[2:4], 16), int(bg[4:6], 16)
                lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
                is_dark = lum < 0.45
            except Exception:
                pass
        cards.append({
            'tpl': t,
            'colors': colors,
            'layout': t.get_default_layout(),
            'is_dark': is_dark,
        })
    return cards


@seller_required
def seller_template_gallery(request):
    """Shablonlar galereyasi — har shablon mahsulot kartochkasi ko'rinishida."""
    from shops.models import ShopTemplate, ShopPage
    cat = request.GET.get('cat', '')
    qs = ShopTemplate.objects.filter(is_active=True).filter(
        Q(is_custom=False) | Q(created_by=request.user)
    )
    if cat == 'my':
        qs = ShopTemplate.objects.filter(is_custom=True, created_by=request.user)
    elif cat:
        qs = qs.filter(category=cat)

    current_tpl_slug = None
    if request.tenant_shop:
        page = ShopPage.objects.filter(shop=request.tenant_shop).first()
        if page and page.template:
            current_tpl_slug = page.template

    from shops.models import TEMPLATE_CATEGORIES
    ctx = {
        'cards': _template_card_context(qs[:120]),
        'categories': TEMPLATE_CATEGORIES,
        'active_cat': cat,
        'shop': request.tenant_shop,
        'current_tpl_slug': current_tpl_slug,
    }
    return render(request, 'seller/template_gallery.html', ctx)


@seller_required
def seller_template_customize(request, slug):
    """Shablon kartochkasi → detal: jonli preview + moslash paneli."""
    import json
    from shops.models import ShopTemplate
    tpl = get_object_or_404(
        ShopTemplate, slug=slug, is_active=True,
    )
    if tpl.is_custom and tpl.created_by_id != request.user.pk:
        messages.error(request, "Bu shablon sizga tegishli emas.")
        return redirect('seller_template_gallery')
    shop = request.tenant_shop
    colors = tpl.get_default_colors()
    color_fields = [
        ('primary', 'Asosiy (tugmalar)', colors.get('primary', '#16a34a')),
        ('accent', 'Aksent (badge/ikonalar)', colors.get('accent', '#22c55e')),
        ('background', 'Sahifa foni', colors.get('background', '#ffffff')),
        ('surface', 'Kartochka foni', colors.get('surface', '#f8fafc')),
        ('text_primary', 'Matn (asosiy)', colors.get('text_primary', '#1a1a1a')),
        ('text_secondary', 'Matn (ikkilamchi)', colors.get('text_secondary', '#666666')),
    ]
    from web.templatetags.i18n_tags import TRANSLATIONS
    tr = TRANSLATIONS.get(getattr(request, 'language', 'uz'), TRANSLATIONS['uz'])
    section_labels = {k[4:]: tr.get(k, k) for k in tr if k.startswith('sec_')}
    ctx = {
        'tpl': tpl,
        'colors': colors,
        'color_fields': color_fields,
        'colors_json': json.dumps(colors),
        'layout_json': json.dumps(tpl.get_default_layout()),
        'type_labels_json': json.dumps(section_labels),
        'shop': shop,
        'all_pages': _preview_pages_for(request),
    }
    return render(request, 'seller/template_customize.html', ctx)


@seller_required
def seller_template_save_install(request):
    """'Saqlash va o'rnatish': (1) yangi custom shablon yaratiladi, (2) do'konga qo'llanadi."""
    import json
    import random
    from django.utils.text import slugify as _slugify
    from shops.models import ShopPage, ShopTemplate

    if request.method != 'POST':
        return redirect('seller_template_gallery')

    shop = request.tenant_shop
    if not shop:
        messages.error(request, "Avval do'kon yarating.")
        return redirect('seller_shop_web')

    base_slug = request.POST.get('base_slug', 'minimal-light')
    template_name = (request.POST.get('template_name') or '').strip()
    colors_raw = request.POST.get('colors', '{}')
    layout_raw = request.POST.get('layout', '[]')
    try:
        colors = json.loads(colors_raw) if colors_raw else {}
    except (TypeError, ValueError):
        colors = {}
    try:
        layout = json.loads(layout_raw) if layout_raw else []
    except (TypeError, ValueError):
        layout = []
    if not isinstance(colors, dict) or not colors:
        colors = ShopTemplate.objects.filter(slug=base_slug).first().get_default_colors() \
            if ShopTemplate.objects.filter(slug=base_slug).exists() else {}
    if not isinstance(layout, list) or not layout:
        base = ShopTemplate.objects.filter(slug=base_slug).first()
        layout = base.get_default_layout() if base else []

    base = ShopTemplate.objects.filter(slug=base_slug).first()
    if not template_name:
        template_name = f"{shop.name} dizayni"

    # (1) Yangi custom shablon — galereyada "Mening shablonlarim"da ko'rinadi
    while True:
        new_slug = f"{_slugify(base_slug, allow_unicode=True) or 'design'}-custom-{request.user.pk}-{random.randint(1000, 9999)}"
        if not ShopTemplate.objects.filter(slug=new_slug).exists():
            break
    tpl = ShopTemplate.objects.create(
        name=template_name[:100],
        slug=new_slug,
        category=base.category if base else 'minimal',
        default_colors=colors,
        default_layout=layout,
        available_sections=base.available_sections if base else [],
        required_plan='basic',
        is_active=True,
        is_premium=False,
        is_custom=True,
        created_by=request.user,
        sort_order=100,
    )

    # (2) Do'konga qo'llash — sahifa darhol yangi dizaynda ochiladi
    page, _ = ShopPage.objects.get_or_create(shop=shop)
    page.template = tpl.slug
    page.layout = layout
    page.is_published = True
    page.save(update_fields=['template', 'layout', 'is_published', 'updated_at'])

    messages.success(request, f"'{tpl.name}' saqlandi va do'koningizga o'rnatildi!")
    return redirect('customer_shop_detail', slug=shop.slug)


# ─── V9: DRAFT PREVIEW (real frontend iframe) ────────────────────────

PREVIEW_PAGES = [
    ('home', '🏠'), ('catalog', '📇'), ('product', '🛍'),
    ('cart', '🛒'), ('checkout', '🧾'), ('tracking', '📦'), ('delivery', '🚚'),
]


def _preview_pages_for(request):
    """(key, icon, til bo'yicha yorliq) ro'yxati."""
    from web.templatetags.i18n_tags import TRANSLATIONS
    tr = TRANSLATIONS.get(getattr(request, 'language', 'uz'), TRANSLATIONS['uz'])
    return [(key, icon, tr.get(f'builder_tab_{key}', key)) for key, icon in PREVIEW_PAGES]

@seller_required
def seller_template_draft_save(request):
    """Preview draftini sessionga saqlash (o'rnatmasdan turib real ko'rish uchun)."""
    import json
    if request.method != 'POST':
        from django.http import JsonResponse
        return JsonResponse({'error': 'POST kerak'}, status=400)
    body = {}
    try:
        body = json.loads(request.body or b'{}')
    except (TypeError, ValueError):
        pass
    request.session['tpl_draft'] = {
        'base_slug': body.get('base_slug', ''),
        'template_name': body.get('template_name', ''),
        'colors': body.get('colors', {}),
        'layout': body.get('layout', []),
    }
    from django.http import JsonResponse
    return JsonResponse({'ok': True})


def _tpl_draft(request, slug):
    """Session draft yoki shablon defaultlari."""
    import json
    from shops.models import ShopTemplate
    draft = request.session.get('tpl_draft') or {}
    tpl = ShopTemplate.objects.filter(slug=slug).first()
    colors = draft.get('colors') if draft.get('colors') else (tpl.get_default_colors() if tpl else {})
    layout = draft.get('layout') if draft.get('layout') else (tpl.get_default_layout() if tpl else [])
    return tpl, colors, layout


@seller_required
@xframe_options_exempt
def seller_template_preview(request, slug, page='home'):
    """REAL frontendni draft dizayn bilan ko'rish (o'rnatmasdan). Iframe uchun."""
    from shops.models import ShopPage
    tpl, colors, layout = _tpl_draft(request, slug)
    shop = request.tenant_shop or Shop.objects.filter(is_open=True).first()
    from web.views import _normalize_sections
    _normalize_sections(layout)
    menu_position = 'top'
    for _sec in layout:
        if isinstance(_sec, dict) and _sec.get('type') == 'menu':
            menu_position = _sec.get('position', 'top')
            break
    if page == 'home':
        # HAQIQIY do'kon sahifasi — draft sections + ranglar bilan
        products = shop.products.filter(is_available=True) if shop else Product.objects.none()
        categories = Category.objects.all()[:16]
        from notifications.models import Review
        reviews = Review.objects.filter(product__shop=shop).select_related('product', 'customer')[:8] if shop else []
        ctx = {
            'shop': shop, 'products': products, 'sections': layout,
            'template': (tpl.slug if tpl else slug), 'tpl_colors': colors,
            'categories': categories, 'reviews': reviews, 'menu_position': menu_position,
            'query': '', 'sort': 'default', 'is_draft_preview': True,
        }
        return render(request, 'customer/shop_detail.html', ctx)

    # Ichki sahifalar — real komponentlar + real ma'lumot + draft ranglar
    product = Product.objects.filter(shop=shop, is_available=True).first() if shop else None
    related = []
    if shop:
        related = Product.objects.filter(shop=shop, is_available=True).exclude(id=product.id if product else 0)[:3]
    ctx = {
        'shop': shop, 'product': product, 'related': related, 'slug': slug,
        'tpl_colors': colors, 'sections': layout,
        'template': (tpl.slug if tpl else slug), 'is_draft_preview': True,
        'preview_page': page,
        'all_pages': _preview_pages_for(request),
        'tracking_steps': [
            (["Qabul qilindi", "Buyurtingiz do'konda qabul qilindi"], 'done'),
            (["Tayyorlanmoqda", "Mahsulotlar yig'ilmoqda"], 'done'),
            (["Yo'lda", "Kuryer buyurtma bilan chiqib ketdi"], 'done'),
            (["Yetkazildi", "Buyurtma topshirildi"], ''),
        ],
    }
    return render(request, 'seller/preview_inner.html', ctx)


# ─── V12-AR: STOLLAR BOSHQARUVI + KDS (oshxona ekrani) ───────────────

@seller_required
def seller_tables(request):
    """Stollar boshqaruvi: zallar, stollar CRUD + QR ko'rish/chop etish."""
    from tables_restaurant.models import Hall, Table
    shop = request.tenant_shop
    halls = Hall.objects.filter(shop=shop).prefetch_related('tables') if shop else []
    if request.method == 'POST':
        action = request.POST.get('action', 'add_table')
        if action == 'add_hall':
            name = request.POST.get('hall_name', '').strip()
            if name and shop:
                Hall.objects.create(shop=shop, name=name)
                messages.success(request, f"Zal '{name}' qo'shildi.")
        elif action == 'add_table':
            hall_id = request.POST.get('hall_id')
            number = request.POST.get('number', '').strip()
            capacity = request.POST.get('capacity', 4)
            try:
                hall = Hall.objects.get(id=hall_id, shop=shop)
                if number and shop:
                    Table.objects.create(shop=shop, hall=hall, number=number, capacity=int(capacity or 4))
                    messages.success(request, f"Stol {number} qo'shildi.")
            except Hall.DoesNotExist:
                messages.error(request, "Zal topilmadi.")
        elif action == 'delete_table':
            try:
                t = Table.objects.get(id=request.POST.get('table_id'), shop=shop)
                num = t.number
                t.delete()
                messages.success(request, f"Stol #{num} o'chirildi.")
            except Table.DoesNotExist:
                messages.error(request, "Stol topilmadi.")
        elif action == 'bulk_add_tables':
            hall_id = request.POST.get('hall_id')
            count = int(request.POST.get('count', 5))
            capacity = int(request.POST.get('capacity', 4))
            try:
                hall = Hall.objects.get(id=hall_id, shop=shop)
                existing = set(Table.objects.filter(shop=shop).values_list('number', flat=True))
                added = 0
                for n in range(1, count + 1):
                    s_num = str(n)
                    if s_num not in existing:
                        Table.objects.create(shop=shop, hall=hall, number=s_num, capacity=capacity)
                        existing.add(s_num)
                        added += 1
                messages.success(request, f"{added} ta yangi stol yaratildi.")
            except Exception as e:
                messages.error(request, f"Xatolik: {e}")
        elif action == 'rotate_qr':
            try:
                t = Table.objects.get(id=request.POST.get('table_id'), shop=shop)
                t.rotate_qr()
                t.save(update_fields=['qr_token', 'qr_token_old', 'qr_rotated_at'])
                messages.success(request, f"Stol {t.number} QR yangilandi (eski QR 24 soat ishlaydi).")
            except Table.DoesNotExist:
                messages.error(request, "Stol topilmadi.")
        return redirect('seller_tables_web')
    from django.conf import settings as _s
    _scheme = 'http' if '127.0.0.1' in (_s.PUBLIC_DOMAIN or '') or 'localhost' in (_s.PUBLIC_DOMAIN or '') else 'https'
    general_menu_url = f"{_scheme}://{_s.PUBLIC_DOMAIN}/m/{shop.slug}/" if shop else ''
    # R5: admin nazorat statistikasi
    from orders.models import Order
    import datetime as _dt
    _today = _dt.datetime.combine(_dt.date.today(), _dt.time.min, tzinfo=_dt.timezone.utc)
    t_total = shop.restaurant_tables.count() if shop else 0
    t_busy = shop.restaurant_tables.exclude(status='free').count() if shop else 0
    stats = {
        'tables_busy': t_busy,
        'tables_total': t_total,
        'tables_free': max(0, t_total - t_busy),
        'orders_today': Order.objects.filter(shop=shop, created_at__gte=_today).count() if shop else 0,
        'active_orders': Order.objects.filter(shop=shop, status__in=['pending', 'confirmed', 'preparing', 'out_for_delivery']).count() if shop else 0,
    }
    try:
        from ai.models import AIUsage
        stats['ai_cost_today'] = float(sum(AIUsage.objects.filter(created_at__gte=_today).values_list('cost_usd', flat=True) or [0]))
    except Exception:
        stats['ai_cost_today'] = 0
    return render(request, 'seller/tables.html', {'halls': halls, 'shop': shop, 'general_menu_url': general_menu_url, 'stats': stats})


@seller_required
def seller_tables_print_stands(request):
    """Barcha stollar uchun A4/A6 formatdagi chiroyli QR stendlarini chop etish sahifasi."""
    from tables_restaurant.models import Table
    shop = request.tenant_shop
    tables = Table.objects.filter(shop=shop, is_active=True).select_related('hall').order_by('hall__order', 'number') if shop else []
    return render(request, 'seller/table_stands_print.html', {
        'shop': shop,
        'tables': tables,
    })


@seller_required
def seller_nfc_dashboard(request):
    """
    NFC Smart Stendlar & Kartalar boshqaruv paneli.
    Stol stendlari, stikerlar, ofitsiant beydjlari, VIP kartalar.
    Web NFC API orqali chipga yozish va A6/stiker chop etish.
    """
    from tables_restaurant.models import NFCCard, Table, Hall
    from django.conf import settings as _s
    shop = request.tenant_shop
    if not shop:
        messages.warning(request, "NFC stendlarini boshqarish uchun do'kon tanlanmagan.")
        return redirect('seller_dashboard_web')

    cards = NFCCard.objects.filter(shop=shop).select_related('table', 'table__hall').order_by('-created_at')
    tables = Table.objects.filter(shop=shop, is_active=True).select_related('hall').order_by('hall__order', 'number')
    
    _scheme = 'http' if '127.0.0.1' in (_s.PUBLIC_DOMAIN or '') or 'localhost' in (_s.PUBLIC_DOMAIN or '') else 'https'
    base_url = f"{_scheme}://{_s.PUBLIC_DOMAIN}"

    # Tezkor statistika
    total_cards = cards.count()
    total_taps = sum(c.tap_count for c in cards)
    active_cards = cards.filter(is_active=True).count()
    tables_with_nfc = set(c.table_id for c in cards if c.table_id)
    total_tables = tables.count()

    context = {
        'shop': shop,
        'cards': cards,
        'tables': tables,
        'base_url': base_url,
        'stats': {
            'total_cards': total_cards,
            'total_taps': total_taps,
            'active_cards': active_cards,
            'covered_tables_pct': round((len(tables_with_nfc) / total_tables * 100)) if total_tables > 0 else 0,
            'total_tables': total_tables,
        }
    }
    return render(request, 'seller/nfc_dashboard.html', context)


@seller_required
def seller_nfc_create(request):
    """Yangi NFC stend/karta yaratish."""
    from tables_restaurant.models import NFCCard, Table
    shop = request.tenant_shop
    if not shop:
        return redirect('seller_dashboard_web')

    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        table_id = request.POST.get('table_id')
        card_type = request.POST.get('card_type', 'table_stand')
        design_theme = request.POST.get('design_theme', 'gold_black')
        wifi_name = request.POST.get('wifi_name', '').strip()
        wifi_password = request.POST.get('wifi_password', '').strip()
        custom_note = request.POST.get('custom_note', '').strip()
        card_uid = request.POST.get('card_uid', '').strip()

        table = None
        if table_id:
            table = Table.objects.filter(id=table_id, shop=shop).first()

        if not name:
            if table:
                name = f"Stol #{table.number} NFC Stendi"
            else:
                name = f"NFC Karta ({dict(NFCCard.CARD_TYPES).get(card_type, card_type)})"

        card = NFCCard.objects.create(
            shop=shop,
            table=table,
            name=name,
            card_type=card_type,
            design_theme=design_theme,
            wifi_name=wifi_name,
            wifi_password=wifi_password,
            custom_note=custom_note,
            card_uid=card_uid or None,
            is_active=True,
        )
        messages.success(request, f"'{card.name}' NFC stendi yaratildi! Web NFC orqali chipga yozishingiz yoki chop etishingiz mumkin.")
    return redirect('seller_nfc_dashboard_web')


@seller_required
def seller_nfc_edit(request, pk):
    """NFC kartani tahrirlash (stolni o'zgartirish, Wi-Fi yoki dizayn yangilash)."""
    from tables_restaurant.models import NFCCard, Table
    shop = request.tenant_shop
    card = get_object_or_404(NFCCard, pk=pk, shop=shop)

    if request.method == 'POST':
        card.name = request.POST.get('name', card.name).strip() or card.name
        table_id = request.POST.get('table_id')
        if table_id:
            card.table = Table.objects.filter(id=table_id, shop=shop).first()
        else:
            card.table = None
        card.card_type = request.POST.get('card_type', card.card_type)
        card.design_theme = request.POST.get('design_theme', card.design_theme)
        card.wifi_name = request.POST.get('wifi_name', '').strip()
        card.wifi_password = request.POST.get('wifi_password', '').strip()
        card.custom_note = request.POST.get('custom_note', '').strip()
        card_uid = request.POST.get('card_uid', '').strip()
        if card_uid:
            card.card_uid = card_uid
        card.save()
        messages.success(request, f"'{card.name}' ma'lumotlari muvaffaqiyatli yangilandi.")
    return redirect('seller_nfc_dashboard_web')


@seller_required
def seller_nfc_toggle(request, pk):
    """NFC kartani vaqtincha yoqish / o'chirish."""
    from tables_restaurant.models import NFCCard
    shop = request.tenant_shop
    card = get_object_or_404(NFCCard, pk=pk, shop=shop)
    card.is_active = not card.is_active
    card.save(update_fields=['is_active'])
    status_str = "faollashtirildi" if card.is_active else "to'xtatildi"
    messages.success(request, f"'{card.name}' {status_str}.")
    return redirect('seller_nfc_dashboard_web')


@seller_required
def seller_nfc_delete(request, pk):
    """NFC kartani o'chirish."""
    from tables_restaurant.models import NFCCard
    shop = request.tenant_shop
    card = get_object_or_404(NFCCard, pk=pk, shop=shop)
    card_name = card.name
    card.delete()
    messages.success(request, f"'{card_name}' o'chirildi.")
    return redirect('seller_nfc_dashboard_web')


@seller_required
def seller_nfc_print_stands(request):
    """
    Luxury A6 akril stendlar, stikerlar va beydjlarni chop etish sahifasi.
    Oltin/Qora, Zumrad Yashil, Yog'och va Kiber Neon dizaynlari bilan.
    """
    from tables_restaurant.models import NFCCard
    from django.conf import settings as _s
    shop = request.tenant_shop
    theme_filter = request.GET.get('theme', '')
    card_id = request.GET.get('id')

    cards = NFCCard.objects.filter(shop=shop, is_active=True).select_related('table', 'table__hall')
    if card_id:
        cards = cards.filter(id=card_id)
    elif theme_filter:
        cards = cards.filter(design_theme=theme_filter)

    cards = cards.order_by('table__number', '-created_at')

    _scheme = 'http' if '127.0.0.1' in (_s.PUBLIC_DOMAIN or '') or 'localhost' in (_s.PUBLIC_DOMAIN or '') else 'https'
    base_url = f"{_scheme}://{_s.PUBLIC_DOMAIN}"

    return render(request, 'seller/nfc_stands_print.html', {
        'shop': shop,
        'cards': cards,
        'base_url': base_url,
        'selected_theme': theme_filter,
    })



@seller_required
def seller_kds(request):
    """KDS — oshxona ekrani: oshxonadagi buyurtmalar katta kartochkalar bilan."""
    shop = request.tenant_shop
    from orders.models import Order
    import datetime
    
    active = Order.objects.filter(
        shop=shop, status__in=['pending', 'confirmed', 'preparing', 'ready']
    ).select_related('table', 'table__hall').prefetch_related('items').order_by('created_at') if shop else []
    
    count_pending = sum(1 for o in active if o.status in ('pending', 'confirmed'))
    count_preparing = sum(1 for o in active if o.status == 'preparing')
    count_ready = sum(1 for o in active if o.status == 'ready')
    
    import json
    from web.tma_views import _serialize_kds_orders
    serialized_orders = _serialize_kds_orders(active)
    react_kds_data = {
        'shop': {'name': shop.name if shop else 'Guliston Restoran'},
        'orders': serialized_orders,
        'count_pending': count_pending,
        'count_preparing': count_preparing,
        'count_ready': count_ready,
    }

    ctx = {
        'orders': active,
        'shop': shop,
        'count_pending': count_pending,
        'count_preparing': count_preparing,
        'count_ready': count_ready,
        'react_kds_data_json': json.dumps(react_kds_data, ensure_ascii=False),
    }
    return render(request, 'seller/kds.html', ctx)


@seller_required
def seller_kds_update(request, pk):
    """KDS kartochkasidagi status tugmalari (state machine orqali)."""
    from orders.models import Order
    from orders.state_machine import transition_order
    shop = request.tenant_shop
    new_status = request.POST.get('status', '')
    order = get_object_or_404(Order, pk=pk, shop=shop)
    if new_status:
        ok, msg = transition_order(order, new_status, actor=request.user,
                                   reason='KDS', request=request)
        if ok:
            messages.success(request, msg)
        else:
            messages.error(request, msg)
    referer = request.META.get('HTTP_REFERER')
    if referer:
        return redirect(referer)
    return redirect('seller_kds_web')


# ─── V12: MAHSULOT TO'LIQ TAHRIRI (seller panelida, admin emas) ──────

@seller_required
def seller_product_edit(request, pk):
    """Mahsulotni to'liq tahrirlash: rasmlar, VIDEO, AR model, narx..."""
    from products.models import Product
    product = get_object_or_404(Product, pk=pk, shop=request.tenant_shop)
    from categories.models import Category
    categories = Category.objects.filter(is_active=True)
    if request.method == 'POST':
        f = request.POST
        product.name = f.get('name', product.name).strip()
        product.price = f.get('price', product.price) or product.price
        product.old_price = f.get('old_price') or None
        product.unit = f.get('unit', product.unit)
        product.stock = int(f.get('stock', product.stock) or 0)
        product.description = f.get('description', product.description or '')
        product.ar_model = f.get('ar_model', product.ar_model) or None
        product.has_3d = bool(product.ar_model)
        product.is_available = f.get('is_available') == 'on'
        # Flash aksiya (S5-1) — muddatli chegirma
        flash_price = f.get('flash_price')
        product.flash_price = flash_price if flash_price else None
        flash_until = f.get('flash_until')
        if flash_until:
            from django.utils.dateparse import parse_datetime
            from django.utils import timezone
            dt = parse_datetime(flash_until)
            if dt and timezone.is_naive(dt):
                dt = timezone.make_aware(dt, timezone.get_current_timezone())
            product.flash_until = dt
        else:
            product.flash_until = None
        # Dizayn va shaxsiy uslub (Auto-Polisher)
        product.design_template = f.get('design_template', 'default') or 'default'
        cfg = dict(product.design_config or {})
        accent_color = f.get('accent_color', '').strip()
        if accent_color:
            cfg['accent_color'] = accent_color
        elif 'accent_color' in cfg and f.get('accent_color') == '':
            cfg.pop('accent_color', None)

        badge_text = f.get('badge_text', '').strip()
        if badge_text:
            cfg['badge_text'] = badge_text
        elif 'badge_text' in cfg and f.get('badge_text') == '':
            cfg.pop('badge_text', None)

        if 'bg_theme' in f:
            cfg['bg_theme'] = f.get('bg_theme', 'light')
        cfg['show_ruler'] = f.get('show_ruler') == 'on'
        cfg['show_ar_qr'] = f.get('show_ar_qr') == 'on'
        cfg['show_color_picker'] = f.get('show_color_picker') == 'on'
        product.design_config = cfg

        # O'lchamlar (sm -> mm)
        w_cm = f.get('width_cm')
        if w_cm:
            try:
                product.width_mm = int(float(w_cm) * 10)
            except (ValueError, TypeError):
                pass
        h_cm = f.get('height_cm')
        if h_cm:
            try:
                product.height_mm = int(float(h_cm) * 10)
            except (ValueError, TypeError):
                pass
        d_cm = f.get('depth_cm')
        if d_cm:
            try:
                product.depth_mm = int(float(d_cm) * 10)
            except (ValueError, TypeError):
                pass
        wt_g = f.get('weight_g')
        if wt_g:
            try:
                product.weight_g = int(wt_g)
            except (ValueError, TypeError):
                pass

        cat_id = f.get('category')
        if cat_id:
            product.category_id = cat_id
        for field in ['image', 'image2', 'image3', 'video']:
            uploaded = request.FILES.get(field)
            if uploaded:
                setattr(product, field, uploaded)
        product.save()
        messages.success(request, f"'{product.name}' saqlandi.")
        return redirect('seller_products_web')
    from products.models import PRODUCT_DESIGN_TEMPLATES
    return render(request, 'seller/product_form.html', {
        'product': product, 'categories': categories, 'design_templates': PRODUCT_DESIGN_TEMPLATES,
    })


@seller_required
def seller_product_create(request):
    from products.models import Product, PRODUCT_DESIGN_TEMPLATES
    shop = request.tenant_shop
    from categories.models import Category
    categories = Category.objects.filter(is_active=True)
    if request.method == 'POST':
        f = request.POST
        from django.utils.text import slugify
        import uuid as _uuid
        slug = f"{slugify(f.get('name', ''), allow_unicode=True) or 'mahsulot'}-{str(_uuid.uuid4())[:6]}"
        product = Product.objects.create(
            shop=shop, slug=slug,
            name=f.get('name', 'Yangi mahsulot').strip(),
            price=f.get('price') or 0,
            old_price=f.get('old_price') or None,
            unit=f.get('unit', 'dona'),
            stock=int(f.get('stock', 0) or 0),
            description=f.get('description', ''),
            ar_model=f.get('ar_model') or None,
            is_available=f.get('is_available') == 'on',
            category_id=f.get('category') or None,
            design_template=f.get('design_template', 'default') or 'default',
        )
        product.has_3d = bool(product.ar_model)

        # Dizayn sozlamalari
        cfg = {}
        if f.get('accent_color'):
            cfg['accent_color'] = f.get('accent_color').strip()
        if f.get('badge_text'):
            cfg['badge_text'] = f.get('badge_text').strip()
        if f.get('bg_theme'):
            cfg['bg_theme'] = f.get('bg_theme', 'light')
        cfg['show_ruler'] = f.get('show_ruler') == 'on'
        cfg['show_ar_qr'] = f.get('show_ar_qr') == 'on'
        cfg['show_color_picker'] = f.get('show_color_picker') == 'on'
        product.design_config = cfg

        # O'lchamlar
        w_cm = f.get('width_cm')
        if w_cm:
            try:
                product.width_mm = int(float(w_cm) * 10)
            except (ValueError, TypeError):
                pass
        h_cm = f.get('height_cm')
        if h_cm:
            try:
                product.height_mm = int(float(h_cm) * 10)
            except (ValueError, TypeError):
                pass
        d_cm = f.get('depth_cm')
        if d_cm:
            try:
                product.depth_mm = int(float(d_cm) * 10)
            except (ValueError, TypeError):
                pass
        wt_g = f.get('weight_g')
        if wt_g:
            try:
                product.weight_g = int(wt_g)
            except (ValueError, TypeError):
                pass

        # Flash aksiya
        flash_price = f.get('flash_price')
        if flash_price:
            product.flash_price = flash_price
            flash_until = f.get('flash_until')
            if flash_until:
                from django.utils.dateparse import parse_datetime
                from django.utils import timezone
                dt = parse_datetime(flash_until)
                if dt and timezone.is_naive(dt):
                    dt = timezone.make_aware(dt, timezone.get_current_timezone())
                product.flash_until = dt
        for field in ['image', 'image2', 'image3', 'video']:
            uploaded = request.FILES.get(field)
            if uploaded:
                setattr(product, field, uploaded)
        product.save()
        # 3D model kutubxonadan avtomatik qidirish
        from ar3d.services import auto_attach_library_3d
        ok, matched = auto_attach_library_3d(product)
        if ok and matched:
            messages.info(request, f"⚡ '{product.name}' uchun 3D model kutubxonadan avtomatik biriktirildi ({matched.name_uz}).")
        messages.success(request, f"'{product.name}' qo'shildi.")
        return redirect('seller_products_web')
    return render(request, 'seller/product_form.html', {'product': None, 'categories': categories, 'design_templates': PRODUCT_DESIGN_TEMPLATES})


@seller_required
def seller_products_sample_csv(request):
    """Sotuvchilar uchun mahsulotlar namuna CSV faylini yuklab berish."""
    import csv
    from django.http import HttpResponse

    response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
    response['Content-Disposition'] = 'attachment; filename="namuna_mahsulotlar.csv"'
    # UTF-8 BOM so Excel opens it with proper Uzbek Cyrillic/Latin characters
    response.write('\ufeff')
    writer = csv.writer(response)
    writer.writerow(["Nomi", "Narxi", "Kategoriya", "Tavsif", "Qoldiq", "O'lchov"])
    writer.writerow(["To'y oshi (Maxsus)", "45000", "Milliy taomlar", "Lazer guruchli maxsus to'y oshi, mayin qo'y go'shti va no'xot bilan", "50", "porsiya"])
    writer.writerow(["Qo'y go'shti shashlik", "22000", "Kaboblar", "Yumshoq qo'y go'shtidan qilingan tandir/kabob shashlik", "80", "dona"])
    writer.writerow(["Tandir somsa", "12000", "Pishiriqlar", "Muzday go'shtli qatlama tandir somsa", "100", "dona"])
    writer.writerow(["Qatlama somsa", "14000", "Pishiriqlar", "Varaqi qarsildoq qatlama somsa", "60", "dona"])
    writer.writerow(["Manti", "38000", "Milliy taomlar", "Bug'da pishirilgan mayin qo'y go'shtli manti", "40", "porsiya"])
    writer.writerow(["Qovurma lag'mon", "42000", "Milliy taomlar", "Qo'lda cho'zilgan xamir, qovurilgan go'sht va sabzavotlar", "40", "porsiya"])
    writer.writerow(["Qozon kabob", "58000", "Kaboblar", "Qovurilgan kartoshka va qarsildoq barra qo'y go'shti", "30", "porsiya"])
    writer.writerow(["Ko'za sho'rva", "36000", "Milliy taomlar", "Sopol ko'zacha ichida dimlangan barra go'shtli sho'rva", "35", "porsiya"])
    writer.writerow(["Achchiq-chuchuk", "14000", "Salatlar", "Yangi pomidor, shirin piyoz va murchli milliy salat", "70", "porsiya"])
    writer.writerow(["Tandir non", "5000", "Nonlar", "Issiq tandir non sedana va kunjut bilan", "150", "dona"])
    writer.writerow(["Ko'k choy", "8000", "Ichimliklar", "Chinnigul va limon bilan damlangan xushbo'y choy", "200", "choynak"])
    return response


@seller_required
def seller_products_import_csv(request):
    """Excel/CSV fayldan mahsulotlarni ommaviy (bulk) yuklash."""
    if request.method != 'POST':
        return redirect('seller_products_web')

    csv_file = request.FILES.get('csv_file')
    if not csv_file:
        messages.error(request, "Iltimos, CSV faylni tanlang.")
        return redirect('seller_products_web')

    import csv
    import io
    from decimal import Decimal
    from products.models import Product
    from categories.models import Category
    from ar3d.services import auto_attach_library_3d

    shop = request.tenant_shop
    try:
        content = csv_file.read()
        # Decode trying multiple encodings common in Uzbekistan/Excel
        decoded = None
        for enc in ['utf-8-sig', 'utf-8', 'windows-1251', 'cp1251', 'latin-1']:
            try:
                decoded = content.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        if decoded is None:
            decoded = content.decode('utf-8', errors='ignore')

        # Detect delimiter
        first_line = decoded.split('\n')[0] if decoded else ''
        delim = ';' if ';' in first_line and first_line.count(';') >= first_line.count(',') else ','
        if '\t' in first_line and first_line.count('\t') > first_line.count(delim):
            delim = '\t'

        reader = csv.reader(io.StringIO(decoded), delimiter=delim)
        rows = list(reader)
        if not rows:
            messages.error(request, "CSV fayl bo'sh.")
            return redirect('seller_products_web')

        header = [h.strip().lower() for h in rows[0]]
        col_name = next((i for i, h in enumerate(header) if any(k in h for k in ['nomi', 'name', 'mahsulot', 'tovar', 'title'])), 0)
        col_price = next((i for i, h in enumerate(header) if any(k in h for k in ['narxi', 'price', 'narx', 'summa'])), 1)
        col_cat = next((i for i, h in enumerate(header) if any(k in h for k in ['kategoriya', 'category', 'bolim'])), None)
        col_desc = next((i for i, h in enumerate(header) if any(k in h for k in ['tavsif', 'description', 'izoh', 'haqida'])), None)
        col_stock = next((i for i, h in enumerate(header) if any(k in h for k in ['qoldiq', 'stock', 'soni', 'mavjud'])), None)
        col_unit = next((i for i, h in enumerate(header) if any(k in h for k in ['olchov', "o'lchov", 'unit', 'birlik'])), None)

        imported_count = 0
        categories_cache = {c.name.lower(): c for c in Category.objects.all()}

        for row in rows[1:]:
            if not row or len(row) <= col_name:
                continue
            name = row[col_name].strip()
            if not name:
                continue

            raw_price = row[col_price].strip() if len(row) > col_price else '0'
            clean_price = ''.join(c for c in raw_price if c.isdigit() or c == '.')
            try:
                price = Decimal(clean_price) if clean_price else Decimal('0')
            except Exception:
                price = Decimal('0')

            cat_obj = None
            if col_cat is not None and len(row) > col_cat:
                cat_str = row[col_cat].strip()
                if cat_str:
                    cat_key = cat_str.lower()
                    if cat_key in categories_cache:
                        cat_obj = categories_cache[cat_key]
                    else:
                        cat_obj = Category.objects.create(name=cat_str)
                        categories_cache[cat_key] = cat_obj

            description = row[col_desc].strip() if col_desc is not None and len(row) > col_desc else ''
            raw_stock = row[col_stock].strip() if col_stock is not None and len(row) > col_stock else '50'
            stock = int(''.join(c for c in raw_stock if c.isdigit()) or '50')
            unit = row[col_unit].strip() if col_unit is not None and len(row) > col_unit else 'dona'

            product = Product.objects.create(
                shop=shop,
                name=name,
                price=price,
                category=cat_obj,
                description=description,
                stock=stock,
                unit=unit or 'dona',
                is_available=True
            )
            # Avtomatik 3D kutubxonadan qidirish
            try:
                auto_attach_library_3d(product)
            except Exception:
                pass

            imported_count += 1

        messages.success(request, f"🎉 {imported_count} ta mahsulot muvaffaqiyatli yuklandi va katalogingizga kiritildi!")
    except Exception as e:
        messages.error(request, f"Faylni o'qishda xatolik yuz berdi: {str(e)}")

    return redirect('seller_products_web')


@seller_required
def seller_products_seed_starter(request):
    """12 ta mashhur milliy taomni (rasm va 3D modellari bilan) avtomatik yuklash."""
    if request.method != 'POST':
        return redirect('seller_products_web')

    import os
    from decimal import Decimal
    from django.conf import settings
    from products.models import Product
    from categories.models import Category
    from ar3d.services import auto_attach_library_3d

    shop = request.tenant_shop

    STARTER_DISHES = [
        {
            'name': "To'y Oshi (Maxsus)",
            'price': Decimal('45000'),
            'description': "Lazer guruchidan tayyorlangan maxsus Samarqandcha to'y oshi. Mayin lahm qo'y go'shti, sariq sabzi, no'xot, mayiz va bedana tuxumi bilan.",
            'category_name': "Milliy taomlar",
            'calories': 820,
            'cook_min': 15,
            'image': 'dish/dish_palov.jpg',
            'glb': 'plov.glb',
            'is_hit': True,
        },
        {
            'name': "Qo'y Go'shti Shashlik",
            'price': Decimal('22000'),
            'description': "Shirin qo'y go'shtidan ko'mir cho'g'ida pishirilgan lo'la kabob. Sirka, piyoz va murch bilan tortiladi.",
            'category_name': "Kaboblar",
            'calories': 380,
            'cook_min': 20,
            'image': 'dish/dish_shashlik.jpg',
            'glb': 'shashlik.glb',
            'is_hit': True,
        },
        {
            'name': "Tandir Somsa",
            'price': Decimal('12000'),
            'description': "Loy tandirda yopilgan, mayin qo'y go'shti va duma bilan to'ldirilgan issiq qatlama somsa.",
            'category_name': "Pishiriqlar",
            'calories': 410,
            'cook_min': 10,
            'image': 'dish/dish_somsa.jpg',
            'glb': 'somsa.glb',
            'is_hit': True,
        },
        {
            'name': "Qatlama Somsa",
            'price': Decimal('14000'),
            'description': "Varaqi qarsildoq qatlamali xamir va sarxil maydalangan barra go'shtli maxsus pishiriq.",
            'category_name': "Pishiriqlar",
            'calories': 430,
            'cook_min': 10,
            'image': 'dish/dish_qatlama_somsa.jpg',
            'glb': 'somsa.glb',
        },
        {
            'name': "Samarqandcha Manti",
            'price': Decimal('38000'),
            'description': "Yupqa qo'lda yoyilgan xamir, shirador go'sht va nozik piyoz bilan bug'da pishgan manti (5 dona).",
            'category_name': "Milliy taomlar",
            'calories': 560,
            'cook_min': 25,
            'image': 'dish/dish_manti.jpg',
            'glb': 'manti.glb',
            'is_hit': True,
        },
        {
            'name': "Qovurma Lag'mon",
            'price': Decimal('45000'),
            'description': "Usta oshpaz tomonidan qo'lda cho'zilgan cho'zma xamir, yumshoq go'sht, bulg'or qalampiri va pomidorli sous.",
            'category_name': "Milliy taomlar",
            'calories': 680,
            'cook_min': 15,
            'image': 'dish/dish_lagmon.jpg',
            'glb': 'lagmon.glb',
            'is_hit': True,
        },
        {
            'name': "Qozon Kabob",
            'price': Decimal('58000'),
            'description': "Qizigan cho'yan qozonda qizarguncha qovurilgan barra qo'y go'shti va qovurilgan tillarang kartoshka.",
            'category_name': "Kaboblar",
            'calories': 790,
            'cook_min': 25,
            'image': 'dish/dish_qozon_kabob.jpg',
            'glb': 'qozon_kabob.glb',
            'is_hit': True,
        },
        {
            'name': "Ko'za Sho'rva",
            'price': Decimal('36000'),
            'description': "Sopol ko'zada past olovda 4 soat davomida dimlab pishirilgan barra qo'y go'shti va sabzavotli xushbo'y sho'rva.",
            'category_name': "Milliy taomlar",
            'calories': 450,
            'cook_min': 10,
            'image': 'dish/dish_shorva.jpg',
            'glb': 'shorva.glb',
        },
        {
            'name': "Achchiq-chuchuk Salati",
            'price': Decimal('14000'),
            'description': "Yupqa to'g'ralgan qizil pomidor, achchiq qalampir, rayhon va nozik oppoq piyozdan tayyorlangan milliy salat.",
            'category_name': "Salatlar",
            'calories': 85,
            'cook_min': 5,
            'image': 'dish/dish_salad.jpg',
            'glb': 'salad_achichuk.glb',
        },
        {
            'name': "Bahor Salati",
            'price': Decimal('16000'),
            'description': "Tug'ralgan barra bodring, turp, yangi ko'katlar, tuxum va yengil smetanali yangi bahor salati.",
            'category_name': "Salatlar",
            'calories': 110,
            'cook_min': 5,
            'image': 'dish/dish_bahor_salat.jpg',
            'glb': 'salad_bahor.glb',
        },
        {
            'name': "Issiq Tandir Non",
            'price': Decimal('5000'),
            'description': "O'tin tandirda yopilgan, ustiga sedana va kunjut sepilgan yumshoq va xushbo'y milliy non.",
            'category_name': "Nonlar",
            'calories': 280,
            'cook_min': 5,
            'image': 'dish/dish_non.jpg',
            'glb': 'non.glb',
        },
        {
            'name': "Ko'k Choy (Choynak)",
            'price': Decimal('8000'),
            'description': "Maxsus navli 95-ko'k choy, chinnigul, yangi novvot va limon bo'lagi bilan damlangan.",
            'category_name': "Ichimliklar",
            'calories': 15,
            'cook_min': 5,
            'image': 'dish/dish_kok_choy.jpg',
            'glb': 'tea_cup.glb',
        }
    ]

    added = 0
    categories_cache = {c.name.lower(): c for c in Category.objects.all()}

    for d in STARTER_DISHES:
        if Product.objects.filter(shop=shop, name=d['name']).exists():
            continue

        cat_name = d['category_name']
        cat_key = cat_name.lower()
        if cat_key in categories_cache:
            cat_obj = categories_cache[cat_key]
        else:
            cat_obj = Category.objects.create(name=cat_name)
            categories_cache[cat_key] = cat_obj

        # Check if dish image exists in media
        img_rel = d['image']
        img_full = os.path.join(settings.MEDIA_ROOT, img_rel)
        saved_img = img_rel if os.path.exists(img_full) else ''

        prod = Product.objects.create(
            shop=shop,
            name=d['name'],
            price=d['price'],
            category=cat_obj,
            description=d['description'],
            image=saved_img,
            calories=d.get('calories'),
            cook_min=d.get('cook_min', 15),
            is_hit=d.get('is_hit', False),
            stock=80,
            unit="porsiya" if "Salat" not in cat_name and "Non" not in cat_name else "dona",
            is_available=True
        )

        glb_name = d.get('glb')
        if glb_name:
            glb_full = os.path.join(settings.MEDIA_ROOT, 'ar/glb', glb_name)
            if os.path.exists(glb_full):
                prod.ar_model = f"/media/ar/glb/{glb_name}"
                prod.has_3d = True
                prod.save(update_fields=['ar_model', 'has_3d'])

        try:
            auto_attach_library_3d(prod)
        except Exception:
            pass

        added += 1

    messages.success(request, f"🍲 {added} ta milliy taom (rasmlar va 3D modellari bilan) do'koningizga biriktirildi!")
    return redirect('seller_products_web')


@seller_required
def seller_product_delete(request, pk):
    from products.models import Product
    product = get_object_or_404(Product, pk=pk, shop=request.tenant_shop)
    name = product.name
    product.delete()
    messages.success(request, f"'{name}' o'chirildi.")
    return redirect('seller_products_web')


# ─── V14-R2: OFITSIANT PANELI ────────────────────────────────────────

@seller_required
def waiter_panel(request):
    """Ofitsiant: haqiqiy mobil/planshet POS tizimi — stollar, taomlar 3D/AR bilan, yangi buyurtma olish."""
    shop = request.tenant_shop
    from orders.models import Order, OrderItem
    from products.models import Product
    from categories.models import Category
    from tables_restaurant.models import Table, Hall
    import json
    import datetime

    if request.method == 'POST':
        action = request.POST.get('action')
        
        # 1. Yangi buyurtma ochish (Stolga taomlar qo'shish)
        if action == 'create_order':
            table_id = request.POST.get('table_id')
            items_json = request.POST.get('items_json')
            note = request.POST.get('note', '')
            table_obj = get_object_or_404(Table, pk=table_id, shop=shop) if table_id else None
            
            try:
                items_data = json.loads(items_json) if items_json else []
            except Exception:
                items_data = []
                
            if items_data:
                now = datetime.datetime.now()
                order_num = f"GLS-{now.strftime('%Y%m%d')}-{Order.objects.filter(shop=shop).count() + 1001}"
                total_amount = 0
                
                order = Order.objects.create(
                    shop=shop,
                    order_number=order_num,
                    customer_name=f"Stol #{table_obj.number}" if table_obj else "Ofitsiant buyurtmasi",
                    customer_phone_1=shop.phone or "+998000000000",
                    table=table_obj,
                    delivery_address=f"Zal: {table_obj.hall.name if table_obj and table_obj.hall else 'Asosiy'} · Stol {table_obj.number if table_obj else '-'}",
                    total_amount=0,
                    final_amount=0,
                    status='confirmed', # Ofitsiant tasdiqlab oshxonaga uzatadi
                    payment_status='pending',
                    note=note,
                )
                
                for it in items_data:
                    p_id = it.get('product_id')
                    qty = max(int(it.get('qty', 1)), 1)
                    try:
                        p = Product.objects.get(pk=p_id, shop=shop)
                        line_total = p.price * qty
                        OrderItem.objects.create(
                            order=order, product=p,
                            product_name=p.name, quantity=qty,
                            unit_price=p.price, total=line_total,
                        )
                        total_amount += line_total
                    except Product.DoesNotExist:
                        continue
                        
                order.total_amount = total_amount
                order.final_amount = total_amount
                order.save(update_fields=['total_amount', 'final_amount'])
                
                if table_obj:
                    table_obj.status = 'occupied'
                    table_obj.save(update_fields=['status'])
                    
                # Telegram xabar oshxonaga / adminga
                try:
                    from notifications.services.telegram_service import send_order_created
                    send_order_created(order)
                except Exception:
                    pass
            return redirect('waiter_panel_web')
            
        elif action == 'update_table_status':
            table_id = request.POST.get('table_id')
            new_status = request.POST.get('status')
            if table_id and new_status in ('free', 'occupied', 'ready'):
                t = get_object_or_404(Table, pk=table_id, shop=shop)
                t.status = new_status
                t.save(update_fields=['status'])
            return redirect('waiter_panel_web')
            
        elif action == 'update_order_status':
            order_id = request.POST.get('order_id')
            new_status = request.POST.get('status')
            if order_id and new_status:
                o = get_object_or_404(Order, pk=order_id, shop=shop)
                o.status = new_status
                o.save(update_fields=['status'])
            return redirect('waiter_panel_web')

        elif action == 'quick_create_tables':
            if shop:
                hall, _ = Hall.objects.get_or_create(shop=shop, name="Asosiy zal")
                existing = set(Table.objects.filter(shop=shop).values_list('number', flat=True))
                count = int(request.POST.get('count', 10))
                added = 0
                for n in range(1, count + 1):
                    s_num = str(n)
                    if s_num not in existing:
                        Table.objects.create(shop=shop, hall=hall, number=s_num, capacity=4)
                        existing.add(s_num)
                        added += 1
                messages.success(request, f"🎉 'Asosiy zal' uchun {added} ta stol (1-{count}) muvaffaqiyatli yaratildi! Endi bemalol stol tanlab buyurtma olishingiz mumkin.")
            return redirect('waiter_panel_web')

        elif action == 'add_single_table':
            if shop:
                number = request.POST.get('number', '').strip()
                capacity = int(request.POST.get('capacity', 4))
                hall_name = request.POST.get('hall_name', 'Asosiy zal').strip() or 'Asosiy zal'
                hall, _ = Hall.objects.get_or_create(shop=shop, name=hall_name)
                if number:
                    Table.objects.create(shop=shop, hall=hall, number=number, capacity=capacity)
                    messages.success(request, f"Stol #{number} qo'shildi.")
            return redirect('waiter_panel_web')

    # GET
    orders = Order.objects.filter(shop=shop, status__in=['pending', 'confirmed', 'preparing', 'ready']) \
                 .select_related('table', 'table__hall').prefetch_related('items').order_by('-created_at')[:35] if shop else []
    tables = list(shop.restaurant_tables.all().select_related('hall').order_by('hall__name', 'number')) if shop else []
    halls = Hall.objects.filter(shop=shop).order_by('name') if shop else []
    
    # Taomlar va 3D modellari
    products = list(shop.products.filter(is_available=True).select_related('category', 'model3d', 'model3d__library').order_by('category__name', 'name')) if shop else []
    cats_set = {}
    for p in products:
        p.glb_path = p.ar_model or (p.model3d.glb.url if hasattr(p, 'model3d') and p.model3d and p.model3d.glb else (p.model3d.library.glb_url if hasattr(p, 'model3d') and p.model3d and p.model3d.library else ''))
        p.has_3d = bool(p.glb_path)
        if p.category:
            cats_set[p.category.id] = p.category.name

    categories = [{'id': k, 'name': v} for k, v in cats_set.items()]
    
    # Stollar bo'yicha aktiv buyurtmalarni xaritaga yig'ish (Table ID -> Order)
    table_orders = {}
    for o in orders:
        if o.table_id:
            if o.table_id not in table_orders:
                table_orders[o.table_id] = []
            table_orders[o.table_id].append({
                'id': o.id,
                'number': o.order_number,
                'status': o.status,
                'total': float(o.total_amount or 0),
                'items': [{'name': it.product_name, 'qty': it.quantity, 'price': float(it.price or 0)} for it in o.items.all()]
            })

    ctx = {
        'shop': shop,
        'orders': orders,
        'tables': tables,
        'halls': halls,
        'products': products,
        'categories': categories,
        'table_orders_json': json.dumps(table_orders),
    }
    return render(request, 'seller/waiter.html', ctx)


@seller_required
def waiter_table_status(request, pk):
    from tables_restaurant.models import Table
    t = get_object_or_404(Table, pk=pk, shop=request.tenant_shop)
    new = request.POST.get('status')
    if new in ('free', 'occupied', 'ready'):
        t.status = new
        t.save(update_fields=['status'])
    return redirect('waiter_panel_web')


# ─── V14-R3: RESTORAN 3D PLAN (stollar xaritasi) ─────────────────────

@seller_required
def seller_tables_plan(request):
    """Zal plani: stollar x/y/w/h bilan vizual joylashtiriladi (drag & drop)."""
    from tables_restaurant.models import Hall
    shop = request.tenant_shop
    halls = Hall.objects.filter(shop=shop).prefetch_related('tables') if shop else []
    hall_id = request.GET.get('hall')
    hall = None
    if hall_id:
        hall = next((h for h in halls if str(h.id) == str(hall_id)), None)
    elif halls:
        hall = halls[0]
    tables = hall.tables.all() if hall else []
    return render(request, 'seller/tables_plan.html', {
        'halls': halls, 'hall': hall, 'tables': tables, 'shop': shop,
    })


@seller_required
def seller_tables_plan_save(request):
    """Drag & drop natijasini saqlash: {table_id: [x, y], ...}"""
    import json
    from tables_restaurant.models import Table
    if request.method == 'POST':
        try:
            data = json.loads(request.body or b'{}')
            for tid, xy in data.items():
                Table.objects.filter(pk=tid, shop=request.tenant_shop).update(
                    x=int(xy[0]), y=int(xy[1]))
        except Exception:
            pass
    from django.http import JsonResponse
    return JsonResponse({'ok': True})


# ─── V14-R4: AI RASM→3D (Meshy/Tripo MCP) ────────────────────────────

@seller_required
def seller_product_ai3d(request, pk):
    """Mahsulot rasmidan 3D model yaratish."""
    from products.models import Product
    from ar3d.services import auto_attach_library_3d
    product = get_object_or_404(Product, pk=pk, shop=request.tenant_shop)

    # 1. Avval tayyor 3D kutubxonadan qidirish
    ok, matched = auto_attach_library_3d(product, force=True)
    if ok and matched:
        messages.success(request, f"⚡ 3D model kutubxonadan topildi: {matched.name_uz}")
        return redirect('seller_product_edit_web', pk=pk)

    if not product.image:
        messages.error(request, "Avval mahsulotga rasm yuklang — 3D model shu rasmdan yaratiladi.")
        return redirect('seller_product_edit_web', pk=pk)

    from ar3d.generator import create_3d_for_product
    success, result = create_3d_for_product(product)
    if success:
        messages.success(request, f"✅ 3D model yaratildi!")
    else:
        messages.error(request, f"❌ 3D model yaratilmadi: {result}")
    return redirect('seller_product_edit_web', pk=pk)


# ─── TELEGRAM BOT BOSHQARUV ────────────────────────────────────────────────

@seller_required
def seller_telegram(request):
    """Telegram bot boshqaruv paneli — sozlamalar tahriri, jonli xabar yozish, obunachilar va statistika."""
    shop = request.tenant_shop
    from notifications.models import NotificationLog, TelegramSubscriber, BotMessage, AppSetting
    from django.conf import settings
    import urllib.request
    import json

    # 1. Sozlamalarni o'qish (AppSetting yoki settings dan)
    def get_setting(key, fallback=''):
        st = AppSetting.objects.filter(key=key).first()
        return st.value if st else fallback

    bot_token = get_setting('telegram_bot_token', getattr(settings, 'TELEGRAM_BOT_TOKEN', ''))
    chat_id = get_setting('telegram_chat_id', getattr(settings, 'TELEGRAM_CHAT_ID', ''))
    welcome_msg = get_setting('telegram_welcome_msg', f"Assalomu alaykum! {shop.name if shop else 'Online Store'} botiga xush kelibsiz! Buyurtma berish uchun quyidagi tugmani bosing.")
    order_msg_tpl = get_setting('telegram_order_msg_tpl', f"🛍️ Yangi buyurtma!\n\nBuyurtma kodi: {{order_number}}\nMijoz: {{customer_name}}\nTelefon: {{phone}}\nJami summa: {{total}} so'm")

    # POST amallari
    if request.method == 'POST':
        action = request.POST.get('action')
        
        # 1. Bot Sozlamalarini Saqlash
        if action == 'save_settings':
            new_token = request.POST.get('bot_token', '').strip()
            new_chat_id = request.POST.get('chat_id', '').strip()
            new_welcome = request.POST.get('welcome_msg', '').strip()
            new_order_tpl = request.POST.get('order_msg_tpl', '').strip()
            
            AppSetting.objects.update_or_create(key='telegram_bot_token', defaults={'value': new_token, 'category': 'telegram'})
            AppSetting.objects.update_or_create(key='telegram_chat_id', defaults={'value': new_chat_id, 'category': 'telegram'})
            if new_welcome:
                AppSetting.objects.update_or_create(key='telegram_welcome_msg', defaults={'value': new_welcome, 'category': 'telegram'})
            if new_order_tpl:
                AppSetting.objects.update_or_create(key='telegram_order_msg_tpl', defaults={'value': new_order_tpl, 'category': 'telegram'})
                
            messages.success(request, "Telegram bot sozlamalari muvaffaqiyatli saqlandi!")
            return redirect('seller_telegram_web')
            
        # 2. Xabar Yuborish (Rassilka / Jonli xabar)
        elif action == 'send_broadcast':
            text = request.POST.get('text', '').strip()
            target = request.POST.get('target', 'admin')
            if text:
                from notifications.services.telegram_service import _send_message
                send_count = 0
                fail_count = 0
                
                if target == 'all_subscribers':
                    subs = TelegramSubscriber.objects.filter(is_active=True)
                    for sub in subs:
                        res = _send_message(sub.chat_id, f"📢 <b>{shop.name}</b>\n\n{text}")
                        if res.get('success'):
                            send_count += 1
                        else:
                            fail_count += 1
                    NotificationLog.objects.create(
                        type='telegram', recipient=f"{subs.count()} obunachiga",
                        message=text, success=bool(send_count > 0),
                        error_message=f"{send_count} muvaffaqiyatli, {fail_count} xato" if fail_count else ''
                    )
                    messages.success(request, f"Xabar {send_count} ta obunachiga yuborildi!")
                else:
                    target_chat = chat_id or getattr(settings, 'TELEGRAM_CHAT_ID', '')
                    if target_chat:
                        res = _send_message(target_chat, f"📢 <b>{shop.name}</b>\n\n{text}")
                        NotificationLog.objects.create(
                            type='telegram', recipient=target_chat,
                            message=text, success=res.get('success', False),
                            error_message=res.get('error', '')
                        )
                        if res.get('success'):
                            messages.success(request, "Xabar Telegram guruh/kanaliga yuborildi!")
                        else:
                            messages.error(request, f"Xato: {res.get('error')}")
                    else:
                        messages.error(request, "Chat ID kiritilmagan. Avval Sozlamalarda Chat ID ni saqlang.")
            return redirect('seller_telegram_web')

        # 3. Botni tekshirish (getMe)
        elif action == 'test_bot':
            if bot_token:
                try:
                    req_url = f"https://api.telegram.org/bot{bot_token}/getMe"
                    with urllib.request.urlopen(req_url, timeout=5) as resp:
                        data = json.loads(resp.read().decode('utf-8'))
                        if data.get('ok'):
                            bot_user = data.get('result', {}).get('username', '')
                            messages.success(request, f"✅ Bot faol va ulandi! Bot username: @{bot_user}")
                        else:
                            messages.error(request, "Bot API xato javob qaytardi.")
                except Exception as e:
                    messages.error(request, f"Botga ulanib bo'lmadi: {e}")
            else:
                messages.error(request, "Avval Bot Tokenni kiriting!")
            return redirect('seller_telegram_web')

    # Filtrlar
    msg_type = request.GET.get('type', '')
    msg_status = request.GET.get('status', '')
    msg_search = request.GET.get('q', '').strip()
    date_from = request.GET.get('from', '')
    date_to = request.GET.get('to', '')

    bot_msgs = BotMessage.objects.all()
    if msg_type == 'command':
        bot_msgs = bot_msgs.filter(is_command=True)
    elif msg_type == 'text':
        bot_msgs = bot_msgs.filter(is_command=False)
    if msg_search:
        bot_msgs = bot_msgs.filter(text__icontains=msg_search) | bot_msgs.filter(first_name__icontains=msg_search) | bot_msgs.filter(username__icontains=msg_search)
    if date_from:
        bot_msgs = bot_msgs.filter(created_at__date__gte=date_from)
    if date_to:
        bot_msgs = bot_msgs.filter(created_at__date__lte=date_to)
    bot_msgs = bot_msgs[:80]

    logs = NotificationLog.objects.filter(type='telegram')
    if msg_status == 'success':
        logs = logs.filter(success=True)
    elif msg_status == 'fail':
        logs = logs.filter(success=False)
    if date_from:
        logs = logs.filter(sent_at__date__gte=date_from)
    if date_to:
        logs = logs.filter(sent_at__date__lte=date_to)
    logs = logs.select_related('order')[:80]

    subscribers = TelegramSubscriber.objects.filter(is_active=True)

    total_bot_msgs = BotMessage.objects.count()
    command_count = BotMessage.objects.filter(is_command=True).count()
    text_count = BotMessage.objects.filter(is_command=False).count()
    sent_ok = NotificationLog.objects.filter(type='telegram', success=True).count()
    sent_fail = NotificationLog.objects.filter(type='telegram', success=False).count()

    return render(request, 'seller/telegram.html', {
        'shop': shop,
        'logs': logs,
        'subscribers': subscribers,
        'bot_msgs': bot_msgs,
        'total_bot_msgs': total_bot_msgs,
        'command_count': command_count,
        'text_count': text_count,
        'sent_ok': sent_ok,
        'sent_fail': sent_fail,
        'bot_token': bot_token,
        'chat_id': chat_id,
        'welcome_msg': welcome_msg,
        'order_msg_tpl': order_msg_tpl,
        'msg_type': msg_type,
        'msg_status': msg_status,
        'msg_search': msg_search,
        'date_from': date_from,
        'date_to': date_to,
    })


# ─── YANGI BUYURTMA QO'SHISH ──────────────────────────────────────────────

@seller_required
def seller_order_create(request):
    """Seller panelidan yangi buyurtma qo'shish."""
    shop = request.tenant_shop
    from products.models import Product
    from orders.models import Order, OrderItem

    products = Product.objects.filter(shop=shop, is_available=True).select_related('category')

    if request.method == 'POST':
        customer_name = request.POST.get('customer_name', '').strip()
        customer_phone = request.POST.get('customer_phone', '').strip()
        address = request.POST.get('address', '').strip()
        note = request.POST.get('note', '').strip()
        product_ids = request.POST.getlist('product_ids')
        quantities = request.POST.getlist('quantities')

        if not customer_name or not customer_phone:
            messages.error(request, 'Mijoz ismi va telefon raqami shart.')
            return redirect('seller_order_create_web')

        if not product_ids:
            messages.error(request, 'Kamida bitta mahsulot tanlang.')
            return redirect('seller_order_create_web')

        # Order number
        import datetime
        now = datetime.datetime.now()
        order_number = f"GLS-{now.strftime('%Y%m%d')}-{now.timestamp()[:0]}"

        total = 0
        order = Order.objects.create(
            shop=shop,
            order_number=f"GLS-{now.strftime('%Y%m%d')}-{Order.objects.filter(shop=shop).count() + 1001}",
            customer_name=customer_name,
            customer_phone_1=customer_phone,
            delivery_address=address,
            total_amount=0,
            final_amount=0,
            status='pending',
            payment_status='pending',
            note=note,
        )

        for pid, qty in zip(product_ids, quantities):
            try:
                p = Product.objects.get(pk=pid, shop=shop)
                q = max(int(qty or 1), 1)
                line_total = p.price * q
                OrderItem.objects.create(
                    order=order, product=p,
                    product_name=p.name, quantity=q,
                    unit_price=p.price, total=line_total,
                )
                total += line_total
            except Product.DoesNotExist:
                continue

        order.total_amount = total
        order.final_amount = total
        order.save()

        # Telegram xabar
        try:
            from notifications.services.telegram_service import send_order_created
            send_order_created(order)
        except Exception:
            pass

        messages.success(request, f'Buyurtma #{order.order_number} yaratildi! ({total|uznum} so\'m)')
        return redirect('seller_order_detail_web', pk=order.pk)

    return render(request, 'seller/order_form.html', {
        'shop': shop,
        'products': products,
    })


# ─── AR / 3D BOSHQARUV PANELI ──────────────────────────────────────────────

@seller_required
def seller_ar(request):
    """AR/3D mahsulot boshqaruvi — 3D modellarni boshqarish, AI yaratish, kutubxona."""
    shop = request.tenant_shop
    from products.models import Product
    from ar3d.models import ProductLibrary, Product3DModel
    from categories.models import Category
    from django.http import JsonResponse

    products = Product.objects.filter(shop=shop).select_related('category', 'model3d').order_by('-updated_at')
    all_products = products
    categories = Category.objects.filter(is_active=True).order_by('sort_order', 'name')
    just_created_ar_id = request.session.pop('just_created_ar_id', None)
    recent_3d_products = list(products.filter(has_3d=True).order_by('-updated_at')[:4])

    # AR statistikasi
    ar_count = all_products.filter(has_3d=True).count()
    no_ar_count = all_products.filter(has_3d=False).count()
    total = all_products.count()

    # Kutubxonadagi 3D modellar
    library_models = ProductLibrary.objects.all()

    # POST — AR boshqarish
    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'create_category':
            name = request.POST.get('name', '').strip()
            if not name:
                return JsonResponse({'success': False, 'error': 'Kategoriya nomi kiritilmadi'})
            cat, created = Category.objects.get_or_create(
                name=name,
                defaults={'name_uz': name, 'name_ru': name, 'icon': 'folder', 'color': '#7c3aed', 'is_active': True}
            )
            return JsonResponse({'success': True, 'id': cat.id, 'name': cat.name, 'created': created})

        elif action == 'toggle_ar':
            product_id = request.POST.get('product_id')
            try:
                p = Product.objects.get(pk=product_id, shop=shop)
                p.has_3d = not p.has_3d
                if not p.has_3d:
                    p.ar_model = None
                    Product3DModel.objects.filter(product=p).delete()
                else:
                    if not p.ar_model:
                        from ar3d.services import auto_attach_library_3d
                        ok, matched = auto_attach_library_3d(p, force=False)
                        if not ok or not p.ar_model:
                            p.ar_model = '/media/products/dish_3d.glb'
                p.save(update_fields=['ar_model', 'has_3d'])
                status = 'yoqildi' if p.has_3d else 'o\'chirildi'
                messages.success(request, f"'{p.name}' AR {status}.")
            except Product.DoesNotExist:
                messages.error(request, 'Mahsulot topilmadi')

        elif action == 'attach_library':
            product_id = request.POST.get('product_id')
            library_id = request.POST.get('library_id')
            try:
                p = Product.objects.get(pk=product_id, shop=shop)
                lib = ProductLibrary.objects.get(pk=library_id)
                p.ar_model = lib.glb_url or '/media/products/dish_3d.glb'
                p.has_3d = bool(p.ar_model)
                p.save(update_fields=['ar_model', 'has_3d'])
                Product3DModel.objects.update_or_create(
                    product=p,
                    defaults={
                        'library': lib,
                        'status': 'ready',
                        'source': f'library:{lib.key}',
                        'real_size_cm': lib.real_size_cm,
                    }
                )
                request.session['just_created_ar_id'] = p.id
                from django.db.models import F
                ProductLibrary.objects.filter(pk=lib.pk).update(used_by_count=F('used_by_count') + 1)
                messages.success(request, f"'{p.name}' ga '{lib.name_uz}' modeli biriktirildi!")
            except (Product.DoesNotExist, ProductLibrary.DoesNotExist):
                messages.error(request, 'Mahsulot yoki model topilmadi')

        elif action == 'batch_auto_match':
            from django.db.models import Q
            from ar3d.services import auto_attach_library_3d, seed_product_library
            seed_product_library()

            force_rematch = request.POST.get('force') in ('1', 'true', True)
            is_ajax = request.headers.get('x-requested-with') == 'XMLHttpRequest' or 'application/json' in request.headers.get('accept', '') or request.POST.get('format') == 'json'

            attached_count = 0
            if force_rematch:
                prods = Product.objects.filter(shop=shop)
            else:
                prods = Product.objects.filter(shop=shop).filter(
                    Q(has_3d=False) | Q(ar_model__isnull=True) | Q(ar_model='')
                )
            total_targets = prods.count()
            for p in prods:
                ok, matched = auto_attach_library_3d(p, force=True)
                if ok:
                    attached_count += 1

            if is_ajax:
                if attached_count > 0:
                    msg = f"⚡ Avtomatik biriktirish: {attached_count} ta mahsulotga 3D model muvaffaqiyatli ulandi!"
                elif total_targets == 0:
                    msg = "Barcha mahsulotlaringizda 3D AR modellar allaqachon faol!"
                else:
                    msg = "Biriktirish uchun mos model topilmadi."
                return JsonResponse({
                    'success': True,
                    'attached_count': attached_count,
                    'total_targets': total_targets,
                    'message': msg
                })

            if attached_count > 0:
                messages.success(request, f"⚡ Avtomatik biriktirish: {attached_count} ta mahsulotga 3D model muvaffaqiyatli ulandi!")
            elif total_targets == 0:
                messages.info(request, "Barcha mahsulotlaringizda 3D AR modellar allaqachon faol!")
            else:
                messages.warning(request, "Biriktirish uchun mos model topilmadi.")

        elif action == 'auto_match_single':
            product_id = request.POST.get('product_id')
            try:
                p = Product.objects.get(pk=product_id, shop=shop)
                from ar3d.services import auto_attach_library_3d, seed_product_library
                seed_product_library()
                ok, matched = auto_attach_library_3d(p, force=True)
                if ok:
                    request.session['just_created_ar_id'] = p.id
                    name = matched.name_uz if matched else "3D model"
                    messages.success(request, f"⚡ '{p.name}' uchun 3D model avtomatik biriktirildi: {name}")
                else:
                    messages.error(request, f"'{p.name}' uchun 3D model topilmadi.")
            except Product.DoesNotExist:
                messages.error(request, 'Mahsulot topilmadi')

        elif action == 'ai_generate':
            product_id = request.POST.get('product_id')
            try:
                p = Product.objects.get(pk=product_id, shop=shop)
                if not p.image:
                    messages.error(request, f"'{p.name}' uchun rasm yo'q — avval rasm yuklang.")
                else:
                    from ar3d.services import auto_attach_library_3d
                    ok, matched = auto_attach_library_3d(p, force=True)
                    if ok and matched:
                        request.session['just_created_ar_id'] = p.id
                        messages.success(request, f"⚡ '{p.name}' uchun 3D model kutubxonadan topildi: {matched.name_uz}")
                    else:
                        from ar3d.generator import create_3d_for_product
                        success, result = create_3d_for_product(p, force_ai=True)
                        if success:
                            request.session['just_created_ar_id'] = p.id
                            messages.success(request, f"✅ '{p.name}' uchun 3D model yaratildi!")
                        else:
                            messages.error(request, f"❌ '{p.name}' uchun 3D model yaratilmadi: {result}")
            except Product.DoesNotExist:
                messages.error(request, 'Mahsulot topilmadi')

        elif action == 'remove_ar':
            product_id = request.POST.get('product_id')
            try:
                p = Product.objects.get(pk=product_id, shop=shop)
                p.ar_model = None
                p.has_3d = False
                p.save(update_fields=['ar_model', 'has_3d'])
                Product3DModel.objects.filter(product=p).delete()
                messages.success(request, f"'{p.name}' dan AR model o'chirildi.")
            except Product.DoesNotExist:
                messages.error(request, 'Mahsulot topilmadi')

        elif action == 'create_ar':
            product_id = request.POST.get('product_id')
            new_name = request.POST.get('new_product_name', '').strip()
            cat_id = request.POST.get('category_id')
            new_cat_name = request.POST.get('new_category_name', '').strip()

            # Kategoriya aniqlash
            selected_category = None
            if new_cat_name:
                selected_category, _ = Category.objects.get_or_create(
                    name=new_cat_name,
                    defaults={'name_uz': new_cat_name, 'name_ru': new_cat_name, 'icon': 'folder', 'color': '#7c3aed', 'is_active': True}
                )
            elif cat_id:
                try:
                    selected_category = Category.objects.get(pk=cat_id)
                except Category.DoesNotExist:
                    pass

            # Mahsulotni topish yoki yaratish
            p = None
            if product_id:
                try:
                    p = Product.objects.get(pk=product_id, shop=shop)
                    if selected_category and not p.category:
                        p.category = selected_category
                        p.save(update_fields=['category'])
                except Product.DoesNotExist:
                    pass
            elif new_name:
                from django.utils.text import slugify
                import uuid as _uuid
                price_val = request.POST.get('new_product_price', 0)
                try:
                    price_val = float(price_val)
                except (ValueError, TypeError):
                    price_val = 0
                slug = f"{slugify(new_name, allow_unicode=True) or 'mahsulot'}-{str(_uuid.uuid4())[:6]}"
                p = Product.objects.create(
                    shop=shop, slug=slug, name=new_name,
                    price=price_val, unit='dona', stock=10,
                    is_available=True,
                    category=selected_category,
                )

            if not p:
                messages.error(request, 'Mahsulot tanlang yoki yangi nom kiriting.')
                return redirect('seller_ar_web')

            # 4 ta rakursli rasmlarni qabul qilish
            img_front = request.FILES.get('image_front') or request.FILES.get('image')
            img_back = request.FILES.get('image_back') or request.FILES.get('image2')
            img_right = request.FILES.get('image_right') or request.FILES.get('image3')
            img_left = request.FILES.get('image_left') or request.FILES.get('image4')

            update_fields = []
            if img_front:
                p.image = img_front
                update_fields.append('image')
            if img_back:
                p.image2 = img_back
                update_fields.append('image2')
            if img_right:
                p.image3 = img_right
                update_fields.append('image3')
            if img_left:
                p.image4 = img_left
                update_fields.append('image4')

            if update_fields:
                p.save(update_fields=update_fields)

            if not p.image:
                messages.error(request, f"'{p.name}' uchun kamida old tomon rasmi kerak.")
                return redirect('seller_ar_web')

            # 3D model yaratish (4 rakurs yoki kutubxona)
            from ar3d.generator import create_3d_for_product
            success, result = create_3d_for_product(p, force_ai=bool(img_back or img_right or img_left))
            if success:
                request.session['just_created_ar_id'] = p.id
                messages.success(request, f"✅ '{p.name}' uchun 3D model muvaffaqiyatli yaratildi va biriktirildi!")
            else:
                messages.error(request, f"❌ '{p.name}' uchun 3D model yaratilmadi: {result}")

        return redirect('seller_ar_web')

    category_tree = []
    products_by_cat = {}
    uncategorized = []
    for p in products:
        if p.category_id:
            products_by_cat.setdefault(p.category_id, []).append(p)
        else:
            uncategorized.append(p)

    for cat in categories:
        cat_prods = products_by_cat.get(cat.id, [])
        cat_3d_count = sum(1 for p in cat_prods if p.has_3d)
        category_tree.append({
            'category': cat,
            'products': cat_prods,
            'total_count': len(cat_prods),
            'ar_count': cat_3d_count,
        })
    if uncategorized:
        cat_3d_count = sum(1 for p in uncategorized if p.has_3d)
        category_tree.append({
            'category': None,
            'products': uncategorized,
            'total_count': len(uncategorized),
            'ar_count': cat_3d_count,
        })

    return render(request, 'seller/ar.html', {
        'shop': shop,
        'products': products,
        'categories': categories,
        'category_tree': category_tree,
        'ar_count': ar_count,
        'no_ar_count': no_ar_count,
        'total': total,
        'library_models': library_models,
        'recent_3d_products': recent_3d_products,
        'just_created_ar_id': just_created_ar_id,
    })


@seller_required
def seller_3d_studio(request):
    """
    Mahsulot #3: 3D Studio & Chop Etish Navbati (Print Queue).
    3D printer buyurtmalarini ko'rish, holatini o'zgartirish va boshqarish.
    """
    from ar3d.models import Print3DOrder, Print3DProduct, Print3DMaterial
    from notifications.services.print3d_notification_service import notify_customer_3d_order_ready
    from notifications.telegram_bot import send_message

    shop = getattr(request, 'tenant_shop', None)

    if request.method == 'POST':
        action = request.POST.get('action')
        order_id = request.POST.get('order_id')
        if action == 'update_status' and order_id:
            new_status = request.POST.get('status')
            order = Print3DOrder.objects.filter(id=order_id).first()
            if order and new_status in dict(Print3DOrder.STATUS_CHOICES):
                order.status = new_status
                order.save(update_fields=['status', 'updated_at'])
                messages.success(request, f"Buyurtma #{order.order_number} holati '{order.get_status_display()}' ga o'zgartirildi.")

                if new_status == 'printing' and order.telegram_chat_id:
                    send_message(
                        order.telegram_chat_id,
                        f"⚙️ <b>Xushxabar, {order.customer_name}!</b>\n\n"
                        f"Sizning <b>#{order.order_number}</b> raqamli 3D printer buyurtmangiz hozirda usta tomonidan 3D printerda chop etilishni boshladi! 🚀\n\n"
                        f"Tayyor bo'lishi bilan sizga fotosurat va lokatsiya yuboramiz."
                    )
                elif new_status == 'ready':
                    try:
                        notify_customer_3d_order_ready(order)
                    except Exception as e:
                        logger.error(f"3D notify ready error: {e}")
            return redirect('seller_3d_studio_web')

        elif action == 'add_note' and order_id:
            admin_notes = request.POST.get('admin_notes', '').strip()
            order = Print3DOrder.objects.filter(id=order_id).first()
            if order:
                order.admin_notes = admin_notes
                order.save(update_fields=['admin_notes'])
                messages.success(request, f"#{order.order_number} qaydlari saqlandi.")
            return redirect('seller_3d_studio_web')

    # Filtrlash
    status_filter = request.GET.get('status', 'all')
    orders_qs = Print3DOrder.objects.all().order_by('-created_at')
    if status_filter and status_filter != 'all':
        orders_qs = orders_qs.filter(status=status_filter)

    total_orders = Print3DOrder.objects.count()
    active_printing = Print3DOrder.objects.filter(status='printing').count()
    new_orders = Print3DOrder.objects.filter(status__in=['new', 'confirmed']).count()
    ready_orders = Print3DOrder.objects.filter(status='ready').count()
    total_revenue = Print3DOrder.objects.filter(status__in=['ready', 'delivered']).aggregate(s=Sum('final_amount'))['s'] or 0

    materials = Print3DMaterial.objects.filter(is_active=True)

    context = {
        'shop': shop,
        'orders': orders_qs,
        'status_filter': status_filter,
        'total_orders': total_orders,
        'active_printing': active_printing,
        'new_orders': new_orders,
        'ready_orders': ready_orders,
        'total_revenue': total_revenue,
        'materials': materials,
    }
    return render(request, 'seller/3d_studio.html', context)

