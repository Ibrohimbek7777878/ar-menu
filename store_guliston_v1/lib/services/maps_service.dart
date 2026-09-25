import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';

/// Google Maps uchun universal servis (iOS + Android)
///
/// Bu servis Google Maps, geocoding va geolocator paketlaridan foydalanadi.
/// Yandex Maps dan farqli o'laroq, bu iOS da ham ishlaydi.
class MapsService {
  /// 1. Reverse Geocoding: Koordinata → Manzil
  /// Masalan: (40.5966, 68.7786) → "Markaziy ko'cha, Yangi Yer, O'zbekiston"
  Future<String?> getAddressFromLatLng(double lat, double lng) async {
    try {
      final geo = Geocoding();
      final placemarks = await geo.placemarkFromCoordinates(lat, lng);

      if (placemarks.isEmpty) return null;

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

      return parts.isNotEmpty ? parts.join(', ') : null;
    } catch (e) {
      print('MapsService - Reverse geocoding error: $e');
      return null;
    }
  }

  /// 2. Forward Geocoding: Manzil → Koordinata
  /// Masalan: "Yangi Yer, Markaziy ko'cha 45" → LatLng(40.5966, 68.7786)
  Future<MapsLatLng?> getLatLngFromAddress(String address) async {
    try {
      final geo = Geocoding();
      final locations = await geo.locationFromAddress(address);

      if (locations.isEmpty) return null;

      final location = locations.first;
      return MapsLatLng(location.latitude, location.longitude);
    } catch (e) {
      print('MapsService - Forward geocoding error: $e');
      return null;
    }
  }

  /// 3. Joriy lokatsiyani olish
  /// iOS da permission dialog avtomatik chiqadi
  Future<MapsLatLng?> getCurrentLocation() async {
    try {
      // iOS da permission tekshirish
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          print('MapsService - Location permission denied');
          return null;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        print('MapsService - Location permission permanently denied');
        return null;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      return MapsLatLng(position.latitude, position.longitude);
    } catch (e) {
      print('MapsService - Current location error: $e');
      return null;
    }
  }
}

/// Koordinatalarni saqlash uchun oddiy class
class MapsLatLng {
  final double latitude;
  final double longitude;

  MapsLatLng(this.latitude, this.longitude);

  @override
  String toString() => 'MapsLatLng($latitude, $longitude)';
}