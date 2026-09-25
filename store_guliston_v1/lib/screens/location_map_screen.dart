import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_map/flutter_map.dart';
import '../models/shop.dart';
import '../providers/location_provider.dart';
import '../providers/shop_provider.dart';
import '../config/app_colors.dart';

class LocationMapScreen extends StatefulWidget {
  const LocationMapScreen({super.key});

  @override
  State<LocationMapScreen> createState() => _LocationMapScreenState();
}

class _LocationMapScreenState extends State<LocationMapScreen> {
  bool _isLoading = false;
  String _currentAddress = 'Manzil aniqlanmadi';

  @override
  void initState() {
    super.initState();
    _loadLocation();
  }

  Future<void> _loadLocation() async {
    setState(() => _isLoading = true);
    final locationProvider = Provider.of<LocationProvider>(context, listen: false);
    await locationProvider.checkLocationPermission();
    await locationProvider.getCurrentLocation();
    await _refreshAddress();
    setState(() => _isLoading = false);
  }

  Future<void> _refreshAddress() async {
    final locationProvider = Provider.of<LocationProvider>(context, listen: false);
    if (locationProvider.currentPosition != null) {
      final address = await locationProvider.getAddressFromCurrentLocation();
      setState(() => _currentAddress = address);
    }
  }

  Future<void> _openDirections(Shop shop) async {
    final locationProvider = Provider.of<LocationProvider>(context, listen: false);
    final position = locationProvider.currentPosition;
    if (position == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Iltimos, avval joylashuvni aniqlang'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final origin = '${position.latitude},${position.longitude}';
    final destination = '${shop.latitude},${shop.longitude}';
    final googleUrl = Uri.parse('https://www.google.com/maps/dir/?api=1&origin=$origin&destination=$destination');
    final launchMode = kIsWeb ? LaunchMode.platformDefault : LaunchMode.externalApplication;

    if (await canLaunchUrl(googleUrl)) {
      await launchUrl(googleUrl, mode: launchMode);
      return;
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Yo\'l ko\'rsatish uchun xarita ilovasi topilmadi'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  List<Shop> _getNearbyShops(List<Shop> shops, Position? position) {
    if (position == null) {
      return <Shop>[];
    }

    final nearby = shops.where((shop) => shop.isOpen).toList();
    nearby.sort((a, b) {
      final da = Geolocator.distanceBetween(
        position.latitude,
        position.longitude,
        a.latitude,
        a.longitude,
      );
      final db = Geolocator.distanceBetween(
        position.latitude,
        position.longitude,
        b.latitude,
        b.longitude,
      );
      return da.compareTo(db);
    });
    return nearby.take(6).toList();
  }

  @override
  Widget build(BuildContext context) {
    final shopProvider = Provider.of<ShopProvider>(context);
    final locationProvider = Provider.of<LocationProvider>(context);
    final nearbyShops = _getNearbyShops(shopProvider.shops, locationProvider.currentPosition);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Xarita va lokatsiya'),
        backgroundColor: AppColors.primaryGreen,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            MapPreviewCard(position: locationProvider.currentPosition),
            const SizedBox(height: 20),
            LocationStatusCard(
              position: locationProvider.currentPosition,
              isLoading: _isLoading,
              permissionGranted: locationProvider.locationPermissionGranted,
              error: locationProvider.error,
              address: _currentAddress,
              onRefresh: _loadLocation,
              onOpenSettings: () async {
                await locationProvider.openLocationSettings();
                await _loadLocation();
              },
              onSetDemoLocation: () {
                Provider.of<LocationProvider>(context, listen: false).setDemoLocation();
                _refreshAddress();
              },
            ),
            const SizedBox(height: 20),
            NearbyShopsSection(
              shops: nearbyShops,
              currentPosition: locationProvider.currentPosition,
              onOpenDirections: _openDirections,
            ),
            const SizedBox(height: 32),
            Text(
              'Guliston: 40.4897, 68.7842. Xarita uchun ruxsat va yo\'nalishlar uchun Google/Yandex Maps ilovasini ishlating.',
              style: const TextStyle(fontSize: 13, color: AppColors.textGray),
            ),
          ],
        ),
      ),
    );
  }
}

class MapPreviewCard extends StatelessWidget {
  final Position? position;

  const MapPreviewCard({super.key, required this.position});

  @override
  Widget build(BuildContext context) {
    // Guliston city center coordinates: 40.4897, 68.7842
    const gulistonCenter = LatLng(40.4897, 68.7842);
    final userPos = position != null
        ? LatLng(position!.latitude, position!.longitude)
        : gulistonCenter;

    return Container(
      height: 220,
      decoration: BoxDecoration(
        borderRadius: AppRadius.xlargeRadius,
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: AppRadius.xlargeRadius,
        child: FlutterMap(
          options: MapOptions(
            initialCenter: userPos,
            initialZoom: 13.0,
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.example.store_guliston',
            ),
            MarkerLayer(
              markers: [
                // User position marker
                Marker(
                  point: userPos,
                  width: 40,
                  height: 40,
                  child: Icon(
                    position != null ? Icons.my_location : Icons.location_on,
                    color: position != null ? Colors.blue : AppColors.error,
                    size: 36,
                  ),
                ),
                // Guliston center marker
                if (position == null)
                  Marker(
                    point: gulistonCenter,
                    width: 80,
                    height: 40,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: [
                          BoxShadow(color: Colors.black26, blurRadius: 4),
                        ],
                      ),
                      child: const Text(
                        'Guliston',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryGreen,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class LocationStatusCard extends StatelessWidget {
  final Position? position;
  final bool isLoading;
  final bool permissionGranted;
  final String? error;
  final String address;
  final VoidCallback onRefresh;
  final VoidCallback onOpenSettings;
  final VoidCallback onSetDemoLocation;

  const LocationStatusCard({
    super.key,
    required this.position,
    required this.isLoading,
    required this.permissionGranted,
    required this.error,
    required this.address,
    required this.onRefresh,
    required this.onOpenSettings,
    required this.onSetDemoLocation,
  });

  @override
  Widget build(BuildContext context) {
    final pos = position;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: AppRadius.largeRadius,
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Joriy lokatsiya',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.textBlack,
            ),
          ),
          const SizedBox(height: 12),
          if (isLoading)
            const Center(child: CircularProgressIndicator())
          else ...[
            Text(
              permissionGranted
                  ? 'Manzil: $address'
                  : 'Lokatsiya ruxsati yo\'q. Iltimos, ruxsat bering.',
              style: const TextStyle(fontSize: 14, color: AppColors.textGray),
            ),
            const SizedBox(height: 12),
            if (pos != null)
              Text(
                'Koordinatalar: ${pos.latitude.toStringAsFixed(5)}, ${pos.longitude.toStringAsFixed(5)}',
                style: const TextStyle(fontSize: 14, color: AppColors.textGray),
              ),
            if (error != null) ...[
              const SizedBox(height: 8),
              Text(
                error!,
                style: const TextStyle(fontSize: 13, color: AppColors.error),
              ),
            ],
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: onRefresh,
                  icon: const Icon(Icons.my_location),
                  label: const Text('Joriy lokatsiya'),
                ),
              ),
              const SizedBox(width: 12),
              OutlinedButton.icon(
                onPressed: onSetDemoLocation,
                icon: const Icon(Icons.location_on),
                label: const Text('Demo joy'),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (!permissionGranted || error != null)
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onOpenSettings,
                icon: const Icon(Icons.settings),
                label: const Text('Sozlamalarni ochish'),
              ),
            ),
        ],
      ),
    );
  }
}

class NearbyShopsSection extends StatelessWidget {
  final List<Shop> shops;
  final Position? currentPosition;
  final ValueChanged<Shop> onOpenDirections;

  const NearbyShopsSection({
    super.key,
    required this.shops,
    required this.currentPosition,
    required this.onOpenDirections,
  });

  @override
  Widget build(BuildContext context) {
    if (shops.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: AppRadius.largeRadius,
          boxShadow: [
            BoxShadow(
              color: AppColors.shadow,
              blurRadius: 20,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: const Text(
          'Yaqin do\'konlar mavjud emas yoki lokatsiya aniqlanmadi.',
          style: TextStyle(fontSize: 14, color: AppColors.textGray),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Yaqin do\'konlar',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppColors.textBlack,
          ),
        ),
        const SizedBox(height: 12),
        ..._buildShopCards(),
      ],
    );
  }

  List<Widget> _buildShopCards() {
    return shops.map((shop) {
      final position = currentPosition;
      final distance = position == null
          ? 0.0
          : Geolocator.distanceBetween(
              position.latitude,
              position.longitude,
              shop.latitude,
              shop.longitude,
            );
      return NearbyShopCard(
        shop: shop,
        distanceInKm: distance / 1000,
        onOpenDirections: () => onOpenDirections(shop),
      );
    }).toList();
  }
}

class NearbyShopCard extends StatelessWidget {
  final Shop shop;
  final double distanceInKm;
  final VoidCallback onOpenDirections;

  const NearbyShopCard({
    super.key,
    required this.shop,
    required this.distanceInKm,
    required this.onOpenDirections,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: AppColors.surface,
        borderRadius: AppRadius.largeRadius,
        child: InkWell(
          borderRadius: AppRadius.largeRadius,
          onTap: onOpenDirections,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        shop.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: AppColors.textBlack,
                        ),
                      ),
                    ),
                    Text(
                      '${distanceInKm.toStringAsFixed(1)} km',
                      style: const TextStyle(fontSize: 14, color: AppColors.textGray),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  shop.address,
                  style: const TextStyle(fontSize: 13, color: AppColors.textGray),
                ),
                const SizedBox(height: 12),
                Row(
                  children: const [
                    Icon(Icons.directions, size: 18, color: AppColors.primaryGreen),
                    SizedBox(width: 8),
                    Text(
                      'Yo\'lni ochish',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.primaryGreen,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
