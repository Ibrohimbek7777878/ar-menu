import logging
from django.utils import timezone
from django.db.models import Q

from core.ws import ws_send, g_waiters, g_admin

log = logging.getLogger('tables.floorplan')

# ⚡ O-05 rang prioriteti (yuqoridan pastga — birinchi mos kelgan g'olib)
#   red    🔴 tayyor buyurtma bor (pulsatsiya)
#   purple 🟣 hisob so'ralgan / javobsiz chaqiruv
#   yellow 🟡 aktiv buyurtma kutmoqda
#   blue   🔵 band (mijoz o'tirgan, buyurtmasi yo'q)
#   green  🟢 bo'sh
COLOR_ORDER = ['red', 'purple', 'yellow', 'blue', 'green']

ACTIVE_ORDER_STATUSES = ('new', 'accepted', 'cooking')
READY_STATUSES = ('ready',)


def table_color(state: dict) -> str:
    if state.get('has_ready_order'):
        return 'red'
    if state.get('has_pending_call'):
        return 'purple'
    if state.get('has_active_order'):
        return 'yellow'
    if state.get('is_occupied'):
        return 'blue'
    return 'green'


def collect_table_states(restaurant_id: int, table_ids: list) -> dict:
    """
    Bitta zal uchun BARCHA stol holatini 3 ta so'rovda yig'adi (N+1 yo'q).
    Qaytadi: {table_id: {...state..., 'color': 'red'}}
    """
    from apps.orders.models import Order
    try:
        from apps.calls.models import Call
        has_calls = True
    except ImportError:
        has_calls = False

    if not table_ids:
        return {}

    states = {tid: {'table_id': tid, 'is_occupied': False,
                    'has_active_order': False, 'has_ready_order': False,
                    'has_pending_call': False, 'order_id': None,
                    'order_number': '', 'total': 0, 'guests': 0,
                    'waiting_min': 0} for tid in table_ids}

    orders = (Order.objects
              .filter(restaurant_id=restaurant_id, table_id__in=table_ids,
                      status__in=ACTIVE_ORDER_STATUSES + READY_STATUSES)
              .only('id', 'table_id', 'status', 'number', 'total',
                    'created_at')
              .order_by('created_at'))

    now = timezone.now()
    for o in orders:
        s = states.get(o.table_id)
        if s is None:
            continue
        s['is_occupied'] = True
        if o.status in READY_STATUSES:
            s['has_ready_order'] = True
        else:
            s['has_active_order'] = True
        if s['order_id'] is None:
            s['order_id'] = o.id
            s['order_number'] = o.number
            s['waiting_min'] = int((now - o.created_at).total_seconds() // 60)
        s['total'] = int(s['total']) + int(o.total or 0)

    if has_calls:
        calls = (Call.objects
                 .filter(restaurant_id=restaurant_id, table_id__in=table_ids,
                         status='pending')
                 .only('table_id', 'kind'))
        for c in calls:
            s = states.get(c.table_id)
            if s is not None:
                s['has_pending_call'] = True
                s['is_occupied'] = True
                s['call_kind'] = c.kind

    for s in states.values():
        s['color'] = table_color(s)
    return states


def build_live_plan(plan) -> dict:
    """Plan + stol holatlari — O-05 va admin jonli zal uchun."""
    from apps.tables.models import Table

    tids = plan.table_ids()
    states = collect_table_states(plan.restaurant_id, tids)
    nums = dict(Table.objects.filter(id__in=tids).values_list('id', 'number'))
    for tid, st in states.items():
        st['number'] = nums.get(tid, '')

    return {
        'id': plan.id,
        'name_uz': plan.name_uz, 'name_ru': plan.name_ru, 'name_en': plan.name_en,
        'floor': plan.floor,
        'version': plan.version,
        'plan_json': plan.plan_json or {},
        'tables': states,
        'ts': timezone.now().isoformat(),
    }


def broadcast_plan_saved(plan):
    """Plan tahrirlangach — ochiq ekranlar qayta yuklaydi."""
    payload = {'plan_id': plan.id, 'version': plan.version, 'floor': plan.floor}
    ws_send(g_waiters(plan.restaurant_id), 'plan.updated', payload)
    ws_send(g_admin(plan.restaurant_id), 'plan.updated', payload)


def broadcast_table_state(restaurant_id: int, table_id: int):
    """
    ⚡ Buyurtma/chaqiruv holati o'zgarganda — FAQAT shu stol yangilanadi.
    Butun plan qayta yuklanmaydi (trafik tejaladi).
    """
    st = collect_table_states(restaurant_id, [table_id]).get(table_id)
    if not st:
        return
    ws_send(g_waiters(restaurant_id), 'table.state', st)
    ws_send(g_admin(restaurant_id), 'table.state', st)
