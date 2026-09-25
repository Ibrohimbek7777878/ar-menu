from django.urls import path
from .api_views import (
    payment_create_api,
    payment_status_api,
    payment_callback_click,
    payment_callback_payme,
    mock_payment_page,
    mock_payment_success,
    mock_payment_fail,
)

urlpatterns = [
    path('create/', payment_create_api, name='payment_api_create'),
    path('<str:payment_id>/status/', payment_status_api, name='payment_api_status'),
    path('click/', payment_callback_click, name='payment_api_click'),
    path('payme/', payment_callback_payme, name='payment_api_payme'),
    path('mock/<str:payment_id>/', mock_payment_page, name='payment_mock_page'),
    path('mock/<str:payment_id>/success/', mock_payment_success, name='payment_mock_success'),
    path('mock/<str:payment_id>/fail/', mock_payment_fail, name='payment_mock_fail'),
]
