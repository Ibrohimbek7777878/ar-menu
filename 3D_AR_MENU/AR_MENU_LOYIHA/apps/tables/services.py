import logging
from django.db import transaction
from core.ws import ws_send, g_admin, g_waiters

log = logging.getLogger('tables.services')


def serialize_table(t) -> dict:
    return {
        'id': t.id,
        'number': t.number,
        'hall_id': t.hall_id,
        'status': t.status,
        'capacity': t.capacity,
        'shape': t.shape,
        'x': t.x, 'y': t.y, 'w': t.w, 'h': t.h, 'rotation': t.rotation,
        'assigned_waiter_id': t.assigned_waiter_id,
        'is_active': t.is_active,
    }


def broadcast_table_status(t):
    """⚡ Stol holati o'zgardi → admin + ofitsiantlar ekranlari yangilanadi."""
    payload = {'table': serialize_table(t)}
    ws_send(g_admin(t.restaurant_id), 'table.status', payload)
    ws_send(g_waiters(t.restaurant_id), 'table.status', payload)
    log.info(f'[tables] #{t.id} → {t.status}')


def broadcast_table_scanned(t, session_id):
    """QR skanerlandi → admin dashboardda 'Stol N skanerlandi'."""
    ws_send(g_admin(t.restaurant_id), 'table.scanned', {
        'table_id': t.id, 'number': t.number, 'session_id': str(session_id),
    })


@transaction.atomic
def create_table(restaurant_id, hall_id, number, **kwargs):
    """Stol yaratish — restaurant denormalizatsiyasi va tarif limiti bilan."""
    from apps.tables.models import Hall, Table
    from core.exceptions import TenantMismatch, PlanLimit
    from django.conf import settings

    hall = Hall.objects.filter(id=hall_id, restaurant_id=restaurant_id).first()
    if not hall:
        raise TenantMismatch({'hall_id': hall_id})

    limit = getattr(settings, 'PLAN_TABLE_LIMITS', {}).get(
        _plan_of(restaurant_id), 10_000)
    if Table.objects.filter(restaurant_id=restaurant_id, is_active=True).count() >= limit:
        raise PlanLimit({'limit': limit, 'resource': 'tables'})

    t = Table.objects.create(
        hall=hall, restaurant_id=restaurant_id, number=str(number).strip(), **kwargs)
    transaction.on_commit(lambda: broadcast_table_status(t))
    return t


def _plan_of(restaurant_id) -> str:
    from apps.tenants.models import Restaurant
    return Restaurant.objects.only('plan').get(id=restaurant_id).plan


def regenerate_qr(table):
    """⚡ QR yangilash. Eski token 24 soat grace ichida ishlaydi."""
    old = table.qr_token
    new = table.rotate_qr()
    log.warning(f'[tables] QR rotate #{table.id}: {old} → {new} (grace 24s)')
    ws_send(g_admin(table.restaurant_id), 'table.qr_rotated', {
        'table_id': table.id, 'qr_token': str(new),
        'grace_until': table.qr_rotated_at.isoformat(),
    })
    return new
