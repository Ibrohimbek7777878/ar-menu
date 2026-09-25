from rest_framework.routers import DefaultRouter
from apps.tables.views import HallViewSet, TableViewSet
from apps.tables.views_floorplan import FloorPlanViewSet

router = DefaultRouter()
router.register('halls', HallViewSet, basename='hall')
router.register('tables', TableViewSet, basename='table')
router.register('floorplans', FloorPlanViewSet, basename='floorplan')

urlpatterns = router.urls
