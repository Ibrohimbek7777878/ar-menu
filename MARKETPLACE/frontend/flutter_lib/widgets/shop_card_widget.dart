import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/shop.dart';
import '../providers/location_provider.dart';
import '../screens/shop_detail_screen.dart';
import '../config/app_colors.dart';

class ShopCardWidget extends StatelessWidget {
  final Shop shop;

  const ShopCardWidget({
    super.key,
    required this.shop,
  });

  @override
  Widget build(BuildContext context) {
    final hasRemoteImage = shop.imageUrl.isNotEmpty && !shop.imageUrl.contains('via.placeholder.com');
    return Consumer<LocationProvider>(
      builder: (context, locationProvider, child) {
        return Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: AppColors.shadow,
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => ShopDetailScreen(shop: shop)),
              );
            },
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Stack(
                  children: [
                    AspectRatio(
                      aspectRatio: 16 / 9,
                      child: hasRemoteImage
                          ? Image.network(
                              shop.imageUrl,
                              width: double.infinity,
                              fit: BoxFit.cover,
                              loadingBuilder: (context, child, loadingProgress) {
                                if (loadingProgress == null) return child;
                                return Container(
                                  color: AppColors.backgroundGray,
                                  child: const Center(child: CircularProgressIndicator()),
                                );
                              },
                              errorBuilder: (context, error, stackTrace) {
                                return Container(
                                  color: AppColors.primarySurface,
                                  child: const Center(child: Icon(Icons.store, size: 42, color: AppColors.primaryGreen)),
                                );
                              },
                            )
                          : Container(
                              decoration: const BoxDecoration(
                                gradient: AppColors.primaryGradient,
                              ),
                              child: const Center(child: Icon(Icons.store, size: 42, color: Colors.white)),
                            ),
                    ),
                    Positioned(
                      top: 12,
                      left: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: shop.isOpen ? AppColors.primaryGreen : AppColors.error,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          shop.isOpen ? 'Ochiq' : 'Yopiq',
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                    Positioned(
                      top: 12,
                      right: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.star, size: 14, color: Color(0xFFFFA726)),
                            const SizedBox(width: 4),
                            Text(shop.rating.toStringAsFixed(1), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                          ],
                        ),
                      ),
                    ),
                    if (shop.isFastDelivery)
                      Positioned(
                        bottom: 12,
                        left: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.accentOrange,
                            borderRadius: BorderRadius.circular(8),
                            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 4, offset: const Offset(0, 2))],
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.bolt, size: 14, color: Colors.white),
                              SizedBox(width: 4),
                              Text('30 daqiqa', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
                            ],
                          ),
                        ),
                      ),
                    Positioned(
                      bottom: 12,
                      right: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: shop.storeType == 'restaurant' ? const Color(0xFF7C3AED) : shop.storeType == 'cafe' ? const Color(0xFFEA580C) : shop.storeType == 'bar' ? const Color(0xFF0EA5E9) : AppColors.surface, borderRadius: BorderRadius.circular(8)),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(shop.storeType == 'restaurant' ? Icons.restaurant : shop.storeType == 'cafe' ? Icons.local_cafe : shop.storeType == 'bar' ? Icons.local_bar : Icons.store, size: 12, color: shop.storeType == 'shop' ? AppColors.textGray : Colors.white),
                          const SizedBox(width: 4),
                          Text(shop.storeType == 'restaurant' ? 'Restoran' : shop.storeType == 'cafe' ? 'Kafe' : shop.storeType == 'bar' ? 'Bar' : 'Do\'kon', style: TextStyle(color: shop.storeType == 'shop' ? AppColors.textGray : Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
                          if (shop.hasAr) const Padding(padding: EdgeInsets.only(left: 4), child: Icon(Icons.view_in_ar, size: 12, color: Colors.white)),
                        ]),
                      ),
                    ),
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              shop.name,
                              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.textBlack),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.primarySurface,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              shop.category,
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primaryGreen),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(Icons.location_on, size: 14, color: AppColors.textGray),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              shop.address,
                              style: const TextStyle(fontSize: 13, color: AppColors.textGray),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.access_time, size: 14, color: AppColors.textGray),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              shop.workingHours,
                              style: const TextStyle(fontSize: 13, color: AppColors.textGray),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          FutureBuilder<double>(
                            future: locationProvider.calculateDistanceToShop(shop.latitude, shop.longitude),
                            builder: (context, snapshot) {
                              if (snapshot.hasData) {
                                final distance = snapshot.data!;
                                return Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppColors.primarySurface,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.near_me, size: 12, color: AppColors.primaryGreen),
                                      const SizedBox(width: 4),
                                      Text('${(distance / 1000).toStringAsFixed(1)} km', 
                                        style: const TextStyle(fontSize: 12, color: AppColors.primaryGreen, fontWeight: FontWeight.w600)),
                                    ],
                                  ),
                                );
                              }
                              return const SizedBox.shrink();
                            },
                          ),
                          const Spacer(),
                          IconButton(
                            icon: const Icon(Icons.phone, size: 18, color: AppColors.primaryGreen),
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text("Qo'ng'iroq: ${shop.phone}")),
                              );
                            },
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}