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
from notifications.admin_bot import get_restaurant_shop


def _get_tma_table(request):
    """URL ?table= yoki sessiya orqali faol restoran stolini aniqlash."""
    table_token = request.GET.get('table') or request.GET.get('t') or request.POST.get('table')
    if table_token:
        request.session['tma_table_token'] = table_token
        request.session.modified = True
    else:
        table_token = request.session.get('tma_table_token') or request.session.get('tma_table_id')

    if not table_token:
        return None, None

    import uuid
    from tables_restaurant.models import Table
    from django.core.signing import TimestampSigner

    raw_t = str(table_token).strip()
    if ':' in raw_t:
        try:
            raw_t = TimestampSigner().unsign(raw_t, max_age=24 * 3600)
        except Exception:
            raw_t = raw_t.split(':')[0]

    # 1. UUID bo'lsa qr_token orqali tekshirish
    try:
        val_uuid = uuid.UUID(str(raw_t))
        table = Table.objects.filter(qr_token=val_uuid, is_active=True).select_related('shop', 'hall').first()
        if table:
            return table, table_token
    except (ValueError, TypeError, AttributeError):
        pass

    # 2. Agar stol raqami berilgan bo'lsa (masalan: table=1, stol_2, 3)
    num_str = str(raw_t).lower().replace('table_', '').replace('stol_', '').replace('t_', '').strip()
    shop = get_restaurant_shop()
    query = Table.objects.filter(is_active=True)
    if shop:
        query = query.filter(shop=shop)

    table = query.filter(number=num_str).select_related('shop', 'hall').first()
    if not table and num_str.isdigit():
        table = query.filter(id=int(num_str)).select_related('shop', 'hall').first()

    return table, table_token


def tma_home(request):
    """Telegram Mini App Bosh Sahifasi — faqat restoran 3D menyusi."""
    table, table_token = _get_tma_table(request)
    from notifications.admin_bot import get_restaurant_shop
    active_shop = table.shop if (table and table.shop) else get_restaurant_shop()

    prod_qs = Product.objects.filter(is_available=True)
    if active_shop:
        prod_qs = prod_qs.filter(shop=active_shop)
        categories = Category.objects.filter(products__shop=active_shop, is_active=True).distinct().order_by('sort_order', 'name')
    else:
        categories = Category.objects.filter(is_active=True).order_by('sort_order')[:12]

    featured_products = list(prod_qs.select_related('shop', 'category').order_by('id')[:35])
    ar_products = [p for p in featured_products if p.has_3d][:12]

    # Menyu toifalari bo'yicha guruhlash (menyuuu uslubidagi klassik ro'yxat uchun)
    category_groups = []
    for cat in categories:
        c_prods = [p for p in featured_products if p.category_id == cat.id]
        if c_prods:
            category_groups.append({
                'category': cat,
                'products': c_prods,
            })

    # Savat miqdori
    cart = request.session.get('cart', {})
    cart_count = sum(len(items) for items in cart.values())

    context = {
        'categories': categories,
        'category_groups': category_groups,
        'featured_products': featured_products,
        'ar_products': ar_products,
        'cart_count': cart_count,
        'table': table,
        'table_token': table_token,
        'shop': active_shop,
        'telegram_bot_username': getattr(settings, 'TELEGRAM_BOT_USERNAME', 'marketing_orign_bot'),
    }
    return render(request, 'tma/home.html', context)



def tma_catalog(request):
    """TMA Katalog va Qidiruv — faqat restoran taomlari."""
    table, table_token = _get_tma_table(request)
    from notifications.admin_bot import get_restaurant_shop
    active_shop = table.shop if (table and table.shop) else get_restaurant_shop()

    q = request.GET.get('q', '').strip()
    category_id = request.GET.get('category')
    has_3d = request.GET.get('has_3d') == '1'

    products = Product.objects.filter(is_available=True).select_related('shop', 'category')
    if active_shop:
        products = products.filter(shop=active_shop)
        categories = Category.objects.filter(products__shop=active_shop, is_active=True).distinct().order_by('sort_order', 'name')
    else:
        categories = Category.objects.filter(is_active=True).order_by('sort_order')

    if category_id:
        products = products.filter(category_id=category_id)
    if has_3d:
        products = products.filter(has_3d=True)
    if q:
        products = products.filter(Q(name__icontains=q) | Q(description__icontains=q))

    cart = request.session.get('cart', {})
    cart_count = sum(len(items) for items in cart.values())

    context = {
        'products': products[:80],
        'categories': categories,
        'selected_category': int(category_id) if category_id else None,
        'q': q,
        'has_3d': has_3d,
        'cart_count': cart_count,
        'table': table,
        'table_token': table_token,
        'shop': active_shop,
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
    try:
        qty_param = int(data.get('quantity', 1))
    except (ValueError, TypeError):
        qty_param = 1
    if qty_param < 1:
        qty_param = 1

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
        new_qty = current_item.get('quantity', 0) + qty_param
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
    total_qty = sum(
        int(item.get('quantity', 1))
        for items in cart.values() for item in items.values()
    )
    total_sum = sum(
        Decimal(str(item.get('price', 0))) * int(item.get('quantity', 1))
        for items in cart.values() for item in items.values()
    )
    item_qty = 0
    if shop_key in cart and product_id in cart[shop_key]:
        item_qty = cart[shop_key][product_id].get('quantity', 0)

    return JsonResponse({
        'success': True,
        'cart_count': total_qty,
        'item_qty': item_qty,
        'total_sum': str(total_sum),
    })


def tma_checkout(request):
    """TMA Buyurtma berish va To'lov usulini tanlash: Stolda, Yetkazib berish yoki Olib ketish."""
    cart = request.session.get('cart', {})
    if not cart:
        return redirect('restaurant_home')

    first_shop_id = list(cart.keys())[0]
    shop = Shop.objects.filter(id=first_shop_id).first() or get_restaurant_shop()

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

    from tables_restaurant.models import Table
    table, table_token = _get_tma_table(request)
    all_tables = Table.objects.filter(shop=shop, is_active=True).select_related('hall').order_by('number')

    # Boshlang'ich yetkazib berish haqi
    delivery_fee = Decimal('0') if table else (shop.delivery_fee if total_amount < shop.free_delivery_from else Decimal('0'))
    final_amount = total_amount + Decimal(str(delivery_fee))

    if request.method == 'POST':
        service_type = request.POST.get('service_type', 'table' if table else 'delivery')
        selected_table_id = request.POST.get('table_id')
        table_num_manual = request.POST.get('table_number_manual', '').strip()

        name = (request.POST.get('name') or request.POST.get('customer_name') or '').strip()
        phone = (request.POST.get('phone') or request.POST.get('customer_phone') or '').strip()
        address = request.POST.get('address', '').strip()
        payment_method = request.POST.get('payment_method', 'cash')
        notes = request.POST.get('notes', '').strip()
        telegram_id = request.POST.get('telegram_id', '')

        # 1. Stolda xizmat ko'rsatish
        if service_type == 'table':
            delivery_fee = Decimal('0')
            final_amount = total_amount

            if not table and selected_table_id:
                table = Table.objects.filter(id=selected_table_id, is_active=True).first()
            if not table and table_num_manual:
                table = Table.objects.filter(shop=shop, number=table_num_manual, is_active=True).first()
                if not table:
                    table = Table.objects.create(shop=shop, number=table_num_manual, status='ordering', is_active=True)
            if not table:
                table = all_tables.first()

            table_num_str = str(table.number) if table else (table_num_manual or '1')
            hall_name = table.hall.name if (table and table.hall) else 'Registon Restorani'
            if not address:
                address = f"Stol №{table_num_str} ({hall_name})"
            if not name:
                name = f"Mehmon (Stol №{table_num_str})"
            if not phone:
                phone = f"+99800{int(table_num_str):07d}" if table_num_str.isdigit() else "+998900000000"

        # 2. Olib ketish (Takeout)
        elif service_type == 'pickup':
            delivery_fee = Decimal('0')
            final_amount = total_amount
            if not address:
                address = f"Olib ketish ({shop.name})"
            if not name:
                name = "Mehmon (Olib ketish)"
            if not phone:
                phone = "+998900000000"

        # 3. Yetkazib berish (Dostavka)
        else:
            delivery_fee = shop.delivery_fee if total_amount < shop.free_delivery_from else Decimal('0')
            final_amount = total_amount + Decimal(str(delivery_fee))
            if not phone:
                context = {
                    'shop': shop,
                    'items': items_to_create,
                    'total_amount': total_amount,
                    'delivery_fee': delivery_fee,
                    'final_amount': final_amount,
                    'table': table,
                    'all_tables': all_tables,
                    'table_token': table_token,
                    'error': 'Yetkazib berish uchun telefon raqamingizni kiriting!',
                }
                return render(request, 'tma/checkout.html', context)
            if not address:
                context = {
                    'shop': shop,
                    'items': items_to_create,
                    'total_amount': total_amount,
                    'delivery_fee': delivery_fee,
                    'final_amount': final_amount,
                    'table': table,
                    'all_tables': all_tables,
                    'table_token': table_token,
                    'error': 'Yetkazib berish manzilini kiriting!',
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
            notes=f"TMA buyurtma ({service_type}). {notes}".strip(),
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

        # To'lov yaratish: Naqd / Stolda to'lash to'lov shlyuzisiz to'g'ridan-to'g'ri qabul qilinadi
        if payment_method == 'cash' or service_type == 'table':
            return redirect('tma_order_detail', pk=order.id)

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
        'all_tables': all_tables,
        'table_token': table_token,
    }
    return render(request, 'tma/checkout.html', context)


def tma_table_hub(request):
    """
    Mening Stolim & Stol Bron Qilish Hubi.
    1. Agar stol tanlangan bo'lsa:
       - Stol holati, zal, sig'imi
       - Ushbu stolga oid joriy faol buyurtmalar (Oshxona statuslari)
       - Jami stol hisobi (Live Bill)
       - Tezkor ofitsiant chaqirish tugmalari (Choy, Non, Ofitsiant, Hisob)
       - Boshqa stolga o'tish yoki stoldan chiqish
    2. Agar stol biriktirilmagan bo'lsa:
       - Restorandagi bo'sh va band stollar ro'yxati (Joyida o'tirish uchun tanlash)
       - Stolni oldindan bron qilish formasi (Sana, vaqt, mehmonlar, zal, istaklar)
       - Mijozning oldingi buyurtmalari va bronlari
    """
    from tables_restaurant.models import Table, Hall, TableReservation
    from notifications.services.telegram_service import send_table_reservation_alert
    import datetime

    table, table_token = _get_tma_table(request)
    active_shop = table.shop if (table and table.shop) else get_restaurant_shop()

    # Form harakatlari (POST)
    reservation_success = False
    reservation_obj = None
    flash_msg = None

    if request.method == 'POST':
        action = request.POST.get('action')

        # 1. Joyida stol tanlash
        if action == 'select_table':
            table_id = request.POST.get('table_id')
            if table_id:
                sel_table = Table.objects.filter(pk=table_id, is_active=True).first()
                if sel_table:
                    request.session['tma_table_token'] = str(sel_table.number)
                    request.session.modified = True
                    return redirect('restaurant_table_hub')

        # 2. Stoldan chiqish / Stolni bo'shatish
        elif action == 'clear_table':
            if 'tma_table_token' in request.session:
                del request.session['tma_table_token']
            if 'tma_table_id' in request.session:
                del request.session['tma_table_id']
            request.session.modified = True
            return redirect('restaurant_table_hub')

        # 3. Stolni oldindan bron qilish
        elif action == 'reserve_table':
            name = request.POST.get('customer_name', '').strip()
            phone = request.POST.get('customer_phone', '').strip()
            res_date = request.POST.get('reservation_date')
            res_time = request.POST.get('reservation_time')
            guests = int(request.POST.get('guests_count', 2))
            hall_id = request.POST.get('hall_id')
            notes = request.POST.get('notes', '').strip()

            if name and phone and res_date and res_time:
                hall_obj = Hall.objects.filter(pk=hall_id).first() if hall_id else None
                reservation_obj = TableReservation.objects.create(
                    shop=active_shop,
                    customer_name=name,
                    customer_phone=phone,
                    guests_count=guests,
                    reservation_date=res_date,
                    reservation_time=res_time,
                    hall=hall_obj,
                    notes=notes,
                    status='pending',
                )
                try:
                    send_table_reservation_alert(reservation_obj)
                except Exception:
                    pass
                reservation_success = True
                flash_msg = f"Rahmat, {name}! Stolingiz muvaffaqiyatli bron qilindi. Ofitsiantlarimiz sizni kutishadi."

    # Faol stoldagi buyurtmalar
    table_orders = []
    table_bill = Decimal('0')
    if table:
        table_orders = Order.objects.filter(
            table=table,
            status__in=['pending', 'confirmed', 'preparing', 'ready']
        ).prefetch_related('items').order_by('-created_at')

        for ord_obj in table_orders:
            table_bill += ord_obj.final_amount

    # Barcha stollar va zallar
    tables = Table.objects.filter(shop=active_shop, is_active=True).select_related('hall').order_by('hall__order', 'number') if active_shop else []
    halls = Hall.objects.filter(shop=active_shop, is_active=True).order_by('order', 'name') if active_shop else []

    # Cart count
    cart = request.session.get('cart', {})
    cart_count = sum(len(items) for items in cart.values())

    # Mijozning umumiy buyurtmalari
    orders = Order.objects.all().order_by('-created_at')[:10]
    today_str = datetime.date.today().isoformat()

    context = {
        'shop': active_shop,
        'table': table,
        'table_token': table_token,
        'table_orders': table_orders,
        'table_bill': table_bill,
        'tables': tables,
        'halls': halls,
        'cart_count': cart_count,
        'orders': orders,
        'reservation_success': reservation_success,
        'reservation_obj': reservation_obj,
        'flash_msg': flash_msg,
        'today_str': today_str,
    }
    return render(request, 'tma/table_hub.html', context)


def tma_orders(request):
    """Mijozning Stol va Buyurtmalar bo'limi — to'g'ridan-to'g'ri Stol Hubiga ulanadi."""
    return tma_table_hub(request)


def tma_order_detail(request, pk):
    """TMA Buyurtma tafsilotlari va status kuzatish."""
    order = get_object_or_404(Order, pk=pk)
    return render(request, 'tma/order_detail.html', {'order': order})

