import time
from django.conf import settings
from apps.ai.mcp.base import MCPProvider, MCPRequest, MCPResponse, parse_json
class ClaudeProvider(MCPProvider):
    name='claude'
    supported_tasks={'chat','translate','vision','reasoning'}
    priority={'chat':20,'translate':10,'vision':15,'reasoning':5}
    price_in,price_out=0.80,4.00
    MODEL='claude-haiku-4-5-20251001'
    def __init__(self):
        self.key=settings.AI_KEYS.get('ANTHROPIC_API_KEY','')
        self._client=None
    @property
    def client(self):
        if self._client is None and self.key:
            try:
                import anthropic
                self._client=anthropic.Anthropic(api_key=self.key)
            except Exception:
                self._client=False
        return self._client if self._client else None
    def is_configured(self): return bool(self.key)
    def _messages(self, req):
        msgs=[dict(m) for m in (req.messages or [{'role':'user','content':req.prompt}])]
        if req.images:
            parts=[]
            for u in req.images:
                if u.startswith('data:'):
                    header,_,b64=u.partition(',')
                    media=header.split(';')[0].replace('data:','') or 'image/jpeg'
                    parts.append({'type':'image','source':{'type':'base64','media_type':media,'data':b64}})
                else:
                    parts.append({'type':'image','source':{'type':'url','url':u}})
            last=msgs[-1]
            parts.append({'type':'text','text':last.get('content') or req.prompt})
            msgs[-1]={'role':last.get('role','user'),'content':parts}
        return msgs
    def call(self, req):
        t0=time.time()
        if not self.client: return MCPResponse(ok=False,provider=self.name,error='no_api_key')
        try:
            kwargs=dict(model=self.MODEL,max_tokens=req.max_tokens,temperature=req.temperature,messages=self._messages(req))
            if req.system: kwargs['system']=req.system
            if req.json_mode: kwargs['system']=(kwargs.get('system','')+'\n\nFaqat yaroqli JSON qaytar, boshqa matn yozma.')
            resp=self.client.messages.create(**kwargs,timeout=req.timeout)
            text=''.join(b.text for b in resp.content if getattr(b,'text',None))
            tin,tout=resp.usage.input_tokens,resp.usage.output_tokens
            return MCPResponse(ok=True,content=parse_json(text) if req.json_mode else text,provider=self.name,model=self.MODEL,tokens_in=tin,tokens_out=tout,cost_usd=self.estimate_cost(tin,tout),latency_ms=int((time.time()-t0)*1000))
        except Exception as e:
            return MCPResponse(ok=False,provider=self.name,error=str(e)[:250],latency_ms=int((time.time()-t0)*1000))
