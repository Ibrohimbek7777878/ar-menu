from django.urls import path
from apps.ai import views
urlpatterns=[
    path('ai/chat/', views.ai_chat, name='ai-chat'),
]
