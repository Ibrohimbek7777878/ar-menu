"""Mehmon sayri marshruti. Prefiks: /api/restaurant/guest/tour/"""
from django.urls import path

from tours.interfaces.api.guest_tour import guest_tour

urlpatterns = [
    path('', guest_tour, name='guest_tour'),
]
