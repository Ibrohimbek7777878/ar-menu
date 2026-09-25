from django.urls import re_path

from apps.orders import consumers

websocket_urlpatterns = [
    re_path(r'^ws/guest/(?P<session_id>[\w\-]{1,64})/$', consumers.GuestConsumer.as_asgi()),
    re_path(r'^ws/staff/(?P<token>[\w\.\-]+)/$', consumers.StaffConsumer.as_asgi()),
    re_path(r'^ws/kds/(?P<token>[\w\.\-]+)/$', consumers.KDSConsumer.as_asgi()),
    re_path(r'^ws/admin/(?P<token>[\w\.\-]+)/$', consumers.AdminConsumer.as_asgi()),
]
