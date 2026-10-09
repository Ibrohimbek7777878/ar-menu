class Product {
  final String id;
  final String shopId;
  final String? categoryId;
  final String name;
  final String? slug;
  final String description;
  final double price;
  final double? oldPrice;
  final String category;
  final String imageUrl;
  final String unit; // dona, kg, litr, etc.
  final bool isAvailable;
  final int stock;
  final List<dynamic> variants;
  final String? arModel;
  final int? createdAt;
  final bool isFastDelivery;
  final bool has3d;
  final bool isHit;
  final bool isNew;
  final List<String> dietTags;
  final List<String> allergens;
  final int? cookMin;
  final double? flashPrice;
  final String? flashUntil;
  final bool flashActive;
  final double? effectivePrice;
  final int flashSecondsLeft;

  Product({
    required this.id,
    required this.shopId,
    this.categoryId,
    required this.name,
    this.slug,
    required this.description,
    required this.price,
    this.oldPrice,
    required this.category,
    required this.imageUrl,
    required this.unit, // dona, kg, litr, etc.
    required this.isAvailable,
    required this.stock,
    this.variants = const [],
    this.arModel,
    this.createdAt,
    this.isFastDelivery = false,
    this.has3d = false,
    this.isHit = false,
    this.isNew = false,
    this.dietTags = const [],
    this.allergens = const [],
    this.cookMin,
    this.flashPrice,
    this.flashUntil,
    this.flashActive = false,
    this.effectivePrice,
    this.flashSecondsLeft = 0,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id']?.toString() ?? '',
      shopId: (json['shopId'] ?? json['shop_id'] ?? json['shop']?['id'] ?? '')?.toString() ?? '',
      categoryId: (json['categoryId'] ?? json['category_id'] ?? json['category'])?.toString(),
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString(),
      description: json['description']?.toString() ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      oldPrice: (json['old_price'] as num?)?.toDouble(),
      category: (json['category_name'] ?? json['category'])?.toString() ?? '',
      imageUrl: (json['image'] ?? json['imageUrl'] ?? json['image_url'])?.toString() ?? '',
      unit: json['unit']?.toString() ?? 'dona',
      isAvailable: json['is_available'] == true || json['is_available'] == 1 || json['isAvailable'] == true,
      stock: (json['stock'] as num?)?.toInt() ?? (json['stock_quantity'] as num?)?.toInt() ?? 10,
      variants: json['variants'] is List ? json['variants'] as List : const [],
      arModel: json['ar_model']?.toString(),
      createdAt: json['created_at'] is int ? json['created_at'] as int : null,
      isFastDelivery: json['is_fast_delivery'] == true || json['is_fast_delivery'] == 1,
      has3d: json['has_3d'] == true || json['has3d'] == true,
      isHit: json['is_hit'] == true,
      isNew: json['is_new'] == true,
      dietTags: (json['diet_tags'] as List?)?.map((e) => e.toString()).toList() ?? const [],
      allergens: (json['allergens'] as List?)?.map((e) => e.toString()).toList() ?? const [],
      cookMin: (json['cook_min'] as num?)?.toInt(),
      flashPrice: (json['flash_price'] as num?)?.toDouble(),
      flashUntil: json['flash_until']?.toString(),
      flashActive: json['flash_active'] == true,
      effectivePrice: (json['effective_price'] as num?)?.toDouble(),
      flashSecondsLeft: (json['flash_seconds_left'] as num?)?.toInt() ?? 0,
    );
  }

  factory Product.fromMap(Map<String, dynamic> map) {
    return Product(
      id: map['id']?.toString() ?? '',
      shopId: (map['shop_id'] ?? map['shopId'])?.toString() ?? '',
      categoryId: (map['category_id'] ?? map['categoryId'])?.toString(),
      name: map['name']?.toString() ?? '',
      slug: map['slug']?.toString(),
      description: map['description']?.toString() ?? '',
      price: (map['price'] as num?)?.toDouble() ?? 0.0,
      oldPrice: (map['old_price'] as num?)?.toDouble(),
      category: (map['category'] ?? map['category_name'])?.toString() ?? '',
      imageUrl: (map['image_url'] ?? map['imageUrl'] ?? map['image'])?.toString() ?? '',
      unit: map['unit']?.toString() ?? 'dona',
      isAvailable: map['is_available'] == 1 || map['is_available'] == true || map['isAvailable'] == true,
      stock: (map['stock_quantity'] as num?)?.toInt() ?? (map['stock'] as num?)?.toInt() ?? 10,
      variants: map['variants'] is List ? map['variants'] as List : const [],
      arModel: map['ar_model']?.toString(),
      createdAt: map['created_at'] as int? ?? map['createdAt'] as int?,
      isFastDelivery: map['is_fast_delivery'] == 1 || map['is_fast_delivery'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'shopId': shopId,
      'categoryId': categoryId,
      'name': name,
      'description': description,
      'price': price,
      'category': category,
      'imageUrl': imageUrl,
      'unit': unit,
      'isAvailable': isAvailable,
      'stock': stock,
      'createdAt': createdAt,
      'is_fast_delivery': isFastDelivery,
    };
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'shop_id': shopId,
      'category_id': categoryId,
      'name': name,
      'description': description,
      'price': price,
      'image_url': imageUrl,
      'unit': unit,
      'is_available': isAvailable ? 1 : 0,
      'stock_quantity': stock,
      'created_at': createdAt,
      'is_fast_delivery': isFastDelivery ? 1 : 0,
    };
  }
}
