import json
import time
import logging
import redis
from django.conf import settings

log = logging.getLogger('core.queue')
_pool = None

QUEUES = ['model3d', 'fiscal', 'notify', 'ai', 'analytics']


def get_redis():
    global _pool
    if _pool is None:
        _pool = redis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)
    return redis.Redis(connection_pool=_pool)


def enqueue(queue: str, job_type: str, delay: int = 0, **payload) -> int:
    """Vazifani navbatga qo'yadi. Job DB'da, ID Redis'da."""
    assert queue in QUEUES, f'Noma\'lum navbat: {queue}'
    from core.models_job import Job
    job = Job.objects.create(queue=queue, type=job_type, payload=payload, status='queued')
    r = get_redis()
    if delay:
        r.zadd(f'q:{queue}:delayed', {str(job.id): time.time() + delay})
    else:
        r.lpush(f'q:{queue}', str(job.id))
    log.info(f'[queue] {queue}/{job_type} → job#{job.id}')
    return job.id


def dequeue(queue: str, timeout: int = 5):
    """Worker chaqiradi. Kechiktirilganlarni ham tekshiradi."""
    r = get_redis()
    now = time.time()
    ready = r.zrangebyscore(f'q:{queue}:delayed', 0, now, start=0, num=10)
    for jid in ready:
        r.zrem(f'q:{queue}:delayed', jid)
        r.lpush(f'q:{queue}', jid)

    res = r.brpop(f'q:{queue}', timeout=timeout)
    return int(res[1]) if res else None


def queue_depth(queue: str) -> int:
    r = get_redis()
    return r.llen(f'q:{queue}') + r.zcard(f'q:{queue}:delayed')
