import logging
logger = logging.getLogger(__name__)
from datetime import timedelta
from django.contrib import messages
from django.conf import settings
from django.db.models import Avg, Sum, Q, Count
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from web.seller_decorators import seller_required
from django.views.decorators.clickjacking import xframe_options_exempt
from shops.models import Shop, ShopPage, SHOP_SECTION_TYPES
from products.models import Product
from orders.models import Order, OrderItem
from accounts.models import Customer, AdminUser
from notifications.models import TelegramSubscriber
from categories.models import Category
from django.contrib.auth import authenticate, login
def seller_3d_studio(request):
    """
    Mahsulot #3: 3D Studio & Chop Etish Navbati (Print Queue).
    3D printer buyurtmalarini ko'rish, holatini o'zgartirish va boshqarish.
    """
    from ar3d.models import Print3DOrder, Print3DProduct, Print3DMaterial
    from notifications.services.print3d_notification_service import notify_customer_3d_order_ready
    from notifications.telegram_bot import send_message

    shop = getattr(request, 'tenant_shop', None)

    if request.method == 'POST':
        action = request.POST.get('action')
        order_id = request.POST.get('order_id')
        if action == 'update_status' and order_id:
            new_status = request.POST.get('status')
            order = Print3DOrder.objects.filter(id=order_id).first()
            if order and new_status in dict(Print3DOrder.STATUS_CHOICES):
                order.status = new_status
                order.save(update_fields=['status', 'updated_at'])
                messages.success(request, f"Buyurtma #{order.order_number} holati '{order.get_status_display()}' ga o'zgartirildi.")

                if new_status == 'printing' and order.telegram_chat_id:
                    send_message(
                        order.telegram_chat_id,
                        f"⚙️ <b>Xushxabar, {order.customer_name}!</b>\n\n"
                        f"Sizning <b>#{order.order_number}</b> raqamli 3D printer buyurtmangiz hozirda usta tomonidan 3D printerda chop etilishni boshladi! 🚀\n\n"
                        f"Tayyor bo'lishi bilan sizga fotosurat va lokatsiya yuboramiz."
                    )
                elif new_status == 'ready':
                    try:
                        notify_customer_3d_order_ready(order)
                    except Exception as e:
                        logger.error(f"3D notify ready error: {e}")
            return redirect('seller_3d_studio_web')

        elif action == 'add_note' and order_id:
            admin_notes = request.POST.get('admin_notes', '').strip()
            order = Print3DOrder.objects.filter(id=order_id).first()
            if order:
                order.admin_notes = admin_notes
                order.save(update_fields=['admin_notes'])
                messages.success(request, f"#{order.order_number} qaydlari saqlandi.")
            return redirect('seller_3d_studio_web')

    # Filtrlash
    status_filter = request.GET.get('status', 'all')
    orders_qs = Print3DOrder.objects.all().order_by('-created_at')
    if status_filter and status_filter != 'all':
        orders_qs = orders_qs.filter(status=status_filter)

    total_orders = Print3DOrder.objects.count()
    active_printing = Print3DOrder.objects.filter(status='printing').count()
    new_orders = Print3DOrder.objects.filter(status__in=['new', 'confirmed']).count()
    ready_orders = Print3DOrder.objects.filter(status='ready').count()
    total_revenue = Print3DOrder.objects.filter(status__in=['ready', 'delivered']).aggregate(s=Sum('final_amount'))['s'] or 0

    materials = Print3DMaterial.objects.filter(is_active=True)

    context = {
        'shop': shop,
        'orders': orders_qs,
        'status_filter': status_filter,
        'total_orders': total_orders,
        'active_printing': active_printing,
        'new_orders': new_orders,
        'ready_orders': ready_orders,
        'total_revenue': total_revenue,
        'materials': materials,
    }
    return render(request, 'seller/3d_studio.html', context)

