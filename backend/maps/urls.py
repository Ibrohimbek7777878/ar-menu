from django.urls import path
from . import views

urlpatterns = [
    path('', views.map_view, name='map_view'),
    path('save-location/', views.save_location, name='map_save_location'),
    path('courier-location/<int:order_pk>/', views.get_courier_location, name='map_courier_location'),
    path('update-location/', views.update_courier_location, name='map_update_courier_location'),
]
