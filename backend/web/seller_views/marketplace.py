import logging
logger = logging.getLogger(__name__)
from datetime import timedelta
from django.contrib import messages
from django.conf import settings
from django.db.models import Avg, Sum, Q, Count
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from web.seller_decorators import seller_required, restaurant_panel_guard
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.decorators.http import require_POST
from shops.models import Shop, ShopPage, SHOP_SECTION_TYPES
from products.models import Product
from orders.models import Order, OrderItem
from accounts.models import Customer, AdminUser
from notifications.models import TelegramSubscriber
from categories.models import Category
from products.ar_validation import ArModelError, validate_ar_model_form_value
from django.contrib.auth import authenticate, login



def _shop_categories(shop):
    """Faqat shu restoranning bo'limlari (categories/scoping.py): boshqa restoran bo'limlari ko'rinmaydi va yaratilmaydi."""
    from categories.scoping import categories_for_shop
    return categories_for_shop(shop, Category.objects.all())


@seller_required
def seller_dashboard(request):
    shop = request.tenant_shop
    now = timezone.now()
    from orders.timeutils import local_day_start
    today_start = local_day_start()
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
    from finance.services.summary import today_summary
    from backend.app_settings import get_choice
    from orders.models import OrderItem
    from tables_restaurant.models import Table

    summary = today_summary(shop)

    # 3. Faol buyurtmalar (oshxonada)
    active_orders = orders_qs.filter(
        created_at__gte=today_start,
        status__in=['pending', 'confirmed', 'preparing']
    ).count()

    # 4. Stollar statistikasi (band / jami)
    tables_qs = Table.objects.filter(shop=shop, is_active=True)
    tables_total = tables_qs.count()
    tables_occupied = tables_qs.exclude(status__in=['free', 'cleaning']).count()

    # 5. Stop-list (tugagan taomlar)
    stoplist_count = products_qs.filter(is_available=False).count()

    # 6. Bugungi TOP 5 sotilgan taomlar
    today_live_order_ids = today_orders.exclude(status__in=['cancelled', 'failed']).values_list('id', flat=True)
    top_dishes = list(
        OrderItem.objects.filter(order_id__in=today_live_order_ids)
        .values('product_name')
        .annotate(qty=Sum('quantity'), total=Sum('total'))
        .order_by('-qty')[:5]
    )

    scope = get_choice('panel_scope', 'restaurant', ('restaurant', 'all'))
    if scope == 'restaurant':
        quick_links = [
            {'url': 'seller_products_web', 'icon': 'restaurant_menu', 'label': 'Menyu'},
            {'url': 'seller_orders_web', 'icon': 'receipt_long', 'label': 'Buyurtmalar'},
            {'url': 'seller_kds_web', 'icon': 'soup_kitchen', 'label': 'KDS Oshxona'},
            {'url': 'seller_tables_web', 'icon': 'table_restaurant', 'label': 'Stollar'},
        ]
    else:
        quick_links = [
            {'url': 'seller_products_web', 'icon': 'inventory_2', 'label': 'Mahsulotlar'},
            {'url': 'seller_orders_web', 'icon': 'receipt_long', 'label': 'Buyurtmalar'},
            {'url': 'seller_template_gallery', 'icon': 'palette', 'label': 'Dizayn'},
            {'url': 'seller_profile_web', 'icon': 'person', 'label': 'Profil'},
        ]

    ctx = {
        'shop': shop,
        'stats': {
            'total_products': products_qs.count(),
            'total_orders': orders_qs.count(),
            'today_orders': summary['orders_count'],
            'today_revenue': summary['income'],
            'today_revenue_cash': summary['income_cash'],
            'today_revenue_card': summary['income_card'],
            'average_check': summary['average_check'],
            'active_orders': active_orders,
            'tables_total': tables_total,
            'tables_occupied': tables_occupied,
            'stoplist_count': stoplist_count,
            'week_revenue': live_week.aggregate(s=Sum('final_amount'))['s'] or 0,
            'avg_rating': round(products_qs.aggregate(a=Avg('rating'))['a'] or 0, 1),
            'total_customers': Customer.objects.filter(orders__shop=shop).distinct().count(),
            'views': shop.views,
            'bonus_paid': orders_qs.exclude(status__in=['cancelled', 'failed']).aggregate(s=Sum('bonus_earned'))['s'] or 0,
        },
        'top_dishes': top_dishes,
        'revenue_series': series,
        'recent_orders': orders_qs.order_by('-created_at')[:5],
        'quick_links': quick_links,
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

    status_filter = request.GET.get('status', '').strip()
    available_param = request.GET.get('available')
    if available_param == '0' or status_filter in ('unavailable', 'off', 'stoplist'):
        products = products.filter(is_available=False)
    elif available_param == '1' or status_filter in ('available', 'on'):
        products = products.filter(is_available=True)

    now = timezone.now()
    all_products = Product.objects.filter(shop=shop)
    return render(request, 'seller/products.html', {
        'shop': shop, 'products': products,
        'search': q, 'categories': _shop_categories(shop),
        'category_filter': int(cat) if cat and cat.isdigit() else None,
        'available_count': all_products.filter(is_available=True).count(),
        'stoplist_count': all_products.filter(is_available=False).count(),
        'flash_count': all_products.filter(flash_price__isnull=False, flash_until__gt=now).count(),
        'hit_count': all_products.filter(is_hit=True).count(),
        'ar_count': all_products.filter(has_3d=True).count(),
        'status_filter': status_filter or available_param,
    })


@seller_required
def seller_orders(request):
    shop = request.tenant_shop
    orders_qs = Order.objects.filter(shop=shop).select_related('shop', 'courier').order_by('-created_at')
    status = request.GET.get('status')
    if status:
        orders_qs = orders_qs.filter(status=status)
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

    from django.core.paginator import Paginator
    paginator = Paginator(orders_qs, 50)
    page_number = request.GET.get('page')
    orders_page = paginator.get_page(page_number)

    return render(request, 'seller/orders.html', {
        'shop': shop, 'orders': orders_page, 'status_filter': status,
        'status_counts': status_counts,
    })


@seller_required
def seller_order_detail(request, pk):
    shop = request.tenant_shop
    order = get_object_or_404(Order.objects.prefetch_related('items'), pk=pk, shop=shop)
    items = order.items.all()
    return render(request, 'seller/order_detail.html', {'shop': shop, 'order': order, 'items': items})


@seller_required
@require_POST
def seller_order_status(request, pk):
    """
    Buyurtma tafsilotidagi "holatni o'zgartirish" formasi (restoran URLConf'ida `admin_order_status` nomi bilan ulangan).
    Eski umumiy `views.admin_order_status` dan farqi: faqat O'Z do'koni buyurtmasi (IDOR yo'q) va holat FAQAT holat mashinasi
    (`transition_order`) orqali o'zgaradi — ruxsat etilmagan o'tish rad etiladi, tarix yoziladi, kassa/ombor/xabar ishlaydi.
    """
    from orders.state_machine import transition_order
    order = get_object_or_404(Order, pk=pk, shop=request.tenant_shop)
    new_status = request.POST.get('status', '')
    if new_status not in dict(Order.STATUS_CHOICES):
        messages.error(request, "Noto'g'ri holat")
    elif new_status == order.status:
        messages.info(request, "Holat o'zgarmadi")
    else:
        ok, msg = transition_order(order, new_status, actor=request.user, reason='Sotuvchi paneli', request=request)
        if not ok:
            messages.error(request, msg)
    return redirect('seller_order_detail_web', pk=order.pk)


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
    except (TypeError, ValueError):
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
@require_POST
def seller_review_delete(request, pk):
    """Sharhni o'chirish (soft-delete): faqat o'z do'koni sharhi uchun (IDOR himoyasi)."""
    from notifications.models import Review
    from web.restaurant_auth import staff_shop
    from django.http import HttpResponseForbidden
    from django.shortcuts import get_object_or_404
    shop = getattr(request, 'tenant_shop', None) or staff_shop(request)
    review = get_object_or_404(Review, pk=pk)
    role = getattr(request.user, 'role', '')
    if role != 'super_admin' and not getattr(request.user, 'is_superuser', False):
        if not shop or review.product.shop_id != shop.id:
            return HttpResponseForbidden("Boshqa do'konning sharhini o'chirish taqiqlangan")
    review.delete()
    messages.success(request, "Sharh muvaffaqiyatli o'chirildi")
    return redirect('seller_reviews_web')


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
@restaurant_panel_guard
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
@restaurant_panel_guard
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
@restaurant_panel_guard
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
@restaurant_panel_guard
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
        new_slug = f"{(_slugify(base_slug, allow_unicode=True) or 'design')[:60]}-custom-{request.user.pk}-{random.randint(1000, 9999)}"
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
@restaurant_panel_guard
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
@restaurant_panel_guard
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
        categories = _shop_categories(shop)[:16]
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


def seller_product_edit(request, pk):
    """Mahsulotni to'liq tahrirlash: rasmlar, VIDEO, AR model, narx..."""
    from products.models import Product, PRODUCT_DESIGN_TEMPLATES
    product = get_object_or_404(Product, pk=pk, shop=request.tenant_shop)
    from categories.models import Category
    categories = _shop_categories(request.tenant_shop).filter(is_active=True)
    if request.method == 'POST':
        f = request.POST
        product.name = f.get('name', product.name).strip()
        product.price = f.get('price', product.price) or product.price
        product.old_price = f.get('old_price') or None
        product.unit = f.get('unit', product.unit)
        product.stock = int(f.get('stock', product.stock) or 0)
        product.description = f.get('description', product.description or '')
        # 3D model manzili API'dagi bilan bir xil qoida bo'yicha tekshiriladi; yaroqsiz bo'lsa hech narsa saqlanmaydi
        # (forma kalitisiz kelsa, saqlangan qiymat tegilmaydi va qayta tekshirilmaydi)
        raw_ar_model = f.get('ar_model', product.ar_model)
        ar_error = None
        try:
            product.ar_model = validate_ar_model_form_value(raw_ar_model, product.ar_model)
        except ArModelError as exc:
            ar_error = str(exc)
            product.ar_model = (raw_ar_model or '').strip() or None   # forma yozilgan qiymat bilan qayta ko'rsatiladi
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
        if ar_error:
            messages.error(request, ar_error)
            return render(request, 'seller/product_form.html', {
                'product': product, 'categories': categories, 'design_templates': PRODUCT_DESIGN_TEMPLATES,
            })
        product.save()
        if request.FILES.get('image'):
            from ar3d.pipeline import on_product_image_saved
            if on_product_image_saved(product):
                messages.info(request, "🧊 Yangi rasm bo'yicha 3D model qayta tayyorlanmoqda.")
        messages.success(request, f"'{product.name}' saqlandi.")
        return redirect('seller_products_web')
    return render(request, 'seller/product_form.html', {
        'product': product, 'categories': categories, 'design_templates': PRODUCT_DESIGN_TEMPLATES,
    })


@seller_required
def seller_product_create(request):
    from products.models import Product, PRODUCT_DESIGN_TEMPLATES
    shop = request.tenant_shop
    from categories.models import Category
    categories = _shop_categories(shop).filter(is_active=True)
    if request.method == 'POST':
        f = request.POST
        # 3D model manzili API'dagi bilan bir xil qoida bo'yicha tekshiriladi: yaroqsiz bo'lsa mahsulot yaratilmaydi
        try:
            ar_model = validate_ar_model_form_value(f.get('ar_model'))
        except ArModelError as exc:
            messages.error(request, str(exc))
            return render(request, 'seller/product_form.html', {
                'product': None, 'categories': categories, 'design_templates': PRODUCT_DESIGN_TEMPLATES,
            })
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
            ar_model=ar_model,
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
        # 3D: taomning o'z rasmidan, fon navbatida (TZ_LOKAL_RASMDAN_3D_MENYU). Kutubxonadan nom bo'yicha
        # umumiy model qo'yish — faqat RESTAURANT_3D_LIBRARY_AUTO yoqilganda.
        from ar3d.pipeline import on_product_image_saved
        if product.image and on_product_image_saved(product):
            messages.info(request, f"🧊 '{product.name}' uchun 3D model tayyorlanmoqda — odatda bir daqiqa ichida menyuda paydo bo'ladi.")
        elif getattr(settings, 'RESTAURANT_3D_LIBRARY_AUTO', False):
            from ar3d.services import auto_attach_library_3d
            ok, matched = auto_attach_library_3d(product, fallback_to_image=False)
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
        categories_cache = {c.name.lower(): c for c in _shop_categories(shop)}

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
                        cat_obj = Category.objects.create(shop=shop, name=cat_str)
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
            # Kutubxonadan nom bo'yicha umumiy model — faqat flag yoqilganda (rasm yo'q, taxmin noto'g'ri bo'lishi mumkin)
            if getattr(settings, 'RESTAURANT_3D_LIBRARY_AUTO', False):
                try:
                    auto_attach_library_3d(product, fallback_to_image=False)
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
    categories_cache = {c.name.lower(): c for c in _shop_categories(shop)}

    for d in STARTER_DISHES:
        if Product.objects.filter(shop=shop, name=d['name']).exists():
            continue

        cat_name = d['category_name']
        cat_key = cat_name.lower()
        if cat_key in categories_cache:
            cat_obj = categories_cache[cat_key]
        else:
            cat_obj = Category.objects.create(shop=shop, name=cat_name)
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
@require_POST
def seller_product_delete(request, pk):
    from products.models import Product
    from django.utils import timezone
    shop = getattr(request, 'tenant_shop', None)
    if getattr(request.user, 'is_superuser', False) or getattr(request.user, 'role', '') == 'super_admin':
        product = get_object_or_404(Product, pk=pk)
    else:
        product = get_object_or_404(Product, pk=pk, shop=shop)
    name = product.name
    # 4-QOIDA: Soft delete & arxivlash (Hech qachon butunlay o'chirilmaydi)
    product.is_deleted = True
    product.is_available = False
    product.deleted_at = timezone.now()
    product.save(update_fields=['is_deleted', 'is_available', 'deleted_at'])
    messages.success(request, f"'{name}' arxivlandi va yashirildi.")
    return redirect('seller_products_web')



@seller_required
def seller_product_3d_status(request, pk):
    """Taom 3D holati (forma sahifasi navbatdagi modelni kuzatishi uchun)."""
    from django.http import JsonResponse
    from products.models import Product
    from ar3d.models import Product3DModel
    product = get_object_or_404(Product, pk=pk, shop=request.tenant_shop)
    job = Product3DModel.objects.filter(product=product).first()
    return JsonResponse({
        'status': job.status if job else 'none',
        'error': job.error_msg if job else '',
        'ar_model': product.ar_model or '',
    })


@seller_required
@require_POST
def seller_product_ai3d(request, pk):
    """Taom rasmidan 3D model yaratish — fon navbatiga qo'yiladi (sahifa kutib qotmaydi)."""
    from products.models import Product
    product = get_object_or_404(Product, pk=pk, shop=request.tenant_shop)

    # Kutubxonadan umumiy model — faqat flag yoqilganda (avval doim birinchi navbatda qo'yilardi)
    if getattr(settings, 'RESTAURANT_3D_LIBRARY_AUTO', False):
        from ar3d.services import auto_attach_library_3d
        ok, matched = auto_attach_library_3d(product, force=True, fallback_to_image=False)
        if ok and matched:
            messages.success(request, f"⚡ 3D model kutubxonadan topildi: {matched.name_uz}")
            return redirect('seller_product_edit_web', pk=pk)

    if not product.image:
        messages.error(request, "Avval taomga rasm yuklang — 3D model shu rasmdan yaratiladi.")
        return redirect('seller_product_edit_web', pk=pk)

    from ar3d.pipeline import queue_3d_generation
    queue_3d_generation(product, force=True)
    messages.success(request, "🧊 3D model navbatga qo'yildi — odatda bir daqiqa ichida tayyor bo'ladi.")
    return redirect('seller_product_edit_web', pk=pk)



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

        # Buyurtma raqami: noyob (avval float'ni kesishga urinib TypeError berardi va count() bilan to'qnashardi)
        from orders.creation import create_order

        total = 0
        order = create_order(
            shop=shop,
            customer_name=customer_name,
            customer_phone_1=customer_phone,
            delivery_address=address,
            total_amount=0,
            final_amount=0,
            status='pending',
            payment_status='pending',
            notes=note,
        )

        for pid, qty in zip(product_ids, quantities):
            try:
                p = Product.objects.get(pk=pid, shop=shop)
                q = max(int(qty or 1), 1)
                line_total = p.price * q
                OrderItem.objects.create(
                    order=order, product=p,
                    product_name=p.name, quantity=q,
                    price=p.price, unit=p.unit or 'dona', total=line_total,
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

        messages.success(request, f"Buyurtma #{order.order_number} yaratildi! ({int(total):,} so'm)".replace(',', ' '))
        return redirect('seller_order_detail_web', pk=order.pk)

    return render(request, 'seller/order_form.html', {
        'shop': shop,
        'products': products,
    })

