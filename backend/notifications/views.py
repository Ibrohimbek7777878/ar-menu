from rest_framework import viewsets, permissions
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.db.models import Avg
from django.http import JsonResponse
from .models import NotificationLog, Banner, Promotion, Review, AppSetting
from .serializers import (
    NotificationLogSerializer, BannerSerializer,
    PromotionSerializer, ReviewSerializer, AppSettingSerializer
)


class NotificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NotificationLog.objects.all()
    serializer_class = NotificationLogSerializer
    permission_classes = [permissions.IsAuthenticated]


class BannerViewSet(viewsets.ModelViewSet):
    queryset = Banner.objects.filter(is_active=True)
    serializer_class = BannerSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.role == 'super_admin':
            return Banner.objects.all()
        return Banner.objects.filter(is_active=True)


class PromotionViewSet(viewsets.ModelViewSet):
    queryset = Promotion.objects.all()
    serializer_class = PromotionSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['get'])
    def active(self, request):
        from django.utils import timezone
        now = timezone.now()
        promotions = Promotion.objects.filter(
            is_active=True, start_date__lte=now, end_date__gte=now
        )
        serializer = PromotionSerializer(promotions, many=True)
        return Response(serializer.data)


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Review.objects.all()
        product_id = self.request.query_params.get('product')
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs

    def perform_create(self, serializer):
        from products.models import Product
        review = serializer.save()
        product = review.product
        product.rating = product.reviews.aggregate(avg=Avg('rating'))['avg'] or 0
        product.reviews_count = product.reviews.count()
        product.save()


class AppSettingViewSet(viewsets.ModelViewSet):
    queryset = AppSetting.objects.all()
    serializer_class = AppSettingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        category = self.request.query_params.get('category')
        qs = AppSetting.objects.all()
        if category:
            qs = qs.filter(category=category)
        return qs


@api_view(['POST'])
def telegram_webhook(request):
    """Telegram bot webhook handler."""
    from .services.telegram_service import handle_webhook
    update = request.data
    result = handle_webhook(update)
    return JsonResponse(result)
