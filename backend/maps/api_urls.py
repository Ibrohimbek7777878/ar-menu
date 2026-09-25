from django.urls import path
from .api_views import maps_shops_api, delivery_quote_api

urlpatterns = [
    path('shops/', maps_shops_api, name='maps_shops'),
    path('delivery-quote/', delivery_quote_api, name='maps_delivery_quote'),
]
