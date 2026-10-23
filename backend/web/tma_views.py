"""
Telegram Mini App (TMA) Views.
Maxsus Telegram WebApp dizayn va xususiyatlariga moslashgan yengil, tezkor interfeys.
"""
from decimal import Decimal
import json

from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.db.models import Q
from django.conf import settings
from django.utils import timezone

from categories.models import Category
from products.models import Product
from shops.models import Shop
from orders.models import Order, OrderItem, OrderStatusHistory
from accounts.models import Customer
from payments.payment_service import create_order_payment
from notifications.admin_bot import get_restaurant_shop
from web.telegram_auth import telegram_id_from_request
from web.restaurant_auth import (
    RESTAURANT_MANAGER_ROLES, can_view_order, guest_order_ids, is_restaurant_staff, remember_guest_order,
    restaurant_staff_required, role_home_url, staff_shop, user_role,
)
from tables_restaurant.privacy import find_reservation_by_code_or_phone, mask_name, mask_phone


def _calculate_cart_count(cart) -> int:
    """Xavfsiz savatcha elementlari sonini hisoblash (har qanday session strukturasi uchun)."""
    if not isinstance(cart, dict):
        return 0
    total = 0
    for val in cart.values():
        if isinstance(val, dict):
            for item in val.values():
                if isinstance(item, dict):
                    total += int(item.get('quantity', 1))
                elif isinstance(item, (int, float)):
                    total += int(item)
        elif isinstance(val, (int, float)):
            total += int(val)
    return total


def _calculate_cart_totals(cart):
    """Xavfsiz savatcha soni va umumiy summasi hisobi."""
    if not isinstance(cart, dict):
        return 0, Decimal('0')
    total_qty = 0
    total_sum = Decimal('0')
    for val in cart.values():
        if isinstance(val, dict):
            for item in val.values():
                if isinstance(item, dict):
                    q = int(item.get('quantity', 1))
                    p = Decimal(str(item.get('price', 0)))
                    total_qty += q
                    total_sum += p * q
                elif isinstance(item, (int, float)):
                    total_qty += int(item)
        elif isinstance(val, (int, float)):
            total_qty += int(val)
    return total_qty, total_sum


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

    # 2. Agar stol raqami berilgan bo'lsa (masalan: table=1, stol_2, 3) — taxmin qilinadi, faqat DEMO/aniq flag bilan
    if not getattr(settings, 'RESTAURANT_ALLOW_TABLE_NUMBER_URL', False):
        return None, table_token
    num_str = str(raw_t).lower().replace('table_', '').replace('stol_', '').replace('t_', '').strip()
    shop = get_restaurant_shop()
    query = Table.objects.filter(is_active=True)
    if shop:
        query = query.filter(shop=shop)

    table = query.filter(number=num_str).select_related('shop', 'hall').first()
    if not table and num_str.isdigit():
        table = query.filter(id=int(num_str)).select_related('shop', 'hall').first()

    return table, table_token


def _model_status(product):
    """Taom rasmidan 3D holati: none | queued | processing | ready | failed."""
    from django.core.exceptions import ObjectDoesNotExist
    try:
        return product.model3d.status or 'none'
    except ObjectDoesNotExist:
        return 'none'


def tma_home(request):
    """Telegram Mini App Bosh Sahifasi — faqat restoran 3D menyusi."""
    table, table_token = _get_tma_table(request)
    from notifications.admin_bot import get_restaurant_shop
    active_shop = table.shop if (table and table.shop) else get_restaurant_shop()

    # Faqat shu restoranning arxivlanmagan taomlari (avval o'chirilganlar ham chiqar, menyu 35 taomda kesilardi)
    prod_qs = Product.objects.filter(is_available=True, is_deleted=False)
    if active_shop:
        prod_qs = prod_qs.filter(shop=active_shop)
        categories = Category.objects.filter(
            products__shop=active_shop, products__is_deleted=False, is_active=True,
        ).distinct().order_by('sort_order', 'name')
    else:
        categories = Category.objects.filter(is_active=True).order_by('sort_order')[:12]

    featured_products = list(prod_qs.select_related('shop', 'category', 'model3d').order_by('id')[:300])
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
    cart_count = _calculate_cart_count(cart)

    # React MenuPage uchun to'liq boshlang'ich ma'lumotlar
    react_products = []
    for p in featured_products:
        react_products.append({
            'id': p.id,
            'name': p.name,
            'description': p.description or '',
            'price': float(p.price),
            'old_price': float(p.old_price) if p.old_price else None,
            'image': p.image.url if p.image else '',
            'category_id': p.category_id,
            'category_name': p.category.name if p.category else '',
            'has_3d': bool(p.has_3d and p.ar_model),
            'ar_model': p.ar_model or '',
            'model_status': _model_status(p),
            'unit': p.unit or 'dona',
            'is_halal': bool(p.is_halal),
            'is_popular': bool(p.is_featured),
        })

    # Kategoriya sonlari — faqat shu menyudagi taomlar bo'yicha (avval barcha do'konlar bo'yicha, har biri alohida so'rov)
    from collections import Counter
    cat_counts = Counter(p.category_id for p in featured_products)
    react_categories = []
    for c in categories:
        react_categories.append({
            'id': c.id,
            'name': c.name,
            'icon': getattr(c, 'icon', '') or '🍽️',
            'count': cat_counts.get(c.id, 0),
        })

    flat_cart = {}
    for s_items in cart.values():
        for pid_str, item in s_items.items():
            try:
                flat_cart[int(pid_str)] = int(item.get('quantity', 1))
            except (ValueError, TypeError):
                pass

    react_initial_data = {
        'shop': {'name': active_shop.name if active_shop else 'Guliston'},
        'table': {
            'number': str(table.number) if table else '',
            'hall': table.hall.name if (table and table.hall) else 'Asosiy Zal',
        },
        'categories': react_categories,
        'products': react_products,
        'cart': flat_cart,
        'cartCount': cart_count,
    }

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
        'react_initial_data_json': json.dumps(react_initial_data),
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

    products = Product.objects.filter(is_available=True, is_deleted=False).select_related('shop', 'category')
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
    cart_count = _calculate_cart_count(cart)

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

    total_cart_qty = sum(item['quantity'] for item in items_list)

    # React CartPage uchun JSON
    react_cart_items = []
    for item in items_list:
        react_cart_items.append({
            'product_id': int(item['product_id']),
            'name': item['name'],
            'price': float(item['price']),
            'quantity': int(item['quantity']),
            'subtotal': float(item['subtotal']),
            'image': item['image'] or '',
            'unit': item['unit'] or 'dona',
        })

    from notifications.admin_bot import get_restaurant_shop
    active_shop = table.shop if (table and table.shop) else get_restaurant_shop()

    react_cart_data = {
        'shop': {'name': active_shop.name if active_shop else 'Guliston'},
        'table': {
            'number': str(table.number) if table else '',
            'hall': table.hall.name if (table and table.hall) else 'Asosiy Zal',
        },
        'items': react_cart_items,
        'cartCount': total_cart_qty,
        'totalAmount': float(total_amount),
        'demo': bool(settings.DEMO_MODE),
    }

    context = {
        'items': items_list,
        'total_amount': total_amount,
        'cart_count': total_cart_qty,
        'shop_name': shop_name,
        'table': table,
        'table_token': table_token,
        'react_cart_data_json': json.dumps(react_cart_data),
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

    # Suiiste'moldan himoya: restoran Wi-Fi'sidagi hamma mehmon bitta IP'dan chiqadi, shuning uchun chegara keng
    from backend.ratelimit import rate_limited
    blocked = rate_limited(request, 'tma_cart', limit=1500, seconds=60)
    if blocked is not None:
        return blocked

    action = data.get('action', 'add')

    # Savatni butunlay bo'shatish (React savati serverdagi sessiya savati bilan bir xil bo'lishi uchun)
    if action == 'clear':
        request.session['cart'] = {}
        request.session.modified = True
        return JsonResponse({'success': True, 'cart_count': 0, 'item_qty': 0, 'total_sum': '0'})

    product_id = str(data.get('product_id'))
    try:
        raw_qty = int(data.get('quantity', 1))
    except (ValueError, TypeError):
        raw_qty = 1
    raw_qty = max(0, min(raw_qty, 100))
    qty_param = max(raw_qty, 1)

    product = Product.objects.filter(id=product_id, is_deleted=False).first()
    if not product:
        return JsonResponse({'success': False, 'error': 'Mahsulot topilmadi'}, status=404)
    wants_more = action == 'add' or (action == 'set' and raw_qty > 0)
    if not product.is_available and wants_more:
        # Tugagan taomni savatga qo'shib bo'lmaydi; lekin savatdan olib tashlash (remove/decrease/set 0) mumkin
        return JsonResponse({'success': False, 'error': f"'{product.name}' hozir tugagan", 'code': 'sold_out'}, status=409)

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
    elif action == 'set':
        # Aniq miqdorni o'rnatish (0 — savatdan olib tashlash)
        if raw_qty <= 0:
            if shop_key in cart and product_id in cart[shop_key]:
                del cart[shop_key][product_id]
                if not cart[shop_key]:
                    del cart[shop_key]
        else:
            if cart and shop_key not in cart:
                cart.clear()
            cart.setdefault(shop_key, {})[product_id] = {
                'name': product.name,
                'price': str(product.price),
                'image': product.image.url if product.image else '',
                'unit': product.unit or 'dona',
                'quantity': raw_qty,
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
    total_qty, total_sum = _calculate_cart_totals(cart)
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
    # React checkout sahifasi fetch() bilan yuboradi (X-Requested-With) — unga HTML emas, JSON qaytariladi
    wants_json = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

    # React forma {% csrf_token %} ishlatmaydi — CSRF cookie'sini sahifa ochilganda o'rnatamiz, aks holda
    # POST /checkout/ 403 qaytaradi (avval bu xato jim yutilib, "buyurtma qabul qilindi" deb ko'rsatilardi)
    from django.middleware.csrf import get_token
    get_token(request)

    cart = request.session.get('cart', {})
    if not cart:
        if wants_json and request.method == 'POST':
            return JsonResponse({'ok': False, 'error': "Savat bo'sh yoki buyurtma allaqachon yuborilgan"}, status=400)
        return redirect('restaurant_home')

    first_shop_id = list(cart.keys())[0]
    shop = Shop.objects.filter(id=first_shop_id).first() or get_restaurant_shop()

    total_amount = Decimal('0')
    items_to_create = []
    sold_out = []          # savatda bor, lekin tugagan/arxivlangan taomlar: mehmonga aytiladi (avval jimgina tushib qolardi)

    for s_id, products in cart.items():
        for p_id, item in products.items():
            # Faqat mavjud, arxivlanmagan taom (avval o'chirilgan taom ham buyurtmaga tushardi)
            p = Product.objects.filter(id=p_id, is_available=True, is_deleted=False).first()
            if not p:
                gone = Product.all_objects.filter(id=p_id).values_list('name', flat=True).first()
                sold_out.append((s_id, p_id, gone or 'Taom'))
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

    if request.method == 'POST':
        from backend.ratelimit import rate_limited
        blocked = rate_limited(request, 'tma_checkout', limit=90, seconds=60)
        if blocked is not None:
            return blocked

    if request.method == 'POST' and sold_out and items_to_create:
        # Buyurtma yaratilmaydi: mehmon nima o'zgarganini bilib, tasdiqlaydi. Savat yangilanadi (qayta urinish ishlasin).
        for s_id, p_id, _name in sold_out:
            request.session['cart'].get(str(s_id), {}).pop(str(p_id), None)
        request.session.modified = True
        names = ', '.join(dict.fromkeys(name for _s, _p, name in sold_out))
        message = f"Quyidagi taomlar hozir tugagan: {names}. Savat yangilandi — buyurtmani qayta tasdiqlang."
        if wants_json:
            return JsonResponse({'ok': False, 'error': message, 'sold_out': [name for _s, _p, name in sold_out]}, status=409)
        return redirect('restaurant_cart')

    if request.method == 'POST' and not items_to_create:
        # Savatdagi barcha taomlar menyudan olib tashlangan
        request.session['cart'] = {}
        request.session.modified = True
        if wants_json:
            return JsonResponse({'ok': False, 'error': "Savatdagi taomlar endi menyuda yo'q"}, status=400)
        return redirect('restaurant_home')

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
        telegram_id = telegram_id_from_request(request)

        # 1. Stolda xizmat ko'rsatish
        if service_type == 'table':
            delivery_fee = Decimal('0')
            final_amount = total_amount

            # Stol faqat shu restoranning mavjud stoli bo'lishi mumkin. Avval mavjud bo'lmagan raqam kiritilsa
            # zalsiz stol yaratilardi (IntegrityError → 500), stol topilmasa esa tasodifiy "birinchi stol" olinardi.
            # Raqam/ID bilan tanlash taxmin qilinadi: faqat DEMO_MODE yoki RESTAURANT_ALLOW_TABLE_NUMBER_URL bilan
            if getattr(settings, 'RESTAURANT_ALLOW_TABLE_NUMBER_URL', False):
                if not table and selected_table_id:
                    table = Table.objects.filter(id=selected_table_id, shop=shop, is_active=True).first()
                if not table and table_num_manual:
                    table = Table.objects.filter(shop=shop, number=table_num_manual, is_active=True).first()
            if not table:
                msg = "Stol aniqlanmadi. Stol ustidagi QR kodni qayta skanerlang yoki ofitsiantga murojaat qiling."
                if wants_json:
                    return JsonResponse({'ok': False, 'error': msg}, status=400)
                return render(request, 'tma/checkout.html', {
                    'shop': shop, 'items': items_to_create, 'total_amount': total_amount,
                    'delivery_fee': delivery_fee, 'final_amount': final_amount, 'table': None,
                    'all_tables': all_tables, 'table_token': table_token, 'error': msg,
                })

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
        from orders.creation import create_order
        order = create_order(
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

        # Telegram xabarnoma so'rov ichida yuborilmaydi: Order post_save signali outbox hodisasini yozadi,
        # yuborishni fon ishchisi bajaradi (notifications/signals.py, outbox.py)

        # Savatni tozalash
        request.session['cart'] = {}
        request.session.modified = True
        remember_guest_order(request, order)

        # To'lov yaratish: Naqd / Stolda to'lash to'lov shlyuzisiz to'g'ridan-to'g'ri qabul qilinadi
        from django.urls import reverse
        target = reverse('tma_order_detail', kwargs={'pk': order.id})
        if not (payment_method == 'cash' or service_type == 'table'):
            return_url = request.build_absolute_uri(target)
            pay_result = create_order_payment(order, payment_method, return_url)
            if pay_result.get('success') and pay_result.get('payment_url'):
                target = pay_result['payment_url']

        if wants_json:
            return JsonResponse({'ok': True, 'order_id': order.id, 'order_number': order.order_number,
                                 'redirect': target})
        return redirect(target)

    react_checkout_items = []
    for it in items_to_create:
        react_checkout_items.append({
            'name': it['product'].name,
            'price': float(it['price']),
            'quantity': int(it['quantity']),
            'subtotal': float(it['subtotal']),
        })

    react_all_tables = []
    for tb in all_tables:
        react_all_tables.append({
            'id': tb.id,
            'number': str(tb.number),
            'hall': tb.hall.name if tb.hall else 'Asosiy Zal',
        })

    react_checkout_data = {
        'shop': {'name': shop.name if shop else 'Guliston'},
        'table': {
            'number': str(table.number) if table else '',
            'hall': table.hall.name if (table and table.hall) else 'Asosiy Zal',
            'id': table.id if table else None,
        },
        'items': react_checkout_items,
        'cartCount': sum(it['quantity'] for it in items_to_create),
        'subtotal': float(total_amount),
        'allTables': react_all_tables,
    }

    context = {
        'shop': shop,
        'items': items_to_create,
        'total_amount': total_amount,
        'delivery_fee': delivery_fee,
        'final_amount': final_amount,
        'table': table,
        'all_tables': all_tables,
        'table_token': table_token,
        'react_checkout_data_json': json.dumps(react_checkout_data),
    }
    return render(request, 'tma/checkout.html', context)


@ensure_csrf_cookie
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
    from tables_restaurant import reservations as reservation_svc
    from tables_restaurant.models import Table, Hall

    table, table_token = _get_tma_table(request)
    active_shop = table.shop if (table and table.shop) else get_restaurant_shop()

    # Form harakatlari (POST)
    reservation_success = False
    reservation_obj = None
    flash_msg = None

    if request.method == 'POST':
        action = request.POST.get('action')

        # 1. Joyida stol tanlash — ro'yxatdan tanlash taxmin qilinadi (begona stolga buyurtma), shuning uchun
        #    production'da faqat QR orqali; DEMO_MODE yoki RESTAURANT_ALLOW_TABLE_NUMBER_URL bilan ruxsat (R1-10)
        if action == 'select_table':
            table_id = request.POST.get('table_id')
            if not getattr(settings, 'RESTAURANT_ALLOW_TABLE_NUMBER_URL', False):
                flash_msg = "Stolni tanlash uchun stol ustidagi QR kodni skanerlang."
            elif table_id:
                sel_table = Table.objects.filter(pk=table_id, shop=active_shop, is_active=True).first()
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

        # 3. Stolni oldindan bron qilish (tekshiruv, to'qnashuv, stol tanlash — tables_restaurant/reservations.py)
        elif action == 'reserve_table':
            try:
                reservation_obj = reservation_svc.create_reservation(active_shop, {
                    'customer_name': request.POST.get('customer_name', ''),
                    'customer_phone': request.POST.get('customer_phone', ''),
                    'reservation_date': request.POST.get('reservation_date'),
                    'reservation_time': request.POST.get('reservation_time'),
                    'guests_count': request.POST.get('guests_count', 2),
                    'hall_id': request.POST.get('hall_id'),
                    'notes': request.POST.get('notes', ''),
                }, by_staff=False)
                reservation_success = True
                flash_msg = (f"Rahmat, {reservation_obj.customer_name}! Stol {reservation_obj.table_number}-raqam bilan "
                             f"bron qilindi. Bron kodingiz: {reservation_obj.code} — saqlab qo'ying.")
            except reservation_svc.ReservationError as exc:
                flash_msg = exc.message

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
    cart_count = _calculate_cart_count(cart)

    # React TableHubPage uchun ma'lumotlar
    react_tables = []
    for t in tables:
        react_tables.append({
            'id': t.id,
            'number': str(t.number),
            'hall_id': t.hall_id,
            'hall_name': t.hall.name if t.hall else 'Asosiy Zal',
            'status': t.status,
            'capacity': getattr(t, 'capacity', 4),
        })

    react_halls = []
    for h in halls:
        react_halls.append({
            'id': h.id,
            'name': h.name,
        })

    react_table_data = {
        'shop': {'name': active_shop.name if active_shop else 'Guliston'},
        'table': {
            'id': table.id,
            'number': str(table.number),
            'hall': table.hall.name if table.hall else 'Asosiy Zal',
        } if table else None,
        'tables': react_tables,
        'halls': react_halls,
        'cartCount': cart_count,
        'flashMsg': flash_msg,
    }

    today_str = timezone.localdate().isoformat()

    context = {
        'shop': active_shop,
        'table': table,
        'table_token': table_token,
        'table_orders': table_orders,
        'table_bill': table_bill,
        'tables': tables,
        'halls': halls,
        'cart_count': cart_count,
        'reservation_success': reservation_success,
        'reservation_obj': reservation_obj,
        'flash_msg': flash_msg,
        'today_str': today_str,
        'react_table_data_json': json.dumps(react_table_data),
    }
    return render(request, 'tma/table_hub.html', context)


def tma_orders(request):
    """Mijozning Buyurtmalari va Hisob sahifasi (/orders/)."""
    table, table_token = _get_tma_table(request)
    shop = get_restaurant_shop()

    # Faqat shu mehmonning o'zi bergan buyurtmalari (sessiya bo'yicha).
    # Avval bu yerda boshqa mehmonlar va boshqa restoranlarning buyurtmalari ham chiqardi.
    orders_qs = list(
        Order.objects.filter(pk__in=guest_order_ids(request))
        .select_related('table').prefetch_related('items').order_by('-created_at')[:30]
    )

    react_orders = []
    for o in orders_qs:
        items = []
        for it in o.items.all():
            items.append({
                'name': it.product_name,
                'quantity': it.quantity,
                'price': float(it.price),
                'total': float(it.total),
            })
        react_orders.append({
            'id': o.id,
            'order_number': o.order_number,
            'created_at': o.created_at.strftime("%d.%m.%Y · %H:%M"),
            'status': o.status,
            'status_display': o.get_status_display() or o.status,
            'total_amount': float(o.final_amount),
            'table_number': str(o.table.number) if o.table else '',
            'items': items,
        })

    cart = request.session.get('cart', {})
    cart_count = 0
    try:
        cart_count = sum(int(item.get('quantity', 1)) for items in cart.values() for item in items.values())
    except Exception:
        cart_count = 0

    react_orders_data = {
        'shop': {'name': shop.name if shop else 'Guliston'},
        'table': {
            'number': str(table.number) if table else '',
            'hall': table.hall.name if (table and table.hall) else 'Asosiy Zal',
        } if table else None,
        'orders': react_orders,
        'cartCount': cart_count,
    }

    context = {
        'shop': shop,
        'table': table,
        'table_token': table_token,
        'orders': orders_qs,
        'cart_count': cart_count,
        'tma_active_tab': 'orders',
        'react_orders_data_json': json.dumps(react_orders_data),
    }
    return render(request, 'tma/orders.html', context)


def tma_order_detail(request, pk):
    """TMA Buyurtma tafsilotlari va status kuzatish."""
    order = get_object_or_404(Order, pk=pk)
    if not can_view_order(request, order):
        from django.http import Http404
        raise Http404("Buyurtma topilmadi")
    table, table_token = _get_tma_table(request)
    shop = get_restaurant_shop()

    items = []
    for it in order.items.all():
        items.append({
            'name': it.product_name,
            'quantity': it.quantity,
            'price': float(it.price),
            'total': float(it.total),
        })

    single_order_data = [{
        'id': order.id,
        'order_number': order.order_number,
        'created_at': order.created_at.strftime("%d.%m.%Y · %H:%M"),
        'status': order.status,
        'status_display': order.get_status_display() or order.status,
        'total_amount': float(order.final_amount),
        'table_number': str(order.table.number) if order.table else '',
        'items': items,
    }]

    react_orders_data = {
        'shop': {'name': shop.name if shop else 'Guliston'},
        'table': {
            'number': str(table.number) if table else '',
            'hall': table.hall.name if (table and table.hall) else 'Asosiy Zal',
        } if table else None,
        'orders': single_order_data,
        'cartCount': 0,
    }

    context = {
        'order': order,
        'react_orders_data_json': json.dumps(react_orders_data),
    }
    return render(request, 'tma/orders.html', context)


# ==============================================================================
# RESTORAN ADMIN VA BOSHQARUV MARKAZI (ADMIN HUB & LOGIN)
# ==============================================================================

@restaurant_staff_required(roles=RESTAURANT_MANAGER_ROLES)
def restaurant_admin_dashboard(request):
    """
    Restoran Boshqaruv Markazi (Dashboard).
    Stollar, Oshxona (KDS), Ofitsiant (POS), Menyu, Kassa va Telegram nazorati.
    """

    from tables_restaurant.models import Table, Hall
    from shops.models import Shop
    from products.models import Product
    from orders.models import Order
    from django.db.models import Sum
    from django.utils import timezone

    shop = staff_shop(request)

    now = timezone.now()
    from orders.timeutils import local_day_start
    today_start = local_day_start()   # Toshkent kuni (avval UTC: kun soat 05:00 da almashardi)

    tables_qs = Table.objects.filter(shop=shop, is_active=True)
    tables_count = tables_qs.count()
    free_tables_count = tables_qs.filter(status='free').count()
    occupied_tables_count = tables_qs.filter(status='occupied').count()

    orders_qs = Order.objects.filter(shop=shop)
    today_orders = orders_qs.filter(created_at__gte=today_start)
    today_orders_count = today_orders.count()
    today_rev = today_orders.exclude(status__in=['cancelled', 'failed']).aggregate(s=Sum('final_amount'))['s'] or 0

    kds_orders = orders_qs.filter(status__in=['pending', 'confirmed', 'preparing']).order_by('-created_at')
    pending_kds_count = kds_orders.count()

    products_qs = Product.objects.filter(shop=shop)
    products_count = products_qs.count()
    ar_dishes_count = products_qs.filter(has_3d=True).count()

    tables_list = list(tables_qs.select_related('hall').order_by('number')[:12])
    recent_orders = list(orders_qs.order_by('-created_at')[:8])

    import json
    react_tables = []
    for t in tables_list:
        react_tables.append({
            'id': t.id,
            'number': str(t.number),
            'hall': t.hall.name if getattr(t, 'hall', None) else 'Asosiy Zal',
            'status': t.status,
            'capacity': getattr(t, 'capacity', 4),
        })

    react_recent_orders = []
    for o in recent_orders:
        t_name = f"Stol {o.table.number}" if getattr(o, 'table', None) else "Stol belgilanmagan"
        react_recent_orders.append({
            'id': o.id,
            'order_number': f"#{o.order_number}" if not str(o.order_number).startswith('#') else str(o.order_number),
            'table_name': t_name,
            'customer_name': o.customer_name or 'Mehmon',
            'status': o.status,
            'final_amount': float(getattr(o, 'final_amount', 0) or getattr(o, 'total_amount', 0) or 0),
            'created_at': o.created_at.strftime('%H:%M') if getattr(o, 'created_at', None) else '',
        })

    react_admin_data = {
        'shop': {'name': shop.name if shop else 'Guliston Restoran'},
        'tables_count': tables_count,
        'free_tables_count': free_tables_count,
        'occupied_tables_count': occupied_tables_count,
        'today_orders_count': today_orders_count,
        'today_revenue': float(today_rev),
        'pending_kds_count': pending_kds_count,
        'products_count': products_count,
        'ar_dishes_count': ar_dishes_count,
        'tables_list': react_tables,
        'recent_orders': react_recent_orders,
    }

    context = {
        'shop': shop,
        'tables_count': tables_count,
        'free_tables_count': free_tables_count,
        'occupied_tables_count': occupied_tables_count,
        'tables_list': tables_list,
        'today_orders_count': today_orders_count,
        'today_revenue': float(today_rev),
        'pending_kds_count': pending_kds_count,
        'products_count': products_count,
        'ar_dishes_count': ar_dishes_count,
        'recent_orders': recent_orders,
        'react_admin_data_json': json.dumps(react_admin_data, ensure_ascii=False),
    }
    return render(request, 'restaurant_admin/dashboard.html', context)


def restaurant_admin_login(request):
    """
    Restoran Boshqaruv Paneliga Kirish sahifasi.
    shop_owner, shop_manager, super_admin va waiter rollari uchun ochiq.
    """
    from django.contrib.auth import authenticate, login
    from django.contrib import messages
    from django.core.cache import cache
    from django.utils.http import url_has_allowed_host_and_scheme

    # Login'dan keyin xodim qaytadigan sahifa (masalan devordagi KDS ekrani) — faqat o'z saytimiz ichida
    next_url = request.POST.get('next') or request.GET.get('next') or ''
    if not url_has_allowed_host_and_scheme(next_url, allowed_hosts={request.get_host()}, require_https=request.is_secure()):
        next_url = ''

    def _after_login_redirect(user):
        if next_url:
            return redirect(next_url)
        return redirect(role_home_url(user))

    if request.user.is_authenticated:
        if is_restaurant_staff(request.user):
            return _after_login_redirect(request.user)
        # Xodim bo'lmagan akkaunt bilan kirilgan — redirect aylanmasi bo'lmasligi uchun login sahifasini ko'rsatamiz
        messages.warning(request, "Bu akkaunt restoran xodimi emas. Xodim akkaunti bilan qayta kiring.")
        return render(request, 'restaurant_admin/login.html', {'next': next_url})

    if request.method == 'POST':
        from backend import login_guard
        username = request.POST.get('username', '').strip()
        if login_guard.is_locked(request, username):
            messages.error(request, login_guard.LOCK_MESSAGE)
            return render(request, 'restaurant_admin/login.html', {'next': next_url})

        password = request.POST.get('password', '').strip()
        user = authenticate(request, username=username, password=password)
        # Ofitsiant/oshpaz/hostess akkauntini rahbariyat yaratadi — "sotuvchi tasdig'i" (is_approved) talab qilinmaydi
        approved = bool(user) and (getattr(user, 'is_approved', False) or user_role(user) in ('waiter', 'kitchen', 'hostess'))
        if user and approved and is_restaurant_staff(user):
            login_guard.record_success(request, username, user, scope='restaurant')
            login(request, user)
            return _after_login_redirect(user)
        login_guard.record_failure(request, username, scope='restaurant')
        messages.error(request, 'Login yoki parol xato yoki hisob tasdiqlanmagan.')

    return render(request, 'restaurant_admin/login.html', {'next': next_url})


def restaurant_admin_logout(request):
    """Restoran adminidan chiqish."""
    from django.contrib.auth import logout
    from django.contrib import messages
    logout(request)
    messages.info(request, "Boshqaruv panelidan chiqdingiz.")
    return redirect('restaurant_root')


# ==============================================================================
# YANGI REPLIT PROTOTIP EKRANLARI (WARM CREAM & FOREST GREEN)
# ==============================================================================

def _featured_dishes(shop, limit=8):
    """Yangi bosh sahifa uchun rasmli taomlar: avval "tavsiya" belgilanganlar, keyin qolganlari (soni cheklangan)."""
    if not shop:
        return []
    rows = (Product.objects.filter(shop=shop, is_available=True, is_deleted=False)
            .exclude(image='').select_related('model3d').order_by('-is_featured', 'id')[:limit])
    return [{
        'id': p.id,
        'name': p.name,
        'description': (p.description or '')[:110],
        'price': float(p.price),
        'image': p.image.url,
        'has_3d': bool(p.has_3d and p.ar_model),
        'is_popular': bool(p.is_featured),
    } for p in rows]


def tma_welcome(request):
    """
    Ekran 2: Guliston-Welcome-Entry.png
    QR scanner, NFC teginish va qo'lda stol raqamini kiritish orqali ulanish sahifasi.
    """
    shop = get_restaurant_shop()
    table, table_token = _get_tma_table(request)
    cart = request.session.get('cart', {})
    cart_count = _calculate_cart_count(cart)
    react_welcome_data = {
        'shop': {'name': shop.name if shop else 'Guliston'},
        'table': {
            'number': str(table.number) if table else '',
            'hall': table.hall.name if (table and table.hall) else 'Asosiy Zal',
        },
        'cartCount': cart_count,
        'allow_table_number': bool(getattr(settings, 'RESTAURANT_ALLOW_TABLE_NUMBER_URL', False)),
        'featured': _featured_dishes(table.shop if (table and table.shop) else shop),
    }

    context = {
        'shop': shop,
        'table': table,
        'table_token': table_token,
        'cart_count': cart_count,
        'proto_active': 'welcome',
        'react_welcome_data_json': json.dumps(react_welcome_data),
    }
    return render(request, 'tma/welcome.html', context)


@ensure_csrf_cookie
def tma_arrival_confirm(request):
    """
    Ekran 3: Mehmon kelganini tasdiqlash sahifasi.
    Mehmon bron kodi bilan o'zi kelganini bildiradi: bron 'arrived' bo'ladi va sessiyaga bron qilingan stol
    (tasodifiy QR token orqali) yoziladi — stol raqamini mehmon o'zi yozmaydi (TZ: R4-3, R1-10).
    """
    from tables_restaurant import reservations as reservation_svc
    from tables_restaurant.models import TableReservation

    shop = get_restaurant_shop()
    code = (request.GET.get('code') or request.POST.get('code') or ('GS-2841' if settings.DEMO_MODE else '')).strip()
    error = ''

    res_obj = None
    if shop and code:
        res_obj = find_reservation_by_code_or_phone(
            TableReservation.objects.filter(shop=shop, is_deleted=False).select_related('table', 'hall'), code)

    if request.method == 'POST':
        phone = (request.POST.get('phone') or '').strip()
        if res_obj and phone:          # telefon ham berilsa, kod bilan mos kelishi shart
            digits = ''.join(ch for ch in phone if ch.isdigit())
            if not ''.join(ch for ch in res_obj.customer_phone if ch.isdigit()).endswith(digits[-9:]):
                res_obj = None
        if settings.DEMO_MODE and not res_obj and request.POST.get('table'):
            # Demo: eski xatti-harakat (stol raqami bilan), production'da ishlamaydi
            request.session['tma_table_token'] = request.POST.get('table')
            request.session.modified = True
            return redirect(f"/menu/?table={request.POST.get('table')}&arrived=1")
        if not res_obj:
            error = "Bron topilmadi. Kodni tekshirib qayta urinib ko'ring."
        elif res_obj.reservation_date != timezone.localdate():
            error = f"Bu bron {res_obj.reservation_date.strftime('%d.%m.%Y')} sanasiga. Kelish kuni qayta urining."
        elif res_obj.status in ('completed', 'cancelled'):
            error = "Bu bron yakunlangan yoki bekor qilingan."
        elif not res_obj.table:
            error = "Bronga hali stol biriktirilmagan. Iltimos, hostess bilan bog'laning."
        else:
            try:
                if res_obj.status in ('pending', 'confirmed'):
                    reservation_svc.change_status(shop, res_obj.pk, 'arrived')
            except reservation_svc.ReservationError as exc:
                error = exc.message
            else:
                request.session['tma_table_token'] = str(res_obj.table.qr_token)
                request.session.modified = True
                return redirect(f"/menu/?table={res_obj.table.qr_token}&arrived=1")

    if res_obj and res_obj.status not in ('completed', 'cancelled'):
        reservation = {
            'id': res_obj.pk,
            'customer_name': mask_name(res_obj.customer_name),
            'code': res_obj.code,
            'reservation_time': res_obj.reservation_time.strftime('%H:%M'),
            'guests_count': res_obj.guests_count,
            'table_number': str(res_obj.table.number) if res_obj.table else '',
            'hall': res_obj.hall.name if res_obj.hall else (res_obj.table.hall.name if res_obj.table and res_obj.table.hall else ''),
        }
    elif settings.DEMO_MODE:
        reservation = {
            'customer_name': 'Muhayyo Karimova',
            'code': code,
            'reservation_time': '19:30',
            'guests_count': 4,
            'table_number': request.GET.get('table') or '08',
        }
    else:
        reservation = None

    react_reservation_data = {
        'shop': {'name': shop.name if shop else 'Guliston'},
        'mode': 'arrival',
        'reservation': reservation,
        'error': error,
    }

    context = {
        'shop': shop,
        'reservation': reservation,
        'proto_active': 'arrival',
        'react_reservation_data_json': json.dumps(react_reservation_data),
    }
    return render(request, 'tma/arrival_confirm.html', context)


@ensure_csrf_cookie
def tma_find_reservation(request):
    """
    Ekran 4: bron kodi (GS-K7QX2) yoki to'liq telefon orqali qidirish sahifasi. Ism/telefon maskalanadi.
    """
    from backend.ratelimit import rate_limited
    from tables_restaurant import reservations as reservation_svc
    from tables_restaurant.models import TableReservation
    shop = get_restaurant_shop()
    query = (request.GET.get('q') or request.GET.get('code') or request.GET.get('phone') or '').strip()
    found_res = None
    if query and shop:
        if rate_limited(request, 'reservation_find', 20, 60) is not None:
            query = ''          # juda tez-tez qidirilmoqda: natija ko'rsatilmaydi
        else:
            found_res = find_reservation_by_code_or_phone(
                TableReservation.objects.filter(shop=shop, is_deleted=False).select_related('table', 'hall'), query)

    res_data = None
    if found_res:
        res_data = reservation_svc.serialize(found_res, mask=True)
        res_data['status'] = found_res.get_status_display()

    react_reservation_data = {
        'shop': {'name': shop.name if shop else 'Guliston'},
        'mode': 'find',
        'query': query,
        'reservation': res_data,
    }

    context = {
        'shop': shop,
        'query': query,
        'found_res': found_res,
        'proto_active': 'find',
        'react_reservation_data_json': json.dumps(react_reservation_data),
    }
    return render(request, 'tma/find_reservation.html', context)


@restaurant_staff_required(capability='reservations')
def arrival_desk(request):
    """
    Ekran 5: Hostess / Kutib olish paneli. Bugungi faol bronlar (kutilmoqda, keldi, o'tirdi) — vaqt tartibida.
    Avval barcha (o'tmishdagi va bekor qilingan ham) bronlar chiqar, bekor qilingan bron "keldi" ko'rinardi.
    """
    from tables_restaurant import reservations as reservation_svc

    shop = staff_shop(request)
    rows = reservation_svc.list_reservations(shop, date='today', status='active') if shop else []

    react_hostess_data = {
        'shop': {'name': shop.name if shop else 'Guliston'},
        'hostess_name': (request.user.get_full_name() or request.user.username) if request.user.is_authenticated else '',
        'guests': [reservation_svc.serialize(r) for r in rows],
    }

    context = {
        'shop': shop,
        'reservations': rows[:10],
        'proto_active': 'desk',
        'react_hostess_data_json': json.dumps(react_hostess_data),
    }
    return render(request, 'seller/arrival_desk.html', context)


@restaurant_staff_required(capability='reservations')
def arrival_timeline(request):
    """
    Ekran 6: Explore-different-approaches.png
    Vaqt shkalasi bo'yicha tashriflar kuzatuvi (19:30, 19:45, 20:00, 20:15).
    """
    return arrival_desk(request)


@restaurant_staff_required(capability='reservations')
def arrival_checklist(request):
    """
    Ekran 7: Coordinate-large-party-arrivals.png
    Katta guruhlar kelishidan oldin 3 ta muhim tekshiruv (Before they arrive).
    """
    return arrival_desk(request)


@restaurant_staff_required(capability='pos')
def waiter_mobile_panel(request):
    """
    Ekran 8: Guliston-Ofitsiant-Paneli.png (Rahbar / Ofitsiant uchun ixcham mobil boshqaruv).
    Stollar holati, chaqiruvlar, buyurtma qo'shish va kassa/hisob boshqaruvi.
    """
    from tables_restaurant.models import Table
    shop = staff_shop(request)
    tables_qs = Table.objects.filter(shop=shop, is_active=True).select_related('hall')

    react_tables = []
    for t in tables_qs:
        react_tables.append({
            'id': t.id,
            'number': str(t.number),
            'hall': t.hall.name if t.hall else 'Asosiy Zal',
            'status': t.status,
            'guests_count': getattr(t, 'capacity', 4),
            'total_bill': 0,
            'active_orders_count': 0,
        })

    react_waiter_data = {
        'shop': {'name': shop.name if shop else 'Guliston'},
        'waiter_name': request.user.get_full_name() or request.user.username if request.user.is_authenticated else 'Alisher (Navbatchi)',
        'tables': react_tables,
    }

    context = {
        'shop': shop,
        'proto_active': 'waiter',
        'react_waiter_data_json': json.dumps(react_waiter_data),
    }
    return render(request, 'seller/waiter_mobile.html', context)


def tma_ar_menu(request):
    """
    3D / AR Interaktiv Taomlar Menyusi (/ar/).
    Model-viewer orqali taomlarni 360 gradusda va stol ustida ko'rish imkoniyati.
    """
    table, table_token = _get_tma_table(request)
    shop = table.shop if (table and table.shop) else get_restaurant_shop()

    # Faqat shu restoranning taomlari (avval butun platformadagi — boshqa do'konlarning mahsulotlari va kategoriyalari
    # ham restoran AR menyusida chiqardi). 3D modelga ega taomlar birinchi, bo'lmasa shu restoranning faol taomlari.
    base = Product.objects.filter(shop=shop, is_available=True, is_deleted=False) if shop else Product.objects.none()
    products = base.filter(has_3d=True).select_related('shop', 'category')
    if not products.exists():
        products = base.select_related('shop', 'category')

    cat_ids = products.values_list('category_id', flat=True).distinct()
    categories = Category.objects.filter(id__in=cat_ids).exclude(id__isnull=True)

    cart = request.session.get('cart', {})
    cart_count = 0
    try:
        cart_count = sum(int(item.get('quantity', 1)) for items in cart.values() for item in items.values())
    except Exception:
        cart_count = 0

    react_products = []
    for p in products:
        react_products.append({
            'id': p.id,
            'name': p.name,
            'description': p.description or '',
            'price': float(p.price),
            'old_price': float(p.old_price) if p.old_price else None,
            'image': p.image.url if p.image else '',
            'category_id': p.category_id,
            'category_name': p.category.name if p.category else '',
            'has_3d': True,
            'ar_model': p.ar_model or '',
            'unit': p.unit or 'dona',
            'is_halal': bool(p.is_halal),
            'is_popular': bool(p.is_featured),
        })

    from collections import Counter
    per_category = Counter(p.category_id for p in products)
    react_categories = []
    for c in categories:
        react_categories.append({
            'id': c.id,
            'name': c.name,
            'icon': getattr(c, 'icon', '') or '✨',
            'count': per_category.get(c.id, 0),
        })

    flat_cart = {}
    for s_items in cart.values():
        for pid_str, item in s_items.items():
            try:
                flat_cart[int(pid_str)] = int(item.get('quantity', 1))
            except (ValueError, TypeError):
                pass

    react_ar_data = {
        'shop': {'name': shop.name if shop else 'Guliston'},
        'table': {
            'number': str(table.number) if table else '',
            'hall': table.hall.name if (table and table.hall) else 'Asosiy Zal',
        },
        'categories': react_categories,
        'products': react_products,
        'cart': flat_cart,
        'cartCount': cart_count,
    }

    context = {
        'shop': shop,
        'products': products,
        'categories': categories,
        'cart_count': cart_count,
        'table': table,
        'table_token': table_token,
        'tma_active_tab': 'ar',
        'react_ar_data_json': json.dumps(react_ar_data),
    }
    return render(request, 'tma/ar_menu.html', context)


def ui_components_showcase(request):
    """
    Senior UI/UX Component Laboratory & Design System Showcase (/ui-components/).
    Barcha 12 ta reusable UI komponentni ko'rish, tanlash va test qilish sahifasi.
    Dizayn tizimi laboratoriyasi mehmonga kerak emas: faqat DEBUG/DEMO_MODE da ochiladi (production'da 404).
    """
    if not (settings.DEBUG or settings.DEMO_MODE):
        from django.http import Http404
        raise Http404
    shop = get_restaurant_shop()
    table, table_token = _get_tma_table(request)

    # Showcase uchun demo taomlar
    demo_products = Product.objects.filter(is_available=True).select_related('shop', 'category')[:4]
    if not demo_products.exists():
        demo_products = Product.objects.all()[:4]

    categories = Category.objects.filter(is_active=True)[:5]

    context = {
        'shop': shop,
        'table': table,
        'table_token': table_token,
        'demo_products': demo_products,
        'categories': categories,
        'tma_active_tab': 'menu',
    }
    return render(request, 'tma/ui_showcase.html', context)


def _serialize_kds_orders(orders_qs):
    res = []
    for o in orders_qs:
        table_str = f"Stol {o.table.number}" if getattr(o, 'table', None) else "Stol belgilanmagan"
        if getattr(o, 'table', None) and getattr(o.table, 'hall', None):
            table_str += f" ({o.table.hall.name})"
        
        items_list = []
        for it in o.items.all():
            items_list.append({
                'id': it.id,
                'name': it.product_name,
                'quantity': it.quantity,
                'unit': it.unit or 'dona',
            })
        
        res.append({
            'id': o.id,
            'order_number': f"#{o.order_number}" if not str(o.order_number).startswith('#') else str(o.order_number),
            'table_name': table_str,
            'customer_name': o.customer_name or 'Mehmon',
            'status': o.status,
            'created_at': o.created_at.isoformat() if getattr(o, 'created_at', None) else '',
            'notes': o.notes or '',
            'items': items_list,
        })
    return res


@restaurant_staff_required(capability='kds_screen')
def kds_screen(request):
    """
    KDS Oshxona Ekrani (Kitchen Display System):
    Oshpazlar uchun buyurtmalar kartochkalari, tayyorlash vaqti va taomlar ro'yxati.
    """
    from orders.models import Order
    shop = staff_shop(request)
    active_orders = Order.objects.filter(
        shop=shop, status__in=['pending', 'confirmed', 'preparing', 'ready']
    ).select_related('table', 'table__hall').prefetch_related('items').order_by('created_at')

    serialized_orders = _serialize_kds_orders(active_orders)

    count_pending = sum(1 for o in serialized_orders if o['status'] in ('pending', 'confirmed'))
    count_preparing = sum(1 for o in serialized_orders if o['status'] == 'preparing')
    count_ready = sum(1 for o in serialized_orders if o['status'] == 'ready')

    react_kds_data = {
        'shop': {'name': shop.name if shop else 'Guliston Restoran'},
        'orders': serialized_orders,
        'count_pending': count_pending,
        'count_preparing': count_preparing,
        'count_ready': count_ready,
    }

    import json
    return render(request, 'tma/kds.html', {
        'shop': shop,
        'react_kds_data_json': json.dumps(react_kds_data, ensure_ascii=False),
    })


@restaurant_staff_required(api=True, capability='kds')
def kds_orders_api(request):
    """KDS uchun polling JSON API: har 10 soniyada yangi buyurtmalarni oladi."""
    from orders.models import Order
    from django.http import JsonResponse
    shop = staff_shop(request)
    active_orders = Order.objects.filter(
        shop=shop, status__in=['pending', 'confirmed', 'preparing', 'ready']
    ).select_related('table', 'table__hall').prefetch_related('items').order_by('created_at')

    serialized_orders = _serialize_kds_orders(active_orders)
    return JsonResponse({'orders': serialized_orders, 'status': 'ok'})


# Rol bo'yicha o'tkazish mumkin bo'lgan holatlar (R2): oshpaz faqat pishirish bosqichlarini, ofitsiant stolga berish
# va bekor qilishni boshqaradi; rahbariyat hammasini.
KDS_ROLE_STATUSES = {
    'kitchen': {'confirmed', 'preparing', 'ready'},
    'waiter': {'confirmed', 'delivered', 'cancelled'},
}


@restaurant_staff_required(api=True, capability='kds')
def kds_status_update_api(request):
    """KDS kartochkasidagi statusni o'zgartirish (state machine yoki xavfsiz o'tish)."""
    import json
    from django.http import JsonResponse
    from orders.models import Order
    from orders.state_machine import transition_order

    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)

    try:
        body = json.loads(request.body.decode('utf-8'))
    except Exception:
        body = request.POST

    order_id = body.get('order_id')
    new_status = body.get('new_status')

    if not order_id or not new_status:
        return JsonResponse({'error': 'order_id va new_status talab qilinadi'}, status=400)
    allowed = KDS_ROLE_STATUSES.get(user_role(request.user))
    if allowed is not None and new_status not in allowed:
        return JsonResponse({'ok': False, 'error': "Bu holatni o'zgartirish sizning rolingiz uchun ruxsat etilmagan"}, status=403)

    try:
        # Faqat o'z restoranining buyurtmasi; status faqat state machine orqali o'zgaradi
        order = Order.objects.get(pk=order_id, shop=staff_shop(request))
        # Oshxona "tayyorlashni boshlash"ni bosganda buyurtma hali 'pending' bo'lishi mumkin: state machine
        # to'g'ridan-to'g'ri o'tishga ruxsat bermaydi, shuning uchun avval 'confirmed' qilinadi.
        if order.status == 'pending' and new_status in ('preparing', 'ready'):
            transition_order(order, 'confirmed', actor=request.user, reason='KDS: oshxona qabul qildi', request=request)
            order.refresh_from_db()
        ok, msg = transition_order(
            order, new_status,
            actor=request.user,
            reason='KDS oshxona ekrani orqali yangilandi',
            request=request
        )
        if not ok:
            return JsonResponse({'ok': False, 'error': msg, 'status': order.status}, status=409)

        if new_status == 'ready' and order.table_id:
            # Ofitsiant paneliga "Oshxonadan taom tayyor" chaqiruvi (ofitsiant boshqa qurilmada bo'lishi mumkin)
            from tables_restaurant.models import ServiceCall
            if not ServiceCall.objects.filter(table=order.table, call_type='dish_ready', status='pending').exists():
                dishes = ', '.join(f"{it.quantity}x {it.product_name}" for it in order.items.all()[:2])
                ServiceCall.objects.create(
                    shop=order.shop, table=order.table, call_type='dish_ready',
                    title=f"Oshxonadan taom tayyor: {dishes}", status='pending',
                )

        return JsonResponse({'ok': True, 'message': msg, 'status': order.status})
    except Order.DoesNotExist:
        return JsonResponse({'error': 'Buyurtma topilmadi'}, status=404)






