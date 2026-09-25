import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_colors.dart';
import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../providers/wishlist_provider.dart';
import '../services/ar_service.dart';

class ProductCardWidget extends StatelessWidget {
  final Product product;

  const ProductCardWidget({
    super.key,
    required this.product,
  });

  @override
  Widget build(BuildContext context) {
    final hasRemoteImage = product.imageUrl.isNotEmpty && !product.imageUrl.contains('via.placeholder.com');
    return Consumer<CartProvider>(
      builder: (context, cartProvider, child) {
        final cartItem = cartProvider.getItem(product.id);
        final isInCart = cartItem != null;

        return Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: AppColors.shadow,
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 5,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (hasRemoteImage)
                      Image.network(
                        product.imageUrl,
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
                            child: const Center(child: Icon(Icons.inventory_2, size: 36, color: AppColors.primaryGreen)),
                          );
                        },
                      )
                    else
                      Container(
                        decoration: const BoxDecoration(
                          gradient: AppColors.accentGradient,
                        ),
                        child: const Center(child: Icon(Icons.inventory_2, size: 36, color: Colors.white)),
                      ),
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.surface.withValues(alpha: 0.9),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          product.category,
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.textGray),
                        ),
                      ),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: product.isAvailable ? AppColors.primaryGreen : AppColors.error,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          product.isAvailable ? 'Bor' : 'Yo\'q',
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                    if (product.isFastDelivery)
                      Positioned(
                        top: 8,
                        left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.accentOrange,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.bolt, size: 10, color: Colors.white),
                              SizedBox(width: 2),
                              Text('30 min', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w700)),
                            ],
                          ),
                        ),
                      ),
                    if (product.has3d)
                      Positioned(
                        top: 34,
                        left: 8,
                        child: GestureDetector(
                          onTap: () {
                            final pid = int.tryParse(product.id) ?? 0;
                            if (pid != 0) {
                              showModalBottomSheet(context: context, isScrollControlled: true, builder: (_) => _ArSheet(productId: pid, name: product.name));
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: const Color(0xFF7C3AED), borderRadius: BorderRadius.circular(4)),
                            child: const Row(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.view_in_ar, size: 10, color: Colors.white), SizedBox(width: 2), Text('AR', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w700))]),
                          ),
                        ),
                      ),
                    if (product.isHit)
                      Positioned(
                        top: 60,
                        left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: Colors.redAccent, borderRadius: BorderRadius.circular(4)),
                          child: const Text('HIT', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w700)),
                        ),
                      ),
                    if (product.flashActive)
                      Positioned(
                        bottom: 36,
                        left: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                          decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.75), borderRadius: BorderRadius.circular(6)),
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            const Icon(Icons.timer, size: 10, color: Colors.white),
                            const SizedBox(width: 4),
                            _FlashCountdown(seconds: product.flashSecondsLeft),
                          ]),
                        ),
                      ),
                    Positioned(
                      bottom: 8,
                      right: 8,
                      child: Consumer<WishlistProvider>(
                        builder: (context, wishlist, _) {
                          final isFav = wishlist.isFavorite(product.id);
                          return GestureDetector(
                            onTap: () => wishlist.toggleFavorite(product),
                            child: Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.9),
                                shape: BoxShape.circle,
                                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4)],
                              ),
                              child: Icon(
                                isFav ? Icons.favorite : Icons.favorite_border,
                                size: 16,
                                color: isFav ? AppColors.error : AppColors.textGray,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                flex: 4,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product.name,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textBlack),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        product.description,
                        style: const TextStyle(fontSize: 11, color: AppColors.textGray),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const Spacer(),
                      Row(
                        children: [
                          Text(
                            '${(product.flashActive ? (product.effectivePrice ?? product.flashPrice ?? product.price) : product.price).toStringAsFixed(0)} so\'m',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: product.flashActive ? Colors.redAccent : AppColors.primaryGreen),
                          ),
                          if (product.flashActive) ...[
                            const SizedBox(width: 6),
                            Text('${product.price.toStringAsFixed(0)}', style: const TextStyle(fontSize: 11, color: AppColors.textGray, decoration: TextDecoration.lineThrough)),
                          ],
                          const SizedBox(width: 4),
                          Text('/ ${product.unit}', style: const TextStyle(fontSize: 10, color: AppColors.textGray)),
                        ],
                      ),
                      const SizedBox(height: 5),
                      SizedBox(
                        width: double.infinity,
                        child: isInCart
                            ? Container(
                                decoration: BoxDecoration(
                                  color: AppColors.primarySurface,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Row(
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.remove, size: 16, color: AppColors.primaryGreen),
                                      onPressed: () => cartProvider.decrementQuantity(product.id),
                                      padding: EdgeInsets.zero,
                                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                    ),
                                    Expanded(
                                      child: Text(
                                        cartItem.quantity.toString(),
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primaryGreen),
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.add, size: 16, color: AppColors.primaryGreen),
                                      onPressed: () => cartProvider.incrementQuantity(product.id),
                                      padding: EdgeInsets.zero,
                                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                    ),
                                  ],
                                ),
                              )
                              : ElevatedButton(
                                  onPressed: product.isAvailable
                                      ? () {
                                          cartProvider.addItem(product);
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(
                                              content: Text('${product.name} savatga qo\'shildi'),
                                              duration: const Duration(seconds: 1),
                                            ),
                                          );
                                        }
                                      : null,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primaryGreen,
                                    foregroundColor: Colors.white,
                                    elevation: 0,
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                                  ),
                                  child: const Text('Savatga'),
                                ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ArSheet extends StatefulWidget {
  final int productId;
  final String name;
  const _ArSheet({required this.productId, required this.name});
  @override
  State<_ArSheet> createState() => _ArSheetState();
}

class _ArSheetState extends State<_ArSheet> {
  final ArService _ar = ArService();
  Map<String, dynamic>? _data;
  bool _loading = true;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final d = await _ar.getArDetail(widget.productId);
    if (!mounted) return;
    setState(() {_data = d; _loading = false;});
    if (d != null && d['ready'] == true) _ar.logArView(productId: widget.productId, mode: '3d-only', durationSec: 5);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      child: _loading
          ? const SizedBox(height: 120, child: Center(child: CircularProgressIndicator()))
          : Column(mainAxisSize: MainAxisSize.min, children: [
              Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
              const SizedBox(height: 12),
              Text(widget.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              Container(
                height: 180,
                decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey[300]!)),
                child: Center(
                  child: _data?['poster'] != null
                      ? Image.network(_data!['poster'], fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.view_in_ar, size: 48, color: Color(0xFF7C3AED)))
                      : const Icon(Icons.view_in_ar, size: 48, color: Color(0xFF7C3AED)),
                ),
              ),
              const SizedBox(height: 12),
              Text('Real o\'lcham ${_data?['scale_m'] ?? 0.30} m', style: const TextStyle(fontSize: 12, color: Colors.grey)),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Yopish'))),
                const SizedBox(width: 12),
                Expanded(child: FilledButton.icon(onPressed: _data?['ready'] == true ? () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('AR ochildi (demo)'))) : null, icon: const Icon(Icons.view_in_ar), label: Text(_data?['ready'] == true ? 'AR ko\'rish' : 'Tayyorlanmoqda'))),
              ]),
            ]),
    );
  }
}

class _FlashCountdown extends StatefulWidget {
  final int seconds;
  const _FlashCountdown({required this.seconds});
  @override
  State<_FlashCountdown> createState() => _FlashCountdownState();
}

class _FlashCountdownState extends State<_FlashCountdown> {
  late int _sec;
  @override
  void initState() {
    super.initState();
    _sec = widget.seconds;
    _tick();
  }

  void _tick() async {
    while (mounted && _sec > 0) {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return;
      setState(() => _sec--);
    }
  }

  @override
  Widget build(BuildContext context) {
    final h = _sec ~/ 3600;
    final m = (_sec % 3600) ~/ 60;
    final s = _sec % 60;
    final txt = h > 0 ? '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}' : '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
    return Text(txt, style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700));
  }
}
