"""
Application Service / Use-Cases for Restaurant Orders.
Handles orchestration, atomic transactions, and single-request logic.
"""
from decimal import Decimal
from typing import Dict, Any, List
import datetime
from django.db import transaction
from django.utils import timezone
from orders.models import Order, OrderItem
from tables_restaurant.models import Table, ServiceCall, TableReservation, Hall
from finance.models import FinanceTransaction, FinanceCategory
from shops.models import Shop
from products.models import Product
from categories.models import Category
from ar3d.models import Product3DModel
from notifications.outbox import OutboxService


class RestaurantOrderService:
    @staticmethod
    def get_or_default_shop() -> Shop:
        shop = Shop.objects.filter(is_open=True).first()
        if not shop:
            shop = Shop.objects.first()
        return shop

    @classmethod
    @transaction.atomic
    def create_order(cls, payload: Dict[str, Any]) -> Order:
        """
        Bitta so'rov bilan buyurtma yaratish:
        1. Buyurtmani bazaga yozadi.
        2. Taomlarni (OrderItem) ketma-ketlik va izohlari bilan biriktiradi.
        3. Stol statusini 'occupied' (band) ga o'tkazadi.
        """
        table_num = str(payload.get('table_number', '01'))
        customer_name = payload.get('customer_name', 'Mehmon')
        customer_phone = payload.get('phone', '')
        notes = payload.get('notes', '')
        items_data = payload.get('items', [])
        
        shop = cls.get_or_default_shop()

        # Stolni topish va band qilish
        table_obj = Table.objects.filter(shop=shop, number=table_num).first()
        if not table_obj:
            table_obj = Table.objects.filter(number=table_num).first()

        # Buyurtma raqamini generatsiya qilish
        order_count = Order.objects.count() + 101
        order_number = f"#{order_count}"

        # Summalarni hisoblash
        subtotal = Decimal('0')
        for it in items_data:
            p = Decimal(str(it.get('price', 0)))
            q = int(it.get('quantity', 1))
            subtotal += (p * q)

        # 10% xizmat haqi
        service_fee = (subtotal * Decimal('10')) / Decimal('100')
        final_amount = subtotal + service_fee

        order = Order.objects.create(
            order_number=order_number,
            customer_name=customer_name,
            customer_phone_1=customer_phone,
            shop=shop,
            table=table_obj,
            delivery_address=f"Stol #{table_num}",
            delivery_fee=Decimal('0'),
            notes=notes,
            total_amount=subtotal,
            final_amount=final_amount,
            status='pending',
            payment_status='unpaid',
            is_pickup=True,
        )

        for it in items_data:
            price = Decimal(str(it.get('price', 0)))
            qty = int(it.get('quantity', 1))
            OrderItem.objects.create(
                order=order,
                product_id=it.get('product_id') or None,
                product_name=it.get('name', 'Nomsiz taom'),
                price=price,
                quantity=qty,
                unit=it.get('unit', 'dona'),
                total=price * qty,
                course=it.get('course', '2-taom'),
                notes=it.get('notes', ''),
                is_done=False
            )

        # Stol holatini yangilash
        if table_obj and table_obj.status == 'free':
            table_obj.status = 'occupied'
            table_obj.save(update_fields=['status'])

        return order

    @classmethod
    @transaction.atomic
    def settle_table_bill(cls, table_number: str, payment_method: str = 'cash') -> Dict[str, Any]:
        """
        Bitta so'rov bilan stol hisobini yopish (Atomic Single-Request):
        1. Stolga tegishli barcha ochiq buyurtmalarni 'paid' qiladi.
        2. Stolni 'free' holatga qaytaradi.
        3. Stoldan tushgan summani Moliya (FinanceTransaction) kassasiga avtomatik KIRIM qiladi!
        4. Ochiq chaqiruvlarni yopadi.
        """
        shop = cls.get_or_default_shop()
        table_obj = Table.objects.filter(number=table_number).first()

        # Ochiq buyurtmalarni topish
        unpaid_orders = Order.objects.filter(
            table__number=table_number,
            payment_status__in=['unpaid', 'pending']
        )

        total_settled = Decimal('0')
        order_numbers = []

        for ord_obj in unpaid_orders:
            total_settled += ord_obj.final_amount
            order_numbers.append(ord_obj.order_number)
            ord_obj.payment_status = 'paid'
            ord_obj.status = 'delivered'
            ord_obj.save(update_fields=['payment_status', 'status'])

        # Agar buyurtma topilmasa lekin stol belgilangan bo'lsa
        if total_settled == 0 and unpaid_orders.exists():
            total_settled = sum((o.total_amount for o in unpaid_orders), Decimal('0'))

        # Moliya (FinanceTransaction) kassasiga avtomatik kirim yozish
        if total_settled > 0:
            category, _ = FinanceCategory.objects.get_or_create(
                shop=shop,
                name="Restoran Tushumi (Chek)",
                defaults={'category_type': 'income', 'icon': '🧾'}
            )
            FinanceTransaction.objects.create(
                shop=shop,
                category=category,
                tx_type='income',
                stage='income',
                amount=total_settled,
                payment_method=payment_method,
                title=f"Stol #{table_number} yopildi ({', '.join(order_numbers) or '#Chek'})",
                notes=f"To'lov turi: {payment_method.upper()}. Avtomatik chek hisobidan.",
                tx_date=timezone.now().date()
            )

        # Stolni bo'shatish
        if table_obj:
            table_obj.status = 'free'
            table_obj.save(update_fields=['status'])

        # Chaqiruvlarni yopish
        ServiceCall.objects.filter(table__number=table_number, status__in=['pending', 'accepted']).update(status='done')

        return {
            'table_number': table_number,
            'total_settled': float(total_settled),
            'payment_method': payment_method,
            'orders_closed': order_numbers,
            'status': 'success'
        }

    @classmethod
    @transaction.atomic
    def add_item_to_table(cls, table_number: str, item_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        4-Modul: Ofitsiant ochiq stolga yangi taom qo'shishi:
        1. Mavjud ochiq to'lanmagan buyurtmani topadi yoki yangi buyurtma ochadi.
        2. Taomni qo'shadi, hisobni va 10% xizmat haqini yangilaydi.
        3. Stol statusini 'occupied' qilib yangilaydi.
        """
        table_num = str(table_number)
        shop = cls.get_or_default_shop()

        table_obj = Table.objects.filter(shop=shop, number=table_num).first()
        if not table_obj:
            table_obj = Table.objects.filter(number=table_num).first()

        active_order = Order.objects.filter(
            table__number=table_num,
            payment_status__in=['unpaid', 'pending']
        ).order_by('-created_at').first()

        item_name = item_data.get('name', 'Taom')
        price = Decimal(str(item_data.get('price', 0)))
        qty = int(item_data.get('quantity', 1))
        course = item_data.get('course', '2-taom')
        notes = item_data.get('notes', '')
        product_id = item_data.get('product_id') or None

        if not active_order:
            order_count = Order.objects.count() + 101
            order_number = f"#{order_count}"
            subtotal = price * qty
            service_fee = (subtotal * Decimal('10')) / Decimal('100')
            active_order = Order.objects.create(
                order_number=order_number,
                customer_name='Ofitsiant buyurtmasi',
                shop=shop,
                table=table_obj,
                delivery_address=f"Stol #{table_num}",
                total_amount=subtotal,
                final_amount=subtotal + service_fee,
                status='pending',
                payment_status='unpaid',
                is_pickup=True,
            )
        else:
            subtotal_add = price * qty
            active_order.total_amount += subtotal_add
            service_fee_add = (subtotal_add * Decimal('10')) / Decimal('100')
            active_order.final_amount += (subtotal_add + service_fee_add)
            active_order.save(update_fields=['total_amount', 'final_amount', 'updated_at'])

        new_item = OrderItem.objects.create(
            order=active_order,
            product_id=product_id,
            product_name=item_name,
            price=price,
            quantity=qty,
            unit=item_data.get('unit', 'dona'),
            total=price * qty,
            course=course,
            notes=notes,
            is_done=False
        )

        if table_obj and table_obj.status == 'free':
            table_obj.status = 'occupied'
            table_obj.save(update_fields=['status'])

        OutboxService.log_event(
            event_type='order_item_added',
            payload={
                'order_id': active_order.id,
                'table_number': table_num,
                'item_id': new_item.id,
                'item_name': new_item.product_name,
                'total_bill': float(active_order.final_amount)
            }
        )

        return {
            'order_id': active_order.id,
            'order_number': active_order.order_number,
            'item_id': new_item.id,
            'item_name': new_item.product_name,
            'total_bill': float(active_order.final_amount),
            'status': 'success'
        }

    @classmethod
    def get_reservations(cls, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        1-Modul: Hostess va Mehmon uchun stol band qilish ro'yxati.
        """
        filters = filters or {}
        qs = TableReservation.objects.select_related('table', 'hall', 'shop').filter(is_deleted=False)

        date_val = filters.get('date')
        if date_val == 'today':
            qs = qs.filter(reservation_date=timezone.now().date())
        elif date_val:
            qs = qs.filter(reservation_date=date_val)

        status_val = filters.get('status')
        if status_val and status_val != 'all':
            qs = qs.filter(status=status_val)

        q = filters.get('q')
        if q:
            from django.db.models import Q
            qs = qs.filter(
                Q(customer_name__icontains=q) |
                Q(customer_phone__icontains=q) |
                Q(table__number__icontains=q)
            )

        reservations = []
        for r in qs[:100]:
            hall_name = r.hall.name if r.hall else (r.table.hall.name if r.table and r.table.hall else 'Asosiy Zal')
            reservations.append({
                'id': r.id,
                'code': r.code,
                'name': r.customer_name,
                'customer_name': r.customer_name,
                'phone': r.customer_phone,
                'customer_phone': r.customer_phone,
                'table_number': r.table_number,
                'hall': hall_name,
                'date': str(r.reservation_date),
                'time': r.reservation_time.strftime('%H:%M') if r.reservation_time else '19:00',
                'reservation_time': r.reservation_time.strftime('%H:%M') if r.reservation_time else '19:00',
                'guests_count': r.guests_count,
                'status': r.status,
                'notes': r.notes or '',
            })
        return reservations

    @classmethod
    @transaction.atomic
    def create_reservation(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        1-Modul: Yangi stol band qilish (Reservation)
        """
        shop = cls.get_or_default_shop()
        table_num = str(payload.get('table_number', '')).strip()
        table_obj = None
        if table_num:
            table_obj = Table.objects.filter(shop=shop, number=table_num).first()
            if not table_obj:
                table_obj = Table.objects.filter(number=table_num).first()

        hall_name = payload.get('hall_name') or payload.get('hall')
        hall_obj = None
        if hall_name:
            hall_obj = Hall.objects.filter(shop=shop, name__icontains=hall_name).first()

        date_val = payload.get('reservation_date') or payload.get('date')
        if not date_val or str(date_val).lower() == 'hozir':
            parsed_date = timezone.now().date()
        else:
            try:
                parsed_date = datetime.date.fromisoformat(str(date_val))
            except ValueError:
                parsed_date = timezone.now().date()

        time_val = payload.get('reservation_time') or payload.get('time')
        if not time_val or str(time_val).lower() == 'hozir':
            parsed_time = timezone.now().time()
        else:
            try:
                parts = str(time_val).split(':')
                parsed_time = datetime.time(int(parts[0]), int(parts[1]))
            except Exception:
                parsed_time = datetime.time(19, 0)

        res = TableReservation.objects.create(
            shop=shop,
            table=table_obj,
            hall=hall_obj,
            customer_name=payload.get('customer_name') or payload.get('name', 'Hurmatli Mehmon'),
            customer_phone=payload.get('customer_phone') or payload.get('phone', '+998 90 000 00 00'),
            guests_count=int(payload.get('guests_count', 2)),
            reservation_date=parsed_date,
            reservation_time=parsed_time,
            notes=payload.get('notes', ''),
            status=payload.get('status', 'pending')
        )

        OutboxService.log_event(
            event_type='reservation_created',
            payload={
                'reservation_id': res.id,
                'code': res.code,
                'customer_name': res.customer_name,
                'table_number': res.table_number
            }
        )

        return {
            'id': res.id,
            'code': res.code,
            'name': res.customer_name,
            'customer_name': res.customer_name,
            'phone': res.customer_phone,
            'customer_phone': res.customer_phone,
            'table_number': res.table_number,
            'hall': hall_name or 'Asosiy Zal',
            'date': str(res.reservation_date),
            'time': res.reservation_time.strftime('%H:%M'),
            'reservation_time': res.reservation_time.strftime('%H:%M'),
            'guests_count': res.guests_count,
            'status': res.status,
            'notes': res.notes,
        }

    @classmethod
    @transaction.atomic
    def update_reservation_status(cls, reservation_id: int, new_status: str) -> Dict[str, Any]:
        """
        1-Modul: Bron holatini o'zgartirish (arrived, seated, confirmed, cancelled).
        """
        res = TableReservation.objects.filter(pk=reservation_id).first()
        if not res:
            return {'error': 'Bron topilmadi', 'status': 'failed'}

        res.status = new_status
        if new_status == 'cancelled':
            res.is_deleted = False # soft-delete vs status
        res.save(update_fields=['status'])

        if new_status == 'seated' and res.table:
            res.table.status = 'occupied'
            res.table.save(update_fields=['status'])

        OutboxService.log_event(
            event_type='reservation_status_changed',
            payload={
                'reservation_id': res.id,
                'code': res.code,
                'status': new_status
            }
        )

        return {'id': res.id, 'status': res.status, 'code': res.code}

    @classmethod
    @transaction.atomic
    def save_product_3d_scan(cls, payload: Dict[str, Any], product_id: int = None) -> Dict[str, Any]:
        """
        2-Modul: 3D Fotogrammetriya va 360 Spin Frame ma'lumotlarini saqlash.
        """
        shop = cls.get_or_default_shop()
        spin_frames = payload.get('spin_frames') or []
        ar_model = payload.get('ar_model') or '/models/plov.glb'

        if product_id:
            product = Product.objects.filter(pk=product_id).first()
            if not product:
                return {'error': 'Mahsulot topilmadi', 'status': 'failed'}
        else:
            cat_name = payload.get('category_name', 'Asosiy taomlar')
            category = Category.objects.filter(name__icontains=cat_name).first()
            if not category:
                category = Category.objects.create(
                    name=cat_name,
                    name_uz=cat_name,
                    name_ru=cat_name,
                    icon='🍽️',
                    is_active=True
                )

            name = payload.get('name', 'Yangi 3D Taom')
            price = Decimal(str(payload.get('price', 45000)))
            desc = payload.get('description', '')
            img_val = payload.get('image') or (spin_frames[0] if spin_frames else '/media/dish/plov.jpg')

            import re
            slug_base = re.sub(r'[^a-zA-Z0-9]+', '-', name.lower()).strip('-') or 'dish-3d'
            slug = f"{slug_base}-{int(timezone.now().timestamp())}"

            product = Product.objects.create(
                shop=shop,
                category=category,
                name=name,
                slug=slug,
                price=price,
                description=desc,
                image=img_val,
                is_available=True,
                stock=50,
                has_3d=True,
                ar_model=ar_model,
            )

        # 360 spin freymlarini design_config ichiga yozish
        if not isinstance(product.design_config, dict):
            product.design_config = {}
        if spin_frames:
            product.design_config['spin_frames'] = spin_frames
        product.has_3d = True
        if ar_model:
            product.ar_model = ar_model
        product.save(update_fields=['design_config', 'has_3d', 'ar_model'])

        # Product3DModel bilan bog'lash
        p3d, _ = Product3DModel.objects.get_or_create(
            product=product,
            defaults={'status': 'ready', 'source': 'photogrammetry'}
        )
        p3d.status = 'ready'
        p3d.save(update_fields=['status'])

        return {
            'status': 'success',
            'product_id': product.id,
            'name': product.name,
            'has_3d': product.has_3d,
            'ar_model': product.ar_model,
            'spin_frames_count': len(spin_frames)
        }

    @classmethod
    def get_restaurant_menu(cls) -> Dict[str, Any]:
        """
        3-Modul: Dinamik Menyu va Katalog REST API (Pure SPA fallback).
        """
        shop = cls.get_or_default_shop()
        categories = Category.objects.filter(is_active=True).order_by('sort_order', 'id')
        products = Product.objects.filter(
            is_available=True,
            is_deleted=False
        ).select_related('category', 'shop').order_by('category__sort_order', '-is_featured', 'name')

        cat_data = []
        for c in categories:
            count = products.filter(category=c).count()
            cat_data.append({
                'id': c.id,
                'name': c.name,
                'icon': getattr(c, 'icon', '🍽️') or '🍽️',
                'order': c.sort_order,
                'count': count
            })

        prod_data = []
        for p in products:
            spin_frames = p.design_config.get('spin_frames') if isinstance(p.design_config, dict) else []
            prod_data.append({
                'id': p.id,
                'name': p.name,
                'price': float(p.price),
                'old_price': float(p.old_price) if p.old_price else None,
                'category_id': p.category_id,
                'category_name': p.category.name if p.category else 'Boshqa',
                'image': p.image.url if p.image else '/media/dish/plov.jpg',
                'has_3d': p.has_3d,
                'ar_model': p.ar_model or '/models/plov.glb',
                'spin_frames': spin_frames,
                'description': p.description,
                'unit': p.unit,
                'is_available': p.is_available,
                'rating': p.rating,
                'reviews_count': p.reviews_count,
            })

        return {
            'status': 'success',
            'shop': {
                'id': shop.id if shop else 1,
                'name': shop.name if shop else 'Guliston'
            },
            'categories': cat_data,
            'products': prod_data
        }
