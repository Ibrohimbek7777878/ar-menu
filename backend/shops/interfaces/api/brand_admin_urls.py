"""
Brend admin API yo'nalishlari.
Prefiks: /api/restaurant/admin/v1/brand/
"""
from django.urls import path

from shops.interfaces.api.brand_admin import BrandApplyPresetView, BrandImageView

urlpatterns = [
    path('logo/', BrandImageView.as_view(), name='resto_admin_brand_image'),
    path('apply-preset/', BrandApplyPresetView.as_view(), name='resto_admin_brand_preset'),
]
