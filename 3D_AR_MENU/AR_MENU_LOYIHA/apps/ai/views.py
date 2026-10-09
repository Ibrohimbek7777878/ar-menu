from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from apps.ai.services.chat import answer_question

@api_view(['POST'])
@permission_classes([AllowAny])
def ai_chat(request):
    data=request.data
    question=(data.get('question') or data.get('prompt') or '').strip()
    if not question: return Response({'error':{'code':'VALIDATION_ERROR','message':'Savol bo\'sh'}},status=400)
    lang=data.get('lang','uz')
    session=str(data.get('session') or data.get('guest_session') or request.headers.get('X-Session-Id') or 'guest')[:64]
    cart=data.get('cart') or []
    # Try to resolve restaurant: from Host slug, or X-Restaurant header, or first restaurant for demo
    rid=getattr(request,'restaurant_id',None)
    if not rid:
        # guest fallback: try to find via session
        try:
            from apps.guest.models import GuestSession
            gs=GuestSession.objects.filter(public_id=session).first()
            if gs: rid=gs.restaurant_id
        except Exception:
            pass
    if not rid:
        from apps.tenants.models import Restaurant
        r=Restaurant.objects.filter(is_active=True).first()
        if not r: return Response({'error':{'code':'NO_RESTAURANT'}},status=404)
        rid=r.id
    else:
        from apps.tenants.models import Restaurant
        r=Restaurant.objects.filter(id=rid).first()
        if not r: return Response({'error':{'code':'NO_RESTAURANT'}},status=404)
    table_id=data.get('table_id')
    result=answer_question(restaurant=r, guest_session=session, question=question, lang=lang, cart=cart, table_id=table_id)
    return Response(result, status=200 if 'error' not in result or result['error'] not in ('rate_limited','empty') else 429 if result['error']=='rate_limited' else 400)
