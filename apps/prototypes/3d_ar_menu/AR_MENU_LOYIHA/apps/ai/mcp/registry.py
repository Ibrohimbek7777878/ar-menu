from apps.ai.mcp.providers.claude import ClaudeProvider
from apps.ai.mcp.providers.gemini import GeminiProvider
from apps.ai.mcp.providers.openai_p import OpenAIProvider
from apps.ai.mcp.providers.groq import GroqProvider
from apps.ai.mcp.providers.deepseek import DeepSeekProvider
from apps.ai.mcp.providers.mistral import MistralProvider
from apps.ai.mcp.providers.meshy import MeshyProvider
from apps.ai.mcp.providers.tripo import TripoProvider

ALL_PROVIDERS = [
    ClaudeProvider,
    GeminiProvider,
    OpenAIProvider,
    GroqProvider,
    DeepSeekProvider,
    MistralProvider,
    MeshyProvider,
    TripoProvider,
]
