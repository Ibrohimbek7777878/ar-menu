from backend.runtime_cache import get_app_settings


def site_context(request):
    settings = get_app_settings()  # jarayon ichidagi qisqa kesh (S1-2); nusxa, o'zgartirish xavfsiz

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

    from django.conf import settings as django_settings
    raw_scope = str(settings.get('panel_scope') or getattr(django_settings, 'PANEL_SCOPE', 'restaurant')).strip().lower()
    panel_scope = raw_scope if raw_scope in ('restaurant', 'all') else 'restaurant'

    raw_ai = settings.get('ai_assistant')
    if raw_ai is None:
        raw_ai = getattr(django_settings, 'AI_ASSISTANT', False)
    ai_assistant = str(raw_ai).strip().lower() in ('1', 'true', 'yes', 'on') if not isinstance(raw_ai, bool) else raw_ai

    return {
        'public_settings': settings,
        'cart_count': cart_count,
        'cart_total': cart_total,
        'panel_scope': panel_scope,
        'ai_assistant': ai_assistant,
    }

