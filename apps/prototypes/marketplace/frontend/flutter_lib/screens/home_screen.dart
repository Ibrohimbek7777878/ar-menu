import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';
import '../providers/shop_provider.dart';
import '../providers/cart_provider.dart';
import '../providers/product_provider.dart';
import '../providers/admin_settings_provider.dart';
import '../config/app_colors.dart';
import '../widgets/shop_card_widget.dart';
import '../widgets/product_card_widget.dart';
import '../widgets/weather_widget.dart';
import '../widgets/store_type_filter.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    final shopProvider = Provider.of<ShopProvider>(context, listen: false);
    final productProvider = Provider.of<ProductProvider>(context, listen: false);
    await Future.wait([
      shopProvider.loadShops(),
      productProvider.loadAllProducts(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final cartProvider = Provider.of<CartProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: _buildHomeTab(cartProvider),
      // Floating sticky cart button — Uzum style
      floatingActionButton: !cartProvider.isEmpty
          ? FloatingActionButton.extended(
              onPressed: () => context.push('/cart'),
              backgroundColor: AppColors.primaryGreen,
              foregroundColor: Colors.white,
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
              ),
              icon: const Icon(Icons.shopping_cart, size: 20),
              label: Text(
                'Savat: ${cartProvider.totalAmount.toStringAsFixed(0)} so\'m',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            )
          : null,
    );
  }

  // ========== HOME TAB ==========
  Widget _buildHomeTab(CartProvider cartProvider) {
    return Consumer<ShopProvider>(
      builder: (context, shopProvider, child) {
        final shops = shopProvider.shops;

        return CustomScrollView(
          slivers: [
            // Header
            SliverToBoxAdapter(child: _buildHeader(cartProvider)),

            // Search
            SliverToBoxAdapter(child: _buildSearch()),

            // Store type filter (hybrid)
            SliverToBoxAdapter(
              child: Consumer<ShopProvider>(
                builder: (context, sp, _) => Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: StoreTypeFilter(
                    selected: sp.selectedStoreType,
                    onSelected: (v) => sp.filterByStoreType(v),
                  ),
                ),
              ),
            ),

            // Category pills
            SliverToBoxAdapter(
              child: Consumer<ProductProvider>(
                builder: (context, productProvider, _) {
                  final categories = productProvider.products
                      .map((p) => p.category)
                      .toSet()
                      .toList()
                    ..sort();
                  return _buildCategorySection(categories, productProvider);
                },
              ),
            ),

            // Featured products
            SliverToBoxAdapter(
              child: Consumer<ProductProvider>(
                builder: (context, productProvider, _) {
                  return _buildFeaturedProducts(productProvider);
                },
              ),
            ),

            // Shops
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: shops.isEmpty
                  ? SliverToBoxAdapter(
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.only(top: 40),
                          child: Column(
                            children: [
                              Icon(Icons.store_outlined, size: 64, color: AppColors.textLight),
                              const SizedBox(height: 16),
                              Text(
                                'Do\'konlar topilmadi',
                                style: TextStyle(color: AppColors.textGray, fontSize: 16),
                              ),
                            ],
                          ),
                        ),
                      ),
                    )
                  : SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          return AnimationConfiguration.staggeredList(
                            position: index,
                            duration: const Duration(milliseconds: 500),
                            child: SlideAnimation(
                              verticalOffset: 60,
                              child: FadeInAnimation(
                                child: Padding(
                                  padding: const EdgeInsets.only(bottom: 16),
                                  child: ShopCardWidget(shop: shops[index]),
                                ),
                              ),
                            ),
                          );
                        },
                        childCount: shops.length,
                      ),
                    ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 100)),
          ],
        );
      },
    );
  }

  Widget _buildHeader(CartProvider cartProvider) {
    final settingsProvider = Provider.of<AdminSettingsProvider>(context, listen: false);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 50, 16, 0),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      settingsProvider.getText('app_name'),
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textBlack,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      settingsProvider.getText('home_title'),
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppColors.textGray,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onLongPress: () => GoRouter.of(context).push('/admin/login'),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.primarySurface,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.store, size: 18, color: AppColors.primaryGreen),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Location + Weather row
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: AppColors.shadow,
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => GoRouter.of(context).push('/location'),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: const [
                      Icon(Icons.location_on, size: 18, color: AppColors.primaryGreen),
                      SizedBox(width: 6),
                      Text(
                        'Guliston',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textBlack,
                        ),
                      ),
                      SizedBox(width: 4),
                      Icon(Icons.arrow_forward_ios, size: 10, color: AppColors.textGray),
                    ],
                  ),
                ),
                const Spacer(),
                const WeatherWidget(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearch() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Consumer<ProductProvider>(
        builder: (context, productProvider, _) {
          return Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: AppColors.shadow,
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: TextField(
              controller: _searchController,
              onChanged: productProvider.setSearchQuery,
              decoration: InputDecoration(
                hintText: 'Qidirish...',
                prefixIcon: const Icon(Icons.search, color: AppColors.textGray),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close, size: 18, color: AppColors.textGray),
                        onPressed: () {
                          _searchController.clear();
                          productProvider.setSearchQuery('');
                        },
                      )
                    : null,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildCategorySection(List<String> categories, ProductProvider productProvider) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Kategoriyalar',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textBlack,
                  ),
                ),
                if (productProvider.selectedCategory != null)
                  GestureDetector(
                    onTap: () => productProvider.clearFilters(),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primarySurface,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'Filtrlash: ON',
                        style: TextStyle(
                          fontSize: 11,
                          color: AppColors.primaryGreen,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 44,
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              scrollDirection: Axis.horizontal,
              children: [
                _CategoryPill(
                  label: 'Barchasi',
                  selected: productProvider.selectedCategory == null,
                  onTap: () => productProvider.clearFilters(),
                ),
                const SizedBox(width: 8),
                for (final cat in categories)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: _CategoryPill(
                      label: _displayCategory(cat),
                      selected: productProvider.selectedCategory == cat,
                      onTap: () => productProvider.setCategory(cat),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _displayCategory(String category) {
    switch (category) {
      case 'cat_food':
      case 'oziq-ovqat':
        return 'Oziq-ovqat';
      case 'cat_drinks':
      case 'ichimliklar':
        return 'Ichimliklar';
      case 'cat_dairy':
      case 'sut':
        return 'Sut';
      case 'cat_meat':
      case 'go\'sht':
        return 'Go\'sht';
      case 'cat_vegetables':
        return 'Sabzavot';
      case 'cat_fruits':
        return 'Mevalar';
      case 'cat_bakery':
        return 'Non';
      case 'cat_hygiene':
        return 'Gigiena';
      case 'cat_home':
        return 'Uy-ro\'zg\'or';
      case 'cat_local':
        return 'Mahalliy';
      default:
        return category;
    }
  }

  Widget _buildFeaturedProducts(ProductProvider productProvider) {
    final products = productProvider.filteredProducts.take(8).toList();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'Mashhur mahsulotlar',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textBlack),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primarySurface,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '${productProvider.filteredProducts.length} ta',
                  style: const TextStyle(fontSize: 11, color: AppColors.primaryGreen, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 280,
            child: products.isEmpty
                ? _buildEmptyBanner()
                : ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: products.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemBuilder: (context, index) {
                      return SizedBox(
                        width: 170,
                        child: ProductCardWidget(product: products[index]),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyBanner() {
    return Container(
      height: 160,
      decoration: BoxDecoration(
        gradient: AppColors.leafGradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryGreen.withValues(alpha: 0.2),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -10,
            bottom: -10,
            child: Icon(Icons.eco, size: 100, color: Colors.white.withValues(alpha: 0.12)),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'YANGI',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 10),
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Yangi mahsulotlar\nkelyapti!',
                  style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  'Tez kunda...',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 13),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

}

// ========== CATEGORY PILL WIDGET ==========
class _CategoryPill extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _CategoryPill({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppColors.primaryGreen : AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? AppColors.primaryGreen : AppColors.divider,
            width: 1,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: AppColors.primaryGreen.withValues(alpha: 0.2),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : AppColors.textBlack,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}
