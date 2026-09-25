class Shop {
  final String id;
  final String name;
  final String? slug;
  final String address;
  final String? city;
  final String phone;
  final double latitude;
  final double longitude;
  final String category;
  final String imageUrl;
  final String workingHours;
  final bool isOpen;
  final bool isFastDelivery;
  final String storeType; // shop/restaurant/cafe/bar
  final bool hasAr;
  final String? colorPrimary;
  final String? instagramUrl;
  final double rating;
  final int views;
  final double minOrder;
  final double deliveryFee;
  final double freeDeliveryFrom;
  final String? categoryId;
  final int? createdAt;
  final int? updatedAt;

  Shop({
    required this.id,
    required this.name,
    this.slug,
    required this.address,
    this.city,
    required this.phone,
    required this.latitude,
    required this.longitude,
    required this.category,
    required this.imageUrl,
    required this.workingHours,
    required this.isOpen,
    this.isFastDelivery = false,
    this.storeType = 'shop',
    this.hasAr = false,
    this.colorPrimary,
    this.instagramUrl,
    required this.rating,
    this.views = 0,
    this.minOrder = 20000,
    this.deliveryFee = 5000,
    this.freeDeliveryFrom = 50000,
    this.categoryId,
    this.createdAt,
    this.updatedAt,
  });

  factory Shop.fromJson(Map<String, dynamic> json) {
    return Shop(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString(),
      address: json['address']?.toString() ?? '',
      city: json['city']?.toString(),
      phone: json['phone']?.toString() ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      category: (json['category'] ?? json['category_name'])?.toString() ?? '',
      imageUrl: (json['image'] ?? json['imageUrl'] ?? json['image_url'])?.toString() ?? '',
      workingHours: (json['working_hours'] ?? json['workingHours'])?.toString() ?? '08:00 - 22:00',
      isOpen: json['is_open'] == true || json['is_open'] == 1 || json['isOpen'] == true,
      isFastDelivery: json['is_fast_delivery'] == true || json['isFastDelivery'] == true,
      storeType: (json['store_type'] ?? json['storeType'])?.toString() ?? 'shop',
      hasAr: json['has_ar'] == true || json['hasAr'] == true,
      colorPrimary: json['color_primary']?.toString(),
      instagramUrl: json['instagram_url']?.toString(),
      rating: (json['rating'] as num?)?.toDouble() ?? 0.0,
      views: (json['views'] as num?)?.toInt() ?? 0,
      minOrder: (json['min_order'] as num?)?.toDouble() ?? 20000.0,
      deliveryFee: (json['delivery_fee'] as num?)?.toDouble() ?? 5000.0,
      freeDeliveryFrom: (json['free_delivery_from'] as num?)?.toDouble() ?? 50000.0,
      categoryId: json['category_id']?.toString() ?? json['categoryId']?.toString(),
      createdAt: json['created_at'] is int ? json['created_at'] as int : null,
      updatedAt: json['updated_at'] is int ? json['updated_at'] as int : null,
    );
  }

  factory Shop.fromMap(Map<String, dynamic> map) {
    return Shop(
      id: map['id']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      slug: map['slug']?.toString(),
      address: map['address']?.toString() ?? '',
      city: map['city']?.toString(),
      phone: map['phone']?.toString() ?? '',
      latitude: (map['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (map['longitude'] as num?)?.toDouble() ?? 0.0,
      imageUrl: (map['image_url'] ?? map['imageUrl'] ?? map['image'])?.toString() ?? '',
      workingHours: '${map['opening_time'] ?? ''}${map['closing_time'] != null ? ' - ${map['closing_time']}' : ''}',
      isOpen: map['is_open'] == 1 || map['isOpen'] == true || map['is_open'] == true,
      isFastDelivery: map['is_fast_delivery'] == 1 || map['is_fast_delivery'] == true,
      rating: (map['rating'] as num?)?.toDouble() ?? 0.0,
      minOrder: (map['min_order'] as num?)?.toDouble() ?? 20000.0,
      deliveryFee: (map['delivery_fee'] as num?)?.toDouble() ?? 5000.0,
      freeDeliveryFrom: (map['free_delivery_from'] as num?)?.toDouble() ?? 50000.0,
      category: (map['category'] ?? map['category_id'] ?? map['categoryId'])?.toString() ?? '',
      categoryId: map['category_id']?.toString() ?? map['categoryId']?.toString(),
      createdAt: map['created_at'] is int ? map['created_at'] as int : null,
      updatedAt: map['updated_at'] is int ? map['updated_at'] as int : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'address': address,
      'city': city,
      'phone': phone,
      'latitude': latitude,
      'longitude': longitude,
      'category': category,
      'imageUrl': imageUrl,
      'workingHours': workingHours,
      'isOpen': isOpen,
      'rating': rating,
      'categoryId': categoryId,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'address': address,
      'city': city,
      'phone': phone,
      'latitude': latitude,
      'longitude': longitude,
      'opening_time': workingHours.contains(' - ') ? workingHours.split(' - ').first : workingHours,
      'closing_time': workingHours.contains(' - ') ? workingHours.split(' - ').last : null,
      'is_open': isOpen ? 1 : 0,
      'is_fast_delivery': isFastDelivery ? 1 : 0,
      'rating': rating,
      'image_url': imageUrl,
      'category_id': categoryId,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }
}
