from django.urls import path
from apps.orders import views

app_name = 'orders'

urlpatterns = [
    path('orders/', views.order_create, name='create'),
    path('orders/<int:pk>/', views.order_detail, name='detail'),
    path('orders/<int:pk>/add-items/', views.order_add_items, name='add-items'),
    path('orders/session/<str:sid>/', views.order_by_session, name='by-session'),
    path('sync/', views.sync_events, name='sync'),
]
