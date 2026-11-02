import json
import logging
from datetime import datetime
from decimal import Decimal

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods, require_POST

from orders.models import Order
from .models import Payment
from .payment_service import create_order_payment, get_payment_status, mark_payment_paid, mock_payments_allowed

logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def payment_create(request, order_pk):
    """To'lov yaratish oqimi."""
    order = get_object_or_404(Order, pk=order_pk)
    method = request.POST.get('method', 'cash')
    return_url = request.build_absolute_uri(f'/payment/success/?order_id={order.order_number}')

    result = create_order_payment(order, method, return_url)

    if result.get('success'):
        payment_url = result.get('payment_url')
        if payment_url:
            return redirect(payment_url)
        messages.success(request, result.get('message', 'To\'lov yaratildi'))
        return redirect('customer_orders')
    else:
        messages.error(request, result.get('error', 'To\'lovni boshlashda xatolik yuz berdi'))
        return redirect('customer_cart')


@csrf_exempt
@require_POST
def payment_callback_click(request):
    """
    Click rasmiy Shop API Webhook (Prepare va Complete).
    Kriptografik MD5 imzo bilan himoyalangan.
    """
    from payments.services.click_service import process_click_webhook
    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST.dict()

    result = process_click_webhook(data)
    return JsonResponse(result)


@csrf_exempt
@require_POST
def payment_callback_payme(request):
    """
    Payme rasmiy Merchant JSON-RPC 2.0 Webhook.
    HTTP Basic Auth tekshiruvi bilan himoyalangan.
    """
    from payments.services.payme_service import process_payme_jsonrpc
    auth_header = request.headers.get('Authorization') or request.META.get('HTTP_AUTHORIZATION', '')

    try:
        payload = json.loads(request.body)
    except Exception:
        return JsonResponse({
            'error': {'code': -32700, 'message': {'uz': "JSON o'qishda xatolik", 'ru': "Parse error"}}
        })

    result = process_payme_jsonrpc(payload, auth_header=auth_header)
    return JsonResponse(result)


@csrf_exempt
@require_POST
def payment_callback_uzcard(request):
    """UzCard / Paycom API v2 Webhook."""
    # Kalitlar sozlanmagan bo'lsa callback ochiq qoldirilmaydi: imzosiz so'rov to'lovni "to'langan" qilmasin (fail-closed)
    if not (getattr(settings, 'UZCARD_MERCHANT_ID', '') and getattr(settings, 'UZCARD_SECRET_KEY', '')):
        return JsonResponse({'success': False, 'error': 'Uzcard sozlanmagan'}, status=403)
    from payments.services.uzcard_service import verify_payment
    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST.dict()

    payment_id = data.get('payment_id') or data.get('id') or data.get('merchant_trans_id')
    receipt_id = data.get('receipt_id') or data.get('token')
    result = verify_payment(payment_id, receipt_id)
    return JsonResponse(result)


def payment_status(request, payment_id):
    """To'lov holatini tekshirish."""
    result = get_payment_status(payment_id)
    return JsonResponse(result)


def payment_demo_view(request, order_pk):
    """
    Real API kalitlar bo'lmaganda yoki sinov rejimida
    Professional Payme / Click / UzCard to'lov simulyatori.
    Mijozga to'lov, kassa, oshxona va telegram xabarlar qanday ishlashini 100% real ko'rsatib beradi.
    Faqat DEMO_MODE / ALLOW_MOCK_PAYMENTS yoqilganda (TZ: R-SEC-06).
    """
    if not mock_payments_allowed():
        raise Http404("Demo to'lov o'chirilgan")
    order = get_object_or_404(Order, pk=order_pk)
    method = request.GET.get('method', 'click').lower()

    method_configs = {
        'click': {
            'name': 'Click.uz',
            'theme_color': '#1E40AF',
            'bg_gradient': 'from-blue-600 to-indigo-700',
            'badge_color': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
            'icon': '💳',
            'logo_text': 'CLICK',
        },
        'payme': {
            'name': 'Payme Business',
            'theme_color': '#0D9488',
            'bg_gradient': 'from-teal-600 to-cyan-700',
            'badge_color': 'bg-teal-500/10 text-teal-600 border-teal-500/20',
            'icon': '📱',
            'logo_text': 'PAYME',
        },
        'uzcard': {
            'name': 'UzCard / Humo Gateway',
            'theme_color': '#4F46E5',
            'bg_gradient': 'from-indigo-600 to-purple-700',
            'badge_color': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
            'icon': '🏦',
            'logo_text': 'UZCARD',
        }
    }

    config = method_configs.get(method, method_configs['click'])

    # Mavjud to'lovni topish yoki yaratish
    payment = Payment.objects.filter(order=order).first()
    if not payment:
        payment = Payment.objects.create(
            order=order,
            merchant_transaction_id=f"GLS-{method.upper()}-{order.order_number}-{int(datetime.now().timestamp())}",
            provider=method,
            amount=order.final_amount,
            status='pending',
        )

    context = {
        'order': order,
        'payment': payment,
        'method': method,
        'config': config,
    }
    return render(request, 'payments/payment_demo.html', context)


@require_POST
def payment_demo_confirm(request, order_pk):
    """
    Demo to'lovni tasdiqlash:
    Haqiqiy to'lov quvurini (mark_payment_paid) to'liq chaqiradi,
    moliyaga kirim yozadi, stolni yopadi va Telegramga xabar beradi.
    Avval hech qanday tekshiruvsiz ochiq edi: istalgan kishi istalgan buyurtmani "to'langan" qila olardi.
    """
    if not mock_payments_allowed():
        raise Http404("Demo to'lov o'chirilgan")
    order = get_object_or_404(Order, pk=order_pk)
    method = request.POST.get('method', 'click')
    
    payment = Payment.objects.filter(order=order).first()
    if not payment:
        payment = Payment.objects.create(
            order=order,
            merchant_transaction_id=f"GLS-DEMO-{order.order_number}-{int(datetime.now().timestamp())}",
            provider=method,
            amount=order.final_amount,
            status='pending',
        )

    demo_tx_id = f"DEMO-{method.upper()}-{int(datetime.now().timestamp())}"
    mark_payment_paid(
        payment,
        provider_payload={
            'provider_transaction_id': demo_tx_id,
            'is_demo': True,
            'amount': str(order.final_amount),
        },
        actor=request.user if request.user.is_authenticated else None,
        request=request,
    )

    messages.success(request, f"🎉 {order.order_number} raqamli buyurtma to'lovi muvaffaqiyatli qabul qilindi!")
    return redirect(f'/payment/success/?order_id={order.order_number}')


def payment_success_page(request):
    """To'lov muvaffaqiyatli sahifasi."""
    order_id = request.GET.get('order_id')
    order = Order.objects.filter(order_number=order_id).first() if order_id else None
    return render(request, 'customer/payment_success.html', {'order': order, 'order_id': order_id})


def payment_failed_page(request):
    """To'lov xatolik sahifasi."""
    order_id = request.GET.get('order_id')
    error = request.GET.get('error', 'To\'lov bekor qilindi yoki xatolik yuz berdi')
    return render(request, 'customer/payment_failed.html', {'order_id': order_id, 'error': error})

