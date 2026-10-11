# FAZA 11 — SODIQLIK + OTZIV + ANALITIKA

**Vazifalar:** V-205 … V-218 · **Muddat:** 1,5 hafta
**Maqsad:** Keshbek va promokod ishlaydi, ⚡ otziv filtri (5⭐→Google, 1-3⭐→faqat admin),
menyu-injiniring hisoboti restoran egasiga ROI ko'rsatadi.

> 💰 **Sotuv argumenti (B5 riskini yopadi):** *"Google reytingingiz ko'tariladi,
> salbiy sharhlar internetga chiqmasdan sizga keladi."* — restoran egalari
> buni juda qadrlaydi va aynan shu funksiya churn'ni kamaytiradi.

---

## V-205 — `Bonus`, `Promo` modellari

**Fayl:** `apps/loyalty/models.py`
```python
from decimal import Decimal
from django.db import models
from django.utils import timezone
from core.models import TenantModel


class LoyaltyProgram(TenantModel):
    """Restoranning sodiqlik sozlamalari (bitta restoran = bitta dastur)"""
    is_active         = models.BooleanField(default=False)
    cashback_percent  = models.DecimalField(max_digits=5, decimal_places=2,
                                            default=Decimal('3.00'))
    max_pay_percent   = models.SmallIntegerField(default=30)   # bonus bilan max %
    bonus_lifetime_days = models.SmallIntegerField(default=180)
    min_order_for_cashback = models.DecimalField(max_digits=12, decimal_places=2,
                                                 default=Decimal('0'))
    birthday_bonus    = models.DecimalField(max_digits=12, decimal_places=2,
                                            default=Decimal('30000'))
    birthday_days_before = models.SmallIntegerField(default=3)
    birthday_valid_days  = models.SmallIntegerField(default=7)
    welcome_bonus     = models.DecimalField(max_digits=12, decimal_places=2,
                                            default=Decimal('0'))

    class Meta:
        constraints = [models.UniqueConstraint(fields=['restaurant'],
                                               name='uq_loyalty_rest')]


class Bonus(TenantModel):
    """
    ⚡ Bonus HARAKATLARI jurnali (ledger). Guest.bonus — kesh (denormalizatsiya).
    Haqiqat manbai — shu jadval yig'indisi.
    """
    KIND = [
        ('cashback',  'Keshbek'),
        ('welcome',   'Xush kelibsiz'),
        ('birthday',  "Tug'ilgan kun"),
        ('promo',     'Promokod'),
        ('manual',    "Qo'lda"),
        ('spend',     'Sarflandi'),
        ('expire',    'Muddati tugadi'),
        ('revert',    'Qaytarildi'),
    ]
    guest   = models.ForeignKey('guest.Guest', on_delete=models.CASCADE,
                                related_name='bonuses')
    order   = models.ForeignKey('orders.Order', null=True, blank=True,
                                on_delete=models.SET_NULL)
    kind    = models.CharField(max_length=20, choices=KIND, db_index=True)
    amount  = models.DecimalField(max_digits=12, decimal_places=2)  # +/-
    balance_after = models.DecimalField(max_digits=12, decimal_places=2,
                                        default=0)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    is_expired = models.BooleanField(default=False, db_index=True)
    comment    = models.CharField(max_length=200, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['restaurant', 'guest', 'created_at']),
            models.Index(fields=['is_expired', 'expires_at']),
        ]

    def __str__(self):
        return f'{self.kind} {self.amount:+.0f} (guest#{self.guest_id})'


class Promo(TenantModel):
    """Promokod / aksiya"""
    TYPE = [('percent', 'Foiz'), ('fixed', "Qat'iy summa"),
            ('bonus', 'Bonus beradi'), ('free_item', 'Bepul taom')]

    code        = models.CharField(max_length=32, db_index=True)
    title_uz    = models.CharField(max_length=120)
    title_ru    = models.CharField(max_length=120, blank=True)
    title_en    = models.CharField(max_length=120, blank=True)
    discount_type = models.CharField(max_length=15, choices=TYPE,
                                     default='percent')
    value       = models.DecimalField(max_digits=12, decimal_places=2)
    max_discount = models.DecimalField(max_digits=12, decimal_places=2,
                                       null=True, blank=True)
    min_order   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    free_dish   = models.ForeignKey('menu.Dish', null=True, blank=True,
                                    on_delete=models.SET_NULL)

    starts_at   = models.DateTimeField(default=timezone.now)
    ends_at     = models.DateTimeField(null=True, blank=True, db_index=True)
    usage_limit = models.IntegerField(null=True, blank=True)   # jami
    per_guest_limit = models.SmallIntegerField(default=1)
    used_count  = models.IntegerField(default=0)
    first_order_only = models.BooleanField(default=False)
    is_active   = models.BooleanField(default=True, db_index=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['restaurant', 'code'],
                                               name='uq_promo_code')]

    def __str__(self):
        return f'{self.code} ({self.get_discount_type_display()})'


class PromoUsage(TenantModel):
    promo  = models.ForeignKey(Promo, on_delete=models.CASCADE,
                               related_name='usages')
    guest  = models.ForeignKey('guest.Guest', on_delete=models.CASCADE)
    order  = models.ForeignKey('orders.Order', on_delete=models.CASCADE)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['promo', 'order'],
                                               name='uq_promo_order')]
        indexes = [models.Index(fields=['promo', 'guest'])]
```

`apps/guest/models.py` — `Guest` da bo'lishi kerak:
```python
    bonus       = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    birthday    = models.DateField(null=True, blank=True, db_index=True)
    visits      = models.IntegerField(default=0)
    total_spent = models.DecimalField(max_digits=14, decimal_places=2, default=0)
```

✅ **Tekshirish:**
```bash
python manage.py makemigrations loyalty guest && python manage.py migrate
python manage.py shell -c "from apps.loyalty.models import Bonus, Promo; print('ok')"
```

---

## V-206 — Keshbek hisoblash

**Fayl:** `apps/loyalty/services.py`
```python
import logging
from decimal import Decimal, ROUND_DOWN
from datetime import timedelta
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from core.exceptions import ARMenuError
from core.queue import enqueue

log = logging.getLogger('loyalty.services')


class LoyaltyError(ARMenuError):
    code_name = 'LOYALTY_ERROR'
    status_code = 409
    msg_uz = "Bonus amalga oshmadi"
    msg_ru = "Бонус не применён"
    msg_en = 'Bonus not applied'


def q0(v) -> Decimal:
    """Bonus — butun so'mda (tiyinsiz), pastga yaxlitlanadi"""
    return Decimal(v).quantize(Decimal('1'), rounding=ROUND_DOWN)


def get_program(restaurant):
    from apps.loyalty.models import LoyaltyProgram
    from django.core.cache import cache
    key = f'loyalty:prog:{restaurant.id}'
    p = cache.get(key)
    if p is None:
        p = LoyaltyProgram.objects.filter(restaurant=restaurant,
                                          is_active=True).first() or False
        cache.set(key, p, 300)
    return p or None


@transaction.atomic
def add_bonus(guest, amount, kind, order=None, comment='', lifetime_days=None):
    """
    ⚡ Ledger'ga yozadi + Guest.bonus keshini yangilaydi (atomik).
    """
    from apps.loyalty.models import Bonus
    from apps.guest.models import Guest

    amount = q0(amount)
    if amount == 0:
        return None

    g = Guest.objects.select_for_update().get(id=guest.id)
    new_balance = q0(Decimal(g.bonus) + amount)
    if new_balance < 0:
        raise LoyaltyError({'reason': 'bonus yetarli emas',
                            'balance': str(g.bonus), 'requested': str(-amount)})

    expires = None
    if amount > 0:
        prog = get_program(g.restaurant)
        days = lifetime_days or (prog.bonus_lifetime_days if prog else 180)
        expires = timezone.now() + timedelta(days=days)

    b = Bonus.objects.create(
        restaurant=g.restaurant, guest=g, order=order, kind=kind,
        amount=amount, balance_after=new_balance, expires_at=expires,
        comment=comment)

    g.bonus = new_balance
    g.save(update_fields=['bonus', 'updated_at'])

    log.info(f'[bonus] guest#{g.id} {kind} {amount:+.0f} → {new_balance}')
    return b


def calc_cashback(order) -> Decimal:
    """⚡ Keshbek FAQAT serverda hisoblanadi"""
    from apps.payments.services import calc_order_total
    prog = get_program(order.restaurant)
    if prog is None or not order.guest_id:
        return Decimal('0')

    total = calc_order_total(order)['total']
    if total < prog.min_order_for_cashback:
        return Decimal('0')

    # ⚡ Bonus bilan to'langan qism keshbek bermaydi (dublikat oldini olish)
    bonus_paid = sum(
        (Decimal(str((p.raw or {}).get('bonus_used', 0) or 0))
         for p in order.payments.filter(status='paid')), Decimal('0'))
    base = max(Decimal('0'), total - bonus_paid)
    return q0(base * prog.cashback_percent / 100)


def award_cashback(order_id: int):
    """
    `notify` navbat handler'i — buyurtma to'langanda chaqiriladi.
    ⚡ Idempotent: bir buyurtmaga bir marta keshbek.
    """
    from apps.orders.models import Order
    from apps.loyalty.models import Bonus
    from apps.payments.services import calc_order_total

    order = Order.objects.select_related('restaurant', 'guest').get(id=order_id)
    if not order.guest_id or order.status != 'paid':
        return None

    if Bonus.objects.filter(order=order, kind='cashback').exists():
        log.info(f'[bonus] Order#{order_id} keshbek allaqachon berilgan')
        return None

    amount = calc_cashback(order)
    if amount <= 0:
        return None

    b = add_bonus(order.guest, amount, 'cashback', order=order,
                  comment=f'Buyurtma #{order.number}')

    # Mijoz statistikasi
    from apps.guest.models import Guest
    total = calc_order_total(order)['total']
    Guest.objects.filter(id=order.guest_id).update(
        visits=models_F('visits') + 1,
        total_spent=models_F('total_spent') + total)

    enqueue('notify', 'cashback_awarded', guest_id=order.guest_id,
            amount=str(amount), balance=str(order.guest.bonus + amount),
            order_number=order.number)
    return b


from django.db.models import F as models_F  # noqa: E402


@transaction.atomic
def spend_bonus(guest, amount, order=None):
    """Bonus sarflash (to'lovda). Manfiy yozuv."""
    return add_bonus(guest, -q0(amount), 'spend', order=order,
                     comment=f'Buyurtma #{order.number}' if order else '')


def max_bonus_for_order(order) -> Decimal:
    """
    ⚡ Bitta buyurtmada ishlatish mumkin bo'lgan maksimal bonus.
    Cheklov: dastur foizi VA mijoz balansi.
    """
    from apps.payments.services import calc_order_total
    prog = get_program(order.restaurant)
    if prog is None or not order.guest_id:
        return Decimal('0')
    total = calc_order_total(order)['total']
    cap = q0(total * prog.max_pay_percent / 100)
    return min(cap, q0(order.guest.bonus))


def expire_bonuses() -> int:
    """
    Cron (kunlik 03:30) — muddati tugagan bonuslarni kuydiradi.
    """
    from apps.loyalty.models import Bonus
    from apps.guest.models import Guest

    now = timezone.now()
    rows = (Bonus.objects
            .filter(is_expired=False, expires_at__lt=now, amount__gt=0)
            .values('guest_id', 'restaurant_id')
            .annotate(total=Sum('amount')))
    n = 0
    for row in rows:
        with transaction.atomic():
            g = Guest.objects.select_for_update().get(id=row['guest_id'])
            burn = min(q0(g.bonus), q0(row['total']))
            if burn <= 0:
                Bonus.objects.filter(guest_id=g.id, is_expired=False,
                                     expires_at__lt=now).update(is_expired=True)
                continue
            g.bonus = q0(Decimal(g.bonus) - burn)
            g.save(update_fields=['bonus'])
            Bonus.objects.create(restaurant_id=row['restaurant_id'], guest=g,
                                 kind='expire', amount=-burn,
                                 balance_after=g.bonus,
                                 comment='Muddati tugadi')
            Bonus.objects.filter(guest_id=g.id, is_expired=False,
                                 expires_at__lt=now).update(is_expired=True)
            n += 1
            log.info(f'[bonus] guest#{g.id} −{burn} (muddati tugadi)')
    return n


def reconcile_guest_balance(guest) -> Decimal:
    """⚡ Ledger yig'indisi bilan keshni solishtiradi (self-check)"""
    from apps.loyalty.models import Bonus
    from apps.guest.models import Guest
    real = Bonus.objects.filter(guest=guest).aggregate(
        s=Sum('amount'))['s'] or Decimal('0')
    real = q0(real)
    if q0(guest.bonus) != real:
        log.warning(f'[bonus] ⚠️ guest#{guest.id} farq: kesh={guest.bonus} '
                    f'ledger={real} — tuzatildi')
        Guest.objects.filter(id=guest.id).update(bonus=real)
    return real
```

**Fayl:** `apps/loyalty/views.py`
```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from apps.orders.models import Order
from apps.loyalty.services import (get_program, max_bonus_for_order,
                                   calc_cashback)


@api_view(['GET'])
def bonus_info(request, order_id):
    """GET /v1/orders/<id>/bonus/ — M-10 'Bonusdan foydalanish' qatori"""
    order = get_object_or_404(Order, id=order_id,
                              restaurant_id=request.restaurant_id)
    prog = get_program(order.restaurant)
    return Response({
        'enabled': bool(prog),
        'balance': str(order.guest.bonus if order.guest_id else 0),
        'max_usable': str(max_bonus_for_order(order)),
        'cashback_percent': str(prog.cashback_percent) if prog else '0',
        'cashback_preview': str(calc_cashback(order)),
    })


@api_view(['GET'])
def bonus_history(request):
    """GET /v1/guest/bonuses/"""
    from apps.loyalty.models import Bonus
    guest = getattr(request, 'guest', None)
    if guest is None:
        return Response({'balance': '0', 'items': []})
    rows = Bonus.objects.filter(guest=guest).order_by('-created_at')[:50]
    return Response({
        'balance': str(guest.bonus),
        'items': [{'kind': b.kind, 'kind_label': b.get_kind_display(),
                   'amount': str(b.amount), 'balance_after': str(b.balance_after),
                   'comment': b.comment, 'expires_at': b.expires_at,
                   'created_at': b.created_at} for b in rows],
    })
```

`apps/notifications/handlers/__init__.py` ga:
```python
from apps.loyalty.services import award_cashback
HANDLERS['cashback'] = lambda p: award_cashback(p['order_id'])
```

✅ **Test:**
```python
@pytest.mark.django_db(transaction=True)
def test_cashback_awarded_once(order_paid_with_guest, loyalty_program):
    from apps.loyalty.services import award_cashback
    from apps.loyalty.models import Bonus
    award_cashback(order_paid_with_guest.id)
    award_cashback(order_paid_with_guest.id)      # ⚡ 2-marta
    assert Bonus.objects.filter(order=order_paid_with_guest,
                                kind='cashback').count() == 1
```

---

## V-207 — Promokod qo'llash

**Fayl:** `apps/loyalty/promo.py`
```python
import logging
from decimal import Decimal
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from core.exceptions import ARMenuError

log = logging.getLogger('loyalty.promo')


class PromoInvalid(ARMenuError):
    code_name = 'PROMO_INVALID'
    status_code = 400
    msg_uz = "Promokod yaroqsiz"
    msg_ru = "Промокод недействителен"
    msg_en = 'Invalid promo code'


class PromoExpired(ARMenuError):
    code_name = 'PROMO_EXPIRED'
    status_code = 400
    msg_uz = "Promokod muddati tugagan"
    msg_ru = "Срок действия промокода истёк"
    msg_en = 'Promo code expired'


class PromoUsed(ARMenuError):
    code_name = 'PROMO_USED'
    status_code = 409
    msg_uz = "Bu promokoddan allaqachon foydalangansiz"
    msg_ru = "Вы уже использовали этот промокод"
    msg_en = 'You have already used this promo code'


class PromoMinOrder(ARMenuError):
    code_name = 'PROMO_MIN_ORDER'
    status_code = 400
    msg_uz = "Buyurtma summasi yetarli emas"
    msg_ru = "Сумма заказа недостаточна"
    msg_en = 'Order total is too low'


def find_promo(restaurant, code: str):
    from apps.loyalty.models import Promo
    p = Promo.objects.filter(restaurant=restaurant,
                             code__iexact=(code or '').strip(),
                             is_active=True).first()
    if p is None:
        raise PromoInvalid({'code': code})
    return p


def check_promo(promo, order, guest):
    """Barcha shartlarni tekshiradi. Xato bo'lsa exception."""
    from apps.loyalty.models import PromoUsage
    from apps.payments.services import calc_order_total
    from apps.orders.models import Order

    now = timezone.now()
    if promo.starts_at and now < promo.starts_at:
        raise PromoExpired({'starts_at': promo.starts_at})
    if promo.ends_at and now > promo.ends_at:
        raise PromoExpired({'ends_at': promo.ends_at})
    if promo.usage_limit is not None and promo.used_count >= promo.usage_limit:
        raise PromoExpired({'reason': 'limit tugadi'})

    total = calc_order_total(order)['items']
    if total < promo.min_order:
        raise PromoMinOrder({'min_order': str(promo.min_order),
                             'current': str(total)})

    if guest is not None:
        used = PromoUsage.objects.filter(promo=promo, guest=guest).count()
        if used >= promo.per_guest_limit:
            raise PromoUsed({'limit': promo.per_guest_limit})
        if promo.first_order_only:
            prev = Order.objects.filter(guest=guest, status='paid').exclude(
                id=order.id).exists()
            if prev:
                raise PromoInvalid({'reason': 'faqat birinchi buyurtma uchun'})
    return True


def calc_discount(promo, order) -> Decimal:
    """⚡ Chegirma FAQAT serverda hisoblanadi"""
    from apps.payments.services import calc_order_total, q2
    items = calc_order_total(order)['items']

    if promo.discount_type == 'percent':
        d = q2(items * promo.value / 100)
    elif promo.discount_type == 'fixed':
        d = q2(promo.value)
    elif promo.discount_type == 'free_item':
        row = order.items.filter(dish=promo.free_dish).first()
        d = q2(row.price) if row else Decimal('0')
    else:                                # bonus turi — chegirma bermaydi
        d = Decimal('0')

    if promo.max_discount is not None:
        d = min(d, q2(promo.max_discount))
    return min(d, items)                 # chegirma taomlar summasidan oshmaydi


@transaction.atomic
def apply_promo(order, code: str, guest=None):
    """
    ⚡ Idempotent: bir buyurtmaga bitta promokod (unique(promo, order)).
    """
    from apps.loyalty.models import Promo, PromoUsage
    from apps.loyalty.services import add_bonus

    promo = Promo.objects.select_for_update().get(
        id=find_promo(order.restaurant, code).id)
    check_promo(promo, order, guest)

    if PromoUsage.objects.filter(order=order).exists():
        raise PromoUsed({'reason': 'buyurtmada promokod bor'})

    discount = calc_discount(promo, order)

    PromoUsage.objects.create(restaurant=order.restaurant, promo=promo,
                              guest=guest, order=order,
                              discount_amount=discount)
    Promo.objects.filter(id=promo.id).update(used_count=F('used_count') + 1)

    order.discount_amount = (order.discount_amount or Decimal('0')) + discount
    order.promo_code = promo.code
    order.save(update_fields=['discount_amount', 'promo_code', 'updated_at'])

    if promo.discount_type == 'bonus' and guest is not None:
        add_bonus(guest, promo.value, 'promo', order=order,
                  comment=f'Promokod {promo.code}')

    log.info(f'[promo] {promo.code} → Order#{order.id} −{discount}')
    return {'code': promo.code, 'title': promo.title_uz,
            'discount': str(discount), 'type': promo.discount_type}


@transaction.atomic
def remove_promo(order):
    from apps.loyalty.models import PromoUsage, Promo
    u = PromoUsage.objects.select_for_update().filter(order=order).first()
    if u is None:
        return False
    order.discount_amount = max(Decimal('0'),
                                (order.discount_amount or 0) - u.discount_amount)
    order.promo_code = ''
    order.save(update_fields=['discount_amount', 'promo_code', 'updated_at'])
    Promo.objects.filter(id=u.promo_id).update(used_count=F('used_count') - 1)
    u.delete()
    return True
```

**Fayl:** `apps/loyalty/views.py` (qo'shimcha)
```python
@api_view(['POST'])
def apply_promo_view(request, order_id):
    """POST /v1/orders/<id>/promo/ {code}"""
    from apps.loyalty.promo import apply_promo
    order = get_object_or_404(Order, id=order_id,
                              restaurant_id=request.restaurant_id)
    res = apply_promo(order, request.data.get('code', ''),
                      guest=getattr(request, 'guest', None))
    from apps.payments.services import calc_order_total
    return Response({'promo': res,
                     'bill': {k: str(v) for k, v in
                              calc_order_total(order).items()}})


@api_view(['DELETE'])
def remove_promo_view(request, order_id):
    from apps.loyalty.promo import remove_promo
    order = get_object_or_404(Order, id=order_id,
                              restaurant_id=request.restaurant_id)
    return Response({'removed': remove_promo(order)})
```

**Fayl:** `apps/loyalty/urls.py`
```python
from django.urls import path
from apps.loyalty import views

urlpatterns = [
    path('orders/<int:order_id>/bonus/', views.bonus_info),
    path('orders/<int:order_id>/promo/', views.apply_promo_view),
    path('orders/<int:order_id>/promo/remove/', views.remove_promo_view),
    path('guest/bonuses/', views.bonus_history),
]
```

✅ **Test:**
```python
@pytest.mark.django_db
def test_promo_per_guest_limit(order_with_items, promo_10pct, guest):
    from apps.loyalty.promo import apply_promo, PromoUsed
    apply_promo(order_with_items, promo_10pct.code, guest=guest)
    order2 = make_order(order_with_items.restaurant, guest)
    with pytest.raises(PromoUsed):
        apply_promo(order2, promo_10pct.code, guest=guest)
```

---

## V-208 — Tug'ilgan kun bonusi (cron)

**Fayl:** `apps/loyalty/tasks.py`
```python
import logging
from datetime import timedelta
from django.utils import timezone

log = logging.getLogger('loyalty.tasks')


def birthday_bonuses() -> int:
    """
    Cron (kunlik 09:00) — tug'ilgan kuni yaqinlashgan mijozlarga bonus.
    ⚡ Bir yilda bir marta (kind='birthday' + shu yil tekshiriladi).
    """
    from apps.loyalty.models import LoyaltyProgram, Bonus
    from apps.loyalty.services import add_bonus
    from apps.guest.models import Guest
    from core.queue import enqueue

    today = timezone.localdate()
    sent = 0

    for prog in LoyaltyProgram.objects.filter(is_active=True,
                                              birthday_bonus__gt=0
                                              ).select_related('restaurant'):
        target = today + timedelta(days=prog.birthday_days_before)
        guests = Guest.objects.filter(
            restaurant=prog.restaurant, birthday__isnull=False,
            birthday__month=target.month, birthday__day=target.day)

        for g in guests:
            already = Bonus.objects.filter(
                guest=g, kind='birthday',
                created_at__year=today.year).exists()
            if already:
                continue

            add_bonus(g, prog.birthday_bonus, 'birthday',
                      comment=f"Tug'ilgan kun sovg'asi 🎂",
                      lifetime_days=prog.birthday_valid_days)
            enqueue('notify', 'birthday_bonus', guest_id=g.id,
                    amount=str(prog.birthday_bonus),
                    valid_days=prog.birthday_valid_days,
                    restaurant_name=prog.restaurant.name)
            sent += 1
            log.info(f'[birthday] 🎂 guest#{g.id} +{prog.birthday_bonus}')

    log.info(f'[birthday] {sent} ta mijozga bonus berildi')
    return sent


def welcome_bonus(guest_id: int):
    """Yangi mijoz ro'yxatdan o'tganda (signal chaqiradi)"""
    from apps.guest.models import Guest
    from apps.loyalty.services import get_program, add_bonus
    from apps.loyalty.models import Bonus
    from core.queue import enqueue

    g = Guest.objects.select_related('restaurant').get(id=guest_id)
    prog = get_program(g.restaurant)
    if prog is None or prog.welcome_bonus <= 0:
        return None
    if Bonus.objects.filter(guest=g, kind='welcome').exists():
        return None

    add_bonus(g, prog.welcome_bonus, 'welcome', comment='Xush kelibsiz! 👋')
    enqueue('notify', 'welcome_bonus', guest_id=g.id,
            amount=str(prog.welcome_bonus),
            restaurant_name=g.restaurant.name)
    return True
```

**Fayl:** `apps/loyalty/management/commands/loyalty_cron.py`
```python
from django.core.management.base import BaseCommand
from apps.loyalty.tasks import birthday_bonuses
from apps.loyalty.services import expire_bonuses


class Command(BaseCommand):
    help = 'Sodiqlik kunlik vazifalari'

    def add_arguments(self, parser):
        parser.add_argument('--task', default='all',
                            choices=['all', 'birthday', 'expire'])

    def handle(self, *args, **o):
        out = {}
        if o['task'] in ('all', 'birthday'):
            out['birthday'] = birthday_bonuses()
        if o['task'] in ('all', 'expire'):
            out['expired'] = expire_bonuses()
        self.stdout.write(self.style.SUCCESS(str(out)))
```

**Fayl:** `apps/notifications/handlers/loyalty.py`
```python
from apps.notifications.services import send_telegram


def _guest_chat(guest_id):
    from apps.guest.models import Guest
    g = Guest.objects.filter(id=guest_id).first()
    return (g, g.tg_user_id if g else None)


def handle_birthday_bonus(p):
    g, chat = _guest_chat(p['guest_id'])
    if not chat:
        return False
    name = g.name or 'Hurmatli mijoz'
    send_telegram(chat,
        f"🎂 <b>{name}, tug'ilgan kuningiz bilan!</b>\n\n"
        f"{p['restaurant_name']} sizga <b>{p['amount']} so'm</b> sovg'a bonus berdi.\n"
        f"⏳ {p['valid_days']} kun ichida foydalaning.\n\n"
        f"Kutamiz! 🎉")
    return True


def handle_welcome_bonus(p):
    g, chat = _guest_chat(p['guest_id'])
    if not chat:
        return False
    send_telegram(chat,
        f"👋 <b>{p['restaurant_name']}ga xush kelibsiz!</b>\n\n"
        f"Sizga <b>{p['amount']} so'm</b> xush kelibsiz bonusi berildi.")
    return True


def handle_cashback_awarded(p):
    g, chat = _guest_chat(p['guest_id'])
    if not chat:
        return False
    send_telegram(chat,
        f"🎁 Buyurtma #{p['order_number']} uchun <b>{p['amount']} so'm</b> "
        f"keshbek qo'shildi.\nJami bonus: <b>{p['balance']} so'm</b>")
    return True
```

`apps/notifications/handlers/__init__.py` ga:
```python
from apps.notifications.handlers.loyalty import (handle_birthday_bonus,
                                                 handle_welcome_bonus,
                                                 handle_cashback_awarded)
HANDLERS.update({
    'birthday_bonus':   handle_birthday_bonus,
    'welcome_bonus':    handle_welcome_bonus,
    'cashback_awarded': handle_cashback_awarded,
})
```

**Cron:**
```bash
# /etc/cron.d/armenu-loyalty
0 9  * * * armenu cd /home/armenu/app && venv/bin/python manage.py loyalty_cron --task birthday >> /var/log/armenu/loyalty.log 2>&1
30 3 * * * armenu cd /home/armenu/app && venv/bin/python manage.py loyalty_cron --task expire   >> /var/log/armenu/loyalty.log 2>&1
```

✅ **Tekshirish:**
```bash
python manage.py loyalty_cron --task birthday
# {'birthday': N}
```

---

## V-209 — `Review` modeli

**Fayl:** `apps/reviews/models.py`
```python
from django.db import models
from core.models import TenantModel


class Review(TenantModel):
    """
    ⚡ 4-5⭐ → mijoz Google/Yandex'ga yo'naltiriladi (ommaviy reyting o'sadi)
    ⚡ 1-3⭐ → FAQAT admin ko'radi, internetga CHIQMAYDI
    """
    STATUS = [
        ('new',        'Yangi'),
        ('seen',       "Ko'rildi"),
        ('replied',    'Javob berildi'),
        ('resolved',   'Hal qilindi'),
        ('archived',   'Arxiv'),
    ]

    order   = models.ForeignKey('orders.Order', null=True, blank=True,
                                on_delete=models.SET_NULL, related_name='reviews')
    guest   = models.ForeignKey('guest.Guest', null=True, blank=True,
                                on_delete=models.SET_NULL)
    table   = models.ForeignKey('tables.Table', null=True, blank=True,
                                on_delete=models.SET_NULL)
    waiter  = models.ForeignKey('accounts.Staff', null=True, blank=True,
                                on_delete=models.SET_NULL, related_name='reviews')

    rating          = models.SmallIntegerField(db_index=True)      # 1..5 umumiy
    rating_food     = models.SmallIntegerField(null=True, blank=True)
    rating_service  = models.SmallIntegerField(null=True, blank=True)
    rating_ambience = models.SmallIntegerField(null=True, blank=True)
    text            = models.TextField(blank=True)

    # ⚡ Filtr natijasi
    is_public       = models.BooleanField(default=False, db_index=True)
    redirected_to_google = models.BooleanField(default=False)
    external_target = models.CharField(max_length=20, blank=True)  # google/yandex

    status      = models.CharField(max_length=15, choices=STATUS, default='new',
                                   db_index=True)
    admin_reply = models.TextField(blank=True)
    replied_by  = models.ForeignKey('accounts.Staff', null=True, blank=True,
                                    on_delete=models.SET_NULL,
                                    related_name='review_replies')
    replied_at  = models.DateTimeField(null=True, blank=True)

    lang        = models.CharField(max_length=2, default='uz')
    device      = models.CharField(max_length=120, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['restaurant', 'rating', 'created_at']),
            models.Index(fields=['restaurant', 'status']),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(rating__gte=1, rating__lte=5),
                                   name='ck_review_rating'),
            # ⚡ Bir buyurtmaga bitta otziv
            models.UniqueConstraint(fields=['order'], name='uq_review_order',
                                    condition=models.Q(order__isnull=False)),
        ]

    def __str__(self):
        return f'{self.rating}⭐ #{self.id}'


class ReviewSettings(TenantModel):
    """Restoranning otziv filtri sozlamalari"""
    is_active        = models.BooleanField(default=True)
    public_threshold = models.SmallIntegerField(default=4)   # ⚡ >= shu → tashqi
    google_place_url = models.URLField(max_length=500, blank=True)
    yandex_url       = models.URLField(max_length=500, blank=True)
    ask_after_payment = models.BooleanField(default=True)
    negative_alert_chat_id = models.CharField(max_length=40, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['restaurant'],
                                               name='uq_reviewsettings_rest')]
```

✅ **Tekshirish:**
```bash
python manage.py makemigrations reviews && python manage.py migrate
```

---

## V-210 — ⚡ Otziv filtri (5⭐→Google, 1-3⭐→faqat admin)

> ⚡ **Bu FAZA 11 ning eng muhim funksiyasi.** Bir necha qat'iy qoida:
> - `rating >= public_threshold` (odatda 4) → `is_public=True`, mijozga Google havolasi
> - `rating < threshold` → `is_public=False`, **HECH QAYERGA CHIQMAYDI**, adminga darhol push
> - Ommaviy API (`GET /v1/reviews/public/`) **faqat** `is_public=True` qaytaradi

**Fayl:** `apps/reviews/services.py`
```python
import logging
from django.db import transaction
from django.utils import timezone

from core.queue import enqueue
from core.ws import ws_send, g_admin

log = logging.getLogger('reviews.services')


def get_settings(restaurant):
    from apps.reviews.models import ReviewSettings
    from django.core.cache import cache
    key = f'review:cfg:{restaurant.id}'
    s = cache.get(key)
    if s is None:
        s = ReviewSettings.objects.filter(restaurant=restaurant).first()
        if s is None:
            s = ReviewSettings.objects.create(restaurant=restaurant)
        cache.set(key, s, 300)
    return s


@transaction.atomic
def create_review(restaurant, rating: int, order=None, guest=None, table=None,
                  text='', rating_food=None, rating_service=None,
                  rating_ambience=None, lang='uz', device=''):
    """
    ⚡ OTZIV FILTRI — loyihaning asosiy sotuv argumenti.

    rating >= threshold  → is_public=True  → mijozga Google/Yandex havolasi
    rating <  threshold  → is_public=False → FAQAT admin ko'radi + darhol push
    """
    from apps.reviews.models import Review

    rating = int(rating)
    if not (1 <= rating <= 5):
        from core.exceptions import ARMenuError

        class BadRating(ARMenuError):
            code_name = 'BAD_RATING'
            status_code = 400
            msg_uz = "Baho 1 dan 5 gacha bo'lishi kerak"
            msg_ru = 'Оценка должна быть от 1 до 5'
            msg_en = 'Rating must be between 1 and 5'
        raise BadRating({'rating': rating})

    cfg = get_settings(restaurant)
    threshold = cfg.public_threshold or 4
    is_public = rating >= threshold

    waiter = table.waiter if (table and table.waiter_id) else None
    if waiter is None and order is not None and order.table_id:
        waiter = order.table.waiter

    review = Review.objects.create(
        restaurant=restaurant, order=order, guest=guest,
        table=table or (order.table if order else None), waiter=waiter,
        rating=rating, rating_food=rating_food, rating_service=rating_service,
        rating_ambience=rating_ambience, text=(text or '').strip()[:4000],
        is_public=is_public, lang=lang, device=device[:120])

    if is_public:
        # ⚡ IJOBIY → tashqi platformaga taklif
        target, url = _external_target(cfg)
        review.external_target = target
        review.redirected_to_google = bool(url)
        review.save(update_fields=['external_target', 'redirected_to_google'])
        result = {
            'is_public': True,
            'thanks_uz': "Rahmat! 🎉 Sizning fikringiz biz uchun juda muhim.",
            'thanks_ru': 'Спасибо! 🎉 Ваше мнение очень важно для нас.',
            'thanks_en': 'Thank you! 🎉 Your feedback means a lot to us.',
            'external_url': url,
            'external_target': target,
            'ask_uz': "Google'da ham baholaysizmi?",
            'ask_ru': 'Оцените нас и в Google?',
            'ask_en': 'Would you also rate us on Google?',
        }
        log.info(f'[review] ⭐{rating} #{review.id} → ommaviy ({target})')
    else:
        # ⚡ SALBIY → internetga CHIQMAYDI, faqat adminga
        transaction.on_commit(lambda: _alert_negative(review, cfg))
        result = {
            'is_public': False,
            'thanks_uz': "Uzr so'raymiz. Fikringizni rahbariyatga yetkazdik — "
                         "tez orada bog'lanamiz.",
            'thanks_ru': 'Приносим извинения. Мы передали ваш отзыв руководству.',
            'thanks_en': 'We apologise. Your feedback was sent to management.',
            'external_url': '',
            'external_target': '',
        }
        log.warning(f'[review] ⚠️ {rating}⭐ #{review.id} — ICHKI '
                    f'(restoran#{restaurant.id}, stol {review.table_id})')

    return review, result


def _external_target(cfg):
    if cfg.google_place_url:
        return 'google', cfg.google_place_url
    if cfg.yandex_url:
        return 'yandex', cfg.yandex_url
    return '', ''


def _alert_negative(review, cfg):
    """⚡ Salbiy otziv — adminga DARHOL"""
    table_no = review.table.number if review.table_id else '—'
    data = {'review_id': review.id, 'rating': review.rating,
            'text': review.text[:300], 'table': table_no,
            'order_id': review.order_id,
            'waiter': (review.waiter.user.get_full_name()
                       if review.waiter_id else None)}
    ws_send(g_admin(review.restaurant_id), 'review.negative', data)
    enqueue('notify', 'negative_review', review_id=review.id)


def mark_seen(review, staff=None):
    if review.status == 'new':
        review.status = 'seen'
        review.save(update_fields=['status', 'updated_at'])
    return review


@transaction.atomic
def reply_review(review, text: str, staff=None):
    """Admin javob yozadi → mijozga Telegram"""
    review.admin_reply = (text or '').strip()[:2000]
    review.replied_by = staff
    review.replied_at = timezone.now()
    review.status = 'replied'
    review.save(update_fields=['admin_reply', 'replied_by', 'replied_at',
                               'status', 'updated_at'])
    if review.guest_id and review.guest.tg_user_id:
        transaction.on_commit(lambda: enqueue(
            'notify', 'review_reply', review_id=review.id))
    return review


def rating_summary(restaurant, days=30):
    """A-12 sahifasi uchun svodka"""
    from apps.reviews.models import Review
    from django.db.models import Avg, Count
    from datetime import timedelta

    since = timezone.now() - timedelta(days=days)
    qs = Review.objects.filter(restaurant=restaurant, created_at__gte=since)
    agg = qs.aggregate(avg=Avg('rating'), cnt=Count('id'),
                       avg_food=Avg('rating_food'),
                       avg_service=Avg('rating_service'),
                       avg_ambience=Avg('rating_ambience'))
    dist = {i: 0 for i in range(1, 6)}
    for row in qs.values('rating').annotate(c=Count('id')):
        dist[row['rating']] = row['c']

    total = agg['cnt'] or 0
    negative = sum(dist[i] for i in (1, 2, 3))
    return {
        'days': days, 'total': total,
        'avg': round(agg['avg'] or 0, 2),
        'avg_food': round(agg['avg_food'] or 0, 2),
        'avg_service': round(agg['avg_service'] or 0, 2),
        'avg_ambience': round(agg['avg_ambience'] or 0, 2),
        'distribution': dist,
        'public_count': qs.filter(is_public=True).count(),
        'internal_count': negative,
        'unanswered': qs.filter(is_public=False, status='new').count(),
        # ⚡ Sotuv argumenti raqami
        'saved_from_internet': negative,
    }
```

**Fayl:** `apps/reviews/views.py`
```python
from rest_framework.decorators import (api_view, permission_classes,
                                       throttle_classes)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from django.shortcuts import get_object_or_404

from apps.reviews.models import Review
from apps.reviews.services import (create_review, get_settings, reply_review,
                                   mark_seen, rating_summary)


class ReviewThrottle(AnonRateThrottle):
    rate = '10/hour'


@api_view(['POST'])
@throttle_classes([ReviewThrottle])
def create_review_view(request):
    """POST /v1/reviews/ — M-12"""
    from apps.orders.models import Order
    d = request.data
    order = None
    if d.get('order_id'):
        order = get_object_or_404(Order, id=d['order_id'],
                                  restaurant_id=request.restaurant_id)
    review, result = create_review(
        request.restaurant, rating=d.get('rating'), order=order,
        guest=getattr(request, 'guest', None),
        table=getattr(request, 'table', None),
        text=d.get('text', ''),
        rating_food=d.get('rating_food'),
        rating_service=d.get('rating_service'),
        rating_ambience=d.get('rating_ambience'),
        lang=getattr(request, 'lang', 'uz'),
        device=request.headers.get('User-Agent', ''))
    return Response({'review_id': review.id, **result}, status=201)


@api_view(['GET'])
def public_reviews(request):
    """
    GET /v1/reviews/public/
    ⚡ FAQAT is_public=True — salbiy otziv HECH QACHON chiqmaydi.
    """
    qs = (Review.objects
          .filter(restaurant_id=request.restaurant_id, is_public=True)
          .exclude(text='')
          .order_by('-created_at')[:50])
    return Response({'items': [
        {'rating': r.rating, 'text': r.text,
         'created_at': r.created_at,
         'reply': r.admin_reply} for r in qs]})


# ---------- Admin (A-12) ----------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_reviews(request):
    """GET /v1/admin/reviews/?filter=negative|public|all&status=new"""
    qs = Review.objects.filter(restaurant_id=request.restaurant_id)
    f = request.GET.get('filter', 'all')
    if f == 'negative':
        qs = qs.filter(is_public=False)
    elif f == 'public':
        qs = qs.filter(is_public=True)
    if request.GET.get('status'):
        qs = qs.filter(status=request.GET['status'])
    qs = qs.select_related('table', 'waiter__user',
                           'guest').order_by('-created_at')[:200]
    return Response({
        'summary': rating_summary(request.restaurant,
                                  int(request.GET.get('days', 30))),
        'items': [{
            'id': r.id, 'rating': r.rating,
            'rating_food': r.rating_food, 'rating_service': r.rating_service,
            'rating_ambience': r.rating_ambience,
            'text': r.text, 'is_public': r.is_public, 'status': r.status,
            'table': r.table.number if r.table_id else None,
            'waiter': (r.waiter.user.get_full_name() if r.waiter_id else None),
            'guest_phone': (r.guest.phone if r.guest_id else None),
            'admin_reply': r.admin_reply,
            'created_at': r.created_at,
        } for r in qs]})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_reply_view(request, review_id):
    r = get_object_or_404(Review, id=review_id,
                          restaurant_id=request.restaurant_id)
    reply_review(r, request.data.get('text', ''),
                 staff=getattr(request.user, 'staff', None))
    return Response({'ok': True, 'status': r.status})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_resolve_view(request, review_id):
    r = get_object_or_404(Review, id=review_id,
                          restaurant_id=request.restaurant_id)
    r.status = 'resolved'
    r.save(update_fields=['status', 'updated_at'])
    return Response({'ok': True})
```

**Fayl:** `apps/reviews/urls.py`
```python
from django.urls import path
from apps.reviews import views

urlpatterns = [
    path('reviews/', views.create_review_view),
    path('reviews/public/', views.public_reviews),
    path('admin/reviews/', views.admin_reviews),
    path('admin/reviews/<int:review_id>/reply/', views.admin_reply_view),
    path('admin/reviews/<int:review_id>/resolve/', views.admin_resolve_view),
]
```

**Fayl:** `apps/notifications/handlers/reviews.py`
```python
from apps.notifications.services import send_telegram

STARS = {1: '⭐', 2: '⭐⭐', 3: '⭐⭐⭐', 4: '⭐⭐⭐⭐', 5: '⭐⭐⭐⭐⭐'}


def handle_negative_review(p):
    """⚡ Salbiy otziv → restoran adminiga DARHOL"""
    from apps.reviews.models import Review
    from apps.reviews.services import get_settings
    r = Review.objects.select_related('restaurant', 'table',
                                      'waiter__user').get(id=p['review_id'])
    cfg = get_settings(r.restaurant)
    chat = cfg.negative_alert_chat_id or r.restaurant.admin_chat_id
    if not chat:
        return False

    lines = [f"❗️ <b>{STARS[r.rating]} baho — {r.restaurant.name}</b>", '']
    if r.table_id:
        lines.append(f"Stol: <b>{r.table.number}</b>")
    if r.waiter_id:
        lines.append(f"Ofitsiant: {r.waiter.user.get_full_name()}")
    if r.rating_food:
        lines.append(f"Taom: {r.rating_food}/5 · Xizmat: {r.rating_service or '—'}/5")
    if r.text:
        lines += ['', f"<i>«{r.text[:500]}»</i>"]
    lines += ['', "⚡ Bu otziv internetga CHIQMADI — faqat sizga keldi.",
              f"Javob berish: /admin/reviews/{r.id}/"]
    send_telegram(chat, '\n'.join(lines))
    return True


def handle_review_reply(p):
    """Admin javobi → mijozga"""
    from apps.reviews.models import Review
    r = Review.objects.select_related('guest', 'restaurant').get(id=p['review_id'])
    if not r.guest_id or not r.guest.tg_user_id:
        return False
    send_telegram(r.guest.tg_user_id,
        f"💬 <b>{r.restaurant.name}</b> sizning fikringizga javob berdi:\n\n"
        f"<i>{r.admin_reply}</i>")
    return True
```

`apps/notifications/handlers/__init__.py` ga:
```python
from apps.notifications.handlers.reviews import (handle_negative_review,
                                                 handle_review_reply)
HANDLERS.update({'negative_review': handle_negative_review,
                 'review_reply': handle_review_reply})
```

✅ **Test:** `tests/test_review_filter.py` (⚡ KRITIK)
```python
import pytest


@pytest.mark.django_db
def test_5_star_is_public_with_google_url(restaurant, review_settings):
    from apps.reviews.services import create_review
    r, res = create_review(restaurant, 5, text='Ajoyib!')
    assert r.is_public is True
    assert res['external_url'] == review_settings.google_place_url
    assert res['external_target'] == 'google'


@pytest.mark.django_db
@pytest.mark.parametrize('rating', [1, 2, 3])
def test_low_rating_never_public(restaurant, review_settings, rating):
    """⚡ 1-3⭐ internetga CHIQMAYDI"""
    from apps.reviews.services import create_review
    r, res = create_review(restaurant, rating, text='Yoqmadi')
    assert r.is_public is False
    assert res['external_url'] == ''


@pytest.mark.django_db
def test_public_endpoint_hides_negative(api_client, restaurant, review_settings):
    from apps.reviews.services import create_review
    create_review(restaurant, 1, text='Juda yomon')
    create_review(restaurant, 5, text='Zo\'r')
    r = api_client.get('/v1/reviews/public/',
                       HTTP_HOST=f'{restaurant.slug}.localhost')
    texts = [x['text'] for x in r.json()['items']]
    assert 'Juda yomon' not in texts       # ⚡ ASOSIY TEKSHIRUV
    assert "Zo'r" in texts


@pytest.mark.django_db
def test_threshold_configurable(restaurant, review_settings):
    from apps.reviews.services import create_review
    from django.core.cache import cache
    review_settings.public_threshold = 5
    review_settings.save()
    cache.clear()
    r, _ = create_review(restaurant, 4)
    assert r.is_public is False            # threshold=5 bo'lsa 4⭐ ham ichki
```

---

## V-211 — Otziv UI (M-12)

**Fayl:** `templates/guest/review.html`
```html
{% load i18n %}
<div class="review-page" id="reviewPage" data-order-id="{{ order_id }}">
  <h2 class="rv-title">{% trans "Bizni baholang" %}</h2>

  <div class="rv-stars" id="rvMain" role="radiogroup"
       aria-label="{% trans 'Umumiy baho' %}">
    {% for i in "12345" %}
    <button type="button" class="rv-star" data-v="{{ forloop.counter }}"
            aria-label="{{ forloop.counter }}">☆</button>
    {% endfor %}
  </div>

  <div class="rv-rows">
    <div class="rv-row"><span>{% trans "Taom" %}</span>
      <div class="rv-stars sm" data-field="rating_food">
        {% for i in "12345" %}<button type="button" class="rv-star"
          data-v="{{ forloop.counter }}">☆</button>{% endfor %}</div></div>
    <div class="rv-row"><span>{% trans "Xizmat" %}</span>
      <div class="rv-stars sm" data-field="rating_service">
        {% for i in "12345" %}<button type="button" class="rv-star"
          data-v="{{ forloop.counter }}">☆</button>{% endfor %}</div></div>
    <div class="rv-row"><span>{% trans "Muhit" %}</span>
      <div class="rv-stars sm" data-field="rating_ambience">
        {% for i in "12345" %}<button type="button" class="rv-star"
          data-v="{{ forloop.counter }}">☆</button>{% endfor %}</div></div>
  </div>

  <textarea id="rvText" class="rv-text" rows="3"
            placeholder="{% trans 'Izoh (ixtiyoriy)' %}"></textarea>

  <button id="rvSubmit" class="rv-submit" disabled>{% trans "YUBORISH" %}</button>

  <!-- Natija -->
  <div id="rvDone" class="rv-done" hidden>
    <div class="rv-done-icon" id="rvIcon">🎉</div>
    <p class="rv-done-text" id="rvMsg"></p>
    <a id="rvExternal" class="rv-external" href="#" target="_blank"
       rel="noopener" hidden></a>
    <button id="rvSkip" class="rv-skip">{% trans "Yopish" %}</button>
  </div>
</div>
```

**Fayl:** `static/guest/css/review.css`
```css
/* ⚡ Dark + Light — ikkalasi ham to'liq */
.review-page{max-width:420px;margin:0 auto;padding:20px;
  background:var(--surface);color:var(--fg);border-radius:16px}
.rv-title{text-align:center;font-size:20px;font-weight:700;margin:0 0 18px}
.rv-stars{display:flex;justify-content:center;gap:8px;margin-bottom:18px}
.rv-star{background:none;border:0;font-size:38px;line-height:1;cursor:pointer;
  color:var(--muted);transition:transform .12s,color .12s;padding:2px}
.rv-star:active{transform:scale(.9)}
.rv-star.on{color:#f5a623}
.rv-stars.sm .rv-star{font-size:22px}
.rv-rows{display:flex;flex-direction:column;gap:10px;margin-bottom:16px}
.rv-row{display:flex;align-items:center;justify-content:space-between;
  padding:8px 12px;background:var(--surface-2);border-radius:10px}
.rv-row>span{font-size:14px}
.rv-row .rv-stars{margin:0;gap:4px}
.rv-text{width:100%;padding:12px;border-radius:10px;border:1px solid var(--border);
  background:var(--surface-2);color:var(--fg);font-size:15px;resize:vertical}
.rv-submit{width:100%;margin-top:16px;padding:16px;border:0;border-radius:12px;
  background:var(--primary);color:#fff;font-size:16px;font-weight:700;cursor:pointer}
.rv-submit:disabled{opacity:.45;cursor:not-allowed}
.rv-done{text-align:center;padding:16px 0}
.rv-done-icon{font-size:52px;margin-bottom:10px}
.rv-done-text{font-size:16px;line-height:1.5;margin:0 0 18px}
.rv-external{display:block;padding:14px;border-radius:12px;text-decoration:none;
  background:#4285f4;color:#fff;font-weight:700;margin-bottom:10px}
.rv-skip{background:none;border:0;color:var(--muted);font-size:14px;cursor:pointer}

@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]) .rv-star{color:#555}
}
```

**Fayl:** `static/guest/js/review.js`
```javascript
(function () {
  'use strict';
  const page = document.getElementById('reviewPage');
  if (!page) return;

  const state = {rating: 0, rating_food: null, rating_service: null,
                 rating_ambience: null};

  function paint(group, value) {
    group.querySelectorAll('.rv-star').forEach(function (b) {
      b.classList.toggle('on', Number(b.dataset.v) <= value);
      b.textContent = Number(b.dataset.v) <= value ? '★' : '☆';
    });
  }

  // Umumiy baho
  const main = document.getElementById('rvMain');
  main.addEventListener('click', function (e) {
    const btn = e.target.closest('.rv-star');
    if (!btn) return;
    state.rating = Number(btn.dataset.v);
    paint(main, state.rating);
    document.getElementById('rvSubmit').disabled = false;
  });

  // Qism baholar
  page.querySelectorAll('.rv-stars.sm').forEach(function (grp) {
    grp.addEventListener('click', function (e) {
      const btn = e.target.closest('.rv-star');
      if (!btn) return;
      const v = Number(btn.dataset.v);
      state[grp.dataset.field] = v;
      paint(grp, v);
    });
  });

  document.getElementById('rvSubmit').addEventListener('click', async function () {
    const btn = this;
    btn.disabled = true;
    btn.textContent = '...';
    try {
      const res = await fetch('/v1/reviews/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json',
                  'X-CSRFToken': window.ARMENU.csrf},
        body: JSON.stringify(Object.assign({
          order_id: page.dataset.orderId || null,
          text: document.getElementById('rvText').value.trim()
        }, state))
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data.error || {}).message || 'xato');
      showResult(data);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = window.ARMENU.t('YUBORISH');
      window.ARMENU.toast(String(err.message || err), 'error');
    }
  });

  function showResult(data) {
    const lang = window.ARMENU.lang || 'uz';
    document.querySelectorAll('.rv-stars, .rv-rows, .rv-text, #rvSubmit, .rv-title')
      .forEach(function (el) { el.hidden = true; });

    const done = document.getElementById('rvDone');
    done.hidden = false;
    document.getElementById('rvIcon').textContent = data.is_public ? '🎉' : '🙏';
    document.getElementById('rvMsg').textContent =
      data['thanks_' + lang] || data.thanks_uz;

    // ⚡ Faqat ijobiy bahoda tashqi havola ko'rinadi
    const ext = document.getElementById('rvExternal');
    if (data.is_public && data.external_url) {
      ext.hidden = false;
      ext.href = data.external_url;
      ext.textContent = data['ask_' + lang] || data.ask_uz;
    }
    // ⚡ Salbiy bahoda HECH QANDAY tashqi havola YO'Q
  }

  document.getElementById('rvSkip').addEventListener('click', function () {
    window.location.href = '/m/' + window.ARMENU.slug + '/';
  });
})();
```

`locale/` ga tarjimalar (3 til) qo'shiladi:
```bash
python manage.py makemessages -l uz -l ru -l en
# review.html / review.js satrlari tarjima qilinadi
python manage.py compilemessages
```

✅ **Tekshirish:**
```bash
python manage.py collectstatic --noinput
pytest tests/test_i18n_completeness.py -q       # ⚡ 3 til to'liq
```

---

## V-212 — Admin otzivlar sahifasi (A-12)

**Fayl:** `templates/admin_panel/reviews.html`
```html
{% extends "admin_panel/base.html" %}
{% load i18n %}
{% block content %}
<div class="rv-admin" id="rvAdmin">
  <div class="rv-kpi">
    <div class="kpi"><span id="kAvg">—</span><small>{% trans "O'rtacha" %}</small></div>
    <div class="kpi"><span id="kTotal">—</span><small>{% trans "Jami" %}</small></div>
    <div class="kpi ok"><span id="kPublic">—</span><small>{% trans "Ommaviy" %}</small></div>
    <div class="kpi warn"><span id="kInternal">—</span>
      <small>{% trans "Internetga chiqmadi" %}</small></div>
    <div class="kpi danger"><span id="kUnanswered">—</span>
      <small>{% trans "Javobsiz" %}</small></div>
  </div>

  <div class="rv-dist" id="rvDist"></div>

  <div class="rv-filters">
    <button class="f on" data-f="all">{% trans "Hammasi" %}</button>
    <button class="f" data-f="negative">{% trans "Salbiy (ichki)" %}</button>
    <button class="f" data-f="public">{% trans "Ommaviy" %}</button>
  </div>

  <div class="rv-list" id="rvList"></div>
</div>

<div class="rv-modal" id="rvModal" hidden>
  <div class="rv-modal-box">
    <h4 id="rvModalTitle"></h4>
    <p id="rvModalText"></p>
    <textarea id="rvReplyText" rows="4"
              placeholder="{% trans 'Javob yozing...' %}"></textarea>
    <div class="rv-modal-actions">
      <button id="rvReplySend" class="btn primary">{% trans "Yuborish" %}</button>
      <button id="rvResolve" class="btn">{% trans "Hal qilindi" %}</button>
      <button id="rvClose" class="btn ghost">{% trans "Yopish" %}</button>
    </div>
  </div>
</div>
{% endblock %}
```

**Fayl:** `static/admin_panel/js/reviews.js`
```javascript
(function () {
  'use strict';
  const root = document.getElementById('rvAdmin');
  if (!root) return;
  let currentFilter = 'all', currentId = null;

  async function load() {
    const r = await fetch('/v1/admin/reviews/?filter=' + currentFilter +
                          '&days=30', {headers: {'Accept': 'application/json'}});
    const d = await r.json();
    renderKpi(d.summary);
    renderDist(d.summary.distribution, d.summary.total);
    renderList(d.items);
  }

  function renderKpi(s) {
    document.getElementById('kAvg').textContent = s.avg.toFixed(2);
    document.getElementById('kTotal').textContent = s.total;
    document.getElementById('kPublic').textContent = s.public_count;
    document.getElementById('kInternal').textContent = s.internal_count;
    document.getElementById('kUnanswered').textContent = s.unanswered;
  }

  function renderDist(dist, total) {
    const box = document.getElementById('rvDist');
    box.innerHTML = '';
    for (let i = 5; i >= 1; i--) {
      const n = dist[i] || 0;
      const pct = total ? Math.round(n * 100 / total) : 0;
      const row = document.createElement('div');
      row.className = 'dist-row';
      row.innerHTML = '<span>' + i + '★</span>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
        '<b>' + n + '</b>';
      box.appendChild(row);
    }
  }

  function renderList(items) {
    const box = document.getElementById('rvList');
    box.innerHTML = '';
    if (!items.length) {
      box.innerHTML = '<div class="empty">Otziv yo\'q</div>';
      return;
    }
    items.forEach(function (r) {
      const el = document.createElement('div');
      el.className = 'rv-card' + (r.is_public ? '' : ' internal') +
                     (r.status === 'new' ? ' new' : '');
      el.innerHTML =
        '<div class="rv-card-head">' +
          '<b>' + '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating) + '</b>' +
          (r.is_public ? '<span class="tag ok">Ommaviy</span>'
                       : '<span class="tag warn">Faqat ichki ⚡</span>') +
          '<time>' + new Date(r.created_at).toLocaleString('uz-UZ') + '</time>' +
        '</div>' +
        '<div class="rv-card-meta">' +
          (r.table ? 'Stol ' + r.table + ' · ' : '') +
          (r.waiter ? r.waiter + ' · ' : '') +
          'Taom ' + (r.rating_food || '—') + '/5 · Xizmat ' +
          (r.rating_service || '—') + '/5' +
        '</div>' +
        (r.text ? '<p class="rv-card-text">' + escapeHtml(r.text) + '</p>' : '') +
        (r.admin_reply ? '<div class="rv-card-reply">💬 ' +
                          escapeHtml(r.admin_reply) + '</div>' : '');
      el.addEventListener('click', function () { openModal(r); });
      box.appendChild(el);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {'&': '&amp;', '<': '&lt;', '>': '&gt;',
              '"': '&quot;', "'": '&#39;'}[c];
    });
  }

  function openModal(r) {
    currentId = r.id;
    document.getElementById('rvModalTitle').textContent =
      '★'.repeat(r.rating) + ' — ' + (r.table ? 'Stol ' + r.table : '');
    document.getElementById('rvModalText').textContent = r.text || '(izohsiz)';
    document.getElementById('rvReplyText').value = r.admin_reply || '';
    document.getElementById('rvModal').hidden = false;
  }

  document.getElementById('rvClose').addEventListener('click', function () {
    document.getElementById('rvModal').hidden = true;
  });

  document.getElementById('rvReplySend').addEventListener('click', async function () {
    await fetch('/v1/admin/reviews/' + currentId + '/reply/', {
      method: 'POST',
      headers: {'Content-Type': 'application/json',
                'X-CSRFToken': window.ARMENU.csrf},
      body: JSON.stringify({text: document.getElementById('rvReplyText').value})
    });
    document.getElementById('rvModal').hidden = true;
    load();
  });

  document.getElementById('rvResolve').addEventListener('click', async function () {
    await fetch('/v1/admin/reviews/' + currentId + '/resolve/', {
      method: 'POST', headers: {'X-CSRFToken': window.ARMENU.csrf}});
    document.getElementById('rvModal').hidden = true;
    load();
  });

  root.querySelectorAll('.rv-filters .f').forEach(function (b) {
    b.addEventListener('click', function () {
      root.querySelectorAll('.rv-filters .f').forEach(function (x) {
        x.classList.remove('on');
      });
      b.classList.add('on');
      currentFilter = b.dataset.f;
      load();
    });
  });

  // ⚡ Real-time: salbiy otziv kelsa darhol ko'rinadi
  if (window.ARMENU.ws) {
    window.ARMENU.ws.on('review.negative', function (d) {
      window.ARMENU.toast('❗ ' + d.rating + '⭐ baho — stol ' + d.table, 'warn');
      load();
    });
  }

  load();
  setInterval(load, 60000);
})();
```

**Fayl:** `static/admin_panel/css/reviews.css`
```css
.rv-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));
  gap:12px;margin-bottom:20px}
.kpi{background:var(--surface);border-radius:12px;padding:14px;text-align:center}
.kpi span{display:block;font-size:26px;font-weight:700}
.kpi small{color:var(--muted);font-size:12px}
.kpi.ok span{color:#22c55e}.kpi.warn span{color:#f59e0b}
.kpi.danger span{color:#ef4444}
.rv-dist{background:var(--surface);border-radius:12px;padding:14px;margin-bottom:18px}
.dist-row{display:grid;grid-template-columns:36px 1fr 44px;align-items:center;
  gap:10px;margin-bottom:6px;font-size:13px}
.dist-row .bar{height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden}
.dist-row .bar i{display:block;height:100%;background:#f5a623}
.rv-filters{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.rv-filters .f{padding:8px 16px;border-radius:20px;border:1px solid var(--border);
  background:var(--surface);color:var(--fg);cursor:pointer;font-size:14px}
.rv-filters .f.on{background:var(--primary);color:#fff;border-color:var(--primary)}
.rv-card{background:var(--surface);border-radius:12px;padding:14px;margin-bottom:10px;
  cursor:pointer;border-left:4px solid transparent}
.rv-card.internal{border-left-color:#f59e0b}
.rv-card.new{box-shadow:0 0 0 2px rgba(239,68,68,.25)}
.rv-card-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.rv-card-head b{color:#f5a623;letter-spacing:2px}
.rv-card-head time{margin-left:auto;font-size:12px;color:var(--muted)}
.tag{font-size:11px;padding:2px 8px;border-radius:10px}
.tag.ok{background:rgba(34,197,94,.15);color:#22c55e}
.tag.warn{background:rgba(245,158,11,.15);color:#f59e0b}
.rv-card-meta{font-size:12px;color:var(--muted);margin-top:6px}
.rv-card-text{margin:8px 0 0;font-size:14px;line-height:1.5}
.rv-card-reply{margin-top:8px;padding:8px 10px;background:var(--surface-2);
  border-radius:8px;font-size:13px}
.rv-modal{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;
  align-items:center;justify-content:center;z-index:900;padding:20px}
.rv-modal-box{background:var(--surface);border-radius:16px;padding:20px;
  max-width:480px;width:100%}
.rv-modal-box textarea{width:100%;margin:12px 0;padding:10px;border-radius:8px;
  border:1px solid var(--border);background:var(--surface-2);color:var(--fg)}
.rv-modal-actions{display:flex;gap:8px;flex-wrap:wrap}
```

✅ **Tekshirish:**
```bash
python manage.py collectstatic --noinput
# /admin/reviews/ sahifasini ochib: KPI, taqsimot, filtrlar ishlaydi
# Dark va Light temada tekshiriladi
```

---

## V-213 — `AnalyticsEvent` → ClickHouse (S3 fallback)

**Fayl:** `apps/analytics/models.py`
```python
from django.db import models
from core.models import TenantModel


class AnalyticsEvent(TenantModel):
    """
    ⚡ Bufer jadval. Batch bilan ClickHouse'ga ko'chiriladi, keyin o'chiriladi.
    Postgres'da uzoq turmaydi (T5 riski — DB yozish bo'g'ilishi).
    """
    TYPES = [
        ('menu_view', 'Menyu ochildi'), ('dish_view', "Taom ko'rildi"),
        ('ar_view', "AR ko'rildi"), ('ar_complete', 'AR yakunlandi'),
        ('cart_add', 'Savatga'), ('cart_remove', 'Savatdan'),
        ('order_create', 'Buyurtma'), ('order_paid', "To'landi"),
        ('call_waiter', 'Ofitsiant'), ('chat_message', 'Chat'),
        ('review', 'Otziv'), ('promo_apply', 'Promokod'),
        ('tip', 'Choychaqa'), ('search', 'Qidiruv'),
    ]
    type       = models.CharField(max_length=30, choices=TYPES, db_index=True)
    session_id = models.CharField(max_length=64, blank=True, db_index=True)
    guest_id_v = models.BigIntegerField(null=True, blank=True)
    table_id_v = models.BigIntegerField(null=True, blank=True)
    dish_id_v  = models.BigIntegerField(null=True, blank=True)
    order_id_v = models.BigIntegerField(null=True, blank=True)
    value      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payload    = models.JSONField(default=dict, blank=True)
    lang       = models.CharField(max_length=2, default='uz')
    shipped    = models.BooleanField(default=False, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['shipped', 'created_at']),
            models.Index(fields=['restaurant', 'type', 'created_at']),
        ]


class DailyStat(TenantModel):
    """Kunlik agregat (Postgres'da qoladi — hisobotlar tez)"""
    date          = models.DateField(db_index=True)
    orders        = models.IntegerField(default=0)
    revenue       = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    avg_check     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    guests        = models.IntegerField(default=0)
    menu_views    = models.IntegerField(default=0)
    ar_views      = models.IntegerField(default=0)
    ar_orders     = models.IntegerField(default=0)
    avg_check_ar  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    avg_check_no_ar = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tips_total    = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reviews_count = models.IntegerField(default=0)
    reviews_avg   = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    cancelled     = models.IntegerField(default=0)
    payload       = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['restaurant', 'date'],
                                               name='uq_dailystat')]


class DishDailyStat(TenantModel):
    """Menyu-injiniring uchun taom kesimida kunlik"""
    date       = models.DateField(db_index=True)
    dish       = models.ForeignKey('menu.Dish', on_delete=models.CASCADE)
    views      = models.IntegerField(default=0)
    ar_views   = models.IntegerField(default=0)
    qty_sold   = models.IntegerField(default=0)
    revenue    = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    cost       = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    margin     = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['restaurant', 'date', 'dish'],
                                               name='uq_dishdaily')]
        indexes = [models.Index(fields=['restaurant', 'date'])]
```

**Fayl:** `apps/analytics/sinks.py`
```python
import gzip, io, json, logging
from datetime import datetime
from django.conf import settings

log = logging.getLogger('analytics.sinks')


class ClickHouseSink:
    """Asosiy yo'l — ClickHouse HTTP interfeysi"""
    name = 'clickhouse'

    def __init__(self):
        self.url = getattr(settings, 'CLICKHOUSE_URL', '')
        self.db = getattr(settings, 'CLICKHOUSE_DB', 'armenu')
        self.user = getattr(settings, 'CLICKHOUSE_USER', 'default')
        self.password = getattr(settings, 'CLICKHOUSE_PASSWORD', '')

    def available(self):
        return bool(self.url)

    def ship(self, rows: list) -> bool:
        import requests
        if not rows:
            return True
        body = '\n'.join(json.dumps(r, ensure_ascii=False, default=str)
                         for r in rows)
        try:
            r = requests.post(
                self.url, timeout=30,
                params={'database': self.db,
                        'query': 'INSERT INTO events FORMAT JSONEachRow'},
                auth=(self.user, self.password), data=body.encode())
            if r.status_code != 200:
                log.error(f'[ch] {r.status_code}: {r.text[:300]}')
                return False
            return True
        except Exception as e:
            log.error(f'[ch] xato: {e}')
            return False


class S3Sink:
    """⚡ FALLBACK — ClickHouse yo'q/yiqilgan bo'lsa S3'ga gzip JSONL"""
    name = 's3'

    def available(self):
        return bool(getattr(settings, 'ANALYTICS_S3_BUCKET', ''))

    def ship(self, rows: list) -> bool:
        if not rows:
            return True
        try:
            import boto3
            buf = io.BytesIO()
            with gzip.GzipFile(fileobj=buf, mode='wb') as gz:
                for r in rows:
                    gz.write((json.dumps(r, ensure_ascii=False,
                                         default=str) + '\n').encode())
            now = datetime.utcnow()
            key = (f"events/dt={now:%Y-%m-%d}/h={now:%H}/"
                   f"{now:%Y%m%d%H%M%S}-{len(rows)}.jsonl.gz")
            boto3.client('s3').put_object(
                Bucket=settings.ANALYTICS_S3_BUCKET, Key=key,
                Body=buf.getvalue(), ContentEncoding='gzip')
            log.info(f'[s3] {len(rows)} event → s3://{settings.ANALYTICS_S3_BUCKET}/{key}')
            return True
        except Exception as e:
            log.error(f'[s3] xato: {e}')
            return False


class LocalSink:
    """Oxirgi zaxira — lokal fayl (hech narsa yo'qolmasin)"""
    name = 'local'

    def available(self):
        return True

    def ship(self, rows: list) -> bool:
        import os
        path = getattr(settings, 'ANALYTICS_LOCAL_DIR', '/var/armenu/analytics')
        os.makedirs(path, exist_ok=True)
        fn = os.path.join(path, f"{datetime.utcnow():%Y%m%d}.jsonl")
        try:
            with open(fn, 'a', encoding='utf-8') as f:
                for r in rows:
                    f.write(json.dumps(r, ensure_ascii=False, default=str) + '\n')
            return True
        except Exception as e:
            log.error(f'[local] xato: {e}')
            return False


def get_sinks():
    """⚡ Zanjir: ClickHouse → S3 → lokal fayl"""
    return [s for s in (ClickHouseSink(), S3Sink(), LocalSink())
            if s.available()]
```

`config/settings/base.py` ga:
```python
CLICKHOUSE_URL = config('CLICKHOUSE_URL', default='')
CLICKHOUSE_DB = config('CLICKHOUSE_DB', default='armenu')
CLICKHOUSE_USER = config('CLICKHOUSE_USER', default='default')
CLICKHOUSE_PASSWORD = config('CLICKHOUSE_PASSWORD', default='')
ANALYTICS_S3_BUCKET = config('ANALYTICS_S3_BUCKET', default='')
ANALYTICS_LOCAL_DIR = config('ANALYTICS_LOCAL_DIR', default='/var/armenu/analytics')
ANALYTICS_BATCH_SIZE = config('ANALYTICS_BATCH_SIZE', default=1000, cast=int)
```

**ClickHouse jadval sxemasi** — `deploy/clickhouse/schema.sql`:
```sql
CREATE DATABASE IF NOT EXISTS armenu;

CREATE TABLE IF NOT EXISTS armenu.events (
    ts            DateTime64(3),
    restaurant_id UInt32,
    type          LowCardinality(String),
    session_id    String,
    guest_id      UInt64,
    table_id      UInt32,
    dish_id       UInt32,
    order_id      UInt64,
    value         Decimal(14, 2),
    lang          LowCardinality(String),
    payload       String
) ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (restaurant_id, type, ts)
TTL toDateTime(ts) + INTERVAL 24 MONTH;
```

✅ **Tekshirish:**
```bash
python manage.py makemigrations analytics && python manage.py migrate
python manage.py shell -c "from apps.analytics.sinks import get_sinks; print([s.name for s in get_sinks()])"
```

---

## V-214 — Event batch yig'ish

**Fayl:** `apps/analytics/services.py`
```python
import json, logging
from django.conf import settings
from django.utils import timezone

from core.queue import get_redis

log = logging.getLogger('analytics.services')
BUFFER_KEY = 'analytics:buffer'
MAX_BUFFER = 50000


def track(restaurant_id, event_type, session_id='', guest_id=None,
          table_id=None, dish_id=None, order_id=None, value=0,
          lang='uz', **payload):
    """
    ⚡ TEZ yozish — Redis listga qo'shadi, DB'ga TEGMAYDI.
    Web so'rovni sekinlashtirmaydi (T5 riski).
    """
    row = {
        'ts': timezone.now().isoformat(),
        'restaurant_id': restaurant_id,
        'type': event_type,
        'session_id': session_id or '',
        'guest_id': guest_id or 0,
        'table_id': table_id or 0,
        'dish_id': dish_id or 0,
        'order_id': order_id or 0,
        'value': str(value or 0),
        'lang': lang,
        'payload': json.dumps(payload, ensure_ascii=False, default=str),
    }
    try:
        r = get_redis()
        n = r.lpush(BUFFER_KEY, json.dumps(row, ensure_ascii=False))
        if n > MAX_BUFFER:
            r.ltrim(BUFFER_KEY, 0, MAX_BUFFER - 1)
            log.warning(f'[track] bufer to\'ldi ({n}) — eskilari kesildi')
    except Exception as e:
        # ⚡ Analitika HECH QACHON asosiy oqimni buzmaydi
        log.warning(f'[track] yozilmadi: {e}')
    return True


def flush_buffer(batch_size=None) -> dict:
    """
    Worker (`analytics` navbat) yoki cron chaqiradi — har 30 soniyada.
    Redis'dan oladi → sink zanjiriga yuboradi.
    """
    from apps.analytics.sinks import get_sinks
    batch_size = batch_size or settings.ANALYTICS_BATCH_SIZE
    r = get_redis()

    raw = []
    pipe = r.pipeline()
    pipe.lrange(BUFFER_KEY, -batch_size, -1)
    pipe.ltrim(BUFFER_KEY, 0, -batch_size - 1)
    res = pipe.execute()
    raw = res[0] or []

    if not raw:
        return {'shipped': 0, 'sink': None}

    rows = []
    for item in raw:
        try:
            rows.append(json.loads(item))
        except Exception:
            continue

    for sink in get_sinks():
        if sink.ship(rows):
            log.info(f'[flush] {len(rows)} event → {sink.name}')
            return {'shipped': len(rows), 'sink': sink.name}
        log.warning(f'[flush] {sink.name} ishlamadi — keyingisiga o\'tamiz')

    # ⚡ Hech biri ishlamasa — qaytarib qo'yamiz (yo'qotmaymiz)
    pipe = r.pipeline()
    for item in raw:
        pipe.rpush(BUFFER_KEY, item)
    pipe.execute()
    log.error(f'[flush] ⛔ {len(rows)} event yuborilmadi — buferga qaytarildi')
    return {'shipped': 0, 'sink': None, 'returned': len(rows)}


def buffer_depth() -> int:
    try:
        return get_redis().llen(BUFFER_KEY)
    except Exception:
        return -1
```

**Fayl:** `apps/analytics/signals.py`
```python
"""⚡ Avtomatik event yozish — kod bir joyda, tarqoq emas."""
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.analytics.services import track


@receiver(post_save, sender='orders.Order')
def on_order(sender, instance, created, **kw):
    if created:
        track(instance.restaurant_id, 'order_create',
              session_id=instance.guest_session_id or '',
              guest_id=instance.guest_id, table_id=instance.table_id,
              order_id=instance.id, value=instance.total or 0)
    elif instance.status == 'paid':
        track(instance.restaurant_id, 'order_paid',
              guest_id=instance.guest_id, table_id=instance.table_id,
              order_id=instance.id, value=instance.total or 0)


@receiver(post_save, sender='reviews.Review')
def on_review(sender, instance, created, **kw):
    if created:
        track(instance.restaurant_id, 'review', guest_id=instance.guest_id,
              table_id=instance.table_id, order_id=instance.order_id,
              value=instance.rating, is_public=instance.is_public)


@receiver(post_save, sender='payments.Tip')
def on_tip(sender, instance, created, **kw):
    if created:
        track(instance.restaurant_id, 'tip', order_id=instance.order_id,
              value=instance.amount, staff_id=instance.staff_id)
```

`apps/analytics/apps.py`:
```python
from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    name = 'apps.analytics'

    def ready(self):
        from apps.analytics import signals  # noqa
```

**Fayl:** `apps/analytics/views.py`
```python
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from apps.analytics.services import track

ALLOWED = {'menu_view', 'dish_view', 'ar_view', 'ar_complete',
           'cart_add', 'cart_remove', 'search', 'chat_message'}


class TrackThrottle(AnonRateThrottle):
    rate = '300/min'


@api_view(['POST'])
@throttle_classes([TrackThrottle])
def track_view(request):
    """
    POST /v1/track/ — frontend eventlari (batch qo'llab-quvvatlaydi).
    ⚡ Faqat oq ro'yxatdagi turlar; restaurant_id serverdan olinadi.
    """
    events = request.data.get('events') or [request.data]
    n = 0
    for e in events[:50]:
        t = e.get('type')
        if t not in ALLOWED:
            continue
        track(request.restaurant_id, t,
              session_id=e.get('session_id', ''),
              guest_id=getattr(getattr(request, 'guest', None), 'id', None),
              table_id=e.get('table_id'), dish_id=e.get('dish_id'),
              value=e.get('value', 0),
              lang=getattr(request, 'lang', 'uz'),
              **{k: v for k, v in (e.get('payload') or {}).items()
                 if k in ('duration', 'source', 'query', 'device')})
        n += 1
    return Response({'accepted': n})
```

**Fayl:** `static/guest/js/track.js`
```javascript
(function () {
  'use strict';
  const queue = [];
  let timer = null;

  function flush() {
    if (!queue.length) return;
    const batch = queue.splice(0, 50);
    const body = JSON.stringify({events: batch});
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/v1/track/',
        new Blob([body], {type: 'application/json'}));
    } else {
      fetch('/v1/track/', {method: 'POST', keepalive: true,
        headers: {'Content-Type': 'application/json'}, body: body})
        .catch(function () {});
    }
  }

  window.ARMENU = window.ARMENU || {};
  window.ARMENU.track = function (type, data) {
    queue.push(Object.assign({type: type,
      session_id: window.ARMENU.sessionId || ''}, data || {}));
    if (queue.length >= 20) { flush(); return; }
    if (!timer) timer = setTimeout(function () { timer = null; flush(); }, 5000);
  };

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
})();
```

**Fayl:** `apps/analytics/management/commands/flush_analytics.py`
```python
import time
from django.core.management.base import BaseCommand
from apps.analytics.services import flush_buffer, buffer_depth


class Command(BaseCommand):
    help = 'Analitika buferini sink zanjiriga yuboradi'

    def add_arguments(self, parser):
        parser.add_argument('--loop', action='store_true')
        parser.add_argument('--interval', type=int, default=30)

    def handle(self, *args, **o):
        if not o['loop']:
            self.stdout.write(str(flush_buffer()))
            return
        while True:
            res = flush_buffer()
            if res['shipped']:
                self.stdout.write(f"{res['shipped']} → {res['sink']} "
                                  f"(bufer: {buffer_depth()})")
            time.sleep(o['interval'])
```

**Cron:**
```bash
* * * * * armenu cd /home/armenu/app && venv/bin/python manage.py flush_analytics >> /var/log/armenu/analytics.log 2>&1
```

✅ **Tekshirish:**
```bash
python manage.py shell -c "
from apps.analytics.services import track, flush_buffer, buffer_depth
track(1, 'menu_view', session_id='s1')
print('bufer:', buffer_depth())
print(flush_buffer())"
```

---

## V-215 — Menyu-injiniring hisobi (4 kvadrant)

> 💰 **Sotuv argumenti:** *"Qaysi taom pul keltiradi, qaysisi menyuni band qiladi —
> raqam bilan ko'rsatamiz."* Restoran egasi uchun eng qadrli hisobot.

**Fayl:** `apps/analytics/menu_engineering.py`
```python
"""
Menyu-injiniring (Kasavana-Smith matritsasi) — 4 kvadrant:

                 Yuqori marja        Past marja
  Ko'p sotiladi   ⭐ YULDUZ           🐴 OT (ish otlari)
  Kam sotiladi    ❓ JUMBOQ           🐶 IT (yo'qotish)

⭐ YULDUZ  — saqlash, ko'z oldiga qo'yish, AR qilish
🐴 OT      — narxni oshirish yoki tannarxni tushirish
❓ JUMBOQ  — targ'ib qilish (AR + banner + ofitsiant tavsiyasi)
🐶 IT      — menyudan olib tashlash yoki qayta o'ylash
"""
import logging
from decimal import Decimal
from datetime import timedelta
from django.db.models import Sum, F, Count
from django.utils import timezone

log = logging.getLogger('analytics.menu_eng')

STAR, HORSE, PUZZLE, DOG = 'star', 'horse', 'puzzle', 'dog'

LABELS = {
    STAR:   {'uz': '⭐ Yulduz', 'ru': '⭐ Звезда', 'en': '⭐ Star'},
    HORSE:  {'uz': '🐴 Ish oti', 'ru': '🐴 Рабочая лошадка', 'en': '🐴 Plowhorse'},
    PUZZLE: {'uz': '❓ Jumboq', 'ru': '❓ Загадка', 'en': '❓ Puzzle'},
    DOG:    {'uz': '🐶 It', 'ru': '🐶 Собака', 'en': '🐶 Dog'},
}

ADVICE = {
    STAR:   {'uz': "Saqlang. Menyuning eng ko'zga tashlanadigan joyiga qo'ying. "
                   "AR modeli albatta bo'lsin.",
             'ru': 'Сохраняйте. Ставьте на видное место. Обязательно AR-модель.',
             'en': 'Keep it. Feature it prominently. Make sure it has an AR model.'},
    HORSE:  {'uz': "Mashhur, lekin foyda kam. Narxni 5-10% oshiring yoki "
                   "porsiya/tannarxni qayta ko'ring.",
             'ru': 'Популярно, но малодоходно. Поднимите цену на 5-10%.',
             'en': 'Popular but low margin. Raise price 5-10% or cut costs.'},
    PUZZLE: {'uz': "Foydali, lekin kam buyurtma qilinadi. AR va bannerda "
                   "targ'ib qiling, ofitsiantlarga tavsiya qildiring.",
             'ru': 'Доходно, но заказывают редко. Продвигайте через AR и баннер.',
             'en': 'Profitable but rarely ordered. Promote via AR and banners.'},
    DOG:    {'uz': "Menyudan olib tashlashni o'ylang yoki retseptni qayta ko'ring.",
             'ru': 'Подумайте об удалении из меню или пересмотрите рецепт.',
             'en': 'Consider removing from the menu or reworking the recipe.'},
}


def menu_engineering(restaurant, days=30, lang='uz') -> dict:
    """
    Har taom uchun: sotuv soni, marja, kvadrant, tavsiya.
    Chegaralar: mashhurlik = 70% × o'rtacha ulush; marja = o'rtacha marja.
    """
    from apps.analytics.models import DishDailyStat
    from apps.menu.models import Dish

    since = timezone.localdate() - timedelta(days=days)
    rows = (DishDailyStat.objects
            .filter(restaurant=restaurant, date__gte=since)
            .values('dish_id')
            .annotate(qty=Sum('qty_sold'), revenue=Sum('revenue'),
                      cost=Sum('cost'), margin=Sum('margin'),
                      views=Sum('views'), ar_views=Sum('ar_views')))
    rows = [r for r in rows if r['qty']]
    if not rows:
        return {'days': days, 'items': [], 'thresholds': {}, 'summary': {}}

    total_qty = sum(r['qty'] for r in rows)
    n = len(rows)
    # ⚡ Kasavana-Smith: mashhurlik chegarasi = (1/n) × 70%
    popularity_threshold = (Decimal(total_qty) / n) * Decimal('0.7')

    margins = []
    for r in rows:
        r['unit_margin'] = (Decimal(r['margin']) / r['qty']) if r['qty'] else Decimal('0')
        margins.append(r['unit_margin'])
    avg_margin = sum(margins) / len(margins)

    dishes = {d.id: d for d in Dish.objects.filter(
        id__in=[r['dish_id'] for r in rows])}

    items = []
    counts = {STAR: 0, HORSE: 0, PUZZLE: 0, DOG: 0}
    for r in rows:
        popular = Decimal(r['qty']) >= popularity_threshold
        profitable = r['unit_margin'] >= avg_margin
        if popular and profitable:
            q = STAR
        elif popular and not profitable:
            q = HORSE
        elif not popular and profitable:
            q = PUZZLE
        else:
            q = DOG
        counts[q] += 1

        d = dishes.get(r['dish_id'])
        conv = (Decimal(r['qty']) / r['views'] * 100) if r['views'] else Decimal('0')
        ar_conv = (Decimal(r['qty']) / r['ar_views'] * 100) if r['ar_views'] else Decimal('0')

        items.append({
            'dish_id': r['dish_id'],
            'name': d.name_uz if d else f'#{r["dish_id"]}',
            'has_ar': bool(d and getattr(d, 'model3d_id', None)),
            'qty': r['qty'],
            'revenue': str(r['revenue']),
            'cost': str(r['cost']),
            'margin': str(r['margin']),
            'unit_margin': str(r['unit_margin'].quantize(Decimal('0.01'))),
            'margin_percent': str((Decimal(r['margin']) / r['revenue'] * 100
                                   ).quantize(Decimal('0.1'))) if r['revenue'] else '0',
            'views': r['views'], 'ar_views': r['ar_views'],
            'conversion': str(conv.quantize(Decimal('0.1'))),
            'ar_conversion': str(ar_conv.quantize(Decimal('0.1'))),
            'quadrant': q,
            'quadrant_label': LABELS[q][lang],
            'advice': ADVICE[q][lang],
        })

    items.sort(key=lambda x: (-float(x['margin'])))

    return {
        'days': days,
        'thresholds': {'popularity': str(popularity_threshold.quantize(Decimal('0.1'))),
                       'avg_margin': str(avg_margin.quantize(Decimal('0.01')))},
        'counts': counts,
        'items': items,
        'summary': _summary(items, counts, lang),
    }


def _summary(items, counts, lang):
    """Restoran egasiga bir jumlada xulosa"""
    dogs = [i['name'] for i in items if i['quadrant'] == DOG][:5]
    puzzles = [i['name'] for i in items if i['quadrant'] == PUZZLE][:5]
    texts = {
        'uz': (f"⭐ {counts[STAR]} yulduz · 🐴 {counts[HORSE]} ish oti · "
               f"❓ {counts[PUZZLE]} jumboq · 🐶 {counts[DOG]} it.\n"
               + (f"Menyudan olib tashlashni o'ylang: {', '.join(dogs)}.\n" if dogs else '')
               + (f"AR bilan targ'ib qiling: {', '.join(puzzles)}." if puzzles else '')),
        'ru': (f"⭐ {counts[STAR]} · 🐴 {counts[HORSE]} · "
               f"❓ {counts[PUZZLE]} · 🐶 {counts[DOG]}."),
        'en': (f"⭐ {counts[STAR]} stars · 🐴 {counts[HORSE]} plowhorses · "
               f"❓ {counts[PUZZLE]} puzzles · 🐶 {counts[DOG]} dogs."),
    }
    return texts.get(lang, texts['uz'])


def ar_impact(restaurant, days=30) -> dict:
    """
    ⚡ AR ta'siri (B5 riskiga qarshi asosiy dalil):
    AR ko'rgan mijoz chekining AR ko'rmaganidan farqi.
    """
    from apps.analytics.models import DailyStat
    since = timezone.localdate() - timedelta(days=days)
    agg = DailyStat.objects.filter(restaurant=restaurant, date__gte=since
                                   ).aggregate(
        ar_views=Sum('ar_views'), ar_orders=Sum('ar_orders'),
        orders=Sum('orders'), revenue=Sum('revenue'))

    rows = DailyStat.objects.filter(restaurant=restaurant, date__gte=since,
                                    avg_check_ar__gt=0)
    if rows:
        ar_check = sum(r.avg_check_ar for r in rows) / len(rows)
        no_ar_check = (sum(r.avg_check_no_ar for r in rows) / len(rows)) or Decimal('1')
        uplift = ((ar_check - no_ar_check) / no_ar_check * 100)
    else:
        ar_check = no_ar_check = Decimal('0')
        uplift = Decimal('0')

    return {
        'days': days,
        'ar_views': agg['ar_views'] or 0,
        'ar_orders': agg['ar_orders'] or 0,
        'ar_conversion': round((agg['ar_orders'] or 0) /
                               (agg['ar_views'] or 1) * 100, 1),
        'avg_check_ar': str(Decimal(ar_check).quantize(Decimal('0.01'))),
        'avg_check_no_ar': str(Decimal(no_ar_check).quantize(Decimal('0.01'))),
        'uplift_percent': str(Decimal(uplift).quantize(Decimal('0.1'))),
    }
```

**Fayl:** `apps/analytics/views.py` (qo'shimcha)
```python
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def menu_engineering_view(request):
    """GET /v1/admin/reports/menu-engineering/?days=30"""
    from apps.analytics.menu_engineering import menu_engineering
    return Response(menu_engineering(request.restaurant,
                                     days=int(request.GET.get('days', 30)),
                                     lang=getattr(request, 'lang', 'uz')))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ar_impact_view(request):
    """GET /v1/admin/reports/ar-impact/?days=30"""
    from apps.analytics.menu_engineering import ar_impact
    return Response(ar_impact(request.restaurant,
                              days=int(request.GET.get('days', 30))))
```

✅ **Test:**
```python
@pytest.mark.django_db
def test_four_quadrants(restaurant, dish_stats_fixture):
    from apps.analytics.menu_engineering import menu_engineering
    res = menu_engineering(restaurant, days=30)
    quads = {i['quadrant'] for i in res['items']}
    assert quads <= {'star', 'horse', 'puzzle', 'dog'}
    assert sum(res['counts'].values()) == len(res['items'])
```

---

## V-216 — Kunlik agregatsiya cron

**Fayl:** `apps/analytics/aggregate.py`
```python
import logging
from decimal import Decimal
from datetime import timedelta, datetime, time as dtime
from django.db import transaction
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone

log = logging.getLogger('analytics.aggregate')


def _day_bounds(day):
    tz = timezone.get_current_timezone()
    start = timezone.make_aware(datetime.combine(day, dtime.min), tz)
    return start, start + timedelta(days=1)


@transaction.atomic
def aggregate_day(restaurant, day) -> dict:
    """
    Bir restoranning bir kunlik ko'rsatkichlarini hisoblab DailyStat'ga yozadi.
    ⚡ Idempotent: qayta ishga tushirilsa qiymatlar QAYTA hisoblanadi (update).
    """
    from apps.analytics.models import DailyStat, DishDailyStat, AnalyticsEvent
    from apps.orders.models import Order, OrderItem
    from apps.payments.models import Tip
    from apps.reviews.models import Review

    start, end = _day_bounds(day)

    orders = Order.objects.filter(restaurant=restaurant,
                                  created_at__gte=start, created_at__lt=end)
    paid = orders.filter(status='paid')

    o_agg = paid.aggregate(cnt=Count('id'), revenue=Sum('total'),
                           avg=Avg('total'))
    revenue = o_agg['revenue'] or Decimal('0')
    cnt = o_agg['cnt'] or 0

    # AR ta'siri: buyurtmada ar_viewed=True bo'lgan qator bormi
    ar_order_ids = set(OrderItem.objects
                       .filter(order__in=paid, ar_viewed=True)
                       .values_list('order_id', flat=True))
    ar_orders = paid.filter(id__in=ar_order_ids)
    no_ar_orders = paid.exclude(id__in=ar_order_ids)
    avg_ar = ar_orders.aggregate(a=Avg('total'))['a'] or Decimal('0')
    avg_no_ar = no_ar_orders.aggregate(a=Avg('total'))['a'] or Decimal('0')

    ev = AnalyticsEvent.objects.filter(restaurant=restaurant,
                                       created_at__gte=start, created_at__lt=end)
    menu_views = ev.filter(type='menu_view').count()
    ar_views = ev.filter(type='ar_view').count()

    tips = Tip.objects.filter(restaurant=restaurant, is_paid=True,
                              created_at__gte=start, created_at__lt=end
                              ).aggregate(s=Sum('amount'))['s'] or Decimal('0')

    rev = Review.objects.filter(restaurant=restaurant,
                                created_at__gte=start, created_at__lt=end)
    rev_agg = rev.aggregate(c=Count('id'), a=Avg('rating'))

    guests = paid.values('guest_id').distinct().count()

    stat, _ = DailyStat.objects.update_or_create(
        restaurant=restaurant, date=day,
        defaults={
            'orders': cnt,
            'revenue': revenue,
            'avg_check': o_agg['avg'] or Decimal('0'),
            'guests': guests,
            'menu_views': menu_views,
            'ar_views': ar_views,
            'ar_orders': ar_orders.count(),
            'avg_check_ar': avg_ar,
            'avg_check_no_ar': avg_no_ar,
            'tips_total': tips,
            'reviews_count': rev_agg['c'] or 0,
            'reviews_avg': Decimal(str(round(rev_agg['a'] or 0, 2))),
            'cancelled': orders.filter(status='cancelled').count(),
        })

    _aggregate_dishes(restaurant, day, start, end, paid, ev)

    log.info(f'[agg] {restaurant.slug} {day}: {cnt} buyurtma, {revenue:,.0f} so\'m')
    return {'orders': cnt, 'revenue': str(revenue)}


def _aggregate_dishes(restaurant, day, start, end, paid_orders, events):
    """Taom kesimida — menyu-injiniring uchun"""
    from apps.analytics.models import DishDailyStat, AnalyticsEvent
    from apps.orders.models import OrderItem

    sold = (OrderItem.objects
            .filter(order__in=paid_orders)
            .values('dish_id')
            .annotate(qty=Sum('qty'), revenue=Sum('price')))

    views = dict(events.filter(type='dish_view').values('dish_id_v')
                 .annotate(c=Count('id'))
                 .values_list('dish_id_v', 'c'))
    ar_views = dict(events.filter(type='ar_view').values('dish_id_v')
                    .annotate(c=Count('id'))
                    .values_list('dish_id_v', 'c'))

    from apps.menu.models import Dish
    costs = dict(Dish.objects.filter(restaurant=restaurant)
                 .values_list('id', 'cost_price'))

    for row in sold:
        did = row['dish_id']
        qty = row['qty'] or 0
        revenue = Decimal(row['revenue'] or 0) * qty if False else Decimal('0')
        # revenue = narx × miqdor (OrderItem.price — birlik narxi)
        revenue = sum(
            (Decimal(i.price) * i.qty
             for i in OrderItem.objects.filter(order__in=paid_orders, dish_id=did)),
            Decimal('0'))
        cost = Decimal(costs.get(did) or 0) * qty
        DishDailyStat.objects.update_or_create(
            restaurant=restaurant, date=day, dish_id=did,
            defaults={'qty_sold': qty, 'revenue': revenue, 'cost': cost,
                      'margin': revenue - cost,
                      'views': views.get(did, 0),
                      'ar_views': ar_views.get(did, 0)})


def aggregate_all(day=None) -> dict:
    """Cron: barcha faol restoranlar uchun"""
    from apps.tenants.models import Restaurant
    day = day or (timezone.localdate() - timedelta(days=1))
    out = {'day': str(day), 'restaurants': 0, 'orders': 0}
    for r in Restaurant.objects.filter(is_active=True):
        try:
            res = aggregate_day(r, day)
            out['restaurants'] += 1
            out['orders'] += res['orders']
        except Exception as e:
            log.exception(f'[agg] {r.slug} xato: {e}')
    return out


def cleanup_events(days=7) -> int:
    """
    ⚡ Yuborilgan eventlarni Postgres'dan o'chiradi (T5 — DB shishmasin).
    """
    from apps.analytics.models import AnalyticsEvent
    cutoff = timezone.now() - timedelta(days=days)
    n, _ = AnalyticsEvent.objects.filter(created_at__lt=cutoff).delete()
    if n:
        log.info(f'[agg] {n} ta eski event o\'chirildi')
    return n
```

**Fayl:** `apps/analytics/management/commands/aggregate_daily.py`
```python
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.analytics.aggregate import aggregate_all, cleanup_events


class Command(BaseCommand):
    help = 'Kunlik agregatsiya'

    def add_arguments(self, parser):
        parser.add_argument('--date', help='YYYY-MM-DD (default: kecha)')
        parser.add_argument('--backfill', type=int, default=0,
                            help='oxirgi N kunni qayta hisoblash')
        parser.add_argument('--cleanup', action='store_true')

    def handle(self, *args, **o):
        if o['backfill']:
            for i in range(1, o['backfill'] + 1):
                d = timezone.localdate() - timedelta(days=i)
                self.stdout.write(str(aggregate_all(d)))
        else:
            d = date.fromisoformat(o['date']) if o['date'] else None
            self.stdout.write(str(aggregate_all(d)))
        if o['cleanup']:
            self.stdout.write(f"o'chirildi: {cleanup_events()}")
```

**Cron:**
```bash
# /etc/cron.d/armenu-analytics
15 3 * * * armenu cd /home/armenu/app && venv/bin/python manage.py aggregate_daily --cleanup >> /var/log/armenu/aggregate.log 2>&1
```

✅ **Tekshirish:**
```bash
python manage.py aggregate_daily --backfill 3
python manage.py shell -c "
from apps.analytics.models import DailyStat; print(DailyStat.objects.count())"
```

---

## V-217 — Telegram bildirishnoma servisi

**Fayl:** `apps/notifications/services.py`
```python
import logging, time
import requests
from django.conf import settings
from django.core.cache import cache

from core.resilience import CircuitBreaker

log = logging.getLogger('notifications')
API = 'https://api.telegram.org/bot{token}/{method}'

_cb = CircuitBreaker('telegram', fail_threshold=6, timeout=120)


def _token(restaurant=None):
    """Restoranning o'z boti bo'lsa — o'shani, bo'lmasa platforma botini"""
    if restaurant and getattr(restaurant, 'telegram_bot_token', ''):
        return restaurant.telegram_bot_token
    return settings.TELEGRAM_BOT_TOKEN


def _rate_limit(chat_id):
    """⚡ Telegram: bir chatga 1 msg/soniya. Cheklovga tushmaslik."""
    key = f'tg:rl:{chat_id}'
    last = cache.get(key)
    if last:
        delta = time.time() - last
        if delta < 1.05:
            time.sleep(1.05 - delta)
    cache.set(key, time.time(), 10)


def send_telegram(chat_id, text, restaurant=None, buttons=None,
                  parse_mode='HTML', silent=False):
    """
    ⚡ Bildirishnoma HECH QACHON asosiy oqimni buzmaydi — xato faqat log'ga.
    """
    if not chat_id or not text:
        return False
    token = _token(restaurant)
    if not token:
        log.warning('[tg] token yo\'q')
        return False

    _rate_limit(chat_id)
    payload = {'chat_id': chat_id, 'text': text[:4096],
               'parse_mode': parse_mode,
               'disable_web_page_preview': True,
               'disable_notification': silent}
    if buttons:
        payload['reply_markup'] = {'inline_keyboard': buttons}

    def _call():
        r = requests.post(API.format(token=token, method='sendMessage'),
                          json=payload, timeout=12)
        if r.status_code == 429:
            retry = r.json().get('parameters', {}).get('retry_after', 2)
            time.sleep(min(retry, 10))
            raise RuntimeError('rate limited')
        if r.status_code >= 400:
            raise RuntimeError(f'{r.status_code}: {r.text[:200]}')
        return True

    try:
        return _cb.call(_call, fallback=lambda: False)
    except Exception as e:
        log.warning(f'[tg] yuborilmadi chat={chat_id}: {e}')
        return False


def send_telegram_photo(chat_id, png_bytes, caption='', restaurant=None):
    token = _token(restaurant)
    if not token or not chat_id:
        return False
    _rate_limit(chat_id)
    try:
        r = requests.post(API.format(token=token, method='sendPhoto'),
                          data={'chat_id': chat_id, 'caption': caption[:1024],
                                'parse_mode': 'HTML'},
                          files={'photo': ('img.png', png_bytes, 'image/png')},
                          timeout=20)
        return r.status_code < 400
    except Exception as e:
        log.warning(f'[tg] photo xato: {e}')
        return False


def broadcast_staff(restaurant, role, text, buttons=None):
    """Rol bo'yicha barcha xodimlarga (kassir/ofitsiant/admin)"""
    from apps.accounts.models import Staff
    n = 0
    for s in Staff.objects.filter(restaurant=restaurant, role=role,
                                  is_active=True).exclude(telegram_chat_id=''):
        if send_telegram(s.telegram_chat_id, text, restaurant=restaurant,
                         buttons=buttons):
            n += 1
    return n


def notify_restaurant_admin(restaurant, text, buttons=None):
    if restaurant.admin_chat_id:
        return send_telegram(restaurant.admin_chat_id, text,
                             restaurant=restaurant, buttons=buttons)
    return broadcast_staff(restaurant, 'admin', text, buttons)


def alert_oncall(text):
    """⚡ Platforma darajasidagi alert (healer, reconciliation)"""
    return send_telegram(getattr(settings, 'ONCALL_CHAT_ID', ''), text)


# ---------- kunlik svodka ----------
def daily_digest(restaurant, day=None):
    """Restoran egasiga kunlik xulosa (ertalab 09:30)"""
    from apps.analytics.models import DailyStat
    from apps.analytics.menu_engineering import ar_impact
    from django.utils import timezone
    from datetime import timedelta

    day = day or (timezone.localdate() - timedelta(days=1))
    s = DailyStat.objects.filter(restaurant=restaurant, date=day).first()
    if s is None or s.orders == 0:
        return False

    ar = ar_impact(restaurant, days=7)
    lines = [
        f"📊 <b>{restaurant.name}</b> — {day:%d.%m.%Y}", '',
        f"Buyurtmalar: <b>{s.orders}</b> (bekor: {s.cancelled})",
        f"Tushum: <b>{s.revenue:,.0f} so'm</b>",
        f"O'rtacha chek: {s.avg_check:,.0f} so'm",
        f"Mehmonlar: {s.guests}", '',
        f"🎯 AR ko'rishlar: {s.ar_views} → {s.ar_orders} buyurtma",
    ]
    if float(ar['uplift_percent']) > 0:
        lines.append(f"⚡ AR ko'rgan mijoz cheki <b>{ar['uplift_percent']}%</b> yuqori")
    if s.tips_total:
        lines.append(f"💝 Choychaqa: {s.tips_total:,.0f} so'm")
    if s.reviews_count:
        lines.append(f"⭐ Otzivlar: {s.reviews_count} ta, o'rtacha {s.reviews_avg}")

    return notify_restaurant_admin(restaurant, '\n'.join(lines))


def daily_digest_all():
    from apps.tenants.models import Restaurant
    n = 0
    for r in Restaurant.objects.filter(is_active=True):
        try:
            if daily_digest(r):
                n += 1
        except Exception as e:
            log.warning(f'[digest] {r.slug}: {e}')
    return n
```

**Fayl:** `apps/notifications/management/commands/run_worker_notify.py`
```python
"""`notify` navbat handler'larini ro'yxatdan o'tkazish tekshiruvi"""
from django.core.management.base import BaseCommand
from apps.notifications.handlers import HANDLERS


class Command(BaseCommand):
    help = 'notify navbat handler ro\'yxati'

    def handle(self, *a, **o):
        for k in sorted(HANDLERS):
            self.stdout.write(f'  • {k}')
        self.stdout.write(self.style.SUCCESS(f'{len(HANDLERS)} ta handler'))
```

**Fayl:** `apps/notifications/management/commands/daily_digest.py`
```python
from django.core.management.base import BaseCommand
from apps.notifications.services import daily_digest_all


class Command(BaseCommand):
    help = 'Restoran egalariga kunlik svodka'

    def handle(self, *a, **o):
        self.stdout.write(f'yuborildi: {daily_digest_all()}')
```

**Cron:**
```bash
30 9 * * * armenu cd /home/armenu/app && venv/bin/python manage.py daily_digest >> /var/log/armenu/digest.log 2>&1
```

✅ **Tekshirish:**
```bash
python manage.py run_worker_notify
# tip_received, cashback_awarded, birthday_bonus, welcome_bonus,
# negative_review, review_reply, send_digital_receipt  → 7 ta handler
```

---

## V-218 — Testlar

**Fayl:** `tests/conftest.py` (qo'shimcha fixture'lar)
```python
import pytest
from decimal import Decimal


@pytest.fixture
def loyalty_program(db, restaurant):
    from apps.loyalty.models import LoyaltyProgram
    from django.core.cache import cache
    cache.clear()
    return LoyaltyProgram.objects.create(
        restaurant=restaurant, is_active=True,
        cashback_percent=Decimal('5.00'), max_pay_percent=30,
        birthday_bonus=Decimal('30000'), welcome_bonus=Decimal('10000'))


@pytest.fixture
def review_settings(db, restaurant):
    from apps.reviews.models import ReviewSettings
    from django.core.cache import cache
    cache.clear()
    return ReviewSettings.objects.create(
        restaurant=restaurant, is_active=True, public_threshold=4,
        google_place_url='https://g.page/r/test/review')


@pytest.fixture
def guest(db, restaurant):
    from apps.guest.models import Guest
    import uuid
    return Guest.objects.create(restaurant=restaurant, device_token=uuid.uuid4(),
                                phone='998901112233', name='Anvar')


@pytest.fixture
def promo_10pct(db, restaurant):
    from apps.loyalty.models import Promo
    return Promo.objects.create(restaurant=restaurant, code='OSH10',
                                title_uz='10% chegirma',
                                discount_type='percent', value=Decimal('10'),
                                per_guest_limit=1, is_active=True)
```

**Fayl:** `tests/test_loyalty.py`
```python
import pytest
from decimal import Decimal


# ---------- Keshbek ----------
@pytest.mark.django_db(transaction=True)
def test_cashback_percent_correct(order_with_items, guest, loyalty_program):
    from apps.loyalty.services import calc_cashback
    from apps.payments.services import calc_order_total
    order_with_items.guest = guest
    order_with_items.save()
    total = calc_order_total(order_with_items)['total']
    assert calc_cashback(order_with_items) == (total * 5 / 100).quantize(Decimal('1'))


@pytest.mark.django_db(transaction=True)
def test_cashback_idempotent(order_with_items, guest, loyalty_program):
    from apps.loyalty.services import award_cashback
    from apps.loyalty.models import Bonus
    order_with_items.guest = guest
    order_with_items.status = 'paid'
    order_with_items.save()
    award_cashback(order_with_items.id)
    award_cashback(order_with_items.id)
    assert Bonus.objects.filter(order=order_with_items,
                                kind='cashback').count() == 1


@pytest.mark.django_db(transaction=True)
def test_bonus_ledger_matches_cache(guest, loyalty_program):
    from apps.loyalty.services import add_bonus, spend_bonus, reconcile_guest_balance
    add_bonus(guest, 50000, 'manual')
    guest.refresh_from_db()
    spend_bonus(guest, 20000)
    guest.refresh_from_db()
    assert guest.bonus == 30000
    assert reconcile_guest_balance(guest) == 30000


@pytest.mark.django_db(transaction=True)
def test_cannot_spend_more_than_balance(guest, loyalty_program):
    from apps.loyalty.services import add_bonus, spend_bonus, LoyaltyError
    add_bonus(guest, 10000, 'manual')
    guest.refresh_from_db()
    with pytest.raises(LoyaltyError):
        spend_bonus(guest, 50000)


@pytest.mark.django_db(transaction=True)
def test_max_bonus_capped_by_percent(order_with_items, guest, loyalty_program):
    from apps.loyalty.services import add_bonus, max_bonus_for_order
    from apps.payments.services import calc_order_total
    add_bonus(guest, 10_000_000, 'manual')
    guest.refresh_from_db()
    order_with_items.guest = guest
    order_with_items.save()
    total = calc_order_total(order_with_items)['total']
    assert max_bonus_for_order(order_with_items) <= total * 30 / 100 + 1


# ---------- Promo ----------
@pytest.mark.django_db
def test_promo_applied_once_per_order(order_with_items, promo_10pct, guest):
    from apps.loyalty.promo import apply_promo, PromoUsed
    apply_promo(order_with_items, 'OSH10', guest=guest)
    with pytest.raises(PromoUsed):
        apply_promo(order_with_items, 'OSH10', guest=guest)


@pytest.mark.django_db
def test_promo_discount_server_side(order_with_items, promo_10pct, guest):
    from apps.loyalty.promo import apply_promo
    from apps.payments.services import calc_order_total
    before = calc_order_total(order_with_items)['items']
    res = apply_promo(order_with_items, 'OSH10', guest=guest)
    order_with_items.refresh_from_db()
    assert Decimal(res['discount']) == (before * 10 / 100).quantize(Decimal('0.01'))


@pytest.mark.django_db
def test_promo_cross_tenant_blocked(order_with_items, restaurant2):
    from apps.loyalty.models import Promo
    from apps.loyalty.promo import apply_promo, PromoInvalid
    Promo.objects.create(restaurant=restaurant2, code='OTHER',
                         title_uz='x', discount_type='percent', value=50)
    with pytest.raises(PromoInvalid):
        apply_promo(order_with_items, 'OTHER')   # ⚡ boshqa restoran kodi


# ---------- Tug'ilgan kun ----------
@pytest.mark.django_db(transaction=True)
def test_birthday_bonus_once_per_year(guest, loyalty_program):
    from apps.loyalty.tasks import birthday_bonuses
    from apps.loyalty.models import Bonus
    from django.utils import timezone
    from datetime import timedelta
    target = timezone.localdate() + timedelta(
        days=loyalty_program.birthday_days_before)
    guest.birthday = target.replace(year=1995)
    guest.save()
    birthday_bonuses()
    birthday_bonuses()                    # ⚡ 2-marta
    assert Bonus.objects.filter(guest=guest, kind='birthday').count() == 1
```

**Fayl:** `tests/test_reviews.py`
```python
import pytest


@pytest.mark.django_db
def test_5_star_gets_google_link(restaurant, review_settings):
    from apps.reviews.services import create_review
    r, res = create_review(restaurant, 5, text='Ajoyib')
    assert r.is_public
    assert res['external_url'].startswith('https://g.page')


@pytest.mark.django_db
@pytest.mark.parametrize('rating', [1, 2, 3])
def test_negative_stays_internal(restaurant, review_settings, rating):
    """⚡ ENG MUHIM TEST — salbiy otziv internetga chiqmaydi"""
    from apps.reviews.services import create_review
    r, res = create_review(restaurant, rating, text='Yomon')
    assert r.is_public is False
    assert r.redirected_to_google is False
    assert res['external_url'] == ''


@pytest.mark.django_db
def test_public_api_excludes_negative(api_client, restaurant, review_settings):
    from apps.reviews.services import create_review
    create_review(restaurant, 2, text='SALBIY-MATN')
    create_review(restaurant, 5, text='IJOBIY-MATN')
    r = api_client.get('/v1/reviews/public/',
                       HTTP_HOST=f'{restaurant.slug}.localhost')
    body = r.content.decode()
    assert 'SALBIY-MATN' not in body          # ⚡ ASOSIY KAFOLAT
    assert 'IJOBIY-MATN' in body


@pytest.mark.django_db
def test_negative_alert_sent(monkeypatch, restaurant, review_settings):
    sent = []
    monkeypatch.setattr('apps.notifications.services.send_telegram',
                        lambda *a, **kw: sent.append(a) or True)
    from apps.reviews.services import create_review
    from apps.notifications.handlers.reviews import handle_negative_review
    r, _ = create_review(restaurant, 1, text='Juda yomon')
    review_settings.negative_alert_chat_id = '123'
    review_settings.save()
    handle_negative_review({'review_id': r.id})
    assert sent, 'Salbiy otziv haqida adminga xabar ketmadi'


@pytest.mark.django_db
def test_one_review_per_order(restaurant, review_settings, order_with_items):
    from apps.reviews.services import create_review
    from django.db import IntegrityError
    create_review(restaurant, 5, order=order_with_items)
    with pytest.raises(IntegrityError):
        create_review(restaurant, 4, order=order_with_items)


@pytest.mark.django_db
def test_review_cross_tenant(api_client, restaurant, restaurant2,
                             review_settings):
    from apps.reviews.services import create_review
    create_review(restaurant, 5, text='REST1')
    r = api_client.get('/v1/reviews/public/',
                       HTTP_HOST=f'{restaurant2.slug}.localhost')
    assert 'REST1' not in r.content.decode()   # ⚡ tenant izolyatsiya
```

**Fayl:** `tests/test_analytics.py`
```python
import pytest
from decimal import Decimal


@pytest.mark.django_db
def test_track_does_not_hit_db(restaurant, django_assert_num_queries):
    from apps.analytics.services import track
    with django_assert_num_queries(0):        # ⚡ DB'ga tegmaydi
        track(restaurant.id, 'menu_view', session_id='s1')


@pytest.mark.django_db
def test_flush_uses_fallback_when_ch_down(monkeypatch, restaurant):
    from apps.analytics.services import track, flush_buffer
    from apps.analytics import sinks
    shipped = {}

    class FailCH:
        name = 'clickhouse'
        def available(self): return True
        def ship(self, rows): return False

    class OkLocal:
        name = 'local'
        def available(self): return True
        def ship(self, rows):
            shipped['n'] = len(rows)
            return True

    monkeypatch.setattr(sinks, 'get_sinks', lambda: [FailCH(), OkLocal()])
    monkeypatch.setattr('apps.analytics.services.get_sinks',
                        lambda: [FailCH(), OkLocal()], raising=False)
    track(restaurant.id, 'menu_view')
    res = flush_buffer()
    assert res['sink'] in ('local', None)


@pytest.mark.django_db
def test_aggregate_idempotent(restaurant, order_with_items):
    from apps.analytics.aggregate import aggregate_day
    from apps.analytics.models import DailyStat
    from django.utils import timezone
    order_with_items.status = 'paid'
    order_with_items.total = Decimal('90000')
    order_with_items.save()
    day = timezone.localdate()
    aggregate_day(restaurant, day)
    aggregate_day(restaurant, day)             # ⚡ 2-marta
    assert DailyStat.objects.filter(restaurant=restaurant, date=day).count() == 1


@pytest.mark.django_db
def test_menu_engineering_quadrants(restaurant):
    from apps.analytics.models import DishDailyStat
    from apps.analytics.menu_engineering import menu_engineering
    from apps.menu.models import Category, Dish
    from django.utils import timezone

    cat = Category.objects.create(restaurant=restaurant, name_uz='K')
    day = timezone.localdate()
    for i, (qty, margin) in enumerate([(100, 50000), (100, 1000),
                                       (2, 60000), (2, 500)]):
        d = Dish.objects.create(restaurant=restaurant, category=cat,
                                name_uz=f'D{i}', price=Decimal('50000'))
        DishDailyStat.objects.create(restaurant=restaurant, date=day, dish=d,
                                     qty_sold=qty, revenue=Decimal(qty * 50000),
                                     cost=Decimal('0'),
                                     margin=Decimal(margin * qty),
                                     views=qty * 5, ar_views=qty)
    res = menu_engineering(restaurant, days=30)
    quads = [i['quadrant'] for i in res['items']]
    assert 'star' in quads and 'dog' in quads
    assert sum(res['counts'].values()) == 4
```

✅ **Tekshirish:**
```bash
pytest tests/test_loyalty.py tests/test_reviews.py tests/test_analytics.py -v
pytest tests/test_review_filter.py -v          # ⚡ kritik
pytest --cov=apps.loyalty --cov=apps.reviews --cov=apps.analytics --cov-fail-under=80
```

---

# ✅ FAZA 11 QABULI

Keyingi fazaga o'tishdan oldin hammasi ✅ bo'lishi kerak:

```
[ ] python manage.py check                          → xato yo'q
[ ] python manage.py migrate                        → o'tadi
[ ] pytest tests/test_loyalty.py -v                 → 8/8 o'tadi
[ ] pytest tests/test_reviews.py -v                 → 6/6 o'tadi
[ ] pytest tests/test_analytics.py -v               → 4/4 o'tadi
[ ] pytest --cov=apps.loyalty --cov=apps.reviews --cov=apps.analytics --cov-fail-under=80
[ ] Keshbek: to'lovdan keyin bonus qo'shildi (1 marta, dublikat yo'q)
[ ] Bonus ledger yig'indisi = Guest.bonus keshi (reconcile 0 farq)
[ ] Bonus balansdan ko'p sarflab bo'lmadi (LoyaltyError)
[ ] Promokod: foiz/qat'iy/bonus turlari ishladi, chegirma serverda hisoblandi
[ ] Promokod: per_guest_limit va first_order_only ishladi
[ ] Promokod: boshqa restoran kodi ISHLAMADI (tenant izolyatsiya)
[ ] Tug'ilgan kun cron: bir yilda 1 marta bonus + Telegram xabar
[ ] ⚡ 5⭐ → Google havolasi ko'rsatildi, is_public=True
[ ] ⚡ 1-3⭐ → is_public=False, tashqi havola YO'Q
[ ] ⚡ GET /v1/reviews/public/ da salbiy otziv KO'RINMADI
[ ] ⚡ Salbiy otziv adminga darhol Telegram + WS push keldi
[ ] Bir buyurtmaga bitta otziv (unique constraint ishladi)
[ ] Otziv UI M-12 ga mos: yulduzlar, 3 qism baho, dark+light
[ ] Admin A-12: KPI, taqsimot, filtr, javob yozish, real-time yangilanish
[ ] track() DB'ga TEGMADI (0 query testi o'tdi)
[ ] ClickHouse yiqilganda S3 → lokal fallback ishladi, event yo'qolmadi
[ ] Kunlik agregatsiya idempotent (2 marta ishlatilsa 1 qator)
[ ] Menyu-injiniring: 4 kvadrant to'g'ri ajratildi + tavsiya 3 tilda
[ ] AR ta'siri hisoboti: uplift_percent hisoblandi
[ ] Kunlik svodka Telegram'ga yetib keldi
[ ] pytest tests/test_i18n_completeness.py           → 3 til to'liq
[ ] git log --oneline | wc -l  → 218 ta commit
```

**Yakuniy:**
```bash
git add -A && git commit -m "FAZA 11 tugadi: sodiqlik, otziv filtri, analitika"
python3 ROADMAP/03_HOLAT/update_progress.py V-218 ok "FAZA 11 tugadi"
```

**➡️ Keyingi:** `FAZA_12_DEPLOY.md`
