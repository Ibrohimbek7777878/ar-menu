"""V12 MCP Router — kod faqat VAZIFA aytadi, router provayderni o'zi tanlaydi:
1. Vazifa turini aniqlash → 2. mos provayderlar (prioritet) → 3. circuit breaker →
4. kunlik byudjet → 5. chaqiruv, xato bo'lsa keyingisi → 6. AIUsage log → 7. kesh."""
import hashlib
import logging
import time

from django.core.cache import cache

from .base import MCPRequest, MCPResponse
from .providers import all_providers

logger = logging.getLogger(__name__)

# Vazifa → provayder prioritet tartibi (kichik PRIORITY avval)
TASK_PRIORITY = {
    'chat': ['groq', 'gemini', 'deepseek', 'openai', 'mistral', 'claude'],
    'translate': ['gemini', 'deepseek', 'openai', 'mistral', 'claude', 'groq'],
    'vision': ['gemini', 'openai', 'claude'],
    'image_to_3d': ['meshy', 'tripo'],
}
# Kunlik byudjet (USD) — env MCP_DAILY_BUDGET orqali oshiriladi
import os as _os
DAILY_BUDGET = float(_os.environ.get('MCP_DAILY_BUDGET', '5') or 5)


class MCPRouter:
    def __init__(self):
        self._registry = {p.name: p for p in all_providers()}

    # ─── Holat ───
    def providers_status(self) -> list:
        from ai.models import AIUsage
        import datetime
        today_start = datetime.datetime.combine(datetime.date.today(), datetime.time.min,
                                                tzinfo=datetime.timezone.utc)
        rows = []
        for p in self._registry.values():
            today = AIUsage.objects.filter(provider=p.name, created_at__gte=today_start)
            rows.append({
                'name': p.name, 'model': p.MODEL, 'tasks': list(p.TASKS),
                'configured': p.is_configured(), 'env_key': p.ENV_KEY,
                'circuit_open': p.is_open(), 'fail_count': p.fail_count,
                'priority': TASK_PRIORITY.get('chat', []) and TASK_PRIORITY,
                'calls_today': today.count(), 'errors_today': today.filter(ok=False).count(),
                'cost_today': round(float(sum(today.values_list('cost_usd', flat=True) or [0])), 4),
            })
        return rows

    def today_cost(self) -> float:
        from ai.models import AIUsage
        import datetime
        start = datetime.datetime.combine(datetime.date.today(), datetime.time.min,
                                          tzinfo=datetime.timezone.utc)
        return float(sum(AIUsage.objects.filter(created_at__gte=start)
                         .values_list('cost_usd', flat=True)))

    # ─── Asosiy chaqiruv ───
    def run(self, task: str, prompt: str = '', system: str = '', use_cache: bool = True,
            max_tokens: int = 1500, **kwargs) -> MCPResponse:
        req = MCPRequest(task=task, prompt=prompt, system=system, max_tokens=max_tokens, **kwargs)

        # 7. Kesh — bir xil so'rov 60 daqiqagacha
        cache_key = 'mcp:' + hashlib.sha256(f'{task}|{system}|{prompt}|{max_tokens}'.encode()).hexdigest()[:40]
        if use_cache:
            cached = cache.get(cache_key)
            if cached is not None:
                cached.cached = True
                return cached

        order = TASK_PRIORITY.get(task, list(self._registry.keys()))
        # Prioritet bo'yicha saralash, faqat shu vazifani bajara oladiganlar
        candidates = sorted(
            [self._registry[n] for n in order if n in self._registry and task in self._registry[n].TASKS],
            key=lambda p: p.PRIORITY,
        )
        if not candidates:
            return MCPResponse(ok=False, error=f"'{task}' vazifasi uchun provayder yo'q")

        errors = []
        for p in candidates:
            if not p.is_configured():
                errors.append(f"{p.name}: kalit yo'q")
                continue
            if p.is_open():
                errors.append(f'{p.name}: circuit ochiq')
                continue
            if self.today_cost() >= DAILY_BUDGET:
                return MCPResponse(ok=False, error=f'Kunlik byudjet (${DAILY_BUDGET}) tugadi')
            resp = p.chat(req)
            self._log(p, task, resp, prompt[:200])
            if resp.ok:
                p.record_success()
                if use_cache:
                    cache.set(cache_key, resp, 3600)
                return resp
            p.record_failure()
            errors.append(f'{p.name}: {resp.error[:80]}')
            logger.warning('MCP %s xato: %s', p.name, resp.error[:120])

        return MCPResponse(ok=False, error='Barcha provayderlar yiqildi: ' + '; '.join(errors[:6]))

    # ─── Sog'lomlik tekshiruvi (mcp_check komandasi) ───
    def check_all(self) -> list:
        results = []
        for p in self._registry.values():
            if not p.is_configured():
                results.append({'provider': p.name, 'status': 'no_key'})
                continue
            resp = p.ping()
            if resp.ok:
                p.record_success()
                results.append({'provider': p.name, 'status': 'ok', 'latency_ms': resp.latency_ms})
            else:
                p.record_failure()
                results.append({'provider': p.name, 'status': 'error', 'error': resp.error[:100]})
        return results

    def _log(self, provider, task, resp, preview):
        try:
            from ai.models import AIUsage
            AIUsage.objects.create(
                provider=provider.name, model=provider.MODEL, task=task,
                ok=resp.ok, tokens_in=resp.tokens_in, tokens_out=resp.tokens_out,
                cost_usd=resp.cost_usd, latency_ms=resp.latency_ms,
                error=resp.error[:300] if resp.error else '',
                prompt_preview=preview,
            )
        except Exception as e:  # log buzilsa ham asosiy oqim to'xtamasin
            logger.warning('AIUsage yozilmadi: %s', e)


router = MCPRouter()
