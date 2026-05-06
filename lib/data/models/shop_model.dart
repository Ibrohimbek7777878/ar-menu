/// Shop model - data layer

import 'package:equatable/equatable.dart';

// Shop model for data layer
class ShopModel extends Equatable {
  final String id;
  final String name;
  final String address;
  final String city;
  final String phoneNumber;
  final String startTime;
  final String endTime;
  final double latitude;
  final double longitude;
  final bool isActive;

  const ShopModel({
    required this.id,
    required this.name,
    required this.address,
    required this.city,
    required this.phoneNumber,
    required this.startTime,
    required this.endTime,
    required this.latitude,
    required this.longitude,
    required this.isActive,
  });

  @override
  List<Object?> get props => [
        id,
        name,
        address,
        city,
        phoneNumber,
        startTime,
        endTime,
        latitude,
        longitude,
        isActive,
      ];

  // Factory method for creating from map
  factory ShopModel.fromJson(Map<String, dynamic> json) {
    return ShopModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      address: json['address'] ?? '',
      city: json['city'] ?? '',
      phoneNumber: json['phoneNumber'] ?? '',
      startTime: json['startTime'] ?? '',
      endTime: json['endTime'] ?? '',
      latitude: json['latitude'] ?? 0.0,
      longitude: json['longitude'] ?? 0.0,
      isActive: json['isActive'] ?? true,
    );
  }

  // Convert to map
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'address': address,
      'city': city,
      'phoneNumber': phoneNumber,
      'startTime': startTime,
      'endTime': endTime,
      'latitude': latitude,
      'longitude': longitude,
      'isActive': isActive,
    };
  }
}