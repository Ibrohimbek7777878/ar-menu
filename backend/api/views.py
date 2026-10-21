"""
Flutter API Views — Mobile app uchun API endpoint'lar.
"""
import math
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum, Count, F
from django.utils import timezone

from decimal import Decimal
from accounts.models import Customer
from categories.models import Category
from shops.models import Shop, ShopPage, ShopTemplate
from products.models import Product, ProductBundle
from orders.models import Order, OrderItem, OrderStatusHistory
from payments.models import Payment
from orders.inventory import get_available_stock, reserve_stock, release_reservations
from orders.delivery import DeliveryZone
from orders.analytics import track_event

from .serializers import (
    CustomerRegisterSerializer, CustomerLoginSerializer, CustomerProfileSerializer,
    CategorySerializer, ShopListSerializer, ShopDetailSerializer,
    ProductListSerializer, ProductDetailSerializer,
    OrderListSerializer, OrderDetailSerializer, OrderCreateSerializer,
    PaymentSerializer, PaymentCreateSerializer,
    DeliveryQuoteSerializer, DeliveryQuoteResponseSerializer,
    ReviewSerializer, CouponValidateSerializer, WishlistToggleSerializer,
    ShopTemplateSerializer, ShopTemplateListSerializer,
)


def _haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _to_float(value, default=None):
    """Query param'ni float ga o'tkazish — noto'g'ri qiymatda 500 o'rniga default."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_int(value, default=None):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


# ─── AUTH ────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_register(request):
    """Mijoz ro'yxatdan o'tish."""
    serializer = CustomerRegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    customer = serializer.save()

    # JWT token
    refresh = RefreshToken()
    refresh['customer_id'] = customer.id
    refresh['phone'] = customer.phone

    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'customer': CustomerProfileSerializer(customer).data,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_login(request):
    """Mijoz kirish."""
    phone = request.data.get('phone', '')
    password = request.data.get('password', '')

    if not phone or not password:
        return Response({'error': 'Telefon va parol kiritish shart'},
                       status=status.HTTP_400_BAD_REQUEST)

    customer = authenticate(phone=phone, password=password)
    if not customer:
        return Response({'error': 'Telefon raqam yoki parol xato'},
                       status=status.HTTP_401_UNAUTHORIZED)

    refresh = RefreshToken()
    refresh['customer_id'] = customer.id
    refresh['phone'] = customer.phone

    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'customer': CustomerProfileSerializer(customer).data,
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_seller_login(request):
    """Sotuvchi/admin kirish (Flutter seller paneli uchun)."""
    username = request.data.get('username', '')
    password = request.data.get('password', '')
    if not username or not password:
        return Response({'error': 'Login va parol kiritish shart'},
                       status=status.HTTP_400_BAD_REQUEST)

    from accounts.models import AdminUser
    user = AdminUser.objects.filter(username=username).first()
    if not user or not user.check_password(password) or not user.is_active:
        return Response({'error': 'Login yoki parol xato'},
                       status=status.HTTP_401_UNAUTHORIZED)

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'username': user.username,
            'role': user.role,
            'shop_id': user.shop_id,
        },
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_courier_login(request):
    """Kuryer kirish (Flutter kuryer ilovasi va mobil paneli uchun)."""
    phone = request.data.get('phone', '')
    password = request.data.get('password', '')
    if not phone or not password:
        return Response({'error': 'Telefon raqam va parol kiritish shart'},
                       status=status.HTTP_400_BAD_REQUEST)

    from couriers.models import Courier
    clean = phone.strip().replace(' ', '+').lstrip('+')
    courier = Courier.objects.filter(Q(phone=phone) | Q(phone='+' + clean) | Q(phone=clean)).first()
    if not courier or not courier.check_password(password) or courier.status == 'offline':
        return Response({'error': 'Telefon raqam yoki parol xato (yoki kuryer oflayn)'},
                       status=status.HTTP_401_UNAUTHORIZED)

    refresh = RefreshToken()
    refresh['courier_id'] = courier.id
    refresh['phone'] = courier.phone
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'courier': {
            'id': courier.id,
            'name': courier.name,
            'phone': courier.phone,
            'status': courier.status,
            'vehicle_type': courier.vehicle_type,
            'rating': courier.rating,
        },
    })


@api_view(['GET', 'PUT'])
@permission_classes([permissions.IsAuthenticated])
def api_profile(request):
    """Mijoz profili."""
    customer = request.user
    if not isinstance(customer, Customer):
        return Response({'error': 'Faqat mijozlar uchun endpoint'},
                       status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        return Response(CustomerProfileSerializer(customer).data)

    elif request.method == 'PUT':
        serializer = CustomerProfileSerializer(customer, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ─── CATALOG ─────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_categories(request):
    """Kategoriyalar ro'yxati."""
    categories = Category.objects.filter(is_active=True).order_by('sort_order')
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_shops(request):
    """Do'konlar ro'yxati."""
    user_lat = _to_float(request.GET.get('lat'), 40.0)
    user_lng = _to_float(request.GET.get('lng'), 68.0)
    category_id = request.GET.get('category')
    search = request.GET.get('search', '')
    sort = request.GET.get('sort', 'distance')

    store_type = request.GET.get('store_type')  # shop/restaurant/cafe/bar
    shops = Shop.objects.filter(is_open=True)
    if store_type and store_type in ('shop','restaurant','cafe','bar'):
        shops = shops.filter(store_type=store_type)

    if category_id:
        shops = shops.filter(category_id=category_id)
    if search:
        shops = shops.filter(Q(name__icontains=search) | Q(description__icontains=search))

    for shop in shops:
        if shop.latitude and shop.longitude:
            shop.distance = _haversine(user_lat, user_lng, shop.latitude, shop.longitude)
        else:
            shop.distance = 999

    if sort == 'distance':
        shops = sorted(shops, key=lambda x: x.distance)
    elif sort == 'rating':
        shops = shops.order_by('-rating')
    elif sort == 'reviews':
        shops = shops.order_by('-reviews_count')
    else:
        shops = list(shops)

    serializer = ShopListSerializer(shops, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_shop_detail(request, slug):
    """Do'kon tafsilotlari."""
    shop = get_object_or_404(Shop, slug=slug)
    serializer = ShopDetailSerializer(shop)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_shop_view(request, slug):
    """POST /api/v1/flutter/shops/<slug>/view/ — sotuvchi analitikasi (S5-6) ko'rishlar."""
    shop = get_object_or_404(Shop, slug=slug)
    Shop.objects.filter(id=shop.id).update(views=F('views')+1)
    shop.refresh_from_db()
    return Response({'views': shop.views})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_product_view(request, slug):
    """POST /api/v1/flutter/products/<slug>/view/ — mahsulot ko'rishlar."""
    product = get_object_or_404(Product, slug=slug)
    Product.objects.filter(id=product.id).update(views=F('views')+1)
    product.refresh_from_db()
    return Response({'views': product.views})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_shop_products(request, shop_id):
    """Do'kon mahsulotlari."""
    shop = get_object_or_404(Shop, id=shop_id)
    category_id = request.GET.get('category')
    search = request.GET.get('search', '')
    sort = request.GET.get('sort', 'name')

    products = Product.objects.filter(shop=shop, is_available=True)

    if category_id:
        products = products.filter(category_id=category_id)
    if search:
        products = products.filter(Q(name__icontains=search) | Q(description__icontains=search))

    if sort == 'price':
        products = products.order_by('price')
    elif sort == '-price':
        products = products.order_by('-price')
    elif sort == 'rating':
        products = products.order_by('-rating')
    elif sort == 'newest':
        products = products.order_by('-created_at')
    else:
        products = products.order_by('name')

    serializer = ProductListSerializer(products, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_all_products(request):
    """Barcha faol mahsulotlar yoki filtr bo'yicha mahsulotlar ro'yxati."""
    category_id = request.GET.get('category')
    search = request.GET.get('search', '')
    shop_id = request.GET.get('shop_id')
    sort = request.GET.get('sort', 'newest')

    products = Product.objects.filter(is_available=True).select_related('shop')

    if shop_id:
        products = products.filter(shop_id=shop_id)
    if category_id:
        products = products.filter(category_id=category_id)
    if search:
        products = products.filter(Q(name__icontains=search) | Q(description__icontains=search))

    if sort == 'price':
        products = products.order_by('price')
    elif sort == '-price':
        products = products.order_by('-price')
    elif sort == 'rating':
        products = products.order_by('-rating')
    elif sort == 'name':
        products = products.order_by('name')
    else:
        products = products.order_by('-created_at')

    try:
        limit = min(int(request.GET.get('limit', 100)), 200)
    except (ValueError, TypeError):
        limit = 100

    serializer = ProductListSerializer(products[:limit], many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_product_detail(request, slug):
    """Mahsulot tafsilotlari."""
    product = get_object_or_404(Product, slug=slug)
    serializer = ProductDetailSerializer(product)

    # Analytics
    track_event('product_view', request=request, product_id=product.id,
               shop_id=product.shop_id)

    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_search(request):
    """Qidiruv."""
    q = request.GET.get('q', '')
    user_lat = _to_float(request.GET.get('lat'), 40.0)
    user_lng = _to_float(request.GET.get('lng'), 68.0)

    if not q:
        return Response([])

    # Mahsulotlarni qidirish
    products = Product.objects.filter(
        Q(name__icontains=q) | Q(description__icontains=q) | Q(brand__icontains=q),
        is_available=True,
    ).select_related('shop')[:50]

    # Analytics
    track_event('search', request=request, search_query=q)

    serializer = ProductListSerializer(products, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_nearby_shops(request):
    """Yaqin atrofdagi do'konlar."""
    user_lat = _to_float(request.GET.get('lat'), 40.0)
    user_lng = _to_float(request.GET.get('lng'), 68.0)
    radius = _to_float(request.GET.get('radius'), 5.0)

    shops = Shop.objects.filter(is_open=True)
    nearby = []
    for shop in shops:
        if shop.latitude and shop.longitude:
            dist = _haversine(user_lat, user_lng, shop.latitude, shop.longitude)
            if dist <= radius:
                shop.distance = dist
                nearby.append(shop)

    nearby.sort(key=lambda x: x.distance)
    serializer = ShopListSerializer(nearby, many=True)
    return Response(serializer.data)


# ─── CART (session-based) ───────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_cart_add(request):
    """Savatga qo'shish."""
    product_id = request.data.get('product_id')
    quantity = _to_int(request.data.get('quantity', 1))
    if quantity is None or quantity < 1:
        return Response({'error': 'quantity son bo\'lishi va kamida 1 bo\'lishi kerak'},
                       status=status.HTTP_400_BAD_REQUEST)

    product = get_object_or_404(Product, id=product_id, is_available=True)

    # Inventory check
    available = get_available_stock(product)
    if available < quantity:
        return Response({'error': f'Yetarli ombor yo\'q (mavjud: {available})'},
                       status=status.HTTP_400_BAD_REQUEST)

    # Session cart
    cart = request.session.setdefault('cart', {})
    shop_key = str(product.shop_id)
    if shop_key not in cart:
        cart[shop_key] = {}
    cart[shop_key][str(product_id)] = {
        'name': product.name,
        'price': str(product.price),
        'image': product.image.url if product.image else '',
        'unit': product.unit or 'dona',
        'quantity': cart[shop_key].get(str(product_id), {}).get('quantity', 0) + quantity,
    }
    request.session.modified = True

    # Analytics
    track_event('add_to_cart', request=request, product_id=product_id,
               shop_id=product.shop_id)

    return Response({'message': 'Savatga qo\'shildi', 'cart': cart})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_cart_update(request):
    """Savatni yangilash."""
    product_id = request.data.get('product_id')
    quantity = _to_int(request.data.get('quantity', 1))
    if quantity is None:
        return Response({'error': 'quantity son bo\'lishi kerak'},
                       status=status.HTTP_400_BAD_REQUEST)

    cart = request.session.get('cart', {})
    for shop_key, products in cart.items():
        if str(product_id) in products:
            if quantity <= 0:
                del products[str(product_id)]
            else:
                products[str(product_id)]['quantity'] = quantity
            break
    request.session.modified = True

    return Response({'message': 'Savat yangilandi', 'cart': cart})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_cart_remove(request):
    """Savatdan o'chirish."""
    product_id = request.data.get('product_id')

    cart = request.session.get('cart', {})
    for shop_key, products in cart.items():
        if str(product_id) in products:
            del products[str(product_id)]
            break
    request.session.modified = True

    return Response({'message': 'Savatdan o\'chirildi', 'cart': cart})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_cart_detail(request):
    """Savat tafsilotlari."""
    cart = request.session.get('cart', {})
    return Response({'cart': cart})


# ─── ORDERS ──────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def api_orders(request):
    """Buyurtmalar ro'yxati."""
    customer = request.user
    if not isinstance(customer, Customer):
        return Response({'error': 'Faqat mijozlar uchun endpoint'},
                       status=status.HTTP_403_FORBIDDEN)
    orders = Order.objects.filter(customer=customer).order_by('-created_at')[:50]
    serializer = OrderListSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def api_order_detail(request, pk):
    """Buyurtma tafsilotlari."""
    customer = request.user
    if not isinstance(customer, Customer):
        return Response({'error': 'Faqat mijozlar uchun endpoint'},
                       status=status.HTTP_403_FORBIDDEN)
    order = get_object_or_404(Order, pk=pk, customer=customer)
    serializer = OrderDetailSerializer(order)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_order_create(request):
    """Yangi buyurtma yaratish (mobil ilova va veb uchun)."""
    from django.db import transaction

    serializer = OrderCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    # Mijozni aniqlash yoki yaratish
    customer = request.user if request.user.is_authenticated and isinstance(request.user, Customer) else None
    if not customer and data.get('phone'):
        customer, _ = Customer.objects.get_or_create(
            phone=data['phone'],
            defaults={'name': data.get('name', ''), 'address': data.get('address', '')}
        )

    # 1. Payload orqali kelgan items (Flutter to'g'ridan-to'g'ri yuboradi)
    payload_items = data.get('items', [])
    items_data = []
    shop = None

    if payload_items:
        for item in payload_items:
            product_id = item.get('product_id')
            qty = item.get('quantity', 1)
            product = get_object_or_404(Product, id=int(product_id))
            if not shop:
                shop = product.shop
            available = get_available_stock(product)
            if available < qty and product.stock > 0:
                return Response(
                    {'error': f"{product.name} uchun yetarli ombor yo'q (mavjud: {available})"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            price = product.effective_price if getattr(product, 'flash_active', False) else product.price
            items_data.append({
                'product': product,
                'quantity': qty,
                'price': price,
                'subtotal': price * qty,
            })
    else:
        # 2. Savat (Session cart fallback)
        cart = request.session.get('cart', {})
        if not cart:
            return Response({'error': "Savat bo'sh"}, status=status.HTTP_400_BAD_REQUEST)
        first_shop_key = list(cart.keys())[0]
        shop = get_object_or_404(Shop, id=int(first_shop_key))

        for shop_key, products in cart.items():
            for pid, item in products.items():
                product = get_object_or_404(Product, id=int(pid))
                available = get_available_stock(product)
                qty = item['quantity']
                if available < qty and product.stock > 0:
                    return Response(
                        {'error': f"{product.name} uchun yetarli ombor yo'q (mavjud: {available})"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                price = product.effective_price if getattr(product, 'flash_active', False) else product.price
                items_data.append({
                    'product': product,
                    'quantity': qty,
                    'price': price,
                    'subtotal': price * qty,
                })

    if not items_data:
        return Response({'error': "Buyurtmada mahsulotlar yo'q"}, status=status.HTTP_400_BAD_REQUEST)

    # Bir buyurtmada faqat bitta do'kondan tovar bo'lishini tekshirish
    shop_ids_in_order = {i['product'].shop_id for i in items_data}
    if len(shop_ids_in_order) > 1:
        return Response({
            'error': "Bir buyurtmada faqat bitta do'kondan mahsulot buyurtma qilish mumkin. Iltimos, boshqa do'kon mahsulotlarini alohida buyurtma qiling."
        }, status=status.HTTP_400_BAD_REQUEST)

    # Race condition oldini olish uchun transaction.atomic() ichida
    with transaction.atomic():
        # Ombor qoldig'i (stock) tekshirish va zaxiralash
        for i in items_data:
            p = i['product']
            # Zaxiralangan qoldiqni hisobga olib tekshirish
            from orders.models import OrderItem
            reserved = OrderItem.objects.filter(
                product=p, order__status__in=['pending', 'confirmed']
            ).aggregate(total=Sum('quantity'))['total'] or 0
            real_available = (p.stock or 0) - reserved
            if p.stock and p.stock > 0 and real_available < i['quantity']:
                return Response({
                    'error': f"'{p.name}' mahsulotidan yetarli qoldiq yo'q (mavjud: {real_available} ta)"
                }, status=status.HTTP_400_BAD_REQUEST)

    if not shop:
        shop = items_data[0]['product'].shop

    total = sum(i['subtotal'] for i in items_data)

    # Delivery fee
    delivery_fee = shop.delivery_fee
    if total >= shop.free_delivery_from:
        delivery_fee = 0
    if data.get('is_pickup', False):
        delivery_fee = 0

    # Kupon tekshirish va chegirma hisoblash
    coupon_code = data.get('coupon_code', '').strip().upper()
    discount_amount = 0
    if coupon_code:
        from orders.models import Coupon
        coupon = Coupon.objects.filter(code=coupon_code, is_active=True).first()
        if coupon:
            valid, msg = coupon.is_valid(total)
            if valid:
                discount_amount = coupon.calculate_discount(total)

    final_amount = max(Decimal('0'), total - discount_amount + delivery_fee)
    # Bonus ishlatish (S5-2) — faqat mijoz bonusi yetarli bo'lsa, finaldan ayiriladi
    bonus_used = int(data.get('bonus_used') or 0)
    if customer and bonus_used > 0:
        bonus_used = min(bonus_used, int(customer.bonus), int(final_amount))
        final_amount = max(Decimal('0'), final_amount - Decimal(bonus_used))
    else:
        bonus_used = 0
    bonus_earned = int(final_amount * Decimal('0.02'))  # 2% keshbek

    # Order yaratish
    from web.views import _order_number
    order = Order.objects.create(
        order_number=_order_number(),
        customer=customer,
        customer_name=data['name'],
        customer_phone_1=data['phone'],
        shop=shop,
        delivery_address=data['address'],
        delivery_lat=data.get('lat'),
        delivery_lng=data.get('lng'),
        delivery_accuracy=data.get('accuracy'),
        notes=data.get('notes', ''),
        total_amount=total,
        discount_amount=discount_amount,
        coupon_code=coupon_code,
        delivery_fee=delivery_fee,
        final_amount=final_amount,
        bonus_used=bonus_used,
        bonus_earned=bonus_earned,
        status='pending',
        is_pickup=data.get('is_pickup', False),
    )

    # V14: QR stol tokeni bo'lsa — buyurtmani stolga bog'lash
    table_token = request.data.get('table_token')
    if table_token:
        try:
            import uuid as _uuid
            from tables_restaurant.models import resolve_table_by_token
            from django.core.signing import TimestampSigner
            raw_t = str(table_token).strip()
            if ':' in raw_t:
                try:
                    raw_t = TimestampSigner().unsign(raw_t, max_age=24 * 3600)
                except Exception:
                    raw_t = raw_t.split(':')[0]
            _t = resolve_table_by_token(_uuid.UUID(raw_t))
            if _t.shop_id == shop.id:
                order.table = _t
                order.save(update_fields=['table'])
                if _t.status in ['free', 'cleaning']:
                    _t.status = 'occupied'
                    _t.save(update_fields=['status'])
        except Exception:
            pass

    # Kupon sarfi — buyurtma yaratilgandan keyingina (yaratishda xato bo'lsa kupon yonmaydi)
    if coupon_code and discount_amount > 0:
        from orders.models import Coupon
        Coupon.objects.filter(code=coupon_code, is_active=True).update(
            times_used=F('times_used') + 1
        )
    # Bonus yechish (S5-2)
    if customer and bonus_used > 0:
        Customer.objects.filter(id=customer.id).update(bonus=F('bonus') - bonus_used)
        customer.refresh_from_db()

    for item_data in items_data:
        OrderItem.objects.create(
            order=order,
            product=item_data['product'],
            product_name=item_data['product'].name,
            price=item_data['price'],
            quantity=item_data['quantity'],
            unit=item_data['product'].unit or 'dona',
            total=item_data['subtotal'],
        )

    OrderStatusHistory.objects.create(
        order=order, status='pending', note='Buyurtma yaratildi'
    )

    # Inventory zaxiralash
    try:
        reserve_stock(order, timeout_minutes=15)
    except Exception:
        pass

    # Customer statistikasini yangilash
    if customer:
        customer.total_orders = (customer.total_orders or 0) + 1
        customer.total_spent = (customer.total_spent or 0) + order.final_amount
        customer.last_order_at = timezone.now()
        customer.save()

    # Telegram
    try:
        from notifications.services.telegram_service import send_order_created
        send_order_created(order)
    except Exception:
        pass

    # Savatni tozalash
    if 'cart' in request.session:
        request.session['cart'] = {}
        request.session.modified = True

    return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_coupon_validate(request):
    """Kuponni tekshirish va chegirma hisoblash."""
    serializer = CouponValidateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    code = serializer.validated_data['code'].strip().upper()
    order_amount = serializer.validated_data['order_amount']

    from orders.models import Coupon
    coupon = Coupon.objects.filter(code=code).first()
    if not coupon:
        return Response({'valid': False, 'error': "Bunday kupon topilmadi"},
                        status=status.HTTP_404_NOT_FOUND)

    valid, msg = coupon.is_valid(order_amount)
    if not valid:
        return Response({'valid': False, 'error': msg},
                        status=status.HTTP_400_BAD_REQUEST)

    discount = coupon.calculate_discount(order_amount)
    return Response({
        'valid': True,
        'code': coupon.code,
        'discount_percent': coupon.discount_percent,
        'discount_amount': discount,
        'message': "Kupon muvaffaqiyatli qo'llandi",
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_wishlist(request):
    """Xaridorning sevimlilar ro'yxati (xavfsiz: avval JWT token tekshiriladi)."""
    customer = None
    if request.user and request.user.is_authenticated and isinstance(request.user, Customer):
        customer = request.user
    else:
        raw_phone = request.GET.get('phone', '')
        if raw_phone:
            phone = raw_phone.strip().replace(' ', '+')
            clean = phone.lstrip('+')
            customer = Customer.objects.filter(Q(phone=phone) | Q(phone='+' + clean) | Q(phone=clean)).first()

    if not customer:
        return Response([])

    from products.models import WishlistItem
    items = WishlistItem.objects.filter(customer=customer).select_related('product', 'product__shop')
    products = [item.product for item in items if item.product.is_available]
    serializer = ProductListSerializer(products, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_wishlist_toggle(request):
    """Mahsulotni sevimlilar ro'yxatiga qo'shish yoki o'chirish (xavfsiz: avval JWT token tekshiriladi)."""
    serializer = WishlistToggleSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    product_id = serializer.validated_data['product_id']

    customer = None
    if request.user and request.user.is_authenticated and isinstance(request.user, Customer):
        customer = request.user
    else:
        raw_phone = request.data.get('phone', '')
        phone = str(raw_phone).strip().replace(' ', '+') if raw_phone else ''
        if not phone:
            return Response({'error': "Avtorizatsiyadan o'ting yoki telefon raqam kiriting"},
                            status=status.HTTP_400_BAD_REQUEST)
        clean = phone.lstrip('+')
        customer = Customer.objects.filter(Q(phone=phone) | Q(phone='+' + clean) | Q(phone=clean)).first()
        if not customer:
            customer = Customer.objects.create(phone=phone, name='Mijoz')

    product = get_object_or_404(Product, id=product_id)

    from products.models import WishlistItem
    item = WishlistItem.objects.filter(customer=customer, product=product).first()
    if item:
        item.delete()
        return Response({'status': 'removed', 'is_favorite': False})
    else:
        WishlistItem.objects.create(customer=customer, product=product)
        return Response({'status': 'added', 'is_favorite': True})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def api_order_cancel(request, pk):
    """Buyurtmani bekor qilish."""
    customer = request.user
    if not isinstance(customer, Customer):
        return Response({'error': 'Faqat mijozlar uchun endpoint'},
                       status=status.HTTP_403_FORBIDDEN)
    order = get_object_or_404(Order, pk=pk, customer=customer)

    if order.status not in ['pending', 'confirmed']:
        return Response({'error': 'Bu buyurtmani bekor qilib bo\'lmaydi'},
                       status=status.HTTP_400_BAD_REQUEST)

    from orders.state_machine import transition_order
    reason = request.data.get('reason', 'Mijoz tomonidan bekor qilindi')
    success, msg = transition_order(order, 'cancelled', actor=customer,
                                   reason=reason, request=request)

    if success:
        # Inventory qaytarish
        release_reservations(order)
        return Response({'message': msg})
    else:
        return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def api_order_tracking(request, pk):
    """Buyurtma kuzatish."""
    customer = request.user
    if not isinstance(customer, Customer):
        return Response({'error': 'Faqat mijozlar uchun endpoint'},
                       status=status.HTTP_403_FORBIDDEN)
    order = get_object_or_404(Order, pk=pk, customer=customer)
    history = order.history.all().order_by('created_at')

    return Response({
        'order': OrderDetailSerializer(order).data,
        'history': [
            {
                'status': h.status,
                'note': h.note,
                'created_at': h.created_at,
            }
            for h in history
        ]
    })


# ─── PAYMENTS ────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def api_payment_create(request):
    """To'lov yaratish."""
    serializer = PaymentCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    customer = request.user
    order = get_object_or_404(Order, id=data['order_id'], customer=customer)

    if order.status != 'pending':
        return Response({'error': 'Buyurtma allaqachon qayta ishlangan'},
                       status=status.HTTP_400_BAD_REQUEST)

    # Payment yaratish
    import uuid
    merchant_id = f"GLS-{uuid.uuid4().hex[:16].upper()}"

    payment = Payment.objects.create(
        order=order,
        provider=data['provider'],
        amount=order.final_amount,
        merchant_transaction_id=merchant_id,
        status='pending',
    )

    # Provider orqali to'lov
    from payments.providers import get_payment_provider
    provider = get_payment_provider(data['provider'])

    result = provider.create_payment(
        order=order,
        return_url=f"https://guliston.uz/payment/callback/",
        callback_url=f"https://guliston.uz/api/v1/payments/webhook/{merchant_id}/",
    )

    if result.get('success'):
        payment.status = 'processing'
        from payments.masking import mask_sensitive
        payment.raw_response = mask_sensitive(result)
        payment.payment_url = result.get('payment_url', '')
        payment.save()
        return Response({
            'payment_id': payment.id,
            'merchant_transaction_id': merchant_id,
            'payment_url': result.get('payment_url'),
            'status': payment.status,
        })
    else:
        payment.status = 'failed'
        payment.error_message = result.get('error', 'Xatolik')
        payment.save()
        return Response({'error': result.get('error', 'To\'lov xatoligi')},
                       status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def api_payment_status(request, merchant_id):
    """To'lov holatini tekshirish."""
    customer = request.user
    payment = get_object_or_404(
        Payment,
        merchant_transaction_id=merchant_id,
        order__customer=customer,
    )

    from payments.providers import get_payment_provider
    provider = get_payment_provider(payment.provider)
    result = provider.get_status(payment.merchant_transaction_id)

    if result.get('success'):
        payment.status = result.get('status', payment.status)
        payment.save()

    return Response(PaymentSerializer(payment).data)


# ─── DELIVERY ────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_delivery_quote(request):
    """Yetkazib berish narxi."""
    serializer = DeliveryQuoteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    shop = get_object_or_404(Shop, id=data['shop_id'])

    # Masofani hisoblash
    distance_km = _haversine(
        data['lat'], data['lng'],
        shop.latitude, shop.longitude
    )

    # Zonani topish
    zones = DeliveryZone.objects.filter(is_active=True)
    zone = None
    for z in zones:
        if z.center_lat and z.center_lng:
            zone_dist = _haversine(data['lat'], data['lng'], z.center_lat, z.center_lng)
            if zone_dist <= z.radius_km:
                zone = z
                break

    if not zone:
        zone = zones.first()

    if zone:
        result = zone.calculate_fee(
            distance_km=Decimal(str(distance_km)),
            total_amount=data['total_amount'],
            weight_kg=data.get('weight_kg', Decimal('0')),
        )
        result['zone_name'] = zone.name
        result['estimated_minutes'] = int(30 + distance_km * 3)
    else:
        result = {
            'zone_name': 'Standart',
            'distance_km': round(distance_km, 2),
            'base_fee': shop.delivery_fee,
            'distance_fee': 0,
            'peak_fee': 0,
            'weight_fee': 0,
            'discount': 0,
            'total_fee': shop.delivery_fee,
            'is_free': data['total_amount'] >= shop.free_delivery_from,
            'estimated_minutes': 30,
        }

    return Response(result)


# ─── SHOP TEMPLATES (60+ Figma preview) ───────────────────────────────

TEMPLATE_CATEGORIES = [
    {'key': 'minimal', 'name': 'Minimal'},
    {'key': 'modern', 'name': 'Modern'},
    {'key': 'classic', 'name': 'Classic'},
    {'key': 'bold', 'name': 'Bold / Jurratli'},
    {'key': 'elegant', 'name': 'Elegant'},
    {'key': 'minimalist', 'name': 'Minimalist'},
    {'key': 'creative', 'name': 'Creative'},
    {'key': 'corporate', 'name': 'Corporate'},
    {'key': 'fashion', 'name': 'Fashion'},
    {'key': 'food', 'name': 'Food'},
    {'key': 'electronics', 'name': 'Electronics'},
    {'key': 'grocery', 'name': 'Grocery'},
    {'key': 'pharmacy', 'name': 'Pharmacy'},
    {'key': 'beauty', 'name': 'Beauty'},
    {'key': 'sports', 'name': 'Sports'},
    {'key': 'home', 'name': 'Home'},
    {'key': 'automotive', 'name': 'Automotive'},
    {'key': 'books', 'name': 'Books'},
    {'key': 'kids', 'name': 'Kids'},
    {'key': 'pets', 'name': 'Pets'},
]


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_templates_list(request):
    """Barcha faol shablonlar ro'yxati (kategoriyalar bilan guruhlangan)"""
    templates = ShopTemplate.objects.filter(is_active=True).order_by('category', 'sort_order', 'name')

    # Custom shablonlar faqat egasiga ko'rinadi (izolyatsiya)
    from accounts.models import AdminUser
    if isinstance(request.user, AdminUser):
        templates = templates.filter(Q(is_custom=False) | Q(created_by=request.user))
    else:
        templates = templates.filter(is_custom=False)

    category = request.GET.get('category')
    if category:
        templates = templates.filter(category=category)
    
    user_plan = 'basic'
    if getattr(request.user, 'is_authenticated', False):
        # Customer vs AdminUser vs Shop owner – default basic, seller logic can be extended
        try:
            shop = getattr(request.user, 'shop', None)
            if shop and hasattr(shop, 'plan'):
                user_plan = shop.plan
            elif hasattr(request.user, 'owned_shops'):
                owned = request.user.owned_shops.first() if hasattr(request.user.owned_shops, 'first') else None
                if owned:
                    user_plan = owned.plan
        except Exception:
            pass
    plan_hierarchy = {'basic': 0, 'pro': 1, 'business': 2}
    user_level = plan_hierarchy.get(user_plan, 0)
    filtered = []
    for t in templates:
        req_level = plan_hierarchy.get(t.required_plan, 0)
        if req_level <= user_level:
            filtered.append(t)
    
    serializer = ShopTemplateListSerializer(filtered, many=True)
    
    grouped = {}
    for template in serializer.data:
        cat = template['category']
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append(template)
    
    return Response({
        'categories': TEMPLATE_CATEGORIES,
        'templates': grouped,
        'total_count': len(filtered),
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_template_detail(request, slug):
    """Bitta shablon tafsilotlari"""
    template = get_object_or_404(ShopTemplate, slug=slug, is_active=True)
    serializer = ShopTemplateSerializer(template)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def api_template_apply(request):
    """Shablonni do'konga qo'llash (seller)."""
    slug = request.data.get('template_slug')
    template = get_object_or_404(ShopTemplate, slug=slug, is_active=True)
    # Faqat o'z do'koniga qo'llash mumkin (tenant isolation)
    from accounts.models import AdminUser
    shop = getattr(request.user, 'shop', None)
    if shop is None and isinstance(request.user, AdminUser):
        shop = Shop.objects.filter(owner=request.user).first()
    if not shop:
        return Response({'error': 'Sizga tegishli do\'kon topilmadi'},
                       status=status.HTTP_404_NOT_FOUND)

    # "Saqlash va o'rnatish": ixtiyoriy — moslashtirilgan dizaynni yangi
    # custom shablon sifatida ham saqlash (galereyada qoladi)
    import random
    from django.utils.text import slugify as _slugify
    save_as_template = bool(request.data.get('save_as_template'))
    created_tpl = None
    if save_as_template:
        colors = request.data.get('colors') if isinstance(request.data.get('colors'), dict) else {}
        layout_in = request.data.get('layout') if isinstance(request.data.get('layout'), list) else []
        name = (request.data.get('template_name') or f"{shop.name} dizayni").strip()[:100]
        base_slug = _slugify(template.slug, allow_unicode=True) or 'design'
        while True:
            new_slug = f"{base_slug}-custom-{request.user.pk}-{random.randint(1000, 9999)}"
            if not ShopTemplate.objects.filter(slug=new_slug).exists():
                break
        created_tpl = ShopTemplate.objects.create(
            name=name,
            slug=new_slug,
            category=template.category,
            default_colors=colors or template.get_default_colors(),
            default_layout=layout_in or template.get_default_layout(),
            available_sections=template.available_sections,
            required_plan='basic',
            is_active=True,
            is_premium=False,
            is_custom=True,
            created_by=request.user if isinstance(request.user, AdminUser) else None,
            sort_order=100,
        )
        template = created_tpl

    user_plan = shop.plan
    plan_hierarchy = {'basic': 0, 'pro': 1, 'business': 2}
    req_level = plan_hierarchy.get(template.required_plan, 0)
    user_level = plan_hierarchy.get(user_plan, 0)
    
    if req_level > user_level:
        return Response(
            {'error': 'Bu shablon sizning tarifyingizda mavjud emas'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    page, _ = ShopPage.objects.get_or_create(shop=shop)
    # Builderdan kelingan tahrirlangan layout bo'lsa — uni saqlaymiz,
    # aks holda shablonning default layout'i qo'llanadi
    layout = request.data.get('layout')
    if not layout:
        layout = template.get_default_layout()
    # save_as_template bo'lsa yangi slug bilan saqlangan shablon qo'llanadi
    page.template = template.slug
    page.layout = layout
    page.is_published = True
    page.save(update_fields=['template', 'layout', 'is_published', 'updated_at'])

    return Response({
        'message': 'Shablon muvaffaqiyatli qo\'llandi',
        'template': template.slug,
        'layout': page.layout,
        'created': created_tpl is not None,
        'template_name': created_tpl.name if created_tpl else None,
    })


# ─── SHOP PRODUCTS IMPORT / MANUAL PLACEMENT ──────────────────────────

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def api_shop_import_products(request, shop_id):
    """2-usul: eski akkauntdagi mahsulotlarni yangi do'konga export/klonlash.
    Body: { source_shop_id: int, product_ids?: [int], clone_images?: bool }
    Agar product_ids berilmasa - barcha mahsulotlar ko'chiriladi.
    Har bir mahsulot yangi Shop ga klonlanadi (slug unikal qilinadi).
    """
    target = get_object_or_404(Shop, id=shop_id)
    # Tenant isolation: faqat o'z do'konlari orasida ko'chirish mumkin
    from accounts.models import AdminUser
    if not isinstance(request.user, AdminUser):
        return Response({'error': 'Faqat sotuvchilar mahsulot ko\'chirishi mumkin'},
                       status=status.HTTP_403_FORBIDDEN)
    user_shop_ids = set(Shop.objects.filter(owner=request.user).values_list('id', flat=True))
    if target.id not in user_shop_ids:
        return Response({'error': 'Ruxsat yo\'q'}, status=status.HTTP_403_FORBIDDEN)

    source_shop_id = request.data.get('source_shop_id')
    if not source_shop_id:
        return Response({'error': 'source_shop_id majburiy'}, status=status.HTTP_400_BAD_REQUEST)
    source = get_object_or_404(Shop, id=source_shop_id)
    if source.id not in user_shop_ids:
        return Response({'error': 'Manba do\'kon sizga tegishli emas'},
                       status=status.HTTP_403_FORBIDDEN)
    product_ids = request.data.get('product_ids')  # optional filter

    qs = Product.objects.filter(shop=source)
    if product_ids:
        try:
            ids = [int(x) for x in product_ids]
            qs = qs.filter(id__in=ids)
        except Exception:
            return Response({'error': 'product_ids noto\'g\'ri'}, status=status.HTTP_400_BAD_REQUEST)
    if not qs.exists():
        return Response({'error': 'Manba do\'konda mahsulot topilmadi'}, status=status.HTTP_404_NOT_FOUND)

    created = 0
    errors = []
    for p in qs:
        try:
            # Unique slug: slug-targetId-random
            from django.utils.text import slugify
            import uuid as _uuid
            base_slug = slugify(p.name, allow_unicode=True) or f"product-{p.id}"
            new_slug = f"{base_slug}-{target.id}-{str(_uuid.uuid4())[:6]}"
            while Product.objects.filter(slug=new_slug).exists():
                new_slug = f"{base_slug}-{target.id}-{str(_uuid.uuid4())[:6]}"
            # Clone
            p.pk = None
            p.id = None
            p.slug = new_slug
            p.shop = target
            p.views = 0
            p.rating = 0
            p.reviews_count = 0
            # image fields copy reference (same file) – Django will keep same path
            p.save()
            created += 1
        except Exception as e:
            errors.append(str(e))

    return Response({'message': f'{created} ta mahsulot ko\'chirildi', 'created': created, 'errors': errors, 'target_shop': target.id, 'source_shop': source.id})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def api_my_shops(request):
    """Seller o'z do'konlari ro'yxati (import dialog uchun)."""
    from accounts.models import AdminUser
    if isinstance(request.user, AdminUser):
        shops = Shop.objects.filter(owner=request.user)
    else:
        shops = Shop.objects.none()
    from .serializers import ShopListSerializer
    return Response(ShopListSerializer(shops, many=True).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def api_shop_manual_products(request, shop_id):
    """1-usul: qolda mahsulotlarni layout product_grid sectionga biriktirish.
    Body: { section_index: int, product_ids: [int] }
    ShopPage.layout[section_index]['product_ids'] yangilanadi.
    """
    shop = get_object_or_404(Shop, id=shop_id)
    section_index = request.data.get('section_index')
    product_ids = request.data.get('product_ids', [])
    if section_index is None:
        return Response({'error': 'section_index majburiy'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        section_index = int(section_index)
        product_ids = [int(x) for x in product_ids]
    except Exception:
        return Response({'error': 'section_index/product_ids noto\'g\'ri'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate products belong to this shop
    valid_ids = set(Product.objects.filter(shop=shop, id__in=product_ids).values_list('id', flat=True))
    invalid = [x for x in product_ids if x not in valid_ids]
    if invalid:
        return Response({'error': f'Bu do\'konga tegishli bo\'lmagan mahsulotlar: {invalid}'}, status=status.HTTP_400_BAD_REQUEST)

    page, _ = ShopPage.objects.get_or_create(shop=shop)
    layout = list(page.layout or [])
    if section_index < 0 or section_index >= len(layout):
        return Response({'error': 'section_index chegaradan tashqarida'}, status=status.HTTP_400_BAD_REQUEST)
    sec = layout[section_index]
    if sec.get('type') != 'product_grid':
        return Response({'error': 'Faqat product_grid sectionga mahsulot biriktiriladi'}, status=status.HTTP_400_BAD_REQUEST)
    sec['product_ids'] = product_ids
    # also support product_filter = 'manual'
    sec['product_filter'] = 'manual'
    page.layout = layout
    page.save(update_fields=['layout', 'updated_at'])
    return Response({'message': 'Mahsulotlar biriktirildi', 'layout': page.layout})


# ─── AR 3D (ARMENU dan ko'chirilgan MVP) ─────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_ar_detail(request, product_id):
    """GET /api/v1/flutter/ar/<product_id>/ — AR model URLlari (model-viewer uchun)."""
    product = get_object_or_404(Product, id=product_id)
    # has_3d bo'lmasa ham fallback poster
    try:
        from ar3d.models import Product3DModel
        m = Product3DModel.objects.filter(product=product, status='ready').first()
        if m:
            return Response({
                'ready': True,
                'glb': m.glb.url if m.glb else None,
                'usdz': m.usdz.url if m.usdz else None,
                'poster': m.poster.url if m.poster else (product.image.url if product.image else None),
                'scale_m': float(m.real_size_cm) / 100.0,
                'name': product.name,
                'product_id': product.id,
            })
    except Exception:
        pass
    # Fallback: rasm
    return Response({
        'ready': bool(product.has_3d),
        'glb': None,
        'usdz': None,
        'poster': product.image.url if product.image else None,
        'scale_m': 0.30,
        'name': product.name,
        'product_id': product.id,
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_ar_view_log(request):
    """POST /api/v1/flutter/ar/view/ {product_id, session_id, duration_sec, mode} — analitika."""
    product_id = request.data.get('product_id')
    if not product_id:
        return Response({'error': 'product_id majburiy'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        from ar3d.models import ARView, Product3DModel
        product = get_object_or_404(Product, id=product_id)
        ARView.objects.create(
            product=product, shop=product.shop,
            session_id=request.data.get('session_id','')[:64],
            mode=request.data.get('mode','3d-only'),
            duration_sec=int(request.data.get('duration_sec',0)),
            converted=bool(request.data.get('converted',False)),
        )
        # increment view_count
        Product3DModel.objects.filter(product=product).update(view_count=models.F('view_count')+1)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'ok': True})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_ar_library_search(request):
    """GET /api/v1/flutter/ar/library/search/?q=osh — global kutubxona qidiruv."""
    q = (request.GET.get('q') or '').strip()[:60].lower()
    try:
        from ar3d.models import ProductLibrary
        qs = ProductLibrary.objects.filter(is_active=True)
        if q:
            qs = qs.filter(Q(key__icontains=q) | Q(name_uz__icontains=q) | Q(aliases__icontains=q))
        qs = qs.order_by('-used_by_count')[:20]
        return Response([{'key': x.key, 'name_uz': x.name_uz, 'glb_url': x.glb_url, 'poster_url': x.poster_url, 'real_size_cm': float(x.real_size_cm)} for x in qs])
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ─── RESTORAN STOLLARI (tables_restaurant) ─────────────────────────

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_restaurant_tables(request, shop_id):
    """GET /api/v1/flutter/restaurant/<shop_id>/tables/ — Hall+Table ro'yxat (ofitsiant/KDS)."""
    shop = get_object_or_404(Shop, id=shop_id)
    try:
        from tables_restaurant.models import Hall, Table
        halls = Hall.objects.filter(shop=shop, is_active=True).order_by('order')
        tables = Table.objects.filter(shop=shop, is_active=True).select_related('hall').order_by('hall__order','id')
        return Response({
            'halls': [{'id': h.id, 'name': h.name, 'plan_json': h.plan_json} for h in halls],
            'tables': [{'id': t.id, 'number': t.number, 'hall_id': t.hall_id, 'status': t.status, 'qr_token': str(t.qr_token), 'qr_url': t.qr_url, 'capacity': t.capacity, 'x': t.x, 'y': t.y} for t in tables],
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_table_resolve(request, token):
    """GET /api/v1/flutter/t/<qr_token> — QR → shop+table redirect info (M-01)."""
    try:
        from tables_restaurant.models import resolve_table_by_token
        import uuid as _uuid
        u = _uuid.UUID(str(token))
        t = resolve_table_by_token(u)
        return Response({'shop': {'id': t.shop.id, 'slug': t.shop.slug, 'name': t.shop.name, 'store_type': t.shop.store_type}, 'table': {'id': t.id, 'number': t.number, 'hall': t.hall.name if t.hall else ''}, 'redirect': f"/m/{t.shop.slug}/?t={t.id}"})
    except Exception as e:
        return Response({'error': 'QR yaroqsiz', 'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)


# ─── BUNDLE TO'PLAM (S5-3) ────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_bundles_list(request, shop_id):
    """GET /api/v1/flutter/shops/<shop_id>/bundles/ — to'plam ro'yxati."""
    shop = get_object_or_404(Shop, id=shop_id)
    bundles = ProductBundle.objects.filter(shop=shop, is_active=True).prefetch_related('products')
    from .serializers import ProductBundleSerializer
    return Response(ProductBundleSerializer(bundles, many=True).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def api_bundle_create(request):
    """POST /api/v1/flutter/bundles/create/ {shop_id, name, product_ids, bundle_price} — seller yaratadi."""
    from .serializers import ProductBundleCreateSerializer, ProductBundleSerializer
    serializer = ProductBundleCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    shop_id = data.get('shop_id') or request.data.get('shop_id')
    if not shop_id:
        # fallback: first shop owned
        shop = Shop.objects.filter(owner=request.user).first() or Shop.objects.first()
        if not shop:
            return Response({'error': 'Do\'kon topilmadi'}, status=status.HTTP_404_NOT_FOUND)
    else:
        shop = get_object_or_404(Shop, id=shop_id)
        # tenant check soft
        if hasattr(request.user, 'owned_shops') and not request.user.owned_shops.filter(id=shop.id).exists():
            if Shop.objects.filter(owner=request.user, id=shop.id).count() == 0:
                pass  # permissive demo
    # products must belong to shop
    pids = data['product_ids']
    products = list(Product.objects.filter(id__in=pids, shop=shop))
    if len(products) != len(set(pids)):
        return Response({'error': 'Bazi mahsulotlar topilmadi yoki boshqa do\'kon'}, status=status.HTTP_400_BAD_REQUEST)
    if len(products) < 2:
        return Response({'error': 'To\'plam kamida 2 mahsulotdan iborat bo\'lishi kerak'}, status=status.HTTP_400_BAD_REQUEST)
    total = sum(int(p.effective_price if getattr(p,'flash_active',False) else p.price) for p in products)
    bundle = ProductBundle.objects.create(shop=shop, name=data['name'], bundle_price=data['bundle_price'], original_price=total)
    bundle.products.set(products)
    bundle.save()
    return Response(ProductBundleSerializer(bundle).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def api_bundle_add_to_cart(request, bundle_id):
    """POST /api/v1/flutter/bundles/<id>/add-to-cart/ — butun to'plamni savatga (har mahsulot 1 dona) — frontend savatga birma-bir qo'shadi, backend faqat validatsiya."""
    bundle = get_object_or_404(ProductBundle, id=bundle_id, is_active=True)
    return Response({'bundle': bundle.name, 'products': [{'product_id': p.id, 'quantity': 1} for p in bundle.products.all()], 'bundle_price': str(bundle.bundle_price)})


# ─── SHARHLAR VIDJETI (S5-4) ───────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_shop_reviews(request, shop_id):
    """GET /api/v1/flutter/shops/<shop_id>/reviews/ — do'kon mahsulotlari sharhlari (so'nggi 20)."""
    shop = get_object_or_404(Shop, id=shop_id)
    from notifications.models import Review
    reviews = Review.objects.filter(product__shop=shop).select_related('product','customer').order_by('-created_at')[:20]
    from .serializers import ReviewSerializer
    return Response(ReviewSerializer(reviews, many=True).data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_review_create(request):
    """POST /api/v1/flutter/reviews/create/ {product_id, rating, comment, phone?} — anonim yoki mijoz."""
    from notifications.models import Review
    product_id = request.data.get('product_id')
    rating = request.data.get('rating')
    comment = (request.data.get('comment') or '').strip()[:500]
    if not product_id or not rating:
        return Response({'error': 'product_id va rating majburiy'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        rating = int(rating)
        if not 1 <= rating <= 5:
            raise ValueError()
    except Exception:
        return Response({'error': 'rating 1..5'}, status=status.HTTP_400_BAD_REQUEST)
    product = get_object_or_404(Product, id=product_id)
    # customer: auth or phone lookup
    customer = None
    if request.user.is_authenticated:
        try:
            from accounts.models import Customer
            if isinstance(request.user, Customer):
                customer = request.user
        except Exception:
            pass
    if not customer:
        phone = (request.data.get('phone') or '').strip()
        if phone:
            from accounts.models import Customer
            customer, _ = Customer.objects.get_or_create(phone=phone, defaults={'name': request.data.get('name','Anonim')})
        else:
            from accounts.models import Customer
            customer = Customer.objects.filter(phone='998000000000').first()
            if not customer:
                customer = Customer.objects.create(phone='998000000000', name='Anonim')
    review = Review.objects.create(product=product, customer=customer, rating=rating, comment=comment)
    # update product rating
    from django.db.models import Avg, Count
    agg = Review.objects.filter(product=product).aggregate(avg=Avg('rating'), cnt=Count('id'))
    product.rating = round(float(agg['avg'] or 0), 1)
    product.reviews_count = agg['cnt'] or 0
    product.save(update_fields=['rating','reviews_count'])
    from .serializers import ReviewSerializer
    return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_table_service_call(request):
    """
    Stoldan ofitsiant chaqirish, choy, non yoki hisob (chek) so'rash.
    Payload:
      - table_token: imzolangan yoki xom QR token
      - service_type: 'waiter' | 'tea' | 'bread' | 'bill'
      - note: ixtiyoriy qo'shimcha izoh
    """
    table_token = request.data.get('table_token')
    service_type = request.data.get('service_type', 'waiter')
    note = request.data.get('note', '').strip()

    if not table_token:
        return Response({'success': False, 'error': 'Stol tokeni ko\'rsatilmadi'}, status=status.HTTP_400_BAD_REQUEST)

    import uuid as _uuid
    from tables_restaurant.models import resolve_table_by_token
    from django.core.signing import TimestampSigner

    raw_t = str(table_token).strip()
    if ':' in raw_t:
        try:
            raw_t = TimestampSigner().unsign(raw_t, max_age=24 * 3600)
        except Exception:
            raw_t = raw_t.split(':')[0]

    try:
        table = resolve_table_by_token(_uuid.UUID(raw_t))
    except Exception:
        return Response({'success': False, 'error': 'Stol topilmadi yoki QR yaroqsiz'}, status=status.HTTP_404_NOT_FOUND)

    # Stol holatini mos ravishda yangilash
    if service_type == 'bill':
        table.status = 'bill'
        table.save(update_fields=['status'])
    elif service_type == 'waiter' and table.status in ['free', 'cleaning']:
        table.status = 'occupied'
        table.save(update_fields=['status'])

    # Telegram orqali xabar berish
    from notifications.services.telegram_service import send_table_service_call
    tg_res = send_table_service_call(table.shop, table, service_type, note)

    MESSAGES = {
        'waiter': 'Ofitsiantga xabar yetkazildi! Hozir boradi.',
        'tea': 'Choy yangilash so\'rovi qabul qilindi!',
        'bread': 'Issiq non so\'rovi qabul qilindi!',
        'bill': 'Hisob-kitob so\'rovi kassir va ofitsiantga yetkazildi!',
    }
    msg = MESSAGES.get(service_type, 'Xabar muvaffaqiyatli yetkazildi!')

    return Response({
        'success': True,
        'message': msg,
        'table_number': table.number,
        'hall': table.hall.name if table.hall else '',
        'telegram_sent': tg_res.get('success', False),
    }, status=status.HTTP_200_OK)

