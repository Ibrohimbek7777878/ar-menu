import json
import math
import random
import uuid
from functools import wraps

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.http import require_POST
from django.http import HttpResponseForbidden, JsonResponse
from django.db import transaction
from django.db.models import Sum, Count, Q, Avg, F
from django.utils import timezone
from django.utils.text import slugify
from django.conf import settings as django_settings
from datetime import timedelta, datetime

from accounts.models import AdminUser, Customer
from backend.api_permissions import is_platform_admin
from categories.models import Category
from shops.models import Shop, ShopPage, SHOP_SECTION_TYPES
from products.ar_validation import ArModelError, validate_ar_model_form_value
from products.models import Product, ThreeDAsset, WishlistItem
from ai.marketing_service import generate_marketing_post
from notifications.telegram_bot import notify_new_product, send_message
from orders.models import Order, OrderItem, OrderStatusHistory
from payments.payment_service import create_order_payment
from payments.models import Payment
from payments.api_views import _provider_checkout_url
from couriers.models import Courier
from notifications.models import Banner, Promotion, Review, AppSetting, TelegramSubscriber


def _haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _get_public_settings():
    settings = {}
    for s in AppSetting.objects.all():
        settings[s.key] = s.value
    return settings


def _get_cart(request):
    return request.session.setdefault('cart', {})


def _save_cart(request, cart):
    request.session['cart'] = cart
    request.session.modified = True


def _order_number():
    from orders.numbering import next_order_number
    return next_order_number()


def platform_admin_required(view_func):
    """
    Umumiy (do'konlararo) resursni o'zgartiradigan eski HTML ko'rinishlar uchun: faqat platforma admini.
    Qoida kategoriya API'sidagi (`IsPlatformAdminOrReadOnly`) bilan AYNAN bir xil — `is_platform_admin`.
    `@login_required` dan keyin turadi: anonim — login sahifasiga, kirgan lekin ruxsatsiz xodim — 403.
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not is_platform_admin(request.user):
            return HttpResponseForbidden("Umumiy kategoriyani faqat platforma administratori o'zgartira oladi")
        return view_func(request, *args, **kwargs)
    return wrapper


def courier_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        courier_id = request.session.get('courier_id')
        if not courier_id:
            return redirect('courier_login')
        return view_func(request, *args, **kwargs)
    return wrapper


# ========================
# CUSTOMER PAGES
# ========================

def customer_home(request):
    user_lat = float(request.GET.get('lat', django_settings.MAP_DEFAULT_LAT))
    user_lng = float(request.GET.get('lng', django_settings.MAP_DEFAULT_LNG))

    shops_qs = Shop.objects.filter(is_open=True)
    for shop in shops_qs:
        if shop.latitude and shop.longitude:
            shop.distance = _haversine(user_lat, user_lng, shop.latitude, shop.longitude)
        else:
            shop.distance = 999
    shops_sorted = sorted(shops_qs, key=lambda x: x.distance)

    recent_orders = []
    phone = request.session.get('phone')
    if phone:
        customer = Customer.objects.filter(phone=phone).first()
        if customer:
            recent_orders = Order.objects.filter(customer=customer).order_by('-created_at')[:1]

    products = Product.objects.filter(is_available=True, is_featured=True).order_by('-rating')[:8]
    cheapest = Product.objects.filter(is_available=True, old_price__isnull=False).order_by('price')[:8]

    ctx = {
        'categories': Category.objects.filter(is_active=True).order_by('sort_order'),
        'shops': shops_sorted[:6],
        'products': products,
        'banners': Banner.objects.filter(is_active=True),
        'promotions': Promotion.objects.filter(is_active=True)[:4],
        'quick_buy_products': Product.objects.filter(is_available=True, is_featured=True).order_by('-reviews_count')[:6],
        'cheapest_products': cheapest,
        'recent_orders': recent_orders,
        'user_lat': user_lat,
        'user_lng': user_lng,
    }
    return render(request, 'customer/home.html', ctx)


def customer_search(request):
    q = request.GET.get('q', '').strip()
    products = Product.objects.filter(is_available=True)
    shops = Shop.objects.all()
    categories = Category.objects.filter(is_active=True)

    if q:
        products = products.filter(
            Q(name__icontains=q) | Q(brand__icontains=q) | Q(description__icontains=q) | Q(tags__icontains=q)
        )
        shops = shops.filter(Q(name__icontains=q) | Q(description__icontains=q))
        categories = categories.filter(Q(name__icontains=q))

    ctx = {
        'query': q,
        'products': products[:20],
        'shops': shops[:10],
        'categories': categories[:10],
    }
    return render(request, 'customer/search.html', ctx)


def customer_quick_buy(request):
    products = Product.objects.filter(
        is_available=True, is_featured=True
    ).order_by('-reviews_count')[:6]
    return render(request, 'customer/quick_buy.html', {'products': products})


def customer_nearby_stores(request):
    user_lat = float(request.GET.get('lat', django_settings.MAP_DEFAULT_LAT))
    user_lng = float(request.GET.get('lng', django_settings.MAP_DEFAULT_LNG))

    shops = Shop.objects.filter(is_open=True)
    for shop in shops:
        if shop.latitude and shop.longitude:
            shop.distance = _haversine(user_lat, user_lng, shop.latitude, shop.longitude)
        else:
            shop.distance = 999
    shops = sorted(shops, key=lambda x: x.distance)[:6]

    return render(request, 'customer/nearby_stores.html', {
        'shops': shops, 'user_lat': user_lat, 'user_lng': user_lng
    })


def customer_repeat_order(request):
    phone = request.GET.get('phone', '')
    orders = []
    if phone:
        customer = Customer.objects.filter(phone=phone).first()
        if customer:
            orders = Order.objects.filter(customer=customer).order_by('-created_at')[:1]
    return render(request, 'customer/repeat_order.html', {
        'orders': orders, 'phone': phone
    })


def customer_catalog(request):
    qs = Product.objects.filter(is_available=True)
    category_id = request.GET.get('category')
    if category_id:
        qs = qs.filter(category_id=category_id)
    q = request.GET.get('q', '').strip()
    if q:
        qs = qs.filter(Q(name__icontains=q) | Q(brand__icontains=q) | Q(description__icontains=q))
    sort = request.GET.get('sort', 'newest')
    if sort == 'price_asc':
        qs = qs.order_by('price')
    elif sort == 'price_desc':
        qs = qs.order_by('-price')
    elif sort == 'rating':
        qs = qs.order_by('-rating')
    else:
        qs = qs.order_by('-created_at')
    from django.core.paginator import Paginator
    paginator = Paginator(qs, 20)
    page = paginator.get_page(request.GET.get('page', 1))
    ctx = {
        'products': page,
        'categories': Category.objects.filter(is_active=True).order_by('sort_order'),
        'current_category': category_id,
        'query': q,
        'sort': sort,
    }
    return render(request, 'customer/catalog.html', ctx)


def _normalize_sections(sections):
    """Section dict'larida bo'sh kalitlarni oldindan qo'yish — template strict
    lookup (|default:section.icon) KeyError beramasligi uchun."""
    for sec in sections if isinstance(sections, list) else []:
        if isinstance(sec, dict):
            sec.setdefault('icon', '')
            sec.setdefault('accent_color', '')
            sec.setdefault('size', '')
            for it in (sec.get('items') or []):
                if isinstance(it, dict):
                    it.setdefault('icon', '')
                    it.setdefault('title', '')
                    it.setdefault('text', '')
    return sections


def customer_shop_detail(request, slug):
    shop = get_object_or_404(Shop, slug=slug)
    shop.views = (shop.views or 0) + 1
    shop.save(update_fields=['views'])
    qs = shop.products.filter(is_available=True)
    q = request.GET.get('q', '').strip()
    if q:
        qs = qs.filter(Q(name__icontains=q) | Q(brand__icontains=q) | Q(description__icontains=q))
    sort = request.GET.get('sort', 'default')
    if sort == 'price_asc':
        qs = qs.order_by('price')
    elif sort == 'price_desc':
        qs = qs.order_by('-price')
    elif sort == 'name':
        qs = qs.order_by('name')

    page = ShopPage.objects.filter(shop=shop).first()
    if page and page.is_published and page.layout:
        sections = page.layout
        template = page.template
    else:
        sections = ShopPage(shop=shop).default_layout()
        template = 'minimal'

    categories = Category.objects.all()[:16]
    reviews = Review.objects.filter(product__shop=shop).select_related('product', 'customer').order_by('-created_at')[:8]

    # Shablon ranglari — custom shablonlar ham slug orqali ishlaydi.
    # S1 (V15): ShopPage yo'q bo'lsa — biznes turiga mos shablon RANGLARI avtomatik
    # (shunda har do'kon sayt emas, o'z brendi ko'rinishida ochiladi).
    from shops.models import ShopTemplate
    tpl_obj = ShopTemplate.objects.filter(slug=template, is_active=True).first()
    if tpl_obj is None:
        from shops.business import BUSINESS_PRESETS
        sug = BUSINESS_PRESETS.get(shop.store_type, {}).get('suggested_template', 'grocery')
        tpl_obj = ShopTemplate.objects.filter(category=sug, is_active=True).order_by('sort_order').first()
    tpl_colors = tpl_obj.get_default_colors() if tpl_obj else {}

    _normalize_sections(sections)

    # Menyu joylashuvi — layout ichidagi {'type': 'menu', 'position': ...} dan
    menu_position = 'top'
    for _sec in sections:
        if isinstance(_sec, dict) and _sec.get('type') == 'menu':
            menu_position = _sec.get('position', 'top')
            break

    # S2 (V15): eng ko'p sotilgan + trend slaydlari
    from orders.models import OrderItem
    best_ids = list(OrderItem.objects.filter(order__shop=shop)
                    .values('product_id').annotate(q=__import__('django').db.models.Sum('quantity'))
                    .order_by('-q').values_list('product_id', flat=True)[:8])
    best_sellers = [p for pid in best_ids for p in [qs.filter(id=pid).first()] if p]
    trending = list(qs.order_by('-views', '-rating')[:8])
    trending = sorted(trending, key=lambda p: (not (getattr(p, 'is_hit', False) or getattr(p, 'is_new', False)),))[:8]
    flash_deals = list(qs.exclude(old_price__isnull=True).order_by('old_price')[:8])

    # QR stol: ?table=<qr_token> → mijoz stoldan menyuni ochdi
    table_info = None
    table_token = request.GET.get('table', '')
    if table_token:
        try:
            import uuid as _uuid
            from tables_restaurant.models import resolve_table_by_token
            _t = resolve_table_by_token(_uuid.UUID(table_token))
            if _t.shop_id == shop.id:
                table_info = {'number': _t.number, 'hall': _t.hall.name if _t.hall else '', 'token': str(_t.qr_token)}
        except Exception:
            table_info = None

    # Universal terminologiya: restoran "Menyu", qurilish "Katalog", go'zallik "Xizmatlar"...
    from shops.business import BUSINESS_PRESETS
    preset = BUSINESS_PRESETS.get(shop.store_type, BUSINESS_PRESETS['shop'])
    labels = preset.get('menu_label', {})
    menu_label = labels.get(getattr(request, 'language', 'uz'), labels.get('uz', 'Mahsulotlar'))

    ctx = {
        'shop': shop,
        'products': qs,
        'sections': sections,
        'template': template,
        'tpl_colors': tpl_colors,
        'menu_position': menu_position,
        'menu_label': menu_label,
        'table_info': table_info,
        'best_sellers': best_sellers, 'trending': trending, 'flash_deals': flash_deals,
        'categories': categories,
        'reviews': reviews,
        'query': q,
        'sort': sort,
    }
    return render(request, 'customer/shop_detail.html', ctx)


def customer_review_add(request, slug):
    product = get_object_or_404(Product, slug=slug)
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        phone = request.POST.get('phone', '').strip()
        rating = request.POST.get('rating', '')
        comment = request.POST.get('comment', '').strip()
        try:
            rating = int(rating)
        except (TypeError, ValueError):
            rating = 0
        if not name or not phone or rating < 1 or rating > 5:
            messages.error(request, 'Ism, telefon va baho (1-5) talab qilinadi')
        else:
            customer, _ = Customer.objects.get_or_create(
                phone=phone, defaults={'name': name}
            )
            Review.objects.create(
                product=product,
                customer=customer,
                rating=rating,
                comment=comment,
            )
            agg = product.reviews.aggregate(avg=Avg('rating'), cnt=Count('id'))
            product.rating = round(agg['avg'] or 0, 1)
            product.reviews_count = agg['cnt'] or 0
            product.save(update_fields=['rating', 'reviews_count'])
            messages.success(request, 'Sharhingiz uchun rahmat!')
    return redirect('customer_product', slug=product.slug)


def customer_product_detail(request, slug):
    product = get_object_or_404(Product, slug=slug)
    product.views = (product.views or 0) + 1
    product.save(update_fields=['views'])
    reviews = product.reviews.all()[:10]
    ctx = {'product': product, 'reviews': reviews}
    return render(request, 'customer/product_detail.html', ctx)


DEFAULT_AR_MODEL = '/media/products/dish_3d.glb'


def customer_product_ar(request, slug):
    product = get_object_or_404(Product, slug=slug)
    asset = getattr(product, 'asset_3d', None)
    glb = usdz = None
    if asset:
        if getattr(asset, 'glb_file', None):
            glb = asset.glb_file.url
        if getattr(asset, 'usdz_file', None):
            usdz = asset.usdz_file.url
    if not glb:
        m3d = getattr(product, 'model3d', None)
        if m3d:
            glb = (m3d.glb.url if m3d.glb else '') or (m3d.library.glb_url if m3d.library else '')
            if m3d.usdz:
                usdz = m3d.usdz.url
    if not glb:
        glb = product.ar_model or DEFAULT_AR_MODEL
    poster = ''
    if asset and getattr(asset, 'poster_image', None):
        poster = asset.poster_image.url
    elif product.image:
        poster = product.image.url
    ctx = {
        'product': product,
        'model_url': glb,
        'ios_src': usdz or '',
        'poster': poster,
    }
    return render(request, 'customer/product_ar.html', ctx)


def ar_catalog(request):
    """AR/3D mahsulotlar katalogi — /ar/.
    Yangi Guliston Warm Cream & Forest Green dizayndagi 3D / AR menyu ochiladi.
    """
    from web.tma_views import tma_ar_menu
    return tma_ar_menu(request)




def _cart_context(request):
    cart = _get_cart(request)
    items = []
    total = 0
    if not isinstance(cart, dict):
        return items, total

    for key, val in cart.items():
        if isinstance(val, dict):
            for product_id, item_data in val.items():
                product = Product.objects.filter(id=product_id).first()
                if not product:
                    continue
                qty = item_data.get('quantity', 1) if isinstance(item_data, dict) else item_data
                try:
                    qty = int(qty)
                except (ValueError, TypeError):
                    qty = 1
                line_total = int(product.price) * qty
                total += line_total
                items.append({
                    'id': product.id,
                    'product': product,
                    'quantity': qty,
                    'subtotal': line_total,
                })
        else:
            product = Product.objects.filter(id=key).first()
            if not product:
                continue
            try:
                qty = int(val)
            except (ValueError, TypeError):
                qty = 1
            line_total = int(product.price) * qty
            total += line_total
            items.append({
                'id': product.id,
                'product': product,
                'quantity': qty,
                'subtotal': line_total,
            })
    return items, total


def customer_cart(request):
    items, total = _cart_context(request)
    delivery_fee = 6000 if total > 0 else 0
    discount = 0
    for item in items:
        if item['product'].old_price:
            discount += (int(item['product'].old_price) - int(item['product'].price)) * item['quantity']
    return render(request, 'customer/cart.html', {
        'cart_items': items,
        'total': total,
        'delivery_fee': delivery_fee,
        'discount': discount,
        'subtotal': total,
    })


def customer_cart_add(request):
    if request.method == 'POST':
        product_id = None
        quantity = 1
        is_ajax = (
            request.headers.get('Content-Type') == 'application/json' or
            request.headers.get('Accept') == 'application/json' or
            request.headers.get('X-Requested-With') == 'XMLHttpRequest' or
            request.POST.get('ajax') == '1'
        )
        if request.content_type == 'application/json':
            import json
            try:
                data = json.loads(request.body.decode('utf-8'))
                product_id = data.get('product_id')
                quantity = int(data.get('quantity', 1) or 1)
            except Exception:
                pass
        if not product_id:
            product_id = request.POST.get('product_id')
            quantity = int(request.POST.get('quantity', 1) or 1)

        product = Product.objects.filter(id=product_id, is_available=True).first()
        if product:
            cart = _get_cart(request)
            cart[str(product.id)] = cart.get(str(product.id), 0) + max(1, quantity)
            _save_cart(request, cart)
            cart_count = sum(cart.values())
            if is_ajax:
                return JsonResponse({
                    'success': True,
                    'cart_count': cart_count,
                    'product_id': product.id,
                    'product_name': product.name,
                    'message': f"{product.name} savatga qo'shildi!"
                })
            messages.success(request, f"{product.name} savatga qo'shildi")
        else:
            if is_ajax:
                return JsonResponse({'success': False, 'error': 'Mahsulot topilmadi'}, status=404)
            messages.error(request, 'Mahsulot topilmadi')
    return redirect('customer_cart')


def customer_cart_repeat(request, order_id):
    order = Order.objects.filter(id=order_id).first()
    if order:
        cart = _get_cart(request)
        for item in order.items.all():
            pid = str(item.product.id) if item.product else None
            if pid:
                cart[pid] = cart.get(pid, 0) + item.quantity
        _save_cart(request, cart)
        return JsonResponse({'success': True, 'cart_count': sum(cart.values())})
    return JsonResponse({'success': False}, status=404)


def customer_cart_update(request):
    cart = _get_cart(request)
    try:
        data = json.loads(request.body or b'{}')
    except json.JSONDecodeError:
        data = request.POST
    item_id = str(data.get('item_id', ''))
    quantity = int(data.get('quantity', 1) or 1)
    if item_id in cart:
        if quantity <= 0:
            cart.pop(item_id, None)
        else:
            cart[item_id] = quantity
        _save_cart(request, cart)
        return JsonResponse({'ok': True, 'redirect': '/cart/'})
    return JsonResponse({'ok': False}, status=404)


def customer_cart_remove(request):
    cart = _get_cart(request)
    try:
        data = json.loads(request.body or b'{}')
    except json.JSONDecodeError:
        data = request.POST
    item_id = str(data.get('item_id', ''))
    if item_id in cart:
        cart.pop(item_id, None)
        _save_cart(request, cart)
        return JsonResponse({'ok': True, 'redirect': '/cart/'})
    return JsonResponse({'ok': False}, status=404)


def customer_checkout(request):
    if request.method != 'POST':
        return redirect('customer_cart')
    items, total = _cart_context(request)
    if not items:
        messages.error(request, 'Savatingiz bo\'sh')
        return redirect('customer_cart')

    name = request.POST.get('name', '').strip()
    phone = request.POST.get('phone', '').strip()
    address = request.POST.get('address', '').strip()
    notes = request.POST.get('notes', '').strip()
    def _safe_coord(value, lo, hi):
        try:
            v = float(value)
        except (TypeError, ValueError):
            return None
        return v if lo <= v <= hi else None
    lat_raw = request.POST.get('lat') or request.session.get('delivery_lat')
    lng_raw = request.POST.get('lng') or request.session.get('delivery_lng')
    acc_raw = request.POST.get('accuracy') or request.session.get('delivery_accuracy')
    lat = _safe_coord(lat_raw, -90, 90)
    lng = _safe_coord(lng_raw, -180, 180)
    accuracy = _safe_coord(acc_raw, 0, 100000)
    if (lat_raw or lng_raw) and (lat is None or lng is None):
        messages.error(request, 'Joylashuv noto\'g\'ri — iltimos qayta aniqlang yoki xaritada belgilang')
        return redirect('customer_cart')
    if not name or not phone or not address:
        messages.error(request, 'Iltimos barcha maydonlarni to\'ldiring')
        return redirect('customer_cart')

    shop = items[0]['product'].shop
    if not shop:
        messages.error(request, 'Do\'kon topilmadi')
        return redirect('customer_cart')

    # Inventory tekshirish
    from orders.inventory import get_available_stock
    for item in items:
        product = item['product']
        available = get_available_stock(product)
        if available < item['quantity']:
            messages.error(request, f'{product.name} uchun yetarli ombor yo\'q (mavjud: {available})')
            return redirect('customer_cart')

    delivery_fee = shop.delivery_fee
    if total >= shop.free_delivery_from:
        delivery_fee = 0

    customer, _ = Customer.objects.get_or_create(
        phone=phone, defaults={'name': name, 'address': address}
    )

    coupon_code = request.POST.get('coupon_code', '').strip().upper()
    discount_amount = 0
    used_coupon = None
    if coupon_code:
        from orders.models import Coupon
        coupon = Coupon.objects.filter(code=coupon_code, is_active=True).first()
        if coupon:
            valid, _ = coupon.is_valid(total)
            if valid:
                discount_amount = coupon.calculate_discount(total)
                used_coupon = coupon        # ishlatilgan deb buyurtma yaratilgach (tranzaksiya ichida, F() bilan) belgilanadi

    final_amount = max(0, total - discount_amount + delivery_fee)

    from orders.inventory import InsufficientStock, reserve_stock_or_raise
    try:
        with transaction.atomic():
            from orders.creation import create_order
            order = create_order(
                customer=customer,
                customer_name=name,
                customer_phone_1=phone,
                shop=shop,
                delivery_address=address,
                delivery_lat=lat,
                delivery_lng=lng,
                delivery_accuracy=accuracy,
                notes=notes,
                total_amount=total,
                discount_amount=discount_amount,
                coupon_code=coupon_code,
                delivery_fee=delivery_fee,
                final_amount=final_amount,
                status='pending',
            )
            for item in items:
                product = item['product']
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    product_name=product.name,
                    price=product.price,
                    quantity=item['quantity'],
                    unit=product.unit or 'dona',
                    total=item['subtotal'],
                )
            OrderStatusHistory.objects.create(
                order=order, status='pending', note='Buyurtma yaratildi'
            )

            # Inventory zaxiralash (yetmasa butun buyurtma qaytariladi)
            reserve_stock_or_raise(order, timeout_minutes=15)

            if used_coupon:
                from orders.models import Coupon
                Coupon.objects.filter(pk=used_coupon.pk).update(times_used=F('times_used') + 1)

    except InsufficientStock as exc:
        messages.error(request, str(exc))
        return redirect('customer_cart')

    # Analytics event
    try:
        from orders.analytics import track_event
        track_event('order_created', request=request,
                   user_id=customer.id if customer else None,
                   shop_id=shop.id, order_id=order.id)
    except Exception:
        pass

    customer.total_orders += 1
    customer.total_spent = (customer.total_spent or 0) + order.final_amount
    customer.last_order_at = timezone.now()
    customer.save()

    # Telegram bildirishnoma
    try:
        from notifications.services.telegram_service import send_order_created
        send_order_created(order)
    except Exception:
        pass

    request.session['cart'] = {}
    request.session.modified = True

    method = (request.POST.get('payment_method') or 'cash').lower()
    if method == 'cash':
        messages.success(request, f'Buyurtma #{order.order_number} qabul qilindi! (Naqd pul — yetkazishda to\'lanadi)')
        return redirect('customer_orders')

    return_url = request.build_absolute_uri('/orders/')
    pay = create_order_payment(order, method, return_url)
    if not pay.get('success'):
        messages.error(request, 'To\'lov yaratilmadi: ' + pay.get('error', 'Xatolik'))
        return redirect('customer_cart')

    payment = Payment.objects.filter(order=order).order_by('-created_at').first()
    if payment:
        payment_url = _provider_checkout_url(method, payment, order)
        payment.payment_url = payment_url
        payment.save(update_fields=['payment_url'])
        messages.success(request, f'Buyurtma #{order.order_number} qabul qilindi! To\'lov sahifasiga o\'tyapmiz...')
        return redirect(payment_url)

    messages.success(request, f'Buyurtma #{order.order_number} qabul qilindi!')
    return redirect('customer_orders')


def customer_orders(request):
    if getattr(django_settings, 'PRODUCT', 'retail') == 'restaurant':
        from . import tma_views
        return tma_views.tma_orders(request)

    phone = request.GET.get('phone', '')
    orders = []
    if phone:
        orders = Order.objects.filter(
            Q(customer_phone_1=phone) | Q(customer_phone_2=phone) | Q(customer_phone_3=phone)
        ).order_by('-created_at')[:50]
        payable_ids = set(Payment.objects.filter(
            order_id__in=[o.id for o in orders],
            status__in=PAYABLE_PAYMENT_STATUSES,
        ).values_list('order_id', flat=True))
        for o in orders:
            o.can_pay = o.id in payable_ids
    ctx = {'orders': orders, 'lookup_phone': phone}
    return render(request, 'customer/orders.html', ctx)


def customer_order_tracking(request, pk):
    order = get_object_or_404(Order, pk=pk)
    history = order.history.all()
    can_pay = Payment.objects.filter(
        order=order, status__in=PAYABLE_PAYMENT_STATUSES
    ).exists()
    return render(request, 'customer/order_tracking.html', {
        'order': order, 'history': history, 'can_pay': can_pay
    })


PAYABLE_PAYMENT_STATUSES = ['created', 'pending', 'failed']


def customer_order_pay(request, pk):
    order = get_object_or_404(Order, pk=pk)
    payment = Payment.objects.filter(
        order=order, status__in=PAYABLE_PAYMENT_STATUSES
    ).order_by('-created_at').first()
    if not payment:
        messages.error(request, 'Bu buyurtma uchun to\'lov topilmadi')
        return redirect('customer_order_tracking', pk=pk)
    url = _provider_checkout_url(payment.provider, payment, order)
    payment.payment_url = url
    payment.save(update_fields=['payment_url'])
    return redirect(url)


def customer_profile(request):
    """Foydalanuvchi profili — ism, manzil, parol, til, statistika."""
    phone = request.session.get('phone')
    customer = None
    orders = []
    if phone:
        customer = Customer.objects.filter(phone=phone).first()
        if customer:
            orders = Order.objects.filter(customer=customer).order_by('-created_at')[:5]

    if request.method == 'POST' and customer:
        action = request.POST.get('action', 'update_profile')

        if action == 'change_password':
            old_pw = request.POST.get('old_password', '')
            new_pw = request.POST.get('new_password', '')
            new_pw2 = request.POST.get('new_password_confirm', '')
            if not customer.check_password(old_pw):
                messages.error(request, 'Eski parol noto\'g\'ri.')
            elif len(new_pw) < 6:
                messages.error(request, 'Yangi parol kamida 6 belgidan iborat bo\'lishi kerak.')
            elif new_pw != new_pw2:
                messages.error(request, 'Yangi parollar mos kelmadi.')
            else:
                customer.set_password(new_pw)
                customer.save()
                messages.success(request, 'Parol muvaffaqiyatli o\'zgartirildi!')
            return redirect('customer_profile')

        # Profil yangilash
        name = request.POST.get('name', '').strip()
        address = request.POST.get('address', '').strip()
        email = request.POST.get('email', '').strip()
        lang = request.POST.get('language', '').strip()
        if name:
            customer.name = name
        if address:
            customer.address = address
        if email:
            customer.email = email
        customer.save()
        if lang in ('uz', 'ru', 'en'):
            request.session['language'] = lang
            from django.utils import translation
            translation.activate(lang)
        messages.success(request, 'Profil yangilandi!')
        return redirect('customer_profile')

    # Statistika
    stats = None
    if customer:
        from django.db.models import Sum
        stats = {
            'total_orders': Order.objects.filter(customer=customer).count(),
            'total_spent': Order.objects.filter(customer=customer)
                .exclude(status__in=['cancelled', 'failed'])
                .aggregate(s=Sum('final_amount'))['s'] or 0,
            'joined': customer.created_at,
        }

    return render(request, 'customer/profile.html', {
        'customer': customer,
        'orders': orders,
        'phone': phone,
        'stats': stats,
        'current_lang': request.session.get('language', 'uz'),
    })


def customer_wishlist(request):
    """Sevimlilar ro'yxati (raqobatchilardan: Uzum/Olcha wishlist)."""
    phone = request.session.get('phone')
    customer = Customer.objects.filter(phone=phone).first() if phone else None
    items = []
    if customer:
        items = (WishlistItem.objects.filter(customer=customer)
                 .select_related('product', 'product__shop')
                 .order_by('-created_at'))
    if request.method == 'POST' and customer:
        action = request.POST.get('action')
        product_id = request.POST.get('product_id')
        if action == 'add' and product_id:
            product = Product.objects.filter(pk=product_id).first()
            if product:
                WishlistItem.objects.get_or_create(customer=customer, product=product)
                messages.success(request, 'Sevimlilarga qo\'shildi ♥')
        elif action == 'remove' and product_id:
            WishlistItem.objects.filter(customer=customer, product_id=product_id).delete()
            messages.success(request, 'Sevimlilardan o\'chirildi')
        return redirect('customer_wishlist')
    return render(request, 'customer/wishlist.html', {
        'customer': customer,
        'items': items,
    })


def customer_wishlist_toggle(request):
    """AJAX/POST orqali sevimliga qo'shish/o'chirish (mahsulot kartasidagi ♥)."""
    if request.method != 'POST':
        return redirect('customer_catalog')
    phone = request.session.get('phone')
    customer = Customer.objects.filter(phone=phone).first() if phone else None
    product_id = request.POST.get('product_id')
    if not customer or not product_id:
        return redirect('customer_login')
    product = Product.objects.filter(pk=product_id).first()
    if not product:
        return redirect('customer_catalog')
    item, created = WishlistItem.objects.get_or_create(customer=customer, product=product)
    if not created:
        item.delete()
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        from django.http import JsonResponse
        return JsonResponse({'status': 'added' if created else 'removed'})
    return redirect(request.META.get('HTTP_REFERER', 'customer_catalog'))



def customer_register(request):
    """Oddiy foydalanuvchi (xaridor) ro'yxatdan o'tish — global marketplace uchun."""
    if request.session.get('phone'):
        return redirect('customer_profile')
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        phone = request.POST.get('phone', '').strip()
        password = request.POST.get('password', '').strip()
        if not name or not phone or not password:
            messages.error(request, "Barcha maydonlarni to'ldiring.")
        elif Customer.objects.filter(phone=phone).exists():
            messages.error(request, 'Bu telefon allaqachon ro\'yxatdan o\'tgan.')
        else:
            customer = Customer(phone=phone, name=name)
            customer.set_password(password)
            customer.save()
            request.session['phone'] = phone
            messages.success(request, "Ro'yxatdan o'tdingiz! Xush kelibsiz!")
            return redirect('customer_profile')
    return render(request, 'customer/register.html')


def customer_login(request):
    """Oddiy foydalanuvchi kirishi — telefon + parol."""
    if request.session.get('phone'):
        return redirect('customer_profile')
    if request.method == 'POST':
        from django.core.cache import cache
        from backend.ratelimit import client_ip
        ip = client_ip(request)
        cache_key = f"cust_login_attempts_{ip}"
        attempts = cache.get(cache_key, 0)
        if attempts >= 7:
            messages.error(request, "Xavfsizlik: Ko'p marotaba xato urinish bo'ldi. Iltimos 5 daqiqadan so'ng qayta urinib ko'ring.")
            return render(request, 'customer/login.html')

        phone = request.POST.get('phone', '').strip()
        password = request.POST.get('password', '').strip()
        customer = Customer.objects.filter(phone=phone).first()
        if customer and customer.check_password(password):
            cache.delete(cache_key)
            request.session['phone'] = phone
            messages.success(request, f"Xush kelibsiz, {customer.name}!")
            return redirect('customer_profile')
        cache.set(cache_key, attempts + 1, timeout=300)
        messages.error(request, 'Telefon yoki parol xato.')
    return render(request, 'customer/login.html')


def customer_logout(request):
    request.session.pop('phone', None)
    messages.success(request, 'Chiqdingiz.')
    return redirect('customer_home')


# ========================
# ADMIN PAGES
# ========================

def _role_redirect(user):
    role = getattr(user, 'role', '')
    if role in ('shop_owner', 'shop_manager'):
        from django.http import HttpResponseRedirect
        return HttpResponseRedirect('/seller/')
    elif role == 'waiter':
        from django.http import HttpResponseRedirect
        return HttpResponseRedirect('/seller/waiter/')
    return redirect('admin_dashboard')


def web_login(request):
    """Admin panel — faqat super_admin + alohida panel paroli."""
    from django.conf import settings
    if request.GET.get('switch') == '1' or request.GET.get('logout') == '1':
        logout(request)
        messages.info(request, "Hisobdan chiqdingiz. Admin hisobingiz bilan kiring.")
    elif request.user.is_authenticated:
        return _role_redirect(request.user)

    if request.method == 'POST':
        from backend import login_guard
        username = request.POST.get('username', '').strip()
        if login_guard.is_locked(request, username):
            messages.error(request, login_guard.LOCK_MESSAGE)
            return render(request, 'admin/login.html')

        password = request.POST.get('password', '').strip()
        user = authenticate(request, username=username, password=password)
        if not user or not user.is_approved:
            login_guard.record_failure(request, username, scope='admin')
            messages.error(request, 'Login yoki parol xato yoki hisob tasdiqlanmagan.')
        elif getattr(user, 'role', '') != 'super_admin' and not getattr(user, 'is_superuser', False):
            login_guard.record_failure(request, username, scope='admin')
            messages.error(request, 'Ushbu hisob super-admin emas. Sotuvchi bo\'lsangiz — quyidagi "Sotuvchi kabineti" havolasi orqali kiring.')
        else:
            login_guard.record_success(request, username, user, scope='admin')
            login(request, user)
            return redirect('admin_dashboard')
    return render(request, 'admin/login.html')


def web_register(request):
    # Eski /admin/register/ — endi sotuvchi uchun /seller/register/ ga yo'naltiriladi
    return redirect('seller_register')


@login_required(login_url='web_login')
def admin_dashboard(request):
    user = request.user
    is_super = getattr(user, 'role', '') == 'super_admin'
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)

    shops = Shop.objects.all() if is_super else Shop.objects.filter(owner=user)
    shop_ids = list(shops.values_list('id', flat=True))

    today_orders = Order.objects.filter(created_at__gte=today_start)
    week_orders = Order.objects.filter(created_at__gte=week_start)
    if not is_super:
        today_orders = today_orders.filter(shop_id__in=shop_ids)
        week_orders = week_orders.filter(shop_id__in=shop_ids)

    # 7-kunlik daromad (mini chart)
    series = []
    max_rev = 1
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).date()
        ds = timezone.datetime(day.year, day.month, day.day, tzinfo=timezone.get_current_timezone())
        de = ds + timedelta(days=1)
        rev = week_orders.filter(created_at__gte=ds, created_at__lt=de).exclude(
            status__in=['cancelled', 'failed']).aggregate(s=Sum('final_amount'))['s'] or 0
        rev = float(rev)
        max_rev = max(max_rev, rev)
        series.append({'label': day.strftime('%a'), 'rev': rev, 'pct': 0})

    for s in series:
        s['pct'] = int((s['rev'] / max_rev) * 100) if max_rev else 0

    avg_rating = Product.objects.aggregate(a=Avg('rating'))['a'] or 0
    tg_subs = TelegramSubscriber.objects.filter(is_active=True).count()

    ctx = {
        'stats': {
            'total_shops': shops.count(),
            'total_products': Product.objects.filter(shop_id__in=shop_ids).count() if not is_super else Product.objects.count(),
            'total_orders': Order.objects.count() if is_super else Order.objects.filter(shop_id__in=shop_ids).count(),
            'total_customers': Customer.objects.count(),
            'today_orders': today_orders.count(),
            'today_revenue': today_orders.exclude(status__in=['cancelled', 'failed']).aggregate(s=Sum('final_amount'))['s'] or 0,
            'week_revenue': week_orders.exclude(status__in=['cancelled', 'failed']).aggregate(s=Sum('final_amount'))['s'] or 0,
            'avg_rating': round(avg_rating, 1),
            'tg_subscribers': tg_subs,
            'total_ar_models': Product.objects.filter(has_3d=True).count() if is_super else Product.objects.filter(shop_id__in=shop_ids, has_3d=True).count(),
        },
        'revenue_series': series,
        'max_rev': max_rev,
        'now': now,
        'recent_orders': (week_orders if is_super else week_orders).order_by('-created_at')[:10],
        'quick_links': [
            {'label': 'Do\'kon yaratish', 'url': 'admin_shop_create', 'icon': 'storefront'},
            {'label': 'Mahsulot qo\'shish', 'url': 'admin_product_create', 'icon': 'inventory_2'},
            {'label': 'AR / 3D Boshqaruv', 'url': 'admin_ar', 'icon': 'view_in_ar'},
            {'label': 'AI Marketing', 'url': 'admin_ai_marketing', 'icon': 'auto_awesome'},
            {'label': 'Telegram', 'url': 'admin_telegram', 'icon': 'send'},
            {'label': 'Analitika', 'url': 'admin_analytics', 'icon': 'insights'},
            {'label': 'Buyurtmalar', 'url': 'admin_orders', 'icon': 'receipt_long'},
        ],
    }
    return render(request, 'admin/dashboard.html', ctx)


@login_required(login_url='web_login')
def admin_shops(request):
    return render(request, 'admin/shops.html', {'shops': Shop.objects.all()})


@login_required(login_url='web_login')
def admin_analytics(request):
    user = request.user
    is_super = getattr(user, 'role', '') == 'super_admin'
    try:
        days = int(request.GET.get('days', 30))
    except (ValueError, TypeError):
        days = 30
    if days not in (7, 14, 30, 90):
        days = 30
    start = timezone.now() - timedelta(days=days)

    shops = Shop.objects.all() if is_super else Shop.objects.filter(owner=user)
    shop_ids = list(shops.values_list('id', flat=True))

    orders_qs = Order.objects.filter(created_at__gte=start)
    if not is_super:
        orders_qs = orders_qs.filter(shop_id__in=shop_ids)

    paid_qs = orders_qs.exclude(status__in=['cancelled', 'failed'])
    total_revenue = paid_qs.aggregate(s=Sum('final_amount'))['s'] or 0
    total_orders = paid_qs.count()
    avg_check = (total_revenue / total_orders) if total_orders else 0

    # Daily revenue series
    series = []
    for i in range(days - 1, -1, -1):
        day = (timezone.now() - timedelta(days=i)).date()
        day_start = timezone.datetime(day.year, day.month, day.day, tzinfo=timezone.get_current_timezone())
        day_end = day_start + timedelta(days=1)
        rev = orders_qs.filter(
            created_at__gte=day_start, created_at__lt=day_end
        ).exclude(status__in=['cancelled', 'failed']).aggregate(s=Sum('final_amount'))['s'] or 0
        series.append({'date': day.strftime('%d.%m'), 'revenue': float(rev)})
    max_rev = max((d['revenue'] for d in series), default=1) or 1

    # Top products
    top_products = (
        OrderItem.objects.filter(order__in=paid_qs)
        .values('product_name')
        .annotate(rev=Sum('total'), qty=Sum('quantity'))
        .order_by('-rev')[:8]
    )

    # Payment breakdown
    pay_breakdown = (
        Payment.objects.filter(created_at__gte=start, status='paid')
        .values('provider')
        .annotate(count=Count('id'), sum=Sum('amount'))
        .order_by('-sum')
    )

    ctx = {
        'days': days,
        'day_choices': [7, 14, 30, 90],
        'kpi': {
            'revenue': total_revenue,
            'orders': total_orders,
            'avg_check': avg_check,
            'shops': shops.count(),
        },
        'series': series,
        'max_rev': max_rev,
        'top_products': top_products,
        'pay_breakdown': pay_breakdown,
    }
    return render(request, 'admin/analytics.html', ctx)


@login_required(login_url='web_login')
def admin_shop_builder(request, shop_id):
    user = request.user
    is_super = getattr(user, 'role', '') == 'super_admin'
    shop = get_object_or_404(Shop, id=shop_id)
    if not is_super and shop.owner != user:
        messages.error(request, 'Ruxsat yo\'q')
        return redirect('admin_shops')
    page, _ = ShopPage.objects.get_or_create(shop=shop)

    if request.method == 'POST':
        action = request.POST.get('action')
        layout = list(page.layout or [])
        if action == 'template':
            page.template = request.POST.get('template', page.template)
            page.save(update_fields=['template'])
            messages.success(request, 'Shablon saqlandi')
        elif action == 'add':
            try:
                limit = int(request.POST.get('limit', 12) or 12)
            except (TypeError, ValueError):
                limit = 12
            layout.append({
                'type': request.POST.get('type', 'hero'),
                'title': request.POST.get('title', ''),
                'subtitle': request.POST.get('subtitle', ''),
                'text': request.POST.get('text', ''),
                'image': request.POST.get('image', ''),
                'product_filter': request.POST.get('product_filter', ''),
                'limit': limit,
            })
            page.layout = layout
            page.save(update_fields=['layout'])
            messages.success(request, 'Sektsiya qo\'shildi')
        elif action in ('up', 'down'):
            try:
                idx = int(request.POST.get('index', -1))
                swap = idx - 1 if action == 'up' else idx + 1
                if 0 <= idx < len(layout) and 0 <= swap < len(layout):
                    layout[idx], layout[swap] = layout[swap], layout[idx]
                    page.layout = layout
                    page.save(update_fields=['layout'])
            except (TypeError, ValueError):
                pass
        elif action == 'delete':
            try:
                idx = int(request.POST.get('index', -1))
                if 0 <= idx < len(layout):
                    layout.pop(idx)
                    page.layout = layout
                    page.save(update_fields=['layout'])
            except (TypeError, ValueError):
                pass
        elif action == 'publish':
            page.is_published = request.POST.get('is_published') == 'on'
            page.save(update_fields=['is_published'])
            messages.success(request, 'Sahifa holati yangilandi')
        return redirect('admin_shop_builder', shop_id=shop.id)

    ctx = {
        'shop': shop,
        'page': page,
        'sections': page.layout or [],
        'section_types': SHOP_SECTION_TYPES,
    }
    return render(request, 'admin/shop_builder.html', ctx)


@login_required(login_url='web_login')
def admin_shop_create(request):
    is_super = getattr(request.user, 'role', '') == 'super_admin'
    if request.method == 'POST':
        shop = Shop()
        shop.owner = request.user
        shop.name = request.POST.get('name', '')
        shop.slug = slugify(shop.name, allow_unicode=True)
        shop.description = request.POST.get('description', '')
        shop.address = request.POST.get('address', '')
        shop.phone = request.POST.get('phone', '')
        shop.phone2 = request.POST.get('phone2', '')
        try:
            shop.latitude = float(request.POST.get('latitude', 0) or 0)
            shop.longitude = float(request.POST.get('longitude', 0) or 0)
        except ValueError:
            shop.latitude, shop.longitude = 0, 0
        shop.category_id = request.POST.get('category') or None
        shop.working_hours = request.POST.get('working_hours', '08:00-22:00')
        shop.working_days = request.POST.get('working_days', 'Dush-Shan')
        shop.is_open = request.POST.get('is_open') == 'on'
        shop.is_featured = request.POST.get('is_featured') == 'on'
        shop.is_fast_delivery = request.POST.get('is_fast_delivery') == 'on'
        try:
            shop.min_order = int(request.POST.get('min_order', 20000) or 20000)
            shop.delivery_fee = int(request.POST.get('delivery_fee', 6000) or 6000)
            shop.free_delivery_from = int(request.POST.get('free_delivery_from', 50000) or 50000)
        except ValueError:
            shop.min_order, shop.delivery_fee, shop.free_delivery_from = 20000, 6000, 50000
        if request.FILES.get('image'):
            shop.image = request.FILES['image']
        if not Shop.objects.filter(slug=shop.slug).exists():
            shop.save()
            messages.success(request, "Do'kon yaratildi")
            return redirect('admin_shops')
        messages.error(request, 'Bunday nomli do\'kon allaqachon mavjud')
    ctx = {'categories': Category.objects.all(), 'shops': Shop.objects.all(), 'is_super': is_super}
    return render(request, 'admin/shop_form.html', ctx)


@login_required(login_url='web_login')
def admin_shop_edit(request, pk):
    is_super = getattr(request.user, 'role', '') == 'super_admin'
    shop = get_object_or_404(Shop, pk=pk)
    if not is_super and shop.owner_id != request.user.id:
        return redirect('admin_shops')
    if request.method == 'POST':
        shop.name = request.POST.get('name', shop.name)
        shop.description = request.POST.get('description', '')
        shop.address = request.POST.get('address', '')
        shop.phone = request.POST.get('phone', '')
        shop.phone2 = request.POST.get('phone2', '')
        try:
            shop.latitude = float(request.POST.get('latitude', 0) or 0)
            shop.longitude = float(request.POST.get('longitude', 0) or 0)
        except ValueError:
            shop.latitude, shop.longitude = 0, 0
        shop.category_id = request.POST.get('category') or None
        shop.working_hours = request.POST.get('working_hours', '08:00-22:00')
        shop.working_days = request.POST.get('working_days', 'Dush-Shan')
        shop.is_open = request.POST.get('is_open') == 'on'
        shop.is_featured = request.POST.get('is_featured') == 'on'
        shop.is_fast_delivery = request.POST.get('is_fast_delivery') == 'on'
        try:
            shop.min_order = int(request.POST.get('min_order', 20000) or 20000)
            shop.delivery_fee = int(request.POST.get('delivery_fee', 6000) or 6000)
            shop.free_delivery_from = int(request.POST.get('free_delivery_from', 50000) or 50000)
        except ValueError:
            shop.min_order, shop.delivery_fee, shop.free_delivery_from = 20000, 6000, 50000
        if request.FILES.get('image'):
            shop.image = request.FILES['image']
        shop.save()
        messages.success(request, "Do'kon yangilandi")
        return redirect('admin_shops')
    ctx = {'shop': shop, 'categories': Category.objects.all()}
    return render(request, 'admin/shop_form.html', ctx)


@login_required(login_url='web_login')
def admin_shop_delete(request, pk):
    shop = get_object_or_404(Shop, pk=pk)
    shop.is_active = False
    shop.save(update_fields=['is_active'])
    messages.success(request, "Do'kon o'chirildi (yashirildi)")
    return redirect('admin_shops')


@login_required(login_url='web_login')
def admin_products(request):
    qs = Product.objects.all()
    cat = request.GET.get('category')
    if cat:
        qs = qs.filter(category_id=cat)
    return render(request, 'admin/products.html', {
        'products': qs,
        'categories': Category.objects.filter(is_active=True),
    })


def _handle_asset_3d(product, request):
    """Mahsulot uchun GLB/USDZ/poster yuklansa ThreeDAsset ni yarat/yangila."""
    glb = request.FILES.get('glb_file')
    usdz = request.FILES.get('usdz_file')
    poster = request.FILES.get('poster_image')
    if not (glb or usdz or poster):
        return
    asset, _ = ThreeDAsset.objects.get_or_create(product=product)
    if glb:
        asset.glb_file = glb
    if usdz:
        asset.usdz_file = usdz
    if poster:
        asset.poster_image = poster
    asset.save()


@login_required(login_url='web_login')
def admin_product_create(request):
    is_super = getattr(request.user, 'role', '') == 'super_admin'
    allowed_shops = Shop.objects.all() if is_super else Shop.objects.filter(owner=request.user)
    if request.method == 'POST':
        if not is_super and not allowed_shops.exists():
            messages.error(request, "Avval o'z do'koningizni yarating")
            return redirect('admin_shops')
        product = Product()
        if not is_super:
            shop_id = request.POST.get('shop')
            if shop_id and allowed_shops.filter(id=shop_id).exists():
                product.shop_id = shop_id
            else:
                product.shop_id = allowed_shops.first().id
        else:
            product.shop_id = request.POST.get('shop') or None
        product.category_id = request.POST.get('category') or None
        product.name = request.POST.get('name', '')
        product.slug = slugify(product.name, allow_unicode=True)
        product.description = request.POST.get('description', '')
        try:
            product.price = int(request.POST.get('price', 0) or 0)
        except ValueError:
            product.price = 0
        old_price = request.POST.get('old_price', '').strip()
        try:
            product.old_price = int(old_price) if old_price else None
        except ValueError:
            product.old_price = None
        product.unit = request.POST.get('unit', 'dona')
        try:
            product.stock = int(request.POST.get('stock', 0) or 0)
        except ValueError:
            product.stock = 0
        product.brand = request.POST.get('brand', '')
        product.barcode = request.POST.get('barcode', '')
        product.tags = request.POST.get('tags', '')
        # 3D model manzili API'dagi bilan bir xil qoida bo'yicha tekshiriladi (javascript:/data:/ichki manzil/noto'g'ri fayl rad etiladi)
        ar_error = None
        try:
            product.ar_model = validate_ar_model_form_value(request.POST.get('ar_model'))
        except ArModelError as exc:
            ar_error = str(exc)
        product.is_available = request.POST.get('is_available') == 'on'
        product.is_organic = request.POST.get('is_organic') == 'on'
        product.is_halal = request.POST.get('is_halal') == 'on'
        product.is_featured = request.POST.get('is_featured') == 'on'
        if request.FILES.get('image'):
            product.image = request.FILES['image']
        if request.FILES.get('image2'):
            product.image2 = request.FILES['image2']
        if request.FILES.get('image3'):
            product.image3 = request.FILES['image3']
        if not product.shop_id:
            messages.error(request, 'Do\'konni tanlang')
        elif not product.name:
            messages.error(request, 'Mahsulot nomini kiriting')
        elif ar_error:
            messages.error(request, ar_error)
        elif Product.all_objects.filter(slug=product.slug).exists():
            messages.error(request, 'Bunday nomli mahsulot allaqachon mavjud')
        else:
            product.save()
            _handle_asset_3d(product, request)
            messages.success(request, 'Mahsulot yaratildi')
            # Yangi mahsulot → Telegram obunachilarga 3 ta marketing xabari
            try:
                from notifications.models import TelegramSubscriber
                if TelegramSubscriber.objects.filter(is_active=True).exists():
                    notify_new_product(product)
            except Exception:
                pass
            return redirect('admin_products')
    ctx = {'shops': allowed_shops, 'categories': Category.objects.all(), 'is_super': is_super}
    return render(request, 'admin/product_form.html', ctx)


@login_required(login_url='web_login')
def admin_product_edit(request, pk):
    is_super = getattr(request.user, 'role', '') == 'super_admin'
    allowed_shops = Shop.objects.all() if is_super else Shop.objects.filter(owner=request.user)
    product = get_object_or_404(Product, pk=pk)
    if not is_super and (not product.shop or product.shop.owner_id != request.user.id):
        return redirect('admin_products')
    if request.method == 'POST':
        if not is_super:
            shop_id = request.POST.get('shop')
            if shop_id and allowed_shops.filter(id=shop_id).exists():
                product.shop_id = shop_id
            # else keep current shop
        else:
            product.shop_id = request.POST.get('shop') or product.shop_id
        product.category_id = request.POST.get('category') or None
        product.name = request.POST.get('name', product.name)
        product.description = request.POST.get('description', '')
        try:
            product.price = int(request.POST.get('price', product.price) or product.price)
        except ValueError:
            pass
        old_price = request.POST.get('old_price', '').strip()
        try:
            product.old_price = int(old_price) if old_price else None
        except ValueError:
            pass
        product.unit = request.POST.get('unit', 'dona')
        try:
            product.stock = int(request.POST.get('stock', product.stock) or product.stock)
        except ValueError:
            pass
        product.brand = request.POST.get('brand', '')
        product.barcode = request.POST.get('barcode', '')
        product.tags = request.POST.get('tags', '')
        # 3D model manzili API'dagi bilan bir xil qoida bo'yicha tekshiriladi; yaroqsiz bo'lsa hech narsa saqlanmaydi
        ar_error = None
        try:
            product.ar_model = validate_ar_model_form_value(request.POST.get('ar_model'), product.ar_model)
        except ArModelError as exc:
            ar_error = str(exc)
            product.ar_model = (request.POST.get('ar_model') or '').strip() or None   # forma yozilgan qiymat bilan qayta ko'rsatiladi
        product.is_available = request.POST.get('is_available') == 'on'
        product.is_organic = request.POST.get('is_organic') == 'on'
        product.is_halal = request.POST.get('is_halal') == 'on'
        product.is_featured = request.POST.get('is_featured') == 'on'
        if request.FILES.get('image'):
            product.image = request.FILES['image']
        if request.FILES.get('image2'):
            product.image2 = request.FILES['image2']
        if request.FILES.get('image3'):
            product.image3 = request.FILES['image3']
        if ar_error:
            messages.error(request, ar_error)
        else:
            product.save()
            _handle_asset_3d(product, request)
            messages.success(request, 'Mahsulot yangilandi')
            return redirect('admin_products')
    ctx = {'product': product, 'shops': allowed_shops, 'categories': Category.objects.all()}
    return render(request, 'admin/product_form.html', ctx)


@login_required(login_url='web_login')
def admin_ar(request):
    """Asosiy Admin AR / 3D Boshqaruv Konsoli — barcha do'konlar tovarlariga 3D biriktirish,
    global kutubxonani boshqarish va AR tahlillari."""
    user = request.user
    if getattr(user, 'role', '') != 'super_admin' and not getattr(user, 'is_superuser', False):
        from django.http import HttpResponseRedirect
        return HttpResponseRedirect('/seller/ar/')

    from ar3d.models import ProductLibrary, Product3DModel, ARView
    from ar3d.services import auto_attach_library_3d
    from django.core.files.storage import default_storage

    # POST Harakatlari
    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'attach_library':
            product_id = request.POST.get('product_id')
            library_id = request.POST.get('library_id')
            try:
                p = Product.objects.get(pk=product_id)
                lib = ProductLibrary.objects.get(pk=library_id)
                p.ar_model = lib.glb_url
                p.has_3d = bool(lib.glb_url)
                p.save(update_fields=['ar_model', 'has_3d'])
                Product3DModel.objects.update_or_create(
                    product=p,
                    defaults={'library': lib, 'status': 'ready', 'source': f'library:{lib.key}', 'real_size_cm': lib.real_size_cm}
                )
                ProductLibrary.objects.filter(pk=lib.pk).update(used_by_count=F('used_by_count') + 1)
                messages.success(request, f"'{p.name}' ga '{lib.name_uz}' 3D modeli muvaffaqiyatli biriktirildi!")
            except Exception as e:
                messages.error(request, f"Biriktirishda xatolik: {e}")

        elif action == 'remove_ar':
            product_id = request.POST.get('product_id')
            try:
                p = Product.objects.get(pk=product_id)
                p.ar_model = None
                p.has_3d = False
                p.save(update_fields=['ar_model', 'has_3d'])
                Product3DModel.objects.filter(product=p).delete()
                messages.success(request, f"'{p.name}' dan 3D model o'chirildi.")
            except Exception as e:
                messages.error(request, f"O'chirishda xatolik: {e}")

        elif action == 'batch_auto_match':
            from django.db.models import Q
            from ar3d.services import auto_attach_library_3d, seed_product_library
            seed_product_library()

            attached_count = 0
            prods = Product.objects.filter(
                Q(has_3d=False) | Q(ar_model__isnull=True) | Q(ar_model='')
            )
            for p in prods:
                ok, matched = auto_attach_library_3d(p, force=True)
                if ok:
                    attached_count += 1
            messages.success(request, f"Avtomatik biriktirish yakunlandi: {attached_count} ta mahsulotga 3D model ulandi!")

        elif action == 'upload_library_model':
            name_uz = request.POST.get('name_uz', '').strip()
            name_ru = request.POST.get('name_ru', '').strip()
            category_key = request.POST.get('category_key', 'national')
            real_size_cm = float(request.POST.get('real_size_cm') or 25)
            glb_url = request.POST.get('glb_url', '').strip()
            glb_file = request.FILES.get('glb_file')

            if glb_file:
                file_path = default_storage.save(f'ar/glb/{glb_file.name}', glb_file)
                glb_url = default_storage.url(file_path)

            if not glb_url:
                glb_url = '/media/products/dish_3d.glb'

            key = slugify(name_uz, allow_unicode=True) or f'model-{uuid.uuid4().hex[:6]}'
            ProductLibrary.objects.update_or_create(
                key=key,
                defaults={
                    'name_uz': name_uz,
                    'name_ru': name_ru,
                    'category_key': category_key,
                    'real_size_cm': real_size_cm,
                    'glb_url': glb_url,
                    'is_active': True,
                }
            )
            messages.success(request, f"'{name_uz}' 3D modeli kutubxonaga qo'shildi!")

        elif action == 'delete_library_model':
            lib_id = request.POST.get('library_id')
            ProductLibrary.objects.filter(pk=lib_id).update(is_active=False)      # yashiriladi, fayl va bog'lanishlar saqlanadi
            messages.success(request, "3D model kutubxonadan olib tashlandi (yashirildi).")

        return redirect('admin_ar')

    # Filtrlar
    shops = Shop.objects.all().order_by('name')
    selected_shop_id = request.GET.get('shop_id', '')
    current_filter = request.GET.get('filter', 'all')

    qs = Product.objects.select_related('shop', 'category').all().order_by('-id')
    if selected_shop_id:
        qs = qs.filter(shop_id=selected_shop_id)

    if current_filter == 'with_3d':
        qs = qs.filter(has_3d=True)
    elif current_filter == 'no_3d':
        qs = qs.filter(has_3d=False)

    total_products = Product.objects.count()
    ar_active_count = Product.objects.filter(has_3d=True).count()
    no_ar_count = total_products - ar_active_count
    library_models = list(ProductLibrary.objects.all())
    total_views_count = ARView.objects.count()

    ctx = {
        'products': qs[:80],
        'shops': shops,
        'selected_shop_id': selected_shop_id,
        'current_filter': current_filter,
        'total_products': total_products,
        'ar_active_count': ar_active_count,
        'no_ar_count': no_ar_count,
        'library_models': library_models,
        'library_count': len(library_models),
        'total_views_count': total_views_count,
    }
    return render(request, 'admin/ar.html', ctx)


@login_required(login_url='web_login')
def admin_ai_marketing(request):
    user = request.user
    is_super = getattr(user, 'role', '') == 'super_admin'
    if is_super:
        shops = Shop.objects.all()
    else:
        shops = Shop.objects.filter(owner=user)
    selected_shop = request.GET.get('shop') or (str(shops.first().id) if shops else None)
    products = []
    if selected_shop:
        products = Product.objects.filter(shop_id=selected_shop, is_available=True)
    result = None
    error = None
    if request.method == 'POST':
        shop_id = request.POST.get('shop')
        product_id = request.POST.get('product') or None
        channel = request.POST.get('channel', 'telegram')
        shop = get_object_or_404(Shop, id=shop_id)
        if not (is_super or shop.owner_id == user.id):
            error = 'Bu do\'konga ruxsatingiz yo\'q'
        elif not shop.can_use_ai_marketing():
            error = f"AI marketing faqat Pro/Business rejada mavjud (sizning: {shop.plan}). Tarifingizni yangilang."
        else:
            product = None
            if product_id:
                product = shop.products.filter(id=product_id).first()
            try:
                r = generate_marketing_post(shop, product=product, channel=channel)
                shop.consume_ai_credit()
                result = {'text': r['text'], 'source': r['source'], 'credits_left': shop.ai_credits_left()}
                messages.success(request, 'Post generatsiya qilindi')
            except Exception as e:
                error = f"Xatolik: {e}"
    ctx = {
        'shops': shops,
        'products': products,
        'selected_shop': selected_shop,
        'result': result,
        'error': error,
    }
    return render(request, 'admin/ai_marketing.html', ctx)


@login_required(login_url='web_login')
def admin_telegram(request):
    subs = TelegramSubscriber.objects.filter(is_active=True)
    owner_chat = getattr(django_settings, 'TELEGRAM_CHAT_ID', '')
    token_set = bool(getattr(django_settings, 'TELEGRAM_BOT_TOKEN', ''))
    error = None
    if request.method == 'POST':
        action = request.POST.get('action')
        if action == 'broadcast':
            text = request.POST.get('message', '').strip()
            if not text:
                error = 'Xabar matni bo\'sh bo\'lmasligi kerak'
            else:
                sent = 0
                for chat_id in subs.values_list('chat_id', flat=True):
                    if send_message(chat_id, text):
                        sent += 1
                messages.success(request, f'{sent} ta obunachiga yuborildi')
                return redirect('admin_telegram')
        elif action == 'test':
            if not owner_chat:
                error = 'TELEGRAM_CHAT_ID o\'rnatilmagan'
            else:
                ok = send_message(owner_chat, '🤖 Test xabar — Online Store Guliston boti ishlayapti!')
                messages.success(request, 'Test xabar yuborildi ✅' if ok else 'Test yuborilmadi — TELEGRAM_BOT_TOKEN ni tekshiring')
                return redirect('admin_telegram')
    ctx = {
        'subscriber_count': subs.count(),
        'subscribers': subs[:50],
        'owner_chat': owner_chat,
        'token_set': token_set,
    }
    return render(request, 'admin/telegram.html', ctx)


@login_required(login_url='web_login')
def admin_product_delete(request, pk):
    product = get_object_or_404(Product, pk=pk)
    product.is_deleted = True
    product.is_available = False
    product.deleted_at = timezone.now()
    product.save(update_fields=['is_deleted', 'is_available', 'deleted_at'])
    messages.success(request, 'Mahsulot o\'chirildi (arxivlandi)')
    return redirect('admin_products')


@login_required(login_url='web_login')
def admin_orders(request):
    qs = Order.objects.all()
    status = request.GET.get('status', '')
    if status:
        qs = qs.filter(status=status)
    return render(request, 'admin/orders.html', {
        'orders': qs,
        'status_filter': status,
    })


@login_required(login_url='web_login')
def admin_order_detail(request, pk):
    order = get_object_or_404(Order, pk=pk)
    return render(request, 'admin/order_detail.html', {
        'order': order,
        'items': order.items.all(),
        'history': order.history.all(),
    })


@login_required(login_url='web_login')
def admin_order_status(request, pk):
    order = get_object_or_404(Order, pk=pk)
    if request.method == 'POST':
        status = request.POST.get('status', '')
        valid = [s[0] for s in Order.STATUS_CHOICES]
        if status in valid:
            old_status = order.status
            order.status = status
            if status == 'delivered':
                order.delivered_at = timezone.now()
            order.save()
            OrderStatusHistory.objects.create(
                order=order, status=status, changed_by=request.user
            )
            # Telegram bildirishnoma
            try:
                from notifications.services.telegram_service import send_status_updated
                send_status_updated(order, old_status, status)
            except Exception:
                pass
            messages.success(request, 'Buyurtma holati yangilandi')
    return redirect('admin_order_detail', pk=order.pk)


@login_required(login_url='web_login')
def admin_customers(request):
    return render(request, 'admin/customers.html', {'customers': Customer.objects.all()})


@login_required(login_url='web_login')
def admin_categories(request):
    return render(request, 'admin/categories.html', {
        'categories': Category.objects.all().order_by('sort_order'),
    })


@login_required(login_url='web_login')
@platform_admin_required
def admin_category_create(request):
    if request.method == 'POST':
        category = Category()
        category.name = request.POST.get('name', '')
        category.name_uz = request.POST.get('name_uz', '')
        category.name_ru = request.POST.get('name_ru', '')
        category.name_en = request.POST.get('name_en', '')
        category.icon = request.POST.get('icon', '')
        category.color = request.POST.get('color', '#16a34a')
        category.sort_order = int(request.POST.get('sort_order', 0) or 0)
        category.is_active = request.POST.get('is_active') == 'on'
        if category.name and not Category.objects.filter(name=category.name).exists():
            category.save()
            messages.success(request, 'Kategoriya yaratildi')
            return redirect('admin_categories')
        messages.error(request, 'Kategoriya nomini kiriting')
    return render(request, 'admin/category_form.html', {
        'categories': Category.objects.all(),
    })


@login_required(login_url='web_login')
@platform_admin_required
def admin_category_edit(request, pk):
    category = get_object_or_404(Category, pk=pk)
    if request.method == 'POST':
        category.name = request.POST.get('name', category.name)
        category.name_uz = request.POST.get('name_uz', '')
        category.name_ru = request.POST.get('name_ru', '')
        category.name_en = request.POST.get('name_en', '')
        category.icon = request.POST.get('icon', '')
        category.color = request.POST.get('color', '#16a34a')
        category.sort_order = int(request.POST.get('sort_order', 0) or 0)
        category.is_active = request.POST.get('is_active') == 'on'
        category.save()
        messages.success(request, 'Kategoriya yangilandi')
        return redirect('admin_categories')
    return render(request, 'admin/category_form.html', {
        'category': category,
        'categories': Category.objects.all(),
    })


@login_required(login_url='web_login')
@platform_admin_required
def admin_category_delete(request, pk):
    category = get_object_or_404(Category, pk=pk)
    category.is_active = False
    category.save(update_fields=['is_active'])
    messages.success(request, 'Kategoriya o\'chirildi (yashirildi)')
    return redirect('admin_categories')


@login_required(login_url='web_login')
def admin_couriers(request):
    return render(request, 'admin/couriers.html', {'couriers': Courier.objects.all()})


@login_required(login_url='web_login')
def admin_courier_create(request):
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        phone = request.POST.get('phone', '').strip()
        password = request.POST.get('password', '').strip()
        from django.contrib.auth.hashers import make_password
        if name and phone:
            if not Courier.objects.filter(phone=phone).exists():
                Courier.objects.create(
                    name=name,
                    phone=phone,
                    password=make_password(password) if password else '',
                    status=request.POST.get('status', 'active'),
                    vehicle_type=request.POST.get('vehicle_type', ''),
                )
                messages.success(request, 'Kuryer yaratildi')
                return redirect('admin_couriers')
            messages.error(request, 'Bunday telefon raqamli kuryer mavjud')
        else:
            messages.error(request, 'Ism va telefonni kiriting')
    return render(request, 'admin/courier_form.html')


@login_required(login_url='web_login')
def admin_courier_edit(request, pk):
    courier = get_object_or_404(Courier, pk=pk)
    if request.method == 'POST':
        from django.contrib.auth.hashers import make_password
        courier.name = request.POST.get('name', courier.name)
        courier.phone = request.POST.get('phone', courier.phone)
        password = request.POST.get('password', '').strip()
        if password:
            courier.password = make_password(password)
        courier.status = request.POST.get('status', courier.status)
        courier.vehicle_type = request.POST.get('vehicle_type', '')
        courier.save()
        messages.success(request, 'Kuryer yangilandi')
        return redirect('admin_couriers')
    return render(request, 'admin/courier_form.html', {'courier': courier})


@login_required(login_url='web_login')
def admin_courier_delete(request, pk):
    courier = get_object_or_404(Courier, pk=pk)
    courier.status = 'offline'
    courier.save(update_fields=['status'])
    messages.success(request, 'Kuryer o\'chirildi (nofaol qilindi)')
    return redirect('admin_couriers')


@login_required(login_url='web_login')
def admin_banners(request):
    return render(request, 'admin/banners.html', {
        'banners': Banner.objects.all(),
    })


@login_required(login_url='web_login')
def admin_banner_create(request):
    if request.method == 'POST':
        banner = Banner(
            title=request.POST.get('title', ''),
            link=request.POST.get('link', ''),
            is_active=request.POST.get('is_active') == 'on',
            sort_order=int(request.POST.get('sort_order', 0) or 0),
        )
        shop_id = request.POST.get('shop')
        banner.shop_id = shop_id or None
        if request.FILES.get('image'):
            banner.image = request.FILES['image']
        if banner.title and banner.image:
            banner.save()
            messages.success(request, 'Banner yaratildi')
            return redirect('admin_banners')
        messages.error(request, 'Sarlavha va rasm talab qilinadi')
    return render(request, 'admin/banner_form.html', {
        'shops': Shop.objects.all(),
    })


@login_required(login_url='web_login')
def admin_banner_edit(request, pk):
    banner = get_object_or_404(Banner, pk=pk)
    if request.method == 'POST':
        banner.title = request.POST.get('title', banner.title)
        banner.link = request.POST.get('link', '')
        banner.is_active = request.POST.get('is_active') == 'on'
        banner.sort_order = int(request.POST.get('sort_order', 0) or 0)
        shop_id = request.POST.get('shop')
        banner.shop_id = shop_id or None
        if request.FILES.get('image'):
            banner.image = request.FILES['image']
        banner.save()
        messages.success(request, 'Banner yangilandi')
        return redirect('admin_banners')
    return render(request, 'admin/banner_form.html', {
        'banner': banner,
        'shops': Shop.objects.all(),
    })


@login_required(login_url='web_login')
def admin_banner_delete(request, pk):
    banner = get_object_or_404(Banner, pk=pk)
    banner.is_active = False
    banner.save(update_fields=['is_active'])
    messages.success(request, 'Banner o\'chirildi (yashirildi)')
    return redirect('admin_banners')


@login_required(login_url='web_login')
def admin_reviews(request):
    return render(request, 'admin/reviews.html', {
        'reviews': Review.objects.all()[:50],
    })


@login_required(login_url='web_login')
@require_POST
def admin_review_delete(request, pk):
    from django.http import HttpResponseForbidden
    review = get_object_or_404(Review, pk=pk)
    role = getattr(request.user, 'role', '')
    if role != 'super_admin' and not getattr(request.user, 'is_superuser', False):
        shop = getattr(request.user, 'shop', None) or getattr(request, 'tenant_shop', None)
        if not shop or review.product.shop_id != shop.id:
            return HttpResponseForbidden("Boshqa do'konning sharhini o'chirish taqiqlangan")
    review.delete()
    messages.success(request, 'Sharh o\'chirildi')
    referer = request.META.get('HTTP_REFERER')
    if referer and 'reviews' in referer:
        return redirect(referer)
    return redirect('admin_reviews')


@login_required(login_url='web_login')
def admin_settings(request):
    if request.method == 'POST':
        for key, value in request.POST.items():
            if key.startswith('setting_'):
                real_key = key[len('setting_'):]
                AppSetting.objects.filter(key=real_key).update(value=value)
        from backend.runtime_cache import invalidate_runtime_cache
        invalidate_runtime_cache()  # QuerySet.update() signal bermaydi
        messages.success(request, 'Sozlamalar saqlandi')
        return redirect('admin_settings')
    settings = AppSetting.objects.all().order_by('category', 'key')
    grouped = {}
    for s in settings:
        grouped.setdefault(s.category, []).append(s)
    return render(request, 'admin/settings.html', {
        'settings': grouped,
    })


@login_required(login_url='web_login')
def admin_users(request):
    users = AdminUser.objects.all().order_by('-is_superuser', '-date_joined')
    return render(request, 'admin/users.html', {'users': users})


@login_required(login_url='web_login')
def admin_user_toggle(request, pk):
    if not request.user.is_super_admin:
        messages.error(request, 'Ruxsat yo\'q')
        return redirect('admin_users')
    user = get_object_or_404(AdminUser, pk=pk)
    if user.pk != request.user.pk:
        user.is_approved = not user.is_approved
        user.save()
        messages.success(request, f"Foydalanuvchi holati yangilandi: {user.username}")
    return redirect('admin_users')


@login_required(login_url='web_login')
def admin_profile(request):
    """Admin profili — tahrir, parol o'zgartirish, tizim holati."""
    user = request.user

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
            return redirect('admin_profile')

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
        return redirect('admin_profile')

    return render(request, 'admin/profile.html', {'user': user})


def web_logout(request):
    logout(request)
    return redirect('web_login')


# ========================
# COURIER PAGES
# ========================

def courier_login(request):
    if request.session.get('courier_id'):
        return redirect('courier_dashboard')
    if request.method == 'POST':
        phone = request.POST.get('phone', '')
        password = request.POST.get('password', '')
        courier = Courier.objects.filter(phone=phone).first()
        from django.contrib.auth.hashers import check_password, make_password
        if courier and (not courier.password or check_password(password, courier.password)):
            if not courier.password:
                courier.password = make_password(password)
                courier.save()
            request.session['courier_id'] = courier.id
            return redirect('courier_dashboard')
        messages.error(request, "Telefon raqam yoki parol xato")
    return render(request, 'courier/login.html')


@courier_required
def courier_dashboard(request):
    courier = get_object_or_404(Courier, pk=request.session['courier_id'])
    active_orders = Order.objects.filter(
        Q(courier=courier) | Q(courier__isnull=True, status__in=['confirmed', 'preparing'])
    ).exclude(status='delivered').order_by('-created_at')[:30]
    today_delivered = Order.objects.filter(
        courier=courier, status='delivered', delivered_at__date=timezone.now().date()
    )
    ctx = {
        'courier': courier,
        'orders': active_orders,
        'stats': {
            'today_deliveries': today_delivered.count(),
            'pending_orders': Order.objects.filter(courier=courier, status='out_for_delivery').count(),
            'available_orders': Order.objects.filter(
                courier__isnull=True, status__in=['confirmed', 'preparing']
            ).count(),
            'total_earnings': today_delivered.aggregate(s=Sum('final_amount'))['s'] or 0,
        },
    }
    return render(request, 'courier/dashboard.html', ctx)


@courier_required
def courier_order_detail(request, pk):
    order = get_object_or_404(Order, pk=pk)
    return render(request, 'courier/order_detail.html', {'order': order})


@courier_required
def courier_order_map(request, pk):
    order = get_object_or_404(Order, pk=pk)
    return render(request, 'courier/order_map.html', {'order': order})


@courier_required
def courier_accept_order(request, pk):
    courier = get_object_or_404(Courier, pk=request.session['courier_id'])
    order = get_object_or_404(Order, pk=pk)
    if order.status in ('confirmed', 'preparing'):
        order.courier = courier
        order.status = 'out_for_delivery'
        order.save()
        courier.status = 'busy'
        courier.save()
        OrderStatusHistory.objects.create(
            order=order, status='out_for_delivery',
            note=f"Kuryer {courier.name} tomonidan olindi"
        )
        # Telegram bildirishnoma
        try:
            from notifications.services.telegram_service import send_courier_assigned
            send_courier_assigned(order)
        except Exception:
            pass
        messages.success(request, 'Buyurtma qabul qilindi')
    return redirect('courier_order_detail', pk=order.pk)


@courier_required
def courier_deliver_order(request, pk):
    courier = get_object_or_404(Courier, pk=request.session['courier_id'])
    order = get_object_or_404(Order, pk=pk)
    if order.status == 'out_for_delivery':
        order.status = 'delivered'
        order.delivered_at = timezone.now()
        order.save()
        courier.status = 'active'
        courier.total_deliveries += 1
        courier.save()
        OrderStatusHistory.objects.create(
            order=order, status='delivered',
            note=f"Kuryer {courier.name} tomonidan yetkazildi"
        )
        # Telegram bildirishnoma
        try:
            from notifications.services.telegram_service import send_order_delivered
            send_order_delivered(order)
        except Exception:
            pass
        messages.success(request, 'Buyurtma yetkazildi')
    return redirect('courier_order_detail', pk=order.pk)


@courier_required
def courier_history(request):
    courier = get_object_or_404(Courier, pk=request.session['courier_id'])
    orders = Order.objects.filter(courier=courier, status='delivered').order_by('-delivered_at')[:50]
    return render(request, 'courier/history.html', {'orders': orders, 'courier': courier})


def courier_logout(request):
    request.session.pop('courier_id', None)
    return redirect('courier_login')


def table_menu_redirect(request, token):
    """QR skanerlanganda ochiladi: stolni aniqlab, do'kon menyusiga yo'naltiradi."""
    import uuid as _uuid
    from tables_restaurant.models import resolve_table_by_token
    try:
        table = resolve_table_by_token(_uuid.UUID(str(token)))
    except Exception:
        from django.http import HttpResponse
        return HttpResponse(
            "<h2>QR kod yaroqsiz</h2><p>Iltimos, ofitsiantga murojaat qiling.</p>",
            status=404, content_type='text/html; charset=utf-8',
        )
    # Restoran menyusiga (/menu/). Avval marketplace do'kon sahifasiga (/shop/<slug>/) yuborilardi —
    # restoran konfiguratsiyasida u sahifa 500 xato berardi (NoReverseMatch). QR token doimiy: muddati tugamaydi.
    return redirect(f'/menu/?table={table.qr_token}')


def ar_menu_page(request, slug):
    """V12-AR: QR menyu sahifasi — /m/<slug>/ ?t=<imzolangan token>.
    Standart holatda ultra-zamonaviy AIR 3D Menyu (air-3d-menu) ochiladi.
    Agar ?classic=1 parametri uzatilsa, klassik model-viewer sahifasi ko'rsatiladi."""
    if request.GET.get('classic') != '1':
        from ar3d.views import ar_3d_menu_page
        return ar_3d_menu_page(request, slug=slug)

    from shops.models import Shop
    from products.models import Product
    from django.core.signing import TimestampSigner, BadSignature, SignatureExpired

    shop = get_object_or_404(Shop, slug=slug)
    table_info = None
    token_raw = request.GET.get('t', '')
    if token_raw:
        try:
            token = TimestampSigner().unsign(token_raw, max_age=12 * 3600)
            import uuid as _uuid
            from tables_restaurant.models import resolve_table_by_token
            _t = resolve_table_by_token(_uuid.UUID(token))
            if _t.shop_id == shop.id:
                table_info = {'number': _t.number, 'hall': _t.hall.name if _t.hall else ''}
        except SignatureExpired:
            return render(request, 'customer/ar_menu.html',
                          {'error': 'QR muddati tugagan — ofitsiantga yangi QR uchun murojaat qiling'}, status=403)
        except Exception:
            return render(request, 'customer/ar_menu.html',
                          {'error': 'QR yaroqsiz — linkni uzatish orqali ochish mumkin emas'}, status=403)

    products = shop.products.filter(is_available=True).select_related('category') if shop else []
    categories = []
    # AR manba zanjiri: ar_model → Product3DModel.glb → kutubxona glb → default mahalliy 3D (dish_3d.glb)
    DEFAULT_GLB = '/media/products/dish_3d.glb'
    from urllib.parse import quote as _q
    for p in products:
        if p.category and p.category not in categories:
            categories.append(p.category)
        src = p.ar_model or ''
        if not src:
            m3d = getattr(p, 'model3d', None)
            if m3d:
                src = (m3d.glb.url if m3d.glb else '') or (m3d.library.glb_url if m3d.library else '')
        p.ar_src = src or DEFAULT_GLB
        # Rasm yo'q/404 bo'lsa internetdan nom bo'yicha real foto (mijoz ko'radi)
        p.img_kw = _q((p.name.split() or ['osh'])[0])
    ctx = {'shop': shop, 'products': products, 'categories': categories,
           'table_info': table_info, 'is_ar_menu': True}
    return render(request, 'customer/ar_menu.html', ctx)


def nfc_tap_handler(request, code):
    """
    NFC tekkizilganda chaqiriladi: /nfc/<str:code>/
    NFC chipidan (yoki stenddagi QR dan) o'qilgan kod bo'yicha kartani topadi,
    statistika hisoblaydi va mijozni to'g'ri stol menyusiga yo'naltiradi.
    """
    from django.utils import timezone
    from django.shortcuts import render, redirect
    from tables_restaurant.models import NFCCard

    # Kod yoki UID orqali qidirish
    card = NFCCard.objects.select_related('shop', 'table', 'table__hall').filter(code=code, is_active=True).first()
    if not card:
        # Balki card_uid berilgandir
        card = NFCCard.objects.select_related('shop', 'table', 'table__hall').filter(card_uid=code, is_active=True).first()

    if not card:
        return render(request, 'customer/nfc_not_found.html', {'code': code}, status=404)

    # 1. Statistikani yangilash
    card.tap_count += 1
    card.last_tapped_at = timezone.now()
    card.save(update_fields=['tap_count', 'last_tapped_at'])

    # 2. Sessiyaga ma'lumotlarni yozish
    request.session['nfc_source'] = True
    request.session['nfc_card_id'] = card.id
    request.session['nfc_code'] = card.code
    request.session['shop_id'] = card.shop.id
    request.session['shop_slug'] = card.shop.slug
    if card.table:
        request.session['restaurant_table_id'] = card.table.id
        request.session['restaurant_table_number'] = card.table.number

    # 3. Karta turiga ko'ra yo'naltirish
    if card.card_type == 'waiter_badge':
        return redirect('waiter_panel_web')

    dest = card.get_destination_url()
    return redirect(dest)

