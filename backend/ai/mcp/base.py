"""MCP baza sinflari — ARMENU spec 07_AI_MCP.md §4.1 asosida (V12)."""
import time
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional

import requests


@dataclass
class MCPRequest:
    task: str                      # chat|translate|vision|image_to_3d|embedding
    prompt: str = ''
    system: str = ''
    messages: list = None
    images: list = None            # rasm URL yoki base64
    json_mode: bool = False
    max_tokens: int = 1500
    temperature: float = 0.3
    timeout: int = 30
    extra: dict = field(default_factory=dict)


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
    raw: dict = None

    @property
    def total_tokens(self):
        return self.tokens_in + self.tokens_out


class MCPProvider(ABC):
    """Har bir AI provayder shu interfeysni amalga oshiradi."""

    name: str = 'base'
    ENV_KEY: str = ''
    MODEL: str = ''
    TASKS: tuple = ()           # qaysi vazifalarni bajara oladi
    PRICE_IN: float = 0.0       # $ / 1M input token
    PRICE_OUT: float = 0.0      # $ / 1M output token
    PRIORITY: int = 50          # kichik raqam = avval tanlanadi
    BASE_URL: str = ''

    # ─── Holat ───
    def __init__(self):
        self.fail_count = 0
        self.opened_until = 0.0   # circuit breaker ochiq qolguncha (epoch)

    @property
    def api_key(self) -> str:
        return os.environ.get(self.ENV_KEY, '') or ''

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def is_open(self) -> bool:
        return time.time() < self.opened_until

    def record_success(self):
        self.fail_count = 0
        self.opened_until = 0.0

    def record_failure(self, threshold: int = 3, cooldown: int = 300):
        self.fail_count += 1
        if self.fail_count >= threshold:
            self.opened_until = time.time() + cooldown

    def estimate_cost(self, tokens_in: int, tokens_out: int) -> float:
        return (tokens_in / 1_000_000 * self.PRICE_IN) + (tokens_out / 1_000_000 * self.PRICE_OUT)

    @abstractmethod
    def chat(self, req: MCPRequest) -> MCPResponse:
        """Asosiy chaqiruv — har provayder o'z API shaklida amalga oshiradi."""

    def ping(self) -> MCPResponse:
        """Sog'lomlik tekshiruvi — juda kichik so'rov."""
        return self.chat(MCPRequest(task='chat', prompt='ping', max_tokens=5, timeout=10))

    # ─── Yordamchi ───
    def _post(self, url: str, payload: dict, headers: dict, req: MCPRequest) -> dict:
        r = requests.post(url, json=payload, headers=headers, timeout=req.timeout)
        if r.status_code >= 400:
            raise RuntimeError(f'{self.name} HTTP {r.status_code}: {r.text[:200]}')
        return r.json()

    def _ok(self, content, tin=0, tout=0, raw=None) -> MCPResponse:
        started = time.time()
        return MCPResponse(ok=True, content=content, provider=self.name, model=self.MODEL,
                           tokens_in=tin, tokens_out=tout, cost_usd=self.estimate_cost(tin, tout),
                           latency_ms=int((time.time() - started) * 1000) if not raw else 0, raw=raw)

    def _err(self, msg: str) -> MCPResponse:
        return MCPResponse(ok=False, provider=self.name, model=self.MODEL, error=msg)
