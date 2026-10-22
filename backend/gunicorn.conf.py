"""
gunicorn sozlamalari (TZ: R9-3). Hammasi muhit o'zgaruvchilari orqali o'zgartiriladi, kod o'zgartirilmaydi.

Standart: ishchi soni = CPU×2+1 (4 dan oshmasin: har biri ~150 MB), har ishchida 4 oqim. Ishchi oqimlari so'rovni
kutib turganda (DB, fayl) boshqa so'rovlarga xizmat qiladi; Telegram kabi tashqi chaqiruvlar so'rov ichida emas
(outbox ishchisida), shuning uchun oqimlar band bo'lib qolmaydi.
"""
import multiprocessing
import os

cpu = multiprocessing.cpu_count()
bind = os.environ.get('GUNICORN_BIND', '0.0.0.0:8000')
workers = int(os.environ.get('WEB_CONCURRENCY', min(cpu * 2 + 1, 4)))
threads = int(os.environ.get('GUNICORN_THREADS', 4))
worker_class = 'gthread'
timeout = int(os.environ.get('GUNICORN_TIMEOUT', 60))
graceful_timeout = 30
keepalive = 5
# Xotira oqishiga qarshi: ishchi vaqti-vaqti bilan yangidan boshlanadi (hamma bir vaqtda emas — jitter)
max_requests = int(os.environ.get('GUNICORN_MAX_REQUESTS', 2000))
max_requests_jitter = 200
accesslog = '-'
errorlog = '-'
# Caddy/nginx oldida: X-Forwarded-* sarlavhalariga ishonamiz (konteyner tarmog'idan tashqariga port ochilmagan)
forwarded_allow_ips = '*'
worker_tmp_dir = '/dev/shm'
