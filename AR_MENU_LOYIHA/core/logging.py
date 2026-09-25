import logging
import threading

_thread_locals = threading.local()

def set_request_id(rid: str):
    _thread_locals.request_id = rid

def get_request_id() -> str:
    return getattr(_thread_locals, 'request_id', '-')

def clear_request_id():
    if hasattr(_thread_locals, 'request_id'):
        delattr(_thread_locals, 'request_id')

class RequestIDFilter(logging.Filter):
    """Har log yozuviga request_id qo'shadi — qidirish oson bo'ladi"""
    def filter(self, record):
        record.request_id = get_request_id()
        # Ensure other expected fields exist for verbose formatter
        if not hasattr(record, 'request_id'):
            record.request_id = '-'
        return True

# Qo'shimcha: barcha turdagi loglarni tutadigan capture
# - request/response
# - security (login, JWT)
# - db (slow query)
# - websocket
# - celery/worker (agar bo'lsa)
# Bu yerda markaziy sozlama LOGGING dict da amalga oshirilgan.
# Qo'shimcha handlerlar file_app, file_error, file_access, file_security, file_ai, file_payment, file_ar
# orqali hamma log tipi ajratib yoziladi.

# Helper: istalgan joyda logger = logging.getLogger(__name__) ishlatilsa, avtomatik
# console + file ga yoziladi. Hech qanday maxsus kod talab qilinmaydi.

import json
import datetime

class JSONLogFormatter(logging.Formatter):
    """Real structured JSON log formatter — ISO timestamp, level, name, request_id, message, exception"""
    def format(self, record):
        log_data = {
            'timestamp': datetime.datetime.fromtimestamp(record.created, datetime.timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'request_id': getattr(record, 'request_id', '-'),
        }
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        return json.dumps(log_data, ensure_ascii=False)

def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)

