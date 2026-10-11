from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException
from rest_framework import status


class ARMenuError(APIException):
    """Baza xato — 3 tilda xabar"""
    code_name = 'ERROR'
    msg_uz = msg_ru = msg_en = ''
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, details=None):
        self.details = details or {}
        super().__init__(self.msg_uz)


class QRInvalid(ARMenuError):
    code_name = 'QR_INVALID'
    status_code = 404
    msg_uz = "QR kod yaroqsiz. Ofitsiantga murojaat qiling."
    msg_ru = "QR-код недействителен. Обратитесь к официанту."
    msg_en = "Invalid QR code. Please contact the waiter."


class RestaurantInactive(ARMenuError):
    code_name = 'RESTAURANT_INACTIVE'
    status_code = 403
    msg_uz = "Restoran vaqtincha xizmat ko'rsatmayapti"
    msg_ru = "Ресторан временно не обслуживает"
    msg_en = "Restaurant is temporarily unavailable"


class DishUnavailable(ARMenuError):
    code_name = 'DISH_UNAVAILABLE'
    status_code = 409
    msg_uz = "Bu taom hozir mavjud emas"
    msg_ru = "Это блюдо сейчас недоступно"
    msg_en = "This dish is currently unavailable"


class PriceChanged(ARMenuError):
    code_name = 'PRICE_CHANGED'
    status_code = 409
    msg_uz = "Narxlar yangilandi. Savatni tekshiring."
    msg_ru = "Цены обновлены. Проверьте корзину."
    msg_en = "Prices have changed. Please check your cart."


class InvalidTransition(ARMenuError):
    code_name = 'INVALID_TRANSITION'
    status_code = 409
    msg_uz = "Bu holat o'zgarishi mumkin emas"
    msg_ru = "Такое изменение статуса невозможно"
    msg_en = "This status transition is not allowed"


class PlanLimit(ARMenuError):
    code_name = 'PLAN_LIMIT'
    status_code = 402
    msg_uz = "Tarif limiti tugadi. Tarifni oshiring."
    msg_ru = "Лимит тарифа исчерпан. Повысьте тариф."
    msg_en = "Plan limit reached. Please upgrade."


class TenantMismatch(ARMenuError):
    code_name = 'TENANT_MISMATCH'
    status_code = 403
    msg_uz = "Ruxsat yo'q"
    msg_ru = "Доступ запрещён"
    msg_en = "Access denied"


class ServiceUnavailable(ARMenuError):
    code_name = 'SERVICE_UNAVAILABLE'
    status_code = 503
    msg_uz = "Xizmat vaqtincha ishlamayapti"
    msg_ru = "Сервис временно недоступен"
    msg_en = "Service temporarily unavailable"


def custom_exception_handler(exc, context):
    import logging
    from core.logging import get_request_id
    logger = logging.getLogger('core')
    sec_logger = logging.getLogger('django.security')
    request = context.get('request')
    lang = getattr(request, 'lang', 'uz') if request else 'uz'
    rid = getattr(request, 'request_id', get_request_id()) if request else get_request_id()
    path = getattr(request, 'path', '-') if request else '-'
    method = getattr(request, 'method', '-') if request else '-'
    tenant = getattr(request, 'restaurant_id', '-') if request else '-'

    # Log har qanday xato — to'liq trace, ammo PII maskalangan
    if isinstance(exc, ARMenuError):
        # Biznes xatolar (4xx) — WARNING, lekin hamma joyda qidiriladi
        logger.warning(
            f'[BUSINESS] {exc.code_name} {method} {path} rid={rid} tenant={tenant} status={exc.status_code} details={exc.details}',
            extra={'request_id': rid},
        )
        # Xavfsizlik bilan bog'liq (403, 402) — alohida security.log ga ham
        if exc.status_code in (401, 402, 403):
            sec_logger.warning(
                f'[SECURITY] {exc.code_name} {method} {path} rid={rid} tenant={tenant} ip={getattr(request, "META", {}).get("REMOTE_ADDR", "-") if request else "-"}',
                extra={'request_id': rid},
            )
        return _build(exc, lang, request)

    if response := exception_handler(exc, context):
        # DRF validatsiya xatolari (400) — WARNING
        logger.warning(
            f'[VALIDATION] {method} {path} rid={rid} tenant={tenant} errors={response.data}',
            extra={'request_id': rid},
        )
        response.data = {'error': {
            'code': 'VALIDATION_ERROR',
            f'message_{lang}': str(response.data),
            'details': response.data,
            'trace_id': getattr(request, 'request_id', ''),
        }}
        return response

    # Kutilmagan 500 — ERROR + traceback
    if exc is not None:
        logger.exception(
            f'[UNHANDLED] {type(exc).__name__} {method} {path} rid={rid} tenant={tenant}',
            extra={'request_id': rid},
        )
    return None


def _build(exc, lang, request):
    from rest_framework.response import Response
    return Response({'error': {
        'code': exc.code_name,
        'message_uz': exc.msg_uz,
        'message_ru': exc.msg_ru,
        'message_en': exc.msg_en,
        'message': getattr(exc, f'msg_{lang}', exc.msg_uz),
        'details': exc.details,
        'trace_id': getattr(request, 'request_id', ''),
    }}, status=exc.status_code)
