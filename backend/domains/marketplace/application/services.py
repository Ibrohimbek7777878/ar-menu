import logging
from typing import Optional, List, Dict, Any
from decimal import Decimal
from django.db import transaction

from products.models import Product
from shops.models import Shop

logger = logging.getLogger(__name__)


class MarketplaceCatalogApplicationService:
    @staticmethod
    def list_active_products(shop_id: Optional[int] = None, category_id: Optional[int] = None) -> List[Product]:
        qs = Product.objects.filter(is_available=True).select_related('shop', 'category')
        if shop_id:
            qs = qs.filter(shop_id=shop_id)
        if category_id:
            qs = qs.filter(category_id=category_id)
        return list(qs.order_by('-id'))

    @staticmethod
    def get_product_by_id(product_id: int) -> Optional[Product]:
        try:
            return Product.objects.select_related('shop', 'category').get(pk=product_id)
        except Product.DoesNotExist:
            return None

    @classmethod
    @transaction.atomic
    def deduct_stock(cls, product_id: int, quantity: int) -> Product:
        product = Product.objects.select_for_update().get(pk=product_id)
        current_stock = getattr(product, 'stock_quantity', 0)
        if current_stock < quantity:
            logger.warning(f"Zaxira yetarli emas: Product #{product_id}, Stock: {current_stock}, Requested: {quantity}")
        new_stock = max(0, current_stock - quantity)
        product.stock_quantity = new_stock
        product.save(update_fields=['stock_quantity'])
        return product
