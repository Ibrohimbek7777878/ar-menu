from django.urls import path
from django.shortcuts import redirect
from . import views

urlpatterns = [
    # AIR 3D Menu Page — Interaktiv Restoran 3D Menyu tizimi
    path('ar/', views.ar_3d_menu_page, name='ar_3d_menu'),
    path('m/<slug:slug>/', views.ar_3d_menu_page, name='ar_3d_menu_slug'),

    # AIR 3D API (v1)
    path('v1/menu/<slug:slug>/', views.v1_menu_api, name='v1_menu_api'),
    path('v1/orders/', views.v1_orders_api, name='v1_orders_api'),
    path('v1/guest/call-waiter/', views.v1_call_waiter_api, name='v1_call_waiter_api'),
    path('v1/lang/', views.v1_lang_api, name='v1_lang_api'),
    path('v1/ar/<int:dish_id>/', views.v1_ar_dish_api, name='v1_ar_dish_api'),

    # AI Sommelier Chatbot (Gemini + Gastronomik aqlli tavsiya)
    path('api/ai-chat', views.ai_chat_api, name='api_ai_chat'),
    path('v1/ai/chat/', views.ai_chat_api, name='v1_ai_chat'),

    # Split Bill (Hisobni do'stlar orasida bo'lish)
    path('v1/guest/split-bill/', views.v1_split_bill_api, name='v1_split_bill'),

    # Call Status & Staff/Waiter Operations
    path('v1/guest/call-status/', views.v1_call_status_api, name='v1_call_status'),
    path('v1/staff/calls/', views.v1_staff_calls_api, name='v1_staff_calls'),
    path('v1/staff/calls/<int:pk>/accept/', views.v1_staff_call_accept_api, name='v1_staff_call_accept'),
    path('v1/staff/calls/<int:pk>/done/', views.v1_staff_call_done_api, name='v1_staff_call_done'),

    # Order Status Tracker (Real-time progress)
    path('v1/orders/status/<int:order_id>/', views.v1_order_status_api, name='v1_order_status'),
    path('v1/orders/<int:order_id>/', views.v1_order_status_api, name='v1_order_detail_api'),

    # Table Quick Entry QR Router
    path('t/<str:token>/', views.table_entry_redirect, name='table_entry_token'),

    # 3D Printer Studio & On-Demand Printing (NFC / QR / Web)
    path('3d-print/', views.print_3d_studio_page, name='print_3d_studio'),
    path('3d-print/order/', views.print_3d_create_order_api, name='print_3d_create_order'),
    path('3d-print/order/<str:order_number>/ready/', views.print_3d_mark_ready_api, name='print_3d_mark_ready'),
]
