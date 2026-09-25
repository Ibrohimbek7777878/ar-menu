import logging
from decimal import Decimal, ROUND_DOWN
from datetime import timedelta
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from core.exceptions import ARMenuError

log=logging.getLogger('loyalty.services')

class LoyaltyError(ARMenuError):
    code_name='LOYALTY_ERROR'
    status_code=409
    msg_uz="Bonus amalga oshmadi"
    msg_ru="Бонус не применён"
    msg_en='Bonus not applied'

def q0(v): return Decimal(v).quantize(Decimal('1'), rounding=ROUND_DOWN)

def get_program(restaurant):
    from apps.loyalty.models import LoyaltyProgram
    from django.core.cache import cache
    try:
        key=f'loyalty:prog:{restaurant.id}'
        p=cache.get(key)
        if p is None:
            p=LoyaltyProgram.objects.filter(restaurant=restaurant,is_active=True).first() or False
            cache.set(key,p,300)
        return p or None
    except Exception:
        return LoyaltyProgram.objects.filter(restaurant=restaurant,is_active=True).first()

@transaction.atomic
def add_bonus(guest, amount, kind, order=None, comment='', lifetime_days=None):
    from apps.loyalty.models import Bonus
    from apps.guest.models import Guest
    amount=q0(amount)
    if amount==0: return None
    g=Guest.objects.select_for_update().get(id=guest.id)
    new_balance=q0(Decimal(g.bonus)+amount)
    if new_balance<0:
        raise LoyaltyError({'reason':'bonus yetarli emas','balance':str(g.bonus),'requested':str(-amount)})
    expires=None
    if amount>0:
        prog=get_program(g.restaurant)
        days=lifetime_days or (prog.bonus_lifetime_days if prog else 180)
        expires=timezone.now()+timedelta(days=days)
    b=Bonus.objects.create(restaurant=g.restaurant,guest=g,order=order,kind=kind,amount=amount,balance_after=new_balance,expires_at=expires,comment=comment)
    g.bonus=new_balance
    g.save(update_fields=['bonus'])
    log.info(f'[bonus] guest#{g.id} {kind} {amount:+.0f} → {new_balance}')
    return b

def calc_cashback(order):
    prog=get_program(order.restaurant)
    if prog is None or not order.guest_id: return Decimal('0')
    total=order.total or Decimal('0')
    if total < prog.min_order_for_cashback: return Decimal('0')
    return q0(total * prog.cashback_percent / 100)

@transaction.atomic
def spend_bonus(guest, amount, order=None):
    return add_bonus(guest, -q0(amount), 'spend', order=order, comment=f'Buyurtma #{order.number}' if order else '')

def max_bonus_for_order(order):
    prog=get_program(order.restaurant)
    if prog is None or not order.guest_id: return Decimal('0')
    total=order.total or Decimal('0')
    cap=q0(total * prog.max_pay_percent / 100)
    return min(cap, q0(order.guest.bonus))
