class Category {
  final String id;
  final String name;
  final String icon;
  final String color;
  final int order;

  Category({
    required this.id,
    required this.name,
    required this.icon,
    required this.color,
    required this.order,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'],
      name: json['name'],
      icon: json['icon'],
      color: json['color'],
      order: json['order'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'icon': icon,
      'color': color,
      'order': order,
    };
  }
}