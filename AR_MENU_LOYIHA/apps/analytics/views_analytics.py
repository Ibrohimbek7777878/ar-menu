"""Analitika API — ABC, menyu-injiring, eksport"""
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsRestAdmin


class ABCAnalysisView(APIView):
    """GET /v1/admin/analytics/abc/?days=30"""
    permission_classes = [IsRestAdmin]

    def get(self, request):
        from apps.analytics.services.abc import abc_analysis
        days = int(request.query_params.get('days', 30))
        data = abc_analysis(request.restaurant_id, days=days)
        return Response({'abc': data, 'days': days})


class MenuEngineeringView(APIView):
    """GET /v1/admin/analytics/engineering/?days=30"""
    permission_classes = [IsRestAdmin]

    def get(self, request):
        from apps.analytics.services.injiring import menu_engineering
        days = int(request.query_params.get('days', 30))
        data = menu_engineering(request.restaurant_id, days=days)
        return Response({'engineering': data, 'days': days})


class ExportOrdersExcelView(APIView):
    """GET /v1/admin/analytics/export/orders-excel/?days=30"""
    permission_classes = [IsRestAdmin]

    def get(self, request):
        from apps.analytics.exports import export_orders_excel
        days = int(request.query_params.get('days', 30))
        data = export_orders_excel(request.restaurant_id, days=days)
        response = HttpResponse(data, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="orders_{days}d.xlsx"'
        return response


class ExportTopDishesExcelView(APIView):
    """GET /v1/admin/analytics/export/top-dishes-excel/?days=30"""
    permission_classes = [IsRestAdmin]

    def get(self, request):
        from apps.analytics.exports import export_top_dishes_excel
        days = int(request.query_params.get('days', 30))
        data = export_top_dishes_excel(request.restaurant_id, days=days)
        response = HttpResponse(data, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="top_dishes_{days}d.xlsx"'
        return response


class ExportOrdersPDFView(APIView):
    """GET /v1/admin/analytics/export/orders-pdf/?days=30"""
    permission_classes = [IsRestAdmin]

    def get(self, request):
        from apps.analytics.exports import export_orders_pdf
        days = int(request.query_params.get('days', 30))
        data = export_orders_pdf(request.restaurant_id, days=days)
        response = HttpResponse(data, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="orders_{days}d.pdf"'
        return response
