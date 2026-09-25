from django.urls import path
from apps.payments import views
from apps.payments.views_payme import payme_webhook
from apps.payments.views_click import click_webhook
from apps.payments.views_uzum import uzum_webhook

urlpatterns = [
    path('payment/create/', views.create_payment, name='payment-create'),
    path('payment/check/', views.check_payment, name='payment-check'),
    path('payments/webhook/payme/', payme_webhook, name='webhook-payme'),
    path('payments/webhook/click/', click_webhook, name='webhook-click'),
    path('payments/webhook/uzum/', uzum_webhook, name='webhook-uzum'),
]
