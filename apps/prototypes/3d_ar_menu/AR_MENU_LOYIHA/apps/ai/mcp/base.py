import json
import logging
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from typing import Any, Optional

log = logging.getLogger('ai.mcp')

TASKS = {'chat', 'translate', 'vision', 'reasoning', 'image_to_3d', 'embedding'}

_FENCE_RE = re.compile(r'^\s*```(?:json)?\s*|\s*```\s*$', re.M)


def strip_fences(text: str) -> str:
    return _FENCE_RE.sub('', text or '').strip()


def parse_json(text: str):
    cleaned = strip_fences(text)
    try:
        return json.loads(cleaned)
    except Exception:
        m = re.search(r'\{.*\}|\[.*\]', cleaned, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                pass
        log.warning(f'[MCP] JSON parse bo\'lmadi: {cleaned[:120]}')
        return cleaned


@dataclass
class MCPRequest:
    task: str
    prompt: str = ''
    system: str = ''
    messages: Optional[list] = None
    images: Optional[list] = None
    json_mode: bool = False
    max_tokens: int = 1500
    temperature: float = 0.3
    timeout: int = 30
    extra: dict = field(default_factory=dict)

    def __post_init__(self):
        if self.task not in TASKS:
            raise ValueError(f'Noma\'lum vazifa: {self.task}')
        self.max_tokens = max(1, min(int(self.max_tokens), 8000))
        self.temperature = max(0.0, min(float(self.temperature), 2.0))
        self.timeout = max(3, min(int(self.timeout), 900))


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
    cached: bool = False
    raw: Optional[dict] = None

    def to_dict(self):
        return asdict(self)


class MCPProvider(ABC):
    name: str = ''
    supported_tasks: set = frozenset()
    priority: dict = {}
    price_in: float = 0.0
    price_out: float = 0.0
    MODEL: str = ''

    @abstractmethod
    def is_configured(self) -> bool:
        pass

    @abstractmethod
    def call(self, req: MCPRequest) -> MCPResponse:
        pass

    def health_check(self) -> bool:
        if not self.is_configured():
            return False
        try:
            r = self.call(MCPRequest(task='chat', prompt='ping', max_tokens=5, timeout=8))
            return r.ok
        except Exception:
            return False

    def estimate_cost(self, tin: int, tout: int) -> float:
        return round((tin * self.price_in + tout * self.price_out) / 1_000_000, 6)

    def supports(self, task: str) -> bool:
        return task in self.supported_tasks

    def __repr__(self):
        return f'<{self.__class__.__name__} {self.name}>'
