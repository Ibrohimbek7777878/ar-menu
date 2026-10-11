import json
import logging
import asyncio

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

log = logging.getLogger('orders.ws')


class BaseConsumer(AsyncWebsocketConsumer):
    """
    ⚡ Umumiy asos: guruhga qo'shilish, broadcast, heartbeat.
    Guruh nomi HAR DOIM restoran-scoped bo'lishi SHART.
    """
    groups_joined = []
    HEARTBEAT_SEC = 25
    MISS_LIMIT = 2

    async def connect(self):
        ok = await self.authorize()
        if not ok:
            await self.close(code=4401)      # Unauthorized
            return
        for g in self.groups_joined:
            await self.channel_layer.group_add(g, self.channel_name)
        await self.accept()
        self._missed = 0
        self._hb = asyncio.create_task(self._heartbeat())
        await self.send_json({'type': 'connected', 'ts': timezone.now().isoformat(),
                              'groups': self.groups_joined,
                              'heartbeat_sec': self.HEARTBEAT_SEC})
        log.info(f'[ws] ulandi: {self.groups_joined}')

    async def disconnect(self, code):
        hb = getattr(self, '_hb', None)
        if hb and not hb.done():
            hb.cancel()
            try:
                await hb
            except (asyncio.CancelledError, Exception):
                pass
        for g in self.groups_joined:
            await self.channel_layer.group_discard(g, self.channel_name)
        log.info(f'[ws] uzildi ({code}): {self.groups_joined}')

    async def authorize(self) -> bool:
        raise NotImplementedError

    async def receive(self, text_data=None, bytes_data=None):
        try:
            msg = json.loads(text_data or '{}')
        except json.JSONDecodeError:
            return
        t = msg.get('type')
        if t == 'pong':
            self._missed = 0
            return
        if t == 'ping':
            self._missed = 0
            await self.send_json({'type': 'pong', 'ts': timezone.now().isoformat()})
            return
        await self.on_message(msg)

    async def on_message(self, msg):
        pass

    async def broadcast(self, event):
        """core.ws.ws_send → group_send({'type':'broadcast', 'message': {...}})"""
        await self.send(text_data=json.dumps(event['message'], ensure_ascii=False))

    async def send_json(self, data):
        await self.send(text_data=json.dumps(data, ensure_ascii=False))

    async def _heartbeat(self):
        try:
            while True:
                await asyncio.sleep(self.HEARTBEAT_SEC)
                if self._missed >= self.MISS_LIMIT:
                    log.warning(f'[ws] pong kelmadi ×{self._missed} — yopiladi')
                    await self.close(code=4408)
                    return
                self._missed += 1
                await self.send_json({'type': 'ping',
                                      'ts': timezone.now().isoformat()})
        except asyncio.CancelledError:
            pass


class GuestConsumer(BaseConsumer):
    """
    /ws/guest/<session_id>/  → guruh: guest_<session_id>
    Mijoz o'z buyurtmasi holatini jonli ko'radi.
    """
    async def authorize(self):
        from core.ws import g_guest
        sid = self.scope['url_route']['kwargs']['session_id']
        if not sid or len(sid) > 64:
            return False
        exists = await self._session_exists(sid)
        if not exists:
            return False
        self.session_id = sid
        self.groups_joined = [g_guest(sid)]
        return True

    @database_sync_to_async
    def _session_exists(self, sid):
        from apps.guest.models import GuestSession
        return GuestSession.objects.filter(public_id=sid).exists()


class StaffConsumer(BaseConsumer):
    """
    /ws/staff/<token>/ → guruhlar: rest_<id>_waiters + staff_<staff_id>
    ⚡ Token orqali restoran aniqlanadi — cross-tenant ulanish MUMKIN EMAS.
    """
    async def authorize(self):
        from core.ws import g_waiters
        token = self.scope['url_route']['kwargs']['token']
        staff = await self._staff_by_token(token)
        if staff is None:
            return False
        self.staff_id = staff['id']
        self.restaurant_id = staff['restaurant_id']
        self.role = staff['role']
        self.my_tables = staff['tables']
        self.groups_joined = [
            g_waiters(self.restaurant_id),
            f'staff_{self.staff_id}',
        ]
        return True

    @database_sync_to_async
    def _staff_by_token(self, token):
        from apps.accounts.tokens import decode
        from apps.accounts.models import Staff
        try:
            payload = decode(token)
        except Exception:
            return None
        if payload.get('typ') != 'access':
            return None
        s = Staff.objects.filter(id=payload.get('sub'), is_active=True).first()
        if s is None:
            return None
        return {'id': s.id, 'restaurant_id': s.restaurant_id,
                'role': s.role, 'tables': list(s.tables or [])}

    async def on_message(self, msg):
        """Ofitsiant 'o'qidim' deb belgilaydi (badge tozalash)"""
        if msg.get('type') == 'ack':
            await self.send_json({'type': 'ack.ok', 'order_id': msg.get('order_id')})


class KDSConsumer(BaseConsumer):
    """
    /ws/kds/<token>/ → guruh: rest_<id>_kds
    ⚡ KDS hech qachon yopilmaydi — TV brauzerida doim ochiq.
    Ulanishda darhol joriy taxta yuboriladi (sahifa yangilanmasin).
    """
    async def authorize(self):
        from core.ws import g_kds
        token = self.scope['url_route']['kwargs']['token']
        info = await self._kds_token(token)
        if info is None:
            return False
        self.restaurant_id = info['restaurant_id']
        self.groups_joined = [g_kds(self.restaurant_id)]
        return True

    @database_sync_to_async
    def _kds_token(self, token):
        from apps.accounts.tokens import decode
        from apps.accounts.models import Staff
        try:
            payload = decode(token)
            if payload and payload.get('role') in ('cook', 'admin', 'owner') and payload.get('typ') == 'access':
                return {'restaurant_id': payload['rid']}
        except Exception:
            pass
        # KDS terminal tokeni (Restaurant.kds_token) — TV uchun
        from apps.tenants.models import Restaurant
        try:
            r = Restaurant.objects.filter(kds_token=token, is_active=True).first()
            if r:
                return {'restaurant_id': r.id}
        except Exception:
            pass
        return None

    async def connect(self):
        await super().connect()
        if self.groups_joined:
            board = await self._board()
            await self.send_json({'type': 'board.snapshot', 'data': board})

    @database_sync_to_async
    def _board(self):
        from apps.orders.models import Order
        from apps.orders.serializers import serialize_order
        qs = (Order.objects
              .select_related('table')
              .prefetch_related('items')
              .filter(restaurant_id=self.restaurant_id,
                      status__in=['new', 'accepted', 'cooking', 'ready'])
              .order_by('created_at'))
        return [serialize_order(o) for o in qs]


class AdminConsumer(BaseConsumer):
    """
    /ws/admin/<token>/ → guruh: rest_<id>_admin
    A-01 dashboard "jonli oqim" shu yerdan oziqlanadi.
    """
    async def authorize(self):
        from core.ws import g_admin
        token = self.scope['url_route']['kwargs']['token']
        info = await self._admin_token(token)
        if info is None:
            return False
        self.restaurant_id = info['restaurant_id']
        self.groups_joined = [g_admin(self.restaurant_id)]
        return True

    @database_sync_to_async
    def _admin_token(self, token):
        from apps.accounts.tokens import decode
        try:
            payload = decode(token)
            if not payload or payload.get('role') not in ('admin', 'owner', 'manager') or payload.get('typ') != 'access':
                return None
            return {'restaurant_id': payload['rid']}
        except Exception:
            return None
