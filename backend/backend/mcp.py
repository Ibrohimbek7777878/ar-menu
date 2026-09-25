"""
MCP gateway — pluggable modullar uchun minimal kontrakt.
Trading / Finance / Marketing / Investor modullari shu kontrakt orqali ulanadi.
Haqiqiy MCP serverlar (stdio/http) keyin ulanishi mumkin; asosiy kod o'zgarmaydi.
"""
from dataclasses import dataclass, field
from typing import Callable, Dict, List


@dataclass
class MCPTool:
    name: str
    description: str
    input_schema: dict
    handler: Callable


_REGISTRY: Dict[str, MCPTool] = {}


def register_tool(name, description, input_schema, handler):
    _REGISTRY[name] = MCPTool(name, description, input_schema, handler)


def list_tools() -> List[dict]:
    return [
        {"name": t.name, "description": t.description, "input_schema": t.input_schema}
        for t in _REGISTRY.values()
    ]


def call_tool(name: str, **kwargs):
    tool = _REGISTRY.get(name)
    if not tool:
        raise KeyError(f"Tool topilmadi: {name}")
    return tool.handler(**kwargs)


# ─── Misol (stub) modullar ────────────────────────────────────────────────
def _trading_price(symbol: str = "GLS") -> dict:
    return {"symbol": symbol, "price": 124500.0, "change_pct": 2.3, "note": "stub"}


def _finance_summary(shop_id: int = 0) -> dict:
    return {"shop_id": shop_id, "revenue_30d": 0, "net_profit": 0, "note": "stub"}


def _marketing_campaign(shop_id: int = 0, channel: str = "telegram") -> dict:
    return {"shop_id": shop_id, "channel": channel, "status": "draft", "note": "stub"}


def _investor_roi(shop_id: int = 0) -> dict:
    return {"shop_id": shop_id, "roi_pct": 0.0, "payback_months": 0, "note": "stub"}


register_tool(
    "trading_price",
    "Bozor narxi (stub)",
    {"type": "object", "properties": {"symbol": {"type": "string"}}},
    _trading_price,
)
register_tool(
    "finance_summary",
    "Do'kon moliyaviy xulosa (stub)",
    {"type": "object", "properties": {"shop_id": {"type": "integer"}}},
    _finance_summary,
)
register_tool(
    "marketing_campaign",
    "Marketing kampaniyasi (stub)",
    {"type": "object", "properties": {"shop_id": {"type": "integer"}, "channel": {"type": "string"}}},
    _marketing_campaign,
)
register_tool(
    "investor_roi",
    "Investor ROI (stub)",
    {"type": "object", "properties": {"shop_id": {"type": "integer"}}},
    _investor_roi,
)
