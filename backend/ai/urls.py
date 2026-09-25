from django.urls import path
from . import views

app_name = 'ai'

from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework import permissions as drf_permissions


@api_view(['GET'])
@permission_classes([drf_permissions.IsAdminUser])
def mcp_status_api(request):
    """V12 — MCP provayderlar holati (staff). O'zi nazorat paneli uchun."""
    from ai.mcp.router import router
    return JsonResponse({
        'providers': router.providers_status(),
        'today_cost_usd': round(router.today_cost(), 4),
    })


urlpatterns = [
    path('mcp/status/', mcp_status_api, name='mcp_status_api'),
    path('chat/', views.chat_api, name='chat'),
    path('marketing/', views.marketing_api, name='marketing'),
]
