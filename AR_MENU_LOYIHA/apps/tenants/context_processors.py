from apps.tenants.models import Restaurant

def tenant_context(request):
    """Admin panelida har bir shablonga mavjud restoranlar va faol restoranni beradi"""
    if not getattr(request, 'user', None) or not request.user.is_authenticated:
        return {}

    if request.user.is_superuser:
        all_rests = Restaurant.objects.filter(is_active=True).order_by('name')
    else:
        s_roles = getattr(request.user, 'staff_roles', None)
        if s_roles:
            r_ids = s_roles.filter(is_active=True).values_list('restaurant_id', flat=True)
            all_rests = Restaurant.objects.filter(id__in=r_ids, is_active=True).order_by('name')
        else:
            all_rests = Restaurant.objects.none()

    active_r = getattr(request, 'restaurant', None)
    return {
        'all_restaurants': all_rests,
        'active_restaurant': active_r,
    }
