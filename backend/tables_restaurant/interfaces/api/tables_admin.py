"""
Restoran Stollar va QR Kodlar Boshqaruvi REST API (Tables Admin API).
Faqat vakolatli restoran xodimlari uchun (o'qish: tables_read, tahrirlash: tables_admin).
Tenant isolation (IDOR himoyasi), Soft-delete va AuditLog qat'iy ta'minlanadi.
"""
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response

from backend.api_input import (
    InputError,
    RestoAdminAPIView,
    parse_choice,
    parse_id,
    parse_int,
    parse_text,
    query_flag,
    query_id,
    query_text,
)
from orders.audit import log_audit
from orders.interfaces.api.permissions import (
    RESTAURANT_API_AUTHENTICATION,
    capability,
)
from orders.models import Order
from tables_restaurant.models import Hall, Table
from tables_restaurant.qr import qr_base_url, qr_svg
from web.restaurant_auth import staff_shop


STATUS_LABELS = {
    'free': "Bo'sh",
    'occupied': 'Band',
    'ordering': 'Buyurtma',
    'waiting': 'Kutmoqda',
    'ready': 'Tayyor',
    'bill': 'Hisob',
    'cleaning': 'Tozalanmoqda',
}


def _serialize_table(t, bill_sum=0, active_count=0, request=None):
    base_url = qr_base_url(request) if request else ''
    full_qr_url = f"{base_url}{t.qr_path}" if base_url else t.qr_path
    return {
        'id': t.id,
        'number': t.number,
        'hall_id': t.hall_id,
        'hall_name': t.hall.name if t.hall else 'Asosiy Zal',
        'capacity': t.capacity,
        'shape': t.shape or 'rect',
        'status': t.status,
        'status_display': STATUS_LABELS.get(t.status, t.status),
        'total_bill': float(bill_sum),
        'active_orders_count': active_count,
        'qr_token': str(t.qr_token),
        'qr_path': t.qr_path,
        'qr_url': full_qr_url,
        'qr_svg_url': f'/api/restaurant/admin/v1/tables/{t.id}/qr.svg',
        'is_active': bool(t.is_active),
        'is_deleted': bool(t.is_deleted),
        'deleted_at': t.deleted_at.isoformat() if t.deleted_at else None,
    }


def _serialize_hall(h, tables_count=0):
    return {
        'id': h.id,
        'name': h.name,
        'name_ru': h.name_ru or '',
        'name_en': h.name_en or '',
        'order': h.order,
        'tables_count': tables_count,
        'is_active': bool(h.is_active),
    }


class TablesListCreateView(RestoAdminAPIView):
    """
    GET /api/restaurant/admin/v1/tables/ — Stollar ro'yxati, zallar va umumiy hisob-kitoblar.
    POST /api/restaurant/admin/v1/tables/ — Yangi stol yaratish.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION

    def get_permissions(self):
        if self.request.method == 'GET':
            return [capability('tables_read')()]
        return [capability('tables_admin')()]

    def get(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        include_deleted = query_flag(request, 'include_deleted')
        hall_id = query_id(request, 'hall_id')
        table_status = query_text(request, 'status', 20)
        query = query_text(request, 'q', 20)

        # Manager tanlovi: o'chirilganlarni ko'rsatish yoki faqat faollar
        qs = Table.all_objects if include_deleted else Table.objects
        tables_qs = qs.select_related('hall').filter(shop=shop)

        if hall_id:
            tables_qs = tables_qs.filter(hall_id=hall_id)

        if table_status:
            tables_qs = tables_qs.filter(status=table_status)

        if query:
            tables_qs = tables_qs.filter(number__icontains=query)

        tables = list(tables_qs.order_by('hall__order', 'id'))

        # Batch query: stollarning to'lanmagan hisoblarini 1 ta queryda hisoblash (N+1 muammosiga qarshi)
        table_ids = [t.id for t in tables]
        bills_map = {}
        if table_ids:
            unpaid_orders = (
                Order.objects.filter(table_id__in=table_ids, payment_status='unpaid')
                .exclude(status__in=['cancelled', 'failed'])
                .values('table_id')
                .annotate(
                    total_bill=Sum('final_amount'),
                    active_count=Count('id')
                )
            )
            for row in unpaid_orders:
                bills_map[row['table_id']] = (row['total_bill'] or 0, row['active_count'] or 0)

        serialized_tables = []
        counts = {'total': 0, 'free': 0, 'occupied': 0, 'bill': 0, 'cleaning': 0, 'deleted': 0}

        for t in tables:
            bill_sum, active_cnt = bills_map.get(t.id, (0, 0))
            serialized_tables.append(_serialize_table(t, bill_sum, active_cnt, request))

            counts['total'] += 1
            if t.is_deleted:
                counts['deleted'] += 1
            elif t.status in counts:
                counts[t.status] += 1

        # Zallar ro'yxati va har bir zaldagi stollar soni
        halls_qs = (
            Hall.objects.filter(shop=shop, is_active=True)
            .annotate(active_tables=Count('tables', filter=Q(tables__is_deleted=False)))
            .order_by('order', 'id')
        )
        serialized_halls = [_serialize_hall(h, h.active_tables) for h in halls_qs]

        return Response({
            'items': serialized_tables,
            'halls': serialized_halls,
            'summary': counts,
        })

    def post(self, request):
        shop = staff_shop(request)
        if not shop:
            return Response({'error': 'Restoran topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        number = parse_text(request.data.get('number'), 'number', max_length=20, required=True)

        # Takrorlanmaslik tekshiruvi (shop doirasida)
        existing = Table.all_objects.filter(shop=shop, number=number).first()
        if existing:
            if existing.is_deleted:
                return Response({
                    'error': f'"{number}" raqamli stol arxivda mavjud. Uni tiklash mumkin.',
                    'field': 'number',
                    'existing_id': existing.id,
                    'is_deleted': True
                }, status=status.HTTP_400_BAD_REQUEST)
            return Response({
                'error': f'"{number}" raqamli stol allaqachon mavjud',
                'field': 'number'
            }, status=status.HTTP_400_BAD_REQUEST)

        hall_id = parse_id(request.data.get('hall_id'), 'hall_id')
        hall = None
        if hall_id:
            hall = Hall.objects.filter(id=hall_id, shop=shop, is_active=True).first()
            if not hall:
                raise InputError("Zal topilmadi", 'hall_id')
        else:
            # Agar zal berilmagan bo'lsa, birinchi faol zal yoki "Asosiy Zal" ni topamiz/yaratamiz
            hall = Hall.objects.filter(shop=shop, is_active=True).first()
            if not hall:
                hall = Hall.objects.create(shop=shop, name='Asosiy Zal', order=0)

        capacity = parse_int(request.data.get('capacity', 4), 'capacity', minimum=1, maximum=100)
        shape = parse_choice(request.data.get('shape', 'rect'), 'shape', ('rect', 'round'))

        with transaction.atomic():
            table = Table.objects.create(
                shop=shop,
                hall=hall,
                number=number,
                capacity=capacity,
                shape=shape,
                status='free',
                is_active=True,
                is_deleted=False,
            )
            log_audit(
                'table_created',
                request=request,
                actor=request.user,
                target_type='table',
                target_id=table.id,
                new_value={
                    'number': table.number,
                    'hall_id': hall.id,
                    'capacity': capacity,
                    'shape': shape,
                }
            )

        return Response(_serialize_table(table, 0, 0, request), status=status.HTTP_201_CREATED)


class TableDetailUpdateDeleteView(RestoAdminAPIView):
    """
    PATCH /api/restaurant/admin/v1/tables/<pk>/ — Stolni yangilash.
    DELETE /api/restaurant/admin/v1/tables/<pk>/ — Stolni arxivlash (Soft delete).
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('tables_admin')]

    def patch(self, request, pk):
        shop = staff_shop(request)
        table = get_object_or_404(Table.all_objects.select_related('hall'), pk=pk, shop=shop)

        data = request.data
        old_val = {
            'number': table.number,
            'hall_id': table.hall_id,
            'capacity': table.capacity,
            'shape': table.shape,
            'status': table.status,
        }

        update_fields = []

        if 'number' in data:
            new_num = parse_text(data['number'], 'number', max_length=20, required=True)
            if new_num != table.number:
                if Table.all_objects.filter(shop=shop, number=new_num).exclude(pk=pk).exists():
                    return Response({'error': f'"{new_num}" raqamli stol allaqachon mavjud', 'field': 'number'}, status=status.HTTP_400_BAD_REQUEST)
                table.number = new_num
                update_fields.append('number')

        if 'hall_id' in data:
            hall = Hall.objects.filter(pk=parse_id(data['hall_id'], 'hall_id', allow_none=False), shop=shop, is_active=True).first()
            if not hall:
                raise InputError("Zal topilmadi", 'hall_id')
            table.hall = hall
            update_fields.append('hall')

        if 'capacity' in data:
            table.capacity = parse_int(data['capacity'], 'capacity', minimum=1, maximum=100)
            update_fields.append('capacity')

        if 'shape' in data:
            table.shape = parse_choice(data['shape'], 'shape', ('rect', 'round'))
            update_fields.append('shape')

        if 'status' in data:
            table.status = parse_choice(data['status'], 'status', tuple(STATUS_LABELS))
            update_fields.append('status')

        if update_fields:
            table.save(update_fields=update_fields)
            log_audit(
                'table_updated',
                request=request,
                actor=request.user,
                target_type='table',
                target_id=table.id,
                old_value=old_val,
                new_value={f: getattr(table, f if f != 'hall' else 'hall_id') for f in update_fields}
            )

        return Response(_serialize_table(table, 0, 0, request))

    def delete(self, request, pk):
        shop = staff_shop(request)
        table = get_object_or_404(Table.objects, pk=pk, shop=shop)

        # Soft Delete: bazadan o'chirilmaydi, is_deleted=True, is_active=False
        table.is_deleted = True
        table.is_active = False
        table.deleted_at = timezone.now()
        table.save(update_fields=['is_deleted', 'is_active', 'deleted_at'])

        log_audit(
            'table_deleted',
            request=request,
            actor=request.user,
            target_type='table',
            target_id=table.id,
            old_value={'number': table.number, 'is_deleted': False},
            new_value={'is_deleted': True}
        )

        return Response({'status': 'deleted', 'id': table.id, 'number': table.number})


class TableRestoreView(RestoAdminAPIView):
    """
    POST /api/restaurant/admin/v1/tables/<pk>/restore/ — Arxivlangan stolni qayta tiklash.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('tables_admin')]

    def post(self, request, pk):
        shop = staff_shop(request)
        table = get_object_or_404(Table.all_objects, pk=pk, shop=shop, is_deleted=True)

        table.is_deleted = False
        table.is_active = True
        table.deleted_at = None
        table.save(update_fields=['is_deleted', 'is_active', 'deleted_at'])

        log_audit(
            'table_restored',
            request=request,
            actor=request.user,
            target_type='table',
            target_id=table.id,
            old_value={'is_deleted': True},
            new_value={'is_deleted': False}
        )

        return Response({'status': 'restored', 'id': table.id, 'number': table.number})


class TableStatusUpdateView(RestoAdminAPIView):
    """
    POST /api/restaurant/admin/v1/tables/<pk>/status/ — Stol holatini 1-klikda o'zgartirish.
    (Ofitsiant, pos yoki admin darajasida ruxsat beriladi)
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('tables_read')]

    def post(self, request, pk):
        shop = staff_shop(request)
        table = get_object_or_404(Table.objects, pk=pk, shop=shop)

        new_status = parse_choice(request.data.get('status'), 'status', tuple(STATUS_LABELS))

        old_status = table.status
        table.status = new_status
        table.save(update_fields=['status'])

        log_audit(
            'table_status_changed',
            request=request,
            actor=request.user,
            target_type='table',
            target_id=table.id,
            old_value={'status': old_status},
            new_value={'status': new_status}
        )

        return Response({
            'id': table.id,
            'status': table.status,
            'status_display': STATUS_LABELS.get(table.status, table.status)
        })


class TableRotateQrView(RestoAdminAPIView):
    """
    POST /api/restaurant/admin/v1/tables/<pk>/rotate-qr/ — Stol QR tokenini yangilash.
    Eski token 24 soat grace davrida ishlaydi, yangi QR generatsiya bo'ladi.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('tables_admin')]

    def post(self, request, pk):
        shop = staff_shop(request)
        table = get_object_or_404(Table.all_objects, pk=pk, shop=shop)

        old_token = str(table.qr_token)
        new_token = table.rotate_qr()

        log_audit(
            'table_qr_rotated',
            request=request,
            actor=request.user,
            target_type='table',
            target_id=table.id,
            old_value={'qr_token': old_token},
            new_value={'qr_token': str(new_token)}
        )

        base_url = qr_base_url(request)
        return Response({
            'id': table.id,
            'qr_token': str(new_token),
            'qr_path': table.qr_path,
            'qr_url': f"{base_url}{table.qr_path}" if base_url else table.qr_path,
            'qr_svg_url': f'/api/restaurant/admin/v1/tables/{table.id}/qr.svg',
        })


class TableQrSvgView(RestoAdminAPIView):
    """
    GET /api/restaurant/admin/v1/tables/<pk>/qr.svg — Serverda xavfsiz chizilgan vektorli SVG QR kod.
    Tashqi serverlarga bog'liqlik yo'q (segno).
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('tables_read')]

    def get(self, request, pk):
        shop = staff_shop(request)
        table = get_object_or_404(Table.all_objects, pk=pk, shop=shop)

        base_url = qr_base_url(request)
        target_url = f"{base_url}{table.qr_path}"
        svg_bytes = qr_svg(target_url)

        response = HttpResponse(svg_bytes, content_type='image/svg+xml')
        response['Cache-Control'] = 'private, max-age=3600'
        return response


class HallListCreateView(RestoAdminAPIView):
    """
    GET /api/restaurant/admin/v1/tables/halls/ — Zallar ro'yxati.
    POST /api/restaurant/admin/v1/tables/halls/ — Yangi zal yaratish.
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION

    def get_permissions(self):
        if self.request.method == 'GET':
            return [capability('tables_read')()]
        return [capability('tables_admin')()]

    def get(self, request):
        shop = staff_shop(request)
        halls = (
            Hall.objects.filter(shop=shop, is_active=True)
            .annotate(tables_count=Count('tables', filter=Q(tables__is_deleted=False)))
            .order_by('order', 'id')
        )
        return Response([_serialize_hall(h, h.tables_count) for h in halls])

    def post(self, request):
        shop = staff_shop(request)
        name = parse_text(request.data.get('name'), 'name', max_length=100, required=True)
        order = parse_int(request.data.get('order', 0), 'order')

        hall = Hall.objects.create(
            shop=shop,
            name=name,
            order=order,
            is_active=True
        )

        log_audit(
            'hall_created',
            request=request,
            actor=request.user,
            target_type='hall',
            target_id=hall.id,
            new_value={'name': hall.name, 'order': hall.order}
        )

        return Response(_serialize_hall(hall, 0), status=status.HTTP_201_CREATED)


class HallDetailUpdateDeleteView(RestoAdminAPIView):
    """
    PATCH /api/restaurant/admin/v1/tables/halls/<pk>/ — Zalni yangilash.
    DELETE /api/restaurant/admin/v1/tables/halls/<pk>/ — Zalni o'chirish (is_active=False).
    """
    authentication_classes = RESTAURANT_API_AUTHENTICATION
    permission_classes = [capability('tables_admin')]

    def patch(self, request, pk):
        shop = staff_shop(request)
        hall = get_object_or_404(Hall, pk=pk, shop=shop)

        data = request.data
        if 'name' in data:
            hall.name = parse_text(data['name'], 'name', max_length=100, required=True)
        if 'order' in data:
            hall.order = parse_int(data['order'], 'order')

        hall.save(update_fields=['name', 'order'])
        return Response(_serialize_hall(hall, hall.tables.filter(is_deleted=False).count()))

    def delete(self, request, pk):
        shop = staff_shop(request)
        hall = get_object_or_404(Hall, pk=pk, shop=shop)

        # Soft delete: zaldagi stollar mavjud bo'lsa ogohlantirish yoki faqat is_active=False
        active_tables = hall.tables.filter(is_deleted=False).count()
        if active_tables > 0:
            return Response({
                'error': f'Ushbu zalda {active_tables} ta faol stol mavjud. Avval stollarni boshqa zalga ko\'chiring yoki arxivlang.'
            }, status=status.HTTP_400_BAD_REQUEST)

        hall.is_active = False
        hall.save(update_fields=['is_active'])

        log_audit(
            'hall_deleted',
            request=request,
            actor=request.user,
            target_type='hall',
            target_id=hall.id,
            old_value={'is_active': True},
            new_value={'is_active': False}
        )

        return Response({'status': 'deleted', 'id': hall.id})
