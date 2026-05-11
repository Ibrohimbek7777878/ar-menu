class Product {
  final String id;
  final String shopId;
  final String name;
  final String description;
  final double price;
  final String category;
  final String imageUrl;
  final String unit; // dona, kg, litr, etc.
  final bool isAvailable;
  final int stock;

  Product({
    required this.id,
    required this.shopId,
    required this.name,
    required this.description,
    required this.price,
    required this.category,
    required this.imageUrl,
    required this.unit,
    required this.isAvailable,
    required this.stock,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'],
      shopId: json['shopId'],
      name: json['name'],
      description: json['description'],
      price: json['price'],
      category: json['category'],
      imageUrl: json['imageUrl'],
      unit: json['unit'],
      isAvailable: json['isAvailable'],
      stock: json['stock'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'shopId': shopId,
      'name': name,
      'description': description,
      'price': price,
      'category': category,
      'imageUrl': imageUrl,
      'unit': unit,
      'isAvailable': isAvailable,
      'stock': stock,
    };
  }
}