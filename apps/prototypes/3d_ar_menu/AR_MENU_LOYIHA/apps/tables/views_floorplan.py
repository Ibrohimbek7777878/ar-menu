import logging
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.mixins import TenantScopedMixin
from core.permissions import IsRestAdmin
from apps.tables.models import FloorPlan
from apps.tables.serializers_floorplan import (
    FloorPlanListSerializer, FloorPlanDetailSerializer)
from apps.tables.services_floorplan import build_live_plan, broadcast_plan_saved

log = logging.getLogger('tables.floorplan')


class FloorPlanViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    """
    GET    /api/v1/floorplans/            — ro'yxat
    GET    /api/v1/floorplans/<id>/       — plan_json bilan
    POST   /api/v1/floorplans/            — yangi zal
    PATCH  /api/v1/floorplans/<id>/       — plan saqlash (version++)
    GET    /api/v1/floorplans/<id>/live/  — ofitsiant uchun holat bilan
    """
    queryset = FloorPlan.objects.all()
    permission_classes = [IsRestAdmin]

    def get_serializer_class(self):
        return (FloorPlanListSerializer if self.action == 'list'
                else FloorPlanDetailSerializer)

    def get_permissions(self):
        from core.permissions import IsStaff
        if self.action == 'live':
            return [IsAuthenticated(), IsStaff()]
        return super().get_permissions()

    @transaction.atomic
    def perform_update(self, serializer):
        obj = serializer.save()
        log.info(f'[plan] saqlandi id={obj.id} v={obj.version} '
                 f'obj={len(obj.objects_list)}')
        transaction.on_commit(lambda: broadcast_plan_saved(obj))

    @action(detail=True, methods=['get'])
    def live(self, request, pk=None):
        """⚡ Plan + har stolning JORIY holati (O-05 uchun)."""
        plan = self.get_object()
        return Response(build_live_plan(plan), status=status.HTTP_200_OK)
