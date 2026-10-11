from typing import Optional, List
from tables_restaurant.models import Table, ServiceCall, Hall
from ..domain.models import TableEntity
from ..domain.enums import TableStatus


class TableRepository:
    @staticmethod
    def get_by_id(table_id: int) -> Optional[TableEntity]:
        try:
            t = Table.objects.select_related('hall').get(pk=table_id)
            return TableEntity(
                id=t.id,
                number=str(t.number),
                hall_name=t.hall.name if t.hall else 'Asosiy zal',
                capacity=t.capacity,
                status=TableStatus(t.status) if t.status in TableStatus._value2member_map_ else TableStatus.FREE,
            )
        except Table.DoesNotExist:
            return None

    @staticmethod
    def get_by_number(number: str, shop_id: Optional[int] = None) -> Optional[Table]:
        qs = Table.objects.filter(number=number, is_active=True)
        if shop_id:
            qs = qs.filter(shop_id=shop_id)
        return qs.first()
