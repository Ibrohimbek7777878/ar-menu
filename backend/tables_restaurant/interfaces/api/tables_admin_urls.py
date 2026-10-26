"""
Restoran Stollar va QR Kodlar URL marshrutlari.
Prefiks: /api/restaurant/admin/v1/tables/
"""
from django.urls import path

from tables_restaurant.interfaces.api.tables_admin import (
    HallDetailUpdateDeleteView,
    HallListCreateView,
    TableDetailUpdateDeleteView,
    TableQrSvgView,
    TableRestoreView,
    TableRotateQrView,
    TableStatusUpdateView,
    TablesListCreateView,
)

urlpatterns = [
    path('', TablesListCreateView.as_view(), name='resto_admin_tables_list'),
    path('<int:pk>/', TableDetailUpdateDeleteView.as_view(), name='resto_admin_table_detail'),
    path('<int:pk>/restore/', TableRestoreView.as_view(), name='resto_admin_table_restore'),
    path('<int:pk>/status/', TableStatusUpdateView.as_view(), name='resto_admin_table_status'),
    path('<int:pk>/rotate-qr/', TableRotateQrView.as_view(), name='resto_admin_table_rotate_qr'),
    path('<int:pk>/qr.svg', TableQrSvgView.as_view(), name='resto_admin_table_qr_svg'),
    path('halls/', HallListCreateView.as_view(), name='resto_admin_halls_list'),
    path('halls/<int:pk>/', HallDetailUpdateDeleteView.as_view(), name='resto_admin_hall_detail'),
]
