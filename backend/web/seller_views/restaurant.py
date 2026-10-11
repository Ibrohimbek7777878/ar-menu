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
                # 4-QOIDA: Soft delete & arxivlash
                t.is_active = False
                t.save(update_fields=['is_active'])
                messages.success(request, f"Stol #{num} arxivlandi va yashirildi.")
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
    """NFC kartani arxivlash va o'chirish (Soft delete)."""
    from tables_restaurant.models import NFCCard
    shop = request.tenant_shop
    card = get_object_or_404(NFCCard, pk=pk, shop=shop)
    card_name = card.name
    # 4-QOIDA: Soft delete & arxivlash
    card.is_active = False
    card.save(update_fields=['is_active'])
    messages.success(request, f"'{card_name}' arxivlandi va yashirildi.")
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
                    # 4-QOIDA: Soft toggle/status update (Ma'lumot o'chirilmaydi)
                    Product3DModel.objects.filter(product=p).update(status='none')
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
                # 4-QOIDA: Soft toggle/status update (Ma'lumot o'chirilmaydi)
                Product3DModel.objects.filter(product=p).update(status='none')
                messages.success(request, f"'{p.name}' dan AR model yashirildi.")
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

