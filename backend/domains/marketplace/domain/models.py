from dataclasses import dataclass
from decimal import Decimal
from typing import Optional
from .enums import ProductStatus


@dataclass(frozen=True)
class PriceVO:
    amount: Decimal
    currency: str = 'UZS'

    def __post_init__(self):
        if self.amount < Decimal('0'):
            from .exceptions import InvalidPriceError
            raise InvalidPriceError("Narx noldan kichik bo'lishi mumkin emas!")


@dataclass
class ProductEntity:
    id: int
    name: str
    price: PriceVO
    shop_id: int
    stock_quantity: int
    status: ProductStatus
    is_available: bool = True

    def can_order(self, quantity: int = 1) -> bool:
        return self.is_available and self.stock_quantity >= quantity

    def reduce_stock(self, quantity: int) -> None:
        if not self.can_order(quantity):
            from .exceptions import ProductOutOfStockError
            raise ProductOutOfStockError(f"'{self.name}' mahsulotidan yetarli qoldiq mavjud emas!")
        self.stock_quantity -= quantity
        if self.stock_quantity == 0:
            self.status = ProductStatus.OUT_OF_STOCK
