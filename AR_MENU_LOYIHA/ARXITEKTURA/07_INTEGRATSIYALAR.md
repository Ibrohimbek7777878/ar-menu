# ARMENU — TIZIM ARXITEKTURASI
## QISM 7 — INTEGRATSIYALAR

**Versiya:** 1.0 · **Sana:** 2026-09-08
**Kim uchun:** backend dasturchi · integratsiya muhandisi · texnik direktor
**Oldingi:** `06_XAVFSIZLIK.md` · **Keyingi:** `08_DEPLOY_VA_OPERATSIYA.md`

---

## 1. INTEGRATSIYA XARITASI

### 1.1 To'liq ko'rinish

```
                          ┌─────────────────────────────┐
                          │      ARMENU PLATFORMA       │
                          │   (modulli monolit, :8060)  │
                          └──────────────┬──────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │  CHIQUVCHI (biz chaqiramiz)    │    KIRUVCHI (bizga keladi)     │
        ▼                                │                                ▼
┌───────────────────────────┐            │        ┌──────────────────────────────┐
│ 🤖 AI / MCP (8 provayder) │            │        │ 💳 To'lov webhook             │
│  Claude   ·  Gemini       │            │        │   Payme  JSON-RPC  ← POST     │
│  OpenAI   ·  Groq         │            │        │   Click  Prepare/Complete     │
│  DeepSeek ·  Mistral      │            │        │   Uzum   HMAC callback        │
│  Meshy    ·  Tripo        │            │        ├──────────────────────────────┤
│  🟡 kritiklik: O'RTA      │            │        │ 🤖 Telegram webhook           │
│  (fallback zanjiri bor)   │            │        │   bot update  ← POST          │
└───────────────────────────┘            │        │   Mini App initData           │
┌───────────────────────────┐            │        ├──────────────────────────────┤
│ 💳 To'lov (3 provayder)   │            │        │ 🧾 OFD status callback        │
│  Payme · Click · Uzum     │            │        │   (ixtiyoriy, poll ham bor)   │
│  🔴 kritiklik: YUQORI     │            │        ├──────────────────────────────┤
│  (pul — 0 xato)           │            │        │ 🌐 Ochiq API (v2)             │
└───────────────────────────┘            │        │   3rd party POS / agregator  │
┌───────────────────────────┐            │        │   🟢 kritiklik: PAST          │
│ 🧾 Fiskal / OFD (2 ta)    │            │        └──────────────────────────────┘
│  UZKASSA · e-POS          │            │
│  tasnif.soliq.uz (IKPU)   │            │
│  🔴 kritiklik: YUQORI     │            │
│  (qonuniy talab)          │            │
└───────────────────────────┘            │
┌───────────────────────────┐            │
│ 📨 Telegram Bot API       │            │
│  bildirishnoma, Mini App  │            │
│  🟡 kritiklik: O'RTA      │            │
└───────────────────────────┘            │
┌───────────────────────────┐            │
│ ☁️ CDN + Storage          │            │
│  Cloudflare · S3/MinIO    │            │
│  🔴 kritiklik: YUQORI     │            │
│  (3D fayl = AR yuragi)    │            │
└───────────────────────────┘            │
┌───────────────────────────┐            │
│ 📊 Tashqi (ixtiyoriy)     │            │
│  Google Places (sharh)    │            │
│  Yandex Maps · CBU kurs   │            │
│  🟢 kritiklik: PAST       │            │
└───────────────────────────┘            │
```

### 1.2 Kritiklik darajasi va oqibati

| Xizmat | Yo'nalish | Kritiklik | Yiqilsa nima bo'ladi | Fallback |
|---|---|---|---|---|
| **Payme / Click / Uzum** | ikki tomonlama | 🔴 Yuqori | Ilovada to'lash yo'q | Boshqa provayder → **naqd (ofitsiantga)** |
| **OFD (UZKASSA/e-POS)** | chiquvchi | 🔴 Yuqori | Chek yuborilmaydi (qonun buzilishi) | 2-OFD → navbat (48 s) → qo'lda kassa |
| **CDN / S3** | chiquvchi | 🔴 Yuqori | 3D fayl yuklanmaydi → AR yo'q | Origin → lokal kesh → **rasm fallback** |
| **PostgreSQL** | ichki | 🔴 Yuqori | — (bu integratsiya emas, yadro) | replica (o'qish) |
| **AI (8 provayder)** | chiquvchi | 🟡 O'rta | Chat/tarjima/3D yo'q | Zanjir 8 ta → "Ofitsiantni chaqiring" |
| **Telegram** | ikki tomonlama | 🟡 O'rta | Push yo'q, Mini App yo'q | WS + brauzer notification |
| **tasnif.soliq.uz (IKPU)** | chiquvchi | 🟡 O'rta | Yangi taomga IKPU topilmaydi | Kesh → qo'lda kiritilgan kod |
| **Google Places** | chiquvchi | 🟢 Past | Sharh filtri ishlamaydi | Yashiriladi |
| **CBU kurs** | chiquvchi | 🟢 Past | Valyuta konvertatsiya eskiradi | Oxirgi ma'lum kurs |

### 1.3 Bir qarashda raqamlar

| Ko'rsatkich | Qiymat |
|---|---|
| Tashqi chiquvchi integratsiya | **16 ta** endpoint guruhi |
| Kiruvchi webhook | **5 ta** (Payme, Click, Uzum, Telegram, OFD) |
| Adapter sinflar soni | **16** (`base.py` interfeysi bilan) |
| Circuit breaker sonlari | **16** (har adapterga 1 ta) |
| Oylik tashqi xarajat (500 restoran) | **~$620** |

---

## 2. UMUMIY INTEGRATSIYA NAQSHI

> ⚡ **Qoida:** Kod HECH QACHON tashqi provayderni to'g'ridan-to'g'ri chaqirmaydi.
> Kod faqat **niyat** bildiradi. Qaysi provayder — registry hal qiladi.

### 2.1 4 qatlamli naqsh

```
┌──────────────────────────────────────────────────────────────────┐
│ [1] ILOVA KODI                                                   │
│     payments.charge(order, amount)                               │
│     fiscal.send_receipt(order)                                   │
│     mcp.run(MCPRequest(task='chat', ...))                        │
│     ⛔ requests.post('https://checkout.paycom.uz') ← TAQIQLANGAN  │
└─────────────────────────────┬────────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│ [2] ROUTER / SERVICE  (integrations/<domain>/router.py)           │
│     • provayder tanlash (prioritet / restoran sozlamasi)          │
│     • circuit breaker                                             │
│     • retry + backoff + jitter                                    │
│     • idempotency                                                 │
│     • metrics + log + audit                                       │
│     • fallback zanjiri                                            │
└─────────────────────────────┬────────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│ [3] REGISTRY  (integrations/<domain>/registry.py)                 │
│     ALL_PROVIDERS = [PaymeAdapter, ClickAdapter, UzumAdapter]     │
│     ← yangi provayder = shu ro'yxatga 1 qator                     │
└─────────────────────────────┬────────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│ [4] ADAPTER  (integrations/<domain>/providers/<name>.py)          │
│     • FAQAT shu provayderning protokoli                           │
│     • tashqi format → ichki dataclass                             │
│     • HTTP, imzo, xato kodlari — hammasi shu yerda qamalgan       │
└─────────────────────────────┬────────────────────────────────────┘
                              │  HTTPS
                              ▼
                    ┌───────────────────┐
                    │  TASHQI XIZMAT    │
                    └───────────────────┘
```

### 2.2 Nega aynan shu naqsh

| Sabab | Amaldagi foyda |
|---|---|
| **Provayder almashadi** | Payme narxi oshdi → Click birinchi. 1 qator config |
| **API o'zgaradi** | OFD v2 chiqdi → faqat 1 ta adapter fayli o'zgaradi |
| **Test oson** | Adapter mock qilinadi, biznes logika tegilmaydi |
| **Xato qamalgan** | Tashqi kutubxona `Exception`'i adapter'dan chiqmaydi |
| **Kuzatuv bir joyda** | Metric/log/circuit breaker router'da — 16 joyda takrorlanmaydi |
| **Kelajak** | Yangi provayder = 1 fayl + registry'ga 1 qator |

### 2.3 Baza interfeysi (barcha domenlar uchun umumiy)

```python
# integrations/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class IntegrationRequest:
    """Har qanday tashqi chaqiruv uchun umumiy so'rov."""
    op: str                              # 'charge', 'refund', 'send_receipt', ...
    payload: dict = field(default_factory=dict)
    idempotency_key: str = ''            # ⚡ har yozuv operatsiyasida MAJBURIY
    timeout: int = 15
    restaurant_id: int | None = None
    meta: dict = field(default_factory=dict)


@dataclass
class IntegrationResponse:
    ok: bool
    data: Any = None
    provider: str = ''
    external_id: str = ''                # tashqi tizimdagi ID
    error_code: str = ''                 # ichki normallashtirilgan kod
    error_msg: str = ''
    retryable: bool = False              # ⚡ qayta urinsa bo'ladimi
    latency_ms: int = 0
    raw: dict = field(default_factory=dict)


class BaseAdapter(ABC):
    """Har bir tashqi xizmat adapteri shu interfeysni bajaradi."""

    name: str                  # 'payme'
    domain: str                # 'payment' | 'fiscal' | 'ai' | 'messaging' | 'storage'
    priority: int = 100        # kichik = birinchi
    supported_ops: set = set()

    # --- majburiy ---
    @abstractmethod
    def is_configured(self) -> bool:
        """API kalitlar to'liqmi (kalit yo'q → registry bu adapterni tashlab ketadi)"""

    @abstractmethod
    def execute(self, req: IntegrationRequest) -> IntegrationResponse:
        """Asosiy chaqiruv. HECH QACHON exception ko'tarmaydi — Response qaytaradi."""

    # --- ixtiyoriy, standart amalga oshirish ---
    def health_check(self) -> bool:
        return self.is_configured()

    def verify_webhook(self, headers: dict, body: bytes) -> bool:
        """Kiruvchi webhook imzosini tekshirish (to'lov/Telegram uchun)"""
        return False

    def normalize_error(self, exc: Exception) -> tuple[str, bool]:
        """(error_code, retryable)"""
        import requests
        if isinstance(exc, requests.Timeout):
            return 'TIMEOUT', True
        if isinstance(exc, requests.ConnectionError):
            return 'NETWORK', True
        return 'UNKNOWN', False
```

### 2.4 Umumiy router (barcha domen router'lari shundan meros oladi)

```python
# integrations/router.py
import time
import logging
from django.core.cache import cache
from core.resilience import CircuitBreaker
from core import metrics
from .base import IntegrationRequest, IntegrationResponse

log = logging.getLogger('integrations')


class BaseRouter:
    """
    Provayder tanlash + circuit breaker + retry + idempotency + metrics.
    Domen router'lari (PaymentRouter, FiscalRouter, MCPRouter) shundan meros oladi.
    """
    domain = ''
    registry: list = []                 # adapter sinflari
    cb_fail_threshold = 5
    cb_timeout = 60
    max_retries = 2
    idempotency_ttl = 86400             # 24 soat

    def __init__(self):
        self.adapters = [cls() for cls in self.registry]
        self.breakers = {
            a.name: CircuitBreaker(
                f'{self.domain}.{a.name}',
                fail_threshold=self.cb_fail_threshold,
                timeout=self.cb_timeout,
            )
            for a in self.adapters
        }

    # ---------- asosiy ----------
    def execute(self, req: IntegrationRequest, prefer: str = '') -> IntegrationResponse:
        # 1. Idempotency — bir xil kalit bilan ikkinchi marta kelsa, saqlangan javob
        if req.idempotency_key:
            cached = cache.get(self._idem_key(req))
            if cached:
                log.info('[%s] idempotent takror: %s', self.domain, req.idempotency_key)
                return IntegrationResponse(**cached)

        candidates = self._candidates(req.op, prefer)
        if not candidates:
            return IntegrationResponse(ok=False, error_code='NO_PROVIDER')

        errors = []
        for adapter in candidates:
            br = self.breakers[adapter.name]
            if br.is_open():
                errors.append(f'{adapter.name}:circuit_open')
                metrics.inc(f'cb.{self.domain}.{adapter.name}.rejected')
                continue

            resp = self._call_with_retry(adapter, req)

            if resp.ok:
                br.on_success()
                self._record(adapter, req, resp)
                if req.idempotency_key:
                    cache.set(self._idem_key(req), resp.__dict__, self.idempotency_ttl)
                return resp

            # ⚡ retryable EMAS xato (masalan "mablag' yetarli emas") →
            #    keyingi provayderga o'tish MA'NOSIZ, darhol qaytariladi
            if not resp.retryable:
                self._record(adapter, req, resp)
                return resp

            br.on_failure()
            errors.append(f'{adapter.name}:{resp.error_code}')
            log.warning('[%s] %s yiqildi (%s) → keyingisi',
                        self.domain, adapter.name, resp.error_code)

        log.error('[%s] BARCHA provayder yiqildi: %s', self.domain, errors)
        return IntegrationResponse(ok=False, error_code='ALL_PROVIDERS_FAILED',
                                   raw={'errors': errors})

    # ---------- yordamchilar ----------
    def _candidates(self, op, prefer=''):
        ps = [a for a in self.adapters if a.is_configured() and op in a.supported_ops]
        ps.sort(key=lambda a: (a.name != prefer, a.priority))
        return ps

    def _call_with_retry(self, adapter, req):
        delay = 0.5
        last = None
        for attempt in range(self.max_retries + 1):
            t0 = time.time()
            try:
                resp = adapter.execute(req)
            except Exception as exc:                    # adapter buzilib chiqsa ham
                code, retryable = adapter.normalize_error(exc)
                resp = IntegrationResponse(ok=False, provider=adapter.name,
                                           error_code=code, error_msg=str(exc),
                                           retryable=retryable)
            resp.latency_ms = resp.latency_ms or int((time.time() - t0) * 1000)
            if resp.ok or not resp.retryable:
                return resp
            last = resp
            if attempt < self.max_retries:
                time.sleep(delay)
                delay *= 3
        return last

    def _idem_key(self, req):
        return f'idem:{self.domain}:{req.op}:{req.idempotency_key}'

    def _record(self, adapter, req, resp):
        metrics.observe(f'external.latency_ms', resp.latency_ms,
                        {'domain': self.domain, 'provider': adapter.name})
        metrics.inc(f'external.{"success" if resp.ok else "failure"}',
                    {'domain': self.domain, 'provider': adapter.name})
        IntegrationLog.objects.create(
            domain=self.domain, provider=adapter.name, op=req.op,
            restaurant_id=req.restaurant_id, ok=resp.ok,
            external_id=resp.external_id, error_code=resp.error_code,
            latency_ms=resp.latency_ms,
            request_digest=mask_secrets(req.payload),      # ⚡ PII/kalit maskalanadi
        )
```

### 2.5 Papka tuzilishi

```
apps/integrations/
├── base.py                    # BaseAdapter, IntegrationRequest/Response
├── router.py                  # BaseRouter (yuqoridagi)
├── models.py                  # IntegrationLog, WebhookEvent
├── masking.py                 # mask_secrets() — log uchun
│
├── ai/                        # ⚡ MCP qatlami (§3)
│   ├── base.py                # MCPProvider, MCPRequest/Response
│   ├── router.py              # MCPRouter
│   ├── registry.py
│   └── providers/
│       ├── claude.py  gemini.py  openai.py  groq.py
│       ├── deepseek.py  mistral.py
│       └── meshy.py  tripo.py
│
├── payment/                   # §4
│   ├── router.py  registry.py  webhooks.py  reconcile.py
│   └── providers/  payme.py  click.py  uzum.py
│
├── fiscal/                    # §5
│   ├── router.py  registry.py  ikpu.py  retry.py
│   └── providers/  uzkassa.py  epos.py
│
├── messaging/                 # §6
│   ├── router.py  queue.py  ratelimit.py
│   └── providers/  telegram.py
│
└── storage/                   # §7
    ├── router.py  cdn.py
    └── providers/  s3.py  minio.py
```

---

## 3. ⚡ AI / MCP QATLAMI

> Talab: *"eng kamida 6 ta AI ga MCP yozilgan va API key orqali muammosiz ishlashi"*
> Bajarildi: **8 ta provayder** (+1 ixtiyoriy).

### 3.1 To'liq arxitektura

```
┌──────────────────────────────────────────────────────────────────────┐
│ ILOVA KODI                                                           │
│   chat.answer_question()      menu.auto_translate()                  │
│   ar3d.generate_from_photo()  reviews.analyze_sentiment()            │
│                                                                      │
│   mcp.run(MCPRequest(task='chat', prompt=...), restaurant_id=rid)    │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────────────┐
│ MCP ROUTER  (apps/integrations/ai/router.py)                         │
│                                                                      │
│  ┌────┐  ┌──────────┐  ┌─────────┐  ┌────────┐  ┌────────┐  ┌─────┐ │
│  │ 1  │→ │    2     │→ │    3    │→ │   4    │→ │   5    │→ │  6  │ │
│  │KESH│  │PRIORITET │  │ CIRCUIT │  │BYUDJET │  │FALLBACK│  │USAGE│ │
│  │    │  │ ro'yxat  │  │ BREAKER │  │ limit  │  │ zanjir │  │yozuv│ │
│  └────┘  └──────────┘  └─────────┘  └────────┘  └────────┘  └─────┘ │
│    │                                                            │    │
│    │ hit → darhol qaytariladi                    AIUsage ───────┘    │
│    ▼                                             metrics             │
│  Redis (TTL 3600s, faqat chat/translate)                             │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
   ┌──────┬──────┬──────┬────────┼────────┬──────┬──────┬──────┐
   ▼      ▼      ▼      ▼        ▼        ▼      ▼      ▼      ▼
┌──────┬──────┬──────┬──────┬────────┬────────┬──────┬──────┐
│Claude│Gemini│OpenAI│ Groq │DeepSeek│Mistral │Meshy │Tripo │
│  #1  │  #2  │  #3  │  #4  │   #5   │   #6   │  #7  │  #8  │
└──────┴──────┴──────┴──────┴────────┴────────┴──────┴──────┘
 chat   chat   chat   chat    chat     chat     3D     3D
 trans  trans  trans  (tez)  (arzon)  trans
 vision vision vision                 embed
```

### 3.2 Interfeys — `MCPProvider` ABC

```python
# apps/integrations/ai/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class MCPRequest:
    task: str                          # chat|translate|vision|image_to_3d|embedding
    prompt: str = ''
    system: str = ''
    messages: list = field(default_factory=list)
    images: list = field(default_factory=list)     # URL yoki base64
    json_mode: bool = False
    max_tokens: int = 1500
    temperature: float = 0.3
    timeout: int = 30
    extra: dict = field(default_factory=dict)


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
    raw: dict = field(default_factory=dict)


class MCPProvider(ABC):
    name: str
    supported_tasks: set
    priority: dict                 # {'chat': 20, 'translate': 10}
    price_in: float                # $ / 1M kirish token
    price_out: float               # $ / 1M chiqish token

    @abstractmethod
    def is_configured(self) -> bool: ...

    @abstractmethod
    def call(self, req: MCPRequest) -> MCPResponse:
        """⚡ HECH QACHON exception ko'tarmaydi — MCPResponse(ok=False) qaytaradi."""

    def health_check(self) -> bool:
        try:
            return self.call(MCPRequest(task='chat', prompt='ping',
                                        max_tokens=5, timeout=8)).ok
        except Exception:
            return False

    def estimate_cost(self, tin: int, tout: int) -> float:
        return (tin * self.price_in + tout * self.price_out) / 1_000_000
```

### 3.3 Router — 7 bosqich

| # | Bosqich | Nima qiladi | Yiqilsa |
|---|---|---|---|
| 1 | **Kesh** | `sha256(task+system+prompt+temp)` → Redis (TTL 3600s). Faqat `chat`/`translate` | Keshsiz davom |
| 2 | **Byudjet** | Restoran kunlik limiti (`AI_DAILY_LIMIT_PER_RESTAURANT=$2`) + platforma oylik ($500) | `AI_BUDGET_EXCEEDED` |
| 3 | **Nomzodlar** | `is_configured()` va `task in supported_tasks` → `priority` bo'yicha saralash | `NO_PROVIDER_FOR_<task>` |
| 4 | **Circuit breaker** | `OPEN` bo'lgan provayder chetlab o'tiladi (3 xato → 120s) | keyingisiga |
| 5 | **Chaqiruv** | `provider.call(req)` | keyingisiga |
| 6 | **Yozuv** | `AIUsage` + Prometheus metrikalar | log |
| 7 | **Keshga qo'yish** | Muvaffaqiyatli javob keshlanadi | — |

```python
# apps/integrations/ai/router.py
import hashlib
import logging
from django.core.cache import cache
from django.conf import settings
from django.db.models import Sum
from django.utils import timezone
from core.resilience import CircuitBreaker
from core import metrics
from .base import MCPRequest, MCPResponse
from .registry import ALL_PROVIDERS

log = logging.getLogger('ai.mcp')

CACHEABLE = {'translate', 'chat', 'embedding'}


class MCPRouter:
    def __init__(self):
        self.providers = [cls() for cls in ALL_PROVIDERS]
        self.breakers = {
            p.name: CircuitBreaker(f'ai.{p.name}', fail_threshold=3, timeout=120)
            for p in self.providers
        }

    def run(self, req: MCPRequest, restaurant_id=None, use_cache=True) -> MCPResponse:
        # [1] KESH
        ck = self._cache_key(req)
        if use_cache and req.task in CACHEABLE:
            hit = cache.get(ck)
            if hit:
                metrics.inc('ai.cache.hit', {'task': req.task})
                return MCPResponse(**hit)
            metrics.inc('ai.cache.miss', {'task': req.task})

        # [2] BYUDJET
        if restaurant_id and not self._check_budget(restaurant_id):
            return MCPResponse(ok=False, error='AI_BUDGET_EXCEEDED')
        if not self._check_platform_budget():
            return MCPResponse(ok=False, error='AI_PLATFORM_BUDGET_EXCEEDED')

        # [3] NOMZODLAR
        candidates = self._candidates(req.task)
        if not candidates:
            return MCPResponse(ok=False, error=f'NO_PROVIDER_FOR_{req.task}')

        errors = []
        for p in candidates:
            br = self.breakers[p.name]
            # [4] CIRCUIT BREAKER
            if br.is_open():
                errors.append(f'{p.name}:circuit_open')
                continue

            # [5] CHAQIRUV
            log.info('[MCP] %s → %s', req.task, p.name)
            resp = p.call(req)

            if resp.ok:
                br.on_success()
                self._record(resp, restaurant_id, req.task)      # [6]
                if use_cache and req.task in CACHEABLE:          # [7]
                    cache.set(ck, resp.__dict__, settings.AI_CACHE_TTL)
                return resp

            br.on_failure()
            errors.append(f'{p.name}:{resp.error[:80]}')
            metrics.inc('ai.provider.failure', {'provider': p.name})
            log.warning('[MCP] %s xato: %s → keyingisi', p.name, resp.error)

        log.error('[MCP] BARCHA provayder yiqildi: %s', errors)
        metrics.inc('ai.all_failed', {'task': req.task})
        return MCPResponse(ok=False, error='ALL_PROVIDERS_FAILED',
                           raw={'errors': errors})

    # ---------------- yordamchilar ----------------
    def _candidates(self, task):
        ps = [p for p in self.providers
              if p.is_configured() and task in p.supported_tasks]
        return sorted(ps, key=lambda p: p.priority.get(task, 999))

    def _cache_key(self, req):
        raw = f'{req.task}|{req.system}|{req.prompt}|{req.temperature}|{req.max_tokens}'
        return f'mcp:{hashlib.sha256(raw.encode()).hexdigest()[:32]}'

    def _check_budget(self, restaurant_id) -> bool:
        from apps.ai.models import AIUsage
        today = timezone.now().date()
        spent = AIUsage.objects.filter(
            restaurant_id=restaurant_id, created_at__date=today
        ).aggregate(s=Sum('cost_usd'))['s'] or 0
        if spent >= settings.AI_DAILY_LIMIT_PER_RESTAURANT:
            log.warning('[MCP] Byudjet tugadi: rest=%s $%.2f', restaurant_id, spent)
            metrics.inc('ai.budget.exceeded', {'restaurant': restaurant_id})
            return False
        return True

    def _check_platform_budget(self) -> bool:
        from apps.ai.models import AIUsage
        m0 = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        spent = AIUsage.objects.filter(created_at__gte=m0) \
                    .aggregate(s=Sum('cost_usd'))['s'] or 0
        return spent < settings.AI_MONTHLY_LIMIT_TOTAL

    def _record(self, resp, restaurant_id, task):
        from apps.ai.models import AIUsage
        AIUsage.objects.create(
            restaurant_id=restaurant_id, provider=resp.provider, model=resp.model,
            task=task, tokens_in=resp.tokens_in, tokens_out=resp.tokens_out,
            cost_usd=resp.cost_usd, latency_ms=resp.latency_ms)
        metrics.inc('ai.request.success', {'provider': resp.provider, 'task': task})
        metrics.observe('ai.latency_ms', resp.latency_ms, {'provider': resp.provider})
        metrics.add('ai.cost_usd', resp.cost_usd,
                    {'provider': resp.provider, 'model': resp.model})


mcp = MCPRouter()      # singleton — Django app ready() da tekshiriladi
```

### 3.4 8 provayder jadvali

| # | Provayder | Model | Vazifalar | Narx ($/1M in–out) | Env kalit | Prioritet (chat/trans/vision/3d) |
|---|---|---|---|---|---|---|
| 1 | **Anthropic Claude** | `claude-haiku-4-5` | chat, translate, vision, reasoning | 0,80 / 4,00 | `ANTHROPIC_API_KEY` | 20 / **10** / 15 / — |
| 2 | **Google Gemini** | `gemini-2.0-flash` | chat, translate, vision, embedding | 0,10 / 0,40 | `GEMINI_API_KEY` | **10** / 20 / **10** / — |
| 3 | **OpenAI** | `gpt-4o-mini` | chat, translate, vision | 0,15 / 0,60 | `OPENAI_API_KEY` | 40 / 30 / 20 / — |
| 4 | **Groq** | `llama-3.3-70b` | chat (juda tez, ~0,3 s) | 0,59 / 0,79 | `GROQ_API_KEY` | 15 / — / — / — |
| 5 | **DeepSeek** | `deepseek-chat` | chat, translate (eng arzon) | 0,14 / 0,28 | `DEEPSEEK_API_KEY` | 30 / 25 / — / — |
| 6 | **Mistral** | `mistral-small` | chat, translate, embedding | 0,20 / 0,60 | `MISTRAL_API_KEY` | 50 / 40 / — / — |
| 7 | **Meshy** | `meshy-4` | image_to_3d | ~$0,50 / model | `MESHY_API_KEY` | — / — / — / **10** |
| 8 | **Tripo** | `tripo-v2` | image_to_3d | ~$0,80 / model | `TRIPO_API_KEY` | — / — / — / 20 |
| 9* | **Rodin** (ixt.) | `rodin-gen1` | image_to_3d (yuqori sifat) | ~$1,50 / model | `RODIN_API_KEY` | — / — / — / 30 |

> Kichik raqam = birinchi chaqiriladi. `—` = bu vazifani qo'llab-quvvatlamaydi.

### 3.5 Vazifa turlari

| `task` | Zanjir (prioritet bo'yicha) | Keshlanadi | Timeout | Qayerda ishlatiladi |
|---|---|---|---|---|
| `chat` | Gemini → Groq → Claude → DeepSeek → OpenAI → Mistral | ✅ 1 soat | 30 s | Mijoz chatboti (P-12) |
| `translate` | Claude → Gemini → DeepSeek → OpenAI → Mistral | ✅ 24 soat | 45 s | Menyu avto-tarjima (uz/ru/en) |
| `vision` | Gemini → Claude → OpenAI | ❌ | 40 s | Taom rasmi sifatini baholash |
| `image_to_3d` | Meshy → Tripo → (Rodin) | ❌ | 600 s ⚡ | 3D model generatsiyasi (worker'da!) |
| `embedding` | Gemini → Mistral | ✅ 7 kun | 20 s | 3D kutubxona semantik moslashtirish (pgvector) |
| `reasoning` | Claude → OpenAI | ❌ | 60 s | Menyu-injiniring tahlili, ROI hisoboti |

> ⚡ `image_to_3d` HECH QACHON web so'rovda chaqirilmaydi — faqat `armenu-worker@model3d`.

### 3.6 Xarajat nazorati — 4 qatlam

```
┌──────────────────────────────────────────────────────────────┐
│ [1] KESH          bir xil so'rov → 0 $ (chat ~35% hit)       │
├──────────────────────────────────────────────────────────────┤
│ [2] KONTEKST      menyu 8000 → 1500 token (kesilgan format)  │
│                   "ID|Nom|Narx|Teg|Allergen|Vaqt"            │
├──────────────────────────────────────────────────────────────┤
│ [3] RESTORAN      AI_DAILY_LIMIT_PER_RESTAURANT = $2/kun     │
│     LIMITI        oshsa → AI_BUDGET_EXCEEDED, chat o'chadi   │
├──────────────────────────────────────────────────────────────┤
│ [4] PLATFORMA     AI_MONTHLY_LIMIT_TOTAL = $500/oy           │
│     LIMITI        80% → 🟡 alert, 100% → 🔴 to'xtatiladi     │
└──────────────────────────────────────────────────────────────┘
```

| Vazifa | Chastota (500 rest.) | Provayder | Oylik $ |
|---|---|---|---|
| Chatbot | ~50 000 | Gemini→Groq | 45 |
| Tarjima | ~5 000 | Claude→Gemini | 12 |
| 3D generatsiya | ~800 | Meshy→Tripo | **400** |
| Taom tavsifi | ~2 000 | Claude | 8 |
| Menyu tahlili | ~500 | Claude | 15 |
| Sharh sentiment | ~10 000 | Gemini→DeepSeek | 6 |
| Rasm sifati (vision) | ~3 000 | Gemini | 5 |
| Embedding | ~5 000 | Gemini | 2 |
| **JAMI** | | | **~$493/oy** |

> 500 restoran × 590k so'm ≈ $23 300/oy daromad → AI = **2,1%**. ✅ Sog'lom.

### 3.7 Yangi provayder qo'shish — 5 qadam

```
QADAM 1 — Adapter fayli yozish (~80 qator)
  apps/integrations/ai/providers/newai.py
  class NewAIProvider(MCPProvider):
      name = 'newai'
      supported_tasks = {'chat', 'translate'}
      priority = {'chat': 35, 'translate': 45}
      price_in, price_out = 0.05, 0.15
      def is_configured(self): return bool(self.key)
      def call(self, req): ...  # HECH QACHON raise qilmaydi

QADAM 2 — Registry'ga qo'shish (1 qator)
  apps/integrations/ai/registry.py
  ALL_PROVIDERS = [..., NewAIProvider]

QADAM 3 — .env ga kalit
  NEWAI_API_KEY=...
  settings.AI_KEYS dan avtomatik o'qiladi

QADAM 4 — Test (kontrakt testi avtomatik qo'llanadi)
  pytest tests/integrations/test_mcp_contract.py -k newai
  → is_configured, call, health_check, xato→Response tekshiriladi

QADAM 5 — Kuzatuv
  Grafana "AI provayderlar" paneli avtomatik yangi qatorni ko'rsatadi
  (metrika label'i `provider` bo'yicha).

⏱ Jami vaqt: ~40 daqiqa. Biznes logikaga 0 ta o'zgarish.
```

### 3.8 API kalit xavfsizligi

| Chora | Amalda |
|---|---|
| Kalit kodda YO'Q | Faqat `.env` (600, `armenu:armenu`) |
| `.env` git'da YO'Q | `.gitignore` + CI'da `gitleaks` skani |
| Log'da maskalanadi | `mask_secrets()` → `sk-ant-***a3f` |
| Frontendga uzatilmaydi | Barcha AI chaqiruvi faqat backendda |
| Rotatsiya | 90 kunda bir marta (kalendarda) |
| Har provayderga limit | Provayder panelida hard cap |
| Ishga tushishda tekshiruv | `apps.py ready()` — 0 provayder → `log.error` |

---

## 4. TO'LOV INTEGRATSIYASI

> ⚡ **Oltin qoida:** Narx faqat serverda hisoblanadi. Klient yuborgan summa **ishonchsiz**.
> ⚡ **Ikkinchi qoida:** Har to'lov operatsiyasi idempotent. Dublikat to'lov = 0.

### 4.1 3 provayder

| Provayder | Protokol | Auth | Callback | Xususiyat |
|---|---|---|---|---|
| **Payme** (Paycom) | JSON-RPC 2.0, **6 metod** | Basic `Paycom:<KEY>` | bizga POST | Merchant API, eng keng tarqalgan |
| **Click** | REST, **2 bosqich** (Prepare + Complete) | `sign_string` MD5 | bizga POST ×2 | Eski, lekin ommaviy |
| **Uzum Bank** | REST + **HMAC-SHA256** | `X-Signature` header | bizga POST | Yangi, Uzum ekotizimi |

> Kutubxona: **`paytechuz`** — 3 tasini bitta interfeys ostida beradi.
> Biz baribir adapter yozamiz — kutubxona buzilsa/eskirsa almashtirish uchun.

### 4.2 Umumiy to'lov oqimi

```
[1] Mijoz "To'lash" bosadi (savat: 3 taom)
     │
     ▼
[2] POST /v1/payments/create/
     { order_id: 4471, provider: 'payme' }
     + X-Idempotency-Key: <uuid>
     │
     ▼
[3] ⚡ SERVER SUMMANI O'ZI HISOBLAYDI
     amount = Σ(OrderItem.price × qty) + service_fee − discount
     (klient yuborgan summa E'TIBORGA OLINMAYDI)
     │
     ▼
[4] Payment.objects.create(
       order=..., amount=amount, provider='payme',
       state='created', idempotency_key=...)
     │
     ▼
[5] PaymentRouter.execute(op='create_invoice', ...)
     └─→ PaymeAdapter → checkout URL / deeplink
     │
     ▼
[6] Mijoz provayder sahifasiga/ilovasiga o'tadi, to'laydi
     │
     ▼───────────────────────────────────────────────────┐
[7] 🔔 WEBHOOK bizga keladi (POST /webhooks/payme/)      │
     │                                                    │
     ├─ [7.1] IMZO tekshiriladi ────────── ❌ → 401       │
     ├─ [7.2] WebhookEvent.create(raw) ← xom saqlanadi    │
     ├─ [7.3] IDEMPOTENCY: shu transaction_id bor?        │
     │        ha → oldingi javob qaytariladi ✅ TUGADI     │
     ├─ [7.4] SUMMA solishtiriladi ─────── ❌ → xato kodi │
     ├─ [7.5] transaction.atomic():                        │
     │          Payment.state = 'paid'                     │
     │          Order.payment_status = 'paid'              │
     │          FinancialOperation.create()                │
     └─ [7.6] on_commit():                                 │
              ├─ WS → mijoz, ofitsiant, admin              │
              ├─ enqueue('fiscal', order.id)  ⚡ CHEK      │
              └─ enqueue('notify', ...)                    │
     │                                                     │
     ▼                                                     │
[8] Provayderga 200 + {result: {...}} qaytariladi ─────────┘
     │
     ▼
[9] Mijoz sahifasi WS orqali "✅ To'landi" ko'radi
```

### 4.3 Payme — JSON-RPC 6 metod

```python
# apps/integrations/payment/providers/payme.py
import base64
import time
from django.conf import settings
from ..base import BaseAdapter, IntegrationRequest, IntegrationResponse

# Payme xato kodlari (spetsifikatsiya bo'yicha)
ERR_TRANSPORT        = -32300
ERR_ACCESS_DENIED    = -32504
ERR_INVALID_AMOUNT   = -31001
ERR_ORDER_NOT_FOUND  = -31050
ERR_ORDER_AVAILABLE  = -31051   # buyurtma to'lovga tayyor emas
ERR_CANT_PERFORM     = -31008


class PaymeAdapter(BaseAdapter):
    name = 'payme'
    domain = 'payment'
    priority = 10
    supported_ops = {'create_invoice', 'check', 'cancel', 'refund'}

    BASE = 'https://checkout.paycom.uz'

    def __init__(self):
        self.merchant_id = settings.PAYME_MERCHANT_ID
        self.key = settings.PAYME_KEY               # webhook uchun
        self.test = settings.PAYME_TEST_MODE

    def is_configured(self):
        return bool(self.merchant_id and self.key)

    # ---------- CHIQUVCHI: to'lov havolasi ----------
    def execute(self, req: IntegrationRequest) -> IntegrationResponse:
        if req.op != 'create_invoice':
            return IntegrationResponse(ok=False, provider=self.name,
                                       error_code='OP_NOT_SUPPORTED')
        p = req.payload
        # Payme uchun tiyin (×100)
        raw = f"m={self.merchant_id};ac.order_id={p['order_id']};a={int(p['amount'] * 100)}"
        url = f"{self.BASE}/{base64.b64encode(raw.encode()).decode()}"
        return IntegrationResponse(ok=True, provider=self.name,
                                   data={'checkout_url': url})

    # ---------- KIRUVCHI: webhook imzosi ----------
    def verify_webhook(self, headers: dict, body: bytes) -> bool:
        """Authorization: Basic base64('Paycom:' + KEY)"""
        auth = headers.get('Authorization', '')
        if not auth.startswith('Basic '):
            return False
        try:
            decoded = base64.b64decode(auth[6:]).decode()
        except Exception:
            return False
        login, _, key = decoded.partition(':')
        return login == 'Paycom' and hmac_equal(key, self.key)
```

**6 ta majburiy metod (Merchant API):**

| # | Metod | Nima qiladi | Bizda | Xato kodi |
|---|---|---|---|---|
| 1 | `CheckPerformTransaction` | Buyurtma bormi, summa to'g'rimi | Order tekshiriladi | `-31050`, `-31001` |
| 2 | `CreateTransaction` | Tranzaksiya ochish | `Payment.state='pending'` | `-31008` |
| 3 | `PerformTransaction` | ⚡ **To'lov tasdiqlash** | `state='paid'` + fiskal navbat | `-31008` |
| 4 | `CancelTransaction` | Bekor / qaytarish | `state='cancelled'` + restock | `-31007` |
| 5 | `CheckTransaction` | Holat so'rash | Payment holati | — |
| 6 | `GetStatement` | Davr bo'yicha ro'yxat | ⚡ **reconciliation** asosi | — |

```python
# apps/integrations/payment/webhooks.py — Payme JSON-RPC dispatcher
PAYME_METHODS = {
    'CheckPerformTransaction': _check_perform,
    'CreateTransaction':       _create,
    'PerformTransaction':      _perform,
    'CancelTransaction':       _cancel,
    'CheckTransaction':        _check,
    'GetStatement':            _statement,
}


@csrf_exempt
@require_POST
def payme_webhook(request):
    adapter = PaymeAdapter()

    # [1] IMZO
    if not adapter.verify_webhook(dict(request.headers), request.body):
        return JsonResponse({'error': {'code': ERR_ACCESS_DENIED,
                                       'message': 'Access denied'}}, status=200)

    body = json.loads(request.body)
    method, params, rpc_id = body.get('method'), body.get('params', {}), body.get('id')

    # [2] XOM SAQLASH (har doim, qayta ishlashdan OLDIN)
    WebhookEvent.objects.create(provider='payme', method=method,
                                raw=body, received_at=timezone.now())

    handler = PAYME_METHODS.get(method)
    if not handler:
        return JsonResponse({'error': {'code': ERR_TRANSPORT,
                                       'message': 'Method not found'}, 'id': rpc_id})

    try:
        result = handler(params)                      # ichida idempotency bor
        return JsonResponse({'result': result, 'id': rpc_id})
    except PaymeError as e:
        return JsonResponse({'error': {'code': e.code, 'message': e.message},
                             'id': rpc_id})
    except Exception:
        log.exception('[payme] webhook xatosi')
        return JsonResponse({'error': {'code': ERR_TRANSPORT,
                                       'message': 'Internal'}, 'id': rpc_id})
```

### 4.4 Click — Prepare + Complete

```
┌──────────┐                                    ┌──────────┐
│  CLICK   │                                    │  ARMENU  │
└────┬─────┘                                    └────┬─────┘
     │  [1] POST /webhooks/click/prepare/            │
     │      click_trans_id, service_id, merchant_    │
     │      trans_id (=order_id), amount, action=0,  │
     │      sign_time, sign_string                   │
     │─────────────────────────────────────────────▶ │
     │                                               │ MD5 tekshiruv
     │                                               │ buyurtma bormi
     │                                               │ summa mosmi
     │  ◀───────────────────────────────────────────│
     │      {error: 0, merchant_prepare_id: <pk>}    │
     │                                               │
     │  [2] POST /webhooks/click/complete/           │
     │      ... action=1, merchant_prepare_id        │
     │─────────────────────────────────────────────▶ │
     │                                               │ ⚡ state='paid'
     │                                               │ ⚡ fiskal navbat
     │  ◀───────────────────────────────────────────│
     │      {error: 0, merchant_confirm_id: <pk>}    │
```

```python
def click_sign(params, secret_key, stage: str) -> str:
    """
    prepare : md5(click_trans_id + service_id + SECRET + merchant_trans_id
                  + amount + action + sign_time)
    complete: md5(click_trans_id + service_id + SECRET + merchant_trans_id
                  + merchant_prepare_id + amount + action + sign_time)
    """
    parts = [str(params['click_trans_id']), str(params['service_id']), secret_key,
             str(params['merchant_trans_id'])]
    if stage == 'complete':
        parts.append(str(params['merchant_prepare_id']))
    parts += [str(params['amount']), str(params['action']), str(params['sign_time'])]
    return hashlib.md5(''.join(parts).encode()).hexdigest()


CLICK_ERRORS = {
     0: 'Muvaffaqiyatli',
    -1: 'SIGN CHECK FAILED',
    -2: "Noto'g'ri summa",
    -3: 'Harakat topilmadi',
    -4: "Allaqachon to'langan",        # ⚡ idempotency signali
    -5: 'Foydalanuvchi topilmadi',
    -6: 'Tranzaksiya topilmadi',
    -8: "So'rov xatosi",
    -9: 'Tranzaksiya bekor qilingan',
}
```

### 4.5 Uzum — HMAC-SHA256

```python
def uzum_verify(headers: dict, body: bytes, secret: str) -> bool:
    """
    X-Signature: hex(hmac_sha256(secret, timestamp + '.' + body))
    X-Timestamp: unix soniya — ⚡ 5 daqiqadan eski bo'lsa RAD ETILADI (replay himoya)
    """
    sig = headers.get('X-Signature', '')
    ts = headers.get('X-Timestamp', '')
    if not sig or not ts:
        return False
    if abs(int(time.time()) - int(ts)) > 300:
        log.warning('[uzum] eskirgan webhook (replay?): ts=%s', ts)
        return False
    expected = hmac.new(secret.encode(), f'{ts}.'.encode() + body,
                        hashlib.sha256).hexdigest()
    return hmac.compare_digest(sig, expected)
```

### 4.6 Webhook xavfsizligi — 7 qoida

| # | Qoida | Nega |
|---|---|---|
| 1 | **Imzo/auth avval tekshiriladi** | Soxta to'lov bildirishnomasi |
| 2 | `hmac.compare_digest` ishlatiladi | Timing attack |
| 3 | **Xom body avval saqlanadi** (`WebhookEvent`) | Kod xato bersa ham ma'lumot yo'qolmaydi |
| 4 | **Timestamp oynasi** (Uzum: 5 daq) | Replay attack |
| 5 | **Summa qayta solishtiriladi** | Provayder/klient summasiga ishonilmaydi |
| 6 | **IP allowlist** (nginx darajasida) | Qo'shimcha qatlam |
| 7 | Javob **doim 200** + protokol xato kodi | Provayder cheksiz retry qilmasin |

```nginx
# nginx: to'lov webhook — faqat provayder IP'lari + rate limit
location /webhooks/payme/ {
    # allow 185.8.212.0/24;   # Payme (real ro'yxat provayderdan olinadi)
    # deny all;
    limit_req zone=webhook burst=50 nodelay;
    proxy_pass http://armenu_web;
}
```

### 4.7 Idempotency — 3 qatlam

```
┌────────────────────────────────────────────────────────────────┐
│ [1] KLIENT → BIZ                                               │
│     X-Idempotency-Key: <uuid>  (mijoz "To'lash"ni 2 marta      │
│     bossa ham 1 ta Payment)                                    │
│     Redis: idem:payment:create:<uuid> → javob, TTL 24 soat     │
├────────────────────────────────────────────────────────────────┤
│ [2] PROVAYDER → BIZ (webhook)                                  │
│     UNIQUE(provider, external_transaction_id) — DB darajasida  │
│     Takror kelsa → oldingi natija qaytariladi (yangi yozuv YO'Q)│
├────────────────────────────────────────────────────────────────┤
│ [3] BIZ → PROVAYDER (refund/cancel)                            │
│     IntegrationRequest.idempotency_key = f'refund:{payment.id}' │
└────────────────────────────────────────────────────────────────┘
```

```python
class Payment(models.Model):
    order = models.ForeignKey(Order, on_delete=models.PROTECT)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.PROTECT)  # ⚡ tenant
    provider = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    state = models.CharField(max_length=20, default='created')
    idempotency_key = models.CharField(max_length=64, db_index=True)
    external_transaction_id = models.CharField(max_length=128, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['provider', 'external_transaction_id'],
                condition=~models.Q(external_transaction_id=''),
                name='uniq_provider_external_txn'),
            models.UniqueConstraint(
                fields=['restaurant', 'idempotency_key'],
                name='uniq_restaurant_idem_key'),
        ]
```

### 4.8 Reconciliation (mos kelishni tekshirish)

> ⚡ Webhook yo'qolishi mumkin. **Kunlik reconciliation — yagona haqiqat manbai.**

```python
# apps/integrations/payment/reconcile.py
# Cron: har kuni 04:00 (armenu-worker@analytics)

def reconcile_day(day: date, provider: str) -> dict:
    """
    Provayder GetStatement/ro'yxatini bizning Payment bilan solishtiradi.
    """
    external = PaymentRouter().execute(IntegrationRequest(
        op='statement', payload={'from': day, 'to': day}), prefer=provider).data

    ours = {p.external_transaction_id: p for p in Payment.objects.filter(
        provider=provider, created_at__date=day).exclude(external_transaction_id='')}

    report = {'ok': 0, 'missing_local': [], 'missing_remote': [], 'amount_mismatch': []}

    for txn in external:
        p = ours.pop(txn['id'], None)
        if p is None:
            # 🔴 Provayderda to'landi, bizda YO'Q → webhook yo'qolgan
            report['missing_local'].append(txn['id'])
            recover_lost_payment(provider, txn)          # avtomatik tiklash
        elif abs(p.amount - Decimal(txn['amount'])) > Decimal('0.01'):
            report['amount_mismatch'].append((p.id, p.amount, txn['amount']))
        else:
            report['ok'] += 1

    # Bizda paid, provayderda yo'q → 🔴 juda jiddiy
    report['missing_remote'] = [p.id for p in ours.values() if p.state == 'paid']

    if report['missing_local'] or report['missing_remote'] or report['amount_mismatch']:
        alert_oncall(f'🔴 P1 To\'lov nomuvofiqligi ({provider}, {day}): {report}')
    return report
```

| Nomuvofiqlik | Ma'nosi | Harakat |
|---|---|---|
| `missing_local` | Provayderda to'langan, bizda yo'q | Webhook yo'qolgan → **avtomatik tiklash** + fiskal navbat |
| `missing_remote` | Bizda `paid`, provayderda yo'q | 🔴 P1 — qo'lda tekshiruv, moliya bilan |
| `amount_mismatch` | Summa farq qiladi | 🔴 P1 — qo'lda, audit log |

### 4.9 Xato holatlari

| Holat | Belgisi | Tizim harakati | Mijoz ko'radi |
|---|---|---|---|
| Provayder timeout | 15 s javob yo'q | Circuit breaker +1, keyingi provayder | "Boshqa usul tanlang" |
| Mablag' yetarli emas | `-31001` / provayder kodi | ⚡ `retryable=False` — zanjir davom etmaydi | "Mablag' yetarli emas" |
| Buyurtma allaqachon to'langan | `-4` (Click) | Idempotent → 200 OK | "✅ To'langan" |
| Ikkilangan webhook | Bir xil `transaction_id` | DB `UNIQUE` → oldingi javob | — |
| Barcha provayder yiqilgan | `ALL_PROVIDERS_FAILED` | 🔴 alert + naqd rejimga o'tish | "Ofitsiantga naqd to'lang" |
| Summa mos emas | webhook amount ≠ Payment.amount | Rad etiladi + 🔴 P1 alert | "Xatolik, ofitsiantni chaqiring" |
| Qaytarish (refund) | Admin bosadi | `op='refund'` + `Order` restock | Push bildirishnoma |

### 4.10 Test rejimi

| Provayder | Sandbox | Test karta | Rejim |
|---|---|---|---|
| Payme | `test.paycom.uz` | Payme kabinetdan | `PAYME_TEST_MODE=1` |
| Click | `my.click.uz` (test service_id) | Click kabinetdan | `CLICK_TEST_MODE=1` |
| Uzum | `test-api.uzumbank.uz` | Uzum kabinetdan | `UZUM_TEST_MODE=1` |

```python
# ⚡ QAT'IY: prod'da test rejimi yoqilgan bo'lsa — ishga tushmaydi
# apps/integrations/payment/apps.py
def ready(self):
    if not settings.DEBUG and any([settings.PAYME_TEST_MODE,
                                   settings.CLICK_TEST_MODE,
                                   settings.UZUM_TEST_MODE]):
        raise ImproperlyConfigured(
            "🔴 PROD'da to'lov TEST rejimi yoqilgan! .env tekshiring.")
```

---

## 5. FISKAL INTEGRATSIYA (OFD)

### 5.1 Nima uchun majburiy

> 🇺🇿 O'zbekiston Respublikasi Soliq kodeksi: har bir naqd/karta to'lov uchun
> **fiskal chek** OFD (Operator Fiskal Ma'lumotlar) orqali Soliq qo'mitasiga
> yuborilishi **shart**. 2026-yildan **raqamli chek** (QR havola) qonuniy kuchga ega —
> qog'oz chop etish shart emas.

⚡ **Bu ARMENU'ning eng kuchli sotuv argumenti:** restoran allaqachon
fiskal talabga duch keladi — biz uni menyu bilan birga hal qilamiz.

### 5.2 2 adapter + IKPU

```
┌──────────────────────────────────────────────────────────────┐
│ FiscalRouter                                                 │
│   priority 10 → UZKASSA   (asosiy)                           │
│   priority 20 → e-POS     (zaxira)                           │
│   ikkalasi yiqilsa → NAVBAT (48 soat) → qo'lda kassa         │
└───────────────────────────┬──────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
┌────────────────┐                     ┌────────────────┐
│    UZKASSA     │                     │     e-POS      │
│  REST + token  │                     │  REST + token  │
└────────┬───────┘                     └────────┬───────┘
         └──────────────┬─────────────────────-─┘
                        ▼
              ┌───────────────────┐
              │  Soliq qo'mitasi  │
              └───────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ tasnif.soliq.uz — IKPU (MXIK) kod qidiruvi                    │
│   har taom uchun majburiy tovar tasnif kodi                   │
│   AI (Gemini) → nom bo'yicha taklif → admin tasdiqlaydi       │
└──────────────────────────────────────────────────────────────┘
```

### 5.3 Adapter

```python
# apps/integrations/fiscal/providers/uzkassa.py
import requests
import time
from decimal import Decimal
from django.conf import settings
from ..base import BaseAdapter, IntegrationRequest, IntegrationResponse

VAT_RATE = Decimal('12')          # QQS 12%


class UzkassaAdapter(BaseAdapter):
    name = 'uzkassa'
    domain = 'fiscal'
    priority = 10
    supported_ops = {'send_receipt', 'refund_receipt', 'check_status', 'close_shift'}

    BASE = 'https://api.uzkassa.uz/v1'

    def __init__(self):
        self.token = settings.UZKASSA_TOKEN
        self.terminal_id = settings.UZKASSA_TERMINAL_ID

    def is_configured(self):
        return bool(self.token and self.terminal_id)

    def execute(self, req: IntegrationRequest) -> IntegrationResponse:
        t0 = time.time()
        try:
            if req.op == 'send_receipt':
                return self._send(req, t0)
            if req.op == 'refund_receipt':
                return self._refund(req, t0)
            if req.op == 'check_status':
                return self._status(req, t0)
            return IntegrationResponse(ok=False, provider=self.name,
                                       error_code='OP_NOT_SUPPORTED')
        except Exception as exc:
            code, retryable = self.normalize_error(exc)
            return IntegrationResponse(ok=False, provider=self.name,
                                       error_code=code, error_msg=str(exc),
                                       retryable=retryable,
                                       latency_ms=int((time.time() - t0) * 1000))

    def _send(self, req, t0):
        o = req.payload                       # order dict (servis tayyorlaydi)
        body = {
            'terminal_id': self.terminal_id,
            'receipt_type': 0,                        # 0 = sotuv
            'received_cash': o['cash_tiyin'],
            'received_card': o['card_tiyin'],
            'external_id': req.idempotency_key,       # ⚡ OFD tomonda idempotency
            'items': [{
                'name':      it['name'][:128],
                'barcode':   '',
                'label':     '',
                'spic':      it['ikpu'],              # ⚡ IKPU kodi MAJBURIY
                'package_code': it.get('package_code', ''),
                'units':     it.get('units', 1),
                'price':     it['price_tiyin'],
                'amount':    it['qty'] * 1000,        # OFD: 1 dona = 1000
                'vat':       int(Decimal(it['price_tiyin']) * it['qty']
                                 * VAT_RATE / (100 + VAT_RATE)),
                'vat_percent': int(VAT_RATE),
                'other':     0,
            } for it in o['items']],
        }
        r = requests.post(f'{self.BASE}/receipt', json=body, timeout=req.timeout,
                          headers={'Authorization': f'Bearer {self.token}'})
        latency = int((time.time() - t0) * 1000)

        if r.status_code >= 500:
            return IntegrationResponse(ok=False, provider=self.name,
                                       error_code='OFD_5XX', retryable=True,
                                       latency_ms=latency)
        data = r.json()
        if r.status_code == 200 and data.get('success'):
            return IntegrationResponse(
                ok=True, provider=self.name,
                external_id=data['fiscal_sign'],
                data={'fiscal_sign': data['fiscal_sign'],
                      'qr_url': data['qr_code_url'],
                      'receipt_date': data['date_time'],
                      'terminal_id': self.terminal_id},
                latency_ms=latency)

        # 4xx — bizning ma'lumotda xato, retry MA'NOSIZ
        return IntegrationResponse(ok=False, provider=self.name,
                                   error_code=data.get('error_code', 'OFD_4XX'),
                                   error_msg=data.get('message', ''),
                                   retryable=False, latency_ms=latency)
```

### 5.4 Chek yuborish oqimi

```
[1] Payment.state → 'paid'   (webhook yoki naqd tasdiqlash)
     │
     ▼ transaction.on_commit()
[2] enqueue('fiscal', {'order_id': ..., 'attempt': 0})
     │                       ⚡ WEB SO'ROVDA CHAQIRILMAYDI
     ▼
[3] armenu-worker@fiscal oladi
     │
     ▼
[4] Chek ma'lumoti yig'iladi
     ├─ har OrderItem uchun IKPU kodi (Dish.ikpu_code)
     ├─ ❌ IKPU yo'q → 🔴 alert + admin panelda "IKPU kiriting"
     ├─ QQS 12% hisoblanadi (narx ichida)
     └─ naqd/karta ajratiladi
     │
     ▼
[5] FiscalRouter.execute(op='send_receipt', idempotency_key=f'ord:{id}')
     ├─ UZKASSA (priority 10) ──── ✅ → [6]
     ├─ ❌ retryable → e-POS (20) ─ ✅ → [6]
     └─ ❌ ikkalasi ham → [7] NAVBAT
     │
     ▼
[6] FiscalReceipt.objects.create(
       order=..., provider='uzkassa', fiscal_sign=..., qr_url=..., status='sent')
     ├─ WS → mijoz: "🧾 Chek tayyor" + QR havola
     ├─ Telegram → mijozga raqamli chek (agar ulangan bo'lsa)
     └─ metrics.inc('fiscal.sent')
     │
     ▼ TUGADI ✅
[7] NAVBAT: FiscalReceipt(status='queued', next_retry_at=+5 daqiqa)
     └─ 48 soatlik retry jadvali (§5.5)
     └─ 🟡 alert: fiskal navbat depth > 50 → P1
```

### 5.5 48 soatlik retry jadvali

| # | Kechikish | Jami o'tgan vaqt | Jitter | Alert |
|---|---|---|---|---|
| 1 | 5 daqiqa | 0:05 | ±20% | — |
| 2 | 15 daqiqa | 0:20 | ±20% | — |
| 3 | 1 soat | 1:20 | ±20% | 🟡 P3 |
| 4 | 3 soat | 4:20 | ±20% | 🟡 P3 |
| 5 | 6 soat | 10:20 | ±20% | 🟠 P2 |
| 6 | 12 soat | 22:20 | ±20% | 🟠 P2 |
| 7 | 24 soat | 46:20 | ±20% | 🔴 P1 |
| 8 | **oxirgi** | 48:00 | — | 🔴 P1 + **qo'lda kassa talab** |

```python
# apps/integrations/fiscal/retry.py
FISCAL_BACKOFF = [300, 900, 3600, 10800, 21600, 43200, 86400]   # soniya
FISCAL_DEADLINE = timedelta(hours=48)


def schedule_next(receipt: FiscalReceipt) -> bool:
    """Keyingi urinishni rejalashtiradi. False → 48 soat tugadi."""
    n = receipt.attempts
    if n >= len(FISCAL_BACKOFF) or \
       timezone.now() - receipt.created_at > FISCAL_DEADLINE:
        receipt.status = 'failed_manual'
        receipt.save(update_fields=['status'])
        alert_oncall(
            f"🔴 P1 FISKAL 48 SOAT: order #{receipt.order.number} "
            f"(rest={receipt.restaurant_id}) — QO'LDA KASSADA CHEK URILISHI SHART")
        notify_restaurant_admin(receipt.restaurant,
                                f"⚠️ Chek yuborilmadi: #{receipt.order.number}. "
                                f"Kassada qo'lda urib qo'ying.")
        return False

    base = FISCAL_BACKOFF[n]
    delay = base * random.uniform(0.8, 1.2)        # ±20% jitter
    receipt.attempts = n + 1
    receipt.next_retry_at = timezone.now() + timedelta(seconds=delay)
    receipt.status = 'queued'
    receipt.save(update_fields=['attempts', 'next_retry_at', 'status'])
    enqueue_delayed('fiscal', receipt.id, delay=delay)
    return True
```

### 5.6 IKPU (MXIK) — tasnif.soliq.uz

> IKPU = Yagona elektron milliy tovarlar va xizmatlar katalogi kodi.
> **Har chek qatorida majburiy.** Restoran taomlari uchun odatda `10112001001…` guruhi.

```
┌───────────────────────────────────────────────────────────────┐
│ IKPU QIDIRUV — 4 QATLAM                                       │
├───────────────────────────────────────────────────────────────┤
│ [1] DISH.ikpu_code                                            │
│     Admin qo'lda kiritgan → darhol ishlatiladi ✅              │
├───────────────────────────────────────────────────────────────┤
│ [2] REDIS KESH                                                │
│     ikpu:q:<sha256(nom)> → kod    TTL 30 kun                  │
├───────────────────────────────────────────────────────────────┤
│ [3] LOKAL SNAPSHOT (PostgreSQL)                               │
│     IkpuCode jadvali — oyda 1 marta to'liq yuklab olinadi     │
│     ~180k qator, GIN trigram indeks (pg_trgm)                 │
│     ⚡ tasnif.soliq.uz yiqilsa ham ishlaydi                    │
├───────────────────────────────────────────────────────────────┤
│ [4] tasnif.soliq.uz API (jonli)                               │
│     GET /api/cls-api/mxik/search?text=<nom>&lang=uz           │
│     timeout 10s, circuit breaker 3/300s                       │
├───────────────────────────────────────────────────────────────┤
│ [5] FALLBACK: AI (Gemini) + kategoriya standart kodi          │
│     "Osh" → 10112001001 (tayyor taomlar) — admin TASDIQLAYDI  │
└───────────────────────────────────────────────────────────────┘
```

```python
# apps/integrations/fiscal/ikpu.py
DEFAULT_IKPU_BY_CATEGORY = {
    'main':     '10112001001',   # tayyor taomlar
    'soup':     '10112001002',
    'salad':    '10112001003',
    'drink':    '10112002001',
    'dessert':  '10112003001',
    'bakery':   '10112004001',
}


def resolve_ikpu(dish) -> tuple[str, str]:
    """(kod, manba). Manba: manual|cache|local|api|ai_suggest|default"""
    if dish.ikpu_code:
        return dish.ikpu_code, 'manual'

    key = f'ikpu:q:{hashlib.sha256(dish.name_uz.encode()).hexdigest()[:24]}'
    if (hit := cache.get(key)):
        return hit, 'cache'

    # [3] lokal snapshot — trigram similarity
    row = IkpuCode.objects.filter(name__trigram_similar=dish.name_uz) \
                          .order_by('-similarity').first()
    if row:
        cache.set(key, row.code, 2592000)
        return row.code, 'local'

    # [4] jonli API
    resp = ikpu_breaker.call(_soliq_search, dish.name_uz, fallback=lambda: None)
    if resp:
        cache.set(key, resp, 2592000)
        return resp, 'api'

    # [5] AI taklifi (admin tasdiqlashi kerak)
    ai = mcp.run(MCPRequest(
        task='chat', json_mode=True, max_tokens=60,
        system='Sen O\'zbekiston IKPU (MXIK) tasniflagichi mutaxassisisan. '
               'Faqat JSON qaytaring: {"code": "..."}',
        prompt=f'Restoran taomi: "{dish.name_uz}". Eng mos IKPU kodi?'))
    if ai.ok and (code := ai.content.get('code')):
        dish.ikpu_suggested = code
        dish.save(update_fields=['ikpu_suggested'])
        notify_restaurant_admin(dish.restaurant,
            f'⚠️ "{dish.name_uz}" uchun IKPU taklif: {code} — tasdiqlang')
        return code, 'ai_suggest'

    return DEFAULT_IKPU_BY_CATEGORY.get(dish.category.kind, '10112001001'), 'default'
```

```bash
# Oylik lokal snapshot yangilash (cron: har oy 1-sana 02:00)
/home/armenu/app/venv/bin/python manage.py sync_ikpu_catalog --full
```

### 5.7 Raqamli chek (2026 dan qonuniy)

```
Chek yuborilgach mijoz oladi:
  ┌──────────────────────────────────┐
  │  ✅ To'landi                      │
  │  Buyurtma #047                    │
  │  Jami: 187 000 so'm               │
  │  ─────────────────────────────    │
  │  🧾 Fiskal chek                   │
  │  Belgi: 3921 4471 8802 1103       │
  │  [ ███ QR ███ ]                   │
  │  ofd.soliq.uz/check?t=...         │
  │  ─────────────────────────────    │
  │  [Telegram'ga yuborish]           │
  │  [PDF yuklab olish]               │
  └──────────────────────────────────┘

⚡ Qog'oz chop etish SHART EMAS — mijoz QR orqali Soliq saytida tekshiradi.
   Restoran uchun: qog'oz + printer sarfi 0.
```

| Yetkazish kanali | Qachon | Saqlash |
|---|---|---|
| Mijoz sahifasi (WS) | Darhol | Sessiya davomida |
| Telegram (bot ulangan bo'lsa) | Darhol | Doimiy |
| PDF yuklab olish | Talab bo'yicha | — |
| Admin panel (arxiv) | Doimiy | **5 yil** (soliq talabi) |

---

## 6. TELEGRAM

### 6.1 Ikki komponent

| Komponent | Nima uchun | Kim ishlatadi |
|---|---|---|
| **Bot** (`@armenu_bot`) | Bildirishnoma, chek, buyurtma holati | Mijoz, restoran admini, ofitsiant |
| **Mini App** | Ilova o'rnatmasdan to'liq menyu + buyurtma | Mijoz (Telegram ichidan) |

> 🇺🇿 O'zbekistonda Telegram — **27 mln foydalanuvchi**. Mini App = ilovasiz kanal.

### 6.2 Arxitektura

```
┌────────────────────────────────────────────────────────────────┐
│  TELEGRAM SERVERLARI                                           │
└──────────┬──────────────────────────────────┬──────────────────┘
           │ webhook (kiruvchi)               │ sendMessage (chiquvchi)
           ▼                                  ▲
┌──────────────────────────┐      ┌───────────┴───────────────────┐
│ POST /webhooks/telegram/  │      │ TelegramAdapter               │
│ <secret_path>/            │      │  • rate limit 30 msg/s        │
│                           │      │  • 20 msg/daq bir chatga      │
│ [1] X-Telegram-Bot-Api-   │      │  • retry 5× (1s,5s,30s,2m,10m)│
│     Secret-Token tekshir  │      │  • 429 → Retry-After hurmat   │
│ [2] Update xom saqlanadi  │      └───────────┬───────────────────┘
│ [3] enqueue('notify',...) │                  │
│ [4] darhol 200 OK ⚡      │      ┌───────────▼───────────────────┐
└──────────────────────────┘      │ Redis navbat: notify:telegram │
                                   │  ZSET (priority + timestamp)  │
                                   └───────────┬───────────────────┘
                                               │
                                   ┌───────────▼───────────────────┐
                                   │ armenu-worker@notify          │
                                   │  token bucket → API           │
                                   └───────────────────────────────┘
```

### 6.3 Webhook vs polling

| | Webhook | Polling |
|---|---|---|
| Kechikish | ⚡ ~50 ms | 1-3 s |
| Server yuki | Past (push) | Doimiy so'rov |
| Talab | HTTPS + haqiqiy sertifikat | Yo'q |
| **Bizda** | ✅ **prod** | 🟡 dev/lokal |

```python
# Prod: webhook o'rnatish
# manage.py setup_telegram_webhook
requests.post(f'https://api.telegram.org/bot{TOKEN}/setWebhook', json={
    'url': f'https://armenu.uz/webhooks/telegram/{settings.TG_SECRET_PATH}/',
    'secret_token': settings.TG_WEBHOOK_SECRET,       # ⚡ header'da qaytadi
    'allowed_updates': ['message', 'callback_query', 'pre_checkout_query'],
    'max_connections': 40,
    'drop_pending_updates': False,
})
```

```python
@csrf_exempt
@require_POST
def telegram_webhook(request, secret_path):
    # [1] ikki qatlamli tekshiruv: URL yo'li + header
    if not hmac.compare_digest(secret_path, settings.TG_SECRET_PATH):
        raise Http404
    if not hmac.compare_digest(
            request.headers.get('X-Telegram-Bot-Api-Secret-Token', ''),
            settings.TG_WEBHOOK_SECRET):
        return HttpResponse(status=403)

    update = json.loads(request.body)
    # [2] xom saqlash + [3] navbat + [4] darhol 200
    #     ⚡ Telegram 60 s ichida javob kutadi; biz ~5 ms da qaytaramiz
    WebhookEvent.objects.create(provider='telegram', raw=update)
    enqueue('notify', {'kind': 'tg_update', 'update': update})
    return HttpResponse(status=200)
```

### 6.4 Xabar navbati va rate limit

> Telegram cheklovlari: **30 msg/s** butun bot bo'yicha, **~20 msg/daq** bitta guruhga,
> **1 msg/s** bitta shaxsiy chatga (amaliy chegara).

```python
# apps/integrations/messaging/ratelimit.py
class TokenBucket:
    """Redis'ga asoslangan — bir nechta worker bo'lsa ham global limit."""

    def __init__(self, key, rate, capacity):
        self.key, self.rate, self.capacity = key, rate, capacity

    def acquire(self, timeout=5.0) -> bool:
        deadline = time.time() + timeout
        while time.time() < deadline:
            if self._try():                # Lua skript: atomik
                return True
            time.sleep(0.05)
        return False


GLOBAL_BUCKET = TokenBucket('tg:global', rate=28, capacity=28)      # 30 dan past
CHAT_BUCKETS = lambda cid: TokenBucket(f'tg:chat:{cid}', rate=1, capacity=3)


def send_message(chat_id, text, **kw):
    if not GLOBAL_BUCKET.acquire() or not CHAT_BUCKETS(chat_id).acquire():
        requeue(chat_id, text, kw, delay=2)
        return

    r = requests.post(f'{API}/sendMessage',
                      json={'chat_id': chat_id, 'text': text, **kw}, timeout=10)

    if r.status_code == 429:                          # ⚡ Telegram o'zi aytadi
        retry_after = r.json().get('parameters', {}).get('retry_after', 5)
        metrics.inc('telegram.429')
        requeue(chat_id, text, kw, delay=retry_after + 1)
        return
    if r.status_code == 403:                          # bot bloklangan
        TelegramLink.objects.filter(chat_id=chat_id).update(is_blocked=True)
        return
    if r.status_code >= 500:
        requeue(chat_id, text, kw, delay=30)
```

**Navbat prioriteti (Redis ZSET):**

| Prioritet | Xabar turi | Maks kechikish |
|---|---|---|
| 0 (eng yuqori) | Yangi buyurtma → ofitsiant | 2 s |
| 1 | Chek / to'lov tasdig'i | 5 s |
| 2 | Buyurtma holati o'zgardi | 15 s |
| 5 | Sodiqlik / keshbek | 5 daqiqa |
| 9 (eng past) | Marketing / e'lon | 1 soat |

### 6.5 Mini App

```
Mijoz: Telegram → @armenu_bot → [🍽 Menyu] tugma
         │
         ▼
  Mini App ochiladi: https://armenu.uz/tg/<restaurant_slug>/
         │  window.Telegram.WebApp.initData
         ▼
  POST /v1/tg/auth/  { init_data: "<xom string>" }
         │
         ▼  ⚡ Server initData imzosini TEKSHIRADI
         │     secret = HMAC_SHA256("WebAppData", BOT_TOKEN)
         │     hash  = HMAC_SHA256(secret, data_check_string)
         │     auth_date 24 soatdan eski bo'lsa → RAD
         ▼
  GuestSession yaratiladi (telegram_user_id bilan bog'lanadi)
         │
         ▼
  Menyu → savat → buyurtma → to'lov
  (bir xil API, faqat auth manbai boshqa)
```

```python
def verify_telegram_init_data(init_data: str, bot_token: str) -> dict | None:
    parsed = dict(urllib.parse.parse_qsl(init_data))
    received_hash = parsed.pop('hash', '')
    data_check = '\n'.join(f'{k}={parsed[k]}' for k in sorted(parsed))
    secret = hmac.new(b'WebAppData', bot_token.encode(), hashlib.sha256).digest()
    calc = hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calc, received_hash):
        return None
    if int(time.time()) - int(parsed.get('auth_date', 0)) > 86400:
        return None                    # ⚡ 24 soatdan eski
    return json.loads(parsed.get('user', '{}'))
```

---

## 7. CDN VA FAYL SAQLASH

### 7.1 Nima uchun kritik

> 3D fayl yuklanmasa — **AR yo'q**. AR yo'q bo'lsa — ARMENU'ning asosiy qiymati yo'q.
> Shuning uchun CDN kritiklik darajasi 🔴 **Yuqori**.

### 7.2 Oqim

```
┌─────────┐   1. GET model.glb    ┌──────────────┐
│ Brauzer │──────────────────────▶│  Cloudflare  │
│ <model- │                       │     CDN      │
│ viewer> │◀──────────────────────│              │
└─────────┘   2. HIT (~30 ms)     └──────┬───────┘
                                          │ MISS
                                          ▼
                                 ┌──────────────────┐
                                 │ cdn.armenu.uz    │
                                 │ (origin: nginx)  │
                                 └────────┬─────────┘
                                          │
                          ┌───────────────┴───────────────┐
                          ▼                               ▼
                 ┌─────────────────┐            ┌──────────────────┐
                 │ Lokal disk kesh │            │  S3 / MinIO      │
                 │ /var/armenu/    │  MISS      │  armenu-media    │
                 │ media/ar/       │───────────▶│  (versioning ON) │
                 └─────────────────┘            └──────────────────┘

Fallback zanjiri (graceful degradation):
  CDN → origin nginx → lokal kesh → S3 → 🖼 oddiy rasm
```

### 7.3 3D fayl MIME turlari — ⚡ KRITIK

> Noto'g'ri `Content-Type` → iOS AR Quick Look **ochilmaydi**, Android Scene Viewer
> **xato beradi**. Bu eng ko'p uchraydigan AR bug'i.

| Kengaytma | MIME | Platforma | Maks hajm |
|---|---|---|---|
| `.glb` | `model/gltf-binary` | Android (Scene Viewer), web `<model-viewer>` | **3 MB** |
| `.gltf` | `model/gltf+json` | web | 3 MB |
| `.usdz` | `model/vnd.usdz+zip` | ⚡ **iOS AR Quick Look** | **5 MB** |
| `.bin` | `application/octet-stream` | gltf yordamchi | — |
| `.ktx2` | `image/ktx2` | siqilgan tekstura | 1 MB |
| `.basis` | `application/octet-stream` | siqilgan tekstura | 1 MB |
| `.hdr` | `image/vnd.radiance` | muhit yorug'ligi | 2 MB |
| `.webp` | `image/webp` | fallback rasm | 300 KB |

```nginx
# /etc/nginx/mime.types.armenu  (nginx.conf http{} blokida include qilinadi)
types {
    model/gltf-binary       glb;
    model/gltf+json         gltf;
    model/vnd.usdz+zip      usdz;
    image/ktx2              ktx2;
    image/vnd.radiance      hdr;
    application/wasm        wasm;
}
```

### 7.4 CORS — AR uchun kritik

> `<model-viewer>` faylni `fetch()` bilan oladi. CORS header bo'lmasa —
> brauzer bloklaydi va AR ishga tushmaydi. Xato konsolda **jim** ko'rinadi.

```nginx
location /media/ar/ {
    alias /var/armenu/media/ar/;

    # ⚡ AR uchun MAJBURIY
    add_header Access-Control-Allow-Origin  "*"                    always;
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS"   always;
    add_header Access-Control-Allow-Headers "Range, Content-Type"  always;
    add_header Access-Control-Expose-Headers "Content-Length, Content-Range, Accept-Ranges" always;
    add_header Cross-Origin-Resource-Policy "cross-origin"         always;

    # Range so'rovlar — katta GLB progressiv yuklanishi uchun
    add_header Accept-Ranges bytes always;

    # Kesh
    expires 30d;
    add_header Cache-Control "public, max-age=2592000, immutable" always;

    # Preflight
    if ($request_method = OPTIONS) {
        add_header Access-Control-Max-Age 86400;
        add_header Content-Length 0;
        return 204;
    }

    # Fayl yo'q → rasm fallback
    try_files $uri @s3_origin;
}

location @s3_origin {
    proxy_pass https://armenu-media.s3.amazonaws.com;
    proxy_cache ar_cache;
    proxy_cache_valid 200 30d;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503;
}
```

### 7.5 Cloudflare konfiguratsiyasi

| Sozlama | Qiymat | Nega |
|---|---|---|
| **Proxy (orange cloud)** | ON | DDoS + WAF + kesh |
| **SSL/TLS rejimi** | Full (strict) | Origin sertifikati tekshiriladi |
| **Min TLS** | 1.2 | Xavfsizlik |
| **Brotli** | ON | `.gltf` (JSON) yaxshi siqiladi |
| **Auto Minify** | JS+CSS (HTML yo'q) | Sahifa tezligi |
| **HTTP/3 (QUIC)** | ON | Mobil tarmoqda tezroq |
| **Early Hints** | ON | 3D fayl preload |
| **Polish** | Lossy + WebP | Taom rasmlari |
| **Bot Fight Mode** | ON (webhook'lar bypass) | Skraping himoyasi |
| **Rate limiting** | 300 req/min/IP | Qo'shimcha qatlam |

**Cache Rules:**

| # | Shart | Harakat | Edge TTL | Brauzer TTL |
|---|---|---|---|---|
| 1 | `URI path` starts with `/media/ar/` | Cache Everything | **30 kun** | 30 kun |
| 2 | `URI path` starts with `/static/` | Cache Everything | **1 yil** | 1 yil |
| 3 | `URI path` starts with `/media/dish/` | Cache Everything | 7 kun | 1 kun |
| 4 | `URI path` starts with `/api/menu/` | Cache Everything (+`Vary: Accept-Language`) | **60 s** | 0 |
| 5 | `URI path` starts with `/api/orders/` | **Bypass** | — | — |
| 6 | `URI path` starts with `/webhooks/` | **Bypass** + Bot Fight OFF | — | — |
| 7 | `URI path` starts with `/ws/` | **Bypass** (WebSocket) | — | — |
| 8 | `URI path` starts with `/admin/` | **Bypass** | — | — |

```bash
# Kesh tozalash (deploy'dan keyin, faqat kerakli prefiks)
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/purge_cache" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"prefixes":["armenu.uz/static/","armenu.uz/api/menu/"]}'
```

### 7.6 S3 bucket tuzilishi

```
s3://armenu-media/                       (versioning ON, lifecycle bor)
├── ar/
│   ├── library/                         ⚡ UMUMIY 3D KUTUBXONA (tenant'siz)
│   │   ├── osh/
│   │   │   ├── model.glb                (2,1 MB)
│   │   │   ├── model.usdz               (3,4 MB)
│   │   │   ├── thumb.webp               (28 KB)
│   │   │   └── meta.json                (o'lcham, poly, litsenziya)
│   │   ├── shashlik/  manti/  lagman/  ...
│   │   └── _index.json                  (semantik qidiruv uchun)
│   │
│   └── r/<restaurant_id>/               ⚡ TENANT-SCOPED
│       └── dish/<dish_id>/
│           ├── v1/model.glb
│           ├── v2/model.glb             (versiyalar saqlanadi)
│           └── current -> v2            (metadata'da)
│
├── dish/<restaurant_id>/<dish_id>/      (taom rasmlari)
│   ├── original.jpg   large.webp   medium.webp   thumb.webp
│
├── qr/<restaurant_id>/                  (stol QR PDF)
│   └── table_<n>.pdf
│
├── receipt/<restaurant_id>/<yyyy>/<mm>/ (fiskal chek PDF, 5 yil)
│
└── backup/                              (alohida bucket tavsiya etiladi)
    ├── db/YYYY-MM-DD/
    └── wal/
```

**Bucket siyosati:**

| Prefiks | Ruxsat | Lifecycle |
|---|---|---|
| `ar/library/` | Public read (CDN origin) | — (doimiy) |
| `ar/r/*/` | Public read (URL taxmin qilib bo'lmaydi — uuid) | Eski versiya 90 kundan keyin Glacier |
| `dish/` | Public read | — |
| `receipt/` | ⛔ **Private** (faqat imzolangan URL, 15 daq) | **5 yil**, keyin Glacier |
| `backup/` | ⛔ **Private** + MFA delete | 30 kun → Glacier → 1 yil |

### 7.7 Origin himoyasi

```nginx
# Origin'ga faqat Cloudflare kirsin
# /etc/nginx/cloudflare-ips.conf (cron bilan yangilanadi)
allow 173.245.48.0/20;
allow 103.21.244.0/22;
# ... (https://www.cloudflare.com/ips-v4)
deny all;

# Va real IP tiklanadi
set_real_ip_from 173.245.48.0/20;
# ...
real_ip_header CF-Connecting-IP;
```

```bash
# Cloudflare IP ro'yxatini yangilash (cron: haftada 1)
#!/bin/bash
# /usr/local/bin/update-cf-ips.sh
OUT=/etc/nginx/cloudflare-ips.conf
{
  for ip in $(curl -fsS https://www.cloudflare.com/ips-v4); do echo "allow $ip;"; done
  for ip in $(curl -fsS https://www.cloudflare.com/ips-v6); do echo "allow $ip;"; done
  echo "deny all;"
} > "$OUT.tmp" && mv "$OUT.tmp" "$OUT" && nginx -t && systemctl reload nginx
```

---

## 8. CHIQUVCHI INTEGRATSIYA JADVALI

### 8.1 To'liq jadval

| Xizmat | Op | SLA (p95) | Timeout | Retry | CB (xato/kutish) | Fallback | Oylik $ |
|---|---|---|---|---|---|---|---|
| **Claude** | chat/translate | 1,4 s | 30 s | 2× (0,5s, 1,5s) | 3 / 120 s | → Gemini | 31 |
| **Gemini** | chat/translate/vision | 0,8 s | 30 s | 2× | 3 / 120 s | → Groq | 42 |
| **OpenAI** | chat/vision | 1,8 s | 30 s | 2× | 3 / 120 s | → Mistral | 0 (zaxira) |
| **Groq** | chat (tez) | 0,3 s | 20 s | 2× | 3 / 120 s | → Claude | 15 |
| **DeepSeek** | chat/translate | 1,1 s | 30 s | 2× | 3 / 120 s | → OpenAI | 5 |
| **Mistral** | chat/translate | 1,2 s | 30 s | 2× | 3 / 120 s | → (oxirgi) | 0 (zaxira) |
| **Meshy** | image_to_3d | 4 daq | 600 s | 3× (1m,5m,15m) | 2 / 600 s | → Tripo | 391 |
| **Tripo** | image_to_3d | 6,5 daq | 600 s | 3× | 2 / 600 s | → Rodin/qo'lda | 3 |
| **Payme** | invoice/refund | 0,6 s | 15 s | 2× | 3 / 60 s | → Click | 0* |
| **Click** | prepare/complete | 0,9 s | 15 s | 2× | 3 / 60 s | → Uzum | 0* |
| **Uzum** | charge/refund | 0,7 s | 15 s | 2× | 3 / 60 s | → **naqd** | 0* |
| **UZKASSA** | send_receipt | 1,2 s | 25 s | 8× (48 soat) | 3 / 120 s | → e-POS | 25** |
| **e-POS** | send_receipt | 1,5 s | 25 s | 8× (48 soat) | 3 / 120 s | → navbat | 0 (zaxira) |
| **tasnif.soliq.uz** | ikpu search | 2,0 s | 10 s | 1× | 3 / 300 s | → lokal snapshot | 0 |
| **Telegram** | sendMessage | 0,3 s | 10 s | 5× (1s…10m) | 5 / 60 s | → WS/brauzer push | 0 |
| **Cloudflare** | CDN | 30 ms | — | — | — | → origin | 20 |
| **S3/MinIO** | get/put | 120 ms | 30 s | 3× | 5 / 60 s | → lokal disk | 45 |
| **Google Places** | reviews | 1,5 s | 12 s | 1× | 3 / 600 s | → yashiriladi | 8 |
| **CBU kurs** | rate | 0,5 s | 10 s | 1× | 3 / 3600 s | → oxirgi kurs | 0 |
| | | | | | | **JAMI** | **~$585** |

> `*` To'lov provayderlari komissiya oladi (tranzaksiyadan %), oylik abonent to'lov yo'q.
> `**` OFD har chek uchun to'lov (~50-100 so'm/chek) yoki oylik paket.

### 8.2 Circuit breaker sozlamalari — nega turlicha

| Domen | fail_threshold | timeout | Sabab |
|---|---|---|---|
| **AI** | 3 | 120 s | Ko'p alternativa bor — tez chetlab o'tish arzon |
| **To'lov** | 3 | 60 s | Tez tiklanishi kerak (pul) — qisqa timeout |
| **Fiskal** | 3 | 120 s | Navbat bor, shoshilish yo'q |
| **3D (Meshy/Tripo)** | 2 | 600 s | Qimmat operatsiya — behuda urinmaslik |
| **Telegram** | 5 | 60 s | Vaqtinchalik 429 normal — chidamliroq |
| **S3** | 5 | 60 s | Yadro infratuzilma — juda tez ochilmasin |
| **tasnif.soliq.uz** | 3 | 300 s | Davlat servisi — uzoq yiqiladi, lokal snapshot bor |

---

## 9. KIRUVCHI INTEGRATSIYA (BIZNING API)

> Holat: **v2 rejasi** (yil 5 — "Ochiq API" bosqichi). Arxitektura hozirdan tayyorlanadi,
> chunki keyinchalik qo'shish qiyin.

### 9.1 Kim foydalanadi

| Iste'molchi | Nima uchun | Prioritet |
|---|---|---|
| Restoran POS tizimi (iiko, r_keeper) | Buyurtmani o'z tizimiga olish | Yuqori |
| Delivery agregator | Menyu + narx sinxronizatsiya | O'rta |
| Buxgalteriya dasturi | To'lov/chek eksporti | O'rta |
| Restoran tarmog'i BI | Analitika | Past |

### 9.2 Versiyalash

```
https://api.armenu.uz/v1/restaurants/<id>/menu/
                      ^^^
                      URL'da versiya (eng oddiy, kesh-do'st)

QOIDALAR:
  • Yangi maydon qo'shish        → versiya O'ZGARMAYDI (backward compatible)
  • Maydon o'chirish/nomi o'zgarishi → yangi versiya (v2)
  • v1 va v2 kamida 12 oy parallel ishlaydi
  • Eskirish: Deprecation + Sunset header (RFC 8594)
```

```http
HTTP/1.1 200 OK
Deprecation: Sat, 01 Jun 2027 00:00:00 GMT
Sunset: Tue, 01 Jun 2028 00:00:00 GMT
Link: <https://docs.armenu.uz/api/v2>; rel="successor-version"
```

### 9.3 API kalit

```python
class ApiKey(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE)  # ⚡ tenant
    name = models.CharField(max_length=80)              # "iiko integratsiya"
    key_prefix = models.CharField(max_length=12, db_index=True)   # 'ak_live_a3f2'
    key_hash = models.CharField(max_length=128)         # ⚡ argon2, xom kalit SAQLANMAYDI
    scopes = models.JSONField(default=list)             # ['menu:read', 'orders:read']
    rate_limit_per_min = models.IntegerField(default=120)
    allowed_ips = models.JSONField(default=list)        # bo'sh = hamma
    expires_at = models.DateTimeField(null=True)
    last_used_at = models.DateTimeField(null=True)
    revoked_at = models.DateTimeField(null=True)
```

```http
GET /v1/restaurants/42/menu/ HTTP/1.1
Host: api.armenu.uz
Authorization: Bearer ak_live_a3f2c81d9e4b...
X-Api-Version: 1
```

**Scope'lar:**

| Scope | Ruxsat |
|---|---|
| `menu:read` | Menyu, kategoriya, taom, narx |
| `menu:write` | Taom qo'shish/o'zgartirish, stop-list |
| `orders:read` | Buyurtmalar ro'yxati, holat |
| `orders:write` | Holat o'zgartirish (tayyor/berildi) |
| `payments:read` | To'lov holati (❌ karta ma'lumoti hech qachon) |
| `analytics:read` | Agregat hisobotlar |
| `webhooks:manage` | Webhook obunasi |

> ⚡ **Tenant izolyatsiya:** API kalit **bitta restoranga** bog'langan.
> `/v1/restaurants/<id>/` da `<id>` kalitning restoraniga teng bo'lmasa → **403**.
> Bu `test_tenant_isolation.py` da tekshiriladi.

### 9.4 Rate limit

| Tarif | So'rov/daqiqa | Burst | Kunlik |
|---|---|---|---|
| Free | 60 | 20 | 10 000 |
| Standart | 120 | 40 | 100 000 |
| Premium | 600 | 200 | 1 000 000 |

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 117
X-RateLimit-Reset: 1757340000

# Oshib ketsa:
HTTP/1.1 429 Too Many Requests
Retry-After: 23
```

### 9.5 Chiquvchi webhook (biz yuboradigan)

```
┌──────────┐  event  ┌───────────────┐  POST   ┌──────────────┐
│  ARMENU  │────────▶│ Webhook       │────────▶│  3rd party   │
│  (event) │         │ navbat (Redis)│         │  endpoint    │
└──────────┘         │ + retry       │◀────────│  200 kutiladi│
                     └───────────────┘  200 OK └──────────────┘
```

| Event | Qachon | Payload |
|---|---|---|
| `order.created` | Yangi buyurtma | order, items, table |
| `order.status_changed` | Holat o'zgardi | order_id, old, new |
| `order.completed` | Yopildi | order, total |
| `payment.succeeded` | To'landi | payment, order_id |
| `payment.refunded` | Qaytarildi | payment, amount |
| `receipt.issued` | Fiskal chek | fiscal_sign, qr_url |
| `menu.updated` | Menyu o'zgardi | dish_ids |
| `dish.out_of_stock` | Stop-list | dish_id |

```http
POST https://client.example.com/armenu-hook HTTP/1.1
Content-Type: application/json
X-ARMenu-Event: order.created
X-ARMenu-Delivery: 3f2a9c81-...           ← ⚡ idempotency uchun
X-ARMenu-Timestamp: 1757340000
X-ARMenu-Signature: sha256=8f3d...        ← HMAC(secret, ts + '.' + body)

{"event":"order.created","data":{...},"restaurant_id":42}
```

**Yetkazish siyosati:**

| Parametr | Qiymat |
|---|---|
| Timeout | 10 s |
| Muvaffaqiyat | HTTP 2xx |
| Retry | 6× — 10 s, 1 daq, 5 daq, 30 daq, 2 soat, 6 soat |
| Deadline | 24 soat |
| Avtomatik o'chirish | 100 ketma-ket xato → obuna `paused` + email |
| Tartib | Kafolatlanmaydi (`timestamp` bilan tartiblang) |
| Takror | ⚡ Bo'lishi mumkin — `X-ARMenu-Delivery` bo'yicha dedup qiling |

---

## 10. INTEGRATSIYA TESTLARI

### 10.1 Test piramidasi

```
                    ▲
                   /│\      🔺 E2E (sandbox)         ~10 test
                  / │ \        real sandbox API
                 /  │  \       ⏱ sekin, nightly
                /───┼───\
               /    │    \  🔷 Kontrakt testlari      ~40 test
              /     │     \    har adapter interfeysga mos
             /      │      \   ⏱ tez, har commit
            /───────┼───────\
           /        │        \ 🟩 Mock/birlik testlari ~200 test
          /         │         \  responses/VCR bilan
         /__________│__________\ ⏱ juda tez, har commit
```

### 10.2 Mock strategiyasi

| Qatlam | Vosita | Nima mock qilinadi |
|---|---|---|
| HTTP | `responses` / `respx` | Tashqi URL javoblari |
| Yozib olish | `vcrpy` cassette | Real javob 1 marta yoziladi, keyin qayta ijro |
| Vaqt | `freezegun` | Retry jadvali, timestamp oynalari |
| Navbat | `pytest` fixture | Worker sinxron ishlaydi |
| Redis | `fakeredis` | Kesh, circuit breaker, token bucket |

```python
# tests/integrations/conftest.py
@pytest.fixture
def mock_payme_success(responses):
    responses.add(responses.POST, 'https://checkout.paycom.uz/api',
                  json={'result': {'state': 2}}, status=200)


@pytest.fixture
def mock_all_ai_fail(monkeypatch):
    """Barcha AI provayderlarni yiqitadi — degradation tekshiruvi"""
    from apps.integrations.ai.base import MCPProvider, MCPResponse
    monkeypatch.setattr(MCPProvider, 'call',
                        lambda self, req: MCPResponse(ok=False, error='mocked'))


@pytest.fixture(autouse=True)
def no_real_network(monkeypatch):
    """⚡ Testda HECH QACHON real tarmoqqa chiqilmasin"""
    import socket
    def guard(*a, **kw):
        raise RuntimeError('❌ Testda real tarmoq chaqiruvi! Mock qo\'ying.')
    monkeypatch.setattr(socket.socket, 'connect', guard)
```

### 10.3 Kontrakt testlari — ⚡ har adapter uchun avtomatik

```python
# tests/integrations/test_adapter_contract.py
"""
Har bir adapter interfeysga mos ekanini tekshiradi.
Yangi adapter qo'shilsa — TEST AVTOMATIK QO'LLANADI (registry'dan olinadi).
"""
import pytest
from apps.integrations.registry import ALL_ADAPTERS
from apps.integrations.base import BaseAdapter, IntegrationRequest, IntegrationResponse


@pytest.mark.parametrize('cls', ALL_ADAPTERS, ids=lambda c: c.name)
class TestAdapterContract:

    def test_meros(self, cls):
        assert issubclass(cls, BaseAdapter)

    def test_metadata(self, cls):
        a = cls()
        assert a.name and a.domain
        assert isinstance(a.supported_ops, set) and a.supported_ops
        assert isinstance(a.priority, int)

    def test_is_configured_exception_bermaydi(self, cls):
        cls().is_configured()          # raise qilmasligi kerak

    def test_execute_response_qaytaradi(self, cls, mock_network_error):
        """⚡ ENG MUHIM: tarmoq yiqilsa ham exception EMAS, Response"""
        resp = cls().execute(IntegrationRequest(op=next(iter(cls.supported_ops))))
        assert isinstance(resp, IntegrationResponse)
        assert resp.ok is False
        assert resp.error_code
        assert isinstance(resp.retryable, bool)

    def test_nomalum_op(self, cls):
        resp = cls().execute(IntegrationRequest(op='__yoq_op__'))
        assert resp.ok is False and resp.error_code == 'OP_NOT_SUPPORTED'

    def test_maxfiy_malumot_log_da_yoq(self, cls, caplog):
        cls().execute(IntegrationRequest(op=next(iter(cls.supported_ops)),
                                         payload={'card': '8600123412341234'}))
        assert '8600123412341234' not in caplog.text
```

### 10.4 Sandbox muhitlar

| Xizmat | Sandbox | Qachon ishlatiladi | Kalit manbai |
|---|---|---|---|
| Payme | `test.paycom.uz` | Nightly E2E | `.env.staging` |
| Click | test `service_id` | Nightly E2E | `.env.staging` |
| Uzum | `test-api.uzumbank.uz` | Nightly E2E | `.env.staging` |
| UZKASSA | test terminal | Nightly E2E | `.env.staging` |
| Telegram | alohida test bot | Har PR | GitHub secret |
| AI | ✅ real (arzon model, `max_tokens=10`) | Nightly | GitHub secret |
| S3 | MinIO konteyner | Har commit | — |
| tasnif.soliq.uz | ✅ real (o'qish) | Nightly | — |

```yaml
# .github/workflows/nightly-integration.yml
name: Nightly integratsiya (sandbox)
on:
  schedule: [{cron: '0 1 * * *'}]        # har kuni 01:00 UTC
  workflow_dispatch:

jobs:
  sandbox:
    runs-on: ubuntu-latest
    environment: staging               # ⚡ sirlar faqat shu muhitda
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: '3.12'}
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - name: Sandbox testlari
        env:
          PAYME_MERCHANT_ID: ${{ secrets.PAYME_TEST_MERCHANT_ID }}
          PAYME_KEY:         ${{ secrets.PAYME_TEST_KEY }}
          UZKASSA_TOKEN:     ${{ secrets.UZKASSA_TEST_TOKEN }}
          TELEGRAM_BOT_TOKEN: ${{ secrets.TG_TEST_BOT_TOKEN }}
          GEMINI_API_KEY:    ${{ secrets.GEMINI_API_KEY }}
        run: pytest tests/integrations/sandbox/ -v --tb=short -m sandbox
      - name: Xato bo'lsa Telegram'ga
        if: failure()
        run: |
          curl -s -X POST "https://api.telegram.org/bot${{ secrets.TG_ALERT_BOT }}/sendMessage" \
            -d chat_id=${{ secrets.TG_ALERT_CHAT }} \
            -d text="🔴 Nightly sandbox testlari yiqildi: ${{ github.run_id }}"
```

### 10.5 Majburiy integratsiya testlari (deploy bloklaydi)

```python
tests/integrations/
├── test_adapter_contract.py       # ⚡ har adapter interfeysga mos
├── test_payment_idempotency.py    # ⚡ dublikat to'lov = 0
├── test_payment_signature.py      # ⚡ soxta imzo → 401
├── test_payment_amount_check.py   # ⚡ summa serverdan, webhook'ga ishonilmaydi
├── test_fiscal_retry_schedule.py  # ⚡ 48 soat, 8 urinish
├── test_fiscal_ikpu_fallback.py   # 4 qatlam ishlaydi
├── test_mcp_fallback_chain.py     # ⚡ 2 provayder yiqilsa 3-si ishlaydi
├── test_mcp_budget.py             # byudjet oshsa to'xtaydi
├── test_mcp_circuit_breaker.py    # 3 xato → OPEN
├── test_telegram_ratelimit.py     # 30 msg/s oshmaydi
├── test_telegram_initdata.py      # ⚡ soxta initData → rad
├── test_cdn_mime_types.py         # ⚡ .usdz → model/vnd.usdz+zip
├── test_cors_headers.py           # ⚡ AR uchun CORS bor
└── test_no_secrets_in_logs.py     # ⚡ kalit/karta log'da yo'q
```

```python
# Namuna: eng kritik test
def test_webhook_summani_ozgartira_olmaydi(order, payme_webhook_body):
    """
    ⚡ OLTIN QOIDA: provayder yuborgan summa Payment.amount ga TENG bo'lishi shart.
    Aks holda to'lov QABUL QILINMAYDI.
    """
    order.total = Decimal('187000')
    order.save()
    body = payme_webhook_body(order, amount=1000)      # tajovuzkor 10 so'm yubordi

    resp = client.post('/webhooks/payme/', body,
                       content_type='application/json', **valid_auth_header())

    assert resp.json()['error']['code'] == ERR_INVALID_AMOUNT
    order.refresh_from_db()
    assert order.payment_status != 'paid'
```

### 10.6 Chaos testlari (oyiga 1 marta, staging)

| Test | Kutilgan natija |
|---|---|
| Barcha AI provayderni bloklash (iptables) | Chat "Ofitsiantni chaqiring" beradi, sayt ishlaydi |
| Payme + Click bloklash | Uzum ishlaydi; u ham yiqilsa → naqd rejimi |
| OFD bloklash 2 soat | Buyurtma/to'lov ishlaydi, cheklar navbatda, 2 soatdan keyin yuboriladi |
| S3 bloklash | Menyu ishlaydi, 3D o'rniga rasm |
| Telegram bloklash | WS bildirishnoma ishlaydi, navbat to'ldi → keyin yuboriladi |
| tasnif.soliq.uz bloklash | Lokal snapshot'dan IKPU topiladi |
| Tarmoq kechikishi +2 s | Timeout va circuit breaker ishlaydi, kaskad yo'q |

---

**➡️ Keyingi:** `08_DEPLOY_VA_OPERATSIYA.md`
