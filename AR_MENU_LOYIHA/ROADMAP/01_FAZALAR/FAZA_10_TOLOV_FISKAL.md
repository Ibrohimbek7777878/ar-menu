# FAZA 10 — TO'LOV + FISKAL

**Vazifalar:** V-187 … V-204 · **Muddat:** 2 hafta
**Maqsad:** Mijoz ilovadan to'lay oladi (Payme/Click/Uzum), choychaqa qoldiradi,
soliqqa mos fiskal chek OFD orqali chiqadi.

> ⚠️ **QAT'IY XAVFSIZLIK QOIDALARI (butun faza davomida):**
> 1. **Summa FAQAT serverda hisoblanadi** — frontenddan kelgan `amount` ISHONILMAYDI
> 2. **Karta ma'lumoti BIZDA saqlanmaydi** (PCI DSS) — faqat provayder ushlaydi
> 3. **Har webhook imzosi tekshiriladi** — imzosiz so'rov 401
> 4. **Idempotency** — bitta tranzaksiya 2 marta hisoblanmaydi
> 5. Barcha pul maydonlari `DecimalField(max_digits=12, decimal_places=2)`

---

## V-187 — `Payment`, `Tip` modellari

**Fayl:** `apps/payments/models.py`
```python
import uuid
from decimal import Decimal
from django.db import models
from core.models import TenantModel, TimestampedModel


class Payment(TenantModel):
    PROVIDER = [
        ('payme', 'Payme'), ('click', 'Click'), ('uzum', 'Uzum'),
        ('cash', 'Naqd'), ('bonus', 'Bonus'),
    ]
    STATUS = [
        ('pending',   'Kutilmoqda'),
        ('created',   'Yaratildi'),      # provayderda tranzaksiya ochildi
        ('paid',      "To'landi"),
        ('cancelled', 'Bekor qilindi'),
        ('refunded',  'Qaytarildi'),
        ('expired',   'Muddati tugadi'),
        ('failed',    'Xato'),
    ]

    order      = models.ForeignKey('orders.Order', on_delete=models.PROTECT,
                                   related_name='payments')
    provider   = models.CharField(max_length=20, choices=PROVIDER, db_index=True)
    amount     = models.DecimalField(max_digits=12, decimal_places=2)
    currency   = models.CharField(max_length=3, default='UZS')
    status     = models.CharField(max_length=20, choices=STATUS,
                                  default='pending', db_index=True)

    # Provayder tomonidagi ID (Payme _id, Click transaction_id, Uzum orderId)
    ext_id     = models.CharField(max_length=120, blank=True, db_index=True)
    # ⚡ Bizning tomondan yuboriladigan noyob kalit
    idempotency_key = models.CharField(max_length=64, unique=True,
                                       default=uuid.uuid4)

    # Split bill uchun — bitta buyurtmaga bir nechta Payment
    split_index = models.SmallIntegerField(default=1)
    split_total = models.SmallIntegerField(default=1)

    payment_url = models.URLField(max_length=500, blank=True)
    raw         = models.JSONField(default=dict, blank=True)   # provayder javobi
    error       = models.TextField(blank=True)

    created_by_guest = models.ForeignKey('guest.Guest', null=True, blank=True,
                                         on_delete=models.SET_NULL)
    expires_at  = models.DateTimeField(null=True, blank=True, db_index=True)
    paid_at     = models.DateTimeField(null=True, blank=True, db_index=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['restaurant', 'status', 'created_at']),
            models.Index(fields=['provider', 'ext_id']),
        ]

    def __str__(self):
        return f'Payment#{self.id} {self.provider} {self.amount} {self.status}'

    @property
    def amount_tiyin(self) -> int:
        """⚡ Payme/Click tiyinda ishlaydi (1 so'm = 100 tiyin)"""
        return int(self.amount * 100)


class Tip(TenantModel):
    """⚡ Choychaqa — ofitsiantga. Strategik muhim: xodim qarshiligini yo'q qiladi."""
    order    = models.ForeignKey('orders.Order', on_delete=models.PROTECT,
                                 related_name='tips')
    staff    = models.ForeignKey('accounts.Staff', on_delete=models.PROTECT,
                                 related_name='tips')
    payment  = models.OneToOneField(Payment, null=True, blank=True,
                                    on_delete=models.SET_NULL, related_name='tip')
    amount   = models.DecimalField(max_digits=12, decimal_places=2)
    percent  = models.SmallIntegerField(null=True, blank=True)  # 5/10/15 yoki None
    is_paid  = models.BooleanField(default=False, db_index=True)

    class Meta:
        indexes = [models.Index(fields=['restaurant', 'staff', 'created_at'])]


class PaymentEvent(TimestampedModel):
    """
    ⚡ Har webhook chaqiruvi shu yerga yoziladi — idempotency va audit uchun.
    unique(provider, ext_event_id) → dublikat webhook 2-marta ishlamaydi.
    """
    provider     = models.CharField(max_length=20, db_index=True)
    ext_event_id = models.CharField(max_length=160)
    payment      = models.ForeignKey(Payment, null=True, blank=True,
                                     on_delete=models.SET_NULL)
    method       = models.CharField(max_length=60, blank=True)
    body         = models.JSONField(default=dict)
    handled      = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['provider', 'ext_event_id'],
                                    name='uq_payment_event')
        ]
```

`apps/accounts/models.py` — `Staff` ga maydon qo'shiladi (agar yo'q bo'lsa):
```python
    tips_balance = models.DecimalField(max_digits=12, decimal_places=2,
                                       default=0)
```

✅ **Tekshirish:**
```bash
python manage.py makemigrations payments accounts && python manage.py migrate
python manage.py shell -c "from apps.payments.models import Payment; print(Payment._meta.db_table)"
```

---

## V-188 — `paytechuz` integratsiyasi + baza adapter

**Fayl:** `apps/payments/providers/base.py`
```python
from abc import ABC, abstractmethod
from decimal import Decimal


class PaymentResult:
    def __init__(self, ok: bool, payment_url: str = '', ext_id: str = '',
                 raw: dict = None, error: str = ''):
        self.ok = ok
        self.payment_url = payment_url
        self.ext_id = ext_id
        self.raw = raw or {}
        self.error = error


class BaseProvider(ABC):
    """
    Har provayder shu interfeysni bajaradi.
    ⚠️ Karta ma'lumoti HECH QACHON bu qatlamdan o'tmaydi (PCI DSS).
    """
    code = ''

    def __init__(self, config: dict):
        self.config = config

    @abstractmethod
    def create_invoice(self, payment) -> PaymentResult:
        """To'lov havolasini yaratadi"""

    @abstractmethod
    def verify_signature(self, request) -> bool:
        """⚡ Webhook imzosini tekshiradi"""

    @abstractmethod
    def check_status(self, payment) -> str:
        """Provayderdan haqiqiy holatni so'raydi (reconciliation uchun)"""

    def cancel(self, payment) -> bool:
        return False
```

**Fayl:** `apps/payments/providers/__init__.py`
```python
from django.core.cache import cache
from core.exceptions import ServiceUnavailable

REGISTRY = {}


def register(cls):
    REGISTRY[cls.code] = cls
    return cls


def get_provider(restaurant, code: str):
    """
    Restoranning o'z kalitlari bilan provayder obyektini qaytaradi.
    Kalitlar RestaurantPaymentConfig da (shifrlangan).
    """
    from apps.payments.models_config import RestaurantPaymentConfig
    if code not in REGISTRY:
        raise ServiceUnavailable({'provider': code})
    key = f'paycfg:{restaurant.id}:{code}'
    cfg = cache.get(key)
    if cfg is None:
        row = RestaurantPaymentConfig.objects.filter(
            restaurant=restaurant, provider=code, is_active=True).first()
        cfg = row.as_dict() if row else False
        cache.set(key, cfg, 300)
    if not cfg:
        raise ServiceUnavailable({'provider': code, 'reason': 'sozlanmagan'})
    return REGISTRY[code](cfg)


# adapterlarni ro'yxatga olish
from apps.payments.providers import payme, click, uzum  # noqa: E402,F401
```

**Fayl:** `apps/payments/models_config.py`
```python
from django.db import models
from core.models import TenantModel
from core.crypto import encrypt, decrypt


class RestaurantPaymentConfig(TenantModel):
    """
    ⚠️ Provayder kalitlari — shifrlangan holda. Karta ma'lumoti EMAS.
    """
    provider    = models.CharField(max_length=20, db_index=True)
    merchant_id = models.CharField(max_length=120)
    _secret     = models.TextField(db_column='secret')
    extra       = models.JSONField(default=dict, blank=True)
    is_test     = models.BooleanField(default=True)
    is_active   = models.BooleanField(default=True)

    class Meta:
        constraints = [models.UniqueConstraint(
            fields=['restaurant', 'provider'], name='uq_rest_provider')]

    @property
    def secret(self):
        return decrypt(self._secret)

    @secret.setter
    def secret(self, value):
        self._secret = encrypt(value)

    def as_dict(self):
        return {'merchant_id': self.merchant_id, 'secret': self.secret,
                'is_test': self.is_test, **self.extra}
```

**Fayl:** `core/crypto.py`
```python
import base64, hashlib
from cryptography.fernet import Fernet
from django.conf import settings

_fernet = None


def _get():
    global _fernet
    if _fernet is None:
        raw = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        _fernet = Fernet(base64.urlsafe_b64encode(raw))
    return _fernet


def encrypt(value: str) -> str:
    if not value:
        return ''
    return _get().encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    if not value:
        return ''
    return _get().decrypt(value.encode()).decode()
```

`requirements.txt` ga: `paytechuz`, `cryptography`

✅ **Tekshirish:**
```bash
python manage.py makemigrations payments && python manage.py migrate
python manage.py shell -c "
from core.crypto import encrypt, decrypt
e = encrypt('test-secret'); print(decrypt(e) == 'test-secret')"
# True
```

---

## V-189 — Payme adapter (JSON-RPC)

**Fayl:** `apps/payments/providers/payme.py`
```python
import base64, json, logging, requests
from decimal import Decimal
from django.utils import timezone
from apps.payments.providers import register
from apps.payments.providers.base import BaseProvider, PaymentResult

log = logging.getLogger('payments.payme')

CHECKOUT_URL = 'https://checkout.paycom.uz'
CHECKOUT_TEST = 'https://test.paycom.uz'
API_URL = 'https://api.paycom.uz'
API_TEST = 'https://checkout.test.paycom.uz/api'

# Payme xato kodlari (JSON-RPC)
E_TRANSPORT       = -32300
E_ACCESS_DENIED   = -32504
E_ORDER_NOT_FOUND = -31050
E_WRONG_AMOUNT    = -31001
E_TX_NOT_FOUND    = -31003
E_CANT_PERFORM    = -31008


class PaymeError(Exception):
    def __init__(self, code, message_uz, data=None):
        self.code = code
        self.message = {'uz': message_uz, 'ru': message_uz, 'en': message_uz}
        self.data = data
        super().__init__(message_uz)


@register
class PaymeProvider(BaseProvider):
    code = 'payme'

    # ---------- 1. Invoice ----------
    def create_invoice(self, payment) -> PaymentResult:
        """
        Payme'da server-side invoice shart emas — checkout URL base64 param bilan.
        """
        params = (f"m={self.config['merchant_id']};"
                  f"ac.payment_id={payment.id};"
                  f"a={payment.amount_tiyin};"
                  f"l=uz;"
                  f"c={self.config.get('return_url', '')}")
        encoded = base64.b64encode(params.encode()).decode()
        base = CHECKOUT_TEST if self.config.get('is_test') else CHECKOUT_URL
        return PaymentResult(ok=True, payment_url=f'{base}/{encoded}',
                             ext_id='', raw={'params': params})

    # ---------- 2. Webhook imzosi ----------
    def verify_signature(self, request) -> bool:
        """
        ⚡ Payme Basic auth: base64("Paycom:<KEY>")
        """
        header = request.headers.get('Authorization', '')
        if not header.startswith('Basic '):
            return False
        try:
            decoded = base64.b64decode(header[6:]).decode()
        except Exception:
            return False
        login, _, key = decoded.partition(':')
        return login == 'Paycom' and key == self.config['secret']

    # ---------- 3. JSON-RPC metodlari ----------
    def handle_rpc(self, method: str, params: dict) -> dict:
        handlers = {
            'CheckPerformTransaction': self.check_perform,
            'CreateTransaction':       self.create_transaction,
            'PerformTransaction':      self.perform_transaction,
            'CancelTransaction':       self.cancel_transaction,
            'CheckTransaction':        self.check_transaction,
            'GetStatement':            self.get_statement,
        }
        fn = handlers.get(method)
        if fn is None:
            raise PaymeError(E_TRANSPORT, f"Noma'lum metod: {method}")
        return fn(params)

    # --- CheckPerformTransaction ---
    def check_perform(self, params):
        payment = self._find_payment(params)
        self._assert_amount(payment, params.get('amount'))
        if payment.status in ('paid', 'cancelled', 'refunded'):
            raise PaymeError(E_CANT_PERFORM, "To'lov allaqachon yakunlangan")
        detail = self._fiscal_detail(payment)
        return {'allow': True, 'detail': detail}

    # --- CreateTransaction ---
    def create_transaction(self, params):
        from apps.payments.models import Payment
        payment = self._find_payment(params)
        self._assert_amount(payment, params.get('amount'))
        tx_id = params['id']

        # ⚡ Idempotency: shu tx_id allaqachon bog'langanmi?
        exist = Payment.objects.filter(provider='payme', ext_id=tx_id).first()
        if exist:
            return self._tx_response(exist, state=1)

        if payment.ext_id and payment.ext_id != tx_id:
            raise PaymeError(E_CANT_PERFORM, "Buyurtma boshqa tranzaksiyada")
        if payment.status in ('paid', 'cancelled'):
            raise PaymeError(E_CANT_PERFORM, "To'lov yakunlangan")

        payment.ext_id = tx_id
        payment.status = 'created'
        payment.raw = {**payment.raw, 'create_time': params.get('time')}
        payment.save(update_fields=['ext_id', 'status', 'raw', 'updated_at'])
        return self._tx_response(payment, state=1)

    # --- PerformTransaction ---
    def perform_transaction(self, params):
        from apps.payments.services import mark_paid
        payment = self._find_by_tx(params['id'])
        if payment.status == 'paid':
            return self._tx_response(payment, state=2)
        if payment.status in ('cancelled', 'refunded', 'expired'):
            raise PaymeError(E_CANT_PERFORM, "To'lov bekor qilingan")
        mark_paid(payment, ext_id=params['id'],
                  raw={'perform_time': params.get('time')})
        payment.refresh_from_db()
        return self._tx_response(payment, state=2)

    # --- CancelTransaction ---
    def cancel_transaction(self, params):
        from apps.payments.services import mark_cancelled
        payment = self._find_by_tx(params['id'])
        reason = params.get('reason')
        state = -2 if payment.status in ('paid', 'refunded') else -1
        if payment.status not in ('cancelled', 'refunded'):
            mark_cancelled(payment, reason=f'payme reason={reason}')
            payment.refresh_from_db()
        return self._tx_response(payment, state=state)

    # --- CheckTransaction ---
    def check_transaction(self, params):
        payment = self._find_by_tx(params['id'])
        state = {'paid': 2, 'created': 1,
                 'cancelled': -1, 'refunded': -2}.get(payment.status, 1)
        return self._tx_response(payment, state=state)

    # --- GetStatement (reconciliation) ---
    def get_statement(self, params):
        from apps.payments.models import Payment
        frm = timezone.datetime.fromtimestamp(
            params['from'] / 1000, tz=timezone.get_current_timezone())
        to = timezone.datetime.fromtimestamp(
            params['to'] / 1000, tz=timezone.get_current_timezone())
        qs = Payment.objects.filter(provider='payme',
                                    created_at__gte=frm, created_at__lte=to
                                    ).exclude(ext_id='')
        return {'transactions': [{
            'id': p.ext_id,
            'time': int(p.created_at.timestamp() * 1000),
            'amount': p.amount_tiyin,
            'account': {'payment_id': str(p.id)},
            'create_time': int(p.created_at.timestamp() * 1000),
            'perform_time': int(p.paid_at.timestamp() * 1000) if p.paid_at else 0,
            'cancel_time': int(p.cancelled_at.timestamp() * 1000) if p.cancelled_at else 0,
            'transaction': str(p.id),
            'state': 2 if p.status == 'paid' else (-1 if p.status == 'cancelled' else 1),
            'reason': None,
        } for p in qs]}

    # ---------- yordamchi ----------
    @staticmethod
    def _find_payment(params):
        from apps.payments.models import Payment
        acc = params.get('account') or {}
        pid = acc.get('payment_id')
        p = Payment.objects.filter(id=pid).first() if pid else None
        if p is None:
            raise PaymeError(E_ORDER_NOT_FOUND, "To'lov topilmadi",
                             data='payment_id')
        return p

    @staticmethod
    def _find_by_tx(tx_id):
        from apps.payments.models import Payment
        p = Payment.objects.filter(provider='payme', ext_id=tx_id).first()
        if p is None:
            raise PaymeError(E_TX_NOT_FOUND, 'Tranzaksiya topilmadi')
        return p

    @staticmethod
    def _assert_amount(payment, amount):
        """⚡ Summa serverdagi bilan mos kelishi SHART"""
        if amount is None or int(amount) != payment.amount_tiyin:
            raise PaymeError(E_WRONG_AMOUNT, "Summa noto'g'ri")

    @staticmethod
    def _fiscal_detail(payment):
        """Payme fiskal ma'lumoti (IKPU bilan)"""
        items = []
        for it in payment.order.items.select_related('dish'):
            items.append({
                'title': it.dish.name_uz,
                'price': int(it.price * 100),
                'count': it.qty,
                'code': it.dish.ikpu_code or '10112001001000000',
                'vat_percent': 12,
                'package_code': it.dish.package_code or '1',
            })
        return {'receipt_type': 0, 'items': items}

    @staticmethod
    def _tx_response(payment, state):
        return {
            'create_time': int(payment.created_at.timestamp() * 1000),
            'perform_time': int(payment.paid_at.timestamp() * 1000) if payment.paid_at else 0,
            'cancel_time': int(payment.cancelled_at.timestamp() * 1000) if payment.cancelled_at else 0,
            'transaction': str(payment.id),
            'state': state,
            'reason': None,
        }

    # ---------- reconciliation ----------
    def check_status(self, payment) -> str:
        if not payment.ext_id:
            return payment.status
        base = API_TEST if self.config.get('is_test') else API_URL
        try:
            r = requests.post(base, timeout=10, json={
                'method': 'receipts.check', 'params': {'id': payment.ext_id}},
                headers={'X-Auth': f"{self.config['merchant_id']}:{self.config['secret']}"})
            state = r.json().get('result', {}).get('state')
            return {4: 'paid', 50: 'cancelled', 21: 'created'}.get(state, payment.status)
        except Exception as e:
            log.warning(f'[payme] check_status xato: {e}')
            return payment.status
```

✅ **Tekshirish:**
```bash
pytest tests/test_payme_rpc.py -q
```

---

## V-190 — Click adapter (Prepare + Complete)

**Fayl:** `apps/payments/providers/click.py`
```python
import hashlib, logging, requests
from urllib.parse import urlencode
from apps.payments.providers import register
from apps.payments.providers.base import BaseProvider, PaymentResult

log = logging.getLogger('payments.click')

CHECKOUT = 'https://my.click.uz/services/pay'
API = 'https://api.click.uz/v2/merchant'

# Click xato kodlari
OK                  = 0
E_SIGN              = -1
E_AMOUNT            = -2
E_ACTION            = -3
E_ALREADY_PAID      = -4
E_USER_NOT_FOUND    = -5
E_TX_NOT_FOUND      = -6
E_CANCELLED         = -9


@register
class ClickProvider(BaseProvider):
    code = 'click'

    def create_invoice(self, payment) -> PaymentResult:
        params = {
            'service_id': self.config['service_id'],
            'merchant_id': self.config['merchant_id'],
            'amount': f'{payment.amount:.2f}',
            'transaction_param': str(payment.id),
            'return_url': self.config.get('return_url', ''),
        }
        return PaymentResult(ok=True,
                             payment_url=f'{CHECKOUT}?{urlencode(params)}',
                             raw=params)

    # ---------- imzo ----------
    def verify_signature(self, request) -> bool:
        """
        ⚡ Click sign_string:
        Prepare:  click_trans_id + service_id + SECRET + merchant_trans_id
                  + amount + action + sign_time
        Complete: click_trans_id + service_id + SECRET + merchant_trans_id
                  + merchant_prepare_id + amount + action + sign_time
        """
        d = request.POST if request.POST else (request.data or {})
        action = str(d.get('action', ''))
        parts = [str(d.get('click_trans_id', '')), str(d.get('service_id', '')),
                 self.config['secret'], str(d.get('merchant_trans_id', ''))]
        if action == '1':
            parts.append(str(d.get('merchant_prepare_id', '')))
        parts += [str(d.get('amount', '')), action, str(d.get('sign_time', ''))]
        expected = hashlib.md5(''.join(parts).encode()).hexdigest()
        got = str(d.get('sign_string', '')).lower()
        if expected != got:
            log.warning(f'[click] imzo mos emas: kutilgan={expected} kelgan={got}')
        return expected == got

    # ---------- Prepare (action=0) ----------
    def prepare(self, d: dict) -> dict:
        from apps.payments.models import Payment
        from decimal import Decimal
        pid = d.get('merchant_trans_id')
        payment = Payment.objects.filter(id=pid).first()
        if payment is None:
            return self._err(d, E_USER_NOT_FOUND, "To'lov topilmadi")
        if abs(Decimal(str(d.get('amount', '0'))) - payment.amount) > Decimal('0.01'):
            return self._err(d, E_AMOUNT, "Summa noto'g'ri")
        if payment.status == 'paid':
            return self._err(d, E_ALREADY_PAID, "Allaqachon to'langan")
        if payment.status in ('cancelled', 'expired'):
            return self._err(d, E_CANCELLED, 'Bekor qilingan')

        payment.ext_id = str(d.get('click_trans_id'))
        payment.status = 'created'
        payment.save(update_fields=['ext_id', 'status', 'updated_at'])
        return {
            'click_trans_id': d.get('click_trans_id'),
            'merchant_trans_id': pid,
            'merchant_prepare_id': payment.id,
            'error': OK, 'error_note': 'Success',
        }

    # ---------- Complete (action=1) ----------
    def complete(self, d: dict) -> dict:
        from apps.payments.models import Payment
        from apps.payments.services import mark_paid, mark_cancelled
        pid = d.get('merchant_trans_id')
        payment = Payment.objects.filter(id=pid).first()
        if payment is None:
            return self._err(d, E_USER_NOT_FOUND, "To'lov topilmadi")

        # Click xatosi bilan kelgan bo'lsa — bekor qilamiz
        if int(d.get('error', 0)) < 0:
            if payment.status != 'cancelled':
                mark_cancelled(payment, reason=f"click error={d.get('error')}")
            return self._err(d, E_CANCELLED, 'Bekor qilindi')

        if payment.status == 'paid':      # ⚡ idempotent
            return {'click_trans_id': d.get('click_trans_id'),
                    'merchant_trans_id': pid,
                    'merchant_confirm_id': payment.id,
                    'error': OK, 'error_note': 'Success'}

        mark_paid(payment, ext_id=str(d.get('click_trans_id')), raw=dict(d))
        return {'click_trans_id': d.get('click_trans_id'),
                'merchant_trans_id': pid,
                'merchant_confirm_id': payment.id,
                'error': OK, 'error_note': 'Success'}

    @staticmethod
    def _err(d, code, note):
        return {'click_trans_id': d.get('click_trans_id'),
                'merchant_trans_id': d.get('merchant_trans_id'),
                'error': code, 'error_note': note}

    # ---------- reconciliation ----------
    def check_status(self, payment) -> str:
        if not payment.ext_id:
            return payment.status
        import time
        ts = str(int(time.time()))
        digest = hashlib.sha1(f"{ts}{self.config['secret']}".encode()).hexdigest()
        auth = f"{self.config['merchant_user_id']}:{digest}:{ts}"
        try:
            r = requests.get(
                f"{API}/payment/status/{self.config['service_id']}/{payment.ext_id}",
                headers={'Auth': auth}, timeout=10)
            state = r.json().get('payment_status')
            return {2: 'paid', -2: 'refunded', -1: 'cancelled'}.get(state, payment.status)
        except Exception as e:
            log.warning(f'[click] check_status xato: {e}')
            return payment.status
```

✅ **Tekshirish:** `pytest tests/test_click_flow.py -q`

---

## V-191 — Uzum adapter

**Fayl:** `apps/payments/providers/uzum.py`
```python
import base64, hashlib, hmac, json, logging, requests
from apps.payments.providers import register
from apps.payments.providers.base import BaseProvider, PaymentResult

log = logging.getLogger('payments.uzum')

API = 'https://mobile.apelsin.uz/api/v1/nasiya'
API_TEST = 'https://test-mobile.apelsin.uz/api/v1/nasiya'


@register
class UzumProvider(BaseProvider):
    code = 'uzum'

    @property
    def base(self):
        return API_TEST if self.config.get('is_test') else API

    def _headers(self):
        token = base64.b64encode(
            f"{self.config['merchant_id']}:{self.config['secret']}".encode()).decode()
        return {'Authorization': f'Basic {token}',
                'Content-Type': 'application/json'}

    def create_invoice(self, payment) -> PaymentResult:
        body = {
            'merchantId': self.config['merchant_id'],
            'serviceId': self.config.get('service_id', ''),
            'transactionId': str(payment.idempotency_key),
            'amount': payment.amount_tiyin,
            'currency': 860,
            'successUrl': self.config.get('return_url', ''),
            'failureUrl': self.config.get('return_url', ''),
            'description': f'ARMENU buyurtma #{payment.order.number}',
        }
        try:
            r = requests.post(f'{self.base}/checkout/create', json=body,
                              headers=self._headers(), timeout=15)
            data = r.json()
            if r.status_code != 200 or not data.get('checkoutUrl'):
                return PaymentResult(ok=False, raw=data,
                                     error=data.get('errorMessage', 'Uzum xato'))
            return PaymentResult(ok=True, payment_url=data['checkoutUrl'],
                                 ext_id=str(data.get('transactionId', '')), raw=data)
        except Exception as e:
            log.error(f'[uzum] invoice xato: {e}')
            return PaymentResult(ok=False, error=str(e))

    def verify_signature(self, request) -> bool:
        """⚡ Uzum HMAC-SHA256(body, secret) → X-Signature (hex)"""
        sig = request.headers.get('X-Signature', '')
        if not sig:
            return False
        raw = request.body if isinstance(request.body, bytes) else request.body.encode()
        expected = hmac.new(self.config['secret'].encode(), raw,
                            hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, sig.lower())

    def handle_webhook(self, body: dict) -> dict:
        from apps.payments.models import Payment
        from apps.payments.services import mark_paid, mark_cancelled
        tx = body.get('transactionId') or body.get('paymentId')
        payment = Payment.objects.filter(
            provider='uzum', idempotency_key=body.get('transactionId')).first() \
            or Payment.objects.filter(provider='uzum', ext_id=str(tx)).first()
        if payment is None:
            return {'status': 'FAILED', 'errorMessage': "To'lov topilmadi"}

        state = (body.get('status') or '').upper()
        if state in ('SUCCESS', 'PAID', 'COMPLETED'):
            if payment.status != 'paid':
                mark_paid(payment, ext_id=str(tx), raw=body)
        elif state in ('CANCELED', 'CANCELLED', 'FAILED', 'REVERSED'):
            if payment.status not in ('cancelled', 'refunded'):
                mark_cancelled(payment, reason=f'uzum {state}')
        return {'status': 'SUCCESS', 'transactionId': str(tx)}

    def check_status(self, payment) -> str:
        if not payment.ext_id:
            return payment.status
        try:
            r = requests.get(f'{self.base}/checkout/{payment.ext_id}',
                             headers=self._headers(), timeout=10)
            state = (r.json().get('status') or '').upper()
            return {'SUCCESS': 'paid', 'PAID': 'paid',
                    'CANCELED': 'cancelled', 'FAILED': 'failed'}.get(state, payment.status)
        except Exception as e:
            log.warning(f'[uzum] check_status xato: {e}')
            return payment.status
```

✅ **Tekshirish:** `python manage.py shell -c "from apps.payments.providers import REGISTRY; print(sorted(REGISTRY))"`
→ `['click', 'payme', 'uzum']`

---

## V-192 — `POST /v1/payments/` (to'lov boshlash)

> ⚠️ **Summa faqat serverda hisoblanadi.** Frontenddan `amount` KELMAYDI.

**Fayl:** `apps/payments/services.py`
```python
import logging
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from core.exceptions import ARMenuError, InvalidTransition
from core.ws import ws_send, g_cashier, g_waiters, g_admin, g_guest
from core.queue import enqueue

log = logging.getLogger('payments.services')
PAYMENT_TTL_MIN = 15


class PaymentError(ARMenuError):
    code_name = 'PAYMENT_ERROR'
    status_code = 409
    msg_uz = "To'lovni boshlab bo'lmadi"
    msg_ru = "Не удалось начать оплату"
    msg_en = 'Could not start payment'


def q2(v) -> Decimal:
    return Decimal(v).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def calc_order_total(order, use_bonus: bool = False) -> dict:
    """
    ⚡ YAGONA HAQIQAT MANBAI — summa faqat shu yerda hisoblanadi.
    Frontend hech qachon summani yubormaydi.
    """
    items_sum = Decimal('0')
    for it in order.items.select_related('dish').all():
        line = q2(it.price) * it.qty
        for m in (it.modifiers or []):
            line += q2(m.get('price_delta', 0)) * it.qty
        items_sum += line
    items_sum = q2(items_sum)

    r = order.restaurant
    service_pct = Decimal(str(r.service_percent or 0))
    service = q2(items_sum * service_pct / 100)

    discount = q2(order.discount_amount or 0)

    bonus_used = Decimal('0')
    if use_bonus and order.guest_id:
        available = q2(order.guest.bonus or 0)
        payable = items_sum + service - discount
        bonus_used = min(available, payable)

    total = q2(items_sum + service - discount - bonus_used)
    if total < 0:
        total = Decimal('0.00')

    return {'items': items_sum, 'service': service, 'discount': discount,
            'bonus_used': bonus_used, 'total': total,
            'service_percent': service_pct}


@transaction.atomic
def create_payment(order, provider_code: str, use_bonus=False,
                   split_index=1, split_total=1, guest=None, amount=None):
    """
    amount — FAQAT split bill uchun (server hisoblagan ulush).
    Boshqa holatda serverda hisoblanadi.
    """
    from apps.payments.models import Payment
    from apps.payments.providers import get_provider

    if order.status in ('paid', 'cancelled'):
        raise InvalidTransition({'status': order.status})

    calc = calc_order_total(order, use_bonus=use_bonus)
    pay_amount = q2(amount) if amount is not None else calc['total']
    if pay_amount <= 0:
        raise PaymentError({'reason': 'summa 0'})

    # ⚡ Ortiqcha to'lovni bloklash
    already = sum((p.amount for p in order.payments.filter(status='paid')),
                  Decimal('0'))
    if q2(already + pay_amount) > q2(calc['total'] + calc['bonus_used']) + Decimal('0.01'):
        raise PaymentError({'reason': 'ortiqcha summa',
                            'already': str(already), 'total': str(calc['total'])})

    payment = Payment.objects.create(
        restaurant=order.restaurant, order=order, provider=provider_code,
        amount=pay_amount, status='pending', created_by_guest=guest,
        split_index=split_index, split_total=split_total,
        expires_at=timezone.now() + timedelta(minutes=PAYMENT_TTL_MIN),
    )

    if provider_code == 'cash':
        payment.status = 'created'
        payment.save(update_fields=['status'])
        return payment

    prov = get_provider(order.restaurant, provider_code)
    res = prov.create_invoice(payment)
    if not res.ok:
        payment.status = 'failed'
        payment.error = res.error
        payment.save(update_fields=['status', 'error'])
        raise PaymentError({'provider': provider_code, 'error': res.error})

    payment.payment_url = res.payment_url
    payment.ext_id = res.ext_id or payment.ext_id
    payment.raw = res.raw
    payment.status = 'created'
    payment.save(update_fields=['payment_url', 'ext_id', 'raw', 'status'])
    return payment
```

**Fayl:** `apps/payments/serializers.py`
```python
from rest_framework import serializers
from apps.payments.models import Payment, Tip


class PaymentCreateSerializer(serializers.Serializer):
    """⚠️ `amount` YO'Q — summa serverda hisoblanadi"""
    order_id   = serializers.IntegerField()
    provider   = serializers.ChoiceField(
        choices=['payme', 'click', 'uzum', 'cash'])
    use_bonus  = serializers.BooleanField(default=False)
    split_total = serializers.IntegerField(default=1, min_value=1, max_value=20)
    split_index = serializers.IntegerField(default=1, min_value=1, max_value=20)


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'provider', 'amount', 'currency', 'status',
                  'payment_url', 'split_index', 'split_total',
                  'expires_at', 'paid_at', 'created_at']
        read_only_fields = fields


class TipCreateSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    staff_id = serializers.IntegerField()
    percent  = serializers.IntegerField(required=False, allow_null=True,
                                        min_value=1, max_value=100)
    amount   = serializers.DecimalField(max_digits=12, decimal_places=2,
                                        required=False, allow_null=True)
    provider = serializers.ChoiceField(choices=['payme', 'click', 'uzum'],
                                       default='payme')
```

**Fayl:** `apps/payments/views.py`
```python
from decimal import Decimal
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from django.shortcuts import get_object_or_404

from apps.orders.models import Order
from apps.payments.serializers import (PaymentCreateSerializer,
                                       PaymentSerializer, TipCreateSerializer)
from apps.payments.services import create_payment, calc_order_total, q2
from core.exceptions import TenantMismatch


class PaymentThrottle(AnonRateThrottle):
    rate = '20/min'


@api_view(['GET'])
def order_bill(request, order_id):
    """M-10 — hisob (serverda hisoblangan)"""
    order = get_object_or_404(Order, id=order_id,
                              restaurant_id=request.restaurant_id)
    use_bonus = request.GET.get('use_bonus') == '1'
    c = calc_order_total(order, use_bonus=use_bonus)
    paid = sum((p.amount for p in order.payments.filter(status='paid')),
               Decimal('0'))
    return Response({
        'order_id': order.id, 'number': order.number,
        'items_sum': str(c['items']),
        'service_percent': str(c['service_percent']),
        'service': str(c['service']),
        'discount': str(c['discount']),
        'bonus_available': str(order.guest.bonus if order.guest_id else 0),
        'bonus_used': str(c['bonus_used']),
        'total': str(c['total']),
        'paid': str(q2(paid)),
        'left': str(q2(c['total'] - paid)),
        'items': [{'name': i.dish.name_uz, 'qty': i.qty,
                   'price': str(i.price), 'sum': str(q2(i.price) * i.qty)}
                  for i in order.items.select_related('dish')],
    })


@api_view(['POST'])
@throttle_classes([PaymentThrottle])
def create_payment_view(request):
    """POST /v1/payments/"""
    s = PaymentCreateSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    d = s.validated_data

    order = get_object_or_404(Order, id=d['order_id'])
    if order.restaurant_id != request.restaurant_id:
        raise TenantMismatch({'order_id': d['order_id']})

    amount = None
    if d['split_total'] > 1:
        from apps.payments.services import split_amount
        amount = split_amount(order, d['split_total'], d['split_index'],
                              use_bonus=d['use_bonus'])

    payment = create_payment(
        order, d['provider'], use_bonus=d['use_bonus'],
        split_index=d['split_index'], split_total=d['split_total'],
        guest=getattr(request, 'guest', None), amount=amount)
    return Response(PaymentSerializer(payment).data, status=201)


@api_view(['GET'])
def payment_status(request, payment_id):
    from apps.payments.models import Payment
    p = get_object_or_404(Payment, id=payment_id,
                          restaurant_id=request.restaurant_id)
    return Response(PaymentSerializer(p).data)
```

**Fayl:** `apps/payments/urls.py`
```python
from django.urls import path
from apps.payments import views, webhooks

urlpatterns = [
    path('payments/', views.create_payment_view, name='payment-create'),
    path('payments/<int:payment_id>/', views.payment_status, name='payment-status'),
    path('orders/<int:order_id>/bill/', views.order_bill, name='order-bill'),
    path('tips/', views.create_tip_view, name='tip-create'),
    path('payments/webhook/payme/', webhooks.payme_webhook),
    path('payments/webhook/click/', webhooks.click_webhook),
    path('payments/webhook/uzum/',  webhooks.uzum_webhook),
]
```

`config/urls.py` ga: `path('v1/', include('apps.payments.urls'))`

✅ **Tekshirish:**
```bash
curl -s http://localhost:8060/v1/orders/1/bill/ -H "Host: test-rest.localhost" | python -m json.tool
```

---

## V-193 — ⚡ Webhook + imzo tekshiruvi (KRITIK)

**Fayl:** `apps/payments/webhooks.py`
```python
import json, logging
from django.db import transaction, IntegrityError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from apps.payments.models import Payment, PaymentEvent
from apps.payments.providers import get_provider
from apps.payments.providers.payme import PaymeProvider, PaymeError, E_ACCESS_DENIED

log = logging.getLogger('payments.webhook')


def _restaurant_from_payment(pid):
    p = Payment.objects.filter(id=pid).select_related('restaurant').first()
    return p.restaurant if p else None


# ============ PAYME (JSON-RPC) ============
@csrf_exempt
@require_POST
def payme_webhook(request):
    try:
        body = json.loads(request.body.decode() or '{}')
    except Exception:
        return JsonResponse({'error': {'code': -32700,
                                       'message': 'Parse error'}}, status=200)

    rpc_id = body.get('id')
    method = body.get('method', '')
    params = body.get('params') or {}

    # restoranni aniqlash (kalit restoranga bog'liq)
    pid = (params.get('account') or {}).get('payment_id')
    if not pid and params.get('id'):
        p = Payment.objects.filter(provider='payme', ext_id=params['id']).first()
        pid = p.id if p else None
    restaurant = _restaurant_from_payment(pid)
    if restaurant is None:
        return _payme_err(rpc_id, -31050, "To'lov topilmadi")

    prov = get_provider(restaurant, 'payme')

    # ⚡ 1. IMZO
    if not prov.verify_signature(request):
        log.warning('[payme] imzo NOTO\'G\'RI — rad etildi')
        return _payme_err(rpc_id, E_ACCESS_DENIED, 'Ruxsat yo\'q')

    # ⚡ 2. IDEMPOTENCY (event darajasida)
    ext_event = f"{method}:{params.get('id') or pid}:{params.get('time', '')}"
    try:
        with transaction.atomic():
            PaymentEvent.objects.create(provider='payme', ext_event_id=ext_event,
                                        method=method, body=body,
                                        payment_id=pid)
    except IntegrityError:
        log.info(f'[payme] dublikat webhook: {ext_event} — qayta ishlanmaydi')
        # Dublikat bo'lsa ham Payme'ga joriy holatni qaytaramiz
        pass

    # ⚡ 3. Bajarish
    try:
        result = prov.handle_rpc(method, params)
        return JsonResponse({'result': result, 'id': rpc_id})
    except PaymeError as e:
        return _payme_err(rpc_id, e.code, e.message['uz'], e.data)
    except Exception as e:
        log.exception(f'[payme] {method} xato')
        return _payme_err(rpc_id, -32400, str(e))


def _payme_err(rpc_id, code, msg, data=None):
    err = {'code': code, 'message': {'uz': msg, 'ru': msg, 'en': msg}}
    if data:
        err['data'] = data
    return JsonResponse({'error': err, 'id': rpc_id}, status=200)


# ============ CLICK (form-encoded) ============
@csrf_exempt
@require_POST
def click_webhook(request):
    d = request.POST.dict()
    pid = d.get('merchant_trans_id')
    restaurant = _restaurant_from_payment(pid)
    if restaurant is None:
        return JsonResponse({'error': -5, 'error_note': "To'lov topilmadi"})

    prov = get_provider(restaurant, 'click')

    # ⚡ 1. IMZO
    if not prov.verify_signature(request):
        return JsonResponse({'error': -1, 'error_note': 'SIGN CHECK FAILED'})

    # ⚡ 2. IDEMPOTENCY
    action = str(d.get('action'))
    ext_event = f"{action}:{d.get('click_trans_id')}"
    try:
        with transaction.atomic():
            PaymentEvent.objects.create(provider='click', ext_event_id=ext_event,
                                        method=f'action={action}', body=d,
                                        payment_id=pid)
    except IntegrityError:
        log.info(f'[click] dublikat webhook: {ext_event}')

    # ⚡ 3. Bajarish
    if action == '0':
        return JsonResponse(prov.prepare(d))
    if action == '1':
        return JsonResponse(prov.complete(d))
    return JsonResponse({'error': -3, 'error_note': 'Action topilmadi'})


# ============ UZUM (JSON + HMAC) ============
@csrf_exempt
@require_POST
def uzum_webhook(request):
    try:
        body = json.loads(request.body.decode() or '{}')
    except Exception:
        return JsonResponse({'status': 'FAILED',
                             'errorMessage': 'Parse error'}, status=400)

    tx = body.get('transactionId')
    payment = Payment.objects.filter(
        provider='uzum', idempotency_key=tx).select_related('restaurant').first()
    if payment is None:
        return JsonResponse({'status': 'FAILED',
                             'errorMessage': "To'lov topilmadi"}, status=404)

    prov = get_provider(payment.restaurant, 'uzum')

    # ⚡ 1. IMZO
    if not prov.verify_signature(request):
        log.warning('[uzum] imzo NOTO\'G\'RI')
        return JsonResponse({'status': 'FAILED',
                             'errorMessage': 'Invalid signature'}, status=401)

    # ⚡ 2. IDEMPOTENCY
    ext_event = f"{body.get('status')}:{tx}:{body.get('paymentId', '')}"
    try:
        with transaction.atomic():
            PaymentEvent.objects.create(provider='uzum', ext_event_id=ext_event,
                                        method=body.get('status', ''), body=body,
                                        payment=payment)
    except IntegrityError:
        log.info(f'[uzum] dublikat webhook: {ext_event}')
        return JsonResponse({'status': 'SUCCESS', 'transactionId': tx})

    return JsonResponse(prov.handle_webhook(body))
```

✅ **Test:** `tests/test_payment_webhook_signature.py`
```python
import base64, json, pytest
from django.urls import reverse


@pytest.mark.django_db
def test_payme_wrong_auth_rejected(api_client, payme_payment):
    r = api_client.post('/v1/payments/webhook/payme/',
                        data=json.dumps({'id': 1, 'method': 'CheckPerformTransaction',
                                         'params': {'account': {'payment_id': payme_payment.id},
                                                    'amount': payme_payment.amount_tiyin}}),
                        content_type='application/json',
                        HTTP_AUTHORIZATION='Basic ' + base64.b64encode(b'Paycom:YOLGON').decode())
    assert r.json()['error']['code'] == -32504


@pytest.mark.django_db
def test_click_wrong_sign_rejected(api_client, click_payment):
    r = api_client.post('/v1/payments/webhook/click/', data={
        'click_trans_id': '1', 'service_id': '1', 'merchant_trans_id': click_payment.id,
        'amount': '1000.00', 'action': '0', 'sign_time': '2026-09-04 10:00:00',
        'sign_string': 'yolgon'})
    assert r.json()['error'] == -1
```

---

## V-194 — ⚡ Idempotency (to'lovda)

**Fayl:** `apps/payments/services.py` (davomi)
```python
@transaction.atomic
def mark_paid(payment, ext_id: str = '', raw: dict = None):
    """
    ⚡ IDEMPOTENT: bir Payment 2 marta 'paid' bo'lmaydi.
    SELECT FOR UPDATE bilan qulflanadi — parallel webhook xavfsiz.
    """
    from apps.payments.models import Payment
    p = Payment.objects.select_for_update().get(id=payment.id)
    if p.status == 'paid':
        log.info(f'[pay] Payment#{p.id} allaqachon paid — o\'tkazib yuborildi')
        return p

    p.status = 'paid'
    p.paid_at = timezone.now()
    if ext_id:
        p.ext_id = ext_id
    if raw:
        p.raw = {**(p.raw or {}), **raw}
    p.save(update_fields=['status', 'paid_at', 'ext_id', 'raw', 'updated_at'])

    order = p.order
    # Bonus ishlatilgan bo'lsa — yechib olamiz
    _apply_bonus_deduction(p)

    # Barcha to'lovlar yig'indisi yetdimi?
    total_paid = sum((x.amount for x in order.payments.filter(status='paid')),
                     Decimal('0'))
    calc = calc_order_total(order)
    fully_paid = q2(total_paid) >= q2(calc['total']) - Decimal('0.01')

    if fully_paid and order.status != 'paid':
        from apps.orders.services import transition
        transition(order, 'paid', actor='payment')

        # ⚡ Fiskal chek — async, retry bilan
        transaction.on_commit(lambda: enqueue('fiscal', 'create_receipt',
                                              order_id=order.id))
        # ⚡ Keshbek
        transaction.on_commit(lambda: enqueue('notify', 'cashback',
                                              order_id=order.id))

    transaction.on_commit(lambda: _broadcast_paid(p, fully_paid, total_paid, calc))
    log.info(f'[pay] ✅ Payment#{p.id} {p.amount} {p.provider} → paid')
    return p


def _apply_bonus_deduction(payment):
    from apps.loyalty.services import spend_bonus
    used = Decimal(str((payment.raw or {}).get('bonus_used', 0) or 0))
    if used > 0 and payment.order.guest_id:
        spend_bonus(payment.order.guest, used, order=payment.order)


def _broadcast_paid(p, fully_paid, total_paid, calc):
    data = {'payment_id': p.id, 'order_id': p.order_id,
            'amount': str(p.amount), 'provider': p.provider,
            'paid_total': str(q2(total_paid)), 'order_total': str(calc['total']),
            'fully_paid': fully_paid}
    rid = p.restaurant_id
    ws_send(g_cashier(rid), 'payment.success', data)
    ws_send(g_waiters(rid), 'payment.success', data)
    ws_send(g_admin(rid),   'payment.success', data)
    if p.order.guest_session_id:
        ws_send(g_guest(p.order.guest_session_id), 'payment.success', data)


@transaction.atomic
def mark_cancelled(payment, reason: str = ''):
    from apps.payments.models import Payment
    p = Payment.objects.select_for_update().get(id=payment.id)
    if p.status in ('cancelled', 'refunded'):
        return p
    was_paid = p.status == 'paid'
    p.status = 'refunded' if was_paid else 'cancelled'
    p.cancelled_at = timezone.now()
    p.error = reason
    p.save(update_fields=['status', 'cancelled_at', 'error', 'updated_at'])
    log.warning(f'[pay] Payment#{p.id} → {p.status} ({reason})')
    if was_paid:
        transaction.on_commit(lambda: enqueue('fiscal', 'cancel_receipt',
                                              order_id=p.order_id,
                                              payment_id=p.id))
    return p


def expire_stale_payments():
    """Cron (5 daqiqada) — 15 daqiqada to'lanmagan to'lovlar `expired`"""
    from apps.payments.models import Payment
    qs = Payment.objects.filter(status__in=['pending', 'created'],
                                expires_at__lt=timezone.now())
    n = qs.update(status='expired', updated_at=timezone.now())
    if n:
        log.info(f'[pay] {n} ta to\'lov muddati tugadi')
    return n
```

✅ **Test:** `tests/test_payment_idempotency.py` (⚡ CI'da MAJBURIY)
```python
import pytest
from decimal import Decimal
from apps.payments.services import mark_paid


@pytest.mark.django_db(transaction=True)
def test_double_webhook_pays_once(payment_pending):
    mark_paid(payment_pending, ext_id='tx1')
    mark_paid(payment_pending, ext_id='tx1')      # 2-marta
    payment_pending.refresh_from_db()
    order = payment_pending.order
    paid = order.payments.filter(status='paid')
    assert paid.count() == 1
    assert sum(p.amount for p in paid) == payment_pending.amount


@pytest.mark.django_db
def test_payment_event_unique(payment_pending):
    from apps.payments.models import PaymentEvent
    from django.db import IntegrityError
    PaymentEvent.objects.create(provider='payme', ext_event_id='e1', body={})
    with pytest.raises(IntegrityError):
        PaymentEvent.objects.create(provider='payme', ext_event_id='e1', body={})
```

---

## V-195 — Hisobni bo'lish (split bill)

**Fayl:** `apps/payments/services.py` (davomi)
```python
def split_amount(order, split_total: int, split_index: int,
                 use_bonus: bool = False) -> Decimal:
    """
    ⚡ Hisobni teng bo'lish. Qoldiq tiyinlar OXIRGI ulushga qo'shiladi —
    yig'indi DOIM jamiga teng bo'ladi.
    """
    if not (1 <= split_index <= split_total):
        raise PaymentError({'reason': 'split_index noto\'g\'ri'})
    total = calc_order_total(order, use_bonus=use_bonus)['total']
    base = q2(total / split_total)
    if split_index < split_total:
        return base
    return q2(total - base * (split_total - 1))


@transaction.atomic
def split_by_items(order, groups: list, provider: str, use_bonus=False):
    """
    Taomlar bo'yicha bo'lish.
    groups = [{'item_ids': [1,2], 'label': 'Anvar'}, {'item_ids': [3], ...}]
    ⚡ Har item FAQAT bitta guruhda bo'lishi shart, hammasi qamrab olinishi shart.
    """
    from apps.payments.models import Payment
    all_ids = set(order.items.values_list('id', flat=True))
    used = []
    for g in groups:
        used += list(g['item_ids'])
    if len(used) != len(set(used)):
        raise PaymentError({'reason': 'taom takrorlangan'})
    if set(used) != all_ids:
        raise PaymentError({'reason': 'barcha taomlar taqsimlanmagan',
                            'missing': list(all_ids - set(used))})

    calc = calc_order_total(order, use_bonus=use_bonus)
    ratio = (calc['total'] / calc['items']) if calc['items'] else Decimal('0')

    payments, accumulated = [], Decimal('0')
    for i, g in enumerate(groups, start=1):
        part = Decimal('0')
        for it in order.items.filter(id__in=g['item_ids']):
            line = q2(it.price) * it.qty
            for m in (it.modifiers or []):
                line += q2(m.get('price_delta', 0)) * it.qty
            part += line
        amount = q2(part * ratio)
        if i == len(groups):                       # qoldiq oxirgiga
            amount = q2(calc['total'] - accumulated)
        accumulated += amount
        payments.append(create_payment(order, provider, use_bonus=False,
                                       split_index=i, split_total=len(groups),
                                       amount=amount))
    return payments
```

**Fayl:** `apps/payments/views.py` (qo'shimcha)
```python
@api_view(['POST'])
@throttle_classes([PaymentThrottle])
def split_bill_view(request, order_id):
    """POST /v1/orders/<id>/split/ — {mode:'equal'|'items', ...}"""
    from apps.payments.services import split_by_items, split_amount
    order = get_object_or_404(Order, id=order_id,
                              restaurant_id=request.restaurant_id)
    mode = request.data.get('mode', 'equal')
    provider = request.data.get('provider', 'payme')

    if mode == 'items':
        groups = request.data.get('groups') or []
        payments = split_by_items(order, groups, provider)
        return Response(PaymentSerializer(payments, many=True).data, status=201)

    n = int(request.data.get('parts', 2))
    parts = [{'index': i, 'amount': str(split_amount(order, n, i))}
             for i in range(1, n + 1)]
    return Response({'mode': 'equal', 'parts': parts})
```

`apps/payments/urls.py` ga: `path('orders/<int:order_id>/split/', views.split_bill_view)`

✅ **Test:**
```python
@pytest.mark.django_db
def test_split_sum_equals_total(order_with_items):
    from apps.payments.services import split_amount, calc_order_total
    total = calc_order_total(order_with_items)['total']
    s = sum(split_amount(order_with_items, 3, i) for i in (1, 2, 3))
    assert s == total          # ⚡ tiyin yo'qolmaydi
```

---

## V-196 — ⚡ Choychaqa (tips)

> ⚡ **Strategik:** ofitsiant qo'shimcha daromad oladi → tizimni O'ZI targ'ib qiladi.
> Bu SaaS'ning #1 o'ldiruvchisini (xodim qarshiligi) yo'q qiladi.

**Fayl:** `apps/payments/services.py` (davomi)
```python
TIP_MIN = Decimal('1000')
TIP_MAX_PERCENT = 100


@transaction.atomic
def create_tip(order, staff, provider_code: str, percent=None, amount=None,
               guest=None):
    """
    ⚡ Summa serverda hisoblanadi (percent berilsa).
    """
    from apps.payments.models import Payment, Tip
    from apps.payments.providers import get_provider

    if staff.restaurant_id != order.restaurant_id:
        from core.exceptions import TenantMismatch
        raise TenantMismatch({'staff_id': staff.id})

    base = calc_order_total(order)['total']
    if percent is not None:
        if not (1 <= percent <= TIP_MAX_PERCENT):
            raise PaymentError({'reason': 'foiz noto\'g\'ri'})
        tip_amount = q2(base * Decimal(percent) / 100)
    else:
        tip_amount = q2(amount or 0)

    if tip_amount < TIP_MIN:
        raise PaymentError({'reason': f'minimal {TIP_MIN} so\'m'})

    payment = Payment.objects.create(
        restaurant=order.restaurant, order=order, provider=provider_code,
        amount=tip_amount, status='pending', created_by_guest=guest,
        expires_at=timezone.now() + timedelta(minutes=PAYMENT_TTL_MIN),
        raw={'kind': 'tip', 'staff_id': staff.id})

    tip = Tip.objects.create(restaurant=order.restaurant, order=order,
                             staff=staff, payment=payment,
                             amount=tip_amount, percent=percent)

    prov = get_provider(order.restaurant, provider_code)
    res = prov.create_invoice(payment)
    if not res.ok:
        payment.status = 'failed'; payment.error = res.error
        payment.save(update_fields=['status', 'error'])
        raise PaymentError({'error': res.error})

    payment.payment_url = res.payment_url
    payment.status = 'created'
    payment.save(update_fields=['payment_url', 'status'])
    return tip, payment


@transaction.atomic
def settle_tip(payment):
    """Tip to'landi → Staff.tips_balance oshadi + ofitsiantga push"""
    from apps.payments.models import Tip
    from apps.accounts.models import Staff
    tip = Tip.objects.select_for_update().filter(payment=payment).first()
    if tip is None or tip.is_paid:
        return None
    tip.is_paid = True
    tip.save(update_fields=['is_paid', 'updated_at'])

    Staff.objects.filter(id=tip.staff_id).update(
        tips_balance=F('tips_balance') + tip.amount)

    transaction.on_commit(lambda: enqueue(
        'notify', 'tip_received', staff_id=tip.staff_id,
        amount=str(tip.amount), order_id=tip.order_id))
    log.info(f'[tip] 💝 Staff#{tip.staff_id} +{tip.amount}')
    return tip
```

`from django.db.models import F` import qo'shiladi. `mark_paid` ichida (order status
o'zgarishidan OLDIN):
```python
    if (p.raw or {}).get('kind') == 'tip':
        settle_tip(p)
        transaction.on_commit(lambda: _broadcast_paid(p, False, p.amount,
                                                      {'total': p.amount}))
        return p
```

**Fayl:** `apps/payments/views.py` (qo'shimcha)
```python
@api_view(['POST'])
@throttle_classes([PaymentThrottle])
def create_tip_view(request):
    """POST /v1/tips/ — M-11"""
    from apps.accounts.models import Staff
    from apps.payments.services import create_tip
    s = TipCreateSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    d = s.validated_data

    order = get_object_or_404(Order, id=d['order_id'],
                              restaurant_id=request.restaurant_id)
    staff = get_object_or_404(Staff, id=d['staff_id'],
                              restaurant_id=request.restaurant_id)

    tip, payment = create_tip(order, staff, d['provider'],
                              percent=d.get('percent'), amount=d.get('amount'),
                              guest=getattr(request, 'guest', None))
    return Response({'tip_id': tip.id, 'amount': str(tip.amount),
                     'staff': staff.user.get_full_name() or staff.user.username,
                     'payment': PaymentSerializer(payment).data}, status=201)


@api_view(['GET'])
def tip_suggestions(request, order_id):
    """M-11 tugmalari uchun summalar (serverda hisoblangan)"""
    from apps.payments.services import calc_order_total, q2
    order = get_object_or_404(Order, id=order_id,
                              restaurant_id=request.restaurant_id)
    total = calc_order_total(order)['total']
    waiter = order.table.waiter if order.table_id else None
    return Response({
        'waiter': ({'id': waiter.id,
                    'name': waiter.user.get_full_name() or waiter.user.username,
                    'photo': waiter.photo.url if waiter.photo else None}
                   if waiter else None),
        'options': [{'percent': p, 'amount': str(q2(total * p / 100))}
                    for p in (5, 10, 15)],
    })
```

**Fayl:** `apps/notifications/handlers/tip.py`
```python
from apps.notifications.services import send_telegram


def handle_tip_received(payload):
    """Worker `notify` navbatidan chaqiradi"""
    from apps.accounts.models import Staff
    staff = Staff.objects.select_related('user').filter(
        id=payload['staff_id']).first()
    if not staff or not staff.telegram_chat_id:
        return False
    name = staff.user.first_name or 'Hurmatli xodim'
    send_telegram(staff.telegram_chat_id,
                  f"💝 {name}, sizga {payload['amount']} so'm choychaqa! 🎉\n"
                  f"Jami balans: {staff.tips_balance} so'm")
    return True
```

✅ **Test:**
```python
@pytest.mark.django_db(transaction=True)
def test_tip_increases_staff_balance(order_paid, waiter):
    from apps.payments.services import create_tip, mark_paid
    tip, payment = create_tip(order_paid, waiter, 'payme', percent=10)
    mark_paid(payment, ext_id='tx-tip')
    waiter.refresh_from_db()
    assert waiter.tips_balance == tip.amount
```

---

## V-197 — Reconciliation cron (kunlik solishtirish)

> ⚡ **T8 riski:** webhook yo'qolishi mumkin. Kuniga 1 marta provayder bilan
> solishtiriladi — farq bo'lsa tuzatiladi va alert yuboriladi.

**Fayl:** `apps/payments/tasks.py`
```python
import logging
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone

log = logging.getLogger('payments.tasks')


def reconcile_payments(days: int = 1) -> dict:
    """
    Har kecha 04:00 — oxirgi N kun to'lovlarini provayder bilan solishtiradi.
    Farq topilsa: lokal holat provayderga MOSLASHTIRILADI + alert.
    """
    from apps.payments.models import Payment
    from apps.payments.providers import get_provider
    from apps.payments.services import mark_paid, mark_cancelled

    since = timezone.now() - timedelta(days=days)
    qs = (Payment.objects
          .filter(created_at__gte=since, provider__in=['payme', 'click', 'uzum'])
          .exclude(status__in=['pending', 'failed'])
          .select_related('restaurant', 'order'))

    stats = {'checked': 0, 'fixed_paid': 0, 'fixed_cancelled': 0,
             'mismatch': [], 'errors': 0}

    for p in qs.iterator(chunk_size=200):
        stats['checked'] += 1
        try:
            prov = get_provider(p.restaurant, p.provider)
            remote = prov.check_status(p)
        except Exception as e:
            stats['errors'] += 1
            log.warning(f'[recon] Payment#{p.id} tekshirib bo\'lmadi: {e}')
            continue

        if remote == p.status:
            continue

        log.warning(f'[recon] ⚠️ FARQ Payment#{p.id}: lokal={p.status} '
                    f'provayder={remote}')
        stats['mismatch'].append({'payment_id': p.id, 'local': p.status,
                                  'remote': remote, 'amount': str(p.amount)})

        if remote == 'paid' and p.status != 'paid':
            mark_paid(p, raw={'source': 'reconciliation'})
            stats['fixed_paid'] += 1
        elif remote in ('cancelled', 'refunded') and p.status == 'paid':
            mark_cancelled(p, reason='reconciliation')
            stats['fixed_cancelled'] += 1

    if stats['mismatch']:
        _alert(stats)
    log.info(f'[recon] tekshirildi={stats["checked"]} '
             f'tuzatildi={stats["fixed_paid"]}/{stats["fixed_cancelled"]}')
    return stats


def _alert(stats):
    from apps.notifications.services import send_telegram
    from django.conf import settings
    lines = [f"🚨 To'lov reconciliation: {len(stats['mismatch'])} ta farq"]
    for m in stats['mismatch'][:10]:
        lines.append(f"  • Payment#{m['payment_id']} {m['amount']} "
                     f"{m['local']} → {m['remote']}")
    send_telegram(settings.ONCALL_CHAT_ID, '\n'.join(lines))


def daily_settlement_report():
    """Har restoran uchun kunlik to'lov svodkasi (admin Telegram'ga)"""
    from apps.payments.models import Payment
    from apps.tenants.models import Restaurant
    from apps.notifications.services import send_telegram
    from django.db.models import Sum, Count

    y_start = (timezone.now() - timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0)
    y_end = y_start + timedelta(days=1)

    for r in Restaurant.objects.filter(is_active=True):
        rows = (Payment.objects
                .filter(restaurant=r, status='paid',
                        paid_at__gte=y_start, paid_at__lt=y_end)
                .values('provider')
                .annotate(total=Sum('amount'), cnt=Count('id')))
        if not rows:
            continue
        total = sum(x['total'] for x in rows)
        text = [f"💰 {r.name} — kecha ({y_start:%d.%m.%Y})"]
        for x in rows:
            text.append(f"  {x['provider']}: {x['total']:,.0f} so'm ({x['cnt']} ta)")
        text.append(f"  ═══ JAMI: {total:,.0f} so'm")
        if r.admin_chat_id:
            send_telegram(r.admin_chat_id, '\n'.join(text))
```

**Fayl:** `apps/payments/management/commands/reconcile_payments.py`
```python
from django.core.management.base import BaseCommand
from apps.payments.tasks import reconcile_payments, daily_settlement_report
from apps.payments.services import expire_stale_payments


class Command(BaseCommand):
    help = "To'lovlarni provayder bilan solishtiradi"

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=1)
        parser.add_argument('--report', action='store_true')

    def handle(self, *args, **o):
        expire_stale_payments()
        stats = reconcile_payments(days=o['days'])
        if o['report']:
            daily_settlement_report()
        self.stdout.write(self.style.SUCCESS(str(stats)))
```

**Cron:**
```bash
# /etc/cron.d/armenu-payments
*/5 * * * * armenu cd /home/armenu/app && venv/bin/python manage.py shell -c "from apps.payments.services import expire_stale_payments; expire_stale_payments()" >> /var/log/armenu/expire.log 2>&1
0 4 * * *   armenu cd /home/armenu/app && venv/bin/python manage.py reconcile_payments --days 2 --report >> /var/log/armenu/recon.log 2>&1
```

✅ **Tekshirish:**
```bash
python manage.py reconcile_payments --days 1
# {'checked': N, 'fixed_paid': 0, ...}
```

---

## V-198 — `FiscalReceipt` modeli

**Fayl:** `apps/fiscal/models.py`
```python
from django.db import models
from core.models import TenantModel


class FiscalReceipt(TenantModel):
    OFD = [('uzkassa', 'UZKASSA'), ('epos', 'e-POS'), ('qpos', 'QPos')]
    STATUS = [
        ('queued',    'Navbatda'),
        ('sending',   'Yuborilmoqda'),
        ('sent',      'Yuborildi'),
        ('confirmed', 'Tasdiqlandi'),
        ('failed',    'Xato'),
        ('cancelled', 'Bekor qilindi'),
        ('manual',    "Qo'lda kerak"),
    ]
    TYPE = [('sale', 'Savdo'), ('refund', 'Qaytarish')]

    order        = models.ForeignKey('orders.Order', on_delete=models.PROTECT,
                                     related_name='receipts')
    ofd_provider = models.CharField(max_length=20, choices=OFD, db_index=True)
    receipt_type = models.CharField(max_length=10, choices=TYPE, default='sale')

    fiscal_id    = models.CharField(max_length=120, blank=True, db_index=True)
    fiscal_sign  = models.CharField(max_length=120, blank=True)
    terminal_id  = models.CharField(max_length=60, blank=True)
    qr_url       = models.URLField(max_length=500, blank=True)
    receipt_seq  = models.IntegerField(null=True, blank=True)

    total        = models.DecimalField(max_digits=12, decimal_places=2)
    vat_total    = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cash_total   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    card_total   = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    payload      = models.JSONField(default=dict)   # OFD'ga yuborilgan
    response     = models.JSONField(default=dict, blank=True)
    status       = models.CharField(max_length=20, choices=STATUS,
                                    default='queued', db_index=True)
    retry_count  = models.SmallIntegerField(default=0)
    next_retry_at = models.DateTimeField(null=True, blank=True, db_index=True)
    deadline_at  = models.DateTimeField(null=True, blank=True)  # ⚡ +48 soat
    error        = models.TextField(blank=True)
    sent_at      = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    # raqamli chek yuborilganmi
    sent_to_telegram = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=['restaurant', 'status', 'created_at']),
            models.Index(fields=['status', 'next_retry_at']),
        ]

    def __str__(self):
        return f'Chek#{self.id} {self.ofd_provider} {self.status}'


class FiscalConfig(TenantModel):
    """Restoran OFD sozlamalari (kalitlar shifrlangan)"""
    from core.crypto import encrypt, decrypt  # noqa

    ofd_provider = models.CharField(max_length=20, default='uzkassa')
    inn          = models.CharField(max_length=14)
    terminal_id  = models.CharField(max_length=60)
    login        = models.CharField(max_length=120, blank=True)
    _password    = models.TextField(db_column='password', blank=True)
    vat_percent  = models.SmallIntegerField(default=12)
    is_test      = models.BooleanField(default=True)
    is_active    = models.BooleanField(default=False)

    class Meta:
        constraints = [models.UniqueConstraint(
            fields=['restaurant'], name='uq_fiscal_config_rest')]

    @property
    def password(self):
        from core.crypto import decrypt
        return decrypt(self._password)

    @password.setter
    def password(self, v):
        from core.crypto import encrypt
        self._password = encrypt(v)
```

`apps/menu/models.py` — `Dish` da bo'lishi kerak (V-051 da qo'shilgan):
```python
    ikpu_code    = models.CharField(max_length=17, blank=True, db_index=True)
    package_code = models.CharField(max_length=20, blank=True)
    vat_percent  = models.SmallIntegerField(default=12)
```

✅ **Tekshirish:**
```bash
python manage.py makemigrations fiscal && python manage.py migrate
```

---

## V-199 — OFD adapter: UZKASSA

**Fayl:** `apps/fiscal/providers/base.py`
```python
from abc import ABC, abstractmethod


class FiscalResult:
    def __init__(self, ok, fiscal_id='', fiscal_sign='', qr_url='',
                 seq=None, raw=None, error='', retryable=True):
        self.ok = ok
        self.fiscal_id = fiscal_id
        self.fiscal_sign = fiscal_sign
        self.qr_url = qr_url
        self.seq = seq
        self.raw = raw or {}
        self.error = error
        self.retryable = retryable      # ⚡ False = qayta urinmaydi


class BaseOFD(ABC):
    code = ''

    def __init__(self, config):
        self.config = config

    @abstractmethod
    def send_receipt(self, receipt) -> FiscalResult: ...

    @abstractmethod
    def cancel_receipt(self, receipt) -> FiscalResult: ...

    def build_items(self, order, vat_percent):
        """Umumiy: taomlarni OFD formatiga o'giradi"""
        from decimal import Decimal, ROUND_HALF_UP
        items = []
        for it in order.items.select_related('dish'):
            price = Decimal(it.price)
            for m in (it.modifiers or []):
                price += Decimal(str(m.get('price_delta', 0)))
            line_total = (price * it.qty).quantize(Decimal('0.01'),
                                                   rounding=ROUND_HALF_UP)
            vat = (line_total * vat_percent / (100 + vat_percent)).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP)
            items.append({
                'Name': it.dish.name_uz,
                'SPIC': it.dish.ikpu_code or '10112001001000000',
                'PackageCode': it.dish.package_code or '1',
                'Price': int(price * 100),
                'Amount': int(it.qty * 1000),        # 3 kasr
                'VAT': int(vat * 100),
                'VATPercent': int(vat_percent),
                'Discount': 0,
                'Other': 0,
                'CommissionInfo': {'TIN': self.config.get('inn', '')},
            })
        return items
```

**Fayl:** `apps/fiscal/providers/uzkassa.py`
```python
import logging, requests
from decimal import Decimal
from django.utils import timezone
from apps.fiscal.providers.base import BaseOFD, FiscalResult
from core.resilience import CircuitBreaker

log = logging.getLogger('fiscal.uzkassa')

API = 'https://api.uzkassa.uz/v1'
API_TEST = 'https://test-api.uzkassa.uz/v1'
CHECK_URL = 'https://ofd.soliq.uz/check'

_cb = CircuitBreaker('ofd_uzkassa', fail_threshold=5, timeout=120)


class UzkassaOFD(BaseOFD):
    code = 'uzkassa'

    @property
    def base(self):
        return API_TEST if self.config.get('is_test') else API

    def _token(self):
        from django.core.cache import cache
        key = f"ofd:uzkassa:token:{self.config['terminal_id']}"
        tok = cache.get(key)
        if tok:
            return tok
        r = requests.post(f'{self.base}/auth/login', timeout=15, json={
            'login': self.config['login'], 'password': self.config['password']})
        r.raise_for_status()
        tok = r.json()['data']['token']
        cache.set(key, tok, 3000)      # ~50 daq
        return tok

    def _headers(self):
        return {'Authorization': f'Bearer {self._token()}',
                'Content-Type': 'application/json'}

    def send_receipt(self, receipt) -> FiscalResult:
        order = receipt.order
        vat = Decimal(self.config.get('vat_percent', 12))
        items = self.build_items(order, vat)

        payload = {
            'ReceiptId': str(receipt.id),
            'ReceiptType': 0 if receipt.receipt_type == 'sale' else 2,
            'IsRefund': 0 if receipt.receipt_type == 'sale' else 1,
            'ReceiptSeq': receipt.id,
            'Time': timezone.localtime().strftime('%Y%m%d%H%M%S'),
            'TerminalId': self.config['terminal_id'],
            'TIN': self.config['inn'],
            'Items': items,
            'ReceivedCash': int(receipt.cash_total * 100),
            'ReceivedCard': int(receipt.card_total * 100),
            'Location': {'Latitude': self.config.get('lat', 41.311081),
                         'Longitude': self.config.get('lon', 69.240562)},
        }
        receipt.payload = payload

        def _call():
            r = requests.post(f'{self.base}/receipt/create', json=payload,
                              headers=self._headers(), timeout=25)
            return r

        try:
            r = _cb.call(_call)
        except Exception as e:
            log.error(f'[uzkassa] tarmoq xatosi: {e}')
            return FiscalResult(ok=False, error=str(e), retryable=True)

        try:
            data = r.json()
        except Exception:
            return FiscalResult(ok=False, error=f'JSON emas: {r.text[:200]}',
                                retryable=True)

        if r.status_code == 200 and data.get('success'):
            d = data.get('data', {})
            fid = str(d.get('fiscalSign') or d.get('FiscalSign', ''))
            return FiscalResult(
                ok=True, fiscal_id=str(d.get('receiptId', receipt.id)),
                fiscal_sign=fid, seq=d.get('receiptSeq'),
                qr_url=d.get('qrCodeURL') or
                       f"{CHECK_URL}?t={self.config['terminal_id']}"
                       f"&r={d.get('receiptSeq', '')}&c={fid}"
                       f"&s={int(receipt.total * 100)}",
                raw=data)

        # ⚡ Qayta urinish mumkin emas — ma'lumot xatosi
        code = str(data.get('errorCode', ''))
        fatal = code in ('INVALID_SPIC', 'INVALID_TIN', 'DUPLICATE_RECEIPT',
                         'TERMINAL_NOT_FOUND')
        return FiscalResult(ok=False, raw=data, retryable=not fatal,
                            error=f"{code}: {data.get('message', r.text[:200])}")

    def cancel_receipt(self, receipt) -> FiscalResult:
        try:
            r = requests.post(f'{self.base}/receipt/cancel', timeout=25,
                              headers=self._headers(),
                              json={'ReceiptId': receipt.fiscal_id,
                                    'TerminalId': self.config['terminal_id']})
            data = r.json()
            if r.status_code == 200 and data.get('success'):
                return FiscalResult(ok=True, raw=data)
            return FiscalResult(ok=False, raw=data,
                                error=data.get('message', ''))
        except Exception as e:
            return FiscalResult(ok=False, error=str(e))
```

**Fayl:** `apps/fiscal/providers/__init__.py`
```python
from django.core.cache import cache
from core.exceptions import ServiceUnavailable

OFD_REGISTRY = {}


def register_ofd(cls):
    OFD_REGISTRY[cls.code] = cls
    return cls


def get_ofd(restaurant):
    from apps.fiscal.models import FiscalConfig
    cfg = FiscalConfig.objects.filter(restaurant=restaurant,
                                      is_active=True).first()
    if cfg is None:
        raise ServiceUnavailable({'reason': 'fiskal sozlanmagan'})
    cls = OFD_REGISTRY.get(cfg.ofd_provider)
    if cls is None:
        raise ServiceUnavailable({'ofd': cfg.ofd_provider})
    return cls({'inn': cfg.inn, 'terminal_id': cfg.terminal_id,
                'login': cfg.login, 'password': cfg.password,
                'vat_percent': cfg.vat_percent, 'is_test': cfg.is_test})


from apps.fiscal.providers.uzkassa import UzkassaOFD  # noqa: E402
from apps.fiscal.providers.epos import EposOFD        # noqa: E402
register_ofd(UzkassaOFD)
register_ofd(EposOFD)
```

✅ **Tekshirish:**
```bash
python manage.py shell -c "from apps.fiscal.providers import OFD_REGISTRY; print(sorted(OFD_REGISTRY))"
# ['epos', 'uzkassa']
```

---

## V-200 — OFD adapter: e-POS

**Fayl:** `apps/fiscal/providers/epos.py`
```python
import base64, hashlib, logging, requests
from decimal import Decimal
from django.utils import timezone
from apps.fiscal.providers.base import BaseOFD, FiscalResult
from core.resilience import CircuitBreaker

log = logging.getLogger('fiscal.epos')

API = 'https://epos.uzkassa.uz/api/v2'
API_TEST = 'https://sandbox.epos.uz/api/v2'

_cb = CircuitBreaker('ofd_epos', fail_threshold=5, timeout=120)


class EposOFD(BaseOFD):
    code = 'epos'

    @property
    def base(self):
        return API_TEST if self.config.get('is_test') else API

    def _headers(self):
        raw = f"{self.config['login']}:{self.config['password']}".encode()
        return {'Authorization': f'Basic {base64.b64encode(raw).decode()}',
                'Content-Type': 'application/json',
                'X-Terminal-Id': self.config['terminal_id']}

    def send_receipt(self, receipt) -> FiscalResult:
        order = receipt.order
        vat = Decimal(self.config.get('vat_percent', 12))
        items = self.build_items(order, vat)

        # e-POS o'z formatida — items nomlari boshqacha
        epos_items = [{
            'name': i['Name'],
            'spic': i['SPIC'],
            'packageCode': i['PackageCode'],
            'price': i['Price'],
            'count': i['Amount'] / 1000,
            'vatPercent': i['VATPercent'],
            'vatAmount': i['VAT'],
            'totalAmount': int(i['Price'] * i['Amount'] / 1000),
        } for i in items]

        payload = {
            'externalId': str(receipt.id),
            'operationType': 'SALE' if receipt.receipt_type == 'sale' else 'REFUND',
            'dateTime': timezone.localtime().isoformat(),
            'tin': self.config['inn'],
            'items': epos_items,
            'payment': {'cash': int(receipt.cash_total * 100),
                        'card': int(receipt.card_total * 100)},
            'totalAmount': int(receipt.total * 100),
        }
        receipt.payload = payload

        def _call():
            return requests.post(f'{self.base}/receipts', json=payload,
                                 headers=self._headers(), timeout=25)

        try:
            r = _cb.call(_call)
        except Exception as e:
            log.error(f'[epos] tarmoq: {e}')
            return FiscalResult(ok=False, error=str(e), retryable=True)

        try:
            data = r.json()
        except Exception:
            return FiscalResult(ok=False, error=f'JSON emas: {r.text[:200]}')

        if r.status_code in (200, 201) and data.get('status') == 'OK':
            d = data.get('receipt', {})
            return FiscalResult(
                ok=True, fiscal_id=str(d.get('id', receipt.id)),
                fiscal_sign=str(d.get('fiscalSign', '')),
                seq=d.get('sequence'), qr_url=d.get('qrUrl', ''), raw=data)

        code = str(data.get('errorCode', r.status_code))
        fatal = code in ('400', 'INVALID_SPIC', 'DUPLICATE')
        return FiscalResult(ok=False, raw=data, retryable=not fatal,
                            error=f"{code}: {data.get('message', r.text[:200])}")

    def cancel_receipt(self, receipt) -> FiscalResult:
        try:
            r = requests.delete(f'{self.base}/receipts/{receipt.fiscal_id}',
                                headers=self._headers(), timeout=25)
            if r.status_code in (200, 204):
                return FiscalResult(ok=True, raw={'deleted': True})
            return FiscalResult(ok=False, error=r.text[:200])
        except Exception as e:
            return FiscalResult(ok=False, error=str(e))
```

✅ **Tekshirish:** `pytest tests/test_fiscal_providers.py -q`

---

## V-201 — ⚡ Fiskal worker (retry 48 soat)

> ⚡ **Qonuniy talab:** chek MAJBURIY chiqishi kerak. OFD yiqilsa —
> 48 soat davomida eksponensial kechikish bilan qayta uriniladi,
> keyin `manual` holatga o'tadi va admin alert oladi.

**Fayl:** `apps/fiscal/tasks.py`
```python
import logging
from datetime import timedelta
from decimal import Decimal
from django.db import transaction
from django.utils import timezone

log = logging.getLogger('fiscal.tasks')

# Qayta urinish jadvali (daqiqa) — jami ~48 soat
RETRY_SCHEDULE = [1, 3, 10, 30, 60, 120, 240, 480, 720, 1440, 1440, 1440]
MAX_HOURS = 48


@transaction.atomic
def create_receipt(order_id: int):
    """
    `fiscal` navbat handler'i — buyurtma to'langanda chaqiriladi.
    ⚡ Idempotent: bir buyurtmaga bitta 'sale' chek.
    """
    from apps.orders.models import Order
    from apps.fiscal.models import FiscalReceipt, FiscalConfig
    from apps.payments.services import calc_order_total

    order = Order.objects.select_related('restaurant').get(id=order_id)
    exist = FiscalReceipt.objects.filter(
        order=order, receipt_type='sale',
        status__in=['queued', 'sending', 'sent', 'confirmed']).first()
    if exist:
        log.info(f'[fiscal] Order#{order_id} uchun chek bor (#{exist.id})')
        return exist.id

    cfg = FiscalConfig.objects.filter(restaurant=order.restaurant,
                                      is_active=True).first()
    if cfg is None:
        log.info(f'[fiscal] Restoran#{order.restaurant_id} fiskal yoqmagan')
        return None

    calc = calc_order_total(order)
    cash = sum((p.amount for p in order.payments.filter(status='paid',
                                                        provider='cash')),
               Decimal('0'))
    card = sum((p.amount for p in order.payments.filter(status='paid')
                .exclude(provider='cash')), Decimal('0'))
    vat_total = (calc['total'] * cfg.vat_percent /
                 (100 + cfg.vat_percent)).quantize(Decimal('0.01'))

    r = FiscalReceipt.objects.create(
        restaurant=order.restaurant, order=order,
        ofd_provider=cfg.ofd_provider, receipt_type='sale',
        total=calc['total'], vat_total=vat_total,
        cash_total=cash, card_total=card,
        status='queued', next_retry_at=timezone.now(),
        deadline_at=timezone.now() + timedelta(hours=MAX_HOURS))
    log.info(f'[fiscal] Chek#{r.id} navbatga qo\'yildi (Order#{order_id})')
    return r.id


def send_receipt(receipt_id: int) -> bool:
    """Bitta chekni OFD'ga yuborish (worker chaqiradi)"""
    from apps.fiscal.models import FiscalReceipt
    from apps.fiscal.providers import get_ofd
    from core.queue import enqueue

    with transaction.atomic():
        r = FiscalReceipt.objects.select_for_update().get(id=receipt_id)
        if r.status in ('confirmed', 'sent', 'cancelled'):
            return True
        r.status = 'sending'
        r.save(update_fields=['status'])

    try:
        ofd = get_ofd(r.restaurant)
        res = ofd.send_receipt(r)
    except Exception as e:
        log.exception(f'[fiscal] Chek#{r.id} yuborishda xato')
        res = type('X', (), {'ok': False, 'error': str(e), 'retryable': True,
                             'raw': {}, 'fiscal_id': '', 'fiscal_sign': '',
                             'qr_url': '', 'seq': None})()

    if res.ok:
        r.status = 'confirmed'
        r.fiscal_id = res.fiscal_id
        r.fiscal_sign = res.fiscal_sign
        r.qr_url = res.qr_url
        r.receipt_seq = res.seq
        r.response = res.raw
        r.sent_at = r.confirmed_at = timezone.now()
        r.error = ''
        r.save()
        log.info(f'[fiscal] ✅ Chek#{r.id} tasdiqlandi: {r.fiscal_sign}')
        enqueue('notify', 'send_digital_receipt', receipt_id=r.id)
        _broadcast(r, 'fiscal.confirmed')
        return True

    # --- xato ---
    r.retry_count += 1
    r.error = res.error
    r.response = res.raw

    expired = timezone.now() >= (r.deadline_at or timezone.now())
    if not res.retryable or expired:
        r.status = 'manual'
        r.next_retry_at = None
        r.save()
        log.error(f'[fiscal] ⛔ Chek#{r.id} QO\'LDA KERAK: {res.error}')
        _alert_manual(r)
        _broadcast(r, 'fiscal.failed')
        return False

    idx = min(r.retry_count - 1, len(RETRY_SCHEDULE) - 1)
    delay_min = RETRY_SCHEDULE[idx]
    r.status = 'queued'
    r.next_retry_at = timezone.now() + timedelta(minutes=delay_min)
    r.save()
    log.warning(f'[fiscal] Chek#{r.id} xato ({res.error}) — '
                f'{delay_min} daq keyin qayta ({r.retry_count}-urinish)')
    enqueue('fiscal', 'send_receipt', delay=delay_min * 60, receipt_id=r.id)
    return False


def cancel_receipt(order_id: int, payment_id: int = None):
    """To'lov qaytarilganda — chekni bekor qilish"""
    from apps.fiscal.models import FiscalReceipt
    from apps.fiscal.providers import get_ofd
    r = FiscalReceipt.objects.filter(order_id=order_id, receipt_type='sale',
                                     status='confirmed').first()
    if r is None:
        return False
    try:
        res = get_ofd(r.restaurant).cancel_receipt(r)
    except Exception as e:
        log.error(f'[fiscal] Chek#{r.id} bekor qilinmadi: {e}')
        return False
    if res.ok:
        r.status = 'cancelled'
        r.save(update_fields=['status', 'updated_at'])
        log.info(f'[fiscal] Chek#{r.id} bekor qilindi')
    return res.ok


def scan_pending():
    """
    Cron/healer (1 daqiqada) — vaqti kelgan cheklarni navbatga qaytaradi.
    ⚡ Redis job yo'qolsa ham chek YO'QOLMAYDI (DB haqiqat manbai).
    """
    from apps.fiscal.models import FiscalReceipt
    from core.queue import enqueue
    qs = FiscalReceipt.objects.filter(status='queued',
                                      next_retry_at__lte=timezone.now())
    n = 0
    for r in qs[:200]:
        enqueue('fiscal', 'send_receipt', receipt_id=r.id)
        n += 1
    if n:
        log.info(f'[fiscal] {n} ta chek navbatga qaytarildi')
    return n


def _alert_manual(receipt):
    from apps.notifications.services import send_telegram
    from django.conf import settings
    msg = (f"🚨 FISKAL CHEK QO'LDA KERAK\n"
           f"Restoran: {receipt.restaurant.name}\n"
           f"Buyurtma: #{receipt.order.number}\n"
           f"Summa: {receipt.total:,.0f} so'm\n"
           f"Xato: {receipt.error[:200]}")
    send_telegram(settings.ONCALL_CHAT_ID, msg)
    if receipt.restaurant.admin_chat_id:
        send_telegram(receipt.restaurant.admin_chat_id, msg)


def _broadcast(receipt, event):
    from core.ws import ws_send, g_cashier, g_admin
    data = {'receipt_id': receipt.id, 'order_id': receipt.order_id,
            'status': receipt.status, 'fiscal_sign': receipt.fiscal_sign,
            'qr_url': receipt.qr_url}
    ws_send(g_cashier(receipt.restaurant_id), event, data)
    ws_send(g_admin(receipt.restaurant_id), event, data)
```

**Fayl:** `apps/fiscal/handlers.py`
```python
"""`fiscal` navbat handler xaritasi — worker shu yerdan topadi."""
from apps.fiscal.tasks import create_receipt, send_receipt, cancel_receipt

HANDLERS = {
    'create_receipt': lambda p: create_receipt(p['order_id']),
    'send_receipt':   lambda p: send_receipt(p['receipt_id']),
    'cancel_receipt': lambda p: cancel_receipt(p['order_id'],
                                               p.get('payment_id')),
}
```

`create_receipt` tugagach darhol yuborish uchun `apps/fiscal/tasks.py` oxirida:
```python
def create_and_send(order_id):
    rid = create_receipt(order_id)
    if rid:
        send_receipt(rid)
    return rid
```
va `HANDLERS['create_receipt'] = lambda p: create_and_send(p['order_id'])`

**Cron:**
```bash
* * * * * armenu cd /home/armenu/app && venv/bin/python manage.py shell -c "from apps.fiscal.tasks import scan_pending; scan_pending()" >> /var/log/armenu/fiscal.log 2>&1
```

✅ **Test:**
```python
@pytest.mark.django_db
def test_fiscal_retry_then_manual(monkeypatch, receipt_queued):
    from apps.fiscal import tasks
    from apps.fiscal.providers.base import FiscalResult
    monkeypatch.setattr('apps.fiscal.providers.get_ofd',
                        lambda r: type('O', (), {'send_receipt':
                        lambda s, rec: FiscalResult(ok=False, error='OFD down',
                                                    retryable=True)})())
    tasks.send_receipt(receipt_queued.id)
    receipt_queued.refresh_from_db()
    assert receipt_queued.status == 'queued'
    assert receipt_queued.retry_count == 1
    assert receipt_queued.next_retry_at is not None
```

---

## V-202 — IKPU tekshiruvi (tasnif.soliq.uz)

> ⚠️ **2026-04-01 dan majburiy:** har taomda to'g'ri IKPU (MXIK) kodi bo'lishi shart.
> Noto'g'ri kod → OFD chekni rad etadi → qonun buzilishi.

**Fayl:** `apps/fiscal/services/ikpu.py`
```python
import logging, re, requests
from django.core.cache import cache
from core.resilience import CircuitBreaker, retry

log = logging.getLogger('fiscal.ikpu')

TASNIF_API = 'https://tasnif.soliq.uz/api/cls-api'
IKPU_RE = re.compile(r'^\d{17}$')
CACHE_TTL = 7 * 24 * 3600

_cb = CircuitBreaker('tasnif_soliq', fail_threshold=4, timeout=300)


class IkpuInvalid(Exception):
    pass


def is_valid_format(code: str) -> bool:
    """⚡ IKPU = aynan 17 raqam"""
    return bool(code and IKPU_RE.match(str(code).strip()))


@retry(times=3, delay=1, exceptions=(requests.RequestException,))
def _fetch(code: str) -> dict:
    r = requests.get(f'{TASNIF_API}/mxik/get/{code}', timeout=12,
                     headers={'Accept': 'application/json'})
    r.raise_for_status()
    return r.json()


def verify_ikpu(code: str) -> dict:
    """
    tasnif.soliq.uz dan kodni tekshiradi.
    Qaytaradi: {'valid': bool, 'name': str, 'packages': [...], 'source': str}
    ⚡ Soliq API yiqilsa — format tekshiruvi bilan cheklanadi (degradation).
    """
    code = str(code or '').strip()
    if not is_valid_format(code):
        return {'valid': False, 'error': 'IKPU 17 xonali raqam bo\'lishi kerak',
                'source': 'format'}

    key = f'ikpu:{code}'
    cached = cache.get(key)
    if cached is not None:
        return cached

    def _fallback():
        log.warning(f'[ikpu] tasnif.soliq.uz javob bermadi — format bo\'yicha qabul')
        return {'valid': True, 'name': '', 'packages': [],
                'source': 'format_only', 'warning': 'Soliq API tekshirmadi'}

    try:
        data = _cb.call(_fetch, code, fallback=_fallback)
    except Exception as e:
        log.warning(f'[ikpu] xato: {e}')
        return _fallback()

    if data.get('source') == 'format_only':
        return data

    payload = data.get('data') or {}
    if not payload or not payload.get('mxikCode'):
        result = {'valid': False, 'error': 'Bunday IKPU kodi topilmadi',
                  'source': 'tasnif'}
    else:
        result = {
            'valid': True,
            'code': payload.get('mxikCode'),
            'name': payload.get('mxikName') or payload.get('groupName', ''),
            'packages': [{'code': p.get('code'), 'name': p.get('nameUz')}
                         for p in (payload.get('packageNames') or [])],
            'source': 'tasnif',
        }
        cache.set(key, result, CACHE_TTL)
    return result


def search_ikpu(query: str, limit: int = 20) -> list:
    """Admin uchun: nom bo'yicha IKPU qidirish"""
    try:
        r = requests.get(f'{TASNIF_API}/mxik/search/', timeout=12,
                         params={'search': query, 'size': limit, 'lang': 'uz'})
        r.raise_for_status()
        rows = r.json().get('data', {}).get('content', [])
        return [{'code': x.get('mxikCode'), 'name': x.get('mxikName'),
                 'packages': [{'code': p.get('code'), 'name': p.get('nameUz')}
                              for p in (x.get('packageNames') or [])]}
                for x in rows]
    except Exception as e:
        log.warning(f'[ikpu] qidiruv xato: {e}')
        return []


def validate_menu(restaurant) -> dict:
    """
    ⚡ Fiskal yoqishdan OLDIN butun menyuni tekshiradi.
    Bitta taom noto'g'ri bo'lsa — fiskal yoqilmaydi.
    """
    from apps.menu.models import Dish
    bad, ok = [], 0
    for d in Dish.objects.filter(restaurant=restaurant, is_active=True):
        res = verify_ikpu(d.ikpu_code)
        if res['valid']:
            ok += 1
        else:
            bad.append({'dish_id': d.id, 'name': d.name_uz,
                        'ikpu': d.ikpu_code, 'error': res.get('error')})
    return {'total': ok + len(bad), 'ok': ok, 'invalid': bad,
            'ready': len(bad) == 0}
```

**Fayl:** `apps/fiscal/views.py`
```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.fiscal.services.ikpu import verify_ikpu, search_ikpu, validate_menu


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ikpu_verify_view(request):
    """GET /v1/admin/ikpu/verify/?code=10112001001000000"""
    return Response(verify_ikpu(request.GET.get('code', '')))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ikpu_search_view(request):
    """GET /v1/admin/ikpu/search/?q=osh"""
    return Response({'results': search_ikpu(request.GET.get('q', ''))})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fiscal_readiness_view(request):
    """GET /v1/admin/fiscal/readiness/ — fiskalga tayyormi?"""
    return Response(validate_menu(request.restaurant))
```

**Fayl:** `apps/menu/validators.py` (V-051 kengaytmasi)
```python
from django.core.exceptions import ValidationError
from apps.fiscal.services.ikpu import is_valid_format


def validate_ikpu(value):
    if value and not is_valid_format(value):
        raise ValidationError("IKPU kodi 17 xonali raqam bo'lishi kerak")
```

✅ **Tekshirish:**
```bash
python manage.py shell -c "
from apps.fiscal.services.ikpu import is_valid_format
print(is_valid_format('10112001001000000'), is_valid_format('123'))"
# True False
```

---

## V-203 — Raqamli chek (QR + Telegram yuborish)

**Fayl:** `apps/fiscal/services/receipt.py`
```python
import base64, io, logging
import qrcode
from django.template.loader import render_to_string
from django.utils import timezone

log = logging.getLogger('fiscal.receipt')


def receipt_qr_png(receipt) -> bytes:
    """Fiskal QR (soliq tekshiruv havolasi) → PNG bayt"""
    url = receipt.qr_url or ''
    if not url:
        return b''
    img = qrcode.make(url, box_size=8, border=2)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


def receipt_qr_data_uri(receipt) -> str:
    png = receipt_qr_png(receipt)
    if not png:
        return ''
    return 'data:image/png;base64,' + base64.b64encode(png).decode()


def receipt_context(receipt) -> dict:
    order = receipt.order
    return {
        'receipt': receipt,
        'restaurant': receipt.restaurant,
        'order': order,
        'items': [{'name': i.dish.name_uz, 'qty': i.qty, 'price': i.price,
                   'sum': i.price * i.qty}
                  for i in order.items.select_related('dish')],
        'qr': receipt_qr_data_uri(receipt),
        'printed_at': timezone.localtime(),
    }


def receipt_html(receipt) -> str:
    """Mijozga ko'rsatiladigan chek (M-10 [7] bosqichi)"""
    return render_to_string('fiscal/receipt.html', receipt_context(receipt))


def receipt_text(receipt) -> str:
    """Telegram uchun matn"""
    lines = [f"🧾 <b>{receipt.restaurant.name}</b>",
             f"Buyurtma #{receipt.order.number}",
             f"{timezone.localtime(receipt.confirmed_at or receipt.created_at):%d.%m.%Y %H:%M}",
             '─' * 24]
    for i in receipt.order.items.select_related('dish'):
        lines.append(f"{i.dish.name_uz} × {i.qty} — {i.price * i.qty:,.0f}")
    lines += ['─' * 24,
              f"JAMI: <b>{receipt.total:,.0f} so'm</b>",
              f"QQS ({receipt.vat_total and 12 or 0}%): {receipt.vat_total:,.0f}",
              '',
              f"Fiskal belgi: <code>{receipt.fiscal_sign}</code>"]
    if receipt.qr_url:
        lines.append(f"Tekshirish: {receipt.qr_url}")
    return '\n'.join(lines)


def send_digital_receipt(receipt_id: int) -> bool:
    """
    `notify` navbat handler'i — chek tasdiqlangach mijozga yuboriladi.
    """
    from apps.fiscal.models import FiscalReceipt
    from apps.notifications.services import send_telegram, send_telegram_photo

    r = FiscalReceipt.objects.select_related('order', 'restaurant').get(id=receipt_id)
    if r.sent_to_telegram or r.status != 'confirmed':
        return False

    guest = r.order.guest
    if not guest or not guest.tg_user_id:
        log.info(f'[receipt] Chek#{r.id} — mijoz Telegram\'i yo\'q')
        return False

    png = receipt_qr_png(r)
    if png:
        send_telegram_photo(guest.tg_user_id, png, caption=receipt_text(r))
    else:
        send_telegram(guest.tg_user_id, receipt_text(r))

    r.sent_to_telegram = True
    r.save(update_fields=['sent_to_telegram', 'updated_at'])
    log.info(f'[receipt] 📤 Chek#{r.id} Telegram\'ga yuborildi')
    return True
```

**Fayl:** `templates/fiscal/receipt.html`
```html
{% load i18n humanize %}
<div class="receipt" style="max-width:380px;margin:0 auto;font-family:monospace;
     background:var(--bg,#fff);color:var(--fg,#111);padding:16px;border-radius:12px">
  <h3 style="text-align:center;margin:0 0 4px">{{ restaurant.name }}</h3>
  <div style="text-align:center;font-size:12px;opacity:.7">
    {% trans "STIR" %}: {{ restaurant.inn }}<br>
    {% trans "Buyurtma" %} #{{ order.number }} · {{ printed_at|date:"d.m.Y H:i" }}
  </div>
  <hr style="border:none;border-top:1px dashed currentColor;margin:10px 0">
  <table style="width:100%;font-size:13px">
    {% for i in items %}
    <tr>
      <td>{{ i.name }}</td>
      <td style="text-align:right;white-space:nowrap">{{ i.qty }} × {{ i.price|intcomma }}</td>
      <td style="text-align:right;white-space:nowrap">{{ i.sum|intcomma }}</td>
    </tr>
    {% endfor %}
  </table>
  <hr style="border:none;border-top:1px dashed currentColor;margin:10px 0">
  <table style="width:100%;font-size:14px">
    <tr><td>{% trans "QQS" %}</td>
        <td style="text-align:right">{{ receipt.vat_total|intcomma }}</td></tr>
    <tr style="font-weight:700;font-size:16px">
        <td>{% trans "JAMI" %}</td>
        <td style="text-align:right">{{ receipt.total|intcomma }} {% trans "so'm" %}</td></tr>
  </table>
  {% if qr %}
  <div style="text-align:center;margin-top:14px">
    <img src="{{ qr }}" alt="QR" style="width:150px;height:150px">
    <div style="font-size:11px;opacity:.7;margin-top:6px">
      {% trans "Fiskal belgi" %}: {{ receipt.fiscal_sign }}
    </div>
  </div>
  {% endif %}
</div>
```

**Fayl:** `apps/notifications/services.py` (qo'shimcha)
```python
def send_telegram_photo(chat_id, png_bytes: bytes, caption: str = ''):
    import requests
    from django.conf import settings
    try:
        requests.post(
            f'https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendPhoto',
            data={'chat_id': chat_id, 'caption': caption[:1024],
                  'parse_mode': 'HTML'},
            files={'photo': ('receipt.png', png_bytes, 'image/png')},
            timeout=15)
        return True
    except Exception as e:
        import logging
        logging.getLogger('notify').warning(f'[tg] photo xato: {e}')
        return False
```

`apps/notifications/handlers/__init__.py` ga:
```python
from apps.fiscal.services.receipt import send_digital_receipt
from apps.notifications.handlers.tip import handle_tip_received

HANDLERS = {
    'send_digital_receipt': lambda p: send_digital_receipt(p['receipt_id']),
    'tip_received': handle_tip_received,
}
```

`requirements.txt` ga: `qrcode[pil]`

✅ **Tekshirish:**
```bash
python manage.py shell -c "
from apps.fiscal.services.receipt import receipt_qr_data_uri
from apps.fiscal.models import FiscalReceipt
r = FiscalReceipt.objects.first()
print(receipt_qr_data_uri(r)[:40] if r else 'chek yo\'q')"
```

---

## V-204 — Test: to'lov + fiskal

**Fayl:** `tests/conftest.py` (qo'shimcha fixture'lar)
```python
import pytest
from decimal import Decimal


@pytest.fixture
def payment_config(db, restaurant):
    from apps.payments.models_config import RestaurantPaymentConfig
    rows = []
    for prov in ('payme', 'click', 'uzum'):
        c = RestaurantPaymentConfig(restaurant=restaurant, provider=prov,
                                    merchant_id=f'M-{prov}', is_test=True,
                                    extra={'service_id': '1',
                                           'merchant_user_id': '1'})
        c.secret = 'TEST_SECRET'
        c.save()
        rows.append(c)
    return rows


@pytest.fixture
def order_with_items(db, restaurant):
    from apps.orders.models import Order, OrderItem
    from apps.menu.models import Category, Dish
    cat = Category.objects.create(restaurant=restaurant, name_uz='Asosiy')
    dish = Dish.objects.create(restaurant=restaurant, category=cat,
                               name_uz='Osh', price=Decimal('45000'),
                               ikpu_code='10112001001000000', is_active=True)
    o = Order.objects.create(restaurant=restaurant, number='T-1', status='served')
    OrderItem.objects.create(order=o, dish=dish, qty=2, price=dish.price)
    return o


@pytest.fixture
def payment_pending(db, order_with_items, payment_config):
    from apps.payments.models import Payment
    from apps.payments.services import calc_order_total
    return Payment.objects.create(
        restaurant=order_with_items.restaurant, order=order_with_items,
        provider='payme', amount=calc_order_total(order_with_items)['total'],
        status='created')


@pytest.fixture
def fiscal_config(db, restaurant):
    from apps.fiscal.models import FiscalConfig
    c = FiscalConfig(restaurant=restaurant, ofd_provider='uzkassa',
                     inn='123456789', terminal_id='TRM-1', login='u',
                     is_test=True, is_active=True)
    c.password = 'p'
    c.save()
    return c
```

**Fayl:** `tests/test_payments.py`
```python
import base64, json, pytest
from decimal import Decimal


# ---------- 1. Summa serverda ----------
@pytest.mark.django_db
def test_price_calculated_on_server_only(api_client, order_with_items,
                                         payment_config, restaurant):
    """⚡ Frontend yuborgan `amount` E'TIBORGA OLINMAYDI"""
    from apps.payments.models import Payment
    from apps.payments.services import calc_order_total
    r = api_client.post('/v1/payments/', {
        'order_id': order_with_items.id, 'provider': 'payme',
        'amount': '1.00',                      # yolg'on summa
    }, HTTP_HOST=f'{restaurant.slug}.localhost', format='json')
    assert r.status_code == 201
    p = Payment.objects.get(id=r.json()['id'])
    assert p.amount == calc_order_total(order_with_items)['total']
    assert p.amount != Decimal('1.00')


# ---------- 2. Idempotency ----------
@pytest.mark.django_db(transaction=True)
def test_double_perform_pays_once(payment_pending):
    from apps.payments.services import mark_paid
    mark_paid(payment_pending, ext_id='tx-1')
    mark_paid(payment_pending, ext_id='tx-1')
    order = payment_pending.order
    assert order.payments.filter(status='paid').count() == 1
    order.refresh_from_db()
    assert order.status == 'paid'


# ---------- 3. Webhook imzosi ----------
@pytest.mark.django_db
def test_payme_bad_auth(api_client, payment_pending):
    body = {'id': 1, 'method': 'CheckPerformTransaction',
            'params': {'account': {'payment_id': payment_pending.id},
                       'amount': payment_pending.amount_tiyin}}
    r = api_client.post('/v1/payments/webhook/payme/', data=json.dumps(body),
                        content_type='application/json',
                        HTTP_AUTHORIZATION='Basic ' +
                        base64.b64encode(b'Paycom:WRONG').decode())
    assert r.json()['error']['code'] == -32504


@pytest.mark.django_db
def test_payme_good_auth_allows(api_client, payment_pending):
    body = {'id': 1, 'method': 'CheckPerformTransaction',
            'params': {'account': {'payment_id': payment_pending.id},
                       'amount': payment_pending.amount_tiyin}}
    r = api_client.post('/v1/payments/webhook/payme/', data=json.dumps(body),
                        content_type='application/json',
                        HTTP_AUTHORIZATION='Basic ' +
                        base64.b64encode(b'Paycom:TEST_SECRET').decode())
    assert r.json()['result']['allow'] is True


# ---------- 4. Summa mos kelmasa ----------
@pytest.mark.django_db
def test_payme_wrong_amount(api_client, payment_pending):
    body = {'id': 1, 'method': 'CheckPerformTransaction',
            'params': {'account': {'payment_id': payment_pending.id},
                       'amount': 1}}
    r = api_client.post('/v1/payments/webhook/payme/', data=json.dumps(body),
                        content_type='application/json',
                        HTTP_AUTHORIZATION='Basic ' +
                        base64.b64encode(b'Paycom:TEST_SECRET').decode())
    assert r.json()['error']['code'] == -31001


# ---------- 5. Click imzosi ----------
@pytest.mark.django_db
def test_click_prepare_ok(api_client, payment_pending):
    import hashlib
    payment_pending.provider = 'click'
    payment_pending.save()
    d = {'click_trans_id': '99', 'service_id': '1',
         'merchant_trans_id': str(payment_pending.id),
         'amount': f'{payment_pending.amount:.2f}', 'action': '0',
         'sign_time': '2026-09-04 10:00:00'}
    raw = (d['click_trans_id'] + d['service_id'] + 'TEST_SECRET' +
           d['merchant_trans_id'] + d['amount'] + d['action'] + d['sign_time'])
    d['sign_string'] = hashlib.md5(raw.encode()).hexdigest()
    r = api_client.post('/v1/payments/webhook/click/', data=d)
    assert r.json()['error'] == 0


# ---------- 6. Split ----------
@pytest.mark.django_db
def test_split_no_tiyin_lost(order_with_items):
    from apps.payments.services import split_amount, calc_order_total
    total = calc_order_total(order_with_items)['total']
    for n in (2, 3, 7):
        s = sum(split_amount(order_with_items, n, i) for i in range(1, n + 1))
        assert s == total, f'{n} ga bo\'linganda yig\'indi mos emas'


# ---------- 7. Tip ----------
@pytest.mark.django_db(transaction=True)
def test_tip_credits_staff(order_with_items, payment_config, waiter):
    from apps.payments.services import create_tip, mark_paid
    tip, payment = create_tip(order_with_items, waiter, 'payme', percent=10)
    assert tip.amount > 0
    mark_paid(payment, ext_id='tx-tip')
    waiter.refresh_from_db()
    tip.refresh_from_db()
    assert tip.is_paid
    assert waiter.tips_balance == tip.amount


# ---------- 8. Cross-tenant ----------
@pytest.mark.django_db
def test_cannot_pay_other_restaurant_order(api_client, order_with_items,
                                           restaurant2):
    r = api_client.post('/v1/payments/', {
        'order_id': order_with_items.id, 'provider': 'payme'},
        HTTP_HOST=f'{restaurant2.slug}.localhost', format='json')
    assert r.status_code in (403, 404)


# ---------- 9. PCI DSS ----------
@pytest.mark.django_db
def test_no_card_fields_in_models():
    """⚡ Karta ma'lumoti saqlanadigan maydon BO'LMASLIGI kerak"""
    from apps.payments.models import Payment, Tip, PaymentEvent
    banned = ('card_number', 'pan', 'cvv', 'cvc', 'expiry', 'card_holder')
    for model in (Payment, Tip, PaymentEvent):
        names = {f.name.lower() for f in model._meta.get_fields()}
        assert not (names & set(banned)), f'{model.__name__} da karta maydoni bor!'
```

**Fayl:** `tests/test_fiscal.py`
```python
import pytest
from decimal import Decimal


@pytest.mark.django_db
def test_receipt_created_once(order_with_items, fiscal_config):
    from apps.fiscal.tasks import create_receipt
    from apps.fiscal.models import FiscalReceipt
    order_with_items.status = 'paid'
    order_with_items.save()
    id1 = create_receipt(order_with_items.id)
    id2 = create_receipt(order_with_items.id)      # ⚡ idempotent
    assert id1 == id2
    assert FiscalReceipt.objects.filter(order=order_with_items).count() == 1


@pytest.mark.django_db
def test_fatal_error_goes_manual(monkeypatch, order_with_items, fiscal_config):
    from apps.fiscal import tasks
    from apps.fiscal.providers.base import FiscalResult
    from apps.fiscal.models import FiscalReceipt
    order_with_items.status = 'paid'; order_with_items.save()
    rid = tasks.create_receipt(order_with_items.id)

    class FakeOFD:
        def send_receipt(self, r):
            return FiscalResult(ok=False, error='INVALID_SPIC',
                                retryable=False)
    monkeypatch.setattr('apps.fiscal.providers.get_ofd', lambda r: FakeOFD())
    tasks.send_receipt(rid)
    assert FiscalReceipt.objects.get(id=rid).status == 'manual'


@pytest.mark.django_db
def test_ikpu_format():
    from apps.fiscal.services.ikpu import is_valid_format
    assert is_valid_format('10112001001000000')
    assert not is_valid_format('1011200100100000')     # 16 ta
    assert not is_valid_format('1011200100100000A')
    assert not is_valid_format('')


@pytest.mark.django_db
def test_receipt_items_have_ikpu(order_with_items, fiscal_config):
    from apps.fiscal.providers.uzkassa import UzkassaOFD
    ofd = UzkassaOFD({'inn': '1', 'terminal_id': 'T', 'vat_percent': 12})
    items = ofd.build_items(order_with_items, Decimal('12'))
    assert all(len(i['SPIC']) == 17 for i in items)
    assert all(i['VATPercent'] == 12 for i in items)
```

✅ **Tekshirish:**
```bash
pytest tests/test_payments.py tests/test_fiscal.py -v
pytest tests/test_payment_idempotency.py -v      # ⚡ CI'da majburiy
pytest --cov=apps.payments --cov=apps.fiscal --cov-fail-under=90
```

---

# ✅ FAZA 10 QABULI

Keyingi fazaga o'tishdan oldin hammasi ✅ bo'lishi kerak:

```
[ ] python manage.py check                        → xato yo'q
[ ] python manage.py migrate                      → o'tadi
[ ] pytest tests/test_payments.py -v              → 9/9 o'tadi
[ ] pytest tests/test_fiscal.py -v                → 4/4 o'tadi
[ ] pytest tests/test_payment_idempotency.py      → o'tadi (⚡ CI majburiy)
[ ] pytest --cov=apps.payments --cov=apps.fiscal --cov-fail-under=90
[ ] Payme sandbox: CheckPerform → Create → Perform → Cancel to'liq o'tdi
[ ] Click sandbox: Prepare (action=0) → Complete (action=1) o'tdi
[ ] Uzum sandbox: invoice → webhook → paid o'tdi
[ ] ⚡ Noto'g'ri imzo bilan webhook → 401/-32504/-1 (3 provayder ham)
[ ] ⚡ Bir webhook 2 marta → summa 1 marta hisoblandi
[ ] ⚡ Frontenddan yolg'on `amount` → e'tiborga olinmadi
[ ] ⚡ Modellarda karta maydoni YO'Q (PCI DSS testi o'tdi)
[ ] Split bill: 2/3/7 ga bo'linganda tiyin yo'qolmadi
[ ] Choychaqa: Staff.tips_balance oshdi + Telegram push keldi
[ ] OFD sandbox: chek yuborildi, fiskal belgi + QR keldi
[ ] OFD xato → 48 soat retry jadvali ishladi → manual + alert
[ ] IKPU: tasnif.soliq.uz tekshiruvi ishladi (kesh 7 kun)
[ ] Raqamli chek Telegram'ga QR bilan yetib keldi
[ ] reconcile_payments cron ishga tushdi, farq topilmadi
[ ] git log --oneline | wc -l  → 204 ta commit
```

**Yakuniy:**
```bash
git add -A && git commit -m "FAZA 10 tugadi: to'lov (Payme/Click/Uzum) + fiskal (OFD/IKPU)"
python3 ROADMAP/03_HOLAT/update_progress.py V-204 ok "FAZA 10 tugadi"
```

**➡️ Keyingi:** `FAZA_11_SODIQLIK.md`
