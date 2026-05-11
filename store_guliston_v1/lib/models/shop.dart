class Shop {
  final String id;
  final String name;
  final String address;
  final String phone;
  final double latitude;
  final double longitude;
  final String category;
  final String imageUrl;
  final String workingHours;
  final bool isOpen;
  final double rating;

  Shop({
    required this.id,
    required this.name,
    required this.address,
    required this.phone,
    required this.latitude,
    required this.longitude,
    required this.category,
    required this.imageUrl,
    required this.workingHours,
    required this.isOpen,
    required this.rating,
  });

  factory Shop.fromJson(Map<String, dynamic> json) {
    return Shop(
      id: json['id'],
      name: json['name'],
      address: json['address'],
      phone: json['phone'],
      latitude: json['latitude'],
      longitude: json['longitude'],
      category: json['category'],
      imageUrl: json['imageUrl'],
      workingHours: json['workingHours'],
      isOpen: json['isOpen'],
      rating: json['rating'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'address': address,
      'phone': phone,
      'latitude': latitude,
      'longitude': longitude,
      'category': category,
      'imageUrl': imageUrl,
      'workingHours': workingHours,
      'isOpen': isOpen,
      'rating': rating,
    };
  }
}