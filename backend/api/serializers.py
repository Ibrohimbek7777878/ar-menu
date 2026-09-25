"""
Flutter API Serializers — Mobile app uchun API serializerlar.
"""
from rest_framework import serializers
from accounts.models import Customer
from categories.models import Category
from shops.models import Shop, ShopTemplate
from products.models import Product, ProductBundle
from orders.models import Order, OrderItem, OrderStatusHistory
from payments.models import Payment


# ─── AUTH ────────────────────────────────────────────────────────────

class CustomerRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = Customer
        fields = ['name', 'phone', 'password', 'password_confirm', 'address']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Parollar mos kelmaydi")
        if Customer.objects.filter(phone=data['phone']).exists():
            raise serializers.ValidationError("Bu telefon raqam allaqachon ro'yxatdan o'tgan")
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        # create_user — Customer modelining classmethod'i (Manager'da emas)
        customer = Customer.create_user(
            phone=validated_data['phone'],
            name=validated_data.get('name', ''),
            address=validated_data.get('address', ''),
            password=validated_data['password'],
        )
        return customer


class CustomerLoginSerializer(serializers.Serializer):
    phone = serializers.CharField()
    password = serializers.CharField()

    def validate(self, data):
        from django.contrib.auth import authenticate
        user = authenticate(phone=data['phone'], password=data['password'])
        if not user:
            raise serializers.ValidationError("Telefon raqam yoki parol xato")
        data['user'] = user
        return data


class CustomerProfileSerializer(serializers.ModelSerializer):
    orders_count = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'phone', 'address', 'latitude', 'longitude',
            'total_orders', 'total_spent', 'bonus', 'last_order_at', 'orders_count', 'created_at'
        ]
        read_only_fields = ['id', 'total_orders', 'total_spent', 'bonus', 'last_order_at', 'created_at']

    def get_orders_count(self, obj):
        return obj.orders.count() if hasattr(obj, 'orders') else 0


# ─── CATALOG ─────────────────────────────────────────────────────────

class CategorySerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'name_uz', 'name_ru', 'name_en', 'icon', 'color', 'sort_order', 'is_active', 'products_count']

    def get_products_count(self, obj):
        return obj.products.count() if hasattr(obj, 'products') else 0


class ShopListSerializer(serializers.ModelSerializer):
    distance = serializers.SerializerMethodField()

    class Meta:
        model = Shop
        fields = [
            'id', 'name', 'slug', 'address', 'phone', 'image',
            'rating', 'reviews_count', 'views', 'min_order', 'delivery_fee',
            'free_delivery_from', 'is_open', 'is_verified', 'is_fast_delivery', 'plan',
            'working_hours', 'distance', 'store_type', 'has_ar', 'color_primary', 'instagram_url'
        ]

    def get_distance(self, obj):
        return getattr(obj, 'distance', None)


class ShopDetailSerializer(serializers.ModelSerializer):
    distance = serializers.SerializerMethodField()
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = Shop
        fields = [
            'id', 'name', 'slug', 'description', 'address', 'phone', 'phone2',
            'latitude', 'longitude', 'image', 'banner', 'rating', 'reviews_count', 'views',
            'min_order', 'delivery_fee', 'free_delivery_from', 'is_open',
            'is_verified', 'is_fast_delivery', 'plan', 'working_hours', 'working_days',
            'distance', 'products_count', 'created_at', 'store_type', 'has_ar', 'color_primary', 'color_accent', 'instagram_url'
        ]

    def get_distance(self, obj):
        return getattr(obj, 'distance', None)

    def get_products_count(self, obj):
        return obj.products.count() if hasattr(obj, 'products') else 0


class ProductListSerializer(serializers.ModelSerializer):
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    shop_id = serializers.IntegerField(source='shop.id', read_only=True)
    is_fast_delivery = serializers.BooleanField(source='shop.is_fast_delivery', read_only=True)
    flash_active = serializers.BooleanField(read_only=True)
    effective_price = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)
    flash_seconds_left = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'price', 'old_price', 'unit', 'image',
            'category', 'is_available', 'stock', 'rating', 'reviews_count',
            'is_organic', 'is_halal', 'shop_name', 'shop_id', 'weight_g', 'variants', 'ar_model',
            'is_fast_delivery', 'has_3d', 'is_hit', 'is_new', 'diet_tags', 'allergens', 'cook_min', 'ikpu_code',
            'flash_price', 'flash_until', 'flash_active', 'effective_price', 'flash_seconds_left'
        ]


class ProductDetailSerializer(serializers.ModelSerializer):
    shop = ShopListSerializer(read_only=True)
    reviews = serializers.SerializerMethodField()
    is_fast_delivery = serializers.BooleanField(source='shop.is_fast_delivery', read_only=True)
    flash_active = serializers.BooleanField(read_only=True)
    effective_price = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)
    flash_seconds_left = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'price', 'old_price',
            'unit', 'min_quantity', 'brand', 'manufacturer', 'country_of_origin',
            'weight', 'volume', 'pack_size', 'image', 'image2', 'image3', 'ar_model',
            'is_available', 'stock', 'is_organic', 'is_halal', 'expiry_date',
            'calories', 'protein', 'fat', 'carbs', 'ingredients', 'tags',
            'barcode', 'rating', 'reviews_count', 'width_mm', 'height_mm',
            'depth_mm', 'weight_g', 'variants', 'shop', 'reviews', 'created_at',
            'is_fast_delivery', 'has_3d', 'is_hit', 'is_new', 'diet_tags', 'allergens', 'cook_min', 'ikpu_code', 'ingredients_translated',
            'flash_price', 'flash_until', 'flash_active', 'effective_price', 'flash_seconds_left'
        ]

    def get_reviews(self, obj):
        from notifications.models import Review
        reviews = Review.objects.filter(product=obj).order_by('-created_at')[:10]
        return ReviewSerializer(reviews, many=True).data


class ProductBundleSerializer(serializers.ModelSerializer):
    products = ProductListSerializer(many=True, read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)
    class Meta:
        model = ProductBundle
        fields = ['id','name','slug','shop','products','bundle_price','original_price','discount_percent','is_active','created_at']

class ProductBundleCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    product_ids = serializers.ListField(child=serializers.IntegerField())
    bundle_price = serializers.DecimalField(max_digits=12, decimal_places=0)
    shop_id = serializers.IntegerField(required=False)


class ReviewSerializer(serializers.ModelSerializer):
    # Review modelida customer_name maydoni yo'q — customer FK orqali olinadi
    customer_name = serializers.CharField(source='customer.name', read_only=True, default='')

    class Meta:
        from notifications.models import Review
        model = Review
        fields = ['id', 'customer_name', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'created_at']


# ─── CART ────────────────────────────────────────────────────────────

class CartItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class CartSerializer(serializers.Serializer):
    items = CartItemSerializer(many=True)
    shop_id = serializers.IntegerField(required=False)


# ─── ORDERS ──────────────────────────────────────────────────────────

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'price', 'quantity', 'unit', 'total'
        ]


class OrderListSerializer(serializers.ModelSerializer):
    items_count = serializers.SerializerMethodField()
    shop_name = serializers.CharField(source='shop.name', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer_name', 'shop', 'shop_name',
            'total_amount', 'delivery_fee', 'final_amount', 'status',
            'is_pickup', 'items_count', 'created_at', 'bonus_used', 'bonus_earned'
        ]

    def get_items_count(self, obj):
        return obj.items.count()


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    history = serializers.SerializerMethodField()
    shop_name = serializers.CharField(source='shop.name', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer_name', 'customer_phone_1',
            'customer_phone_2', 'shop', 'shop_name', 'delivery_address',
            'delivery_lat', 'delivery_lng', 'notes', 'total_amount',
            'delivery_fee', 'discount_amount', 'final_amount', 'status',
            'is_pickup', 'cancel_reason', 'items', 'history',
            'created_at', 'delivered_at', 'bonus_used', 'bonus_earned'
        ]

    def get_history(self, obj):
        history = obj.history.all().order_by('created_at')
        return OrderStatusHistorySerializer(history, many=True).data


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = ['id', 'status', 'note', 'created_at']


class OrderCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=20)
    address = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True)
    coupon_code = serializers.CharField(required=False, allow_blank=True, default='')
    bonus_used = serializers.DecimalField(max_digits=12, decimal_places=0, required=False, default=0)
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)
    accuracy = serializers.FloatField(required=False, allow_null=True)
    is_pickup = serializers.BooleanField(default=False)
    items = CartItemSerializer(many=True)

    def validate(self, attrs):
        lat, lng = attrs.get('lat'), attrs.get('lng')
        if lat is not None and not (-90 <= lat <= 90):
            raise serializers.ValidationError({'lat': 'Kenglik -90..90 oralig\'ida bo\'lishi kerak'})
        if lng is not None and not (-180 <= lng <= 180):
            raise serializers.ValidationError({'lng': 'Uzunlik -180..180 oralig\'ida bo\'lishi kerak'})
        acc = attrs.get('accuracy')
        if acc is not None and not (0 <= acc <= 100000):
            raise serializers.ValidationError({'accuracy': 'Aniqlik 0..100000 m oralig\'ida bo\'lishi kerak'})
        return attrs


# ─── PAYMENTS ────────────────────────────────────────────────────────

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'merchant_transaction_id', 'provider', 'status',
            'amount', 'currency', 'payment_url', 'paid_at', 'created_at'
        ]


class PaymentCreateSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    provider = serializers.ChoiceField(choices=['click', 'payme', 'uzcard', 'cash'])


# ─── DELIVERY ────────────────────────────────────────────────────────

class DeliveryQuoteSerializer(serializers.Serializer):
    shop_id = serializers.IntegerField()
    lat = serializers.FloatField()
    lng = serializers.FloatField()
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=0)
    weight_kg = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, default=0)


class DeliveryQuoteResponseSerializer(serializers.Serializer):
    zone_name = serializers.CharField()
    distance_km = serializers.FloatField()
    base_fee = serializers.DecimalField(max_digits=10, decimal_places=0)
    distance_fee = serializers.DecimalField(max_digits=10, decimal_places=0)
    peak_fee = serializers.DecimalField(max_digits=10, decimal_places=0)
    weight_fee = serializers.DecimalField(max_digits=10, decimal_places=0)
    discount = serializers.DecimalField(max_digits=10, decimal_places=0)
    total_fee = serializers.DecimalField(max_digits=10, decimal_places=0)
    is_free = serializers.BooleanField()
    estimated_minutes = serializers.IntegerField()


# ─── COUPONS & WISHLIST ──────────────────────────────────────────────

class CouponValidateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50)
    order_amount = serializers.DecimalField(max_digits=12, decimal_places=0, default=0)


class WishlistToggleSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()


# ─── SHOP BUILDER IMPORT ───────────────────────────────────────────

class ShopImportSerializer(serializers.Serializer):
    source_shop_id = serializers.IntegerField()
    product_ids = serializers.ListField(child=serializers.IntegerField(), required=False)


class ShopManualProductsSerializer(serializers.Serializer):
    section_index = serializers.IntegerField()
    product_ids = serializers.ListField(child=serializers.IntegerField())


# ─── SHOP TEMPLATES (60+ Figma preview) ───────────────────────────────

class ShopTemplateSerializer(serializers.ModelSerializer):
    preview_url = serializers.SerializerMethodField()
    preview_mobile_url = serializers.SerializerMethodField()
    preview_desktop_url = serializers.SerializerMethodField()
    layout = serializers.SerializerMethodField()
    colors = serializers.SerializerMethodField()
    fonts = serializers.SerializerMethodField()

    class Meta:
        model = ShopTemplate
        fields = [
            'id', 'name', 'slug', 'category',
            'preview_image', 'preview_mobile', 'preview_desktop',
            'layout', 'colors', 'fonts',
            'available_sections', 'required_plan', 'is_premium', 'tags',
            'preview_url', 'preview_mobile_url', 'preview_desktop_url',
            'is_active', 'sort_order', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_preview_url(self, obj):
        return obj.get_preview_url('desktop')

    def get_preview_mobile_url(self, obj):
        return obj.get_preview_url('mobile')

    def get_preview_desktop_url(self, obj):
        return obj.get_preview_url('desktop')

    def get_layout(self, obj):
        return obj.get_default_layout()

    def get_colors(self, obj):
        return obj.get_default_colors()

    def get_fonts(self, obj):
        return obj.get_default_fonts()


class ShopTemplateListSerializer(serializers.ModelSerializer):
    preview_url = serializers.SerializerMethodField()
    preview_mobile_url = serializers.SerializerMethodField()

    class Meta:
        model = ShopTemplate
        fields = ['id', 'name', 'slug', 'category', 'preview_image', 'is_premium', 'is_active', 'sort_order', 'tags', 'preview_url', 'preview_mobile_url', 'required_plan']

    def get_preview_url(self, obj):
        return obj.get_preview_url('desktop')

    def get_preview_mobile_url(self, obj):
        return obj.get_preview_url('mobile')

