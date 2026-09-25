"""V12 — 8 ta AI provayder adapteri (ARMENU 07_AI_MCP.md §3 jadvali bo'yicha).
Chat provayderlari OpenAI-mos / native API; 3D provayderlar image→glb polling."""
import time
import requests

from .base import MCPProvider, MCPRequest, MCPResponse


# ─── 1. Anthropic Claude ─────────────────────────────────────────────
class AnthropicClaude(MCPProvider):
    name, ENV_KEY, MODEL = 'claude', 'ANTHROPIC_API_KEY', 'claude-haiku-4-5'
    TASKS = ('chat', 'translate', 'vision')
    PRICE_IN, PRICE_OUT = 0.80, 4.00
    PRIORITY = 10
    BASE_URL = 'https://api.anthropic.com/v1/messages'

    def chat(self, req: MCPRequest) -> MCPResponse:
        if not self.is_configured():
            return self._err('API key yo\'q')
        headers = {'x-api-key': self.api_key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'}
        messages = req.messages or [{'role': 'user', 'content': req.prompt}]
        payload = {'model': self.MODEL, 'max_tokens': req.max_tokens, 'messages': messages}
        if req.system:
            payload['system'] = req.system
        try:
            data = self._post(self.BASE_URL, payload, headers, req)
            text = ''.join(b.get('text', '') for b in data.get('content', []) if b.get('type') == 'text')
            resp = MCPResponse(ok=True, content=text, provider=self.name, model=self.MODEL,
                               tokens_in=data.get('usage', {}).get('input_tokens', 0),
                               tokens_out=data.get('usage', {}).get('output_tokens', 0), raw=data)
            resp.cost_usd = self.estimate_cost(resp.tokens_in, resp.tokens_out)
            return resp
        except Exception as e:
            return self._err(str(e)[:300])


# ─── 2. Google Gemini ────────────────────────────────────────────────
class GoogleGemini(MCPProvider):
    name, ENV_KEY, MODEL = 'gemini', 'GEMINI_API_KEY', 'gemini-2.0-flash'
    TASKS = ('chat', 'translate', 'vision')
    PRICE_IN, PRICE_OUT = 0.10, 0.40
    PRIORITY = 20
    BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

    def chat(self, req: MCPRequest) -> MCPResponse:
        if not self.is_configured():
            return self._err("API key yo'q")
        url = f'{self.BASE_URL}/{self.MODEL}:generateContent?key={self.api_key}'
        contents = [{'role': m.get('role', 'user'), 'parts': [{'text': m.get('content', '')}]} for m in (req.messages or [{'role': 'user', 'parts': []}])]
        if not req.messages:
            contents = [{'role': 'user', 'parts': [{'text': req.prompt}]}]
        payload = {'contents': contents, 'generationConfig': {'maxOutputTokens': req.max_tokens, 'temperature': req.temperature}}
        if req.system:
            payload['systemInstruction'] = {'parts': [{'text': req.system}]}
        try:
            data = self._post(url, payload, {}, req)
            cand = (data.get('candidates') or [{}])[0]
            parts = cand.get('content', {}).get('parts', [])
            text = ''.join(p.get('text', '') for p in parts)
            resp = MCPResponse(ok=True, content=text, provider=self.name, model=self.MODEL, raw=data)
            resp.cost_usd = self.estimate_cost(0, 0)
            return resp
        except Exception as e:
            return self._err(str(e)[:300])


# ─── 3. OpenAI ───────────────────────────────────────────────────────
class OpenAIGPT(MCPProvider):
    name, ENV_KEY, MODEL = 'openai', 'OPENAI_API_KEY', 'gpt-4o-mini'
    TASKS = ('chat', 'translate', 'vision')
    PRICE_IN, PRICE_OUT = 0.15, 0.60
    PRIORITY = 30
    BASE_URL = 'https://api.openai.com/v1/chat/completions'

    def chat(self, req: MCPRequest) -> MCPResponse:
        if not self.is_configured():
            return self._err("API key yo'q")
        messages = ([{'role': 'system', 'content': req.system}] if req.system else []) + \
                   (req.messages or [{'role': 'user', 'content': req.prompt}])
        payload = {'model': self.MODEL, 'messages': messages, 'max_tokens': req.max_tokens, 'temperature': req.temperature}
        if req.json_mode:
            payload['response_format'] = {'type': 'json_object'}
        try:
            data = self._post(self.BASE_URL, payload,
                              {'Authorization': f'Bearer {self.api_key}'}, req)
            resp = MCPResponse(ok=True, content=data['choices'][0]['message']['content'],
                               provider=self.name, model=self.MODEL,
                               tokens_in=data.get('usage', {}).get('prompt_tokens', 0),
                               tokens_out=data.get('usage', {}).get('completion_tokens', 0), raw=data)
            resp.cost_usd = self.estimate_cost(resp.tokens_in, resp.tokens_out)
            return resp
        except Exception as e:
            return self._err(str(e)[:300])


# ─── 4. Groq (juda tez) ─────────────────────────────────────────────
class GroqLlama(MCPProvider):
    name, ENV_KEY, MODEL = 'groq', 'GROQ_API_KEY', 'llama-3.3-70b-versatile'
    TASKS = ('chat', 'translate')
    PRICE_IN, PRICE_OUT = 0.59, 0.79
    PRIORITY = 40
    BASE_URL = 'https://api.groq.com/openai/v1/chat/completions'

    def chat(self, req: MCPRequest) -> MCPResponse:
        if not self.is_configured():
            return self._err("API key yo'q")
        messages = ([{'role': 'system', 'content': req.system}] if req.system else []) + \
                   (req.messages or [{'role': 'user', 'content': req.prompt}])
        payload = {'model': self.MODEL, 'messages': messages, 'max_tokens': req.max_tokens, 'temperature': req.temperature}
        try:
            data = self._post(self.BASE_URL, payload, {'Authorization': f'Bearer {self.api_key}'}, req)
            resp = MCPResponse(ok=True, content=data['choices'][0]['message']['content'],
                               provider=self.name, model=self.MODEL,
                               tokens_in=data.get('usage', {}).get('prompt_tokens', 0),
                               tokens_out=data.get('usage', {}).get('completion_tokens', 0), raw=data)
            resp.cost_usd = self.estimate_cost(resp.tokens_in, resp.tokens_out)
            return resp
        except Exception as e:
            return self._err(str(e)[:300])


# ─── 5. DeepSeek (arzon) ────────────────────────────────────────────
class DeepSeekChat(MCPProvider):
    name, ENV_KEY, MODEL = 'deepseek', 'DEEPSEEK_API_KEY', 'deepseek-chat'
    TASKS = ('chat', 'translate')
    PRICE_IN, PRICE_OUT = 0.14, 0.28
    PRIORITY = 50
    BASE_URL = 'https://api.deepseek.com/chat/completions'

    def chat(self, req: MCPRequest) -> MCPResponse:
        if not self.is_configured():
            return self._err("API key yo'q")
        messages = ([{'role': 'system', 'content': req.system}] if req.system else []) + \
                   (req.messages or [{'role': 'user', 'content': req.prompt}])
        payload = {'model': self.MODEL, 'messages': messages, 'max_tokens': req.max_tokens, 'temperature': req.temperature}
        try:
            data = self._post(self.BASE_URL, payload, {'Authorization': f'Bearer {self.api_key}'}, req)
            resp = MCPResponse(ok=True, content=data['choices'][0]['message']['content'],
                               provider=self.name, model=self.MODEL,
                               tokens_in=data.get('usage', {}).get('prompt_tokens', 0),
                               tokens_out=data.get('usage', {}).get('completion_tokens', 0), raw=data)
            resp.cost_usd = self.estimate_cost(resp.tokens_in, resp.tokens_out)
            return resp
        except Exception as e:
            return self._err(str(e)[:300])


# ─── 6. Mistral ─────────────────────────────────────────────────────
class MistralSmall(MCPProvider):
    name, ENV_KEY, MODEL = 'mistral', 'MISTRAL_API_KEY', 'mistral-small-latest'
    TASKS = ('chat', 'translate')
    PRICE_IN, PRICE_OUT = 0.20, 0.60
    PRIORITY = 60
    BASE_URL = 'https://api.mistral.ai/v1/chat/completions'

    def chat(self, req: MCPRequest) -> MCPResponse:
        if not self.is_configured():
            return self._err("API key yo'q")
        messages = ([{'role': 'system', 'content': req.system}] if req.system else []) + \
                   (req.messages or [{'role': 'user', 'content': req.prompt}])
        payload = {'model': self.MODEL, 'messages': messages, 'max_tokens': req.max_tokens, 'temperature': req.temperature}
        try:
            data = self._post(self.BASE_URL, payload, {'Authorization': f'Bearer {self.api_key}'}, req)
            resp = MCPResponse(ok=True, content=data['choices'][0]['message']['content'],
                               provider=self.name, model=self.MODEL,
                               tokens_in=data.get('usage', {}).get('prompt_tokens', 0),
                               tokens_out=data.get('usage', {}).get('completion_tokens', 0), raw=data)
            resp.cost_usd = self.estimate_cost(resp.tokens_in, resp.tokens_out)
            return resp
        except Exception as e:
            return self._err(str(e)[:300])


# ─── 7. Meshy (image→3D) ────────────────────────────────────────────
class Meshy3D(MCPProvider):
    name, ENV_KEY, MODEL = 'meshy', 'MESHY_API_KEY', 'meshy-4'
    TASKS = ('image_to_3d',)
    PRICE_OUT = 0.50
    PRIORITY = 10
    BASE_URL = 'https://api.meshy.ai/openapi/v2/image-to-3d'

    def chat(self, req: MCPRequest) -> MCPResponse:
        """req.prompt = rasm URL. Natija: glb URL (polling bilan, max ~5 min)."""
        if not self.is_configured():
            return self._err("API key yo'q")
        headers = {'Authorization': f'Bearer {self.api_key}'}
        try:
            data = self._post(self.BASE_URL,
                              {'image_url': req.prompt, 'ai_model': self.MODEL, 'topology': 'quad'},
                              headers, MCPRequest(task='image_to_3d', timeout=req.timeout))
            task_id = data.get('result')
            # Polling (max 300s)
            for _ in range(60):
                time.sleep(5)
                st = requests.get(f'{self.BASE_URL}/{task_id}', headers=headers, timeout=15).json()
                status = st.get('status')
                if status == 'SUCCEEDED':
                    url = st.get('model_urls', {}).get('glb', '')
                    resp = MCPResponse(ok=True, content=url, provider=self.name, model=self.MODEL, raw=st)
                    resp.cost_usd = self.PRICE_OUT
                    return resp
                if status == 'FAILED':
                    return self._err('Meshy task failed')
            return self._err('Meshy timeout')
        except Exception as e:
            return self._err(str(e)[:300])


# ─── 8. Tripo (image→3D) ────────────────────────────────────────────
class Tripo3D(MCPProvider):
    name, ENV_KEY, MODEL = 'tripo', 'TRIPO_API_KEY', 'tripo-v2'
    TASKS = ('image_to_3d',)
    PRICE_OUT = 0.80
    PRIORITY = 20
    BASE_URL = 'https://api.tripo3d.ai/v2/openai/task'

    def chat(self, req: MCPRequest) -> MCPResponse:
        if not self.is_configured():
            return self._err("API key yo'q")
        headers = {'Authorization': f'Bearer {self.api_key}'}
        try:
            data = self._post(self.BASE_URL, {'type': 'image_to_model', 'imageUrl': req.prompt},
                              headers, MCPRequest(task='image_to_3d', timeout=req.timeout))
            task_id = data.get('data', {}).get('task_id')
            for _ in range(60):
                time.sleep(5)
                st = requests.get(f'{self.BASE_URL}/{task_id}', headers=headers, timeout=15).json()
                status = st.get('data', {}).get('status')
                if status == 'success':
                    url = (st.get('data', {}).get('output', {}) or {}).get('model', '')
                    resp = MCPResponse(ok=True, content=url, provider=self.name, model=self.MODEL, raw=st)
                    resp.cost_usd = self.PRICE_OUT
                    return resp
                if status in ('failed', 'cancelled'):
                    return self._err(f'Tripo {status}')
            return self._err('Tripo timeout')
        except Exception as e:
            return self._err(str(e)[:300])


# ─── Registri ────────────────────────────────────────────────────────
def all_providers():
    """Yangi instance'lar (circuit holati process ichida saqlanadi — router registry ishlatadi)."""
    return [cls() for cls in (AnthropicClaude, GoogleGemini, OpenAIGPT, GroqLlama,
                              DeepSeekChat, MistralSmall, Meshy3D, Tripo3D)]
