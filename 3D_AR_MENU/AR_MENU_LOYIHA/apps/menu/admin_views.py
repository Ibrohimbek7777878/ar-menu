"""
⚡ Restoran admin paneli API. HAR ViewSet:
   - TenantScopedMixin (queryset filtri)
   - IsRestAdmin (rol)
   - AuditLog (o'zgarish yozuvi)
"""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from core.mixins import TenantScopedMixin
from core.permissions import IsRestAdmin, IsStaff
from apps.analytics.models import AuditLog
from apps.tenants.services import check_limit
from apps.menu.models import Category, Dish, DishModifier, UpsellRule
from apps.menu.serializers import (CategoryAdminSerializer, DishAdminSerializer,
                                   ModifierAdminSerializer, UpsellAdminSerializer)

log = logging.getLogger('menu.admin')


class ReorderMixin:
    """
    ⚡ POST .../reorder/  {"order": [12, 7, 3, 19]}
    Bitta so'rovda barcha tartib yangilanadi (bulk_update — N ta UPDATE emas).
    """
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        ids = request.data.get('order') or []
        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'order — id ro\'yxati bo\'lishi kerak'},
                            status=400)
        if len(ids) > 500:
            return Response({'detail': 'Bir marta maks 500 ta'}, status=400)

        qs = self.get_queryset().filter(id__in=ids)      # ⚡ tenant-scoped
        found = {o.id: o for o in qs}
        missing = [i for i in ids if i not in found]
        if missing:
            return Response({'error': {
                'code': 'TENANT_MISMATCH',
                'message_uz': 'Ba\'zi elementlar sizning restoraningizga tegishli emas',
                'message_ru': 'Некоторые элементы не принадлежат вашему ресторану',
                'message_en': 'Some items do not belong to your restaurant',
                'details': {'ids': missing},
            }}, status=403)

        from django.db import transaction as db_transaction
        with db_transaction.atomic():
            for pos, oid in enumerate(ids, start=1):
                found[oid].order = pos
            self.get_queryset().model.objects.bulk_update(found.values(), ['order'])

        AuditLog.log(action=f'{self.audit_model}.reorder', model=self.audit_model,
                     new={'count': len(ids)}, request=request)
        return Response({'ok': True, 'count': len(ids)})


class AuditedModelViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    """⚡ Har CRUD amalini AuditLog'ga yozadigan baza ViewSet"""
    audit_model = ''

    def perform_create(self, serializer):
        obj = serializer.save(restaurant_id=self.request.restaurant_id)
        AuditLog.log(action=f'{self.audit_model}.create', model=self.audit_model,
                     object_id=obj.pk, new=serializer.data, request=self.request)
        return obj

    def perform_update(self, serializer):
        old = AuditLog.diff(serializer.instance,
                            [f for f in serializer.fields
                             if f in {fl.name for fl in serializer.instance._meta.fields}])
        obj = serializer.save()
        AuditLog.log(action=f'{self.audit_model}.update', model=self.audit_model,
                     object_id=obj.pk, old=old, new=serializer.data,
                     request=self.request)
        return obj

    def perform_destroy(self, instance):
        AuditLog.log(action=f'{self.audit_model}.delete', model=self.audit_model,
                     object_id=instance.pk, request=self.request)
        instance.delete()


class CategoryViewSet(ReorderMixin, AuditedModelViewSet):
    """
    CRUD /v1/admin/categories/
    """
    serializer_class = CategoryAdminSerializer
    permission_classes = [IsRestAdmin]
    queryset = Category.objects.all()
    audit_model = 'Category'

    def get_queryset(self):
        return super().get_queryset().order_by('order', 'id')

    def perform_create(self, serializer):
        obj = super().perform_create(serializer)
        if obj.image:
            from apps.menu.services.images import process_category_image
            try:
                process_category_image(obj)
            except Exception as e:
                log.warning(f'[cat] rasm optimizatsiya xatosi: {e}')

    def destroy(self, request, *args, **kwargs):
        """⛔ Ichida taom bo'lsa o'chirilmaydi — arxivlash taklif qilinadi"""
        obj = self.get_object()
        n = obj.dishes.count()
        if n:
            return Response({'error': {
                'code': 'CATEGORY_NOT_EMPTY',
                'message_uz': f'Kategoriyada {n} ta taom bor. Avval ularni ko\'chiring.',
                'message_ru': f'В категории {n} блюд. Сначала перенесите их.',
                'message_en': f'Category has {n} dishes. Move them first.',
            }}, status=status.HTTP_409_CONFLICT)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        """POST /v1/admin/categories/{id}/toggle/ — faol/nofaol"""
        obj = self.get_object()
        obj.is_active = not obj.is_active
        obj.save(update_fields=['is_active', 'updated_at'])
        AuditLog.log(action='Category.toggle', model='Category', object_id=obj.pk,
                     new={'is_active': obj.is_active}, request=request)
        return Response({'id': obj.id, 'is_active': obj.is_active})


class DishViewSet(ReorderMixin, AuditedModelViewSet):
    """
    CRUD /v1/admin/dishes/
    ?category=1&is_available=true&search=osh&ordering=-price
    """
    serializer_class = DishAdminSerializer
    permission_classes = [IsRestAdmin]
    queryset = Dish.objects.all()
    audit_model = 'Dish'
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filter_backends = []
    try:
        from django_filters.rest_framework import DjangoFilterBackend
        from rest_framework.filters import SearchFilter, OrderingFilter
        filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    except ImportError:
        pass
    filterset_fields = ['category', 'is_available', 'is_hit', 'is_new', 'has_3d']
    search_fields = ['name_uz', 'name_ru', 'name_en', 'ikpu_code']
    ordering_fields = ['order', 'price', 'sold_count', 'rating_avg', 'created_at']
    ordering = ['order', 'id']

    def get_queryset(self):
        return (super().get_queryset()
                .select_related('category')
                .prefetch_related('modifiers'))

    def perform_create(self, serializer):
        # ⚡ Tarif limiti
        check_limit(self.request.restaurant, 'dish')
        obj = serializer.save(restaurant_id=self.request.restaurant_id)
        AuditLog.log(action='Dish.create', model='Dish', object_id=obj.pk,
                     new={'name': obj.name_uz, 'price': str(obj.price)},
                     request=self.request)
        self._process_image(obj)
        return obj

    def perform_update(self, serializer):
        inst = serializer.instance
        old = {'price': str(inst.price), 'is_available': inst.is_available,
               'name_uz': inst.name_uz}
        obj = serializer.save()
        AuditLog.log(action='Dish.update', model='Dish', object_id=obj.pk,
                     old=old, new={'price': str(obj.price),
                                   'is_available': obj.is_available,
                                   'name_uz': obj.name_uz},
                     request=self.request)
        if 'image' in self.request.FILES:
            self._process_image(obj)
        return obj

    def perform_destroy(self, instance):
        from apps.menu.services.images import delete_dish_images
        AuditLog.log(action='Dish.delete', model='Dish', object_id=instance.pk,
                     old={'name': instance.name_uz}, request=self.request)
        delete_dish_images(instance)
        instance.delete()

    @staticmethod
    def _process_image(obj):
        if not obj.image:
            return
        from apps.menu.services.images import process_dish_image
        try:
            process_dish_image(obj)
        except Exception as e:
            log.warning(f'[dish] rasm optimizatsiya xatosi dish#{obj.pk}: {e}')

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """GET /v1/admin/dishes/stats/ — qisqacha ko'rsatkichlar"""
        qs = self.get_queryset()
        return Response({
            'total': qs.count(),
            'available': qs.filter(is_available=True).count(),
            'stopped': qs.filter(is_available=False).count(),
            'with_3d': qs.filter(has_3d=True).count(),
            'no_image': qs.filter(image_webp='').count(),
            'no_ikpu': qs.filter(ikpu_code='').count(),
        })

    @action(detail=True, methods=['post'],
            permission_classes=[])
    def stop(self, request, pk=None):
        """
        POST /v1/admin/dishes/{id}/stop/  {"minutes": 60}
        ⚡ Ofitsiant/oshpaz ham stop qila oladi (taom tugab qolsa).
        minutes berilsa — shu vaqtdan keyin avtomatik qaytadi.
        """
        if not IsStaff().has_permission(request, self):
            return Response({'detail': 'Ruxsat yo\'q'}, status=403)

        dish = self.get_object()
        minutes = int(request.data.get('minutes') or 0)

        dish.is_available = False
        dish.stop_until = None
        fields = ['is_available', 'stop_until', 'updated_at']
        if minutes > 0:
            from django.utils import timezone
            from datetime import timedelta
            dish.stop_until = timezone.now() + timedelta(minutes=min(minutes, 24 * 60))
        dish.save(update_fields=fields)

        AuditLog.log(action='Dish.stop', model='Dish', object_id=dish.pk,
                     new={'minutes': minutes}, request=request)

        # ⚡ Barcha ochiq menyularga darhol xabar
        from core.ws import ws_send, g_admin, g_waiters, g_kds
        payload = {'dish_id': dish.pk, 'name': dish.name_uz, 'available': False,
                   'until': dish.stop_until.isoformat() if dish.stop_until else None}
        for g in (g_admin(dish.restaurant_id), g_waiters(dish.restaurant_id),
                  g_kds(dish.restaurant_id)):
            ws_send(g, 'dish.stopped', payload)

        log.info(f'[stop] dish#{dish.pk} STOP {minutes or "∞"} daq')
        return Response({'id': dish.pk, 'is_available': False,
                         'stop_until': dish.stop_until})

    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """POST /v1/admin/dishes/{id}/resume/ — stop-listdan chiqarish"""
        if not IsStaff().has_permission(request, self):
            return Response({'detail': 'Ruxsat yo\'q'}, status=403)

        dish = self.get_object()
        dish.is_available = True
        dish.stop_until = None
        dish.save(update_fields=['is_available', 'stop_until', 'updated_at'])

        AuditLog.log(action='Dish.resume', model='Dish', object_id=dish.pk,
                     request=request)

        from core.ws import ws_send, g_admin, g_waiters, g_kds
        payload = {'dish_id': dish.pk, 'name': dish.name_uz, 'available': True}
        for g in (g_admin(dish.restaurant_id), g_waiters(dish.restaurant_id),
                  g_kds(dish.restaurant_id)):
            ws_send(g, 'dish.resumed', payload)
        return Response({'id': dish.pk, 'is_available': True})

    @action(detail=False, methods=['post'], url_path='bulk-import',
            parser_classes=[MultiPartParser, FormParser])
    def bulk_import(self, request):
        """
        POST /v1/admin/dishes/bulk-import/  (multipart: file, dry_run)
        ⚡ dry_run=1 → faqat tekshiradi, yozmaydi (oldindan ko'rish).
        """
        from apps.menu.services.importer import parse_file, import_menu
        f = request.FILES.get('file')
        if f is None:
            return Response({'detail': 'file kerak'}, status=400)
        if f.size > 5 * 1024 * 1024:
            return Response({'detail': 'Fayl 5 MB dan katta'}, status=400)

        rows, errors = parse_file(f, f.name)
        if errors and not rows:
            return Response({'ok': False, 'errors': errors}, status=400)

        if str(request.data.get('dry_run', '')) in ('1', 'true', 'True'):
            return Response({'ok': True, 'dry_run': True, 'rows': len(rows),
                             'errors': errors, 'preview': rows[:10]})

        check_limit(request.restaurant, 'dish', add=len(rows))
        result = import_menu(request.restaurant, rows)
        AuditLog.log(action='Dish.bulk_import', model='Dish',
                     new=result, request=request)
        return Response({'ok': True, 'errors': errors, **result})

    @action(detail=False, methods=['get'], url_path='fiscal-readiness')
    def fiscal_readiness(self, request):
        """GET /v1/admin/dishes/fiscal-readiness/"""
        from apps.menu.validators import check_fiscal_readiness
        return Response(check_fiscal_readiness(request.restaurant))

    @action(detail=False, methods=['get'], url_path='ikpu-search')
    def ikpu_search(self, request):
        """GET /v1/admin/dishes/ikpu-search/?q=osh"""
        from apps.fiscal.services.ikpu import search_ikpu
        return Response(search_ikpu(request.GET.get('q', '')))

    @action(detail=True, methods=['get'], url_path='ikpu-suggest')
    def ikpu_suggest(self, request, pk=None):
        """GET /v1/admin/dishes/{id}/ikpu-suggest/"""
        from apps.fiscal.services.ikpu import suggest_for_dish
        return Response({'dish': self.get_object().name_uz,
                         'suggestions': suggest_for_dish(self.get_object())})


class ModifierViewSet(AuditedModelViewSet):
    """CRUD /v1/admin/modifiers/?dish=15"""
    serializer_class = ModifierAdminSerializer
    permission_classes = [IsRestAdmin]
    queryset = DishModifier.objects.all()
    audit_model = 'DishModifier'
    filter_backends = []
    try:
        from django_filters.rest_framework import DjangoFilterBackend
        filter_backends = [DjangoFilterBackend]
    except ImportError:
        pass
    filterset_fields = ['dish', 'group', 'is_active']

    def perform_create(self, serializer):
        dish = serializer.validated_data['dish']
        if dish.restaurant_id != self.request.restaurant_id:
            from core.exceptions import TenantMismatch
            raise TenantMismatch({'dish': dish.id})       # ⚡ cross-tenant blok
        return super().perform_create(serializer)


class UpsellViewSet(AuditedModelViewSet):
    """
    CRUD /v1/admin/upsell/
    ⚡ trigger_dishes va suggest_dish SHU restoranga tegishli bo'lishi SHART.
    """
    serializer_class = UpsellAdminSerializer
    permission_classes = [IsRestAdmin]
    queryset = UpsellRule.objects.all()
    audit_model = 'UpsellRule'

    def get_queryset(self):
        return (super().get_queryset()
                .select_related('suggest_dish', 'trigger_category')
                .prefetch_related('trigger_dishes')
                .order_by('-priority', 'id'))

    def _check_tenant(self, data):
        from core.exceptions import TenantMismatch
        rid = self.request.restaurant_id
        sug = data.get('suggest_dish')
        if sug is not None and sug.restaurant_id != rid:
            raise TenantMismatch({'suggest_dish': sug.id})
        for d in (data.get('trigger_dishes') or []):
            if d.restaurant_id != rid:
                raise TenantMismatch({'trigger_dish': d.id})
        cat = data.get('trigger_category')
        if cat is not None and cat.restaurant_id != rid:
            raise TenantMismatch({'trigger_category': cat.id})

    def perform_create(self, serializer):
        self._check_tenant(serializer.validated_data)
        return super().perform_create(serializer)

    def perform_update(self, serializer):
        self._check_tenant(serializer.validated_data)
        return super().perform_update(serializer)

    @action(detail=False, methods=['get'])
    def performance(self, request):
        """
        GET /v1/admin/upsell/performance/
        ⚡ Qaysi qoida ishlayapti — ko'rsatildi / qabul qilindi / %
        """
        rows = []
        for r in self.get_queryset():
            rows.append({
                'id': r.id,
                'suggest': r.suggest_dish.name_uz,
                'text': r.text_uz,
                'shown': r.shown_count,
                'accepted': r.accepted_count,
                'accept_rate': r.accept_rate,
                'is_active': r.is_active,
            })
        rows.sort(key=lambda x: -x['accept_rate'])
        return Response({'count': len(rows), 'rules': rows})

    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        obj = self.get_object()
        obj.is_active = not obj.is_active
        obj.save(update_fields=['is_active', 'updated_at'])
        return Response({'id': obj.id, 'is_active': obj.is_active})
