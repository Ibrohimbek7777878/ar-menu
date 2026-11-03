from django.urls import path

from orders.interfaces.api.menu_import_views import (
    MenuImportCommitView, MenuImportParseView, MenuImportPhotoView, MenuImportUndoView,
)

# /api/restaurant/admin/v1/menu/import/ — docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_OMMAVIY_MENYU_KIRITISH_2026-11-03.md
urlpatterns = [
    path('parse/', MenuImportParseView.as_view(), name='menu_import_parse'),
    path('commit/', MenuImportCommitView.as_view(), name='menu_import_commit'),
    path('undo/', MenuImportUndoView.as_view(), name='menu_import_undo'),
    path('photo/', MenuImportPhotoView.as_view(), name='menu_import_photo'),
]
