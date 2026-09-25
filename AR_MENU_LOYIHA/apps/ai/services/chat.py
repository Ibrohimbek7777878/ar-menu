import logging, re
from django.core.cache import cache
from django.utils import timezone
from apps.ai.mcp import mcp, MCPRequest
from apps.ai.prompts import CHAT_SYSTEM, LANG_NAMES
log=logging.getLogger('ai.chat')
MAX_QUESTION_LEN=500
HISTORY_LIMIT=6
RATE_LIMIT=10
RATE_WINDOW=300
def rate_limit_ok(key, limit=RATE_LIMIT, window=RATE_WINDOW):
    ck=f'rl:{key}'
    try:
        try: n=cache.incr(ck)
        except ValueError:
            cache.set(ck,1,window); n=1
        return n<=limit
    except Exception:
        return True
def build_menu_context(restaurant_id, lang):
    key=f'ai:menuctx:{restaurant_id}:{lang}'
    try:
        ctx=cache.get(key)
        if ctx: return ctx
    except Exception:
        ctx=None
    from apps.menu.models import Dish
    dishes=(Dish.objects.filter(restaurant_id=restaurant_id,is_available=True).select_related('category').only('id','name_uz','name_ru','name_en','price','diet_tags','allergens','cook_min','category__name_uz').order_by('category__order','order')[:250])
    lines=[]
    for d in dishes:
        name=(getattr(d,f'name_{lang}','') or d.name_uz or '').strip()
        if not name: continue
        tags=','.join(d.diet_tags) if d.diet_tags else '-'
        alrg=','.join(d.allergens) if d.allergens else '-'
        lines.append(f'{d.id}|{name}|{int(d.price)}|{tags}|{alrg}|{d.cook_min or 0}min')
    ctx='ID|Nom|Narx|Teglar|Allergen|Vaqt\n'+'\n'.join(lines)
    try:
        cache.set(key,ctx,300)
    except Exception: pass
    return ctx
def valid_dishes(restaurant_id, lang):
    key=f'ai:dishnames:{restaurant_id}:{lang}'
    try:
        d=cache.get(key)
        if d is not None: return d
    except Exception:
        d=None
    from apps.menu.models import Dish
    out={}
    for row in Dish.objects.filter(restaurant_id=restaurant_id,is_available=True).values('id','name_uz','name_ru','name_en','has_3d'):
        for L in ('uz','ru','en'):
            n=(row[f'name_{L}'] or '').strip().lower()
            if n: out[n]={'id':row['id'],'has_3d':row['has_3d']}
    try:
        cache.set(key,out,300)
    except Exception: pass
    return out
def summarize_cart(cart, lang):
    if not cart: return "bo'sh"
    return ', '.join([f"{c.get('name','?')} ×{c.get('qty',1)}" for c in cart[:8]])
def extract_mentions(text, names):
    low=(text or '').lower()
    found=[]
    for name,meta in names.items():
        if len(name)<3: continue
        if re.search(r'(?<![\w\'])'+re.escape(name)+r'(?![\w\'])', low):
            found.append({'name':name,**meta})
    found.sort(key=lambda x:-len(x['name']))
    seen,out=set(),[]
    for f in found:
        if f['id'] in seen: continue
        seen.add(f['id']); out.append(f)
    return out[:4]
DISCLAIMER={'uz':"\n\n⚠️ Bu taom hozircha menyuda yo'q — ofitsiantdan so'rang.",'ru':"\n\n⚠️ Этого блюда сейчас нет в меню — уточните у официанта.",'en':"\n\n⚠️ This dish is not on the menu right now — please ask the waiter."}
def validate_answer(text, restaurant_id, lang):
    names=valid_dishes(restaurant_id, lang)
    mentioned=extract_mentions(text,names)
    prices={int(p.replace(' ','')) for p in re.findall(r'\b(\d{4,7})\b', text or '')}
    if prices:
        from apps.menu.models import Dish
        real={int(p) for p in Dish.objects.filter(restaurant_id=restaurant_id,is_available=True).values_list('price',flat=True)}
        bogus={p for p in prices if p not in real and p>999}
        if bogus: log.warning(f'[AI] menyuda yo\'q narx rest={restaurant_id}: {bogus}')
    if not mentioned and re.search(r'\b(sushi|pizza|burger|стейк|steak)\b',(text or '').lower()):
        text=(text or '')+DISCLAIMER.get(lang,DISCLAIMER['uz'])
    return text, mentioned
BTN_LABEL={'ar':{'uz':"🎯 AR'da ko'rish",'ru':'🎯 Смотреть в AR','en':'🎯 View in AR'},'order':{'uz':'🛒 Buyurtma','ru':'🛒 Заказать','en':'🛒 Order'}}
def build_buttons(mentioned, lang):
    btns=[]
    for m in mentioned[:2]:
        if m.get('has_3d'): btns.append({'type':'ar','dish_id':m['id'],'label':BTN_LABEL['ar'][lang]})
        btns.append({'type':'order','dish_id':m['id'],'label':BTN_LABEL['order'][lang]})
    return btns[:4]
ERR_TEXT={'uz':"Kechirasiz, hozir javob bera olmayapman. Ofitsiantni chaqiring 🙏",'ru':'Извините, сейчас не могу ответить. Позовите официанта 🙏','en':"Sorry, I can't answer right now. Please call the waiter 🙏"}
RATE_TEXT={'uz':"Juda ko'p savol yubordingiz. Bir daqiqadan keyin urinib ko'ring.",'ru':'Слишком много вопросов. Попробуйте через минуту.','en':'Too many questions. Please try again in a minute.'}
def _demo_answer(restaurant_id, lang, question):
    # Demo fallback when no AI provider configured — pick first dish
    from apps.menu.models import Dish
    d=Dish.objects.filter(restaurant_id=restaurant_id,is_available=True).first()
    if not d:
        return ERR_TEXT[lang]
    name=getattr(d,f'name_{lang}','') or d.name_uz
    # Simple language-aware template
    if lang=='ru':
        return f'Рекомендую "{name}" — {int(d.price)} сум. Очень вкусно! {BTN_LABEL["order"][lang]}'
    if lang=='en':
        return f'I recommend "{name}" — {int(d.price)} UZS. Delicious!'
    return f'"{name}" tavsiya qilaman — {int(d.price)} so\'m. Juda mazali!'
def answer_question(*, restaurant, guest_session, question, lang='uz', cart=None, table_id=None):
    lang=lang if lang in LANG_NAMES else 'uz'
    if not rate_limit_ok(f'chat:{restaurant.id}:{guest_session}'):
        return {'error':'rate_limited','text':RATE_TEXT[lang],'buttons':[]}
    question=(question or '').strip()[:MAX_QUESTION_LEN]
    if not question:
        return {'error':'empty','text':'','buttons':[]}
    from apps.ai.models import ChatSession, ChatMessage
    session,_=ChatSession.objects.get_or_create(restaurant=restaurant,guest_session=guest_session,defaults={'lang':lang,'table_id':table_id})
    history=[{'role':m.role,'content':m.text} for m in session.messages.order_by('-created_at')[:HISTORY_LIMIT][::-1]]
    menu_ctx=build_menu_context(restaurant.id, lang)
    # Try real AI
    try:
        resp=mcp.run(MCPRequest(task='chat',system=CHAT_SYSTEM.format(restaurant_name=restaurant.name,lang_name=LANG_NAMES[lang],menu_json=menu_ctx,cart_summary=summarize_cart(cart or [], lang)),messages=history+[{'role':'user','content':question}],max_tokens=350,temperature=0.4,timeout=25),restaurant_id=restaurant.id)
        if resp.ok:
            text=resp.content if isinstance(resp.content,str) else str(resp.content)
            provider=resp.provider
            cached=getattr(resp,'cached',False)
        else:
            raise Exception(resp.error or 'AI failed')
    except Exception as e:
        log.info(f'[AI] demo fallback rest={restaurant.id}: {e}')
        text=_demo_answer(restaurant.id, lang, question)
        provider='demo'
        cached=False
    text, mentioned=validate_answer(text, restaurant.id, lang)
    buttons=build_buttons(mentioned, lang)
    # Fallback demo may not have mentioned correctly; ensure at least one button if we mentioned demo dish
    if not buttons and provider=='demo':
        from apps.menu.models import Dish
        d=Dish.objects.filter(restaurant_id=restaurant.id,is_available=True).first()
        if d:
            buttons=[{'type':'order','dish_id':d.id,'label':BTN_LABEL['order'][lang]}]
            if d.has_3d:
                buttons.insert(0,{'type':'ar','dish_id':d.id,'label':BTN_LABEL['ar'][lang]})
    try:
        ChatMessage.objects.create(session=session,role='user',text=question)
        ChatMessage.objects.create(session=session,role='assistant',text=text,provider=provider,buttons=buttons)
        ChatSession.objects.filter(id=session.id).update(messages_count=session.messages_count+2,updated_at=timezone.now())
    except Exception as e:
        log.warning(f'[AI] history save failed: {e}')
    return {'text':text,'buttons':buttons,'provider':provider,'cached':cached,'session_id':session.id}
