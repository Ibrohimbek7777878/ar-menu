import 'package:flutter/foundation.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';

class LocationService {
  /// Lokatsiya ruxsatini so'rash (iOS + Android)
  /// Web uchun brauzer ruxsatini qabul qiladi.
  Future<bool> requestLocationPermission() async {
    if (kIsWeb) {
      return true;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      await Geolocator.openAppSettings();
      return false;
    }

    return true;
  }

  Future<bool> checkLocationPermission() async {
    if (kIsWeb) {
      return true;
    }

    final permission = await Geolocator.checkPermission();
    return permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse;
  }

  Future<Position?> getCurrentPosition() async {
    try {
      final hasPermission = await checkLocationPermission();
      if (!hasPermission) {
        final granted = await requestLocationPermission();
        if (!granted) {
          return null;
        }
      }

      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
    } catch (e) {
      print('Location error: $e');
      return null;
    }
  }

  Future<Position?> getLastKnownPosition() async {
    try {
      return await Geolocator.getLastKnownPosition();
    } catch (e) {
      print('Last known location error: $e');
      return null;
    }
  }

  Stream<Position> getPositionStream() {
    if (kIsWeb) {
      return const Stream<Position>.empty();
    }

    return Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    );
  }

  Future<double> calculateDistance(
    double startLatitude,
    double startLongitude,
    double endLatitude,
    double endLongitude,
  ) async {
    return Geolocator.distanceBetween(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    );
  }

  Future<String> getAddressFromCoordinates(double latitude, double longitude) async {
    try {
      final geo = Geocoding();
      final placemarks = await geo.placemarkFromCoordinates(latitude, longitude);
      if (placemarks.isNotEmpty) {
        final place = placemarks.first;
        final parts = <String>[];
        if (place.street != null && place.street!.isNotEmpty) {
          parts.add(place.street!);
        }
        if (place.locality != null && place.locality!.isNotEmpty) {
          parts.add(place.locality!);
        }
        if (place.country != null && place.country!.isNotEmpty) {
          parts.add(place.country!);
        }
        return parts.isNotEmpty ? parts.join(', ') : 'Manzil aniqlanmadi';
      }
    } catch (e) {
      print('Reverse geocoding error: $e');
    }
    return 'Manzil aniqlanmadi';
  }

  Future<bool> isLocationServiceEnabled() async {
    if (kIsWeb) {
      return true;
    }
    return await Geolocator.isLocationServiceEnabled();
  }

  Future<bool> openLocationSettings() async {
    if (kIsWeb) {
      return false;
    }
    return await Geolocator.openLocationSettings();
  }

  Future<bool> openAppSettings() async {
    if (kIsWeb) {
      return false;
    }
    return await Geolocator.openAppSettings();
  }
}
