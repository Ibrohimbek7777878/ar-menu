import logging
from celery import shared_task
from .outbox import process_outbox_batch

logger = logging.getLogger(__name__)


@shared_task(name='notifications.tasks.process_outbox_queue', bind=True, max_retries=3)
def process_outbox_queue(self, batch_size=50):
    """
    Transactional Outbox navbatini qayta ishlovchi Celery taski.
    1,000+ foydalanuvchi bir vaqtda kirganda server xabarnoma/push yuborish
    bilan bloklanmasdan, ushbu task asinxron tarzda navbatni tozalaydi.
    """
    try:
        result = process_outbox_batch(batch_size=batch_size)
        return result
    except Exception as exc:
        logger.error(f"[OutboxTask] Error during batch processing: {exc}")
        raise self.retry(exc=exc, countdown=5)
