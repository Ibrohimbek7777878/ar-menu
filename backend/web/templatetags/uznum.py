from django import template
from decimal import Decimal, InvalidOperation

register = template.Library()


@register.filter
def uznum(value):
    """Sonlarni probel bilan ajratib ko'rsatadi: 450000 -> 450 000"""
    try:
        if value is None or value == '':
            return '0'
        num = Decimal(str(value))
        if num == num.to_integral_value():
            num = int(num)
            return f'{num:,}'.replace(',', ' ')
        parts = str(num).split('.')
        integer = f'{int(parts[0]):,}'.replace(',', ' ')
        return f'{integer},{parts[1]}'
    except (ValueError, TypeError, InvalidOperation):
        return str(value)
