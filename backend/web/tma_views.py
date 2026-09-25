"""
Telegram Mini App (TMA) Views.
Maxsus Telegram WebApp dizayn va xususiyatlariga moslashgan yengil, tezkor interfeys.
"""
from decimal import Decimal
import json

from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
from django.conf import settings

from categories.models import Category
from products.models import Product
from shops.models import Shop
from orders.models import Order, OrderItem, OrderStatusHistory
from accounts.models import Customer
from payments.payment_service import create_order_payment
from notifications.services.telegram_service import send_order_created


def _get_tma_table(request):
    """URL ?table= yoki sessiya orqali faol restoran stolini aniqlash."""
    table_token = request.GET.get('table') or request.GET.get('t')
    if table_token:
        request.session['tma_table_token'] = table_token
        request.session.modified = True
    else:
        table_token = request.session.get('tma_table_token')

    if not table_token:
        return None, None

    from tables_restaurant.models import Table
    from django.core.signing import TimestampSigner

    raw_t = str(table_token).strip()
    if ':' in raw_t:
        try:
            raw_t = TimestampSigner().unsign(raw_t, max_age=24 * 3600)
        except Exception:
            raw_t = raw_t.split(':')[0]

    table = Table.objects.filter(qr_token=raw_t, is_active=True).select_related('shop', 'hall').first()
    return table, table_token


def tma_home(request):
    """Telegram Mini App Bosh Sahifasi."""
    table, table_token = _get_tma_table(request)
    categories = Category.objects.filter(is_active=True).order_by('sort_order')[:12]
    
    prod_qs = Product.objects.filter(is_available=True)
    if table and table.shop:
        prod_qs = prod_qs.filter(shop=table.shop)

    featured_products = prod_qs.select_related('shop', 'category').order_by('-rating', '-created_at')[:20]
    
    ar_products = prod_qs.filter(has_3d=True).select_related('shop')[:8]

    # Savat miqdori
    cart = request.session.get('cart', {})
    cart_count = sum(len(items) for items in cart.values())

    context = {
        'categories': categories,
        'featured_products': featured_products,
        'ar_products': ar_products,
        'cart_count': cart_count,
        'table': table,
        'table_token': table_token,
        'telegram_bot_username': getattr(settings, 'TELEGRAM_BOT_USERNAME', 'marketing_orign_bot'),
    }
    return render(request, 'tma/home.html', context)


def tma_catalog(request):
    """TMA Katalog va Qidiruv."""
    table, table_token = _get_tma_table(request)
    q = request.GET.get('q', '').strip()
    category_id = request.GET.get('category')
    has_3d = request.GET.get('has_3d') == '1'

    products = Product.objects.filter(is_available=True).select_related('shop', 'category')
    if table and table.shop:
        products = products.filter(shop=table.shop)

    if category_id:
        products = products.filter(category_id=category_id)
    if has_3d:
        products = products.filter(has_3d=True)
    if q:
        products = products.filter(Q(name__icontains=q) | Q(description__icontains=q))

    categories = Category.objects.filter(is_active=True).order_by('sort_order')
    cart = request.session.get('cart', {})
    cart_count = sum(len(items) for items in cart.values())

    context = {
        'products': products[:60],
        'categories': categories,
        'selected_category': int(category_id) if category_id else None,
        'q': q,
        'has_3d': has_3d,
        'cart_count': cart_count,
        'table': table,
        'table_token': table_token,
    }
    return render(request, 'tma/catalog.html', context)


def tma_cart(request):
    """TMA Savat Sahifasi."""
    table, table_token = _get_tma_table(request)
    cart = request.session.get('cart', {})
    items_list = []
    total_amount = Decimal('0')
    shop_id = None
    shop_name = ''

    for s_id, products in cart.items():
        shop_id = s_id
        for p_id, item in products.items():
            price = Decimal(str(item.get('price', 0)))
            qty = int(item.get('quantity', 1))
            subtotal = price * qty
            total_amount += subtotal
            items_list.append({
                'product_id': p_id,
                'name': item.get('name'),
                'price': price,
                'quantity': qty,
                'subtotal': subtotal,
                'image': item.get('image', ''),
                'unit': item.get('unit', 'dona'),
            })

    if shop_id:
        shop = Shop.objects.filter(id=shop_id).first()
        if shop:
            shop_name = shop.name

    context = {
        'items': items_list,
        'total_amount': total_amount,
        'cart_count': len(items_list),
        'shop_name': shop_name,
        'table': table,
        'table_token': table_token,
    }
    return render(request, 'tma/cart.html', context)


@csrf_exempt
def tma_cart_api(request):
    """TMA savatiga qo'shish / ayirish / o'chirish AJAX."""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST talab qilinadi'}, status=400)
    
    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST.dict()

    action = data.get('action', 'add')
    product_id = str(data.get('product_id'))

    product = Product.objects.filter(id=product_id, is_available=True).first()
    if not product:
        return JsonResponse({'success': False, 'error': 'Mahsulot topilmadi'}, status=404)

    cart = request.session.setdefault('cart', {})
    shop_key = str(product.shop_id)

    if action == 'add':
        # Boshqa do'kondan tovar bo'lsa ogohlantirish / tozalash
        if cart and shop_key not in cart:
            cart.clear()
        
        if shop_key not in cart:
            cart[shop_key] = {}
        
        current_item = cart[shop_key].get(product_id, {})
        new_qty = current_item.get('quantity', 0) + 1
        cart[shop_key][product_id] = {
            'name': product.name,
            'price': str(product.price),
            'image': product.image.url if product.image else '',
            'unit': product.unit or 'dona',
            'quantity': new_qty,
        }
    elif action == 'decrease':
        if shop_key in cart and product_id in cart[shop_key]:
            cart[shop_key][product_id]['quantity'] -= 1
            if cart[shop_key][product_id]['quantity'] <= 0:
                del cart[shop_key][product_id]
                if not cart[shop_key]:
                    del cart[shop_key]
    elif action == 'remove':
        if shop_key in cart and product_id in cart[shop_key]:
            del cart[shop_key][product_id]
            if not cart[shop_key]:
                del cart[shop_key]

    request.session.modified = True
    total_count = sum(len(items) for items in cart.values())
    total_sum = sum(
        Decimal(str(item.get('price', 0))) * int(item.get('quantity', 1))
        for items in cart.values() for item in items.values()
    )

    return JsonResponse({
        'success': True,
        'cart_count': total_count,
        'total_sum': str(total_sum),
    })


def tma_checkout(request):
    """TMA Buyurtma berish va To'lov usulini tanlash."""
    cart = request.session.get('cart', {})
    if not cart:
        return redirect('tma_home')

    first_shop_id = list(cart.keys())[0]
    shop = get_object_or_404(Shop, id=first_shop_id)

    total_amount = Decimal('0')
    items_to_create = []

    for s_id, products in cart.items():
        for p_id, item in products.items():
            p = Product.objects.filter(id=p_id).first()
            if p:
                price = p.effective_price if getattr(p, 'flash_active', False) else p.price
                qty = int(item.get('quantity', 1))
                subtotal = price * qty
                total_amount += subtotal
                items_to_create.append({
                    'product': p,
                    'quantity': qty,
                    'price': price,
                    'subtotal': subtotal,
                })

    table, table_token = _get_tma_table(request)
    delivery_fee = shop.delivery_fee if (total_amount < shop.free_delivery_from and not table) else 0
    final_amount = total_amount + Decimal(str(delivery_fee))

    if request.method == 'POST':
        name = request.POST.get('name', 'Telegram Mijoz').strip()
        phone = request.POST.get('phone', '').strip()
        address = request.POST.get('address', '').strip()
        payment_method = request.POST.get('payment_method', 'click')
        notes = request.POST.get('notes', '').strip()
        telegram_id = request.POST.get('telegram_id', '')

        if table:
            if not address:
                address = f"Stol №{table.number} ({table.hall.name})"
            delivery_fee = Decimal('0')
            final_amount = total_amount

        if not phone:
            context = {
                'shop': shop,
                'items': items_to_create,
                'total_amount': total_amount,
                'delivery_fee': delivery_fee,
                'final_amount': final_amount,
                'table': table,
                'table_token': table_token,
                'error': 'Iltimos, telefon raqamingizni kiriting!',
            }
            return render(request, 'tma/checkout.html', context)

        # Mijozni topish yoki yaratish
        customer, _ = Customer.objects.get_or_create(
            phone=phone,
            defaults={'name': name, 'address': address, 'telegram_chat_id': telegram_id}
        )
        if telegram_id and not customer.telegram_chat_id:
            customer.telegram_chat_id = telegram_id
            customer.save(update_fields=['telegram_chat_id'])

        # Buyurtma raqami
        from web.views import _order_number
        order = Order.objects.create(
            order_number=_order_number(),
            customer=customer,
            customer_name=name,
            customer_phone_1=phone,
            shop=shop,
            table=table,
            delivery_address=address,
            notes=f"TMA buyurtma. {notes}".strip(),
            total_amount=total_amount,
            delivery_fee=delivery_fee,
            final_amount=final_amount,
            status='pending',
            payment_status='unpaid',
        )

        if table:
            table.status = 'ordering'
            table.save(update_fields=['status'])

        for it in items_to_create:
            OrderItem.objects.create(
                order=order,
                product=it['product'],
                product_name=it['product'].name,
                price=it['price'],
                quantity=it['quantity'],
                unit=it['product'].unit or 'dona',
                total=it['subtotal'],
            )

        OrderStatusHistory.objects.create(
            order=order, status='pending', note='Telegram Mini App orqali buyurtma berildi'
        )

        # Telegram xabarnoma
        try:
            send_order_created(order)
        except Exception:
            pass

        # Savatni tozalash
        request.session['cart'] = {}
        request.session.modified = True

        # To'lov yaratish
        return_url = request.build_absolute_uri(f'/tma/order/{order.id}/')
        pay_result = create_order_payment(order, payment_method, return_url)

        if pay_result.get('success') and pay_result.get('payment_url'):
            return redirect(pay_result['payment_url'])

        return redirect('tma_order_detail', pk=order.id)

    context = {
        'shop': shop,
        'items': items_to_create,
        'total_amount': total_amount,
        'delivery_fee': delivery_fee,
        'final_amount': final_amount,
        'table': table,
        'table_token': table_token,
    }
    return render(request, 'tma/checkout.html', context)


def tma_orders(request):
    """Mijozning Telegram orqali berilgan buyurtmalari."""
    phone = request.GET.get('phone', '')
    orders = []
    if phone:
        orders = Order.objects.filter(customer_phone_1=phone).order_by('-created_at')[:20]
    else:
        # Oxirgi sessiyadagi buyurtmalar
        orders = Order.objects.all().order_by('-created_at')[:10]

    return render(request, 'tma/orders.html', {'orders': orders, 'phone': phone})


def tma_order_detail(request, pk):
    """TMA Buyurtma tafsilotlari va status kuzatish."""
    order = get_object_or_404(Order, pk=pk)
    return render(request, 'tma/order_detail.html', {'order': order})
