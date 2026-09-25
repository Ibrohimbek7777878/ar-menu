from apps.ai.mcp.openai_compat import OpenAICompatProvider
class MistralProvider(OpenAICompatProvider):
    name='mistral'
    supported_tasks={'chat','translate'}
    priority={'chat':35,'translate':35}
    price_in,price_out=0.25,0.25
    MODEL='mistral-small-latest'
    BASE_URL='https://api.mistral.ai/v1'
    ENV_KEY='MISTRAL_API_KEY'
