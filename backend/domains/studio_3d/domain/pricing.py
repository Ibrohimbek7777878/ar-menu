from decimal import Decimal
from typing import Dict

MATERIAL_RATES_PER_GRAM: Dict[str, Decimal] = {
    'PLA': Decimal('500.00'),
    'PETG': Decimal('600.00'),
    'ABS': Decimal('700.00'),
    'Resin': Decimal('1200.00'),
    'TPU': Decimal('900.00'),
}

PRINT_HOURLY_RATE = Decimal('15000.00')
CASHBACK_PERCENT = Decimal('0.05')  # 5% keshbek chegirmasi


def calculate_3d_print_price(weight_grams: float, print_hours: float, material: str = 'PLA') -> Decimal:
    mat_rate = MATERIAL_RATES_PER_GRAM.get(material, Decimal('500.00'))
    mat_cost = Decimal(str(weight_grams)) * mat_rate
    machine_cost = Decimal(str(print_hours)) * PRINT_HOURLY_RATE
    total = mat_cost + machine_cost
    return total.quantize(Decimal('1.00'))


def calculate_cashback_discount(total_amount: Decimal) -> Decimal:
    return (total_amount * CASHBACK_PERCENT).quantize(Decimal('1.00'))
