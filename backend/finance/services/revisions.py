"""
Moliya yozuvlarini QO'LDA tahrirlash (TZ_MULTITENANT Bosqich 5): majburiy sabab + to'liq o'zgarish tarixi.

Qoidalar:
  1. Faqat QO'LDA kiritilgan kassa operatsiyasi tahrirlanadi. Buyurtma to'lovidan avtomatik yaratilgan kirim (`order` bor) va qarz
     to'lovi (`debt` bor) manbasida o'zgartiriladi (409 `source_locked`); storno qilingan yozuv tahrirlanmaydi (409 `cancelled`).
  2. Qarz (nasiya): summa, muddat, izoh, shaxs, telefon (va to'lov hali yo'q bo'lsa turi) tahrirlanadi; umumiy summa to'langan
     summadan kichik bo'lmaydi. To'langan summa va holatni to'lov/storno boshqaradi, qo'lda emas.
  3. Har tahrir `reason` (5-300 belgi) bilan bitta o'zgarmas `FinanceRevision` qatori qo'shadi: kim, qachon, nima eski -> yangi.
  4. Hammasi bitta tranzaksiyada va yozuv qatori qulfi (`select_for_update`) ostida: ikki parallel tahrirdan ikkinchisi birinchisining
     natijasini ko'rib hisoblaydi (eski qiymat haqiqiy), tahrirlar tartibi (`revision_no`) noyob.
  5. Hisobotlar (`summary`, kassa qoldig'i) joriy qatorlardan yig'iladi, shuning uchun yangi qiymatni ko'rsatadi.
     Tarix ham, audit logi ham (`log_audit`) shu tranzaksiyada yoziladi: audit yozilmasa, tahrir ham saqlanmaydi.
"""
from datetime import date
from decimal import Decimal

from django.db import transaction
from django.db.models import Count, IntegerField, Max, OuterRef, Subquery
from django.db.models.functions import Coalesce
from rest_framework.exceptions import APIException, NotFound

from backend.api_input import InputError, parse_choice, parse_date, parse_decimal, parse_id, parse_int, parse_text
from finance.models import DebtRecord, FinanceCategory, FinanceRevision, FinanceTransaction
from orders.audit import log_audit
from orders.timeutils import local_today

MAX_AMOUNT = Decimal('999999999999.99')  # DecimalField(max_digits=14, decimal_places=2) chegarasi (~1 trln so'm)
MIN_AMOUNT = Decimal('0.01')

REASON_MIN = 5
REASON_MAX = 300
# ESKIRGAN belgi: egasi qarori (Bosqich 5) bo'yicha eski /seller/finance/ paneli ham endi MAJBURIY sabab so'raydi, shuning uchun yangi
# yozuvlarda bu matn yozilmaydi. Faqat qaror qabul qilinishidan oldin yozilgan tarix qatorlarida uchraydi (o'zgarmas jadval),
# va eski testlar/importlar uzilmasligi uchun nomi saqlab qolindi.
LEGACY_PANEL_REASON = "Eski panel orqali o'zgartirildi (sabab so'ralmagan)"
EARLIEST_TX_DATE = date(2000, 1, 1)          # undan oldingi sana — shubhasiz xato

TX_FIELDS = ('amount', 'category', 'title', 'notes', 'tx_date', 'payment_method')
DEBT_FIELDS = ('person_name', 'phone', 'debt_type', 'amount', 'due_date', 'notes', 'status')

# Qo'lda o'zgartirib bo'lmaydigan maydonlar: yuborilsa jimgina e'tiborsiz qoldirilmaydi, 400 qaytadi (mass-assignment himoyasi)
_TX_FORBIDDEN = ('id', 'shop', 'shop_id', 'stage', 'is_cancelled', 'cancel_reason', 'cancelled_by', 'cancelled_at', 'order',
                 'order_id', 'debt', 'debt_id', 'created_by', 'created_at')
_DEBT_FORBIDDEN = ('id', 'shop', 'shop_id', 'paid_amount', 'status', 'is_deleted', 'deleted_at', 'created_at', 'updated_at')

_METHODS = tuple(code for code, _ in FinanceTransaction.PAYMENT_CHOICES)


class FinanceEditError(APIException):
    """Tahrirni rad etish: `{'error': xabar, 'code': kod, 'field'?: maydon}` va HTTP holati (409 - qulf/eskirgan, 400 - tekshiruv)."""
    default_code = 'finance_edit_error'

    def __init__(self, message, code, status_code=400, field=None, **extra):
        detail = {'error': message, 'code': code}
        if field:
            detail['field'] = field
        detail.update(extra)
        super().__init__(detail)
        self.status_code = status_code


# ─── Yordamchilar ─────────────────────────────────────────────────────────────────────────────────
def money_str(value):
    """Summa tarixda aniq saqlanadi: Decimal satr ("150000.00"), float emas."""
    return format(Decimal(value).quantize(Decimal('0.01')), 'f')


def _first(data, *names):
    """(kalit, qiymat) — birinchi uchragan nom (asosiy nom, keyin taxalluslar); yo'q bo'lsa (None, None)."""
    for name in names:
        if name in data:
            return name, data[name]
    return None, None


def _reject_forbidden(data, names):
    for name in names:
        if name in data:
            raise FinanceEditError("Bu maydonni qo'lda o'zgartirib bo'lmaydi", 'forbidden_field', 400, field=name)


def clean_reason(raw):
    """Sabab: matn, 5..300 belgi (bo'sh joylarsiz chetlari). Aks holda 400 `field='reason'`."""
    if raw is None or isinstance(raw, bool) or not isinstance(raw, (str, int, float)):
        raise FinanceEditError("Sababni yozing (kamida 5 belgi)", 'reason_required', 400, field='reason')
    text = str(raw).replace('\x00', '').strip()
    if len(text) < REASON_MIN:
        raise FinanceEditError("Sababni yozing (kamida 5 belgi)", 'reason_required', 400, field='reason')
    if len(text) > REASON_MAX:
        raise FinanceEditError("Sabab 300 belgidan oshmasligi kerak", 'reason_too_long', 400, field='reason')
    return text


def _parse_expected(data):
    """Ixtiyoriy `expected_revision`: mijoz ko'rgan tahrirlar soni (eskirgan oynada saqlashni ushlash uchun)."""
    if 'expected_revision' not in data or data['expected_revision'] in (None, ''):
        return None
    return parse_int(data['expected_revision'], 'expected_revision', minimum=0)


def revision_count_subquery(target_type):
    """Ro'yxat so'rovi uchun `revisions_count` annotatsiyasi (qo'shimcha so'rovsiz, N+1 yo'q)."""
    counts = (FinanceRevision.objects
              .filter(target_type=target_type, target_id=OuterRef('pk'))
              .order_by().values('target_id').annotate(c=Count('pk')).values('c'))
    return Coalesce(Subquery(counts, output_field=IntegerField()), 0)


def revision_count(target_type, target_id):
    return FinanceRevision.objects.filter(target_type=target_type, target_id=target_id).count()


def _actor_name(actor):
    full = (actor.get_full_name() or '').strip() if hasattr(actor, 'get_full_name') else ''
    return full or actor.get_username()


def api_value(value):
    """
    Tarix qiymati API'da satr yoki null bo'lishi kerak (/ra/ klienti shunday kutadi). Eski panel `hidden`/`cancelled` kabi mantiqiy
    (bool) qiymatlarni saqlaydi: ular API'da 'true'/'false' satr bo'lib chiqadi (bazadagi o'zgarmas qator o'zgarmaydi).
    """
    if isinstance(value, bool):
        return 'true' if value else 'false'
    return value


def api_changes(changes):
    return {field: {key: api_value(val) for key, val in change.items()} for field, change in changes.items()}


def serialize_revision(rev):
    return {
        'id': rev.id,
        'revision_no': rev.revision_no,
        'changed_at': rev.created_at.isoformat(),
        'changed_by': {'id': rev.changed_by_id, 'name': rev.changed_by_name, 'role': rev.changed_by_role},
        'reason': rev.reason,
        'changes': api_changes(rev.changes),
    }


def original_values(current, revisions):
    """Asl qiymatlar: joriy holatdan boshlab, tahrirlarni eng yangisidan eng eskisigacha orqaga qaytarib chiqiladi."""
    original = dict(current)
    for rev in revisions:                                     # eng yangisi birinchi
        for field, change in rev.changes.items():
            original[field] = change.get('old')
    return original


def history_payload(shop, target_type, target_id, current):
    revisions = list(FinanceRevision.objects.filter(shop=shop, target_type=target_type, target_id=target_id)
                     .order_by('-revision_no'))
    return {
        'target': {'type': target_type, 'id': target_id},
        'count': len(revisions),
        'results': [serialize_revision(r) for r in revisions],
        'original': {key: api_value(val) for key, val in original_values(current, revisions).items()},
    }


def _write_revision(*, shop, target_type, target_id, changes, reason, actor):
    last = FinanceRevision.objects.filter(target_type=target_type, target_id=target_id).aggregate(m=Max('revision_no'))['m'] or 0
    return FinanceRevision.objects.create(
        shop=shop, target_type=target_type, target_id=target_id, revision_no=last + 1,
        changed_by=actor if getattr(actor, 'pk', None) else None,
        changed_by_name=_actor_name(actor)[:200], changed_by_role=getattr(actor, 'role', '')[:50],
        reason=reason, changes=changes,
    )


def _audit(action, request, actor, target_type, target_id, changes, reason, revision, extra=None):
    log_audit(
        action, request=request, actor=actor, target_type=target_type, target_id=target_id,
        old_value={k: v.get('old') for k, v in changes.items()},
        new_value={k: v.get('new') for k, v in changes.items()},
        metadata={'reason': reason, 'revision_id': revision.id, 'revision_no': revision.revision_no, **(extra or {})},
    )


def diff_snapshots(before, after):
    """{maydon: {'old': eski, 'new': yangi}} — faqat qiymati haqiqatan o'zgargan maydonlar."""
    return {key: {'old': before.get(key), 'new': value} for key, value in after.items() if before.get(key) != value}


def record_change(*, shop, target_type, target_id, changes, actor, request=None, reason, audit_action, extra=None):
    """
    Tayyor `changes` ({maydon: {'old', 'new'}}) ni sabab bilan o'zgarmas tarixga va audit logga yozadi. SABAB MAJBURIY (5..300 belgi,
    aks holda FinanceEditError): jimgina o'zgartirish yo'q. Chaqiruvchi shuni o'zgartirishning o'zi bilan BIR tranzaksiyada (yozuv
    qatori qulfi ostida) chaqiradi. `extra` - audit metadata'ga qo'shimcha (masalan, hosil bo'lgan kassa operatsiyasi id'si).
    `changes` bo'sh bo'lsa None (yozilmaydi).
    """
    if not changes:
        return None
    text = clean_reason(reason)
    revision = _write_revision(shop=shop, target_type=target_type, target_id=target_id, changes=changes, reason=text, actor=actor)
    _audit(audit_action, request, actor, 'finance_transaction' if target_type == FinanceRevision.TARGET_TRANSACTION else 'debt_record',
           target_id, changes, text, revision, extra)
    return revision


def record_external_edit(*, shop, target_type, target_id, before, after, actor, request=None, reason='', audit_action):
    """
    Boshqa yo'l (eski seller paneli) orqali bo'lgan o'zgarishni ham jimgina qoldirmaydi: `before`/`after` (tx_snapshot/debt_snapshot)
    farqi tarixga va audit logga yoziladi. Chaqiruvchi shuni o'zgartirish bilan BIR tranzaksiyada (qator qulfi ostida) chaqiradi.
    `reason` MAJBURIY (5..300 belgi, aks holda FinanceEditError); avvalgi "sabab so'ralmagan" zaxirasi egasi qarori bilan olib tashlandi.
    O'zgargan maydon bo'lmasa None.
    """
    return record_change(shop=shop, target_type=target_type, target_id=target_id, changes=diff_snapshots(before, after),
                         actor=actor, request=request, reason=reason, audit_action=audit_action)


# ─── Kassa operatsiyasi ───────────────────────────────────────────────────────────────────────────
def tx_edit_lock(tx):
    """None - tahrirlanadi; 'cancelled' (storno qilingan) yoki 'source_locked' (manbasi buyurtma/qarz to'lovi)."""
    if tx.is_cancelled:
        return 'cancelled'
    if tx.order_id or tx.debt_id:
        return 'source_locked'
    return None


def tx_snapshot(tx):
    """Tarix bilan solishtiriladigan joriy qiymatlar."""
    return {
        'amount': money_str(tx.amount),
        'category': tx.category.name if tx.category_id else None,
        'title': tx.title,
        'notes': tx.notes,
        'tx_date': tx.tx_date.isoformat() if hasattr(tx.tx_date, 'isoformat') else str(tx.tx_date),
        'payment_method': tx.payment_method,
    }


def _tx_lock_error(tx):
    lock = tx_edit_lock(tx)
    if lock == 'cancelled':
        return FinanceEditError("Bekor qilingan (storno) yozuvni tahrirlab bo'lmaydi", 'cancelled', 409)
    if lock == 'source_locked':
        if tx.order_id:
            return FinanceEditError("Buyurtma to'lovini Buyurtmalar bo'limida o'zgartiring", 'source_locked', 409)
        return FinanceEditError("Qarz to'lovini Qarzlar bo'limida bekor qilib (storno), qaytadan kiriting", 'source_locked', 409)
    return None


def _diff_transaction(tx, data, shop):
    """(changes, updates): JSON o'zgarishlar va modelga yoziladigan {maydon: qiymat}. Faqat haqiqatan o'zgargan maydonlar."""
    _reject_forbidden(data, _TX_FORBIDDEN)
    _, kind = _first(data, 'type', 'tx_type')
    if kind is not None and kind != tx.tx_type:
        raise FinanceEditError("Kirim yoki chiqim turini o'zgartirib bo'lmaydi: yozuvni storno qilib, qaytadan kiriting",
                               'forbidden_field', 400, field='type')

    changes, updates = {}, {}

    name, raw = _first(data, 'amount')
    if name:
        new = parse_decimal(raw, 'amount', minimum=MIN_AMOUNT, maximum=MAX_AMOUNT)
        if new != tx.amount:
            changes['amount'] = {'old': money_str(tx.amount), 'new': money_str(new)}
            updates['amount'] = new

    name, raw = _first(data, 'category_id', 'category')
    if name:
        new_id = parse_id(raw, 'category_id')
        if new_id != tx.category_id:
            category = None
            if new_id is not None:
                category = FinanceCategory.objects.filter(id=new_id, shop=shop).first()
                if category is None:
                    raise InputError("Kategoriya topilmadi", 'category_id')
            changes['category'] = {
                'old': tx.category.name if tx.category_id else None, 'new': category.name if category else None,
                'old_id': tx.category_id, 'new_id': new_id,
            }
            updates['category'] = category

    name, raw = _first(data, 'title', 'description')
    if name:
        new = parse_text(raw, 'title', max_length=255, required=True)
        if new != tx.title:
            changes['title'] = {'old': tx.title, 'new': new}
            updates['title'] = new

    name, raw = _first(data, 'notes', 'note')
    if name:
        new = parse_text(raw, 'notes', max_length=2000)
        if new != tx.notes:
            changes['notes'] = {'old': tx.notes, 'new': new}
            updates['notes'] = new

    name, raw = _first(data, 'tx_date', 'date')
    if name:
        new = parse_date(raw, 'tx_date', allow_none=False)
        if new != tx.tx_date:
            if new > local_today():
                raise InputError("Sana kelajakda bo'lishi mumkin emas", 'tx_date')
            if new < EARLIEST_TX_DATE:
                raise InputError("Sana juda eski: to'g'ri sanani kiriting", 'tx_date')
            changes['tx_date'] = {'old': tx.tx_date.isoformat(), 'new': new.isoformat()}
            updates['tx_date'] = new

    name, raw = _first(data, 'payment_method')
    if name:
        new = parse_choice(raw, 'payment_method', _METHODS)
        if new != tx.payment_method:
            changes['payment_method'] = {'old': tx.payment_method, 'new': new}
            updates['payment_method'] = new

    return changes, updates


def edit_transaction(*, shop, pk, data, actor, request=None):
    """
    Qo'lda kiritilgan kassa operatsiyasini tahrirlaydi. (tx, revision) qaytaradi.
    Xatolar: 404 (yozuv bu restoranniki emas), 409 `cancelled`/`source_locked`/`stale`, 400 `reason`/maydon/`no_changes`.
    """
    with transaction.atomic():
        tx = FinanceTransaction.objects.select_for_update().filter(pk=pk, shop=shop).first()
        if tx is None:
            raise NotFound("Yozuv topilmadi")
        locked = _tx_lock_error(tx)
        if locked:
            raise locked

        expected = _parse_expected(data)
        current = revision_count(FinanceRevision.TARGET_TRANSACTION, tx.pk)
        if expected is not None and expected != current:
            raise FinanceEditError("Bu yozuv siz ochganingizdan keyin o'zgartirilgan. Ro'yxatni yangilab, qaytadan oching",
                                   'stale', 409)
        reason = clean_reason(data.get('reason'))
        changes, updates = _diff_transaction(tx, data, shop)
        if not changes:
            raise FinanceEditError("Hech narsa o'zgarmadi", 'no_changes', 400)

        revision = _write_revision(shop=shop, target_type=FinanceRevision.TARGET_TRANSACTION, target_id=tx.pk,
                                   changes=changes, reason=reason, actor=actor)
        for attr, value in updates.items():
            setattr(tx, attr, value)
        tx.save(update_fields=list(updates))
        _audit('finance_tx_edited', request, actor, 'finance_transaction', tx.pk, changes, reason, revision)
    return tx, revision


# ─── Qarz / nasiya ────────────────────────────────────────────────────────────────────────────────
def derive_debt_status(amount, paid):
    if paid >= amount:
        return 'settled'
    return 'partial' if paid > 0 else 'pending'


def debt_snapshot(debt):
    return {
        'person_name': debt.person_name,
        'phone': debt.phone,
        'debt_type': debt.debt_type,
        'amount': money_str(debt.amount),
        'due_date': debt.due_date.isoformat() if debt.due_date else None,
        'notes': debt.notes,
        'status': debt.status,
    }


def _diff_debt(debt, data):
    _reject_forbidden(data, _DEBT_FORBIDDEN)
    changes, updates = {}, {}

    name, raw = _first(data, 'person_name', 'debtor_name')
    if name:
        new = parse_text(raw, 'person_name', max_length=150, required=True)
        if new != debt.person_name:
            changes['person_name'] = {'old': debt.person_name, 'new': new}
            updates['person_name'] = new

    name, raw = _first(data, 'phone')
    if name:
        new = parse_text(raw, 'phone', max_length=50)
        if new != debt.phone:
            changes['phone'] = {'old': debt.phone, 'new': new}
            updates['phone'] = new

    name, raw = _first(data, 'debt_type')
    if name:
        new = parse_choice(raw, 'debt_type', ('customer', 'supplier'))
        if new != debt.debt_type:
            # To'lovlar tarixi bor qarzning yo'nalishini o'zgartirish ularning kirim/chiqim ma'nosini buzardi
            if debt.paid_amount > 0 or FinanceTransaction.objects.filter(debt=debt).exists():
                raise FinanceEditError("To'lov qabul qilingan qarzning turini o'zgartirib bo'lmaydi", 'has_payments', 400,
                                       field='debt_type')
            changes['debt_type'] = {'old': debt.debt_type, 'new': new}
            updates['debt_type'] = new

    name, raw = _first(data, 'amount', 'initial_amount', 'total_amount')
    if name:
        new = parse_decimal(raw, 'amount', minimum=MIN_AMOUNT, maximum=MAX_AMOUNT)
        if new != debt.amount:
            if new < debt.paid_amount:
                raise FinanceEditError("Umumiy summa to'langan summadan kichik bo'lishi mumkin emas", 'below_paid', 400,
                                       field='amount', min_amount=money_str(debt.paid_amount))
            changes['amount'] = {'old': money_str(debt.amount), 'new': money_str(new)}
            updates['amount'] = new
            status = derive_debt_status(new, debt.paid_amount)
            if status != debt.status:
                changes['status'] = {'old': debt.status, 'new': status}
                updates['status'] = status

    name, raw = _first(data, 'due_date')
    if name:
        new = parse_date(raw, 'due_date')                     # bo'sh qiymat = muddatni olib tashlash
        if new != debt.due_date:
            changes['due_date'] = {'old': debt.due_date.isoformat() if debt.due_date else None,
                                   'new': new.isoformat() if new else None}
            updates['due_date'] = new

    name, raw = _first(data, 'notes', 'note')
    if name:
        new = parse_text(raw, 'notes', max_length=2000)
        if new != debt.notes:
            changes['notes'] = {'old': debt.notes, 'new': new}
            updates['notes'] = new

    return changes, updates


def edit_debt(*, shop, pk, data, actor, request=None):
    """Qarz/nasiyani tahrirlaydi. (debt, revision) qaytaradi. Qarz qatori `pay` bilan bir xil qulf ostida o'zgaradi."""
    with transaction.atomic():
        debt = DebtRecord.objects.select_for_update().filter(pk=pk, shop=shop).first()
        if debt is None:
            raise NotFound("Qarz topilmadi")

        expected = _parse_expected(data)
        current = revision_count(FinanceRevision.TARGET_DEBT, debt.pk)
        if expected is not None and expected != current:
            raise FinanceEditError("Bu yozuv siz ochganingizdan keyin o'zgartirilgan. Ro'yxatni yangilab, qaytadan oching",
                                   'stale', 409)
        reason = clean_reason(data.get('reason'))
        changes, updates = _diff_debt(debt, data)
        if not changes:
            raise FinanceEditError("Hech narsa o'zgarmadi", 'no_changes', 400)

        revision = _write_revision(shop=shop, target_type=FinanceRevision.TARGET_DEBT, target_id=debt.pk,
                                   changes=changes, reason=reason, actor=actor)
        for attr, value in updates.items():
            setattr(debt, attr, value)
        debt.save(update_fields=[*updates, 'updated_at'])
        _audit('debt_edited', request, actor, 'debt_record', debt.pk, changes, reason, revision)
    return debt, revision
