"""
Seller Dashboard API — Do'kon egasi uchun API endpoint'lar.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta

from accounts.models import AdminUser
from shops.models import Shop
from products.models import Product
from orders.models import Order, OrderItem, OrderStatusHistory
from orders.state_machine import transition_order, ORDER_STATES
from orders.inventory import get_available_stock

from .serializers import (
    ShopDetailSerializer, ProductListSerializer, ProductDetailSerializer,
    OrderListSerializer, OrderDetailSerializer,
)


def _user_shop(user):
    """Sotuvchining do'koni: user.shop FK yoki owner orqali (izolyatsiya saqlanadi)."""
    if not isinstance(user, AdminUser):
        return None
    if user.shop_id is not None:
        return user.shop
    return user.owned_shops.first()


class IsShopOwner(permissions.BasePermission):
    def has_permission(self, request, view):
        return _user_shop(request.user) is not None


# ─── SHOP DASHBOARD ─────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsShopOwner])
def seller_dashboard(request):
    """Do'kon dashboard ma'lumotlari."""
    shop = _user_shop(request.user)

    # Stats
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    today_orders = Order.objects.filter(shop=shop, created_at__date=today)
    week_orders = Order.objects.filter(shop=shop, created_at__date__gte=week_ago)
    month_orders = Order.objects.filter(shop=shop, created_at__date__gte=month_ago)

    stats = {
        'today': {
            'orders': today_orders.count(),
            'revenue': today_orders.aggregate(s=Sum('final_amount'))['s'] or 0,
            'pending': today_orders.filter(status='pending').count(),
        },
        'week': {
            'orders': week_orders.count(),
            'revenue': week_orders.aggregate(s=Sum('final_amount'))['s'] or 0,
        },
        'month': {
            'orders': month_orders.count(),
            'revenue': month_orders.aggregate(s=Sum('final_amount'))['s'] or 0,
        },
        'products': shop.products.count(),
        'active_products': shop.products.filter(is_available=True).count(),
        'rating': shop.rating,
        'reviews_count': shop.reviews_count,
    }

    return Response(stats)


# ─── PRODUCTS ────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsShopOwner])
def seller_products(request):
    """Do'kon mahsulotlari."""
    shop = _user_shop(request.user)

    if request.method == 'GET':
        products = Product.objects.filter(shop=shop).order_by('-created_at')
        serializer = ProductListSerializer(products, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = ProductDetailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(shop=shop)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsShopOwner])
def seller_product_detail(request, pk):
    """Do'kon mahsuloti tafsilotlari."""
    shop = _user_shop(request.user)
    product = get_object_or_404(Product, pk=pk, shop=shop)

    if request.method == 'GET':
        serializer = ProductDetailSerializer(product)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = ProductDetailSerializer(product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    elif request.method == 'DELETE':
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsShopOwner])
def seller_product_toggle(request, pk):
    """Mahsulotni yoqish/o'chirish."""
    shop = _user_shop(request.user)
    product = get_object_or_404(Product, pk=pk, shop=shop)
    product.is_available = not product.is_available
    product.save()
    return Response({'is_available': product.is_available})


# ─── ORDERS ──────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsShopOwner])
def seller_orders(request):
    """Do'kon buyurtmalari."""
    shop = _user_shop(request.user)
    status_filter = request.GET.get('status', '')

    orders = Order.objects.filter(shop=shop)
    if status_filter:
        orders = orders.filter(status=status_filter)

    orders = orders.order_by('-created_at')[:50]
    serializer = OrderListSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsShopOwner])
def seller_order_detail(request, pk):
    """Buyurtma tafsilotlari."""
    shop = _user_shop(request.user)
    order = get_object_or_404(Order, pk=pk, shop=shop)
    serializer = OrderDetailSerializer(order)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsShopOwner])
def seller_order_confirm(request, pk):
    """Buyurtmani tasdiqlash."""
    shop = _user_shop(request.user)
    order = get_object_or_404(Order, pk=pk, shop=shop)

    if order.status != 'pending':
        return Response({'error': 'Buyurtma allaqachon tasdiqlangan yoki bekor qilingan'},
                       status=status.HTTP_400_BAD_REQUEST)

    success, msg = transition_order(order, 'confirmed', actor=request.user, request=request)
    if success:
        return Response({'message': msg})
    return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsShopOwner])
def seller_order_preparing(request, pk):
    """Buyurtmani tayyorlashga o'tkazish."""
    shop = _user_shop(request.user)
    order = get_object_or_404(Order, pk=pk, shop=shop)

    success, msg = transition_order(order, 'preparing', actor=request.user, request=request)
    if success:
        return Response({'message': msg})
    return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsShopOwner])
def seller_order_ready(request, pk):
    """Buyurtmani tayyor deb belgilash."""
    shop = _user_shop(request.user)
    order = get_object_or_404(Order, pk=pk, shop=shop)

    success, msg = transition_order(order, 'ready', actor=request.user, request=request)
    if success:
        return Response({'message': msg})
    return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsShopOwner])
def seller_order_cancel(request, pk):
    """Buyurtmani bekor qilish."""
    shop = _user_shop(request.user)
    order = get_object_or_404(Order, pk=pk, shop=shop)

    reason = request.data.get('reason', "Do'kon egasi tomonidan bekor qilindi")
    success, msg = transition_order(order, 'cancelled', actor=request.user,
                                   reason=reason, request=request)
    if success:
        return Response({'message': msg})
    return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)


# ─── STATS ───────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsShopOwner])
def seller_stats(request):
    """Do'kon statistikasi."""
    shop = _user_shop(request.user)

    # Top products
    top_products = OrderItem.objects.filter(
        order__shop=shop,
        order__status='delivered',
    ).values('product_name').annotate(
        total_sold=Sum('quantity'),
        total_revenue=Sum('total'),
    ).order_by('-total_sold')[:10]

    # Daily orders (last 7 days)
    daily_orders = []
    for i in range(7):
        date = timezone.now().date() - timedelta(days=i)
        count = Order.objects.filter(shop=shop, created_at__date=date).count()
        daily_orders.append({
            'date': date.isoformat(),
            'orders': count,
        })

    return Response({
        'top_products': list(top_products),
        'daily_orders': daily_orders,
    })
