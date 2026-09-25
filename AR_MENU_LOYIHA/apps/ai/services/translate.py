import logging
from django.core.cache import cache
from apps.ai.mcp import mcp, MCPRequest
from apps.ai.prompts import TRANSLATE_SYSTEM, LANG_NAMES_NATIVE
log=logging.getLogger('ai.translate')
def translate_batch(texts, source='uz', target='ru', restaurant_id=None, use_cache=True):
    if not texts: return []
    key=f'trans:{source}:{target}:|'.join(texts)
    ck=f'trans:{hash(key) % 10000000}'
    if use_cache:
        cached=cache.get(ck)
        if cached: return cached
    # Try real AI
    try:
        resp=mcp.run(MCPRequest(task='translate', prompt=str(texts), system=TRANSLATE_SYSTEM.format(source_name=LANG_NAMES_NATIVE.get(source,source), target_name=LANG_NAMES_NATIVE.get(target,target), items=str(texts)), json_mode=True, max_tokens=2000, temperature=0.2), restaurant_id=restaurant_id)
        if resp.ok and isinstance(resp.content, dict):
            out=[resp.content.get(str(i)) or resp.content.get(i) or texts[i] for i in range(len(texts))]
            cache.set(ck,out,86400)
            return out
    except Exception as e:
        log.warning(f'[translate] AI xato demo fallback: {e}')
    # Demo fallback: simple transliteration-like
    demo=[]
    for t in texts:
        if not t: demo.append('')
        elif target=='ru': demo.append(t + ' (RU)')
        elif target=='en': demo.append(t + ' (EN)')
        else: demo.append(t)
    cache.set(ck,demo,3600)
    return demo
