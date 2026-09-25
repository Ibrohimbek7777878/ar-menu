from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    NotificationLogViewSet, BannerViewSet,
    PromotionViewSet, ReviewViewSet, AppSettingViewSet
)
from .views import telegram_webhook

router = DefaultRouter()
router.register(r'logs', NotificationLogViewSet)
router.register(r'banners', BannerViewSet)
router.register(r'promotions', PromotionViewSet)
router.register(r'reviews', ReviewViewSet)
router.register(r'settings', AppSettingViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('webhook/telegram/', telegram_webhook, name='telegram_webhook'),
]
