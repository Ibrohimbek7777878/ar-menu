"""
Domain Layer for Orders Bounded Context.
Pure Python business logic, zero framework dependency.
"""
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional
from decimal import Decimal


class OrderStatus(str, Enum):
    PENDING = 'pending'
    CONFIRMED = 'confirmed'
    PREPARING = 'preparing'
    READY = 'ready'
    DELIVERED = 'delivered'
    PAID = 'paid'
    CANCELLED = 'cancelled'


class CourseType(str, Enum):
    FIRST = '1-taom'
    SECOND = '2-taom'
    SALAD = 'salat'
    BEVERAGE = 'ichimlik'
    DESSERT = 'shirinlik'


class DomainException(Exception):
    pass


class InvalidOrderStateError(DomainException):
    pass


@dataclass(frozen=True)
class OrderItemVO:
    product_id: Optional[int]
    product_name: str
    price: Decimal
    quantity: int
    unit: str = 'dona'
    course: str = '2-taom'
    notes: str = ''
    is_done: bool = False

    @property
    def total(self) -> Decimal:
        return self.price * self.quantity


@dataclass
class RestaurantOrderEntity:
    id: Optional[int]
    order_number: str
    shop_id: int
    table_number: str
    customer_name: str
    customer_phone: str
    status: OrderStatus
    items: List[OrderItemVO]
    notes: str = ''
    service_fee_percent: Decimal = Decimal('10')

    @property
    def subtotal(self) -> Decimal:
        return sum((item.total for item in self.items), Decimal('0'))

    @property
    def service_fee(self) -> Decimal:
        return (self.subtotal * self.service_fee_percent) / Decimal('100')

    @property
    def total_amount(self) -> Decimal:
        return self.subtotal + self.service_fee

    def mark_item_done(self, item_index: int):
        if 0 <= item_index < len(self.items):
            current = self.items[item_index]
            self.items[item_index] = OrderItemVO(
                product_id=current.product_id,
                product_name=current.product_name,
                price=current.price,
                quantity=current.quantity,
                unit=current.unit,
                course=current.course,
                notes=current.notes,
                is_done=True
            )

    def cancel(self, reason: str):
        if self.status in [OrderStatus.PAID, OrderStatus.DELIVERED]:
            raise InvalidOrderStateError("Yakunlangan yoki to'langan buyurtmani bekor qilib bo'lmaydi.")
        self.status = OrderStatus.CANCELLED
        self.notes = f"{self.notes} [Bekor sababi: {reason}]".strip()
