from rest_framework.routers import DefaultRouter
from apps.menu import admin_views

router = DefaultRouter()
router.register('categories', admin_views.CategoryViewSet, basename='admin-category')
router.register('dishes', admin_views.DishViewSet, basename='admin-dish')
router.register('modifiers', admin_views.ModifierViewSet, basename='admin-modifier')
router.register('upsell', admin_views.UpsellViewSet, basename='admin-upsell')

urlpatterns = router.urls
