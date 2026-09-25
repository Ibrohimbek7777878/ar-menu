from notifications.models import AppSetting


def site_context(request):
    settings = {}
    for s in AppSetting.objects.all():
        settings[s.key] = s.value

    cart = request.session.get('cart', {})
    cart_count = 0
    cart_total = 0
    for key, val in cart.items():
        if isinstance(val, dict):
            if any(isinstance(v, dict) for v in val.values()):
                # Multi-vendor: shop_key -> {pid: {'quantity': ..., 'price': ...}}
                for pid, item in val.items():
                    if isinstance(item, dict):
                        q = int(item.get('quantity', 1) or 1)
                        p = int(float(item.get('price', 0) or 0))
                        cart_count += q
                        cart_total += p * q
            else:
                # pid -> {'quantity': 1, 'price': 100}
                q = int(val.get('quantity', 1) or 1)
                p = int(float(val.get('price', 0) or 0))
                cart_count += q
                cart_total += p * q
        else:
            try:
                q = int(val)
                cart_count += q
                from products.models import Product
                product = Product.objects.filter(id=key).first()
                if product:
                    cart_total += int(product.price) * q
            except Exception:
                pass

    return {
        'public_settings': settings,
        'cart_count': cart_count,
        'cart_total': cart_total,
    }
