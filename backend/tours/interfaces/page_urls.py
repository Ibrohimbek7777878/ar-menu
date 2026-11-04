"""Mehmon video sayr SAHIFASI (`/tour/`): `/book/` bilan bir xil - mehmon React ilovasi (TourPage) shu yerda mount bo'ladi.
Sahifaning o'zi `tma_home` (ETag/304 ham); CSRF cookie o'rnatiladi (sayrdan `/book/` ga ilova ichida o'tilganda bron POST'i uchun kerak).
Tenant va bo'lim (modul) qoidalari ham `/book/` kabi: bo'lim o'chiq bo'lsa ilova yumshoq ekran ko'rsatadi, API `{enabled: false}` beradi."""
from django.urls import path
from django.views.decorators.csrf import ensure_csrf_cookie

from web import tma_views

tour_page = ensure_csrf_cookie(tma_views.tma_home)

urlpatterns = [
    path('', tour_page, name='tma_tour'),
]
