import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../services/location_service.dart';

class LocationProvider with ChangeNotifier {
  final LocationService _locationService = LocationService();

  Position? _currentPosition;
  bool _isLoading = false;
  String? _error;
  bool _locationPermissionGranted = false;

  Position? get currentPosition => _currentPosition;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get locationPermissionGranted => _locationPermissionGranted;

  Future<bool> requestLocationPermission() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _locationPermissionGranted = await _locationService.requestLocationPermission();
      _isLoading = false;
      notifyListeners();
      return _locationPermissionGranted;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> checkLocationPermission() async {
    try {
      _locationPermissionGranted = await _locationService.checkLocationPermission();
      notifyListeners();
      return _locationPermissionGranted;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> getCurrentLocation() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final hasPermission = await checkLocationPermission();
      if (!hasPermission) {
        final granted = await requestLocationPermission();
        if (!granted) {
          _error = 'Location permission denied';
          _isLoading = false;
          notifyListeners();
          return false;
        }
      }

      final position = await _locationService.getCurrentPosition();
      if (position != null) {
        _currentPosition = position;
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = 'Could not get location';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<String> getAddressFromCurrentLocation() async {
    if (_currentPosition == null) return 'Manzil aniqlanmadi';

    try {
      return await _locationService.getAddressFromCoordinates(
        _currentPosition!.latitude,
        _currentPosition!.longitude,
      );
    } catch (e) {
      return 'Manzil aniqlanmadi';
    }
  }

  Future<double> calculateDistanceToShop(double shopLat, double shopLng) async {
    if (_currentPosition == null) return 0.0;

    return await _locationService.calculateDistance(
      _currentPosition!.latitude,
      _currentPosition!.longitude,
      shopLat,
      shopLng,
    );
  }

  Future<bool> isLocationServiceEnabled() async {
    return await _locationService.isLocationServiceEnabled();
  }

  Future<void> openLocationSettings() async {
    await _locationService.openLocationSettings();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  // Set demo location for Yangiyer
  void setDemoLocation() {
    _currentPosition = Position(
      altitudeAccuracy: 0.0,
      headingAccuracy: 0.0,
      latitude: 40.5966,
      longitude: 68.7786,
      timestamp: DateTime.now(),
      accuracy: 10.0,
      altitude: 0.0,
      heading: 0.0,
      speed: 0.0,
      speedAccuracy: 0.0,
      isMocked: true,
    );
    _locationPermissionGranted = true;
    notifyListeners();
  }
}
