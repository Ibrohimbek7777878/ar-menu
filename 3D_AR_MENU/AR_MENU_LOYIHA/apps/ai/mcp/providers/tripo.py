import time
import requests
import logging
from django.conf import settings
from apps.ai.mcp.base import MCPProvider, MCPRequest, MCPResponse

log = logging.getLogger('ai.mcp.tripo')

class TripoProvider(MCPProvider):
    name = 'tripo'
    supported_tasks = {'image_to_3d'}
    priority = {'image_to_3d': 20}
    price_in, price_out = 0, 0
    MODEL = 'tripo-v2'

    def __init__(self):
        self.key = getattr(settings, 'AI_KEYS', {}).get('TRIPO_API_KEY', '') or getattr(settings, 'TRIPO_API_KEY', '')

    def is_configured(self):
        return bool(self.key)

    def call(self, req: MCPRequest) -> MCPResponse:
        t0 = time.time()
        if not self.is_configured():
            return MCPResponse(ok=False, provider=self.name, error='no_api_key')

        images = req.images or []
        if not images:
            return MCPResponse(ok=False, provider=self.name, error='no_images')

        headers = {
            'Authorization': f'Bearer {self.key}',
            'Content-Type': 'application/json',
        }

        try:
            if len(images) >= 2:
                payload = {
                    'type': 'multiview_to_model',
                    'files': [{'type': 'jpg', 'url': img} for img in images[:4]],
                }
            else:
                payload = {
                    'type': 'image_to_model',
                    'file': {'type': 'jpg', 'url': images[0]},
                }

            log.info(f'[tripo] Task jo\'natilmoqda: {payload["type"]}, {len(images)} ta rasm')
            r = requests.post('https://api.tripo3d.ai/v2/openapi/task', json=payload, headers=headers, timeout=30)
            if not r.ok:
                log.warning(f'[tripo] API xato ({r.status_code}): {r.text[:200]}')
                return MCPResponse(ok=False, provider=self.name, error=f'HTTP {r.status_code}: {r.text[:200]}')

            data = r.json()
            task_id = data.get('data', {}).get('task_id')
            if not task_id:
                return MCPResponse(ok=False, provider=self.name, error='no_task_id')

            max_wait = req.timeout or 300
            start_poll = time.time()
            while time.time() - start_poll < max_wait:
                time.sleep(5)
                pr = requests.get(f'https://api.tripo3d.ai/v2/openapi/task/{task_id}', headers=headers, timeout=20)
                if not pr.ok:
                    continue
                pj = pr.json().get('data', {})
                status = pj.get('status')
                log.info(f'[tripo] task {task_id} holat: {status}')
                if status == 'success':
                    output = pj.get('output', {})
                    glb_url = output.get('model') or output.get('pbr_model')
                    if not glb_url:
                        return MCPResponse(ok=False, provider=self.name, error='success_no_model_url')
                    return MCPResponse(
                        ok=True,
                        provider=self.name,
                        content={'glb_url': glb_url, 'thumbnail': ''},
                        cost_usd=0.80,
                        latency_ms=int((time.time() - t0) * 1000),
                    )
                elif status in ('failed', 'cancelled'):
                    return MCPResponse(ok=False, provider=self.name, error='tripo_task_failed')

            return MCPResponse(ok=False, provider=self.name, error='timeout')

        except Exception as e:
            return MCPResponse(ok=False, provider=self.name, error=str(e)[:200], latency_ms=int((time.time() - t0) * 1000))

