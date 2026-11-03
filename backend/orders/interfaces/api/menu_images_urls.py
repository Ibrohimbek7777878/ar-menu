from django.urls import path

from orders.interfaces.api.menu_images_views import MenuImagePickView, MenuImagePreviewView, MenuImageSearchView

# /api/restaurant/admin/v1/menu/image-search/… (TZ_OMMAVIY_MENYU_KIRITISH_2026-11-03.md, 5-6 bandlar)
urlpatterns = [
    path('', MenuImageSearchView.as_view(), name='menu_admin_image_search'),
    path('pick/', MenuImagePickView.as_view(), name='menu_admin_image_pick'),
    path('preview/<str:token>/', MenuImagePreviewView.as_view(), name='menu_admin_image_preview'),
]
