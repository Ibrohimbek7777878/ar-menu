from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsRestAdmin
from apps.analytics.services.dashboard import (
    dashboard_kpis, hourly_sales, top_dishes, attention_items)


class DashboardView(APIView):
    """GET /api/v1/analytics/dashboard/"""
    permission_classes = [IsAuthenticated, IsRestAdmin]

    def get(self, request):
        rid = request.restaurant_id
        return Response({
            'kpis': dashboard_kpis(rid),
            'hourly': hourly_sales(rid),
            'top_dishes': top_dishes(rid),
            'attention': attention_items(rid),
        })
