from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.core.cache import cache
from apps.tenants.models import Restaurant
from apps.menu.models import Category, Dish
from apps.tables.models import Table
from apps.orders.models import Order
from apps.ar3d.models import DishModel3D


def _ensure_restaurant(request):
    if hasattr(request, 'restaurant') and request.restaurant:
        return request.restaurant
    rid_session = request.session.get('active_restaurant_id') if hasattr(request, 'session') else None
    if rid_session:
        r = Restaurant.objects.filter(id=rid_session, is_active=True).first()
        if r:
            request.restaurant = r
            request.restaurant_id = r.id
            return r
    r_slug = request.GET.get('r')
    if r_slug:
        r = Restaurant.objects.filter(slug=r_slug, is_active=True).first()
        if r:
            if hasattr(request, 'session'):
                request.session['active_restaurant_id'] = r.id
            request.restaurant = r
            request.restaurant_id = r.id
            return r
    if request.user.is_authenticated:
        s = getattr(request.user, 'staff_roles', None)
        if s:
            staff = s.filter(is_active=True).first()
            if staff and staff.restaurant:
                request.restaurant = staff.restaurant
                request.restaurant_id = staff.restaurant.id
                return staff.restaurant
    r = Restaurant.objects.filter(is_active=True).first()
    if r:
        request.restaurant = r
        request.restaurant_id = r.id
    return r


@login_required(login_url='/django-admin/login/')
def switch_restaurant(request):
    """Admin panelida faol restoran / do'konni almashtirish"""
    if request.method == 'POST':
        rid = request.POST.get('restaurant_id')
        next_url = request.POST.get('next') or request.META.get('HTTP_REFERER') or '/admin/menu/'
        if rid:
            r = get_object_or_404(Restaurant, id=rid, is_active=True)
            request.session['active_restaurant_id'] = r.id
            resp = redirect(next_url)
            resp.set_cookie('active_restaurant_id', str(r.id), max_age=30*86400)
            return resp
    return redirect('/admin/menu/')


@login_required(login_url='/django-admin/login/')
def create_restaurant(request):
    """Yangi restoran yoki do'kon yaratish (multi-tenant)"""
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        slug = request.POST.get('slug', '').strip()
        city = request.POST.get('city', 'Guliston').strip()
        phone = request.POST.get('phone', '+998901234567').strip()
        address = request.POST.get('address', '').strip()
        
        if not slug and name:
            from django.utils.text import slugify
            slug = slugify(name)
            
        import uuid
        from django.utils import timezone
        from datetime import timedelta
        if Restaurant.objects.filter(slug=slug).exists():
            slug = f"{slug}-{uuid.uuid4().hex[:4]}"
            
        r = Restaurant.objects.create(
            name=name,
            slug=slug,
            city=city,
            phone=phone,
            address=address,
            plan='enterprise',
            plan_expires=timezone.now() + timedelta(days=3650),
            ar_model_limit=500,
            table_limit=100,
            is_active=True
        )
        
        from apps.accounts.models import Staff
        Staff.objects.get_or_create(
            user=request.user,
            restaurant=r,
            defaults={'role': 'admin', 'is_active': True}
        )
        
        request.session['active_restaurant_id'] = r.id
        resp = redirect(f'/admin/menu/?r={r.slug}')
        resp.set_cookie('active_restaurant_id', str(r.id), max_age=30*86400)
        return resp
        
    return redirect('/admin/menu/')


@login_required(login_url='/django-admin/login/')
def admin_dashboard_page(request):
    r = _ensure_restaurant(request)
    return render(request, 'admin_panel/dashboard.html', {
        'restaurant': r,
    })


@login_required(login_url='/django-admin/login/')
def admin_branding_page(request):
    r = _ensure_restaurant(request)
    return render(request, 'admin_panel/branding.html', {
        'restaurant': r,
    })


@login_required(login_url='/django-admin/login/')
def admin_settings_page(request):
    r = _ensure_restaurant(request)
    if request.method == 'POST':
        r.name = request.POST.get('name', r.name).strip()[:200]
        r.phone = request.POST.get('phone', r.phone).strip()[:20]
        r.address = request.POST.get('address', r.address).strip()
        try:
            fee = float(request.POST.get('service_fee_pct', r.service_fee_pct))
            if 0 <= fee <= 100:
                r.service_fee_pct = fee
        except (ValueError, TypeError):
            pass
        r.color_primary = request.POST.get('color_primary', r.color_primary).strip()[:7]
        r.color_accent = request.POST.get('color_accent', r.color_accent).strip()[:7]
        r.menu_version += 1
        r.save()
        cache.clear()
        return redirect('/admin/settings/?saved=1')

    return render(request, 'admin_panel/settings.html', {
        'restaurant': r,
        'saved': request.GET.get('saved') == '1'
    })


@login_required(login_url='/django-admin/login/')
def admin_menu_page(request):
    r = _ensure_restaurant(request)
    categories = Category.objects.filter(restaurant=r).prefetch_related('dishes').order_by('order', 'id')
    dishes = Dish.objects.filter(restaurant=r).select_related('category', 'model3d').order_by('order', 'id')
    return render(request, 'admin_panel/menu_manager.html', {
        'restaurant': r,
        'categories': categories,
        'dishes': dishes,
    })


@login_required(login_url='/django-admin/login/')
def admin_tables_page(request):
    r = _ensure_restaurant(request)
    tables = Table.objects.filter(restaurant=r).order_by('number', 'id')
    host = request.get_host()
    proto = 'https' if request.is_secure() else 'http'
    return render(request, 'admin_panel/tables_manager.html', {
        'restaurant': r,
        'tables': tables,
        'base_url': f"{proto}://{host}",
    })


@login_required(login_url='/django-admin/login/')
def admin_ar_page(request):
    r = _ensure_restaurant(request)
    return render(request, 'admin_ui/ar.html', {
        'restaurant': r,
    })
