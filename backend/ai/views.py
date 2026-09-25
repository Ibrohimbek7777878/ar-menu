import uuid

from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from django.shortcuts import get_object_or_404

from backend.ratelimit import rate_limit
from .ai_service import chat_reply
from .marketing_service import generate_marketing_post
from .models import ChatSession, ChatMessage
from shops.models import Shop
from products.models import Product
from accounts.views import IsShopOwner


def _get_session(session_key, user):
    if not session_key:
        session_key = uuid.uuid4().hex
    session, _ = ChatSession.objects.get_or_create(
        session_key=session_key, defaults={'user': user})
    return session


MAX_MSG_LEN = 1000


@csrf_exempt
@require_POST
@rate_limit('ai_chat', limit=30, seconds=60)
def chat_api(request):
    try:
        data = json_loads(request.body) if request.body else {}
    except Exception:
        data = {}
    message = (data.get('message') or '').strip()[:MAX_MSG_LEN]
    if not message:
        return JsonResponse({'reply': 'Iltimos, savol yozing.', 'source': 'empty',
                             'session_key': data.get('session_key', '')})
    session_key = data.get('session_key') or request.headers.get('X-Session-Key')
    user = request.user if getattr(request, 'user', None) and request.user.is_authenticated else None
    lang = getattr(request, 'language', 'uz')
    # Allow explicit lang from payload
    if data.get('lang') in ('uz', 'ru', 'en'):
        lang = data.get('lang')

    session = _get_session(session_key, user)
    history = [
        {'role': m.role, 'content': m.content}
        for m in session.messages.order_by('created_at')[:10]
    ]
    result = chat_reply(message, session_key=session.session_key, user=user, history=history, lang=lang)

    ChatMessage.objects.create(session=session, role='user', content=message)
    ChatMessage.objects.create(session=session, role='assistant', content=result['reply'])

    return JsonResponse({
        'reply': result['reply'],
        'source': result['source'],
        'session_key': session.session_key,
    })


def json_loads(body):
    import json
    return json.loads(body.decode('utf-8'))


@csrf_exempt
@require_POST
def marketing_api(request):
    if not (request.user.is_authenticated and IsShopOwner().has_permission(request, None)):
        return JsonResponse({'success': False, 'error': 'Ruxsat yoq'}, status=403)
    try:
        data = json_loads(request.body) if request.body else {}
    except Exception:
        data = {}
    shop_id = data.get('shop_id')
    if not shop_id:
        return JsonResponse({'success': False, 'error': 'shop_id kerak'}, status=400)
    shop = get_object_or_404(Shop, id=shop_id)
    if not IsShopOwner().has_object_permission(request, None, shop):
        return JsonResponse({'success': False, 'error': 'Bu do\'kon sizga tegishli emas'}, status=403)
    if not shop.can_use_ai_marketing():
        return JsonResponse({
            'success': False,
            'error': 'AI marketing faqat Pro/Business rejada mavjud. Tarifingizni yangilang.',
            'credits_left': shop.ai_credits_left(),
        }, status=402)
    product = None
    product_id = data.get('product_id')
    if product_id:
        product = shop.products.filter(id=product_id).first()
    channel = data.get('channel', 'telegram')
    result = generate_marketing_post(shop, product=product, channel=channel)
    shop.consume_ai_credit()
    return JsonResponse({
        'success': True,
        'text': result['text'],
        'source': result['source'],
        'credits_left': shop.ai_credits_left(),
    })


# V12: chat_api endi MCP router orqali ham ishlaydi (8 provayder fallback).
# ai_service._call_openai faqat bitta provayder edi — endi router birinchi urinadi.
_orig_call_openai = None
try:
    from ai import ai_service as _ais
    _orig_call_openai = _ais._call_openai

    def _mcp_call_openai(system, user_message, history=None):
        try:
            from ai.mcp.router import router
            resp = router.run('chat', prompt=user_message, system=system, use_cache=False)
            if resp.ok and resp.content:
                return resp.content
        except Exception:
            pass
        return _orig_call_openai(system, user_message, history) if _orig_call_openai else None

    _ais._call_openai = _mcp_call_openai
except Exception:
    pass
