/// Admin user entity - domain layer

import 'package:equatable/equatable.dart';

// Admin user entity
class AdminUser extends Equatable {
  final String id;
  final String email;
  final String name;
  final String role;
  final DateTime createdAt;

  const AdminUser({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.createdAt,
  });

  @override
  List<Object?> get props => [
        id,
        email,
        name,
        role,
        createdAt,
      ];

  // Factory method for creating from map
  factory AdminUser.fromJson(Map<String, dynamic> json) {
    return AdminUser(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      name: json['name'] ?? '',
      role: json['role'] ?? 'admin',
      createdAt: (json['createdAt'] as DateTime) ?? DateTime.now(),
    );
  }

  // Convert to map
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'role': role,
      'createdAt': createdAt,
    };
  }
}