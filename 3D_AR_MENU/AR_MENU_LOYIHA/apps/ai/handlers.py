import logging

log = logging.getLogger('ai')


def handle(job):
    """AI handler — hozircha log + done."""
    log.info(f'[ai] Job#{job.id} ({job.type}) — stub handler, done')
    return {'ai_processed': True}
