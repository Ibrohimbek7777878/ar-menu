import logging
log=logging.getLogger('fiscal.ofd')
def create_receipt(order, fiscal_data=None):
    # Demo: OFD provider not configured -> return demo receipt
    log.info(f'[ofd] demo receipt for order#{order.id} total={order.total}')
    return {'ok':True,'demo':True,'fiscal_id':f'demo_fiscal_{order.id}','qr':'https://ofd.demo/qr/{order.id}','provider':'demo'}
def check_receipt(fiscal_id):
    return {'ok':True,'status':'done','demo':True}
