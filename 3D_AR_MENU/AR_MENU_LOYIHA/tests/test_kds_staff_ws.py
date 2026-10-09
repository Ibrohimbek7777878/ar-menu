import pytest
from channels.testing import WebsocketCommunicator
from channels.routing import URLRouter
from config.routing import websocket_urlpatterns
from apps.accounts.tokens import make_access
from apps.accounts.models import Staff
from core.ws import ws_send, async_ws_send, g_kds, g_waiters


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
class TestKDSAndStaffWebSocket:
    """F-004 & F-005: KDS va ofitsiant WebSocket ulanishlari, xabar protokoli testlari"""

    async def test_kds_consumer_valid_token(self, restaurant):
        router = URLRouter(websocket_urlpatterns)
        communicator = WebsocketCommunicator(router, f'/ws/kds/{restaurant.kds_token}/')

        connected, _ = await communicator.connect()
        assert connected is True

        # 1. Connected xabari
        res1 = await communicator.receive_json_from()
        assert res1['type'] == 'connected'
        assert g_kds(restaurant.id) in res1['groups']

        # 2. Boshlang'ich taxta snapshot xabari
        res2 = await communicator.receive_json_from()
        assert res2['type'] == 'board.snapshot'
        assert isinstance(res2['data'], list)

        # 3. Ping / pong almashinuvi
        await communicator.send_json_to({'type': 'ping'})
        res3 = await communicator.receive_json_from()
        assert res3['type'] == 'pong'

        # 4. Broadcast qabul qilish
        await async_ws_send(g_kds(restaurant.id), 'order.new', {'order': {'id': 99, 'status': 'new'}})
        res4 = await communicator.receive_json_from()
        assert res4['type'] == 'order.new'
        assert res4['data']['order']['id'] == 99

        await communicator.disconnect()

    async def test_kds_consumer_invalid_token(self):
        router = URLRouter(websocket_urlpatterns)
        communicator = WebsocketCommunicator(router, '/ws/kds/invalid_token_123/')

        connected, subprotocol = await communicator.connect()
        assert connected is False

    async def test_staff_consumer_valid_token(self, restaurant, staff):
        token = make_access(staff)
        router = URLRouter(websocket_urlpatterns)
        communicator = WebsocketCommunicator(router, f'/ws/staff/{token}/')

        connected, _ = await communicator.connect()
        assert connected is True

        # 1. Connected xabari
        res1 = await communicator.receive_json_from()
        assert res1['type'] == 'connected'
        assert g_waiters(restaurant.id) in res1['groups']
        assert f'staff_{staff.id}' in res1['groups']

        # 2. Call new xabari
        await async_ws_send(g_waiters(restaurant.id), 'call.new', {'table_no': 5})
        res2 = await communicator.receive_json_from()
        assert res2['type'] == 'call.new'
        assert res2['data']['table_no'] == 5

        # 3. Order ready xabari
        await async_ws_send(g_waiters(restaurant.id), 'order.ready', {'order': {'id': 12, 'number': 47}})
        res3 = await communicator.receive_json_from()
        assert res3['type'] == 'order.ready'
        assert res3['data']['order']['number'] == 47

        # 4. Ack xabari
        await communicator.send_json_to({'type': 'ack', 'order_id': 12})
        res4 = await communicator.receive_json_from()
        assert res4['type'] == 'ack.ok'
        assert res4['order_id'] == 12

        await communicator.disconnect()

    async def test_staff_consumer_invalid_token(self):
        router = URLRouter(websocket_urlpatterns)
        communicator = WebsocketCommunicator(router, '/ws/staff/invalid.jwt.token/')

        connected, _ = await communicator.connect()
        assert connected is False
