from apps.ai.mcp.openai_compat import OpenAICompatProvider
class DeepSeekProvider(OpenAICompatProvider):
    name='deepseek'
    supported_tasks={'chat','translate','reasoning'}
    priority={'chat':25,'translate':25,'reasoning':15}
    price_in,price_out=0.14,0.28
    MODEL='deepseek-chat'
    BASE_URL='https://api.deepseek.com'
    ENV_KEY='DEEPSEEK_API_KEY'
