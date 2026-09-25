from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import login_view, register_view, profile_view, AdminUserViewSet, CustomerViewSet

router = DefaultRouter()
router.register(r'admins', AdminUserViewSet)
router.register(r'customers', CustomerViewSet)

urlpatterns = [
    path('auth/login/', login_view, name='login'),
    path('auth/register/', register_view, name='register'),
    path('auth/profile/', profile_view, name='profile'),
    path('', include(router.urls)),
]
