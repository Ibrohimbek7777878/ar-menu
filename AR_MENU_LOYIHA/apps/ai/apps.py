import logging

from django.apps import AppConfig

log = logging.getLogger('ai')


class AIConfig(AppConfig):
    name = 'apps.ai'
    label = 'ai'

    def ready(self):
        import os
        if os.environ.get('RUN_MAIN') == 'false':
            return
        try:
            from apps.ai.mcp import mcp
        except Exception as e:
            log.warning(f'[AI] router yuklanmadi: {e}')
            return
        try:
            configured = [p.name for p in mcp.providers if p.is_configured()]
            chat = [p for p in mcp.providers if p.is_configured() and 'chat' in p.supported_tasks]
            three_d = [p for p in mcp.providers if p.is_configured() and 'image_to_3d' in p.supported_tasks]
            log.info(f'[AI] Sozlangan provayderlar ({len(configured)}): {configured}')
            if len(chat) < 2:
                log.warning('⚠️ [AI] Kamida 2 ta chat provayderi tavsiya etiladi')
            if not three_d:
                log.warning("⚠️ [AI] 3D provayder yo'q — AI model generatsiyasi ishlamaydi")
            if not configured:
                log.error('⛔ [AI] HECH BIR provayder sozlanmagan!')
        except Exception:
            pass
