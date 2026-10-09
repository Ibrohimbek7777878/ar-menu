class Category {
  final String id;
  final String name;
  final String iconUrl;
  final String color;
  final int sortOrder;

  Category({
    required this.id,
    required this.name,
    this.iconUrl = '',
    this.color = '#4CAF50',
    this.sortOrder = 0,
  });

  factory Category.fromMap(Map<String, dynamic> map) {
    return Category(
      id: map['id']?.toString() ?? '',
      name: (map['name_uz'] ?? map['name'])?.toString() ?? '',
      iconUrl: (map['icon_url'] ?? map['icon'])?.toString() ?? '',
      color: map['color']?.toString() ?? '#4CAF50',
      sortOrder: (map['sort_order'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'icon_url': iconUrl,
      'color': color,
      'sort_order': sortOrder,
    };
  }

  Map<String, dynamic> toJson() => toMap();

  factory Category.fromJson(Map<String, dynamic> json) => Category.fromMap(json);
}