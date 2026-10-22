"""
Application Service / Use-Cases for Restaurant Orders.
Handles orchestration, atomic transactions, and single-request logic.
"""
from decimal import Decimal
from typing import Dict, Any, List
import datetime
from django.conf import settings
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
from orders.numbering import next_order_number
from orders.timeutils import local_today


class RestaurantOrderService:
    @staticmethod
    def get_or_default_shop() -> Shop:
        """Mehmon menyusi bilan bir xil restoran (avval "birinchi ochiq do'kon" — boshqa restoran bo'lishi mumkin edi)."""
        from notifications.admin_bot import get_restaurant_shop
        shop = get_restaurant_shop()
        if not shop:
            shop = Shop.objects.filter(is_open=True).first() or Shop.objects.first()
        return shop

    @staticmethod
    def service_fee_percent() -> Decimal:
        """Xizmat haqi foizi sozlamadan (TZ qarori Q2: default 0)."""
        try:
            return Decimal(str(getattr(settings, 'RESTAURANT_SERVICE_FEE_PERCENT', '0') or '0'))
        except Exception:
            return Decimal('0')

    @classmethod
    def service_fee_for(cls, subtotal: Decimal) -> Decimal:
        return (subtotal * cls.service_fee_percent()) / Decimal('100')

    @staticmethod
    def _parse_quantity(raw) -> int:
        try:
            qty = int(raw)
        except (TypeError, ValueError):
            raise ValueError("Taom miqdori noto'g'ri")
        if qty < 1 or qty > 100:
            raise ValueError("Taom miqdori 1 dan 100 gacha bo'lishi kerak")
        return qty

    @classmethod
    def resolve_menu_item(cls, shop: Shop, item: Dict[str, Any]) -> Dict[str, Any]:
        """
        Narx va nom FAQAT serverdagi mahsulotdan olinadi (TZ: R-SEC-07).
        Mijoz yuborgan 'price' e'tiborsiz qoldiriladi; boshqa do'kon yoki o'chirilgan mahsulot rad etiladi.
        """
        if not isinstance(item, dict):
            raise ValueError("Noto'g'ri taom ma'lumoti")
        product_id = item.get('product_id') or item.get('id')
        try:
            product_id = int(product_id)
        except (TypeError, ValueError):
            raise ValueError("Taom menyuda topilmadi")
        product = Product.objects.filter(
            pk=product_id, shop=shop, is_available=True, is_deleted=False
        ).first()
        if not product:
            raise ValueError("Taom menyuda topilmadi yoki hozir mavjud emas")
        qty = cls._parse_quantity(item.get('quantity', 1))
        return {
            'product': product,
            'name': product.name,
            'price': product.price,
            'quantity': qty,
            'unit': product.unit or 'dona',
            'course': str(item.get('course') or '2-taom')[:20],
            'notes': str(item.get('notes') or '')[:255],
        }

    @classmethod
    @transaction.atomic
    def create_order(cls, payload: Dict[str, Any], shop: Shop = None) -> Order:
        """
        Bitta so'rov bilan buyurtma yaratish:
        1. Buyurtmani bazaga yozadi.
        2. Taomlarni (OrderItem) ketma-ketlik va izohlari bilan biriktiradi.
        3. Stol statusini 'occupied' (band) ga o'tkazadi.
        """
        table_num = str(payload.get('table_number', '01'))
        customer_name = str(payload.get('customer_name') or 'Mehmon')[:120]
        customer_phone = str(payload.get('phone') or '')[:20]
        notes = str(payload.get('notes') or '')[:1000]
        items_data = payload.get('items', [])

        shop = shop or cls.get_or_default_shop()

        # Narxlar serverdan; bo'sh yoki noma'lum taomli buyurtma qabul qilinmaydi
        if not isinstance(items_data, list) or not items_data:
            raise ValueError("Buyurtmada taom yo'q")
        resolved_items = [cls.resolve_menu_item(shop, it) for it in items_data]

        # Stol faqat shu restoranning o'zidan (boshqa restoranning shu raqamli stoli emas)
        table_obj = Table.objects.filter(shop=shop, number=table_num, is_active=True).first()

        # Buyurtma raqamini generatsiya qilish
        order_number = next_order_number()

        subtotal = sum((it['price'] * it['quantity'] for it in resolved_items), Decimal('0'))
        service_fee = cls.service_fee_for(subtotal)
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

        for it in resolved_items:
            OrderItem.objects.create(
                order=order,
                product=it['product'],
                product_name=it['name'],
                price=it['price'],
                quantity=it['quantity'],
                unit=it['unit'],
                total=it['price'] * it['quantity'],
                course=it['course'],
                notes=it['notes'],
                is_done=False
            )

        # Stol holatini yangilash
        if table_obj and table_obj.status == 'free':
            table_obj.status = 'occupied'
            table_obj.save(update_fields=['status'])

        return order

    @classmethod
    @transaction.atomic
    def settle_table_bill(cls, table_number: str, payment_method: str = 'cash', shop: Shop = None, actor=None) -> Dict[str, Any]:
        """
        Bitta so'rov bilan stol hisobini yopish (Atomic Single-Request):
        1. Stolga tegishli barcha ochiq buyurtmalarni 'paid' qiladi.
        2. Stolni 'free' holatga qaytaradi.
        3. Stoldan tushgan summani Moliya (FinanceTransaction) kassasiga avtomatik KIRIM qiladi!
        4. Ochiq chaqiruvlarni yopadi.

        TZ R-WTR-04: avval buyurtmalar faqat stol RAQAMI bo'yicha tanlanardi — "5-stol" yopilsa
        platformadagi BARCHA restoranlarning 5-stollari (bekor qilinganlari ham) "to'landi" bo'lardi.
        Endi: faqat shu restoran, faqat shu stol, bekor qilinmagan buyurtmalar, qator qulfi bilan.
        """
        shop = shop or cls.get_or_default_shop()
        if payment_method not in dict(FinanceTransaction.PAYMENT_CHOICES):
            payment_method = 'cash'
        table_obj = Table.objects.filter(shop=shop, number=str(table_number), is_active=True).first()
        if not table_obj:
            return {
                'table_number': table_number, 'total_settled': 0.0, 'payment_method': payment_method,
                'orders_closed': [], 'status': 'not_found', 'error': 'Stol topilmadi',
            }

        # Ochiq buyurtmalarni topish (parallel yopishda ikki marta hisoblanmasligi uchun qulf)
        unpaid_orders = Order.objects.select_for_update().filter(
            shop=shop,
            table=table_obj,
            payment_status__in=['unpaid', 'pending'],
        ).exclude(status__in=['cancelled', 'failed'])

        from finance.services.order_integration import record_order_payment_income

        total_settled = Decimal('0')
        order_numbers = []

        for ord_obj in unpaid_orders:
            total_settled += ord_obj.final_amount
            order_numbers.append(ord_obj.order_number)
            ord_obj.payment_status = 'paid'
            ord_obj.status = 'delivered'
            ord_obj.delivered_at = ord_obj.delivered_at or timezone.now()
            ord_obj.save(update_fields=['payment_status', 'status', 'delivered_at'])
            # Har bir buyurtma o'ziga bog'langan BITTA kirim bo'ladi, to'lov turi (naqd/karta) to'g'ri yoziladi.
            # Avval stol bo'yicha bitta bog'lanmagan yozuv yozilardi va "yetkazildi" hooki yana kirim qo'shardi.
            record_order_payment_income(ord_obj, payment_method=payment_method, actor=actor)

        # Stolni bo'shatish
        table_obj.status = 'free'
        table_obj.save(update_fields=['status'])

        # Chaqiruvlarni yopish (faqat shu stol)
        ServiceCall.objects.filter(table=table_obj, status__in=['pending', 'accepted']).update(status='done')

        return {
            'table_number': table_number,
            'total_settled': float(total_settled),
            'payment_method': payment_method,
            'orders_closed': order_numbers,
            'status': 'success'
        }

    @classmethod
    @transaction.atomic
    def add_item_to_table(cls, table_number: str, item_data: Dict[str, Any], shop: Shop = None) -> Dict[str, Any]:
        """
        4-Modul: Ofitsiant ochiq stolga yangi taom qo'shishi:
        1. Mavjud ochiq to'lanmagan buyurtmani topadi yoki yangi buyurtma ochadi.
        2. Taomni qo'shadi, hisobni va 10% xizmat haqini yangilaydi.
        3. Stol statusini 'occupied' qilib yangilaydi.
        """
        table_num = str(table_number)
        shop = shop or cls.get_or_default_shop()

        table_obj = Table.objects.filter(shop=shop, number=table_num, is_active=True).first()
        if not table_obj:
            raise ValueError("Stol topilmadi")

        active_order = Order.objects.select_for_update().filter(
            shop=shop,
            table=table_obj,
            payment_status__in=['unpaid', 'pending'],
        ).exclude(status__in=['cancelled', 'failed']).order_by('-created_at').first()

        # Narx va nom serverdagi mahsulotdan (TZ: R-SEC-07)
        item = cls.resolve_menu_item(shop, item_data)
        item_name = item['name']
        price = item['price']
        qty = item['quantity']
        course = item['course']
        notes = item['notes']
        product_id = item['product'].pk

        if not active_order:
            order_number = next_order_number()
            subtotal = price * qty
            service_fee = cls.service_fee_for(subtotal)
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
            service_fee_add = cls.service_fee_for(subtotal_add)
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
    def get_reservations(cls, filters: Dict[str, Any] = None, shop: Shop = None) -> List[Dict[str, Any]]:
        """
        1-Modul: Hostess uchun bronlar ro'yxati (faqat o'z restorani). Standart: bugun, faol holatlar.
        Mantiq tables_restaurant/reservations.py da (R4).
        """
        from tables_restaurant import reservations as svc
        filters = filters or {}
        shop = shop or cls.get_or_default_shop()
        rows = svc.list_reservations(shop, date=filters.get('date'), status=filters.get('status'), q=filters.get('q'))
        return [svc.serialize(r) for r in rows]

    @classmethod
    def create_reservation(cls, payload: Dict[str, Any], shop: Shop = None, by_staff: bool = False) -> Dict[str, Any]:
        """
        1-Modul: Yangi stol band qilish. Sana/vaqt qat'iy tekshiriladi, to'qnashuv bo'lmaydi, stol berilmasa
        o'zi tanlanadi. Mehmon yaratgan bron doim 'pending'; xodim 'confirmed' yoki jonli mehmon (walk-in) qo'sha oladi.
        `ReservationError` ko'tarishi mumkin (chaqiruvchi 400/409 qiladi).
        """
        from tables_restaurant import reservations as svc
        shop = shop or cls.get_or_default_shop()
        return svc.serialize(svc.create_reservation(shop, payload, by_staff=by_staff))

    @classmethod
    def update_reservation_status(cls, reservation_id: int, new_status: str, shop: Shop = None,
                                  table_number=None) -> Dict[str, Any]:
        """
        1-Modul: Bron holatini o'zgartirish (pending → confirmed → arrived → seated → completed; cancelled).
        `ReservationError` ko'tarishi mumkin.
        """
        from tables_restaurant import reservations as svc
        shop = shop or cls.get_or_default_shop()
        reservation = svc.change_status(shop, reservation_id, new_status, table_number=table_number)
        return svc.serialize(reservation)

    @classmethod
    @transaction.atomic
    def save_product_3d_scan(cls, payload: Dict[str, Any], product_id: int = None, shop: Shop = None) -> Dict[str, Any]:
        """
        2-Modul: 3D Fotogrammetriya va 360 Spin Frame ma'lumotlarini saqlash (faqat o'z restorani mahsuloti).
        """
        shop = shop or cls.get_or_default_shop()
        spin_frames = payload.get('spin_frames') or []
        ar_model = payload.get('ar_model') or '/models/plov.glb'

        if product_id:
            product = Product.objects.filter(pk=product_id, shop=shop).first()
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
        # Faqat shu restoranning taomlari (avval barcha do'konlar mahsulotlari aralashardi — TZ R-GST-07)
        products = Product.objects.filter(
            shop=shop, is_available=True, is_deleted=False,
        ).select_related('category', 'shop', 'model3d').order_by('category__sort_order', '-is_featured', 'name')
        products = list(products)
        from collections import Counter
        cat_counts = Counter(p.category_id for p in products)
        categories = Category.objects.filter(id__in=cat_counts.keys(), is_active=True).order_by('sort_order', 'id')

        cat_data = []
        for c in categories:
            count = cat_counts.get(c.id, 0)
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
                # Rasm yoki 3D yo'q bo'lsa — bo'sh (avval osh rasmi va plov.glb qo'yilardi: boshqa taom ko'rsatilardi)
                'image': p.image.url if p.image else '',
                'has_3d': bool(p.has_3d and p.ar_model),
                'ar_model': p.ar_model or '',
                'model_status': getattr(getattr(p, 'model3d', None), 'status', None) or 'none',
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
