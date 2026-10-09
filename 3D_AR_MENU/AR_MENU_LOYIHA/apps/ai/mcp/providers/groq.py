from apps.ai.mcp.openai_compat import OpenAICompatProvider
class GroqProvider(OpenAICompatProvider):
    name='groq'
    supported_tasks={'chat','translate'}
    priority={'chat':15,'translate':15}
    price_in,price_out=0.05,0.08
    MODEL='llama-3.1-8b-instant'
    BASE_URL='https://api.groq.com/openai/v1'
    ENV_KEY='GROQ_API_KEY'
