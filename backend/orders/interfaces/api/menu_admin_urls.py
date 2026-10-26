from django.urls import path
from orders.interfaces.api.menu_admin import (
    MenuCategoryListCreateView,
    MenuProductAvailabilityView,
    MenuProductDetailView,
    MenuProductDuplicateView,
    MenuProductFeatureView,
    MenuProductListCreateView,
    MenuProductRestoreView,
)

urlpatterns = [
    path('products/', MenuProductListCreateView.as_view(), name='menu_admin_products'),
    path('products/<int:pk>/', MenuProductDetailView.as_view(), name='menu_admin_product_detail'),
    path('products/<int:pk>/availability/', MenuProductAvailabilityView.as_view(), name='menu_admin_product_availability'),
    path('products/<int:pk>/duplicate/', MenuProductDuplicateView.as_view(), name='menu_admin_product_duplicate'),
    path('products/<int:pk>/feature/', MenuProductFeatureView.as_view(), name='menu_admin_product_feature'),
    path('products/<int:pk>/restore/', MenuProductRestoreView.as_view(), name='menu_admin_product_restore'),
    path('categories/', MenuCategoryListCreateView.as_view(), name='menu_admin_categories'),
]
