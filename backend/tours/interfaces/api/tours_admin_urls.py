"""
Sayr admin API marshrutlari.
Prefiks: /api/restaurant/admin/v1/tours/
"""
from django.urls import path

from tours.interfaces.api.tours_admin import (
    TourAiSuggestAdminView,
    TourAiSuggestionsAdminView,
    TourDetailAdminView,
    ToursAdminView,
    TourHotspotsAdminView,
    TourPublishAdminView,
    TourStopsAdminView,
    TourUnpublishAdminView,
    TourVideoAdminView,
)

urlpatterns = [
    path('', ToursAdminView.as_view(), name='resto_admin_tours'),
    path('<int:pk>/', TourDetailAdminView.as_view(), name='resto_admin_tour_detail'),
    path('<int:pk>/video/', TourVideoAdminView.as_view(), name='resto_admin_tour_video'),
    path('<int:pk>/stops/', TourStopsAdminView.as_view(), name='resto_admin_tour_stops'),
    path('<int:pk>/hotspots/', TourHotspotsAdminView.as_view(), name='resto_admin_tour_hotspots'),
    path('<int:pk>/publish/', TourPublishAdminView.as_view(), name='resto_admin_tour_publish'),
    path('<int:pk>/unpublish/', TourUnpublishAdminView.as_view(), name='resto_admin_tour_unpublish'),
    path('<int:pk>/ai-suggest/', TourAiSuggestAdminView.as_view(), name='resto_admin_tour_ai_suggest'),
    path('<int:pk>/ai-suggestions/', TourAiSuggestionsAdminView.as_view(), name='resto_admin_tour_ai_suggestions'),
]
