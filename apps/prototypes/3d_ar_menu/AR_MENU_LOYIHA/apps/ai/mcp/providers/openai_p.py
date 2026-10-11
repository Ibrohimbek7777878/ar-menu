from apps.ai.mcp.openai_compat import OpenAICompatProvider
class OpenAIProvider(OpenAICompatProvider):
    name='openai'
    supported_tasks={'chat','translate','vision'}
    priority={'chat':30,'translate':30,'vision':20}
    price_in,price_out=0.15,0.60
    MODEL='gpt-4o-mini'
    BASE_URL='https://api.openai.com/v1'
    ENV_KEY='OPENAI_API_KEY'
    SUPPORTS_VISION=True
    SUPPORTS_JSON_MODE=True
