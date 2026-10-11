from django.urls import path
from apps.ar3d import views

app_name = 'ar3d'

urlpatterns = [
    path('ar/<int:dish_id>/', views.ar_info, name='info'),
    path('ar/view/', views.ar_view, name='view'),
]
