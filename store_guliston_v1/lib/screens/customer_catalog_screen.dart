import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/app_colors.dart';
import '../providers/product_provider.dart';
import '../providers/shop_provider.dart';
import '../utils/responsive.dart';

class CustomerCatalogScreen extends StatelessWidget {
  const CustomerCatalogScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer2<ShopProvider, ProductProvider>(
      builder: (context, shopProvider, productProvider, child) {
        final shops = shopProvider.shops;
        final products = productProvider.filteredProducts;
        final categories = productProvider.products.map((p) => p.category).toSet().toList()..sort();

        return Scaffold(
          backgroundColor: AppColors.background,
          body: SafeArea(
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(16, 18, 16, 18),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [AppColors.primaryGreen, Color(0xFF1E8E57)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Katalog',
                          style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Yaqin do\'konlar va eng kerakli mahsulotlar',
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 14),
                        ),
                        const SizedBox(height: 14),
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: TextField(
                            onChanged: productProvider.setSearchQuery,
                            decoration: const InputDecoration(
                              hintText: 'Mahsulot yoki do\'kon qidirish',
                              prefixIcon: Icon(Icons.search, color: AppColors.textGray),
                              border: InputBorder.none,
                              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: SizedBox(
                      height: 38,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        children: [
                          _CategoryChip(
                            label: 'Barchasi',
                            selected: productProvider.selectedCategory == null,
                            onTap: () => productProvider.clearFilters(),
                          ),
                          const SizedBox(width: 8),
                          ...categories.map(
                            (category) => Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: _CategoryChip(
                                label: category,
                                selected: productProvider.selectedCategory == category,
                                onTap: () => productProvider.setCategory(category),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Do\'konlar', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                        Text('${shops.length} ta', style: const TextStyle(color: AppColors.textGray)),
                      ],
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: 128,
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                      scrollDirection: Axis.horizontal,
                      itemBuilder: (context, index) {
                        final shop = shops[index];
                        return Container(
                          width: 210,
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(18),
                            boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 10, offset: const Offset(0, 2))],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    width: 42,
                                    height: 42,
                                    decoration: BoxDecoration(
                                      color: AppColors.primarySurface,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Icon(Icons.store, color: AppColors.primaryGreen),
                                  ),
                                  const Spacer(),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: shop.isOpen ? AppColors.primarySurface : AppColors.error.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: Text(
                                      shop.isOpen ? 'Ochiq' : 'Yopiq',
                                      style: TextStyle(
                                        color: shop.isOpen ? AppColors.primaryGreen : AppColors.error,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Text(shop.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                              const SizedBox(height: 4),
                              Text(shop.address, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.textGray, fontSize: 12)),
                            ],
                          ),
                        );
                      },
                      separatorBuilder: (_, __) => const SizedBox(width: 12),
                      itemCount: shops.length,
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Mashhur mahsulotlar', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                        Text('${products.length} ta', style: const TextStyle(color: AppColors.textGray)),
                      ],
                    ),
                  ),
                ),
                SliverPadding(
                  padding: EdgeInsets.symmetric(horizontal: Responsive.horizontalPadding(context)),
                  sliver: products.isEmpty
                      ? const SliverToBoxAdapter(
                          child: Padding(
                            padding: EdgeInsets.only(top: 40),
                            child: Center(child: Text('Mahsulotlar topilmadi', style: TextStyle(color: AppColors.textGray))),
                          ),
                        )
                      : SliverGrid(
                          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: Responsive.gridCrossAxisCount(context),
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                            childAspectRatio: Responsive.productCardAspectRatio(context),
                          ),
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final product = products[index];
                              return Container(
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(18),
                                  boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 10, offset: const Offset(0, 2))],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    AspectRatio(
                                      aspectRatio: 1.2,
                                      child: Container(
                                        decoration: BoxDecoration(
                                          color: AppColors.primarySurface,
                                          borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                                        ),
                                        child: const Center(
                                          child: Icon(Icons.shopping_bag_outlined, size: 42, color: AppColors.primaryGreen),
                                        ),
                                      ),
                                    ),
                                    Padding(
                                      padding: const EdgeInsets.all(12),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(product.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                                          const SizedBox(height: 4),
                                          Text(product.category, style: const TextStyle(color: AppColors.textGray, fontSize: 11)),
                                          const SizedBox(height: 8),
                                          Text('${product.price.toStringAsFixed(0)} so\'m', style: const TextStyle(color: AppColors.primaryGreen, fontSize: 14, fontWeight: FontWeight.w800)),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                            childCount: products.length,
                          ),
                        ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 24)),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppColors.primaryGreen : Colors.white,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: selected ? AppColors.primaryGreen : AppColors.divider),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : AppColors.textBlack,
            fontWeight: FontWeight.w600,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}
