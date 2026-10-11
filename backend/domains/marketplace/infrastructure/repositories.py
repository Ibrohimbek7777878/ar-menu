from typing import Optional, List
from products.models import Product
from shops.models import Shop


class ProductRepository:
    @staticmethod
    def get_by_id(product_id: int) -> Optional[Product]:
        try:
            return Product.objects.select_related('shop', 'category').get(pk=product_id)
        except Product.DoesNotExist:
            return None

    @staticmethod
    def search_by_query(query: str, limit: int = 50) -> List[Product]:
        return list(
            Product.objects.filter(name__icontains=query, is_available=True)
            .select_related('shop', 'category')[:limit]
        )
