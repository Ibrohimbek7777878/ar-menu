import time, requests
from django.conf import settings
from apps.ai.mcp.base import MCPProvider, MCPRequest, MCPResponse, parse_json
class GeminiProvider(MCPProvider):
    name='gemini'
    supported_tasks={'chat','translate','vision','embedding'}
    priority={'chat':10,'translate':20,'vision':10,'embedding':10}
    price_in,price_out=0.10,0.40
    MODEL='gemini-2.0-flash'
    EMBED_MODEL='text-embedding-004'
    BASE='https://generativelanguage.googleapis.com/v1beta'
    def __init__(self): self.key=settings.AI_KEYS.get('GEMINI_API_KEY','')
    def is_configured(self): return bool(self.key)
    def _contents(self, req):
        out=[]
        for m in (req.messages or [{'role':'user','content':req.prompt}]):
            role='model' if m.get('role')=='assistant' else 'user'
            out.append({'role':role,'parts':[{'text':m.get('content','')}]})
        if req.images:
            parts=out[-1]['parts']
            for u in req.images:
                if u.startswith('data:'):
                    header,_,b64=u.partition(',')
                    mime=header.split(';')[0].replace('data:','') or 'image/jpeg'
                    parts.insert(0,{'inline_data':{'mime_type':mime,'data':b64}})
                else:
                    parts.insert(0,{'file_data':{'file_uri':u}})
        return out
    def call(self, req):
        if req.task=='embedding': return self._embed(req)
        t0=time.time()
        try:
            body={'contents':self._contents(req),'generationConfig':{'maxOutputTokens':req.max_tokens,'temperature':req.temperature}}
            if req.system: body['systemInstruction']={'parts':[{'text':req.system}]}
            if req.json_mode: body['generationConfig']['responseMimeType']='application/json'
            r=requests.post(f'{self.BASE}/models/{self.MODEL}:generateContent',params={'key':self.key},json=body,timeout=req.timeout)
            if r.status_code>=400: return MCPResponse(ok=False,provider=self.name,error=f'HTTP {r.status_code}: {r.text[:200]}',latency_ms=int((time.time()-t0)*1000))
            d=r.json()
            cands=d.get('candidates') or []
            if not cands: return MCPResponse(ok=False,provider=self.name,error=f'no_candidates: {str(d)[:150]}')
            text=''.join(p.get('text','') for p in cands[0]['content'].get('parts',[]))
            um=d.get('usageMetadata') or {}
            tin=um.get('promptTokenCount',0); tout=um.get('candidatesTokenCount',0)
            return MCPResponse(ok=True,content=parse_json(text) if req.json_mode else text,provider=self.name,model=self.MODEL,tokens_in=tin,tokens_out=tout,cost_usd=self.estimate_cost(tin,tout),latency_ms=int((time.time()-t0)*1000))
        except requests.Timeout: return MCPResponse(ok=False,provider=self.name,error='timeout')
        except Exception as e: return MCPResponse(ok=False,provider=self.name,error=str(e)[:250])
    def _embed(self, req):
        t0=time.time()
        try:
            r=requests.post(f'{self.BASE}/models/{self.EMBED_MODEL}:embedContent',params={'key':self.key},timeout=req.timeout,json={'model':f'models/{self.EMBED_MODEL}','content':{'parts':[{'text':req.prompt}]}})
            r.raise_for_status()
            vec=r.json()['embedding']['values']
            return MCPResponse(ok=True,content=vec,provider=self.name,model=self.EMBED_MODEL,latency_ms=int((time.time()-t0)*1000))
        except Exception as e: return MCPResponse(ok=False,provider=self.name,error=str(e)[:250])
