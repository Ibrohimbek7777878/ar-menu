import logging
from django.utils import timezone
log=logging.getLogger('reviews')

def handle_review(order, rating, text='', lang='uz', guest=None, table=None):
    from apps.reviews.models import Review, ReviewSettings
    from apps.tenants.models import Restaurant
    # Ensure settings exist
    settings, _ = ReviewSettings.objects.get_or_create(restaurant=order.restaurant, defaults={'is_active':True,'public_threshold':4})
    # 5 star -> public + google redirect, 1-3 -> admin only
    is_public = rating >= settings.public_threshold
    redirected = False
    external = ''
    if rating >=5 and settings.google_place_url:
        redirected=True
        external='google'
    elif rating >=4 and settings.google_place_url and rating>=settings.public_threshold:
        redirected=True
        external='google'
    review=Review.objects.create(restaurant=order.restaurant, order=order, guest=guest, table=table, rating=rating, text=text[:1000], lang=lang, is_public=is_public, redirected_to_google=redirected, external_target=external, status='new')
    log.info(f'[review] order#{order.id} {rating}⭐ public={is_public} redirect={external}')
    return review

def review_stats(restaurant_id):
    from apps.reviews.models import Review
    from django.db.models import Avg, Count
    agg=Review.objects.filter(restaurant_id=restaurant_id).aggregate(avg=Avg('rating'), cnt=Count('id'))
    public=Review.objects.filter(restaurant_id=restaurant_id, is_public=True).count()
    return {'avg': round(float(agg['avg'] or 0),2), 'total': agg['cnt'] or 0, 'public': public}
