import logging
from typing import Dict, Any, Optional
from django.conf import settings

logger = logging.getLogger(__name__)

PRODUCT_RESTAURANT = 'restaurant'
PRODUCT_MARKETPLACE = 'marketplace'
PRODUCT_STUDIO_3D = 'studio_3d'


class MultiBotDispatcher:
    """
    3 ta mustaqil mahsulot botlarini markaziy boshqarish va yo'naltirish.
    1. Restoran Boti (@marketing_orign_bot)
    2. Online Store (Marketplace) Boti
    3. 3D Studio Boti
    """
    @classmethod
    def get_bot_token(cls, product_type: str) -> Optional[str]:
        if product_type == PRODUCT_RESTAURANT:
            return getattr(settings, 'TELEGRAM_BOT_TOKEN', None) or getattr(settings, 'TELEGRAM_RESTAURANT_BOT_TOKEN', None)
        elif product_type == PRODUCT_MARKETPLACE:
            return getattr(settings, 'TELEGRAM_MARKET_BOT_TOKEN', None) or getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
        elif product_type == PRODUCT_STUDIO_3D:
            return getattr(settings, 'TELEGRAM_STUDIO_BOT_TOKEN', None) or getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
        return None

    @classmethod
    def log_incoming_event(cls, product_type: str, update_id: Any, chat_id: Any, text: str = ''):
        logger.info(f"[MultiBot][{product_type}] Incoming from chat={chat_id}, update_id={update_id}: {text[:50]}")
