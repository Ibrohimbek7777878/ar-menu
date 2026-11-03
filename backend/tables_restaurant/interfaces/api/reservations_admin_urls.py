"""
Bronlar admin API marshrutlari.
Prefiks: /api/restaurant/admin/v1/reservations/
"""
from django.urls import path

from tables_restaurant.interfaces.api.reservations_admin import (
    ReservationDetailAdminView,
    ReservationsAdminView,
    ReservationsConfigAdminView,
)

urlpatterns = [
    path('', ReservationsAdminView.as_view(), name='resto_admin_reservations'),
    path('config/', ReservationsConfigAdminView.as_view(), name='resto_admin_reservations_config'),
    path('<int:pk>/', ReservationDetailAdminView.as_view(), name='resto_admin_reservation_detail'),
]
