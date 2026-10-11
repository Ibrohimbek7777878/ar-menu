from dataclasses import dataclass
from typing import Optional
from datetime import datetime
from .enums import TableStatus, WaiterCallType, WaiterCallStatus


@dataclass
class TableEntity:
    id: int
    number: str
    hall_name: str
    capacity: int
    status: TableStatus
    active_order_id: Optional[int] = None

    def can_occupy(self) -> bool:
        return self.status in (TableStatus.FREE, TableStatus.RESERVED)

    def occupy(self, order_id: Optional[int] = None) -> None:
        if not self.can_occupy():
            from .exceptions import TableAlreadyOccupiedError
            raise TableAlreadyOccupiedError(f"Stol #{self.number} allaqachon band holatda!")
        self.status = TableStatus.OCCUPIED
        self.active_order_id = order_id

    def release(self) -> None:
        self.status = TableStatus.FREE
        self.active_order_id = None


@dataclass
class WaiterCallEntity:
    id: int
    table_id: int
    table_number: str
    call_type: WaiterCallType
    status: WaiterCallStatus
    created_at: datetime
    accepted_at: Optional[datetime] = None
    waiter_name: Optional[str] = None
