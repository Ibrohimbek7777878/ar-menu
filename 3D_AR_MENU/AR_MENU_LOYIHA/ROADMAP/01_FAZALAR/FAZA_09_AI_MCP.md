# FAZA 9 — AI VA MCP INTEGRATSIYASI

**Vazifalar:** V-171 … V-186 · **Muddat:** 1,5 hafta
**Maqsad:** 8 ta AI provayder, prioritet + fallback zanjirli router, chatbot,
avto-tarjima. Kod hech qachon aniq provayderni chaqirmaydi.

> ⚡ **ASOSIY PRINTSIP** (TZ_MASTER/07 §1.2):
> ```
> Kod HECH QACHON aniq provayderni chaqirmaydi.
> Kod faqat VAZIFA aytadi: "bu matnni tarjima qil", "3D model yarat".
> Router o'zi eng mos provayderni tanlaydi va yiqilsa keyingisiga o'tadi.
> ```

> ⚠️ FAZA 0 (`core/resilience.py` — CircuitBreaker) va FAZA 8 (`apps/i18n_admin`)
> tugagan bo'lishi SHART.

---

## V-171 — ⚡ MCP baza qatlami (ABC + dataclass)

**Fayl:** `apps/ai/__init__.py` (bo'sh)

**Fayl:** `apps/ai/apps.py`
```python
import logging

from django.apps import AppConfig

log = logging.getLogger('ai')


class AIConfig(AppConfig):
    name = 'apps.ai'
    label = 'ai'

    def ready(self):
        """⚡ Ishga tushishda provayderlar holatini tekshiradi (TZ §5.2)."""
        import os
        if os.environ.get('RUN_MAIN') == 'false':
            return
        try:
            from apps.ai.mcp import mcp
        except Exception as e:          # migratsiya paytida DB tayyor bo'lmasligi mumkin
            log.warning(f'[AI] router yuklanmadi: {e}')
            return

        configured = [p.name for p in mcp.providers if p.is_configured()]
        chat = [p for p in mcp.providers
                if p.is_configured() and 'chat' in p.supported_tasks]
        three_d = [p for p in mcp.providers
                   if p.is_configured() and 'image_to_3d' in p.supported_tasks]

        log.info(f'[AI] Sozlangan provayderlar ({len(configured)}): {configured}')
        if len(chat) < 2:
            log.warning('⚠️ [AI] Kamida 2 ta chat provayderi tavsiya etiladi (fallback)')
        if not three_d:
            log.warning("⚠️ [AI] 3D provayder yo'q — AI model generatsiyasi ishlamaydi")
        if not configured:
            log.error('⛔ [AI] HECH BIR provayder sozlanmagan!')
```

**Fayl:** `apps/ai/mcp/__init__.py`
```python
from apps.ai.mcp.base import MCPRequest, MCPResponse, MCPProvider  # noqa
from apps.ai.mcp.router import mcp, MCPRouter                      # noqa

__all__ = ['mcp', 'MCPRouter', 'MCPRequest', 'MCPResponse', 'MCPProvider']
```

**Fayl:** `apps/ai/mcp/base.py`
```python
import json
import logging
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from typing import Any, Optional

log = logging.getLogger('ai.mcp')

# Barcha qo'llab-quvvatlanadigan vazifalar
TASKS = {'chat', 'translate', 'vision', 'reasoning', 'image_to_3d', 'embedding'}

_FENCE_RE = re.compile(r'^\s*```(?:json)?\s*|\s*```\s*$', re.M)


def strip_fences(text: str) -> str:
    """AI ba'zan JSON'ni ```json ... ``` ichida qaytaradi — tozalaymiz."""
    return _FENCE_RE.sub('', text or '').strip()


def parse_json(text: str):
    """Xavfsiz JSON parse — muvaffaqiyatsiz bo'lsa xom matn qaytadi."""
    cleaned = strip_fences(text)
    try:
        return json.loads(cleaned)
    except Exception:
        # Ba'zan matn ichida JSON bo'ladi — birinchi { … } ni sinab ko'ramiz
        m = re.search(r'\{.*\}|\[.*\]', cleaned, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                pass
        log.warning(f'[MCP] JSON parse bo\'lmadi: {cleaned[:120]}')
        return cleaned


@dataclass
class MCPRequest:
    task: str                                  # TASKS dan biri
    prompt: str = ''
    system: str = ''
    messages: Optional[list] = None            # [{'role','content'}, ...]
    images: Optional[list] = None              # rasm URL yoki data: URI
    json_mode: bool = False
    max_tokens: int = 1500
    temperature: float = 0.3
    timeout: int = 30
    extra: dict = field(default_factory=dict)

    def __post_init__(self):
        if self.task not in TASKS:
            raise ValueError(f'Noma\'lum vazifa: {self.task}')
        self.max_tokens = max(1, min(int(self.max_tokens), 8000))
        self.temperature = max(0.0, min(float(self.temperature), 2.0))
        self.timeout = max(3, min(int(self.timeout), 900))


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
    cached: bool = False
    raw: Optional[dict] = None

    def to_dict(self):
        return asdict(self)


class MCPProvider(ABC):
    """
    ⚡ Har bir AI provayder shu interfeysni amalga oshiradi.
    Yangi provayder qo'shish = 1 ta fayl + registry'ga qator.
    """
    name: str = ''
    supported_tasks: set = frozenset()
    priority: dict = {}          # {'chat': 10, 'translate': 20} — kichik = birinchi
    price_in: float = 0.0        # $/1M kirish token
    price_out: float = 0.0       # $/1M chiqish token
    MODEL: str = ''

    @abstractmethod
    def is_configured(self) -> bool:
        """API key mavjudmi"""

    @abstractmethod
    def call(self, req: MCPRequest) -> MCPResponse:
        """Asosiy chaqiruv. XATO OTMAYDI — MCPResponse(ok=False) qaytaradi."""

    def health_check(self) -> bool:
        """Provayder tirikmi (yengil so'rov)."""
        if not self.is_configured():
            return False
        try:
            r = self.call(MCPRequest(task='chat', prompt='ping',
                                     max_tokens=5, timeout=8))
            return r.ok
        except Exception:
            return False

    def estimate_cost(self, tin: int, tout: int) -> float:
        return round((tin * self.price_in + tout * self.price_out) / 1_000_000, 6)

    def supports(self, task: str) -> bool:
        return task in self.supported_tasks

    def __repr__(self):
        return f'<{self.__class__.__name__} {self.name}>'
```

**Fayl:** `apps/ai/mcp/openai_compat.py`
```python
"""
⚡ Ko'p provayder (OpenAI, Groq, DeepSeek, Mistral) bir xil
OpenAI Chat Completions API'sini gapiradi. Umumiy kod shu yerda —
har provayder faqat BASE_URL, MODEL va narxni beradi.
"""
import time
import logging

import requests

from apps.ai.mcp.base import MCPProvider, MCPRequest, MCPResponse, parse_json

log = logging.getLogger('ai.mcp')


class OpenAICompatProvider(MCPProvider):
    BASE_URL = ''
    ENV_KEY = ''
    SUPPORTS_VISION = False
    SUPPORTS_JSON_MODE = True

    def __init__(self):
        from django.conf import settings
        self.key = settings.AI_KEYS.get(self.ENV_KEY, '')

    def is_configured(self) -> bool:
        return bool(self.key)

    def _build_messages(self, req: MCPRequest) -> list:
        msgs = list(req.messages or [{'role': 'user', 'content': req.prompt}])
        if req.system:
            msgs = [{'role': 'system', 'content': req.system}] + msgs
        if req.images and self.SUPPORTS_VISION:
            last = msgs[-1]
            parts = [{'type': 'image_url', 'image_url': {'url': u}} for u in req.images]
            parts.append({'type': 'text', 'text': last.get('content') or req.prompt})
            msgs[-1] = {'role': last.get('role', 'user'), 'content': parts}
        return msgs

    def call(self, req: MCPRequest) -> MCPResponse:
        t0 = time.time()
        try:
            body = {
                'model': self.MODEL,
                'messages': self._build_messages(req),
                'max_tokens': req.max_tokens,
                'temperature': req.temperature,
            }
            if req.json_mode and self.SUPPORTS_JSON_MODE:
                body['response_format'] = {'type': 'json_object'}

            r = requests.post(
                f'{self.BASE_URL}/chat/completions',
                headers={'Authorization': f'Bearer {self.key}',
                         'Content-Type': 'application/json'},
                json=body, timeout=req.timeout)

            if r.status_code >= 400:
                return MCPResponse(ok=False, provider=self.name,
                                   error=f'HTTP {r.status_code}: {r.text[:200]}',
                                   latency_ms=int((time.time() - t0) * 1000))

            d = r.json()
            text = d['choices'][0]['message']['content'] or ''
            usage = d.get('usage') or {}
            tin = usage.get('prompt_tokens', 0)
            tout = usage.get('completion_tokens', 0)

            return MCPResponse(
                ok=True,
                content=parse_json(text) if req.json_mode else text,
                provider=self.name, model=self.MODEL,
                tokens_in=tin, tokens_out=tout,
                cost_usd=self.estimate_cost(tin, tout),
                latency_ms=int((time.time() - t0) * 1000))

        except requests.Timeout:
            return MCPResponse(ok=False, provider=self.name, error='timeout',
                               latency_ms=int((time.time() - t0) * 1000))
        except Exception as e:
            return MCPResponse(ok=False, provider=self.name, error=str(e)[:250],
                               latency_ms=int((time.time() - t0) * 1000))
```

✅ **Test:** `tests/test_mcp_base.py`
```python
import pytest

from apps.ai.mcp.base import MCPRequest, MCPResponse, parse_json, strip_fences


def test_unknown_task_rejected():
    with pytest.raises(ValueError):
        MCPRequest(task='dance')


def test_limits_clamped():
    r = MCPRequest(task='chat', max_tokens=99999, temperature=9, timeout=99999)
    assert r.max_tokens == 8000
    assert r.temperature == 2.0
    assert r.timeout == 900


def test_strip_fences():
    assert strip_fences('```json\n{"a":1}\n```') == '{"a":1}'


def test_parse_json_from_noisy_text():
    assert parse_json('Mana javob: {"name":"Osh"} rahmat') == {'name': 'Osh'}


def test_parse_json_fallback_to_text():
    assert parse_json('shunchaki matn') == 'shunchaki matn'


def test_response_serializable():
    d = MCPResponse(ok=True, content='x', provider='p').to_dict()
    assert d['ok'] and d['provider'] == 'p'
```

✅ **Tekshirish:**
```bash
python manage.py check
pytest tests/test_mcp_base.py -q     # 6 passed
```

---

## V-172 — Provayder #1: Anthropic Claude

**Fayl:** `apps/ai/mcp/providers/__init__.py` (bo'sh)

**Fayl:** `apps/ai/mcp/providers/claude.py`
```python
import time
import logging

from django.conf import settings

from apps.ai.mcp.base import MCPProvider, MCPRequest, MCPResponse, parse_json

log = logging.getLogger('ai.mcp.claude')


class ClaudeProvider(MCPProvider):
    """Anthropic Claude — eng sifatli tarjima va murakkab fikrlash."""
    name = 'claude'
    supported_tasks = {'chat', 'translate', 'vision', 'reasoning'}
    # kichik raqam = yuqori prioritet
    priority = {'chat': 20, 'translate': 10, 'vision': 15, 'reasoning': 5}
    price_in, price_out = 0.80, 4.00
    MODEL = 'claude-haiku-4-5-20251001'

    def __init__(self):
        self.key = settings.AI_KEYS.get('ANTHROPIC_API_KEY', '')
        self._client = None

    @property
    def client(self):
        if self._client is None and self.key:
            import anthropic
            self._client = anthropic.Anthropic(api_key=self.key)
        return self._client

    def is_configured(self) -> bool:
        return bool(self.key)

    def _messages(self, req: MCPRequest) -> list:
        msgs = [dict(m) for m in (req.messages or
                                  [{'role': 'user', 'content': req.prompt}])]
        if req.images:
            parts = []
            for u in req.images:
                if u.startswith('data:'):
                    header, _, b64 = u.partition(',')
                    media = header.split(';')[0].replace('data:', '') or 'image/jpeg'
                    parts.append({'type': 'image',
                                  'source': {'type': 'base64',
                                             'media_type': media, 'data': b64}})
                else:
                    parts.append({'type': 'image',
                                  'source': {'type': 'url', 'url': u}})
            last = msgs[-1]
            parts.append({'type': 'text',
                          'text': last.get('content') or req.prompt})
            msgs[-1] = {'role': last.get('role', 'user'), 'content': parts}
        return msgs

    def call(self, req: MCPRequest) -> MCPResponse:
        t0 = time.time()
        if not self.client:
            return MCPResponse(ok=False, provider=self.name, error='no_api_key')
        try:
            kwargs = dict(model=self.MODEL, max_tokens=req.max_tokens,
                          temperature=req.temperature, messages=self._messages(req))
            if req.system:
                kwargs['system'] = req.system
            if req.json_mode:
                # Claude'da JSON rejimi yo'q — ko'rsatma bilan majburlaymiz
                kwargs['system'] = (kwargs.get('system', '') +
                                    '\n\nFaqat yaroqli JSON qaytar, boshqa matn yozma.')

            resp = self.client.messages.create(**kwargs, timeout=req.timeout)
            text = ''.join(b.text for b in resp.content if getattr(b, 'text', None))
            tin, tout = resp.usage.input_tokens, resp.usage.output_tokens

            return MCPResponse(
                ok=True,
                content=parse_json(text) if req.json_mode else text,
                provider=self.name, model=self.MODEL,
                tokens_in=tin, tokens_out=tout,
                cost_usd=self.estimate_cost(tin, tout),
                latency_ms=int((time.time() - t0) * 1000))
        except Exception as e:
            return MCPResponse(ok=False, provider=self.name, error=str(e)[:250],
                               latency_ms=int((time.time() - t0) * 1000))
```

✅ **Test:** `tests/test_provider_claude.py`
```python
from apps.ai.mcp.base import MCPRequest
from apps.ai.mcp.providers.claude import ClaudeProvider


class _Usage:
    input_tokens, output_tokens = 100, 50


class _Block:
    text = '{"name_en": "Pilaf"}'


class _Resp:
    content = [_Block()]
    usage = _Usage()


def test_json_mode_parsed(monkeypatch, settings):
    settings.AI_KEYS = {'ANTHROPIC_API_KEY': 'sk-test'}
    p = ClaudeProvider()

    class FakeClient:
        class messages:
            @staticmethod
            def create(**kw):
                assert 'JSON' in kw['system']
                return _Resp()
    p._client = FakeClient()

    r = p.call(MCPRequest(task='translate', prompt='Osh', json_mode=True))
    assert r.ok and r.content == {'name_en': 'Pilaf'}
    assert r.cost_usd > 0


def test_no_key_returns_error(settings):
    settings.AI_KEYS = {'ANTHROPIC_API_KEY': ''}
    p = ClaudeProvider()
    assert not p.is_configured()
    assert p.call(MCPRequest(task='chat', prompt='x')).error == 'no_api_key'


def test_exception_becomes_response(monkeypatch, settings):
    settings.AI_KEYS = {'ANTHROPIC_API_KEY': 'sk-test'}
    p = ClaudeProvider()

    class Boom:
        class messages:
            @staticmethod
            def create(**kw):
                raise RuntimeError('overloaded')
    p._client = Boom()
    r = p.call(MCPRequest(task='chat', prompt='x'))
    assert not r.ok and 'overloaded' in r.error
```

✅ **Tekshirish:** `pytest tests/test_provider_claude.py -q` → 3 passed

---

## V-173 — Provayder #2: Google Gemini

**Fayl:** `apps/ai/mcp/providers/gemini.py`
```python
import time
import logging

import requests
from django.conf import settings

from apps.ai.mcp.base import MCPProvider, MCPRequest, MCPResponse, parse_json

log = logging.getLogger('ai.mcp.gemini')


class GeminiProvider(MCPProvider):
    """Google Gemini Flash — eng arzon, chatbot uchun #1."""
    name = 'gemini'
    supported_tasks = {'chat', 'translate', 'vision', 'embedding'}
    priority = {'chat': 10, 'translate': 20, 'vision': 10, 'embedding': 10}
    price_in, price_out = 0.10, 0.40
    MODEL = 'gemini-2.0-flash'
    EMBED_MODEL = 'text-embedding-004'
    BASE = 'https://generativelanguage.googleapis.com/v1beta'

    def __init__(self):
        self.key = settings.AI_KEYS.get('GEMINI_API_KEY', '')

    def is_configured(self) -> bool:
        return bool(self.key)

    # ---- format o'girish ----
    def _contents(self, req: MCPRequest) -> list:
        out = []
        for m in (req.messages or [{'role': 'user', 'content': req.prompt}]):
            role = 'model' if m.get('role') == 'assistant' else 'user'
            out.append({'role': role, 'parts': [{'text': m.get('content', '')}]})
        if req.images:
            parts = out[-1]['parts']
            for u in req.images:
                if u.startswith('data:'):
                    header, _, b64 = u.partition(',')
                    mime = header.split(';')[0].replace('data:', '') or 'image/jpeg'
                    parts.insert(0, {'inline_data': {'mime_type': mime, 'data': b64}})
                else:
                    parts.insert(0, {'file_data': {'file_uri': u}})
        return out

    def call(self, req: MCPRequest) -> MCPResponse:
        if req.task == 'embedding':
            return self._embed(req)

        t0 = time.time()
        try:
            body = {
                'contents': self._contents(req),
                'generationConfig': {
                    'maxOutputTokens': req.max_tokens,
                    'temperature': req.temperature,
                },
            }
            if req.system:
                body['systemInstruction'] = {'parts': [{'text': req.system}]}
            if req.json_mode:
                body['generationConfig']['responseMimeType'] = 'application/json'

            r = requests.post(
                f'{self.BASE}/models/{self.MODEL}:generateContent',
                params={'key': self.key}, json=body, timeout=req.timeout)
            if r.status_code >= 400:
                return MCPResponse(ok=False, provider=self.name,
                                   error=f'HTTP {r.status_code}: {r.text[:200]}',
                                   latency_ms=int((time.time() - t0) * 1000))
            d = r.json()
            cands = d.get('candidates') or []
            if not cands:
                return MCPResponse(ok=False, provider=self.name,
                                   error=f'no_candidates: {str(d)[:150]}')
            text = ''.join(p.get('text', '')
                           for p in cands[0]['content'].get('parts', []))
            um = d.get('usageMetadata') or {}
            tin = um.get('promptTokenCount', 0)
            tout = um.get('candidatesTokenCount', 0)

            return MCPResponse(
                ok=True,
                content=parse_json(text) if req.json_mode else text,
                provider=self.name, model=self.MODEL,
                tokens_in=tin, tokens_out=tout,
                cost_usd=self.estimate_cost(tin, tout),
                latency_ms=int((time.time() - t0) * 1000))
        except requests.Timeout:
            return MCPResponse(ok=False, provider=self.name, error='timeout')
        except Exception as e:
            return MCPResponse(ok=False, provider=self.name, error=str(e)[:250])

    def _embed(self, req: MCPRequest) -> MCPResponse:
        t0 = time.time()
        try:
            r = requests.post(
                f'{self.BASE}/models/{self.EMBED_MODEL}:embedContent',
                params={'key': self.key}, timeout=req.timeout,
                json={'model': f'models/{self.EMBED_MODEL}',
                      'content': {'parts': [{'text': req.prompt}]}})
            r.raise_for_status()
            vec = r.json()['embedding']['values']
            return MCPResponse(ok=True, content=vec, provider=self.name,
                               model=self.EMBED_MODEL,
                               latency_ms=int((time.time() - t0) * 1000))
        except Exception as e:
            return MCPResponse(ok=False, provider=self.name, error=str(e)[:250])
```

✅ **Test:** `tests/test_provider_gemini.py`
```python
from apps.ai.mcp.base import MCPRequest
from apps.ai.mcp.providers.gemini import GeminiProvider


class FakeResp:
    status_code = 200

    def __init__(self, payload):
        self._p = payload

    def json(self):
        return self._p

    def raise_for_status(self):
        pass


def test_chat_ok(monkeypatch, settings):
    settings.AI_KEYS = {'GEMINI_API_KEY': 'AIza-test'}
    payload = {'candidates': [{'content': {'parts': [{'text': 'Salom!'}]}}],
               'usageMetadata': {'promptTokenCount': 20, 'candidatesTokenCount': 5}}
    monkeypatch.setattr('requests.post', lambda *a, **kw: FakeResp(payload))
    r = GeminiProvider().call(MCPRequest(task='chat', prompt='salom'))
    assert r.ok and r.content == 'Salom!' and r.tokens_in == 20


def test_no_candidates_is_error(monkeypatch, settings):
    settings.AI_KEYS = {'GEMINI_API_KEY': 'AIza-test'}
    monkeypatch.setattr('requests.post', lambda *a, **kw: FakeResp({'candidates': []}))
    r = GeminiProvider().call(MCPRequest(task='chat', prompt='x'))
    assert not r.ok and 'no_candidates' in r.error


def test_embedding_returns_vector(monkeypatch, settings):
    settings.AI_KEYS = {'GEMINI_API_KEY': 'k'}
    monkeypatch.setattr('requests.post',
                        lambda *a, **kw: FakeResp({'embedding': {'values': [0.1, 0.2]}}))
    r = GeminiProvider().call(MCPRequest(task='embedding', prompt='osh'))
    assert r.ok and r.content == [0.1, 0.2]
```

✅ **Tekshirish:** `pytest tests/test_provider_gemini.py -q` → 3 passed

---

## V-174 — Provayder #3: OpenAI

**Fayl:** `apps/ai/mcp/providers/openai_p.py`
```python
from apps.ai.mcp.openai_compat import OpenAICompatProvider


class OpenAIProvider(OpenAICompatProvider):
    """OpenAI gpt-4o-mini — ishonchli zaxira, vision qo'llaydi."""
    name = 'openai'
    supported_tasks = {'chat', 'translate', 'vision'}
    priority = {'chat': 30, 'translate': 30, 'vision': 20}
    price_in, price_out = 0.15, 0.60
    MODEL = 'gpt-4o-mini'
    BASE_URL = 'https://api.openai.com/v1'
    ENV_KEY = 'OPENAI_API_KEY'
    SUPPORTS_VISION = True
    SUPPORTS_JSON_MODE = True
```

✅ **Test:** `tests/test_provider_openai.py`
```python
from apps.ai.mcp.base import MCPRequest
from apps.ai.mcp.providers.openai_p import OpenAIProvider


class FakeResp:
    status_code = 200

    def __init__(self, payload, code=200):
        self._p, self.status_code = payload, code
        self.text = str(payload)

    def json(self):
        return self._p


OK = {'choices': [{'message': {'content': 'Javob'}}],
      'usage': {'prompt_tokens': 10, 'completion_tokens': 4}}


def test_chat_ok(monkeypatch, settings):
    settings.AI_KEYS = {'OPENAI_API_KEY': 'sk-x'}
    monkeypatch.setattr('requests.post', lambda *a, **kw: FakeResp(OK))
    r = OpenAIProvider().call(MCPRequest(task='chat', prompt='salom'))
    assert r.ok and r.content == 'Javob'


def test_http_error_captured(monkeypatch, settings):
    settings.AI_KEYS = {'OPENAI_API_KEY': 'sk-x'}
    monkeypatch.setattr('requests.post',
                        lambda *a, **kw: FakeResp({'error': 'rate'}, code=429))
    r = OpenAIProvider().call(MCPRequest(task='chat', prompt='x'))
    assert not r.ok and 'HTTP 429' in r.error


def test_vision_message_shape(monkeypatch, settings):
    settings.AI_KEYS = {'OPENAI_API_KEY': 'sk-x'}
    captured = {}

    def fake_post(url, **kw):
        captured.update(kw['json'])
        return FakeResp(OK)
    monkeypatch.setattr('requests.post', fake_post)
    OpenAIProvider().call(MCPRequest(task='vision', prompt='nima bu?',
                                     images=['https://x/y.jpg']))
    parts = captured['messages'][-1]['content']
    assert any(p['type'] == 'image_url' for p in parts)
```

✅ **Tekshirish:** `pytest tests/test_provider_openai.py -q` → 3 passed

---

## V-175 — Provayder #4: Groq (eng tez)

**Fayl:** `apps/ai/mcp/providers/groq.py`
```python
from apps.ai.mcp.openai_compat import OpenAICompatProvider


class GroqProvider(OpenAICompatProvider):
    """
    Groq — LPU tezligi (0,3 s). Real-time chatbot uchun juda mos.
    ⚡ Vision qo'llamaydi, JSON rejimi cheklangan.
    """
    name = 'groq'
    supported_tasks = {'chat'}
    priority = {'chat': 15}                # Gemini'dan keyin, Claude'dan oldin
    price_in, price_out = 0.59, 0.79
    MODEL = 'llama-3.3-70b-versatile'
    BASE_URL = 'https://api.groq.com/openai/v1'
    ENV_KEY = 'GROQ_API_KEY'
    SUPPORTS_VISION = False
    SUPPORTS_JSON_MODE = True
```

✅ **Test:** `tests/test_provider_groq.py`
```python
from apps.ai.mcp.base import MCPRequest
from apps.ai.mcp.providers.groq import GroqProvider


class FakeResp:
    status_code = 200
    text = ''

    def __init__(self, p):
        self._p = p

    def json(self):
        return self._p


def test_groq_only_chat():
    p = GroqProvider()
    assert p.supports('chat')
    assert not p.supports('vision')
    assert not p.supports('image_to_3d')


def test_images_ignored(monkeypatch, settings):
    """Vision yo'q — rasm yuborilmasligi kerak (API xato bermasin)."""
    settings.AI_KEYS = {'GROQ_API_KEY': 'gsk_x'}
    captured = {}

    def fake_post(url, **kw):
        captured.update(kw['json'])
        return FakeResp({'choices': [{'message': {'content': 'ok'}}],
                         'usage': {'prompt_tokens': 1, 'completion_tokens': 1}})
    monkeypatch.setattr('requests.post', fake_post)
    GroqProvider().call(MCPRequest(task='chat', prompt='salom',
                                   images=['https://x/y.jpg']))
    assert isinstance(captured['messages'][-1]['content'], str)


def test_priority_faster_than_openai():
    from apps.ai.mcp.providers.openai_p import OpenAIProvider
    assert GroqProvider().priority['chat'] < OpenAIProvider().priority['chat']
```

✅ **Tekshirish:** `pytest tests/test_provider_groq.py -q` → 3 passed

---

## V-176 — Provayder #5: DeepSeek (eng arzon)

**Fayl:** `apps/ai/mcp/providers/deepseek.py`
```python
from apps.ai.mcp.openai_compat import OpenAICompatProvider


class DeepSeekProvider(OpenAICompatProvider):
    """DeepSeek — eng arzon chat/tarjima. Katta hajmli ish uchun."""
    name = 'deepseek'
    supported_tasks = {'chat', 'translate'}
    priority = {'chat': 25, 'translate': 25}
    price_in, price_out = 0.14, 0.28
    MODEL = 'deepseek-chat'
    BASE_URL = 'https://api.deepseek.com/v1'
    ENV_KEY = 'DEEPSEEK_API_KEY'
    SUPPORTS_VISION = False
    SUPPORTS_JSON_MODE = True
```

✅ **Test:** `tests/test_provider_deepseek.py`
```python
from apps.ai.mcp.providers.deepseek import DeepSeekProvider
from apps.ai.mcp.providers.claude import ClaudeProvider


def test_cheapest_chat_provider():
    d = DeepSeekProvider()
    c = ClaudeProvider()
    assert d.price_in < c.price_in and d.price_out < c.price_out


def test_cost_estimate_precise():
    d = DeepSeekProvider()
    # 1M kirish + 1M chiqish = 0.14 + 0.28
    assert abs(d.estimate_cost(1_000_000, 1_000_000) - 0.42) < 1e-6


def test_supports_translate():
    assert DeepSeekProvider().supports('translate')
```

✅ **Tekshirish:** `pytest tests/test_provider_deepseek.py -q` → 3 passed

---

## V-177 — Provayder #6: Mistral

**Fayl:** `apps/ai/mcp/providers/mistral.py`
```python
from apps.ai.mcp.openai_compat import OpenAICompatProvider


class MistralProvider(OpenAICompatProvider):
    """
    Mistral Small — Yevropa provayderi (geografik mustaqillik).
    ⚡ response_format qo'llamaydi — JSON prompt bilan majburlanadi.
    """
    name = 'mistral'
    supported_tasks = {'chat', 'translate'}
    priority = {'chat': 40, 'translate': 40}
    price_in, price_out = 0.20, 0.60
    MODEL = 'mistral-small-latest'
    BASE_URL = 'https://api.mistral.ai/v1'
    ENV_KEY = 'MISTRAL_API_KEY'
    SUPPORTS_VISION = False
    SUPPORTS_JSON_MODE = False

    def _build_messages(self, req):
        msgs = super()._build_messages(req)
        if req.json_mode:
            # JSON rejimi yo'q — system ko'rsatmasi bilan majburlaymiz
            if msgs and msgs[0]['role'] == 'system':
                msgs[0]['content'] += '\n\nFaqat yaroqli JSON qaytar.'
            else:
                msgs.insert(0, {'role': 'system',
                                'content': 'Faqat yaroqli JSON qaytar.'})
        return msgs
```

✅ **Test:** `tests/test_provider_mistral.py`
```python
from apps.ai.mcp.base import MCPRequest
from apps.ai.mcp.providers.mistral import MistralProvider


class FakeResp:
    status_code = 200
    text = ''

    def __init__(self, p):
        self._p = p

    def json(self):
        return self._p


def test_json_mode_uses_prompt_not_response_format(monkeypatch, settings):
    settings.AI_KEYS = {'MISTRAL_API_KEY': 'm-x'}
    captured = {}

    def fake_post(url, **kw):
        captured.update(kw['json'])
        return FakeResp({'choices': [{'message': {'content': '{"a":1}'}}],
                         'usage': {'prompt_tokens': 5, 'completion_tokens': 3}})
    monkeypatch.setattr('requests.post', fake_post)
    r = MistralProvider().call(MCPRequest(task='translate', prompt='Osh',
                                          json_mode=True))
    assert 'response_format' not in captured
    assert 'JSON' in captured['messages'][0]['content']
    assert r.ok and r.content == {'a': 1}


def test_is_fallback_priority():
    from apps.ai.mcp.providers.gemini import GeminiProvider
    assert MistralProvider().priority['chat'] > GeminiProvider().priority['chat']
```

✅ **Tekshirish:** `pytest tests/test_provider_mistral.py -q` → 2 passed

---

## V-178 — Provayder #7: Meshy (image → 3D)

**Fayl:** `apps/ai/mcp/providers/meshy.py`
```python
import time
import logging

import requests
from django.conf import settings

from apps.ai.mcp.base import MCPProvider, MCPRequest, MCPResponse

log = logging.getLogger('ai.mcp.meshy')


class MeshyProvider(MCPProvider):
    """
    Meshy — rasm → 3D model (GLB). Arzon, sifat yetarli.
    ⚡ Uzoq ish (3-6 daqiqa) — FAQAT worker ichida chaqiriladi, veb-so'rovda EMAS.
    """
    name = 'meshy'
    supported_tasks = {'image_to_3d'}
    priority = {'image_to_3d': 10}          # eng birinchi (arzon)
    price_in = price_out = 0.0
    MODEL = 'meshy-4'
    BASE = 'https://api.meshy.ai/openapi/v1'
    COST_PER_MODEL = 0.50
    POLL_SEC = 10
    MAX_WAIT = 600                           # 10 daqiqa

    def __init__(self):
        self.key = settings.AI_KEYS.get('MESHY_API_KEY', '')

    def is_configured(self) -> bool:
        return bool(self.key)

    def estimate_cost(self, tin=0, tout=0) -> float:
        return self.COST_PER_MODEL

    def call(self, req: MCPRequest) -> MCPResponse:
        t0 = time.time()
        if not req.images:
            return MCPResponse(ok=False, provider=self.name, error='no_image')
        h = {'Authorization': f'Bearer {self.key}'}
        try:
            # 1. Vazifa yaratish
            r = requests.post(f'{self.BASE}/image-to-3d', headers=h, timeout=30,
                              json={'image_url': req.images[0],
                                    'enable_pbr': True,
                                    'should_remesh': True,
                                    'target_polycount': req.extra.get('polycount', 40000),
                                    'topology': 'triangle'})
            if r.status_code >= 400:
                return MCPResponse(ok=False, provider=self.name,
                                   error=f'HTTP {r.status_code}: {r.text[:200]}')
            task_id = r.json()['result']
            log.info(f'[meshy] task={task_id} boshlandi')

            # 2. Poll
            deadline = time.time() + min(req.timeout, self.MAX_WAIT)
            while time.time() < deadline:
                time.sleep(self.POLL_SEC)
                s = requests.get(f'{self.BASE}/image-to-3d/{task_id}',
                                 headers=h, timeout=20).json()
                st = s.get('status')
                if st == 'SUCCEEDED':
                    urls = s.get('model_urls') or {}
                    return MCPResponse(
                        ok=True, provider=self.name, model=self.MODEL,
                        content={'glb_url': urls.get('glb'),
                                 'usdz_url': urls.get('usdz'),
                                 'thumbnail': s.get('thumbnail_url'),
                                 'task_id': task_id},
                        cost_usd=self.COST_PER_MODEL,
                        latency_ms=int((time.time() - t0) * 1000))
                if st in ('FAILED', 'EXPIRED', 'CANCELED'):
                    err = (s.get('task_error') or {}).get('message', st)
                    return MCPResponse(ok=False, provider=self.name, error=str(err)[:200])
            return MCPResponse(ok=False, provider=self.name, error='timeout',
                               latency_ms=int((time.time() - t0) * 1000))
        except Exception as e:
            return MCPResponse(ok=False, provider=self.name, error=str(e)[:250])

    def health_check(self) -> bool:
        """⚡ 3D provayderda ping chaqirish qimmat — faqat kalitni tekshiramiz."""
        if not self.key:
            return False
        try:
            r = requests.get(f'{self.BASE}/image-to-3d',
                             headers={'Authorization': f'Bearer {self.key}'},
                             params={'page_size': 1}, timeout=8)
            return r.status_code < 500
        except Exception:
            return False
```

✅ **Test:** `tests/test_provider_meshy.py`
```python
from apps.ai.mcp.base import MCPRequest
from apps.ai.mcp.providers.meshy import MeshyProvider


class R:
    def __init__(self, payload, code=200):
        self._p, self.status_code = payload, code
        self.text = str(payload)

    def json(self):
        return self._p


def test_success_returns_glb(monkeypatch, settings):
    settings.AI_KEYS = {'MESHY_API_KEY': 'msy_x'}
    p = MeshyProvider()
    p.POLL_SEC = 0
    monkeypatch.setattr('requests.post', lambda *a, **kw: R({'result': 'T1'}))
    monkeypatch.setattr('requests.get', lambda *a, **kw: R({
        'status': 'SUCCEEDED',
        'model_urls': {'glb': 'https://cdn/x.glb', 'usdz': 'https://cdn/x.usdz'},
        'thumbnail_url': 'https://cdn/t.png'}))
    monkeypatch.setattr('time.sleep', lambda s: None)
    r = p.call(MCPRequest(task='image_to_3d', images=['https://x/photo.jpg']))
    assert r.ok
    assert r.content['glb_url'].endswith('.glb')
    assert r.cost_usd == 0.50


def test_failed_task(monkeypatch, settings):
    settings.AI_KEYS = {'MESHY_API_KEY': 'msy_x'}
    p = MeshyProvider(); p.POLL_SEC = 0
    monkeypatch.setattr('requests.post', lambda *a, **kw: R({'result': 'T2'}))
    monkeypatch.setattr('requests.get', lambda *a, **kw: R({
        'status': 'FAILED', 'task_error': {'message': 'bad image'}}))
    monkeypatch.setattr('time.sleep', lambda s: None)
    r = p.call(MCPRequest(task='image_to_3d', images=['https://x/p.jpg']))
    assert not r.ok and 'bad image' in r.error


def test_no_image_rejected(settings):
    settings.AI_KEYS = {'MESHY_API_KEY': 'k'}
    r = MeshyProvider().call(MCPRequest(task='image_to_3d'))
    assert not r.ok and r.error == 'no_image'
```

✅ **Tekshirish:** `pytest tests/test_provider_meshy.py -q` → 3 passed

---

## V-179 — Provayder #8: Tripo (3D zaxira)

**Fayl:** `apps/ai/mcp/providers/tripo.py`
```python
import time
import logging

import requests
from django.conf import settings

from apps.ai.mcp.base import MCPProvider, MCPRequest, MCPResponse

log = logging.getLogger('ai.mcp.tripo')


class TripoProvider(MCPProvider):
    """
    Tripo AI — 3D zaxira provayder (Meshy yiqilsa).
    Sifati yaxshi, lekin qimmatroq va sekinroq.
    """
    name = 'tripo'
    supported_tasks = {'image_to_3d'}
    priority = {'image_to_3d': 20}           # Meshy'dan keyin
    price_in = price_out = 0.0
    MODEL = 'tripo-v2'
    BASE = 'https://api.tripo3d.ai/v2/openapi'
    COST_PER_MODEL = 0.80
    POLL_SEC = 12
    MAX_WAIT = 900

    def __init__(self):
        self.key = settings.AI_KEYS.get('TRIPO_API_KEY', '')

    def is_configured(self) -> bool:
        return bool(self.key)

    def estimate_cost(self, tin=0, tout=0) -> float:
        return self.COST_PER_MODEL

    def call(self, req: MCPRequest) -> MCPResponse:
        t0 = time.time()
        if not req.images:
            return MCPResponse(ok=False, provider=self.name, error='no_image')
        h = {'Authorization': f'Bearer {self.key}',
             'Content-Type': 'application/json'}
        try:
            r = requests.post(f'{self.BASE}/task', headers=h, timeout=30, json={
                'type': 'image_to_model',
                'file': {'type': 'jpeg', 'url': req.images[0]},
                'model_version': 'v2.0-20240919',
                'texture': True,
                'pbr': True,
            })
            if r.status_code >= 400:
                return MCPResponse(ok=False, provider=self.name,
                                   error=f'HTTP {r.status_code}: {r.text[:200]}')
            task_id = r.json()['data']['task_id']
            log.info(f'[tripo] task={task_id} boshlandi')

            deadline = time.time() + min(req.timeout, self.MAX_WAIT)
            while time.time() < deadline:
                time.sleep(self.POLL_SEC)
                s = requests.get(f'{self.BASE}/task/{task_id}',
                                 headers=h, timeout=20).json().get('data', {})
                st = s.get('status')
                if st == 'success':
                    out = s.get('output') or {}
                    return MCPResponse(
                        ok=True, provider=self.name, model=self.MODEL,
                        content={'glb_url': out.get('pbr_model') or out.get('model'),
                                 'usdz_url': None,
                                 'thumbnail': out.get('rendered_image'),
                                 'task_id': task_id},
                        cost_usd=self.COST_PER_MODEL,
                        latency_ms=int((time.time() - t0) * 1000))
                if st in ('failed', 'banned', 'expired', 'cancelled'):
                    return MCPResponse(ok=False, provider=self.name,
                                       error=f'task_{st}')
            return MCPResponse(ok=False, provider=self.name, error='timeout')
        except Exception as e:
            return MCPResponse(ok=False, provider=self.name, error=str(e)[:250])

    def health_check(self) -> bool:
        return bool(self.key)
```

**Fayl:** `apps/ai/mcp/registry.py`
```python
"""
⚡ Barcha provayderlar shu yerda ro'yxatga olinadi.
Yangi provayder qo'shish: 1 ta fayl + shu ro'yxatga 1 qator. Boshqa hech narsa.
"""
from apps.ai.mcp.providers.claude import ClaudeProvider
from apps.ai.mcp.providers.gemini import GeminiProvider
from apps.ai.mcp.providers.openai_p import OpenAIProvider
from apps.ai.mcp.providers.groq import GroqProvider
from apps.ai.mcp.providers.deepseek import DeepSeekProvider
from apps.ai.mcp.providers.mistral import MistralProvider
from apps.ai.mcp.providers.meshy import MeshyProvider
from apps.ai.mcp.providers.tripo import TripoProvider

ALL_PROVIDERS = [
    ClaudeProvider,     # 1 — sifat (tarjima #1)
    GeminiProvider,     # 2 — arzon (chat #1)
    OpenAIProvider,     # 3 — zaxira, vision
    GroqProvider,       # 4 — eng tez
    DeepSeekProvider,   # 5 — eng arzon
    MistralProvider,    # 6 — Yevropa, mustaqillik
    MeshyProvider,      # 7 — 3D #1
    TripoProvider,      # 8 — 3D zaxira
]
```

✅ **Test:** `tests/test_registry.py`
```python
from apps.ai.mcp.registry import ALL_PROVIDERS
from apps.ai.mcp.base import TASKS


def test_at_least_six_providers():
    """⚡ TZ talabi: kamida 6 ta provayder."""
    assert len(ALL_PROVIDERS) >= 6


def test_names_unique():
    names = [p.name for p in ALL_PROVIDERS]
    assert len(names) == len(set(names))


def test_all_tasks_are_known():
    for cls in ALL_PROVIDERS:
        assert cls.supported_tasks <= TASKS, cls.name
        for task in cls.supported_tasks:
            assert task in cls.priority, f'{cls.name}: {task} uchun priority yo\'q'


def test_every_task_has_provider():
    covered = set()
    for p in ALL_PROVIDERS:
        covered |= p.supported_tasks
    for must in ('chat', 'translate', 'vision', 'image_to_3d'):
        assert must in covered


def test_chat_has_fallback():
    """Bitta provayder yiqilsa boshqasi bo'lishi shart."""
    chat = [p for p in ALL_PROVIDERS if 'chat' in p.supported_tasks]
    assert len(chat) >= 3


def test_3d_has_fallback():
    d3 = [p for p in ALL_PROVIDERS if 'image_to_3d' in p.supported_tasks]
    assert len(d3) >= 2
```

✅ **Tekshirish:** `pytest tests/test_provider_tripo.py tests/test_registry.py -q`

---

## V-180 — ⚡ MCPRouter (prioritet + fallback + kesh + byudjet)

**Fayl:** `apps/ai/mcp/router.py`
```python
import hashlib
import logging
import time

from django.core.cache import cache
from django.conf import settings

from core.resilience import CircuitBreaker
from apps.ai.mcp.base import MCPRequest, MCPResponse
from apps.ai.mcp.registry import ALL_PROVIDERS

log = logging.getLogger('ai.mcp')

CACHEABLE_TASKS = {'translate', 'chat', 'embedding'}
CACHE_TTL = getattr(settings, 'AI_CACHE_TTL', 3600)


class MCPRouter:
    """
    ⚡ MCP yadrosi.

    run() ketma-ketligi:
      1. Kesh              — bir xil so'rov qayta yuborilmaydi
      2. Byudjet           — kunlik $ limiti
      3. Nomzodlar         — vazifani qo'llaydigan + sozlangan, prioritet bo'yicha
      4. Zanjir            — circuit ochiq bo'lsa o'tkazib yuboriladi
      5. Xarajat yozuvi    — AIUsage
      6. Keshga saqlash
    """

    def __init__(self):
        self.providers = [cls() for cls in ALL_PROVIDERS]
        self.breakers = {
            p.name: CircuitBreaker(f'ai.{p.name}', fail_threshold=3, timeout=120)
            for p in self.providers}

    # ---------------- Asosiy metod ----------------
    def run(self, req: MCPRequest, restaurant_id=None, use_cache=True) -> MCPResponse:
        t0 = time.time()

        # 1. Kesh
        ck = self._cache_key(req)
        if use_cache and req.task in CACHEABLE_TASKS:
            cached = cache.get(ck)
            if cached:
                log.debug(f'[MCP] kesh: {req.task}')
                resp = MCPResponse(**cached)
                resp.cached = True
                resp.cost_usd = 0.0
                return resp

        # 2. Byudjet
        if restaurant_id and not self._check_budget(restaurant_id):
            return MCPResponse(ok=False, error='AI_BUDGET_EXCEEDED')

        # 3. Nomzodlar
        candidates = self._candidates(req.task)
        if not candidates:
            log.error(f'[MCP] {req.task} uchun provayder yo\'q')
            return MCPResponse(ok=False, error=f'NO_PROVIDER_FOR_{req.task}')

        # 4. Zanjir
        errors = []
        for p in candidates:
            br = self.breakers[p.name]
            if br.is_open():
                errors.append(f'{p.name}: circuit_open')
                log.info(f'[MCP] {p.name} chetlab o\'tildi (circuit OPEN)')
                continue

            log.info(f'[MCP] {req.task} → {p.name}')
            try:
                resp = p.call(req)
            except Exception as e:                # provayder xato otsa ham yiqilmaymiz
                resp = MCPResponse(ok=False, provider=p.name, error=str(e)[:200])

            if resp.ok:
                br.on_success()
                self._record(resp, restaurant_id, req.task)
                if use_cache and req.task in CACHEABLE_TASKS:
                    cache.set(ck, resp.to_dict(), CACHE_TTL)
                return resp

            br.on_failure()
            errors.append(f'{p.name}: {resp.error}')
            log.warning(f'[MCP] {p.name} xato: {resp.error} → keyingisi')

        log.error(f'[MCP] ⛔ BARCHA provayder yiqildi ({req.task}): {errors}')
        return MCPResponse(ok=False, error='ALL_PROVIDERS_FAILED',
                           latency_ms=int((time.time() - t0) * 1000),
                           raw={'errors': errors})

    # ---------------- Yordamchilar ----------------
    def _candidates(self, task: str) -> list:
        ps = [p for p in self.providers
              if p.is_configured() and p.supports(task)]
        return sorted(ps, key=lambda p: p.priority.get(task, 999))

    def _cache_key(self, req: MCPRequest) -> str:
        raw = (f'{req.task}|{req.system}|{req.prompt}|{req.temperature}|'
               f'{req.json_mode}|{req.messages}|{req.images}')
        return f'mcp:{hashlib.sha256(raw.encode()).hexdigest()[:32]}'

    def _check_budget(self, restaurant_id) -> bool:
        from django.db.models import Sum
        from django.utils import timezone
        from apps.ai.models import AIUsage

        today = timezone.localdate()
        ck = f'ai:spent:{restaurant_id}:{today}'
        spent = cache.get(ck)
        if spent is None:
            spent = float(AIUsage.objects.filter(
                restaurant_id=restaurant_id, created_at__date=today
            ).aggregate(s=Sum('cost_usd'))['s'] or 0)
            cache.set(ck, spent, 60)

        limit = self._restaurant_limit(restaurant_id)
        if spent >= limit:
            log.warning(f'[MCP] ⛔ Byudjet tugadi: rest={restaurant_id} '
                        f'${spent:.3f} / ${limit}')
            return False
        return True

    @staticmethod
    def _restaurant_limit(restaurant_id) -> float:
        """Tarifga bog'liq kunlik limit (FAZA 8, V-166)."""
        from apps.tenants.models import Restaurant
        from apps.billing.plans import plan_limits
        ck = f'ai:limit:{restaurant_id}'
        v = cache.get(ck)
        if v is None:
            plan = (Restaurant.objects.filter(id=restaurant_id)
                    .values_list('plan', flat=True).first() or 'start')
            v = float(plan_limits(plan).get(
                'ai_daily_usd', settings.AI_DAILY_LIMIT_PER_RESTAURANT))
            cache.set(ck, v, 300)
        return v

    def _record(self, resp: MCPResponse, restaurant_id, task: str):
        from apps.ai.models import AIUsage
        try:
            AIUsage.objects.create(
                restaurant_id=restaurant_id, provider=resp.provider,
                model=resp.model, task=task,
                tokens_in=resp.tokens_in, tokens_out=resp.tokens_out,
                cost_usd=resp.cost_usd, latency_ms=resp.latency_ms, ok=True)
            if restaurant_id and resp.cost_usd:
                from django.utils import timezone
                ck = f'ai:spent:{restaurant_id}:{timezone.localdate()}'
                cur = cache.get(ck)
                if cur is not None:
                    cache.set(ck, float(cur) + resp.cost_usd, 60)
        except Exception as e:
            log.warning(f'[MCP] AIUsage yozilmadi: {e}')

    # ---------------- Diagnostika ----------------
    def status(self) -> list:
        """P-05 sahifasi uchun: har provayder holati."""
        out = []
        for p in self.providers:
            br = self.breakers[p.name]
            out.append({
                'name': p.name, 'model': p.MODEL,
                'configured': p.is_configured(),
                'tasks': sorted(p.supported_tasks),
                'circuit': 'open' if br.is_open() else 'closed',
                'price_in': p.price_in, 'price_out': p.price_out,
            })
        return out


mcp = MCPRouter()      # ⚡ singleton — butun ilova shuni ishlatadi
```

✅ **Test:** `tests/test_mcp_router.py`
```python
import pytest

from apps.ai.mcp.base import MCPRequest, MCPResponse
from apps.ai.mcp.router import MCPRouter


@pytest.fixture
def router(settings, monkeypatch):
    settings.AI_KEYS = {k: 'test-key' for k in (
        'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY', 'GROQ_API_KEY',
        'DEEPSEEK_API_KEY', 'MISTRAL_API_KEY', 'MESHY_API_KEY', 'TRIPO_API_KEY')}
    r = MCPRouter()
    for br in r.breakers.values():
        br._set('state', 'closed')
        br._set('failures', 0)
    return r


def _stub(router, name, resp):
    p = next(p for p in router.providers if p.name == name)
    p.call = lambda req: resp
    return p


def test_priority_order_chat(router):
    names = [p.name for p in router._candidates('chat')]
    assert names[0] == 'gemini'          # eng arzon — birinchi
    assert names.index('groq') < names.index('openai')


def test_fallback_chain(router):
    """⚡ Birinchi 2 provayder yiqilsa — 3-chisi ishlaydi (TZ §8)."""
    _stub(router, 'gemini', MCPResponse(ok=False, provider='gemini', error='500'))
    _stub(router, 'groq', MCPResponse(ok=False, provider='groq', error='timeout'))
    _stub(router, 'claude', MCPResponse(ok=True, content='javob',
                                        provider='claude', model='m'))
    r = router.run(MCPRequest(task='chat', prompt='salom'), use_cache=False)
    assert r.ok and r.provider == 'claude'


def test_all_providers_down(router):
    """Hammasi yiqilsa — chiroyli xato, crash EMAS."""
    for p in router.providers:
        p.call = lambda req: MCPResponse(ok=False, error='down')
    r = router.run(MCPRequest(task='chat', prompt='salom'), use_cache=False)
    assert not r.ok
    assert r.error == 'ALL_PROVIDERS_FAILED'
    assert len(r.raw['errors']) >= 3


def test_provider_exception_does_not_crash(router):
    def boom(req):
        raise RuntimeError('yiqildi')
    next(p for p in router.providers if p.name == 'gemini').call = boom
    _stub(router, 'groq', MCPResponse(ok=True, content='ok', provider='groq'))
    r = router.run(MCPRequest(task='chat', prompt='x'), use_cache=False)
    assert r.ok and r.provider == 'groq'


def test_circuit_open_skips_provider(router):
    router.breakers['gemini']._set('state', 'open')
    router.breakers['gemini']._set('opened_at', 9e12)   # kelajak — ochiq qoladi
    _stub(router, 'groq', MCPResponse(ok=True, content='ok', provider='groq'))
    r = router.run(MCPRequest(task='chat', prompt='x'), use_cache=False)
    assert r.provider == 'groq'


def test_circuit_opens_after_3_failures(router):
    for _ in range(3):
        router.breakers['gemini'].on_failure()
    assert router.breakers['gemini'].is_open()


def test_cache_hit_costs_nothing(router):
    calls = {'n': 0}

    def counted(req):
        calls['n'] += 1
        return MCPResponse(ok=True, content='javob', provider='gemini',
                           model='m', cost_usd=0.001)
    next(p for p in router.providers if p.name == 'gemini').call = counted

    req = MCPRequest(task='translate', prompt='Osh')
    r1 = router.run(req)
    r2 = router.run(MCPRequest(task='translate', prompt='Osh'))
    assert calls['n'] == 1
    assert r2.cached and r2.cost_usd == 0.0
    assert r1.content == r2.content


def test_no_provider_for_task(router, monkeypatch):
    for p in router.providers:
        monkeypatch.setattr(p, 'is_configured', lambda: False)
    r = router.run(MCPRequest(task='chat', prompt='x'), use_cache=False)
    assert r.error == 'NO_PROVIDER_FOR_chat'


def test_3d_uses_meshy_first(router):
    assert [p.name for p in router._candidates('image_to_3d')] == ['meshy', 'tripo']


def test_status_lists_all(router):
    st = router.status()
    assert len(st) == 8
    assert all('circuit' in s for s in st)
```

✅ **Tekshirish:** `pytest tests/test_mcp_router.py -q` → 10 passed

---
## V-181 — Circuit breaker integratsiyasi + salomatlik monitoringi

Router allaqachon `CircuitBreaker` ishlatadi (V-180). Bu vazifada:
**avtomatik tiklanish**, **prioritet pasaytirish** va **P-05 sahifasi uchun metrikalar**.

**Fayl:** `apps/ai/health.py`
```python
"""
⚡ AI provayderlar salomatligi.

Circuit breaker 3 xatodan keyin ochiladi (120 s). Bu modul:
  - HALF_OPEN holatidagi provayderni yengil so'rov bilan sinaydi
  - Xato darajasi yuqori provayder prioritetini VAQTINCHA pasaytiradi
  - P-05 (super-admin) sahifasi uchun statistika beradi
"""
import logging
from datetime import timedelta

from django.core.cache import cache
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone

log = logging.getLogger('ai.health')

PENALTY_KEY = 'ai:penalty:{name}'
PENALTY_TTL = 900          # 15 daqiqa
ERROR_RATE_THRESHOLD = 0.15


def get_penalty(name: str) -> int:
    """Prioritetga qo'shiladigan jarima (katta = kechroq chaqiriladi)."""
    return int(cache.get(PENALTY_KEY.format(name=name)) or 0)


def set_penalty(name: str, value: int):
    cache.set(PENALTY_KEY.format(name=name), value, PENALTY_TTL)
    log.info(f'[health] {name} prioritet jarimasi = +{value}')


def clear_penalty(name: str):
    cache.delete(PENALTY_KEY.format(name=name))


def provider_stats(hours=24, restaurant_id=None) -> list:
    """Har provayder bo'yicha: chaqiruv, xarajat, o'rtacha vaqt, xato %."""
    from apps.ai.models import AIUsage

    since = timezone.now() - timedelta(hours=hours)
    qs = AIUsage.objects.filter(created_at__gte=since)
    if restaurant_id:
        qs = qs.filter(restaurant_id=restaurant_id)

    rows = (qs.values('provider')
              .annotate(calls=Count('id'),
                        errors=Count('id', filter=Q(ok=False)),
                        cost=Sum('cost_usd'),
                        avg_latency=Avg('latency_ms'),
                        tokens_in=Sum('tokens_in'),
                        tokens_out=Sum('tokens_out'))
              .order_by('-cost'))

    out = []
    for r in rows:
        calls = r['calls'] or 1
        err_rate = (r['errors'] or 0) / calls
        out.append({
            'provider': r['provider'],
            'calls': r['calls'],
            'errors': r['errors'],
            'error_rate': round(err_rate * 100, 1),
            'cost_usd': round(float(r['cost'] or 0), 4),
            'avg_latency_ms': int(r['avg_latency'] or 0),
            'tokens_in': r['tokens_in'] or 0,
            'tokens_out': r['tokens_out'] or 0,
            'penalty': get_penalty(r['provider']),
            'health': ('🔴' if err_rate > 0.30 else
                       '🟡' if err_rate > ERROR_RATE_THRESHOLD else '🟢'),
        })
    return out


def rebalance_priorities() -> dict:
    """
    ⚡ Cron (har 15 daqiqa): xato darajasi yuqori provayderga jarima qo'yadi,
    tuzalganidan keyin jarimani olib tashlaydi.
    """
    result = {}
    for s in provider_stats(hours=2):
        name, rate = s['provider'], s['error_rate'] / 100
        if s['calls'] < 10:
            continue                      # kam ma'lumot — qaror qilmaymiz
        if rate > 0.30:
            set_penalty(name, 100); result[name] = 100
        elif rate > ERROR_RATE_THRESHOLD:
            set_penalty(name, 30); result[name] = 30
        elif get_penalty(name):
            clear_penalty(name); result[name] = 0
    return result


def probe_half_open() -> dict:
    """
    HALF_OPEN holatidagi provayderni yengil so'rov bilan sinaydi.
    Cron: har 2 daqiqa.
    """
    from apps.ai.mcp import mcp

    out = {}
    for p in mcp.providers:
        br = mcp.breakers[p.name]
        state = br._get('state', 'closed')
        if state != 'half_open' or not p.is_configured():
            continue
        ok = p.health_check()
        (br.on_success if ok else br.on_failure)()
        out[p.name] = 'ok' if ok else 'fail'
        log.info(f'[health] probe {p.name}: {"✅" if ok else "⛔"}')
    return out
```

**Router'ga jarima qo'shiladi** — `apps/ai/mcp/router.py` dagi `_candidates`:
```python
    def _candidates(self, task: str) -> list:
        from apps.ai.health import get_penalty
        ps = [p for p in self.providers
              if p.is_configured() and p.supports(task)]
        # ⚡ Jarima prioritetga qo'shiladi — muammoli provayder oxiriga suriladi
        return sorted(ps, key=lambda p: p.priority.get(task, 999) + get_penalty(p.name))
```

**Fayl:** `apps/ai/management/commands/ai_health.py`
```python
from django.core.management.base import BaseCommand

from apps.ai.health import rebalance_priorities, probe_half_open


class Command(BaseCommand):
    help = 'AI provayderlar salomatligini tekshiradi va prioritetni qayta hisoblaydi'

    def add_arguments(self, parser):
        parser.add_argument('--probe-only', action='store_true')

    def handle(self, *args, **opts):
        probed = probe_half_open()
        if probed:
            self.stdout.write(f'Sinov: {probed}')
        if not opts['probe_only']:
            changed = rebalance_priorities()
            if changed:
                self.stdout.write(self.style.WARNING(f'Prioritet o\'zgardi: {changed}'))
        self.stdout.write(self.style.SUCCESS('AI health tekshirildi'))
```

**Cron** (`deploy/cron.d/armenu`):
```
*/2  * * * * armenu cd /srv/armenu && venv/bin/python manage.py ai_health --probe-only >> /var/log/armenu/ai.log 2>&1
*/15 * * * * armenu cd /srv/armenu && venv/bin/python manage.py ai_health >> /var/log/armenu/ai.log 2>&1
```

**API — `apps/ai/views_health.py`:**
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsRestaurantAdmin
from apps.ai.health import provider_stats


class AIHealthView(APIView):
    """GET /api/v1/admin/ai/health/?hours=24"""
    permission_classes = [IsAuthenticated, IsRestaurantAdmin]

    def get(self, request):
        from apps.ai.mcp import mcp
        hours = min(int(request.query_params.get('hours', 24)), 720)
        return Response({
            'providers': mcp.status(),
            'stats': provider_stats(hours=hours,
                                    restaurant_id=request.restaurant_id),
        })
```

✅ **Test:** `tests/test_ai_health.py`
```python
from datetime import timedelta

from django.utils import timezone

from apps.ai.health import (provider_stats, rebalance_priorities,
                            get_penalty, clear_penalty, probe_half_open)


def _usage(restaurant, provider, ok, n, cost=0.001):
    from apps.ai.models import AIUsage
    for _ in range(n):
        AIUsage.objects.create(restaurant=restaurant, provider=provider,
                               model='m', task='chat', ok=ok,
                               cost_usd=cost, latency_ms=500)


def test_error_rate_computed(db, restaurant):
    _usage(restaurant, 'gemini', True, 90)
    _usage(restaurant, 'gemini', False, 10)
    s = next(x for x in provider_stats() if x['provider'] == 'gemini')
    assert s['calls'] == 100 and s['error_rate'] == 10.0
    assert s['health'] == '🟢'


def test_bad_provider_penalised(db, restaurant):
    clear_penalty('tripo')
    _usage(restaurant, 'tripo', True, 5)
    _usage(restaurant, 'tripo', False, 15)      # 75% xato
    rebalance_priorities()
    assert get_penalty('tripo') == 100


def test_penalty_cleared_when_healthy(db, restaurant):
    from apps.ai.health import set_penalty
    set_penalty('groq', 30)
    _usage(restaurant, 'groq', True, 50)
    rebalance_priorities()
    assert get_penalty('groq') == 0


def test_penalty_changes_candidate_order(db, settings):
    from apps.ai.health import set_penalty, clear_penalty
    from apps.ai.mcp.router import MCPRouter
    settings.AI_KEYS = {k: 'x' for k in (
        'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY', 'GROQ_API_KEY',
        'DEEPSEEK_API_KEY', 'MISTRAL_API_KEY', 'MESHY_API_KEY', 'TRIPO_API_KEY')}
    r = MCPRouter()
    clear_penalty('gemini')
    assert r._candidates('chat')[0].name == 'gemini'
    set_penalty('gemini', 100)
    assert r._candidates('chat')[0].name != 'gemini'
    clear_penalty('gemini')


def test_probe_only_touches_half_open(db, settings, monkeypatch):
    from apps.ai.mcp import mcp
    for br in mcp.breakers.values():
        br._set('state', 'closed')
    mcp.breakers['groq']._set('state', 'half_open')
    monkeypatch.setattr(
        next(p for p in mcp.providers if p.name == 'groq'),
        'health_check', lambda: True)
    monkeypatch.setattr(
        next(p for p in mcp.providers if p.name == 'groq'),
        'is_configured', lambda: True)
    out = probe_half_open()
    assert out == {'groq': 'ok'}
```

✅ **Tekshirish:**
```bash
python manage.py ai_health
# "AI health tekshirildi"
pytest tests/test_ai_health.py -q     # 5 passed
```

---

## V-182 — `AIUsage` modeli va xarajat kuzatuvi

**Fayl:** `apps/ai/models.py`
```python
from django.db import models

from core.models import TimestampedModel


class AIUsage(TimestampedModel):
    """
    ⚡ Har bir AI chaqiruvining yozuvi — byudjet nazorati va P-05 sahifasi uchun.
    restaurant NULL bo'lishi mumkin (platforma darajasidagi chaqiruvlar).
    """
    restaurant = models.ForeignKey('tenants.Restaurant', on_delete=models.CASCADE,
                                   null=True, blank=True, db_index=True)
    provider  = models.CharField(max_length=30, db_index=True)
    model     = models.CharField(max_length=80, blank=True)
    task      = models.CharField(max_length=30, db_index=True)
    tokens_in  = models.IntegerField(default=0)
    tokens_out = models.IntegerField(default=0)
    cost_usd   = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    latency_ms = models.IntegerField(default=0)
    ok         = models.BooleanField(default=True, db_index=True)
    error      = models.CharField(max_length=250, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['restaurant', 'created_at']),
            models.Index(fields=['provider', 'created_at']),
            models.Index(fields=['task', 'created_at']),
        ]

    def __str__(self):
        return f'{self.provider}/{self.task} ${self.cost_usd}'


class ChatSession(TimestampedModel):
    """Mijoz chatbot suhbati (M-13)."""
    restaurant = models.ForeignKey('tenants.Restaurant', on_delete=models.CASCADE,
                                   db_index=True)
    guest_session = models.CharField(max_length=64, db_index=True)
    lang = models.CharField(max_length=2, default='uz')
    table = models.ForeignKey('tables.Table', on_delete=models.SET_NULL,
                              null=True, blank=True)
    messages_count = models.IntegerField(default=0)

    class Meta:
        indexes = [models.Index(fields=['restaurant', 'guest_session'])]


class ChatMessage(TimestampedModel):
    ROLE = [('user', 'Mijoz'), ('assistant', 'AI')]
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE,
                                related_name='messages')
    role = models.CharField(max_length=12, choices=ROLE)
    text = models.TextField()
    provider = models.CharField(max_length=30, blank=True)
    buttons = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['created_at']
```

**Xarajat servisi** — `apps/ai/services/cost.py`:
```python
from datetime import timedelta

from django.db.models import Sum, Count
from django.utils import timezone

from apps.ai.models import AIUsage


def daily_spend(restaurant_id, day=None) -> float:
    day = day or timezone.localdate()
    return float(AIUsage.objects.filter(
        restaurant_id=restaurant_id, created_at__date=day
    ).aggregate(s=Sum('cost_usd'))['s'] or 0)


def monthly_spend(restaurant_id=None, month_start=None) -> dict:
    today = timezone.localdate()
    start = month_start or today.replace(day=1)
    qs = AIUsage.objects.filter(created_at__date__gte=start)
    if restaurant_id:
        qs = qs.filter(restaurant_id=restaurant_id)
    agg = qs.aggregate(total=Sum('cost_usd'), calls=Count('id'))
    by_task = list(qs.values('task').annotate(
        cost=Sum('cost_usd'), calls=Count('id')).order_by('-cost'))
    return {
        'start': start,
        'total_usd': round(float(agg['total'] or 0), 4),
        'calls': agg['calls'] or 0,
        'by_task': [{'task': t['task'], 'cost_usd': round(float(t['cost'] or 0), 4),
                     'calls': t['calls']} for t in by_task],
    }


def budget_state(restaurant_id) -> dict:
    """Kunlik byudjet holati — chatbot UI'da ogohlantirish uchun."""
    from apps.ai.mcp.router import MCPRouter
    limit = MCPRouter._restaurant_limit(restaurant_id)
    spent = daily_spend(restaurant_id)
    return {'spent_usd': round(spent, 4), 'limit_usd': limit,
            'pct': min(100, round(spent / limit * 100)) if limit else 0,
            'exceeded': spent >= limit}


def cleanup_old_usage(days=180) -> int:
    """⚡ Cron (kunlik): eski yozuvlarni o'chiradi — jadval shishmasin."""
    cutoff = timezone.now() - timedelta(days=days)
    n, _ = AIUsage.objects.filter(created_at__lt=cutoff).delete()
    return n
```

`config/settings/base.py` `INSTALLED_APPS` ga: `'apps.ai',`

✅ **Test:** `tests/test_ai_usage.py`
```python
import pytest

from apps.ai.models import AIUsage
from apps.ai.services.cost import daily_spend, budget_state, monthly_spend


def test_cost_recorded_by_router(db, restaurant, settings, monkeypatch):
    from apps.ai.mcp.router import MCPRouter
    from apps.ai.mcp.base import MCPRequest, MCPResponse
    settings.AI_KEYS = {'GEMINI_API_KEY': 'x'}
    r = MCPRouter()
    for br in r.breakers.values():
        br._set('state', 'closed')
    next(p for p in r.providers if p.name == 'gemini').call = \
        lambda req: MCPResponse(ok=True, content='ok', provider='gemini',
                                model='gemini-2.0-flash', tokens_in=100,
                                tokens_out=50, cost_usd=0.00003)
    r.run(MCPRequest(task='chat', prompt='salom'), restaurant_id=restaurant.id,
          use_cache=False)
    assert AIUsage.objects.filter(restaurant=restaurant).exists()


def test_budget_limit_blocks(db, restaurant, settings, monkeypatch):
    """⚡ TZ §8: byudjet tugagach chaqiruv YUBORILMAYDI."""
    from apps.ai.mcp.router import MCPRouter
    from apps.ai.mcp.base import MCPRequest
    from django.core.cache import cache
    cache.clear()
    settings.AI_KEYS = {'GEMINI_API_KEY': 'x'}
    restaurant.plan = 'start'; restaurant.save()      # limit $0.5
    for _ in range(20):
        AIUsage.objects.create(restaurant=restaurant, provider='gemini',
                               task='chat', cost_usd=0.05)      # $1.0
    r = MCPRouter()
    called = {'n': 0}
    for p in r.providers:
        p.call = lambda req: called.update(n=called['n'] + 1)
    resp = r.run(MCPRequest(task='chat', prompt='x'),
                 restaurant_id=restaurant.id, use_cache=False)
    assert resp.error == 'AI_BUDGET_EXCEEDED'
    assert called['n'] == 0                # ⚡ hech kim chaqirilmadi


def test_daily_spend_sums(db, restaurant):
    for c in (0.01, 0.02, 0.03):
        AIUsage.objects.create(restaurant=restaurant, provider='p',
                               task='chat', cost_usd=c)
    assert abs(daily_spend(restaurant.id) - 0.06) < 1e-6


def test_budget_state_pct(db, restaurant):
    from django.core.cache import cache
    cache.clear()
    restaurant.plan = 'pro'; restaurant.save()        # $2.0
    AIUsage.objects.create(restaurant=restaurant, provider='p',
                           task='chat', cost_usd=1.0)
    s = budget_state(restaurant.id)
    assert s['pct'] == 50 and not s['exceeded']


def test_monthly_breakdown_by_task(db, restaurant):
    AIUsage.objects.create(restaurant=restaurant, provider='p',
                           task='chat', cost_usd=0.10)
    AIUsage.objects.create(restaurant=restaurant, provider='p',
                           task='translate', cost_usd=0.30)
    m = monthly_spend(restaurant.id)
    assert m['by_task'][0]['task'] == 'translate'
    assert abs(m['total_usd'] - 0.40) < 1e-6


def test_cross_tenant_usage_isolated(db, restaurant, restaurant2):
    AIUsage.objects.create(restaurant=restaurant2, provider='p',
                           task='chat', cost_usd=5.0)
    assert daily_spend(restaurant.id) == 0
```

✅ **Tekshirish:**
```bash
python manage.py makemigrations ai && python manage.py migrate
pytest tests/test_ai_usage.py -q     # 6 passed
```

---

## V-183 — ⚡ Chatbot servisi (kontekst + validatsiya + tugmalar)

**Fayl:** `apps/ai/prompts.py`
```python
CHAT_SYSTEM = """Sen "{restaurant_name}" restoranining menyu yordamchisisan.

VAZIFANG: mijozga menyu bo'yicha yordam berish va taom tanlashga ko'maklashish.

QAT'IY QOIDALAR:
1. FAQAT quyidagi menyudagi taomlar haqida gapir. Menyuda yo'q taomni TAKLIF QILMA.
2. Narxlarni aynan menyudagidek ayt. O'zingdan narx O'YLAB TOPMA.
3. Javob QISQA bo'lsin — 2-4 gap. Mijoz och, uzun matn o'qimaydi.
4. {lang_name} tilida javob ber.
5. Milliy taom haqida so'ralsa — nima ekanini QISQA tushuntir (chet ellik bilmasligi mumkin).
6. Allergiya/parhez so'ralsa — DIQQAT BILAN javob ber, faqat teglar asosida.
   Ishonchsiz bo'lsang: "Ofitsiantdan aniqlashtirishingizni so'raymiz".
7. Menyudan tashqari savol (siyosat, ob-havo, dasturlash) → xushmuomala rad et.
8. Har javobda 1-2 ta taom taklif qil (upsell), lekin bosim o'tkazma.
9. Taom haqida gapirganda uning nomini AYNAN menyudagidek yoz — tizim shu bo'yicha
   tugma qo'shadi.

MENYU (format: ID|Nom|Narx|Teglar|Allergen|Vaqt):
{menu_json}

MIJOZ SAVATIDA: {cart_summary}
"""

TRANSLATE_SYSTEM = """Sen restoran menyusi uchun professional tarjimonsan.

QOIDALAR:
1. {source_name} tilidan {target_name} tiliga tarjima qil.
2. Milliy o'zbek taomlari uchun: transliteratsiya + qavs ichida QISQA tushuntirish.
   Masalan: "Norin" → "Norin (hand-cut noodles with horse meat)"
3. Xalqaro taomlar uchun: standart nomni ishlat ("Sezar salati" → "Caesar salad").
4. Qo'shimcha izoh yozma, faqat tarjimani ber.
5. Javobni JSON massiv ko'rinishida qaytar: {{"0": "tarjima", "1": "tarjima", ...}}
   Kalit — kiruvchi ro'yxatdagi indeks (satr ko'rinishida).

TARJIMA QILINADIGAN MATNLAR:
{items}
"""

LANG_NAMES = {'uz': "o'zbek", 'ru': 'rus', 'en': 'ingliz'}
LANG_NAMES_NATIVE = {'uz': "O'zbek", 'ru': 'Русский', 'en': 'English'}
```

**Fayl:** `apps/ai/services/chat.py`
```python
import logging
import re

from django.core.cache import cache
from django.utils import timezone

from apps.ai.mcp import mcp, MCPRequest
from apps.ai.prompts import CHAT_SYSTEM, LANG_NAMES

log = logging.getLogger('ai.chat')

MAX_QUESTION_LEN = 500
HISTORY_LIMIT = 6
RATE_LIMIT = 10          # savol
RATE_WINDOW = 300        # 5 daqiqa


# ---------------- Rate limit ----------------
def rate_limit_ok(key: str, limit=RATE_LIMIT, window=RATE_WINDOW) -> bool:
    ck = f'rl:{key}'
    try:
        n = cache.incr(ck)
    except ValueError:
        cache.set(ck, 1, window)
        n = 1
    return n <= limit


# ---------------- Menyu konteksti ----------------
def build_menu_context(restaurant_id: int, lang: str) -> str:
    """
    ⚡ To'liq menyu emas — faqat AI uchun zarur maydonlar.
    100 taom ≈ 1500 token (to'liq bo'lsa 8000+ bo'lardi).
    """
    key = f'ai:menuctx:{restaurant_id}:{lang}'
    ctx = cache.get(key)
    if ctx:
        return ctx

    from apps.menu.models import Dish

    dishes = (Dish.objects
              .filter(restaurant_id=restaurant_id, is_available=True, is_active=True)
              .select_related('category')
              .only('id', 'name_uz', 'name_ru', 'name_en', 'price', 'diet_tags',
                    'allergens', 'cook_min', 'category__name_uz')
              .order_by('category__sort', 'sort')[:250])

    lines = []
    for d in dishes:
        name = (getattr(d, f'name_{lang}', '') or d.name_uz or '').strip()
        if not name:
            continue
        tags = ','.join(d.diet_tags) if d.diet_tags else '-'
        alrg = ','.join(d.allergens) if d.allergens else '-'
        lines.append(f'{d.id}|{name}|{int(d.price)}|{tags}|{alrg}|{d.cook_min or 0}min')

    ctx = 'ID|Nom|Narx|Teglar|Allergen|Vaqt\n' + '\n'.join(lines)
    cache.set(key, ctx, 300)
    return ctx


def valid_dishes(restaurant_id: int, lang: str) -> dict:
    """{pastki_registr_nom: dish_id} — validatsiya va tugmalar uchun."""
    key = f'ai:dishnames:{restaurant_id}:{lang}'
    d = cache.get(key)
    if d is not None:
        return d

    from apps.menu.models import Dish
    out = {}
    for row in (Dish.objects
                .filter(restaurant_id=restaurant_id, is_available=True, is_active=True)
                .values('id', 'name_uz', 'name_ru', 'name_en', 'has_3d')):
        for L in ('uz', 'ru', 'en'):
            n = (row[f'name_{L}'] or '').strip().lower()
            if n:
                out[n] = {'id': row['id'], 'has_3d': row['has_3d']}
    cache.set(key, out, 300)
    return out


def summarize_cart(cart: list, lang: str) -> str:
    if not cart:
        return "bo'sh"
    parts = [f"{c.get('name', '?')} ×{c.get('qty', 1)}" for c in cart[:8]]
    return ', '.join(parts)


# ---------------- Javob validatsiyasi ----------------
def extract_mentions(text: str, names: dict) -> list:
    """AI javobida tilga olingan MENYUDAGI taomlar."""
    low = (text or '').lower()
    found = []
    for name, meta in names.items():
        if len(name) < 3:
            continue
        if re.search(r'(?<![\w\'])' + re.escape(name) + r'(?![\w\'])', low):
            found.append({'name': name, **meta})
    # eng uzun moslikni oldinga (masalan "osh" vs "toshkent oshi")
    found.sort(key=lambda x: -len(x['name']))
    seen, out = set(), []
    for f in found:
        if f['id'] in seen:
            continue
        seen.add(f['id'])
        out.append(f)
    return out[:4]


DISCLAIMER = {
    'uz': "\n\n⚠️ Bu taom hozircha menyuda yo'q — ofitsiantdan so'rang.",
    'ru': "\n\n⚠️ Этого блюда сейчас нет в меню — уточните у официанта.",
    'en': "\n\n⚠️ This dish is not on the menu right now — please ask the waiter.",
}


def validate_answer(text: str, restaurant_id: int, lang: str) -> tuple:
    """
    ⚡ AI o'ylab topgan taomni bloklash (TZ §7.2 №6).
    Qaytadi: (tozalangan_matn, tilga_olingan_taomlar)
    """
    names = valid_dishes(restaurant_id, lang)
    mentioned = extract_mentions(text, names)

    # ⚡ Narx tekshiruvi: matndagi raqamlar menyudagi narx bilan mos kelmasa —
    # gumonli, lekin matnni o'chirmaymiz, faqat log qilamiz
    prices = {int(p.replace(' ', '').replace(' ', ''))
              for p in re.findall(r'\b(\d{4,7})\b', text or '')}
    if prices:
        from apps.menu.models import Dish
        real = set(Dish.objects.filter(
            restaurant_id=restaurant_id, is_available=True
        ).values_list('price', flat=True))
        real = {int(p) for p in real}
        bogus = {p for p in prices if p not in real and p > 999}
        if bogus:
            log.warning(f'[AI] menyuda yo\'q narx aytdi rest={restaurant_id}: {bogus}')

    # Menyuda yo'q taom nomini AI aytgan bo'lsa — ogohlantirish qo'shamiz
    if not mentioned and re.search(r'\b(sushi|pizza|burger|стейк|steak)\b',
                                   (text or '').lower()):
        text = (text or '') + DISCLAIMER.get(lang, DISCLAIMER['uz'])

    return text, mentioned


BTN_LABEL = {
    'ar': {'uz': "🎯 AR'da ko'rish", 'ru': '🎯 Смотреть в AR', 'en': '🎯 View in AR'},
    'order': {'uz': '🛒 Buyurtma', 'ru': '🛒 Заказать', 'en': '🛒 Order'},
}


def build_buttons(mentioned: list, lang: str) -> list:
    btns = []
    for m in mentioned[:2]:
        if m.get('has_3d'):
            btns.append({'type': 'ar', 'dish_id': m['id'],
                         'label': BTN_LABEL['ar'][lang]})
        btns.append({'type': 'order', 'dish_id': m['id'],
                     'label': BTN_LABEL['order'][lang]})
    return btns[:4]


# ---------------- Asosiy funksiya ----------------
ERR_TEXT = {
    'uz': "Kechirasiz, hozir javob bera olmayapman. Ofitsiantni chaqiring 🙏",
    'ru': 'Извините, сейчас не могу ответить. Позовите официанта 🙏',
    'en': "Sorry, I can't answer right now. Please call the waiter 🙏",
}
RATE_TEXT = {
    'uz': 'Juda ko\'p savol yubordingiz. Bir daqiqadan keyin urinib ko\'ring.',
    'ru': 'Слишком много вопросов. Попробуйте через минуту.',
    'en': 'Too many questions. Please try again in a minute.',
}


def answer_question(*, restaurant, guest_session: str, question: str,
                    lang: str = 'uz', cart=None, table_id=None) -> dict:
    """M-13 chatbot — to'liq zanjir (TZ §7.2)."""
    lang = lang if lang in LANG_NAMES else 'uz'

    # 1. Rate limit
    if not rate_limit_ok(f'chat:{restaurant.id}:{guest_session}'):
        return {'error': 'rate_limited', 'text': RATE_TEXT[lang], 'buttons': []}

    # 2. Kirish tozalash
    question = (question or '').strip()[:MAX_QUESTION_LEN]
    if not question:
        return {'error': 'empty', 'text': '', 'buttons': []}

    # 3. Sessiya + tarix
    from apps.ai.models import ChatSession, ChatMessage
    session, _ = ChatSession.objects.get_or_create(
        restaurant=restaurant, guest_session=guest_session,
        defaults={'lang': lang, 'table_id': table_id})
    history = [{'role': m.role, 'content': m.text}
               for m in session.messages.order_by('-created_at')[:HISTORY_LIMIT][::-1]]

    # 4. Kontekst
    menu_ctx = build_menu_context(restaurant.id, lang)

    # 5. MCP chaqiruvi — ⚡ provayder nomi kodda YO'Q
    resp = mcp.run(MCPRequest(
        task='chat',
        system=CHAT_SYSTEM.format(
            restaurant_name=restaurant.name,
            lang_name=LANG_NAMES[lang],
            menu_json=menu_ctx,
            cart_summary=summarize_cart(cart or [], lang)),
        messages=history + [{'role': 'user', 'content': question}],
        max_tokens=350, temperature=0.4, timeout=25,
    ), restaurant_id=restaurant.id)

    if not resp.ok:
        log.warning(f'[AI] chat xato rest={restaurant.id}: {resp.error}')
        return {'error': resp.error, 'text': ERR_TEXT[lang], 'buttons': []}

    text = resp.content if isinstance(resp.content, str) else str(resp.content)

    # 6. ⚡ Validatsiya
    text, mentioned = validate_answer(text, restaurant.id, lang)

    # 7. Tugmalar
    buttons = build_buttons(mentioned, lang)

    # 8. Tarixga saqlash
    ChatMessage.objects.create(session=session, role='user', text=question)
    ChatMessage.objects.create(session=session, role='assistant', text=text,
                               provider=resp.provider, buttons=buttons)
    ChatSession.objects.filter(id=session.id).update(
        messages_count=session.messages_count + 2, updated_at=timezone.now())

    return {'text': text, 'buttons': buttons, 'provider': resp.provider,
            'cached': resp.cached, 'session_id': session.id}
```

✅ **Test:** `tests/test_chatbot.py`
```python
import pytest

from apps.ai.services.chat import (build_menu_context, extract_mentions,
                                   validate_answer, build_buttons,
                                   answer_question, rate_limit_ok)


@pytest.fixture
def menu(db, restaurant):
    from apps.menu.models import Dish, Category
    c = Category.objects.create(restaurant=restaurant, name_uz='Asosiy', sort=1)
    Dish.objects.create(restaurant=restaurant, category=c, name_uz='Osh',
                        name_ru='Плов', name_en='Pilaf', price=45000,
                        cook_min=25, diet_tags=['halol'], has_3d=True)
    Dish.objects.create(restaurant=restaurant, category=c, name_uz='Manti',
                        name_ru='Манты', name_en='Manti', price=38000,
                        cook_min=40, allergens=['gluten'])
    return restaurant


def test_menu_context_is_compact(menu):
    ctx = build_menu_context(menu.id, 'uz')
    assert 'Osh|45000' in ctx
    assert len(ctx) < 2000              # ⚡ token tejamkor
    assert ctx.count('\n') == 3          # sarlavha + 2 taom


def test_context_respects_language(menu):
    from django.core.cache import cache
    cache.clear()
    assert 'Pilaf' in build_menu_context(menu.id, 'en')
    cache.clear()
    assert 'Плов' in build_menu_context(menu.id, 'ru')


def test_unavailable_dish_excluded(menu):
    from django.core.cache import cache
    from apps.menu.models import Dish
    Dish.objects.filter(name_uz='Manti').update(is_available=False)
    cache.clear()
    assert 'Manti' not in build_menu_context(menu.id, 'uz')


def test_mentions_only_real_dishes(menu):
    from apps.ai.services.chat import valid_dishes
    from django.core.cache import cache
    cache.clear()
    names = valid_dishes(menu.id, 'uz')
    found = extract_mentions('Men sizga Osh va Sushi tavsiya qilaman', names)
    assert [f['name'] for f in found] == ['osh']       # ⚡ sushi YO'Q


def test_invented_dish_gets_disclaimer(menu):
    from django.core.cache import cache
    cache.clear()
    text, mentioned = validate_answer('Bizda ajoyib sushi bor!', menu.id, 'uz')
    assert '⚠️' in text
    assert not mentioned


def test_buttons_ar_only_when_3d(menu):
    btns = build_buttons([{'id': 1, 'name': 'osh', 'has_3d': True}], 'uz')
    assert any(b['type'] == 'ar' for b in btns)
    btns2 = build_buttons([{'id': 2, 'name': 'manti', 'has_3d': False}], 'uz')
    assert not any(b['type'] == 'ar' for b in btns2)


def test_answer_uses_mcp_and_saves_history(menu, monkeypatch):
    from apps.ai.mcp.base import MCPResponse
    from apps.ai.models import ChatMessage
    from django.core.cache import cache
    cache.clear()
    monkeypatch.setattr('apps.ai.services.chat.mcp.run',
                        lambda req, **kw: MCPResponse(
                            ok=True, content='Osh — 45 000 so\'m. Tavsiya qilaman!',
                            provider='gemini', model='m'))
    r = answer_question(restaurant=menu, guest_session='s1',
                        question='Nima tavsiya qilasiz?', lang='uz')
    assert r['provider'] == 'gemini'
    assert any(b['type'] == 'ar' for b in r['buttons'])
    assert ChatMessage.objects.filter(session_id=r['session_id']).count() == 2


def test_ai_failure_returns_friendly_text(menu, monkeypatch):
    from apps.ai.mcp.base import MCPResponse
    from django.core.cache import cache
    cache.clear()
    monkeypatch.setattr('apps.ai.services.chat.mcp.run',
                        lambda req, **kw: MCPResponse(
                            ok=False, error='ALL_PROVIDERS_FAILED'))
    r = answer_question(restaurant=menu, guest_session='s2',
                        question='salom', lang='ru')
    assert 'официанта' in r['text']        # ⚡ crash EMAS


def test_rate_limit_blocks_11th(menu):
    from django.core.cache import cache
    cache.clear()
    for _ in range(10):
        assert rate_limit_ok('chat:x:y')
    assert not rate_limit_ok('chat:x:y')


def test_empty_question_rejected(menu):
    from django.core.cache import cache
    cache.clear()
    r = answer_question(restaurant=menu, guest_session='s3', question='   ')
    assert r['error'] == 'empty'
```

✅ **Tekshirish:** `pytest tests/test_chatbot.py -q` → 10 passed

---

## V-184 — `POST /v1/ai/chat/` endpoint

**Fayl:** `apps/ai/serializers.py`
```python
from rest_framework import serializers

LANGS = ('uz', 'ru', 'en')


class ChatRequestSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=500, trim_whitespace=True)
    lang = serializers.ChoiceField(choices=LANGS, default='uz')
    session = serializers.CharField(max_length=64)
    table_id = serializers.IntegerField(required=False, allow_null=True)
    cart = serializers.ListField(child=serializers.DictField(),
                                 required=False, default=list, max_length=50)

    def validate_question(self, v):
        v = (v or '').strip()
        if not v:
            raise serializers.ValidationError('Savol bo\'sh')
        return v


class ChatButtonSerializer(serializers.Serializer):
    type = serializers.CharField()
    dish_id = serializers.IntegerField()
    label = serializers.CharField()


class ChatResponseSerializer(serializers.Serializer):
    text = serializers.CharField()
    buttons = ChatButtonSerializer(many=True)
    provider = serializers.CharField(required=False)
    session_id = serializers.IntegerField(required=False)
```

**Fayl:** `apps/ai/views_chat.py`
```python
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle

from core.exceptions import RestaurantInactive, PlanLimit
from apps.ai.serializers import ChatRequestSerializer
from apps.ai.services.chat import answer_question

log = logging.getLogger('ai.chat')


class ChatThrottle(AnonRateThrottle):
    """⚡ Ikkinchi qatlam himoya (birinchisi — servis ichidagi rate_limit_ok)."""
    scope = 'ai_chat'
    rate = '30/min'


class ChatView(APIView):
    """
    POST /api/v1/ai/chat/
    Body: {question, lang, session, table_id?, cart?}
    Auth: YO'Q — mijoz mehmon (TenantMiddleware /m/<slug>/ dan restoranni topadi)
    """
    permission_classes = [AllowAny]
    throttle_classes = [ChatThrottle]

    def post(self, request):
        restaurant = getattr(request, 'restaurant', None)
        if not restaurant or not restaurant.is_active:
            raise RestaurantInactive()
        if not restaurant.chatbot_enabled:
            return Response({'error': {
                'code': 'CHATBOT_DISABLED',
                'message_uz': 'Chatbot bu restoranda o\'chirilgan',
                'message_ru': 'Чат-бот отключён в этом ресторане',
                'message_en': 'Chatbot is disabled for this restaurant'}}, status=403)
        if not restaurant.has_feature('chatbot'):
            raise PlanLimit({'feature': 'chatbot'})

        s = ChatRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data

        result = answer_question(
            restaurant=restaurant,
            guest_session=d['session'],
            question=d['question'],
            lang=d['lang'],
            cart=d.get('cart') or [],
            table_id=d.get('table_id'))

        status_code = 200
        if result.get('error') == 'rate_limited':
            status_code = 429
        elif result.get('error') == 'empty':
            status_code = 400
        return Response(result, status=status_code)


class ChatHistoryView(APIView):
    """GET /api/v1/ai/chat/history/?session=<uuid> — sahifa yangilanganda"""
    permission_classes = [AllowAny]

    def get(self, request):
        from apps.ai.models import ChatSession
        restaurant = getattr(request, 'restaurant', None)
        sid = request.query_params.get('session')
        if not restaurant or not sid:
            return Response({'messages': []})
        session = ChatSession.objects.filter(
            restaurant=restaurant, guest_session=sid).first()
        if not session:
            return Response({'messages': []})
        msgs = session.messages.order_by('created_at')[:40]
        return Response({'messages': [
            {'role': m.role, 'text': m.text, 'buttons': m.buttons,
             'at': m.created_at} for m in msgs]})
```

**URL'lar** — `apps/ai/urls.py`:
```python
from django.urls import path

from apps.ai.views_chat import ChatView, ChatHistoryView
from apps.ai.views_health import AIHealthView

urlpatterns = [
    path('ai/chat/', ChatView.as_view(), name='ai-chat'),
    path('ai/chat/history/', ChatHistoryView.as_view(), name='ai-chat-history'),
    path('admin/ai/health/', AIHealthView.as_view(), name='ai-health'),
]
```

`config/settings/base.py` `REST_FRAMEWORK` ga:
```python
    'DEFAULT_THROTTLE_RATES': {'ai_chat': '30/min'},
```

✅ **Test:** `tests/test_chat_api.py`
```python
import pytest


@pytest.fixture
def chat_ready(db, restaurant, monkeypatch):
    from apps.ai.mcp.base import MCPResponse
    from django.core.cache import cache
    cache.clear()
    restaurant.plan = 'pro'
    restaurant.chatbot_enabled = True
    restaurant.save()
    monkeypatch.setattr('apps.ai.services.chat.mcp.run',
                        lambda req, **kw: MCPResponse(
                            ok=True, content='Osh tavsiya qilaman',
                            provider='gemini', model='m'))
    return restaurant


def test_chat_works_without_auth(api_client, chat_ready):
    r = api_client.post(f'/m/{chat_ready.slug}/api/v1/ai/chat/',
                        {'question': 'Nima yeyay?', 'lang': 'uz',
                         'session': 'guest-1'}, format='json')
    assert r.status_code == 200
    assert r.data['text']
    assert 'provider' in r.data


def test_empty_question_400(api_client, chat_ready):
    r = api_client.post(f'/m/{chat_ready.slug}/api/v1/ai/chat/',
                        {'question': '   ', 'lang': 'uz', 'session': 's'},
                        format='json')
    assert r.status_code == 400


def test_bad_lang_400(api_client, chat_ready):
    r = api_client.post(f'/m/{chat_ready.slug}/api/v1/ai/chat/',
                        {'question': 'x', 'lang': 'de', 'session': 's'},
                        format='json')
    assert r.status_code == 400


def test_disabled_chatbot_403(api_client, chat_ready):
    chat_ready.chatbot_enabled = False
    chat_ready.save()
    r = api_client.post(f'/m/{chat_ready.slug}/api/v1/ai/chat/',
                        {'question': 'x', 'lang': 'uz', 'session': 's'},
                        format='json')
    assert r.status_code == 403
    assert r.data['error']['code'] == 'CHATBOT_DISABLED'


def test_start_plan_gets_402(api_client, chat_ready):
    chat_ready.plan = 'start'
    chat_ready.save()
    r = api_client.post(f'/m/{chat_ready.slug}/api/v1/ai/chat/',
                        {'question': 'x', 'lang': 'uz', 'session': 's'},
                        format='json')
    assert r.status_code == 402


def test_rate_limit_429(api_client, chat_ready):
    url = f'/m/{chat_ready.slug}/api/v1/ai/chat/'
    for _ in range(10):
        api_client.post(url, {'question': 'salom', 'lang': 'uz',
                              'session': 'rl'}, format='json')
    r = api_client.post(url, {'question': 'salom', 'lang': 'uz',
                              'session': 'rl'}, format='json')
    assert r.status_code == 429


def test_history_returns_messages(api_client, chat_ready):
    url = f'/m/{chat_ready.slug}/api/v1/ai/chat/'
    api_client.post(url, {'question': 'salom', 'lang': 'uz',
                          'session': 'h1'}, format='json')
    r = api_client.get(f'/m/{chat_ready.slug}/api/v1/ai/chat/history/?session=h1')
    assert r.status_code == 200
    assert len(r.data['messages']) == 2


def test_cross_tenant_history_isolated(api_client, chat_ready, restaurant2):
    url = f'/m/{chat_ready.slug}/api/v1/ai/chat/'
    api_client.post(url, {'question': 'salom', 'lang': 'uz',
                          'session': 'x9'}, format='json')
    r = api_client.get(f'/m/{restaurant2.slug}/api/v1/ai/chat/history/?session=x9')
    assert r.data['messages'] == []
```

✅ **Tekshirish:**
```bash
curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"question":"Achchiq bo'"'"'lmagan nima bor?","lang":"uz","session":"test-1"}' \
  http://localhost:8060/m/registon/api/v1/ai/chat/ | python3 -m json.tool
# {"text": "...", "buttons": [...], "provider": "gemini"}
```

---

## V-185 — Chatbot UI (M-13)

**Fayl:** `templates/guest/_chatbot.html` (menyu sahifasiga `{% include %}` qilinadi)
```html
{% load i18n static %}
{% if request.restaurant.chatbot_enabled %}
<button id="cb-fab" aria-label="{% trans 'Yordamchi' %}">🤖</button>

<div id="cb-panel" hidden role="dialog" aria-modal="true"
     aria-label="{% trans 'AI yordamchi' %}">
  <header>
    <strong>🤖 {% trans "Yordamchi" %}</strong>
    <button id="cb-close" aria-label="{% trans 'Yopish' %}">✕</button>
  </header>
  <div id="cb-log" aria-live="polite"></div>
  <div id="cb-suggest">
    <button data-q="{% trans 'Nima tavsiya qilasiz?' %}">{% trans "Nima tavsiya qilasiz?" %}</button>
    <button data-q="{% trans 'Achchiq bo\'lmagan nima bor?' %}">{% trans "Achchiq emas" %}</button>
    <button data-q="{% trans 'Vegetarian taomlar bormi?' %}">{% trans "Vegetarian" %}</button>
    <button data-q="{% trans 'Eng tez tayyorlanadigan taom?' %}">{% trans "Tez tayyor" %}</button>
  </div>
  <form id="cb-form">
    <input id="cb-input" maxlength="500" autocomplete="off"
           placeholder="{% trans 'Savolingizni yozing...' %}"
           aria-label="{% trans 'Savol' %}">
    <button type="submit" id="cb-send" aria-label="{% trans 'Yuborish' %}">➤</button>
  </form>
</div>

<link rel="stylesheet" href="{% static 'guest/css/chatbot.css' %}?v=1">
<script src="{% static 'guest/js/chatbot.js' %}?v=1"></script>
{% endif %}
```

**Fayl:** `static/guest/css/chatbot.css`
```css
/* M-13 — AI chatbot. Dark + Light, faqat var(--*) */
#cb-fab {
  position: fixed; right: 16px; bottom: 84px; z-index: 60;
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--accent); color: var(--accent-fg);
  border: none; font-size: 22px; cursor: pointer;
  box-shadow: 0 4px 14px rgba(0,0,0,.25);
}
#cb-fab:active { transform: scale(.94); }

#cb-panel {
  position: fixed; inset: auto 0 0 0; z-index: 70;
  display: flex; flex-direction: column;
  max-height: 78vh; background: var(--surface); color: var(--fg);
  border-top: 1px solid var(--border);
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -6px 24px rgba(0,0,0,.25);
  animation: cb-up .2s ease;
}
@keyframes cb-up { from { transform: translateY(100%); } to { transform: none; } }

#cb-panel header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; border-bottom: 1px solid var(--border);
}
#cb-close { background: none; border: none; color: var(--fg);
            font-size: 18px; cursor: pointer; min-width: 44px; min-height: 44px; }

#cb-log { flex: 1; overflow-y: auto; padding: 12px 14px;
          display: flex; flex-direction: column; gap: 10px; }
.cb-msg { max-width: 86%; padding: 9px 12px; border-radius: 14px;
          font-size: 14px; line-height: 1.45; white-space: pre-wrap; }
.cb-msg.bot  { align-self: flex-start; background: var(--surface-2); }
.cb-msg.user { align-self: flex-end; background: var(--accent);
               color: var(--accent-fg); }
.cb-btns { display: flex; flex-wrap: wrap; gap: 6px; align-self: flex-start; }
.cb-btns button {
  padding: 7px 11px; border-radius: 999px; font-size: 13px;
  background: var(--surface-3); color: var(--fg);
  border: 1px solid var(--border); cursor: pointer; min-height: 36px;
}
.cb-typing { align-self: flex-start; color: var(--fg-muted); font-size: 13px; }
.cb-typing span { animation: cb-blink 1.2s infinite; }
.cb-typing span:nth-child(2) { animation-delay: .2s; }
.cb-typing span:nth-child(3) { animation-delay: .4s; }
@keyframes cb-blink { 0%,60%,100% { opacity: .25; } 30% { opacity: 1; } }

#cb-suggest { display: flex; gap: 6px; overflow-x: auto; padding: 8px 14px;
              border-top: 1px solid var(--border); }
#cb-suggest button {
  white-space: nowrap; padding: 7px 12px; border-radius: 999px;
  font-size: 13px; background: var(--surface-2); color: var(--fg);
  border: 1px solid var(--border); cursor: pointer; min-height: 36px;
}

#cb-form { display: flex; gap: 8px; padding: 10px 14px;
           border-top: 1px solid var(--border);
           padding-bottom: calc(10px + env(safe-area-inset-bottom)); }
#cb-input { flex: 1; padding: 11px 12px; font-size: 16px;   /* iOS zoom yo'q */
            background: var(--bg); color: var(--fg);
            border: 1px solid var(--border); border-radius: 999px; }
#cb-send { width: 46px; min-height: 46px; border-radius: 50%;
           background: var(--accent); color: var(--accent-fg);
           border: none; font-size: 17px; cursor: pointer; }
#cb-send:disabled { opacity: .5; }

@media (min-width: 720px) {
  #cb-panel { inset: auto 16px 16px auto; width: 380px;
              border-radius: 16px; border: 1px solid var(--border); }
}
```

**Fayl:** `static/guest/js/chatbot.js`
```javascript
/* M-13 — AI chatbot (mijoz tomoni) */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const A = window.ARMENU || {};
  const t = A.t || ((k) => k);
  const SLUG = document.body.dataset.restaurantSlug;
  const API = `/m/${SLUG}/api/v1/ai/chat/`;

  function sessionId() {
    let s = localStorage.getItem('armenu_session');
    if (!s) {
      s = (crypto.randomUUID ? crypto.randomUUID()
                             : String(Date.now()) + Math.random());
      localStorage.setItem('armenu_session', s);
    }
    return s;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function addMsg(role, text) {
    const d = document.createElement('div');
    d.className = 'cb-msg ' + (role === 'user' ? 'user' : 'bot');
    d.textContent = text;
    $('#cb-log').appendChild(d);
    $('#cb-log').scrollTop = $('#cb-log').scrollHeight;
    return d;
  }

  function addButtons(btns) {
    if (!btns || !btns.length) return;
    const box = document.createElement('div');
    box.className = 'cb-btns';
    box.innerHTML = btns.map(b =>
      `<button data-type="${esc(b.type)}" data-dish="${b.dish_id}">${esc(b.label)}</button>`
    ).join('');
    box.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const id = b.dataset.dish;
      if (b.dataset.type === 'ar') {
        // ⚡ AR sahifasi (FAZA 6)
        if (window.openAR) window.openAR(id); else location.href = `#dish-${id}-ar`;
      } else {
        if (window.openDish) window.openDish(id); else location.href = `#dish-${id}`;
      }
      close();
    });
    $('#cb-log').appendChild(box);
    $('#cb-log').scrollTop = $('#cb-log').scrollHeight;
  }

  function typing(on) {
    const old = $('#cb-typing-el');
    if (old) old.remove();
    if (!on) return;
    const d = document.createElement('div');
    d.id = 'cb-typing-el';
    d.className = 'cb-typing';
    d.innerHTML = '<span>●</span><span>●</span><span>●</span>';
    $('#cb-log').appendChild(d);
    $('#cb-log').scrollTop = $('#cb-log').scrollHeight;
  }

  function cart() {
    try { return JSON.parse(localStorage.getItem('armenu_cart') || '[]'); }
    catch (_) { return []; }
  }

  let busy = false;

  async function send(question) {
    if (busy || !question.trim()) return;
    busy = true;
    $('#cb-send').disabled = true;
    addMsg('user', question);
    $('#cb-input').value = '';
    typing(true);
    try {
      const r = await fetch(API, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question,
          lang: (A.lang || document.documentElement.lang || 'uz'),
          session: sessionId(),
          table_id: window.ARMENU_TABLE_ID || null,
          cart: cart().slice(0, 20)
        })
      });
      const d = await r.json();
      typing(false);
      if (d.text) addMsg('bot', d.text);
      else addMsg('bot', t('chat.error'));
      addButtons(d.buttons);
    } catch (_) {
      typing(false);
      addMsg('bot', t('chat.error'));
    }
    busy = false;
    $('#cb-send').disabled = false;
    $('#cb-input').focus();
  }

  function open() {
    $('#cb-panel').hidden = false;
    $('#cb-fab').hidden = true;
    if (!$('#cb-log').children.length) loadHistory();
    setTimeout(() => $('#cb-input').focus(), 100);
  }
  function close() {
    $('#cb-panel').hidden = true;
    $('#cb-fab').hidden = false;
  }

  async function loadHistory() {
    try {
      const r = await fetch(
        `/m/${SLUG}/api/v1/ai/chat/history/?session=${encodeURIComponent(sessionId())}`,
        { credentials: 'same-origin' });
      const d = await r.json();
      if (d.messages && d.messages.length) {
        d.messages.forEach(m => {
          addMsg(m.role === 'user' ? 'user' : 'bot', m.text);
          if (m.role === 'assistant') addButtons(m.buttons);
        });
        return;
      }
    } catch (_) {}
    addMsg('bot', t('chat.greeting'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('#cb-fab')) return;
    $('#cb-fab').addEventListener('click', open);
    $('#cb-close').addEventListener('click', close);
    $('#cb-form').addEventListener('submit', (e) => {
      e.preventDefault();
      send($('#cb-input').value);
    });
    $('#cb-suggest').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-q]');
      if (b) send(b.dataset.q);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#cb-panel').hidden) close();
    });
  });
})();
```

`static/i18n/{uz,ru,en}.json` `chat` bloki:
```json
"chat": {
  "title": "Yordamchi",
  "greeting": "Salom! Menyu bo'yicha savolingiz bormi? Men yordam beraman 😊",
  "placeholder": "Savolingizni yozing...",
  "error": "Kechirasiz, hozir javob bera olmayapman. Ofitsiantni chaqiring 🙏",
  "rate_limited": "Juda ko'p savol yubordingiz. Bir daqiqadan keyin urinib ko'ring."
}
```
```json
"chat": {
  "title": "Помощник",
  "greeting": "Здравствуйте! Есть вопросы по меню? Я помогу 😊",
  "placeholder": "Напишите вопрос...",
  "error": "Извините, сейчас не могу ответить. Позовите официанта 🙏",
  "rate_limited": "Слишком много вопросов. Попробуйте через минуту."
}
```
```json
"chat": {
  "title": "Assistant",
  "greeting": "Hello! Any questions about the menu? I'm here to help 😊",
  "placeholder": "Type your question...",
  "error": "Sorry, I can't answer right now. Please call the waiter 🙏",
  "rate_limited": "Too many questions. Please try again in a minute."
}
```

✅ **Test:** `tests/test_chatbot_ui.py` (Playwright)
```python
import pytest

pytestmark = pytest.mark.playwright


def test_chatbot_flow(page, live_menu_url, mock_ai):
    page.goto(live_menu_url)

    # FAB ko'rinadi
    assert page.locator('#cb-fab').is_visible()
    page.click('#cb-fab')
    assert page.locator('#cb-panel').is_visible()

    # Salomlashuv
    page.wait_for_selector('.cb-msg.bot')
    assert 'Salom' in page.locator('.cb-msg.bot').first.inner_text()

    # Tayyor savol tugmasi
    page.click('#cb-suggest button')
    page.wait_for_selector('.cb-msg.user')
    page.wait_for_selector('.cb-btns button', timeout=10000)

    # AR tugmasi bosilsa panel yopiladi
    page.click('.cb-btns button')
    assert page.locator('#cb-panel').is_hidden()


def test_dark_theme_readable(page, live_menu_url, mock_ai):
    page.emulate_media(color_scheme='dark')
    page.goto(live_menu_url)
    page.click('#cb-fab')
    bg = page.eval_on_selector('#cb-panel',
                               'el => getComputedStyle(el).backgroundColor')
    fg = page.eval_on_selector('#cb-panel',
                               'el => getComputedStyle(el).color')
    assert bg != fg
    assert bg != 'rgba(0, 0, 0, 0)'      # shaffof EMAS


def test_escape_closes(page, live_menu_url, mock_ai):
    page.goto(live_menu_url)
    page.click('#cb-fab')
    page.keyboard.press('Escape')
    assert page.locator('#cb-panel').is_hidden()
```

✅ **Tekshirish:** menyu sahifasida 🤖 tugmasi; bosilsa panel ochiladi, savol
yuboriladi, javob ostida `[🎯 AR'da ko'rish] [🛒 Buyurtma]` tugmalari chiqadi.
Dark va Light temada ham o'qiladi.

---

## V-186 — ⚡ Avto-tarjima servisi + yakuniy testlar

**Fayl:** `apps/ai/services/translate.py`
```python
"""
⚡ Avto-tarjima — FAZA 8 (V-165) dagi navbat shu servisni chaqiradi.
`apps/i18n_admin/tasks.py::_translate_batch` → `translate_batch(...)`
"""
import logging

from apps.ai.mcp import mcp, MCPRequest
from apps.ai.prompts import TRANSLATE_SYSTEM, LANG_NAMES

log = logging.getLogger('ai.translate')

MAX_BATCH = 50
MAX_ITEM_LEN = 600


def translate_batch(texts: list, source_lang='uz', target_lang='en',
                    restaurant_id=None) -> dict:
    """
    Bir necha matnni BITTA chaqiruvda tarjima qiladi (token tejash).
    Qaytadi: {index: 'tarjima'} — faqat muvaffaqiyatli qatorlar.
    """
    if not texts:
        return {}
    if source_lang not in LANG_NAMES or target_lang not in LANG_NAMES:
        raise ValueError('lang')
    if source_lang == target_lang:
        return {i: t for i, t in enumerate(texts)}

    out = {}
    for start in range(0, len(texts), MAX_BATCH):
        chunk = texts[start:start + MAX_BATCH]
        part = _translate_chunk(chunk, source_lang, target_lang, restaurant_id)
        for k, v in part.items():
            out[start + k] = v
    return out


def _translate_chunk(chunk: list, source_lang, target_lang, restaurant_id) -> dict:
    items = '\n'.join(f'{i}. {str(t)[:MAX_ITEM_LEN]}' for i, t in enumerate(chunk))

    resp = mcp.run(MCPRequest(
        task='translate',
        system=TRANSLATE_SYSTEM.format(
            source_name=LANG_NAMES[source_lang],
            target_name=LANG_NAMES[target_lang],
            items=items),
        prompt=f'{len(chunk)} ta matnni tarjima qil va JSON qaytar.',
        json_mode=True, max_tokens=min(4000, 120 * len(chunk) + 200),
        temperature=0.2, timeout=90,
    ), restaurant_id=restaurant_id)

    if not resp.ok:
        log.warning(f'[translate] xato: {resp.error}')
        return {}

    data = resp.content
    if not isinstance(data, dict):
        log.warning(f'[translate] kutilmagan format: {type(data)}')
        return {}

    out = {}
    for k, v in data.items():
        try:
            idx = int(k)
        except (TypeError, ValueError):
            continue
        if 0 <= idx < len(chunk) and isinstance(v, str) and v.strip():
            out[idx] = v.strip()[:2000]

    missing = len(chunk) - len(out)
    if missing:
        log.warning(f'[translate] {missing} ta qator tarjima bo\'lmadi')
    log.info(f'[translate] {source_lang}→{target_lang}: {len(out)}/{len(chunk)} '
             f'({resp.provider}, ${resp.cost_usd:.5f})')
    return out


def translate_one(text: str, source_lang='uz', target_lang='en',
                  restaurant_id=None) -> str:
    """Bitta matn (admin panelidagi ✏️ tugmasi uchun)."""
    r = translate_batch([text], source_lang, target_lang, restaurant_id)
    return r.get(0, '')


def generate_description(dish_name: str, lang='uz', restaurant_id=None) -> str:
    """
    ⚡ Bonus: taom tavsifini AI yozadi (TZ §6 vazifa #4).
    Admin "🤖 tavsif yozish" tugmasini bosganda.
    """
    prompts = {
        'uz': f'"{dish_name}" taomiga restoran menyusi uchun 1-2 gaplik ishtaha '
              f'ochuvchi tavsif yoz. Faqat tavsifni ber, boshqa hech narsa yozma.',
        'ru': f'Напиши аппетитное описание блюда "{dish_name}" для меню ресторана, '
              f'1-2 предложения. Только описание.',
        'en': f'Write an appetizing 1-2 sentence menu description for the dish '
              f'"{dish_name}". Only the description.',
    }
    resp = mcp.run(MCPRequest(task='chat', prompt=prompts.get(lang, prompts['uz']),
                              max_tokens=150, temperature=0.7),
                   restaurant_id=restaurant_id)
    return resp.content.strip() if (resp.ok and isinstance(resp.content, str)) else ''
```

**⚡ FAZA 8 dagi stub olib tashlanadi** — `apps/i18n_admin/views_auto.py` dagi
`ai_available()` endi `True` qaytaradi, chunki `apps.ai.services.translate`
mavjud. Boshqa hech narsa o'zgartirilmaydi — bog'lanish **avtomatik** ishlaydi.

**Bir marta ishga tushirish uchun buyruq** — `apps/ai/management/commands/translate_menu.py`:
```python
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Restoran menyusining bo'sh tarjimalarini AI bilan to'ldiradi"

    def add_arguments(self, parser):
        parser.add_argument('restaurant_id', type=int)
        parser.add_argument('--lang', default='en', choices=['uz', 'ru', 'en'])
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **o):
        from apps.i18n_admin.services import collect_rows
        from apps.i18n_admin.tasks import queue_auto_translate

        rid, lang = o['restaurant_id'], o['lang']
        rows = [r for r in collect_rows(rid)
                if not r['values'][lang] and r['values']['uz']]
        self.stdout.write(f"{len(rows)} ta bo'sh maydon topildi ({lang})")
        if o['dry_run'] or not rows:
            for r in rows[:10]:
                self.stdout.write(f"  {r['entity']}#{r['object_id']}.{r['field']}: "
                                  f"{r['values']['uz'][:50]}")
            return
        res = queue_auto_translate(rid, lang)
        self.stdout.write(self.style.SUCCESS(
            f"Navbatga qo'yildi: job#{res['job_id']}, {res['pending']} ta"))
```

✅ **Test:** `tests/test_ai_translate.py`
```python
import pytest

from apps.ai.services.translate import (translate_batch, translate_one,
                                        generate_description)


def _mock(monkeypatch, content, ok=True, provider='claude'):
    from apps.ai.mcp.base import MCPResponse
    monkeypatch.setattr('apps.ai.services.translate.mcp.run',
                        lambda req, **kw: MCPResponse(
                            ok=ok, content=content, provider=provider,
                            model='m', cost_usd=0.0001))


def test_batch_maps_indices(monkeypatch):
    _mock(monkeypatch, {'0': 'Pilaf', '1': 'Manti', '2': 'Norin'})
    r = translate_batch(['Osh', 'Manti', 'Norin'], 'uz', 'en')
    assert r == {0: 'Pilaf', 1: 'Manti', 2: 'Norin'}


def test_partial_result_kept(monkeypatch):
    """AI 3 tadan 2 tasini qaytarsa — 2 tasi saqlanadi, crash yo'q."""
    _mock(monkeypatch, {'0': 'Pilaf', '2': 'Norin'})
    r = translate_batch(['Osh', 'Manti', 'Norin'], 'uz', 'en')
    assert r == {0: 'Pilaf', 2: 'Norin'}


def test_ai_failure_returns_empty(monkeypatch):
    _mock(monkeypatch, None, ok=False)
    assert translate_batch(['Osh'], 'uz', 'en') == {}


def test_bad_format_returns_empty(monkeypatch):
    _mock(monkeypatch, 'shunchaki matn')       # dict emas
    assert translate_batch(['Osh'], 'uz', 'en') == {}


def test_same_lang_is_passthrough(monkeypatch):
    called = {'n': 0}
    monkeypatch.setattr('apps.ai.services.translate.mcp.run',
                        lambda *a, **kw: called.update(n=1))
    assert translate_batch(['Osh'], 'uz', 'uz') == {0: 'Osh'}
    assert called['n'] == 0                    # ⚡ AI chaqirilmadi


def test_large_list_split_into_batches(monkeypatch):
    from apps.ai.mcp.base import MCPResponse
    calls = {'n': 0}

    def fake_run(req, **kw):
        calls['n'] += 1
        return MCPResponse(ok=True, provider='p', model='m',
                           content={str(i): f'T{i}' for i in range(50)})
    monkeypatch.setattr('apps.ai.services.translate.mcp.run', fake_run)
    r = translate_batch([f'x{i}' for i in range(120)], 'uz', 'en')
    assert calls['n'] == 3                     # 50 + 50 + 20
    assert len(r) >= 100


def test_translate_one(monkeypatch):
    _mock(monkeypatch, {'0': 'Pilaf'})
    assert translate_one('Osh', 'uz', 'en') == 'Pilaf'


def test_generate_description(monkeypatch):
    _mock(monkeypatch, "Xushbo'y ziravorlar bilan pishirilgan an'anaviy palov.")
    d = generate_description('Osh', 'uz')
    assert 'palov' in d.lower()


def test_bad_lang_raises():
    with pytest.raises(ValueError):
        translate_batch(['x'], 'uz', 'de')


def test_faza8_integration_now_available():
    """⚡ FAZA 8 dagi ai_available() endi True bo'lishi SHART."""
    from apps.i18n_admin.tasks import ai_available
    assert ai_available()
```

**Fayl:** `tests/test_ai_e2e.py` — FAZA 9 yakuniy integratsiya testi
```python
import pytest


def test_end_to_end_auto_translate(db, restaurant, monkeypatch):
    """
    ⚡ To'liq zanjir: bo'sh maydon → navbat → MCP → DB → tasdiqlanmagan belgisi.
    """
    from apps.menu.models import Dish, Category
    from apps.i18n_admin.tasks import run_auto_translate, queue_auto_translate
    from apps.ai.mcp.base import MCPResponse
    from core.models_job import Job

    c = Category.objects.create(restaurant=restaurant, name_uz='Asosiy')
    d1 = Dish.objects.create(restaurant=restaurant, category=c,
                             name_uz='Norin', price=52000)
    d2 = Dish.objects.create(restaurant=restaurant, category=c,
                             name_uz='Dimlama', price=48000)

    monkeypatch.setattr('apps.ai.services.translate.mcp.run',
                        lambda req, **kw: MCPResponse(
                            ok=True, provider='claude', model='m', cost_usd=0.0002,
                            content={'0': 'Asosiy', '1': 'Norin (hand-cut noodles)',
                                     '2': 'Dimlama (steamed meat & vegetables)'}))

    captured = {}
    monkeypatch.setattr('apps.i18n_admin.tasks.enqueue',
                        lambda q, t, **kw: captured.update(kw) or 1)
    monkeypatch.setattr('apps.i18n_admin.tasks.ws_send', lambda *a: None)

    res = queue_auto_translate(restaurant.id, 'en')
    assert res['pending'] >= 2

    job = Job.objects.create(queue='ai', type='auto_translate', payload=captured)
    out = run_auto_translate(job)

    assert out['translated'] >= 2
    d1.refresh_from_db(); d2.refresh_from_db()
    assert 'Norin' in d1.name_en
    assert 'Dimlama' in d2.name_en
    assert d1.tr_auto.get('name_en') is True
    assert not d1.tr_approved.get('name_en')      # ⚠️ admin tasdiqlaydi


def test_chat_records_cost_and_respects_budget(db, restaurant, monkeypatch):
    """Chatbot chaqiruvi AIUsage yozadi va byudjet tugagach to'xtaydi."""
    from django.core.cache import cache
    from apps.ai.models import AIUsage
    from apps.ai.services.chat import answer_question
    from apps.menu.models import Dish, Category

    cache.clear()
    restaurant.plan = 'pro'; restaurant.chatbot_enabled = True; restaurant.save()
    c = Category.objects.create(restaurant=restaurant, name_uz='A')
    Dish.objects.create(restaurant=restaurant, category=c, name_uz='Osh',
                        price=45000, has_3d=True)

    from apps.ai.mcp import mcp
    for br in mcp.breakers.values():
        br._set('state', 'closed'); br._set('failures', 0)
    from apps.ai.mcp.base import MCPResponse
    for p in mcp.providers:
        p.is_configured = lambda: True
        p.call = lambda req: MCPResponse(ok=True, content='Osh tavsiya qilaman',
                                         provider='gemini', model='m',
                                         tokens_in=800, tokens_out=60,
                                         cost_usd=0.0001)

    r = answer_question(restaurant=restaurant, guest_session='e2e',
                        question='Nima tavsiya qilasiz?', lang='uz')
    assert r['text']
    assert AIUsage.objects.filter(restaurant=restaurant, task='chat').exists()

    # Byudjetni tugatamiz
    cache.clear()
    AIUsage.objects.create(restaurant=restaurant, provider='gemini',
                           task='chat', cost_usd=5.0)
    r2 = answer_question(restaurant=restaurant, guest_session='e2e2',
                         question='Yana nima bor?', lang='uz')
    assert r2['error'] == 'AI_BUDGET_EXCEEDED'


def test_six_plus_providers_requirement():
    """⚡ TZ asosiy talabi: kamida 6 ta AI provayder MCP orqali."""
    from apps.ai.mcp import mcp
    assert len(mcp.providers) >= 6
    chat = [p for p in mcp.providers if 'chat' in p.supported_tasks]
    assert len(chat) >= 5
    assert len([p for p in mcp.providers if 'image_to_3d' in p.supported_tasks]) >= 2
```

✅ **Tekshirish:**
```bash
pytest tests/test_ai_translate.py tests/test_ai_e2e.py -q     # 13 passed
python manage.py translate_menu 1 --lang en --dry-run
# "17 ta bo'sh maydon topildi (en)"
```

---

# ✅ FAZA 9 QABULI

```
[ ] MCPProvider ABC + MCPRequest/MCPResponse dataclass ishlaydi
[ ] 8 ta provayder fayli mavjud va registry'da ro'yxatda
[ ] ⚡ Kamida 6 ta provayder (TZ talabi) — test tekshiradi
[ ] Chat uchun ≥3, 3D uchun ≥2 provayder (fallback bor)
[ ] Router prioritet bo'yicha tanlaydi (chat: gemini birinchi)
[ ] ⚡ Fallback zanjiri: 2 ta yiqilsa 3-chisi ishlaydi
[ ] ⚡ Hammasi yiqilsa — ALL_PROVIDERS_FAILED, crash EMAS
[ ] Provayder Exception otsa ham router yiqilmaydi
[ ] Circuit breaker 3 xatodan keyin ochiladi va provayderni chetlab o'tadi
[ ] HALF_OPEN provayder cron orqali sinaladi va tiklanadi
[ ] Xato darajasi yuqori provayder prioriteti avtomatik pasayadi
[ ] Kesh: bir xil so'rov 2-marta AI ga bormaydi (cost=0)
[ ] ⚡ Byudjet tugagach HECH BIR provayder chaqirilmaydi
[ ] AIUsage har chaqiruvni yozadi (provider, token, $, ms)
[ ] Kunlik limit tarifga bog'liq (start $0.5 / pro $2 / premium $6)
[ ] Chatbot: menyu konteksti < 2000 belgi (token tejamkor)
[ ] ⚡ Chatbot menyuda YO'Q taomni taklif qilmaydi (validatsiya)
[ ] Chatbot javobiga [AR] va [Buyurtma] tugmalari biriktiriladi
[ ] AR tugmasi faqat has_3d=True taomda chiqadi
[ ] Rate limit: 10 savol / 5 daqiqa / mijoz
[ ] AI yiqilsa mijoz "Ofitsiantni chaqiring" xabarini oladi (3 tilda)
[ ] POST /api/v1/ai/chat/ auth'siz ishlaydi, tenant izolyatsiyasi bor
[ ] Chatbot UI: dark + light, 3 til, Esc yopadi, tarix saqlanadi
[ ] ⚡ Avto-tarjima: 50 tadan batch, qisman natija ham saqlanadi
[ ] Tarjima natijasi tr_auto=True, tr_approved=False (admin tasdiqlaydi)
[ ] FAZA 8 dagi "AI bilan to'ldirish" tugmasi endi ISHLAYDI (501 emas)
[ ] pytest tests/test_mcp*.py tests/test_provider_*.py tests/test_ai*.py \
        tests/test_chat*.py -q → o'tadi
```

**Yakuniy:**
```bash
python manage.py makemigrations ai && python manage.py migrate
python manage.py collectstatic --noinput
python manage.py ai_health
pytest tests/ -q
git add -A && git commit -m "FAZA 9 tugadi: MCP (8 provayder), chatbot, avto-tarjima"
python3 ROADMAP/03_HOLAT/update_progress.py V-186 ok "FAZA 9 tugadi — v1 TAYYOR"
```

---

# 🎉 v1 TUGADI

**V-001 … V-186 — 186 ta vazifa bajarildi.** Endi ARMENU **v1 MVP + AR** tayyor.

## 6.1 Funksional qabul mezonlari (TZ_MASTER/08 §6.1)

```
[ ] Mijoz QR skanerlab menyuni 3 tilda ko'ra oladi
[ ] ⚡ Mijoz taomni AR'da REAL O'LCHAMDA stolga qo'yib ko'ra oladi (iOS + Android)
[ ] AR qo'llab-quvvatlamaydigan qurilmada 3D/rasm fallback ishlaydi
[ ] Mijoz savatga qo'shib buyurtma bera oladi
[ ] Buyurtma holati real vaqtda yangilanadi
[ ] ⚡ Ofitsiant STOL RAQAMINI darhol ko'radi va tovushli bildirishnoma oladi
[ ] Oshxona KDS monitorida buyurtmalar kanban ko'rinishida
[ ] Admin barcha buyurtmalarni real vaqtda nazorat qiladi
[ ] ⚡ Har stol uchun NOYOB QR generatsiya qilinadi va PDF chop etiladi
[ ] Mijoz ofitsiant / hisob / suv chaqira oladi
[ ] AI chatbot menyu bo'yicha javob beradi (3 tilda)
[ ] Admin 3D model yarata oladi (kutubxona / AI / yuklash)
[ ] AR analitikasi ko'rsatiladi (ko'rish, konversiya, chek ta'siri)
```

## 6.2 Nofunksional qabul mezonlari (§6.2)

```
[ ] Menyu sahifasi 3G'da < 2,5 s ochiladi
[ ] API p95 < 250 ms
[ ] Lighthouse (mobil) > 90
[ ] 3D fayl ≤ 3 MB (GLB), ≤ 5 MB (USDZ)
[ ] Dark + Light tema ikkalasi ham to'liq
[ ] 3 tilda 100% tarjima (CI tekshiradi — bo'sh kalit yo'q)
[ ] Test qamrovi ≥ 75%
[ ] ⚡ Tenant izolyatsiya testi 100% o'tadi
[ ] 1000 parallel foydalanuvchi yuklama testi o'tadi
[ ] Web node o'chirilganda foydalanuvchi sezmaydi
[ ] Redis o'chirilganda menyu ishlashda davom etadi
[ ] Self-healing daemon ishlaydi va log yozadi
```

## 6.3 Biznes qabul mezonlari (§6.3)

```
[ ] 5 ta pilot restoran o'rnatilgan va ishlayapti
[ ] Kamida 100 ta 3D model kutubxonada
[ ] AR ta'siri o'lchangan (chek farqi %)
[ ] Sotuv materiallari tayyor (demo, taqdimot, video)
[ ] Narx va shartnoma tasdiqlangan
```

## Yakuniy tekshiruv buyruqlari

```bash
# 1. Barcha testlar
pytest tests/ -q --cov=apps --cov=core --cov-report=term-missing
# Coverage ≥ 75% bo'lishi SHART

# 2. Tenant izolyatsiyasi (eng muhim)
pytest tests/ -q -k "cross_tenant or tenant_isolation"
# 100% o'tishi SHART

# 3. 3 til to'liqligi
pytest tests/test_i18n_completeness.py -q

# 4. AI provayderlar
python manage.py ai_health
pytest tests/test_registry.py -q          # ≥6 provayder

# 5. Yuklama testi (1000 parallel)
locust -f tests/load/menu_load.py --headless -u 1000 -r 50 -t 3m \
       --host https://armenu.uz
# p95 < 250 ms, xato < 0.5%

# 6. Lighthouse
npx lighthouse https://armenu.uz/m/registon/ --preset=perf --form-factor=mobile
# Performance > 90

# 7. Chidamlilik (chaos)
sudo systemctl stop redis && curl -s https://armenu.uz/m/registon/ -o /dev/null -w '%{http_code}\n'
# 200 — menyu ishlashda davom etadi
sudo systemctl start redis
```

## Statistika

| Ko'rsatkich | Qiymat |
|---|---|
| Fazalar | 10 (FAZA 0 … 9) |
| Vazifalar | 186 (V-001 … V-186) |
| AI provayderlar | 8 (talab: 6+) ✅ |
| Tillar | 3 (uz / ru / en) |
| Tema | Dark + Light |
| Test qamrovi maqsadi | ≥ 75% |

---

**➡️ Keyingi:** `FAZA_10_TOLOV_FISKAL.md` (v1.5 — V-187 … V-204)

> 💰 **v1 → sotuvga tayyor.** v1.5 (to'lov + fiskal + sodiqlik) pilot restoranlar
> bilan parallel ishlanadi — TZ_MASTER/08 §2.3.
