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