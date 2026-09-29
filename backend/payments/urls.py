from django.urls import path
from . import views

urlpatterns = [
    path('create/<int:order_pk>/', views.payment_create, name='payment_create'),
    path('status/<str:payment_id>/', views.payment_status, name='payment_status'),
    path('callback/click/', views.payment_callback_click, name='payment_callback_click'),
    path('callback/payme/', views.payment_callback_payme, name='payment_callback_payme'),
    path('callback/uzcard/', views.payment_callback_uzcard, name='payment_callback_uzcard'),
    path('demo/<int:order_pk>/', views.payment_demo_view, name='payment_demo_view'),
    path('demo/<int:order_pk>/confirm/', views.payment_demo_confirm, name='payment_demo_confirm'),
    path('success/', views.payment_success_page if hasattr(views, 'payment_success_page') else views.payment_status, name='payment_success_page'),
    path('failed/', views.payment_failed_page if hasattr(views, 'payment_failed_page') else views.payment_status, name='payment_failed_page'),
]
