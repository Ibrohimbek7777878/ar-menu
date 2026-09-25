from django.db.models import Count, Q
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.mixins import TenantScopedMixin, SoftDeleteMixin
from core.permissions import IsRestAdmin
from apps.tables.models import Hall, Table
from apps.tables.serializers import (
    HallSerializer, HallPlanSerializer, TableSerializer, TableStatusSerializer)
from apps.tables.qr import table_qr_png, make_qr_svg
from apps.tables.services import create_table, regenerate_qr, broadcast_table_status


class HallViewSet(TenantScopedMixin, SoftDeleteMixin, viewsets.ModelViewSet):
    """Zal CRUD — faqat restoran admini."""
    serializer_class = HallSerializer
    permission_classes = [IsRestAdmin]
    queryset = Hall.objects.all()

    def get_queryset(self):
        return (super().get_queryset()
                .annotate(tables_count=Count('tables', filter=Q(tables__is_active=True)))
                .order_by('order', 'id'))

    @action(detail=True, methods=['get', 'put'], url_path='plan')
    def plan(self, request, pk=None):
        """
        GET  — zal plani + stollar koordinatalari
        PUT  — planni va stollar joyini BIR so'rovda saqlash (V-064)
        """
        hall = self.get_object()

        if request.method == 'GET':
            tables = Table.objects.filter(hall=hall, is_active=True)
            return Response({
                'plan_json': hall.plan_json,
                'tables': TableSerializer(tables, many=True,
                                          context={'request': request}).data,
            })

        ser = HallPlanSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        hall.plan_json = HallSerializer(context={'request': request}).validate_plan_json(
            ser.validated_data['plan_json'])
        hall.save(update_fields=['plan_json', 'updated_at'])

        moved = 0
        for row in ser.validated_data.get('tables', []):
            t = Table.objects.filter(
                id=row.get('id'), hall=hall, restaurant_id=request.restaurant_id).first()
            if not t:
                continue
            for f in ('x', 'y', 'w', 'h', 'rotation'):
                if f in row:
                    setattr(t, f, int(row[f]))
            t.save(update_fields=['x', 'y', 'w', 'h', 'rotation', 'updated_at'])
            moved += 1

        return Response({'ok': True, 'tables_moved': moved})


class TableViewSet(TenantScopedMixin, SoftDeleteMixin, viewsets.ModelViewSet):
    """Stol CRUD + QR."""
    serializer_class = TableSerializer
    permission_classes = [IsRestAdmin]
    queryset = Table.objects.select_related('hall', 'restaurant').all()

    def get_queryset(self):
        qs = super().get_queryset()
        hall = self.request.query_params.get('hall')
        if hall:
            qs = qs.filter(hall_id=hall)
        st = self.request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        if self.request.query_params.get('active') != 'all':
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        d = serializer.validated_data
        t = create_table(
            restaurant_id=self.request.restaurant_id,
            hall_id=d.pop('hall').id,
            number=d.pop('number'),
            **{k: v for k, v in d.items() if k != 'restaurant'},
        )
        serializer.instance = t

    def perform_update(self, serializer):
        t = serializer.save()
        broadcast_table_status(t)

    # --- QR ---

    @action(detail=True, methods=['get'], url_path='qr.png')
    def qr_png(self, request, pk=None):
        t = self.get_object()
        return HttpResponse(table_qr_png(t), content_type='image/png')

    @action(detail=True, methods=['get'], url_path='qr.svg')
    def qr_svg(self, request, pk=None):
        t = self.get_object()
        return HttpResponse(make_qr_svg(t.qr_url), content_type='image/svg+xml')

    @action(detail=True, methods=['post'], url_path='regen-qr')
    def regen_qr(self, request, pk=None):
        """
        ⚡ Yangi QR. Eski token 24 soat ishlaydi (mijoz ovqatlanayotgan bo'lishi mumkin).
        Frontend OLDIN tasdiq so'raydi: "Eski QR 24 soatdan keyin ishlamaydi!"
        """
        t = self.get_object()
        old = str(t.qr_token)
        new = regenerate_qr(t)

        return Response({
            'qr_token': str(new),
            'qr_url': t.qr_url,
            'old_token_valid_until': t.qr_rotated_at.isoformat(),
            'grace_seconds': 24 * 3600,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='qr-pdf')
    def qr_pdf(self, request):
        """
        GET /v1/admin/tables/qr-pdf/?hall=1&layout=a4_6
        layout: a4_1 | a4_2 | a4_4 | a4_6 | stand
        """
        from apps.tables.pdf import build_qr_pdf, LAYOUTS
        from django.utils.text import slugify

        layout = request.query_params.get('layout', 'a4_6')
        if layout not in LAYOUTS and layout != 'stand':
            return Response({'error': {'code': 'VALIDATION_ERROR',
                                       'message_uz': "Noma'lum layout"}}, status=400)

        qs = self.get_queryset().order_by('hall__order', 'number')
        ids = request.query_params.get('ids')
        if ids:
            qs = qs.filter(id__in=[int(i) for i in ids.split(',') if i.isdigit()])

        tables = list(qs[:300])
        if not tables:
            return Response({'error': {'code': 'VALIDATION_ERROR',
                                       'message_uz': 'Stol topilmadi'}}, status=404)

        pdf = build_qr_pdf(tables, layout)

        hall_id = request.query_params.get('hall')
        name = 'qr_codes'
        if hall_id and tables:
            name = f'qr_{slugify(tables[0].hall.name) or "zal"}'

        resp = HttpResponse(pdf, content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename="{name}.pdf"'
        return resp

    @action(detail=True, methods=['post'], url_path='status')
    def change_status(self, request, pk=None):
        """
        POST /v1/admin/tables/{id}/status/  {"status":"cleaning"}
        Noto'g'ri o'tish → 409 INVALID_TRANSITION
        """
        t = self.get_object()
        ser = TableStatusSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        t.set_status(ser.validated_data['status'])   # ⚡ ichida WS yuboriladi
        return Response(TableSerializer(t, context={'request': request}).data)
