import hashlib
import logging
import time
from django.core.cache import cache
from django.conf import settings
from core.resilience import CircuitBreaker
from apps.ai.mcp.base import MCPRequest, MCPResponse
from apps.ai.mcp.registry import ALL_PROVIDERS
log=logging.getLogger('ai.mcp')
CACHEABLE_TASKS={'translate','chat','embedding'}
CACHE_TTL=getattr(settings,'AI_CACHE_TTL',3600)
class MCPRouter:
    def __init__(self):
        self.providers=[cls() for cls in ALL_PROVIDERS]
        self.breakers={p.name:CircuitBreaker(f'ai.{p.name}',fail_threshold=3,timeout=120) for p in self.providers}
    def run(self, req:MCPRequest, restaurant_id=None, use_cache=True)->MCPResponse:
        t0=time.time()
        ck=self._cache_key(req)
        if use_cache and req.task in CACHEABLE_TASKS:
            cached=cache.get(ck)
            if cached:
                resp=MCPResponse(**cached)
                resp.cached=True
                resp.cost_usd=0.0
                return resp
        if restaurant_id and not self._check_budget(restaurant_id):
            return MCPResponse(ok=False,error='AI_BUDGET_EXCEEDED')
        candidates=self._candidates(req.task)
        if not candidates:
            return MCPResponse(ok=False,error=f'NO_PROVIDER_FOR_{req.task}')
        errors=[]
        for p in candidates:
            br=self.breakers[p.name]
            if br.is_open():
                errors.append(f'{p.name}: circuit_open')
                continue
            try: resp=p.call(req)
            except Exception as e: resp=MCPResponse(ok=False,provider=p.name,error=str(e)[:200])
            if resp.ok:
                br.on_success()
                self._record(resp,restaurant_id,req.task)
                if use_cache and req.task in CACHEABLE_TASKS:
                    cache.set(ck,resp.to_dict(),CACHE_TTL)
                return resp
            br.on_failure()
            errors.append(f'{p.name}: {resp.error}')
        return MCPResponse(ok=False,error='ALL_PROVIDERS_FAILED',latency_ms=int((time.time()-t0)*1000),raw={'errors':errors})
    def _candidates(self, task:str)->list:
        ps=[p for p in self.providers if p.is_configured() and p.supports(task)]
        return sorted(ps,key=lambda p: p.priority.get(task,999))
    def _cache_key(self, req:MCPRequest)->str:
        raw=f'{req.task}|{req.system}|{req.prompt}|{req.temperature}|{req.json_mode}|{req.messages}|{req.images}'
        return f'mcp:{hashlib.sha256(raw.encode()).hexdigest()[:32]}'
    def _check_budget(self,restaurant_id)->bool:
        from django.db.models import Sum
        from django.utils import timezone
        try:
            from apps.ai.models import AIUsage
        except ImportError:
            return True
        today=timezone.localdate()
        ck=f'ai:spent:{restaurant_id}:{today}'
        spent=cache.get(ck)
        if spent is None:
            spent=float(AIUsage.objects.filter(restaurant_id=restaurant_id,created_at__date=today).aggregate(s=Sum('cost_usd'))['s'] or 0)
            cache.set(ck,spent,60)
        limit=self._restaurant_limit(restaurant_id)
        if spent>=limit: return False
        return True
    @staticmethod
    def _restaurant_limit(restaurant_id)->float:
        from django.conf import settings
        try:
            from apps.tenants.models import Restaurant
            ck=f'ai:limit:{restaurant_id}'
            v=cache.get(ck)
            if v is None:
                plan=(Restaurant.objects.filter(id=restaurant_id).values_list('plan',flat=True).first() or 'start')
                # fallback to settings
                v=float(getattr(settings,'AI_DAILY_LIMIT_PER_RESTAURANT',2.0))
                cache.set(ck,v,300)
            return v
        except Exception:
            return float(getattr(settings,'AI_DAILY_LIMIT_PER_RESTAURANT',2.0))
    def _record(self,resp, restaurant_id, task):
        try:
            from apps.ai.models import AIUsage
            AIUsage.objects.create(restaurant_id=restaurant_id,provider=resp.provider,model=resp.model,task=task,tokens_in=resp.tokens_in,tokens_out=resp.tokens_out,cost_usd=resp.cost_usd,latency_ms=resp.latency_ms,ok=True)
            if restaurant_id and resp.cost_usd:
                from django.utils import timezone
                ck=f'ai:spent:{restaurant_id}:{timezone.localdate()}'
                cur=cache.get(ck)
                if cur is not None: cache.set(ck,float(cur)+resp.cost_usd,60)
        except Exception: pass
    def status(self):
        out=[]
        for p in self.providers:
            br=self.breakers[p.name]
            out.append({'name':p.name,'model':p.MODEL,'configured':p.is_configured(),'tasks':sorted(p.supported_tasks),'circuit':'open' if br.is_open() else 'closed','price_in':p.price_in,'price_out':p.price_out})
        return out
mcp=MCPRouter()
