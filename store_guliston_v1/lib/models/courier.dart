class Courier {
  final String id;
  final String name;
  final String phone;
  final String status;
  final int? createdAt;

  Courier({
    required this.id,
    required this.name,
    required this.phone,
    this.status = 'active',
    this.createdAt,
  });

  factory Courier.fromMap(Map<String, dynamic> map) {
    return Courier(
      id: map['id'],
      name: map['name'],
      phone: map['phone'],
      status: map['status'] ?? 'active',
      createdAt: map['created_at'] as int?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'status': status,
      'created_at': createdAt ?? DateTime.now().millisecondsSinceEpoch ~/ 1000,
    };
  }
}