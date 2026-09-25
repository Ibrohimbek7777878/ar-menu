from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShopViewSet

router = DefaultRouter()
router.register(r'', ShopViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
