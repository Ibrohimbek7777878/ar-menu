from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourierViewSet

router = DefaultRouter()
router.register(r'', CourierViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
