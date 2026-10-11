# QISM VII — AI VA MCP INTEGRATSIYASI

> Talab: *"eng kamida 6 ta AI ga MCP yozilgan va API key orqali muammosiz ishlashi kerak"*

---

## 1. MAQSAD VA PRINTSIP

### 1.1 Nima uchun 6+ provayder

| Sabab | Tushuntirish |
|---|---|
| **Ishonchlilik** | Biri yiqilsa → keyingisi. Tizim hech qachon to'xtamaydi |
| **Narx** | Har vazifa uchun eng arzon mos provayder |
| **Sifat** | Murakkab vazifa → kuchli model; oddiy → arzon model |
| **Tezlik** | Groq juda tez, real-time chat uchun |
| **Mustaqillik** | Bitta kompaniyaga bog'lanmaslik (vendor lock-in yo'q) |
| **Geografiya** | Biri O'zbekistonda bloklanса → boshqasi |

### 1.2 Asosiy printsip

```
Kod HECH QACHON aniq provayderni chaqirmaydi.
Kod faqat VAZIFA aytadi: "bu matnni tarjima qil", "3D model yarat".
Router o'zi eng mos provayderni tanlaydi va yiqilsa keyingisiga o'tadi.
```

---

## 2. 🔌 MCP ARXITEKTURASI

```
┌────────────────────────────────────────────────────────────────┐
│  ILOVA KODI (chatbot, tarjima, 3D, tavsiya)                    │
│  mcp.run(task='chat', prompt=..., context=...)                 │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  MCP ROUTER  (apps/ai/mcp/router.py)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Vazifa turini aniqlash (chat/translate/3d/vision/...)  │  │
│  │ 2. Shu vazifa uchun provayder ro'yxati (prioritet)        │  │
│  │ 3. Circuit breaker holati tekshiriladi                    │  │
│  │ 4. Byudjet tekshiruvi (kunlik limit)                      │  │
│  │ 5. Chaqiruv → xato bo'lsa keyingi provayderga             │  │
│  │ 6. Xarajat yoziladi (AIUsage)                             │  │
│  │ 7. Kesh (bir xil so'rov → keshdan)                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬────────────────────────────────────┘
                            │
      ┌──────┬──────┬───────┼───────┬──────┬──────┬──────┐
      ▼      ▼      ▼       ▼       ▼      ▼      ▼      ▼
   ┌─────┐┌─────┐┌─────┐┌──────┐┌──────┐┌─────┐┌─────┐┌─────┐
   │Claude││Gemini││OpenAI││ Groq ││DeepSk││Meshy││Tripo││Rodin│
   │  #1  ││  #2 ││ #3  ││  #4  ││  #5  ││ #6  ││ #7  ││ #8  │
   └─────┘└─────┘└─────┘└──────┘└──────┘└─────┘└─────┘└─────┘
     chat   chat   chat   chat    chat     3D     3D     3D
     trans  trans  trans  fast    cheap
     vision vision vision
```

---

## 3. 📋 PROVAYDERLAR RO'YXATI (8 ta — talab 6+)

| # | Provayder | Model | Vazifalar | Narx (1M token) | Env |
|---|---|---|---|---|---|
| 1 | **Anthropic Claude** | claude-haiku-4-5 | chat, translate, vision | $0,80 / $4 | `ANTHROPIC_API_KEY` |
| 2 | **Google Gemini** | gemini-2.0-flash | chat, translate, vision | $0,10 / $0,40 | `GEMINI_API_KEY` |
| 3 | **OpenAI** | gpt-4o-mini | chat, translate, vision | $0,15 / $0,60 | `OPENAI_API_KEY` |
| 4 | **Groq** | llama-3.3-70b | chat (juda tez) | $0,59 / $0,79 | `GROQ_API_KEY` |
| 5 | **DeepSeek** | deepseek-chat | chat, translate (arzon) | $0,14 / $0,28 | `DEEPSEEK_API_KEY` |
| 6 | **Mistral** | mistral-small | chat, translate | $0,20 / $0,60 | `MISTRAL_API_KEY` |
| 7 | **Meshy** | meshy-4 | image→3D | ~$0,50/model | `MESHY_API_KEY` |
| 8 | **Tripo** | tripo-v2 | image→3D | ~$0,80/model | `TRIPO_API_KEY` |
| 9 | **Rodin** (ixtiyoriy) | rodin-gen1 | image→3D (yuqori sifat) | ~$1,50/model | `RODIN_API_KEY` |

> ⚡ **Jami 8-9 ta provayder** — talab qilingan 6 tadan ko'p. Har biri API key orqali.

---

## 4. 💻 KOD — MCP QATLAMI

### 4.1 Baza sinf

```python
# apps/ai/mcp/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

@dataclass
class MCPRequest:
    task: str                      # chat|translate|vision|image_to_3d|embedding
    prompt: str = ''
    system: str = ''
    messages: list = None
    images: list = None            # rasm URL yoki base64
    json_mode: bool = False
    max_tokens: int = 1500
    temperature: float = 0.3
    timeout: int = 30
    extra: dict = None

@dataclass
class MCPResponse:
    ok: bool
    content: Any = None
    provider: str = ''
    model: str = ''
    tokens_in: int = 0
    tokens_out: int = 0
    cost_usd: float = 0.0
    latency_ms: int = 0
    error: str = ''
    raw: dict = None


class MCPProvider(ABC):
    """Har bir AI provayder shu interfeysni amalga oshiradi."""
    name: str
    supported_tasks: set
    priority: dict          # {'chat': 10, 'translate': 20}
    price_in: float         # $/1M token
    price_out: float

    @abstractmethod
    def is_configured(self) -> bool:
        """API key mavjudmi"""

    @abstractmethod
    def call(self, req: MCPRequest) -> MCPResponse:
        """Asosiy chaqiruv"""

    def health_check(self) -> bool:
        """Provayder tirikmi (yengil so'rov)"""
        try:
            r = self.call(MCPRequest(task='chat', prompt='ping', max_tokens=5, timeout=8))
            return r.ok
        except Exception:
            return False

    def estimate_cost(self, tin: int, tout: int) -> float:
        return (tin * self.price_in + tout * self.price_out) / 1_000_000
```

### 4.2 Provayder namunasi — Claude

```python
# apps/ai/mcp/providers/claude.py
import anthropic, time, json
from django.conf import settings
from ..base import MCPProvider, MCPRequest, MCPResponse

class ClaudeProvider(MCPProvider):
    name = 'claude'
    supported_tasks = {'chat', 'translate', 'vision', 'reasoning'}
    priority = {'chat': 20, 'translate': 10, 'vision': 15, 'reasoning': 5}
    price_in, price_out = 0.80, 4.00
    MODEL = 'claude-haiku-4-5-20251001'

    def __init__(self):
        self.key = settings.AI_KEYS.get('ANTHROPIC_API_KEY', '')
        self.client = anthropic.Anthropic(api_key=self.key) if self.key else None

    def is_configured(self): return bool(self.key)

    def call(self, req: MCPRequest) -> MCPResponse:
        t0 = time.time()
        try:
            msgs = req.messages or [{'role':'user','content': req.prompt}]
            if req.images:
                msgs[-1]['content'] = [
                    {'type':'image','source':{'type':'url','url': u}} for u in req.images
                ] + [{'type':'text','text': req.prompt}]

            kwargs = dict(model=self.MODEL, max_tokens=req.max_tokens,
                          temperature=req.temperature, messages=msgs)
            if req.system: kwargs['system'] = req.system

            resp = self.client.messages.create(**kwargs, timeout=req.timeout)
            text = resp.content[0].text
            content = json.loads(_strip_fences(text)) if req.json_mode else text

            return MCPResponse(
                ok=True, content=content, provider=self.name, model=self.MODEL,
                tokens_in=resp.usage.input_tokens, tokens_out=resp.usage.output_tokens,
                cost_usd=self.estimate_cost(resp.usage.input_tokens, resp.usage.output_tokens),
                latency_ms=int((time.time()-t0)*1000),
            )
        except Exception as e:
            return MCPResponse(ok=False, provider=self.name, error=str(e),
                               latency_ms=int((time.time()-t0)*1000))
```

### 4.3 Provayder namunasi — Meshy (3D)

```python
# apps/ai/mcp/providers/meshy.py
import requests, time
from ..base import MCPProvider, MCPRequest, MCPResponse

class MeshyProvider(MCPProvider):
    name = 'meshy'
    supported_tasks = {'image_to_3d'}
    priority = {'image_to_3d': 10}          # eng birinchi (arzon)
    price_in = price_out = 0
    BASE = 'https://api.meshy.ai/openapi/v1'
    COST_PER_MODEL = 0.50

    def __init__(self):
        self.key = settings.AI_KEYS.get('MESHY_API_KEY', '')

    def is_configured(self): return bool(self.key)

    def call(self, req: MCPRequest) -> MCPResponse:
        t0 = time.time()
        h = {'Authorization': f'Bearer {self.key}'}
        try:
            # 1. Vazifa yaratish
            r = requests.post(f'{self.BASE}/image-to-3d', headers=h, timeout=30, json={
                'image_url': req.images[0],
                'enable_pbr': True,
                'should_remesh': True,
                'target_polycount': 40000,
                'topology': 'triangle',
            })
            r.raise_for_status()
            task_id = r.json()['result']

            # 2. Poll (maks 10 daqiqa)
            deadline = time.time() + 600
            while time.time() < deadline:
                time.sleep(10)
                s = requests.get(f'{self.BASE}/image-to-3d/{task_id}', headers=h, timeout=20).json()
                st = s.get('status')
                if st == 'SUCCEEDED':
                    return MCPResponse(
                        ok=True, provider=self.name, model='meshy-4',
                        content={'glb_url': s['model_urls']['glb'],
                                 'thumbnail': s.get('thumbnail_url')},
                        cost_usd=self.COST_PER_MODEL,
                        latency_ms=int((time.time()-t0)*1000))
                if st in ('FAILED', 'EXPIRED'):
                    return MCPResponse(ok=False, provider=self.name,
                                       error=s.get('task_error', {}).get('message', st))
            return MCPResponse(ok=False, provider=self.name, error='timeout')
        except Exception as e:
            return MCPResponse(ok=False, provider=self.name, error=str(e))
```

### 4.4 ⚡ ROUTER — eng muhim komponent

```python
# apps/ai/mcp/router.py
import hashlib, json, logging
from django.core.cache import cache
from django.conf import settings
from core.resilience import CircuitBreaker
from .base import MCPRequest, MCPResponse
from .registry import ALL_PROVIDERS

log = logging.getLogger('ai.mcp')

class MCPRouter:
    """
    Vazifani mos provayderga yo'naltiradi.
    Yiqilsa — keyingisiga. Xarajatni hisoblaydi. Keshlaydi.
    """
    def __init__(self):
        self.providers = [p() for p in ALL_PROVIDERS]
        self.breakers = {p.name: CircuitBreaker(f'ai.{p.name}',
                          fail_threshold=3, timeout=120) for p in self.providers}

    # ---- Asosiy metod ----
    def run(self, req: MCPRequest, restaurant_id=None, use_cache=True) -> MCPResponse:
        # 1. Kesh
        ck = self._cache_key(req)
        if use_cache and req.task in ('translate', 'chat'):
            cached = cache.get(ck)
            if cached:
                log.debug(f'[MCP] kesh: {req.task}')
                return MCPResponse(**cached)

        # 2. Byudjet
        if restaurant_id and not self._check_budget(restaurant_id):
            return MCPResponse(ok=False, error='AI_BUDGET_EXCEEDED')

        # 3. Provayder ro'yxati (prioritet bo'yicha)
        candidates = self._candidates(req.task)
        if not candidates:
            return MCPResponse(ok=False, error=f'NO_PROVIDER_FOR_{req.task}')

        # 4. Zanjir bo'ylab urinish
        errors = []
        for p in candidates:
            br = self.breakers[p.name]
            if br.is_open():
                errors.append(f'{p.name}: circuit_open')
                continue

            log.info(f'[MCP] {req.task} → {p.name}')
            resp = p.call(req)

            if resp.ok:
                br.on_success()
                self._record(resp, restaurant_id, req.task)
                if use_cache and req.task in ('translate', 'chat'):
                    cache.set(ck, resp.__dict__, 3600)
                return resp

            br.on_failure()
            errors.append(f'{p.name}: {resp.error}')
            log.warning(f'[MCP] {p.name} xato: {resp.error} → keyingisi')

        log.error(f'[MCP] BARCHA provayder yiqildi: {errors}')
        return MCPResponse(ok=False, error='ALL_PROVIDERS_FAILED',
                           raw={'errors': errors})

    # ---- Yordamchilar ----
    def _candidates(self, task):
        ps = [p for p in self.providers
              if p.is_configured() and task in p.supported_tasks]
        return sorted(ps, key=lambda p: p.priority.get(task, 999))

    def _cache_key(self, req):
        raw = f'{req.task}|{req.system}|{req.prompt}|{req.temperature}'
        return f'mcp:{hashlib.sha256(raw.encode()).hexdigest()[:32]}'

    def _check_budget(self, restaurant_id):
        today = timezone.now().date()
        spent = AIUsage.objects.filter(
            restaurant_id=restaurant_id, created_at__date=today
        ).aggregate(s=Sum('cost_usd'))['s'] or 0
        limit = settings.AI_DAILY_LIMIT_PER_RESTAURANT   # masalan $2
        if spent >= limit:
            log.warning(f'[MCP] Byudjet tugadi: rest={restaurant_id} ${spent}')
            return False
        return True

    def _record(self, resp, restaurant_id, task):
        AIUsage.objects.create(
            restaurant_id=restaurant_id, provider=resp.provider, model=resp.model,
            task=task, tokens_in=resp.tokens_in, tokens_out=resp.tokens_out,
            cost_usd=resp.cost_usd, latency_ms=resp.latency_ms)
        metrics.inc(f'ai.{resp.provider}.success')
        metrics.observe('ai.latency_ms', resp.latency_ms, {'provider': resp.provider})
        metrics.add('ai.cost_usd', resp.cost_usd, {'provider': resp.provider})


mcp = MCPRouter()      # singleton
```

### 4.5 Ishlatilishi (juda oddiy)

```python
from apps.ai.mcp import mcp, MCPRequest

# Chatbot
resp = mcp.run(MCPRequest(
    task='chat',
    system=CHAT_SYSTEM_PROMPT,
    prompt=user_question,
    max_tokens=400,
), restaurant_id=rid)

if resp.ok:
    answer = resp.content
else:
    answer = t('chat.error')      # "Ofitsiantni chaqiring"

# Tarjima
resp = mcp.run(MCPRequest(task='translate', prompt=..., json_mode=True))

# 3D model
resp = mcp.run(MCPRequest(task='image_to_3d', images=[photo_url]))
glb_url = resp.content['glb_url'] if resp.ok else None
```

---

## 5. 🔑 API KEY BOSHQARUVI

### 5.1 `.env` fayl

```bash
# --- AI provayderlar (kamida 3 tasi to'ldirilishi kerak) ---
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
OPENAI_API_KEY=sk-proj-...
GROQ_API_KEY=gsk_...
DEEPSEEK_API_KEY=sk-...
MISTRAL_API_KEY=...

# --- 3D generatsiya ---
MESHY_API_KEY=msy_...
TRIPO_API_KEY=tsk_...
RODIN_API_KEY=...

# --- Limitlar ---
AI_DAILY_LIMIT_PER_RESTAURANT=2.0    # $/kun
AI_MONTHLY_LIMIT_TOTAL=500.0         # $/oy (butun platforma)
AI_CACHE_TTL=3600
```

### 5.2 Ishga tushishda tekshiruv

```python
# apps/ai/apps.py
class AIConfig(AppConfig):
    def ready(self):
        from .mcp import mcp
        configured = [p.name for p in mcp.providers if p.is_configured()]
        chat_providers = [p for p in mcp.providers
                          if p.is_configured() and 'chat' in p.supported_tasks]
        three_d = [p for p in mcp.providers
                   if p.is_configured() and 'image_to_3d' in p.supported_tasks]

        log.info(f'[AI] Sozlangan provayderlar ({len(configured)}): {configured}')

        if len(chat_providers) < 2:
            log.warning('⚠️ [AI] Kamida 2 ta chat provayderi tavsiya etiladi (fallback uchun)')
        if not three_d:
            log.warning('⚠️ [AI] 3D provayder yo\'q — AI model generatsiyasi ishlamaydi')
        if not configured:
            log.error('❌ [AI] HECH BIR provayder sozlanmagan!')
```

### 5.3 Xavfsizlik

| Chora | Amalda |
|---|---|
| Key kodda YO'Q | Faqat `.env` / Vault |
| `.env` git'da YO'Q | `.gitignore` |
| Log'da key ko'rinmaydi | Maskalash: `sk-ant-***` |
| Frontendga uzatilmaydi | Barcha AI chaqiruvi backendda |
| Rotatsiya | 90 kunda bir marta |
| Har provayderga alohida limit | Provayder panelida |

---

## 6. 🤖 AI VAZIFALARI (nima uchun ishlatiladi)

| # | Vazifa | Provayder prioriteti | Chastota | Oylik xarajat (500 rest) |
|---|---|---|---|---|
| 1 | **Chatbot** (mijoz savoli) | Gemini→Groq→DeepSeek→Claude | ~50k/oy | ~$45 |
| 2 | **Tarjima** (menyu) | Claude→Gemini→GPT | ~5k/oy | ~$12 |
| 3 | **3D generatsiya** | Meshy→Tripo→Rodin | ~800/oy | ~$400 |
| 4 | **Taom tavsifi yozish** | Claude→Gemini | ~2k/oy | ~$8 |
| 5 | **Menyu tahlili** (tavsiya) | Claude | ~500/oy | ~$15 |
| 6 | **Otziv tahlili** (sentiment) | Gemini→DeepSeek | ~10k/oy | ~$6 |
| 7 | **Rasm sifatini baholash** | Gemini vision | ~3k/oy | ~$5 |
| 8 | **Kutubxona moslashtirish** (embedding) | Gemini embedding | ~5k/oy | ~$2 |
| | **JAMI** | | | **~$493/oy** |

> 💰 500 restoran × 590k so'm ≈ 295 mln so'm/oy (~$23 300).
> AI xarajati = **2,1%** daromaddan. ✅ Sog'lom.

---

## 7. 💬 CHATBOT — TO'LIQ AMALGA OSHIRISH

### 7.1 System prompt

```python
CHAT_SYSTEM = """Sen "{restaurant_name}" restoranining menyu yordamchisisan.

VAZIFANG: mijozga menyu bo'yicha yordam berish va taom tanlashga ko'maklashish.

QAT'IY QOIDALAR:
1. FAQAT quyidagi menyudagi taomlar haqida gapir. Menyuda yo'q taomni TAKLIF QILMA.
2. Narxlarni aynan menyudagidek ayt. O'zingdan narx O'YLAB TOPMA.
3. Javob QISQA bo'lsin — 2-4 gap. Mijoz och, uzun matn o'qimaydi.
4. {lang} tilida javob ber.
5. Milliy taom haqida so'ralsa — nima ekanini QISQA tushuntir (chet ellik bilmasligi mumkin).
6. Allergiya/parhez so'ralsa — DIQQAT BILAN javob ber, faqat teglar asosida.
   Ishonchsiz bo'lsang: "Ofitsiantdan aniqlashtirishingizni so'raymiz".
7. Menyudan tashqari savol (siyosat, ob-havo, dasturlash) → xushmuomala rad et.
8. Har javobda 1-2 ta taom taklif qil (upsell), lekin bosim o'tkazma.

MENYU:
{menu_json}

MIJOZ SAVATIDA: {cart_summary}
"""
```

### 7.2 Chatbot servisi

```python
# apps/ai/services/chat.py

def answer_question(session, question: str, lang: str) -> dict:
    # 1. Rate limit
    if not rate_limit_ok(f'chat:{session.id}', limit=10, window=300):
        return {'error': 'rate_limited', 'text': t('errors.rate_limited', lang)}

    # 2. Kirish tozalash
    question = question.strip()[:500]
    if not question:
        return {'error': 'empty'}

    # 3. Menyu konteksti (kesh, kesilgan — token tejash)
    menu_ctx = build_menu_context(session.restaurant_id, lang)   # ~1500 token

    # 4. Suhbat tarixi (oxirgi 6 xabar)
    history = get_chat_history(session.id, limit=6)

    # 5. MCP chaqiruvi
    resp = mcp.run(MCPRequest(
        task='chat',
        system=CHAT_SYSTEM.format(
            restaurant_name=session.restaurant.name, lang=LANG_NAMES[lang],
            menu_json=menu_ctx, cart_summary=summarize_cart(session)),
        messages=history + [{'role': 'user', 'content': question}],
        max_tokens=350, temperature=0.4,
    ), restaurant_id=session.restaurant_id)

    if not resp.ok:
        return {'error': 'ai_unavailable', 'text': t('chat.error', lang)}

    text = resp.content

    # 6. ⚡ VALIDATSIYA — AI o'ylab topgan taomni bloklash
    mentioned = extract_dish_mentions(text, menu_ctx)
    invalid = [d for d in mentioned if d not in valid_dish_names(session.restaurant_id)]
    if invalid:
        log.warning(f'[AI] Menyuda yo\'q taom aytdi: {invalid}')
        text = remove_invalid_mentions(text, invalid)

    # 7. Tugmalar biriktirish
    buttons = build_action_buttons(mentioned, session.restaurant_id, lang)
    # [{'type':'ar','dish_id':15,'label':'AR\'da ko\'rish'},
    #  {'type':'order','dish_id':15,'label':'Buyurtma'}]

    # 8. Tarixga saqlash
    save_chat_message(session.id, 'user', question)
    save_chat_message(session.id, 'assistant', text)

    return {'text': text, 'buttons': buttons, 'provider': resp.provider}
```

### 7.3 Menyu konteksti (token tejash — muhim)

```python
def build_menu_context(restaurant_id: int, lang: str) -> str:
    """
    To'liq menyu emas — faqat AI uchun zarur maydonlar.
    100 taom ≈ 1500 token (to'liq bo'lsa 8000+ bo'lardi).
    """
    key = f'ai:menuctx:{restaurant_id}:{lang}'
    ctx = cache.get(key)
    if ctx: return ctx

    dishes = Dish.objects.filter(
        restaurant_id=restaurant_id, is_available=True
    ).select_related('category').only(
        'id','name_uz','name_ru','name_en','price','diet_tags','allergens',
        'cook_min','category__name_uz','category__name_ru','category__name_en')

    lines = []
    for d in dishes:
        tags = ','.join(d.diet_tags) if d.diet_tags else '-'
        alrg = ','.join(d.allergens) if d.allergens else '-'
        lines.append(f"{d.id}|{t(d,'name',lang)}|{int(d.price)}|{tags}|{alrg}|{d.cook_min}min")

    ctx = "ID|Nom|Narx|Teglar|Allergen|Vaqt\n" + "\n".join(lines)
    cache.set(key, ctx, 300)
    return ctx
```

---

## 8. 🧪 AI TESTLARI

```python
# tests/test_ai.py

def test_fallback_chain(monkeypatch):
    """Birinchi 2 provayder yiqilsa, 3-chisi ishlashi kerak"""
    monkeypatch.setattr(GeminiProvider, 'call',
                        lambda s, r: MCPResponse(ok=False, error='500'))
    monkeypatch.setattr(GroqProvider, 'call',
                        lambda s, r: MCPResponse(ok=False, error='timeout'))
    resp = mcp.run(MCPRequest(task='chat', prompt='salom'))
    assert resp.ok
    assert resp.provider not in ('gemini', 'groq')

def test_all_providers_down():
    """Hammasi yiqilsa — chiroyli xato, crash EMAS"""
    with mock_all_providers_fail():
        resp = mcp.run(MCPRequest(task='chat', prompt='salom'))
    assert not resp.ok
    assert resp.error == 'ALL_PROVIDERS_FAILED'

def test_budget_limit(restaurant):
    AIUsageFactory.create_batch(100, restaurant=restaurant, cost_usd=0.05)  # $5
    resp = mcp.run(MCPRequest(task='chat', prompt='x'), restaurant_id=restaurant.id)
    assert resp.error == 'AI_BUDGET_EXCEEDED'

def test_chatbot_does_not_invent_dishes(restaurant, menu):
    """AI menyuda yo'q taomni taklif qilmasligi SHART"""
    r = answer_question(session, "Sushi bormi?", 'uz')
    assert 'sushi' not in r['text'].lower() or 'yo\'q' in r['text'].lower()

def test_circuit_breaker_opens():
    """3 xatodan keyin provayder chetlab o'tiladi"""
    for _ in range(3):
        mcp.breakers['gemini'].on_failure()
    assert mcp.breakers['gemini'].is_open()

def test_cost_recorded(restaurant):
    mcp.run(MCPRequest(task='chat', prompt='salom'), restaurant_id=restaurant.id)
    assert AIUsage.objects.filter(restaurant=restaurant).exists()
```

---

## 9. 📊 AI KUZATUVI (P-05 sahifasi)

```
┌───────────────────────────────────────────────────────────────┐
│ 🤖 AI xarajatlari                        [Bu oy ▾]           │
├───────────────────────────────────────────────────────────────┤
│ Jami: $487  |  Byudjet: $500  |  ████████████████░ 97%       │
├───────────────────────────────────────────────────────────────┤
│ Provayder    Chaqiruv   Xarajat   O'rt.vaqt   Xato   Holat   │
│ ─────────────────────────────────────────────────────────────│
│ Meshy         782       $391      4m 12s      2,1%   🟢      │
│ Gemini      48 210      $ 42      0,8s        0,3%   🟢      │
│ Claude       6 104      $ 31      1,4s        0,1%   🟢      │
│ Groq        12 890      $ 15      0,3s        1,8%   🟢      │
│ DeepSeek     3 201      $  5      1,1s        0,4%   🟢      │
│ Tripo           89      $  3      6m 40s      8,9%   🟡      │
│ OpenAI           0      $  0      —           —      ⚪ zaxira│
├───────────────────────────────────────────────────────────────┤
│ ⚠️ Tripo xato darajasi yuqori (8,9%) — prioritet pasaytirildi │
│ 💡 Gemini eng samarali: 48k chaqiruv, atigi $42                │
└───────────────────────────────────────────────────────────────┘
```

---

## 10. 🔮 KELAJAKKA TAYYORLIK

MCP qatlami tufayli quyidagilar **kod o'zgartirmasdan** qo'shiladi:

| Kelajak | Nima qilinadi |
|---|---|
| Yangi AI model chiqdi | Provayder faylida `MODEL` o'zgartiriladi |
| Yangi provayder | 1 ta fayl (~80 qator) + registry'ga qo'shish |
| Ovozli buyurtma | `task='speech_to_text'` + Whisper provayder |
| Rasm bo'yicha qidiruv | `task='vision'` (allaqachon bor) |
| Video generatsiya | `task='text_to_video'` + provayder |
| Lokal model (arzon) | Ollama provayderi, prioritet #1 |
| Narx tushdi | `priority` config'da o'zgartiriladi |

> 🎯 **Bu — 5 yillik chidamlilikning texnik asosi.**
> AI dunyosi tez o'zgaradi, lekin bizning kod o'zgarmaydi.

---

**➡️ Keyingi qism:** [08_DEPLOY_VA_REJA.md](08_DEPLOY_VA_REJA.md)
