from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product
from .serializers import ProductSerializer, ProductListSerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['shop', 'category', 'is_available', 'is_featured']
    search_fields = ['name', 'brand', 'description']
    ordering_fields = ['price', 'rating', 'total_orders', 'created_at']

    def get_queryset(self):
        # select_related('shop'): ro'yxat serializeri har taom uchun do'kon nomini oladi (S1-6: 20 taomda 22 -> 3 so'rov)
        qs = Product.objects.select_related('shop')
        # Multi-tenant: <mijoz>.PLATFORM_DOMAIN hostida faqat shu restoranning taomlari (boshqa tenant taomi ro'yxatda ham,
        # pk bilan ham ko'rinmaydi: 404)
        from shops.tenancy import current_tenant_id, on_platform_host
        tenant_id = current_tenant_id()
        if tenant_id is not None:
            qs = qs.filter(shop_id=tenant_id)
        elif on_platform_host():
            qs = qs.none()                       # platforma hostida (apex) hech qaysi mijozning taomi ochiq ro'yxatda emas
        if self.request.user.is_authenticated and self.request.user.role in ['super_admin', 'shop_owner', 'operator']:
            return qs
        return qs.filter(is_available=True)

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductSerializer
