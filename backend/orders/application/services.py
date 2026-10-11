"""
Application Service / Use-Cases for Restaurant Orders.
Handles orchestration, atomic transactions, and single-request logic.
"""
from decimal import Decimal
from typing import Dict, Any, List
from django.db import transaction
from django.utils import timezone
from orders.models import Order, OrderItem
from tables_restaurant.models import Table, ServiceCall
from finance.models import FinanceTransaction, FinanceCategory
from shops.models import Shop


class RestaurantOrderService:
    @staticmethod
    def get_or_default_shop() -> Shop:
        shop = Shop.objects.filter(is_active=True).first()
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
