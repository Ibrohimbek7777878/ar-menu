from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Shop
from .serializers import ShopSerializer, ShopListSerializer


class IsOwnerOrSuperAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'super_admin':
            return True
        if request.user.role == 'shop_owner':
            return obj.owner_id == request.user.id
        return False


class ShopViewSet(viewsets.ModelViewSet):
    queryset = Shop.objects.all()
    serializer_class = ShopSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_open', 'is_featured', 'is_verified']
    search_fields = ['name', 'address']
    ordering_fields = ['rating', 'created_at']
    lookup_field = 'slug'

    def get_queryset(self):
        # Multi-tenant: <mijoz>.PLATFORM_DOMAIN hostida faqat shu restoran (boshqa tenantlar ro'yxati/slug orqali ko'rinmaydi)
        from shops.tenancy import current_tenant_id, on_platform_host
        tenant_id = current_tenant_id()
        qs = Shop.objects.all().order_by('pk')
        if tenant_id is not None:
            return qs.filter(pk=tenant_id)
        return qs.none() if on_platform_host() else qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ShopListSerializer
        return ShopSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsOwnerOrSuperAdmin()]

    @action(detail=True, methods=['get'])
    def products(self, request, slug=None):
        shop = self.get_object()
        products = shop.products.filter(is_available=True)
        from products.serializers import ProductListSerializer
        serializer = ProductListSerializer(products, many=True)
        return Response(serializer.data)
