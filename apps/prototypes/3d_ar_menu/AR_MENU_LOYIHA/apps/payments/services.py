import logging, hashlib, time
from django.conf import settings
log=logging.getLogger('payments')

DEMO_MODE = not any([settings.AI_KEYS.get('OPENAI_API_KEY'), getattr(settings,'PAYME_KEY',''), getattr(settings,'CLICK_SECRET','')])

def _demo_id(prefix, order_id):
    return f"{prefix}_demo_{order_id}_{int(time.time())}"

def create_payme(order, amount, return_url=None):
    """Demo: Payme create"""
    if not getattr(settings,'PAYME_KEY',''):
        log.info('[pay] PAYME_KEY yo\'q — demo rejim')
        return {'ok':True,'provider':'payme','pay_url':f'/demo/payme/{order.id}/','transaction_id':_demo_id('payme',order.id),'demo':True}
    # Real paytechuz would be called here
    try:
        from paytechuz import Payme
        # placeholder
        return {'ok':True,'provider':'payme','pay_url':'','transaction_id':''}
    except Exception as e:
        return {'ok':False,'error':str(e)}

def create_click(order, amount):
    if not getattr(settings,'CLICK_SECRET',''):
        return {'ok':True,'provider':'click','pay_url':f'/demo/click/{order.id}/','transaction_id':_demo_id('click',order.id),'demo':True}
    return {'ok':True,'provider':'click','pay_url':'','transaction_id':''}

def create_uzum(order, amount):
    if not getattr(settings,'UZUM_SECRET',''):
        return {'ok':True,'provider':'uzum','pay_url':f'/demo/uzum/{order.id}/','transaction_id':_demo_id('uzum',order.id),'demo':True}
    return {'ok':True,'provider':'uzum','pay_url':'','transaction_id':''}

def verify_payment(provider, transaction_id):
    # Demo always success after 2 sec
    return {'ok':True,'status':'paid','demo':True}
