import logging

log = logging.getLogger('ar3d.worker')


def handle(job):
    """Model3D job handler — faqat run_model3d_worker ishlatadi."""
    log.info(f'[ar3d/handler] Job#{job.id} — run_model3d_worker orqali bajarilishi kerak')
    return {'note': 'delegated to run_model3d_worker'}
