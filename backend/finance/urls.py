from django.urls import path
from . import views

urlpatterns = [
    path('', views.seller_finance, name='seller_finance_web'),
    path('export/excel/', views.finance_export_excel, name='finance_export_excel'),
    path('export/pdf/', views.finance_export_pdf, name='finance_export_pdf'),
    path('install-preset/', views.finance_install_preset, name='finance_install_preset'),
]
