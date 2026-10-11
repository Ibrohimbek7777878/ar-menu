import logging
from typing import Optional, Dict, Any, List
from django.db import transaction
from django.utils import timezone

from tables_restaurant.models import Table, ServiceCall, Hall
from shops.models import Shop

logger = logging.getLogger(__name__)


class RestaurantTableApplicationService:
    @staticmethod
    def get_restaurant_shop() -> Optional[Shop]:
        from notifications.admin_bot import get_restaurant_shop
        return get_restaurant_shop()

    @classmethod
    def list_tables(cls, shop_id: Optional[int] = None) -> List[Table]:
        qs = Table.objects.filter(is_active=True).select_related('hall', 'shop')
        if shop_id:
            qs = qs.filter(shop_id=shop_id)
        return list(qs.order_by('number'))

    @classmethod
    @transaction.atomic
    def occupy_table(cls, table_id: int, order_id: Optional[int] = None) -> Table:
        table = Table.objects.select_for_update().get(pk=table_id)
        table.status = 'occupied'
        table.is_occupied = True
        table.save(update_fields=['status', 'is_occupied'])
        logger.info(f"Stol #{table.number} band qilindi. Order ID: {order_id}")
        return table

    @classmethod
    @transaction.atomic
    def release_table(cls, table_id: int) -> Table:
        table = Table.objects.select_for_update().get(pk=table_id)
        table.status = 'free'
        table.is_occupied = False
        table.save(update_fields=['status', 'is_occupied'])
        logger.info(f"Stol #{table.number} bo'shatildi.")
        return table

    @classmethod
    @transaction.atomic
    def call_waiter(cls, table_id: int, call_type: str = 'waiter', note: str = '') -> ServiceCall:
        table = Table.objects.get(pk=table_id)
        call = ServiceCall.objects.create(
            table=table,
            shop=table.shop,
            call_type=call_type,
            notes=note,
            status='pending',
        )
        # Telegram orqali xabarnoma yuborish
        try:
            from notifications.telegram_bot import send_waiter_call_notification
            send_waiter_call_notification(call)
        except Exception as e:
            logger.warning(f"Ofitsiant chaqiruvi xabarnomasi yuborilmadi: {e}")
        return call
