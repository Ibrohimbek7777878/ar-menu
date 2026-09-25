import json
import urllib.request
from django.conf import settings

SYSTEM_PROMPT = (
    "Siz O'zbekiston uchun mahalliy marketplace marketing yozuvchisisiz. "
    "Do'kon egalariga mahsulotlari uchun qisqa, jozibali, o'zbek tilidagi "
    "ijtimoiy tarmoq postlarini tayyorlaysiz. Emojilar o'lchamda ishlating, "
    "narx va do'kon nomini kiriting, call-to-action qo'shing."
)


def _call_openai(system, user_prompt):
    api_key = getattr(settings, 'AI_API_KEY', '')
    if not api_key:
        return None
    provider = getattr(settings, 'AI_PROVIDER', 'openai') or 'openai'
    is_groq = provider.lower() == 'groq' or api_key.startswith('gsk_')
    if is_groq:
        url = 'https://api.groq.com/openai/v1/chat/completions'
        model = getattr(settings, 'AI_TEXT_MODEL_FAST', '') or 'openai/gpt-oss-20b'
        if model.startswith('gpt-'):
            model = 'openai/gpt-oss-20b'
    else:
        url = 'https://api.openai.com/v1/chat/completions'
        model = getattr(settings, 'AI_TEXT_MODEL_FAST', 'gpt-4o-mini') or 'gpt-4o-mini'
    payload = json.dumps({
        'model': model,
        'messages': [
            {'role': 'system', 'content': system},
            {'role': 'user', 'content': user_prompt},
        ],
        'temperature': 0.8,
        'max_tokens': 400,
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


def _fallback_post(shop, product, channel):
    name = shop.name
    if product:
        title = product.name
        price = f"{product.price} so'm"
        body = f"{product.name} — {product.description or 'sifatli mahsulot'}."
    else:
        title = f"{name} yangiliklari"
        price = ''
        body = "Eng sifatli mahsulotlar va tez yetkazib berish xizmati."
    if channel == 'instagram':
        return f"🛒 {title}\n\n{body}\n💰 {price}\n📍 {name}, Guliston\n\n📩 Buyurtma uchun yozhing!"
    if channel == 'facebook':
        return f"{name} do'konidan yangilik!\n\n{body}\nNarxi: {price}\nGuliston shahri, yetkazib berish bepul."
    return f"🛍 {title}\n{body}\n💵 {price}\n🏪 {name}\n👉 Buyurtma: @marketing_orign_bot"


def generate_marketing_post(shop, product=None, channel='telegram', tone='ibo'):
    """AI post generatsiyasi. Kalit bo'lsa OpenAI, aks holda shablon."""
    if product:
        user_prompt = (
            f"Do'kon: {shop.name}. Mahsulot: {product.name}. "
            f"Tavsif: {product.description or '-'}. Narx: {product.price} so'm. "
            f"Kanal: {channel}. Post tayyorla."
        )
    else:
        user_prompt = f"Do'kon: {shop.name} (Guliston). Umumiy reklama posti tayyorla, kanal: {channel}."
    try:
        text = _call_openai(SYSTEM_PROMPT, user_prompt)
    except Exception:
        text = None
    if text:
        return {'text': text, 'source': 'openai'}
    return {'text': _fallback_post(shop, product, channel), 'source': 'fallback'}


MOOD_PROMPT = (
    "Siz ijobiy, motivatsion va qisqa xabarlar yozuvchisisiz. "
    "Do'kon egalariga mijozlarni rag'batlantiruvchi, kayfiyat ko'taruvchi "
    "o'zbek tilidagi qisqa xabar tayyorlang (emoji bilan)."
)


def generate_mood_message(shop):
    """Kayfiyat ko'taruvchi (mood-lifting) xabar."""
    user_prompt = f"Do'kon: {shop.name} (Guliston). Mijozlarga iliq, rag'batlantiruvchi xabar yozing."
    try:
        text = _call_openai(MOOD_PROMPT, user_prompt)
    except Exception:
        text = None
    if text:
        return {'text': text, 'source': 'openai'}
    return {
        'text': f"🌟 {shop.name} bilan kun yaxshiroq! Sifatli mahsulotlar, tez yetkazib berish va do'stona xizmat — faqat siz uchun. 💚",
        'source': 'fallback',
    }


def generate_upsell(product):
    """Mahsulot uchun qo'shimcha sotish (upsell) taklifi."""
    user_prompt = (
        f"Mahsulot: {product.name}. Narx: {product.price} so'm. "
        f"Mijozga birga olishi uchun mos, jozibali upsell taklifi yozing."
    )
    try:
        text = _call_openai(SYSTEM_PROMPT, user_prompt)
    except Exception:
        text = None
    if text:
        return {'text': text, 'source': 'openai'}
    return {
        'text': f"✨ {product.name} bilan birga {product.price} so'mga arziydigan yangi taklifimiz bor! Savatchaga qo'shing.",
        'source': 'fallback',
    }
