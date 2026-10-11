import logging
from typing import Dict, Any, Optional
from decimal import Decimal
from django.db import transaction

from ..domain.pricing import calculate_3d_print_price, calculate_cashback_discount
from ..domain.enums import PrintStatus

logger = logging.getLogger(__name__)


class Studio3DApplicationService:
    @staticmethod
    def estimate_order(weight_grams: float, hours: float, material: str = 'PLA') -> Dict[str, Any]:
        price = calculate_3d_print_price(weight_grams, hours, material)
        cashback = calculate_cashback_discount(price)
        final_price = price - cashback
        return {
            'original_price': float(price),
            'cashback_discount': float(cashback),
            'final_price': float(final_price),
            'material': material,
        }
