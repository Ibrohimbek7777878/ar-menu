import time
import requests
import logging
from django.conf import settings
from apps.ai.mcp.base import MCPProvider, MCPRequest, MCPResponse

log = logging.getLogger('ai.mcp.meshy')

class MeshyProvider(MCPProvider):
    name = 'meshy'
    supported_tasks = {'image_to_3d'}
    priority = {'image_to_3d': 10}
    price_in, price_out = 0, 0
    MODEL = 'meshy-4'

    def __init__(self):
        self.key = getattr(settings, 'AI_KEYS', {}).get('MESHY_API_KEY', '') or getattr(settings, 'MESHY_API_KEY', '')

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
            # Multi-image endpoint if >= 2 photos, else single image
            if len(images) >= 2:
                url = 'https://api.meshy.ai/openapi/v1/multi-image-to-3d'
                payload = {
                    'image_urls': images[:4],
                    'enable_pbr': True,
                    'should_remesh': True,
                    'target_polycount': 35000,
                }
            else:
                url = 'https://api.meshy.ai/openapi/v1/image-to-3d'
                payload = {
                    'image_url': images[0],
                    'enable_pbr': True,
                    'should_remesh': True,
                    'target_polycount': 35000,
                }

            log.info(f'[meshy] Task jo\'natilmoqda: {url}, {len(images)} ta rasm')
            r = requests.post(url, json=payload, headers=headers, timeout=30)
            if not r.ok:
                log.warning(f'[meshy] API xatolik ({r.status_code}): {r.text[:300]}')
                return MCPResponse(ok=False, provider=self.name, error=f'HTTP {r.status_code}: {r.text[:200]}')

            task_data = r.json()
            task_id = task_data.get('result')
            if not task_id:
                return MCPResponse(ok=False, provider=self.name, error='no_task_id_returned')

            # Poll for completion
            poll_url = f'{url}/{task_id}'
            max_wait = req.timeout or 300
            start_poll = time.time()

            while time.time() - start_poll < max_wait:
                time.sleep(5)
                pr = requests.get(poll_url, headers=headers, timeout=20)
                if not pr.ok:
                    continue
                pj = pr.json()
                status = pj.get('status')
                progress = pj.get('progress', 0)
                log.info(f'[meshy] task {task_id} holat: {status} ({progress}%)')

                if status == 'SUCCEEDED':
                    model_urls = pj.get('model_urls', {})
                    glb_url = model_urls.get('glb')
                    if not glb_url:
                        return MCPResponse(ok=False, provider=self.name, error='succeeded_but_no_glb_url')
                    return MCPResponse(
                        ok=True,
                        provider=self.name,
                        content={
                            'glb_url': glb_url,
                            'thumbnail': pj.get('thumbnail_url', ''),
                        },
                        cost_usd=0.50,
                        latency_ms=int((time.time() - t0) * 1000),
                    )
                elif status in ('FAILED', 'EXPIRED'):
                    err = pj.get('task_error', {}).get('message') or 'generation_failed'
                    return MCPResponse(ok=False, provider=self.name, error=err)

            return MCPResponse(ok=False, provider=self.name, error='timeout_waiting_for_3d')

        except Exception as e:
            return MCPResponse(ok=False, provider=self.name, error=str(e)[:200], latency_ms=int((time.time() - t0) * 1000))

