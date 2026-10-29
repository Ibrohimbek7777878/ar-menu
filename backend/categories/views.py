from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from backend.api_permissions import IsPlatformAdminOrReadOnly
from .models import Category
from .serializers import CategorySerializer, CategoryListSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    """Kategoriya — do'konlararo umumiy taksonomiya: o'qish ochiq, yozish/o'chirish faqat platforma admini."""
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [IsPlatformAdminOrReadOnly]

    def get_queryset(self):
        qs = Category.objects.filter(is_active=True, parent=None)
        return qs.order_by('sort_order')

    def get_serializer_class(self):
        if self.action == 'list':
            return CategoryListSerializer
        return CategorySerializer

    @action(detail=False, methods=['get'])
    def all(self, request):
        categories = Category.objects.filter(is_active=True).order_by('sort_order')
        serializer = CategoryListSerializer(categories, many=True)
        return Response(serializer.data)
