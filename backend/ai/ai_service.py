import json
import re
import urllib.request
from django.conf import settings
from django.utils import timezone

try:
    from products.models import Product
    from shops.models import Shop
    from orders.models import Order
except Exception:
    Product = Shop = Order = None

SYSTEM_PROMPT_UZ = (
    "Siz 'Online Store Guliston' — Guliston shahri uchun mahalliy onlayn "
    "marketplace yordamchisisiz. Foydalanuvchilarga mahsulotlarni topishda, "
    "buyurtma holatini bilishda va do'konlar haqida ma'lumot berishda yordam bering. "
    "Javoblaringiz qisqa, aniq va o'zbek tilida bo'lsin. "
    "Agar aniq javob bera olmasangiz, foydalanuvchini qo'llab-quvvatlashga yo'naltiring."
)
SYSTEM_PROMPT_RU = (
    "Вы — помощник маркетплейса 'Online Store Guliston' для города Гулистан. "
    "Помогайте пользователям искать товары, проверять статус заказа и получать информацию о магазинах. "
    "Отвечайте кратко, точно и на русском языке."
)
SYSTEM_PROMPT_EN = (
    "You are an assistant for 'Online Store Guliston', a hyperlocal marketplace for Guliston. "
    "Help users find products, check order status and get store information. "
    "Answer concisely, accurately and in English."
)
SYSTEM_PROMPT = SYSTEM_PROMPT_UZ

STATUS_LABELS = {
    'pending': {'uz': 'kutilmoqda', 'ru': 'ожидается', 'en': 'pending'},
    'confirmed': {'uz': 'tasdiqlangan', 'ru': 'подтверждён', 'en': 'confirmed'},
    'preparing': {'uz': 'tayyorlanmoqda', 'ru': 'готовится', 'en': 'preparing'},
    'ready': {'uz': 'tayyor', 'ru': 'готов', 'en': 'ready'},
    'out_for_delivery': {'uz': 'yetkazib berishda', 'ru': 'доставляется', 'en': 'out for delivery'},
    'delivered': {'uz': 'yetkazib berildi', 'ru': 'доставлен', 'en': 'delivered'},
    'cancelled': {'uz': 'bekor qilindi', 'ru': 'отменён', 'en': 'cancelled'},
}


def _call_openai(system, user_message, history=None):
    api_key = getattr(settings, 'AI_API_KEY', '')
    if not api_key:
        return None
    # Groq (gsk_) yoki provider=groq bo'lsa Groq endpointi
    provider = getattr(settings, 'AI_PROVIDER', 'openai') or 'openai'
    is_groq = provider.lower() == 'groq' or api_key.startswith('gsk_')
    if is_groq:
        url = 'https://api.groq.com/openai/v1/chat/completions'
        # Groq uchun model nomini to'g'rilash
        model = getattr(settings, 'AI_TEXT_MODEL_FAST', '') or 'openai/gpt-oss-20b'
        # agar hali gpt nomi bo'lsa groq mos modelga almashtirish
        if model.startswith('gpt-'):
            model = 'openai/gpt-oss-20b'
    else:
        url = 'https://api.openai.com/v1/chat/completions'
        model = getattr(settings, 'AI_TEXT_MODEL_FAST', 'gpt-4o-mini') or 'gpt-4o-mini'
    messages = [{'role': 'system', 'content': system}]
    if history:
        messages.extend(history)
    messages.append({'role': 'user', 'content': user_message})
    payload = json.dumps({
        'model': model,
        'messages': messages,
        'temperature': 0.4,
        'max_tokens': 500,
    }).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (OnlineStoreGuliston/1.0)',
        },
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    return data['choices'][0]['message']['content'].strip()


def _find_order(message):
    if Order is None:
        return None
    tokens = re.findall(r'[A-Za-z]+-[A-Za-z0-9]+', message)
    for tok in tokens:
        order = Order.objects.filter(order_number__iexact=tok).first()
        if order:
            return order
    m = re.search(r'GLS-[A-Za-z0-9\-]+', message)
    if m:
        order = Order.objects.filter(order_number=m.group(0)).first()
        if order:
            return order
    nums = re.findall(r'\b\d{4,}\b', message)
    for n in nums:
        order = Order.objects.filter(order_number__endswith=n).first()
        if order:
            return order
        try:
            order = Order.objects.get(id=int(n))
            return order
        except (Order.DoesNotExist, ValueError):
            continue
    return None


def _get_lang(lang):
    return lang if lang in ('uz', 'ru', 'en') else 'uz'

def _order_reply(order, lang='uz'):
    lang = _get_lang(lang)
    label = STATUS_LABELS.get(order.status, {}).get(lang, order.status)
    if lang == 'ru':
        parts = [
            f"Заказ #{order.order_number}:",
            f"• Статус: {label}",
            f"• Магазин: {order.shop.name if order.shop else '—'}",
            f"• Сумма: {order.final_amount} сум",
            f"• Оплата: {order.payment_status}",
        ]
        if order.status == 'out_for_delivery':
            parts.append("• Курьер в пути, скоро доставит.")
        elif order.status == 'pending':
            parts.append("• Ожидайте подтверждения заказа.")
    elif lang == 'en':
        parts = [
            f"Order #{order.order_number}:",
            f"• Status: {label}",
            f"• Shop: {order.shop.name if order.shop else '—'}",
            f"• Total: {order.final_amount} sum",
            f"• Payment: {order.payment_status}",
        ]
        if order.status == 'out_for_delivery':
            parts.append("• Courier is on the way.")
        elif order.status == 'pending':
            parts.append("• Please wait for confirmation.")
    else:
        parts = [
            f"Buyurtma #{order.order_number}:",
            f"• Holati: {label}",
            f"• Do'kon: {order.shop.name if order.shop else '—'}",
            f"• Summa: {order.final_amount} so'm",
            f"• To'lov: {order.payment_status}",
        ]
        if order.status == 'out_for_delivery':
            parts.append("• Kuryer yo'lda, tez orada yetkazib beradi.")
        elif order.status == 'pending':
            parts.append("• Buyurtma tasdiqlanishini kuting.")
    return "\n".join(parts)


def _search_products(message, lang='uz'):
    if Product is None:
        return None
    lang = _get_lang(lang)
    stop = {'qidir', 'qidirish', 'kerak', 'bor', 'yoq', 'haqida', 'nima', 'qanaqa',
            'men', 'va', 'ham', 'buyurtma', 'holati', 'qayerda', 'ayt', 'fakt', 'qisqa', 'haq', 'uchun', 'necha',
            'bor', 'haqida', 'qanaqa', 'qanday', 'nechi', 'bilan', 'uchun',
            'поиск', 'найти', 'товар', 'заказ', 'статус', 'где', 'что', 'такое', 'кратко', 'расскажи', 'факт',
            'search', 'find', 'product', 'order', 'status', 'where', 'what', 'tell', 'fact', 'briefly', 'short'}
    words = [w for w in re.findall(r'[A-Za-zА-Яа-яЎўҚқҒғҲҳ]+', message.lower())
             if w not in stop and len(w) > 2]
    if not words:
        return None
    qs = Product.objects.filter(is_available=True)
    from django.db.models import Q
    q = Q()
    for w in words[:4]:
        q |= Q(name__icontains=w) | Q(tags__icontains=w) | Q(description__icontains=w)
    results = qs.filter(q).select_related('shop')[:5]
    if not results:
        return None
    if lang == 'ru':
        lines = ["Найденные товары:"]
        for p in results:
            shop = p.shop.name if p.shop else 'магазин'
            lines.append(f"• {p.name} — {p.price} сум ({shop})")
        lines.append("\nСмотрите подробнее в каталоге.")
    elif lang == 'en':
        lines = ["Found products:"]
        for p in results:
            shop = p.shop.name if p.shop else 'shop'
            lines.append(f"• {p.name} — {p.price} sum ({shop})")
        lines.append("\nSee catalog for details.")
    else:
        lines = ["Topilgan mahsulotlar:"]
        for p in results:
            shop = p.shop.name if p.shop else 'do\'kon'
            lines.append(f"• {p.name} — {p.price} so'm ({shop})")
        lines.append("\nBatafsil katalog sahifasidan ko'ring.")
    return "\n".join(lines)


def _fallback_reply(message, session_key=None, lang='uz'):
    lang = _get_lang(lang)
    text = (message or '').strip().lower()
    if any(k in text for k in ['buyurtma', 'zakaz', 'holati', 'qayerda', 'order', 'заказ', 'статус']):
        order = _find_order(message)
        if order:
            return _order_reply(order, lang=lang)
        if lang == 'ru':
            return "Отправьте номер заказа (например: GLS-ABC123), я покажу статус."
        elif lang == 'en':
            return "Send order number (e.g. GLS-ABC123) and I'll show status."
        return ("Buyurtma raqamini yuboring (masalan: GLS-ABC123), "
                "men holatini aytaman.")
    product_reply = _search_products(message, lang=lang)
    if product_reply:
        return product_reply
    if any(k in text for k in ['salom', 'assalom', 'hello', 'hi', 'privet', 'привет']):
        if lang == 'ru':
            return "Здравствуйте! Я — помощник Guliston Market. Помогу найти товар или проверить заказ."
        elif lang == 'en':
            return "Hello! I'm Guliston Market assistant. I can help find products or check orders."
        return ("Assalomu alaykum! Men Online Store Guliston yordamchisiman. "
                "Mahsulot topish yoki buyurtma holatini bilishda yordam bera olaman.")
    if lang == 'ru':
        return ("Я могу помочь:\n"
                "• Поиск товаров (например: 'найди молоко')\n"
                "• Статус заказа (например: 'заказ GLS-...')\n"
                "• Информация о магазинах\n"
                "Напишите вопрос.")
    elif lang == 'en':
        return ("I can help with:\n"
                "• Product search (e.g. 'find milk')\n"
                "• Order status (e.g. 'order GLS-...')\n"
                "• Store information\n"
                "Type your question.")
    return ("Men quyidagilarda yordam bera olaman:\n"
            "• Mahsulot qidirish (masalan: 'sut qidir')\n"
            "• Buyurtma holati (masalan: 'buyurtmam holati GLS-...')\n"
            "• Do'konlar haqida ma'lumot\n"
            "Savolingizni yozing.")


def chat_reply(message, session_key=None, user=None, history=None, lang='uz'):
    """Asosiy chatbot funksiyasi. Marketplace so'rovlari (buyurtma/mahsulot) DB dan, boshqa umumiy savollar OpenAI."""
    lang = _get_lang(lang)
    message = (message or '').strip()
    if not message:
        if lang == 'ru':
            return {'reply': 'Пожалуйста, напишите вопрос.', 'source': 'empty'}
        elif lang == 'en':
            return {'reply': 'Please type a question.', 'source': 'empty'}
        return {'reply': 'Iltimos, savol yozing.', 'source': 'empty'}
    # 1. Buyurtma raqami bo'lsa — darhol DB dan (OpenAI dan oldin)
    order = _find_order(message)
    if order:
        return {'reply': _order_reply(order, lang=lang), 'source': 'fallback'}
    # 2. Mahsulot qidirish — DB da topilsa darhol qaytarish (real narx/do'kon)
    prod = _search_products(message, lang=lang)
    if prod:
        return {'reply': prod, 'source': 'fallback'}
    # 3. Umumiy savol — OpenAI/Groq
    system = SYSTEM_PROMPT_UZ if lang == 'uz' else (SYSTEM_PROMPT_RU if lang == 'ru' else SYSTEM_PROMPT_EN)
    try:
        llm = _call_openai(system, message, history=history)
    except Exception as e:
        # Log xato (prod da Sentry)
        llm = None
    if llm:
        return {'reply': llm, 'source': 'openai'}
    return {'reply': _fallback_reply(message, session_key, lang=lang), 'source': 'fallback'}
