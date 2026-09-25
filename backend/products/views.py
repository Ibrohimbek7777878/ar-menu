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
        if self.request.user.is_authenticated and self.request.user.role in ['super_admin', 'shop_owner', 'operator']:
            return Product.objects.all()
        return Product.objects.filter(is_available=True)

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductSerializer
