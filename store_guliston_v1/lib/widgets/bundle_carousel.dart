import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_colors.dart';
import '../services/api_service.dart';
import '../providers/cart_provider.dart';
import '../models/product.dart';

class BundleCarousel extends StatefulWidget {
  final String shopId;
  const BundleCarousel({super.key, required this.shopId});
  @override
  State<BundleCarousel> createState() => _BundleCarouselState();
}

class _BundleCarouselState extends State<BundleCarousel> {
  final ApiService _api = ApiService();
  List<Map<String, dynamic>> _bundles = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final sid = int.tryParse(widget.shopId) ?? 0;
    if (sid == 0) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      final list = await _api.getBundles(sid);
      if (!mounted) return;
      setState(() {_bundles = list; _loading = false;});
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const SizedBox(height: 80, child: Center(child: CircularProgressIndicator(strokeWidth: 2)));
    if (_bundles.isEmpty) return const SizedBox.shrink();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Row(children: [
          Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: const Color(0xFFFFF3E0), borderRadius: BorderRadius.circular(6)), child: const Text('🎁 TO\'PLAM', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFFE65100)))),
          const SizedBox(width: 8),
          const Text('To\'plam narxda arzon', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textBlack)),
        ]),
      ),
      SizedBox(
        height: 150,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: _bundles.length,
          separatorBuilder: (_, __) => const SizedBox(width: 12),
          itemBuilder: (_, i) {
            final b = _bundles[i];
            final products = (b['products'] as List?)?.cast<Map<String, dynamic>>() ?? [];
            final name = b['name']?.toString() ?? 'To\'plam';
            final bundlePrice = (b['bundle_price'] as num?)?.toDouble() ?? 0;
            final original = (b['original_price'] as num?)?.toDouble() ?? 0;
            final discount = b['discount_percent'] ?? 0;
            return Container(
              width: 260,
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFFFCC80)), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 8, offset: const Offset(0, 2))]),
              child: InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () {
                  // add all products to cart
                  final cart = Provider.of<CartProvider>(context, listen: false);
                  int added = 0;
                  for (final p in products) {
                    try {
                      final prod = Product.fromJson(p);
                      cart.addItem(prod);
                      added++;
                    } catch (_) {}
                  }
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$name savatga qo\'shildi ($added ta)')));
                },
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Expanded(child: Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800), maxLines: 2, overflow: TextOverflow.ellipsis)),
                      if (discount > 0) Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: Colors.redAccent, borderRadius: BorderRadius.circular(6)), child: Text('-$discount%', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700))),
                    ]),
                    const SizedBox(height: 6),
                    Expanded(
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: products.length > 3 ? 3 : products.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 6),
                        itemBuilder: (_, j) {
                          final p = products[j];
                          final img = p['image']?.toString() ?? '';
                          return Container(
                            width: 60,
                            decoration: BoxDecoration(color: AppColors.backgroundGray, borderRadius: BorderRadius.circular(8)),
                            child: img.isNotEmpty ? ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.network(img, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.inventory_2, size: 20))) : const Icon(Icons.inventory_2, size: 20),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(children: [
                      Text('${bundlePrice.toStringAsFixed(0)} so\'m', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFFE65100))),
                      if (original > bundlePrice) ...[
                        const SizedBox(width: 6),
                        Text('${original.toStringAsFixed(0)}', style: const TextStyle(fontSize: 11, color: Colors.grey, decoration: TextDecoration.lineThrough)),
                      ],
                      const Spacer(),
                      const Icon(Icons.add_shopping_cart, size: 16, color: Color(0xFFE65100)),
                    ]),
                  ]),
                ),
              ),
            );
          },
        ),
      ),
    ]);
  }
}
