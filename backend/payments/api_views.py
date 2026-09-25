"""
Payment API — Click / Payme / Mock.
Barcha endpointlar test rejimida (kalitsiz) ham ishlaydi.
"""
import hashlib
import json
from datetime import datetime

from django.conf import settings
from django.http import JsonResponse, HttpResponse, HttpResponseNotFound
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from backend.ratelimit import rate_limit
from orders.models import Order
from .models import Payment
from .payment_service import (
    create_order_payment, mark_payment_paid, mark_payment_failed,
    get_payment_status,
)


def _provider_checkout_url(provider, payment, order):
    """Click/Payme hosted checkout URL (env kalitlari bo'lsa)."""
    amount = int(order.final_amount)
    if provider == 'click':
        merchant_id = getattr(settings, 'CLICK_MERCHANT_ID', '')
        service_id = getattr(settings, 'CLICK_SERVICE_ID', '')
        if merchant_id and service_id:
            return (f"https://my.click.uz/services/pay?service_id={service_id}"
                    f"&merchant_id={merchant_id}&amount={amount}"
                    f"&transaction={payment.merchant_transaction_id}")
    # Test rejimi yoki boshqa provayderlar — lokal mock sahifa
    return f"/api/payments/mock/{payment.merchant_transaction_id}/"


@api_view(['POST'])
@permission_classes([AllowAny])
@rate_limit('payment_create', limit=15, seconds=60)
def payment_create_api(request):
    """POST /api/payments/create/  {order_id, provider}"""
    order_id = request.data.get('order_id')
    provider = request.data.get('provider', 'mock')
    if provider not in ('click', 'payme', 'uzcard', 'mock', 'cash'):
        return Response({'success': False, 'error': 'Noto\'g\'ri provider'}, status=400)
    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        return Response({'success': False, 'error': 'Buyurtma topilmadi'}, status=404)

    if provider == 'cash':
        return Response({'success': True, 'provider': 'cash',
                        'message': 'Naqd pul — yetkazishda to\'lanadi'})

    return_url = request.build_absolute_uri(f'/payment/success/')
    result = create_order_payment(order, provider, return_url)
    if not result['success']:
        return Response({'success': False, 'error': result.get('error', 'Xatolik')}, status=400)

    payment = Payment.objects.filter(
        order=order, merchant_transaction_id__startswith=f"GLS-{order.order_number}"
    ).order_by('-created_at').first()
    if not payment:
        return Response({'success': False, 'error': 'To\'lov yaratilmadi'}, status=500)

    payment_url = _provider_checkout_url(provider, payment, order)
    payment.payment_url = payment_url
    payment.save(update_fields=['payment_url'])

    return Response({
        'success': True,
        'merchant_transaction_id': payment.merchant_transaction_id,
        'provider': provider,
        'amount': str(payment.amount),
        'status': payment.status,
        'payment_url': payment_url,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def payment_status_api(request, payment_id):
    """GET /api/payments/{merchant_transaction_id}/status/"""
    result = get_payment_status(payment_id)
    status_code = 200 if result['success'] else 404
    return Response(result, status=status_code)


@csrf_exempt
@require_POST
def payment_callback_click(request):
    """
    POST /api/payments/click/ — Click rasmiy webhook (Prepare & Complete).
    Dokumentatsiya: https://docs.click.uz/
    """
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        data = request.POST.dict()

    click_trans_id = data.get('click_trans_id') or ''
    merchant_trans_id = data.get('merchant_trans_id') or data.get('merchant_transaction_id') or ''
    service_id = str(data.get('service_id') or getattr(settings, 'CLICK_SERVICE_ID', ''))
    amount = data.get('amount')
    action = str(data.get('action', '1'))
    sign_time = str(data.get('sign_time', ''))
    sign_string = str(data.get('sign_string', ''))

    try:
        payment = Payment.objects.select_related('order').get(merchant_transaction_id=merchant_trans_id)
    except Payment.DoesNotExist:
        return JsonResponse({
            'error': -5,
            'error_note': "Buyurtma yoki to'lov topilmadi",
            'click_trans_id': click_trans_id,
            'merchant_trans_id': merchant_trans_id,
        }, status=200)

    # Click MD5 imzo tekshiruvi (agar CLICK_SECRET_KEY sozlangan bo'lsa)
    secret = getattr(settings, 'CLICK_SECRET_KEY', '')
    if secret and sign_string:
        merchant_id = getattr(settings, 'CLICK_MERCHANT_ID', '')
        raw = f"{click_trans_id}{service_id}{secret}{merchant_trans_id}{amount}{action}{sign_time}"
        expected = hashlib.md5(raw.encode()).hexdigest()
        # Click alternative order format:
        raw_alt = f"{click_trans_id}{service_id}{merchant_id}{amount}{action}{sign_time}{secret}"
        expected_alt = hashlib.md5(raw_alt.encode()).hexdigest()
        if sign_string.lower() not in (expected.lower(), expected_alt.lower()):
            return JsonResponse({
                'error': -1,
                'error_note': "Imzo xatosi (SIGN_CHECK_FAILED)",
                'click_trans_id': click_trans_id,
                'merchant_trans_id': merchant_trans_id,
            }, status=200)

    # Action 0 = Prepare (Tekshiruv bosqichi)
    if action == '0':
        if payment.status == 'paid':
            return JsonResponse({
                'error': -4,
                'error_note': "To'lov allaqachon amalga oshirilgan",
                'click_trans_id': click_trans_id,
                'merchant_trans_id': merchant_trans_id,
            })
        return JsonResponse({
            'click_trans_id': click_trans_id,
            'merchant_trans_id': merchant_trans_id,
            'merchant_prepare_id': payment.id,
            'error': 0,
            'error_note': "Success",
        })

    # Action 1 = Complete (To'lovni yakunlash)
    paid = mark_payment_paid(payment, provider_payload=data, request=request)
    return JsonResponse({
        'click_trans_id': click_trans_id,
        'merchant_trans_id': merchant_trans_id,
        'merchant_confirm_id': payment.id,
        'error': 0,
        'error_note': "Success",
        'status': paid.status,
    })


@csrf_exempt
@require_POST
def payment_callback_payme(request):
    """
    POST /api/payments/payme/ — Payme JSON-RPC 2.0 Webhook.
    Dokumentatsiya: https://developer.payme.uz/
    """
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        data = request.POST.dict()

    req_id = data.get('id', 1)
    method = data.get('method', '')
    params = data.get('params', {})

    # Basic Auth tekshiruvi (agar PAYME_SECRET_KEY sozlangan bo'lsa)
    secret = getattr(settings, 'PAYME_SECRET_KEY', '')
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if secret:
        if not auth_header:
            return JsonResponse({'error': {'code': -32504, 'message': 'Insufficient privileges'}, 'id': req_id}, status=401)
        import base64
        try:
            auth_decoded = base64.b64decode(auth_header.replace('Basic ', '')).decode('utf-8')
            if not auth_decoded.endswith(f":{secret}"):
                return JsonResponse({'error': {'code': -32504, 'message': 'Insufficient privileges'}, 'id': req_id}, status=401)
        except Exception:
            return JsonResponse({'error': {'code': -32504, 'message': 'Auth parse error'}, 'id': req_id}, status=401)

    # Oddiy webhook JSON (faqat DEBUG yoki xodimlar uchun test)
    if not method and ('merchant_transaction_id' in data or 'payment_id' in data):
        if not settings.DEBUG and not request.user.is_staff:
            return JsonResponse({'error': 'Direct webhook confirmation disallowed in production'}, status=403)
        merchant_id = data.get('merchant_transaction_id') or data.get('payment_id')
        try:
            payment = Payment.objects.get(merchant_transaction_id=merchant_id)
            paid = mark_payment_paid(payment, provider_payload=data, request=request)
            return JsonResponse({'success': True, 'status': paid.status})
        except Payment.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Payment not found'}, status=404)

    # JSON-RPC 2.0 metodlari
    order_id = params.get('account', {}).get('order_id') or params.get('account', {}).get('order') or params.get('id')
    payment = None
    if order_id:
        payment = Payment.objects.filter(
            Q(merchant_transaction_id=order_id) | Q(order__order_number=order_id)
        ).first()

    if method == 'CheckPerformTransaction':
        if not payment:
            return JsonResponse({'error': {'code': -31050, 'message': {'uz': 'Buyurtma topilmadi'}}, 'id': req_id})
        return JsonResponse({'result': {'allow': True}, 'id': req_id})

    elif method == 'CreateTransaction':
        if not payment:
            return JsonResponse({'error': {'code': -31050, 'message': {'uz': 'Buyurtma topilmadi'}}, 'id': req_id})
        payme_trans_id = str(params.get('id', ''))
        payment.provider_transaction_id = payme_trans_id
        payment.save(update_fields=['provider_transaction_id'])
        return JsonResponse({
            'result': {
                'create_time': int(datetime.now().timestamp() * 1000),
                'transaction': str(payment.id),
                'state': 1,
            },
            'id': req_id,
        })

    elif method == 'PerformTransaction':
        if not payment:
            # provider_transaction_id yoki merchant_transaction_id orqali qidirish
            payme_trans_id = str(params.get('id', ''))
            payment = Payment.objects.filter(
                Q(merchant_transaction_id=payme_trans_id) | Q(provider_transaction_id=payme_trans_id)
            ).first()
        if not payment:
            return JsonResponse({'error': {'code': -31003, 'message': {'uz': 'Tranzaksiya topilmadi'}}, 'id': req_id})
        
        # Payme tiyin -> so'm konvertatsiya (1 so'm = 100 tiyin)
        clean_params = dict(params)
        if clean_params.get('amount') is not None:
            try:
                from decimal import Decimal
                clean_params['amount'] = str(Decimal(str(clean_params['amount'])) / Decimal('100'))
            except Exception:
                pass
        paid = mark_payment_paid(payment, provider_payload=clean_params, request=request)
        return JsonResponse({
            'result': {
                'transaction': str(paid.id),
                'perform_time': int(datetime.now().timestamp() * 1000),
                'state': 2,
            },
            'id': req_id,
        })

    elif method == 'CheckTransaction':
        payme_trans_id = str(params.get('id', ''))
        payment = Payment.objects.filter(provider_transaction_id=payme_trans_id).first()
        if not payment:
            return JsonResponse({'error': {'code': -31003, 'message': 'Not found'}, 'id': req_id})
        return JsonResponse({
            'result': {
                'create_time': int(payment.created_at.timestamp() * 1000),
                'perform_time': int(payment.paid_at.timestamp() * 1000) if payment.paid_at else 0,
                'cancel_time': 0,
                'transaction': str(payment.id),
                'state': 2 if payment.status == 'paid' else 1,
                'reason': None,
            },
            'id': req_id,
        })

    # Default fallback
    return JsonResponse({'result': {'success': True}, 'id': req_id})


@csrf_exempt
@require_POST
def mock_payment_success(request, payment_id):
    """POST /api/payments/mock/{id}/success/"""
    if not settings.DEBUG and not getattr(settings, 'ALLOW_MOCK_PAYMENTS', False):
        return JsonResponse({'success': False, 'error': 'Mock to\'lovlar faqat test rejimida ruxsat etiladi'}, status=403)
    try:
        payment = Payment.objects.get(merchant_transaction_id=payment_id)
    except Payment.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Payment not found'}, status=404)
    paid = mark_payment_paid(payment, provider_payload={'provider_transaction_id': f'MOCK-{payment.id}', 'amount': str(payment.amount)}, request=request)
    return JsonResponse({'success': True, 'status': paid.status, 'order_status': paid.order.status})


@csrf_exempt
@require_POST
def mock_payment_fail(request, payment_id):
    """POST /api/payments/mock/{id}/fail/"""
    if not settings.DEBUG and not getattr(settings, 'ALLOW_MOCK_PAYMENTS', False):
        return JsonResponse({'success': False, 'error': 'Mock to\'lovlar faqat test rejimida ruxsat etiladi'}, status=403)
    try:
        payment = Payment.objects.get(merchant_transaction_id=payment_id)
    except Payment.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Payment not found'}, status=404)
    failed = mark_payment_failed(payment, error='Mock to\'lov rad etildi', request=request)
    return JsonResponse({'success': True, 'status': failed.status})


@require_GET
def mock_payment_page(request, payment_id):
    """GET /api/payments/mock/{id}/ — test to'lov sahifasi."""
    if not settings.DEBUG and not getattr(settings, 'ALLOW_MOCK_PAYMENTS', False):
        return HttpResponseNotFound('Mock to\'lov sahifasi faqat test rejimida mavjud')
    try:
        payment = Payment.objects.get(merchant_transaction_id=payment_id)
    except Payment.DoesNotExist:
        return HttpResponseNotFound('To\'lov topilmadi')

    order = payment.order
    success_url = reverse('payment_mock_success', args=[payment_id])
    fail_url = reverse('payment_mock_fail', args=[payment_id])
    html = f"""<!DOCTYPE html><html lang="uz"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>To'lov — {payment.merchant_transaction_id}</title>
<style>
  *{{box-sizing:border-box;margin:0;padding:0;font-family:Inter,system-ui,sans-serif}}
  body{{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fafaf7;color:#1f2937}}
  .card{{width:min(420px,92vw);background:#fff;border:1px solid #e7e5e4;border-radius:24px;padding:32px;box-shadow:0 12px 40px rgba(0,0,0,.06)}}
  .badge{{display:inline-block;background:#16a34a1a;color:#16a34a;font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;margin-bottom:14px}}
  h1{{font-size:20px;font-weight:600;margin-bottom:6px}}
  .amount{{font-size:36px;font-weight:700;margin:18px 0;color:#16a34a}}
  .meta{{font-size:14px;color:#6b7280;margin-bottom:24px;line-height:1.6}}
  .btn{{display:block;width:100%;border:none;border-radius:14px;padding:15px;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:10px}}
  .pay{{background:#16a34a;color:#fff}}
  .cancel{{background:#fff;color:#ef4444;border:1px solid #fca5a5}}
  .note{{text-align:center;font-size:12px;color:#9ca3af;margin-top:14px}}
</style></head><body>
  <div class="card">
    <span class="badge">TEST REJIMI · MOCK</span>
    <h1>To'lov sahifasi</h1>
    <div class="amount">{payment.amount:,.0f} so'm</div>
    <div class="meta">
      Buyurtma: <b>#{order.order_number}</b><br>
      Do'kon: <b>{order.shop.name if order.shop else '-'}</b><br>
      ID: <code>{payment.merchant_transaction_id}</code>
    </div>
    <form method="POST" action="{success_url}">
      <button class="btn pay" type="submit">✅ To'lash (test)</button>
    </form>
    <form method="POST" action="{fail_url}">
      <button class="btn cancel" type="submit">Bekor qilish</button>
    </form>
    <div class="note">Bu test sahifasi. Haqiqiy provayderda bu yerda Click/Payme sahifasi ochiladi.</div>
  </div>
</body></html>"""
    return HttpResponse(html)
