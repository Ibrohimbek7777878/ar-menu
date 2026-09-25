from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import AdminUser, Customer
from .serializers import (
    AdminUserSerializer, RegisterSerializer, LoginSerializer,
    CustomerSerializer, CustomerCreateSerializer
)


class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'super_admin'
        )


class IsAdminOrSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ['super_admin', 'shop_owner', 'shop_manager', 'support']
        )


class IsShopOwner(permissions.BasePermission):
    """Object-level: faqat o'z do'konini boshqarish ruxsati."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        shop = getattr(obj, 'shop', None)
        if shop is None and hasattr(obj, 'owner'):
            shop = obj.owner
        if request.user.role == 'super_admin':
            return True
        if shop is None:
            return False
        return shop == request.user.shop


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data['user']
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': AdminUserSerializer(user).data,
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': AdminUserSerializer(user).data,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def profile_view(request):
    return Response(AdminUserSerializer(request.user).data)


class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = AdminUser.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsSuperAdmin]

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        user = self.get_object()
        user.is_approved = True
        user.save()
        return Response({'status': 'tasdiqlandi'})

    @action(detail=True, methods=['post'])
    def block(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response({'status': 'bloklandi'})


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAdminOrSuperAdmin]
    search_fields = ['name', 'phone']

    def get_serializer_class(self):
        if self.action == 'create':
            return CustomerCreateSerializer
        return CustomerSerializer
