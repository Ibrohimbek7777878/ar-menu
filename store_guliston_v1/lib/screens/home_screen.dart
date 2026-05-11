import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:store_guliston/providers/shop_provider.dart';
import 'package:store_guliston/providers/cart_provider.dart';
import 'package:store_guliston/config/app_colors.dart';
import '../widgets/shop_card_widget.dart';
import '../widgets/cart_badge_widget.dart';
import 'cart_screen.dart';
import 'admin_dashboard_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;
  final TextEditingController _searchController = TextEditingController();
  String? _selectedCategory;
  bool _showAdminLogin = false;
  int _adminTapCount = 0;
  DateTime? _lastAdminTapTime;

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
    await shopProvider.loadShops();
  }

  void _onAdminIconTap() {
    final now = DateTime.now();
    if (_lastAdminTapTime == null ||
        now.difference(_lastAdminTapTime!).inSeconds > 2) {
      _adminTapCount = 1;
    } else {
      _adminTapCount++;
    }
    _lastAdminTapTime = now;

    if (_adminTapCount >= 3) {
      setState(() {
        _showAdminLogin = true;
      });
      _adminTapCount = 0;
    }
  }

  void _showAdminLoginDialog() {
    final usernameController = TextEditingController();
    final passwordController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(AppRadius.xlargeRadius),
            topRight: Radius.circular(AppRadius.xlargeRadius),
          ),
        ),
        title: const Text(
          'Admin Kirish',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: AppColors.textBlack,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: usernameController,
              decoration: const InputDecoration(
                labelText: 'Foydalanuvchi nomi',
                prefixIcon: Icon(Icons.person, color: AppColors.primaryGreen),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: passwordController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Parol',
                prefixIcon: Icon(Icons.lock, color: AppColors.primaryGreen),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Bekor qilish'),
          ),
          ElevatedButton(
            onPressed: () {
              // Simple demo login - in production, use proper auth
              if (usernameController.text == 'admin' &&
                  passwordController.text == 'admin123') {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const AdminDashboardScreen(),
                  ),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Login yoki parol noto\'g\'ri'),
                    backgroundColor: AppColors.error,
                  ),
                );
              }
            },
            child: const Text('Kirish'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cartProvider = Provider.of<CartProvider>(context);

    if (_showAdminLogin) {
      _showAdminLoginDialog();
      _showAdminLogin = false;
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: IndexedStack(
        index: _selectedIndex,
        children: [
          _buildHomeTab(cartProvider),
          _buildCartTab(cartProvider),
          _buildProfileTab(),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.background,
          boxShadow: [
            BoxShadow(
              color: AppColors.shadow,
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _selectedIndex,
          onTap: (index) => setState(() => _selectedIndex = index),
          items: [
            BottomNavigationBarItem(
              icon: _buildNavIcon(Icons.home_outlined, 0),
              activeIcon: _buildNavIcon(Icons.home, 0),
              label: 'Asosiy',
            ),
            BottomNavigationBarItem(
              icon: _buildNavIcon(Icons.shopping_cart_outlined, 1),
              activeIcon: _buildNavIcon(Icons.shopping_cart, 1),
              label: 'Savat',
            ),
            BottomNavigationBarItem(
              icon: _buildNavIcon(Icons.person_outlined, 2),
              activeIcon: _buildNavIcon(Icons.person, 2),
              label: 'Profil',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavIcon(IconData icon, int index) {
    final isSelected = _selectedIndex == index;
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: isSelected ? AppColors.primaryGreen.withOpacity(0.1) : Colors.transparent,
        borderRadius: AppRadius.mediumRadius,
      ),
      child: Icon(
        icon,
        color: isSelected ? AppColors.primaryGreen : AppColors.textLight,
        size: 24,
      ),
    );
  }

  Widget _buildHomeTab(CartProvider cartProvider) {
    return Consumer<ShopProvider>(
      builder: (context, shopProvider, child) {
        final shops = shopProvider.shops;
        final categories = shopProvider.getCategories();

        return CustomScrollView(
          slivers: [
            // App Bar
            SliverToBoxAdapter(
              child: _buildHeader(cartProvider),
            ),

            // Search Bar
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Container(
                  decoration: BoxDecoration(
                    color: AppColors.backgroundGray,
                    borderRadius: AppRadius.largeRadius,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.shadow.withOpacity(0.5),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: shopProvider.searchShops,
                    decoration: InputDecoration(
                      hintText: 'Do\'kon yoki mahsulot qidirish...',
                      prefixIcon: const Icon(Icons.search, color: AppColors.textLight),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                  ),
                ),
              ),
            ),

            // Green Farm Banner
            SliverToBoxAdapter(
              child: _buildGreenFarmBanner(),
            ),

            // Popular Shops Section
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Mashhur Do\'konlar',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textBlack,
                      ),
                    ),
                    TextButton(
                      onPressed: () {},
                      child: const Text(
                        'Barchasi',
                        style: TextStyle(color: AppColors.primaryGreen),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Category Pills
            SliverToBoxAdapter(
              child: _buildCategorySection(categories, shopProvider),
            ),

            // Shops List
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: shops.isEmpty
                  ? SliverToBoxAdapter(
                      child: Center(
                        child: Column(
                          children: [
                            const SizedBox(height: 40),
                            Icon(Icons.store_outlined, size: 64, color: AppColors.textLight),
                            const SizedBox(height: 16),
                            Text(
                              'Do\'konlar topilmadi',
                              style: TextStyle(color: AppColors.textLight, fontSize: 16),
                            ),
                          ],
                        ),
                      ),
                    )
                  : SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: ShopCardWidget(shop: shops[index]),
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
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 50, 16, 0),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Store Guliston',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primaryGreen,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Yangi Yer shahri yetkazib berish',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textGray,
                  ),
                ),
              ],
            ),
          ),
          // Hidden Admin Login - Animated Icon
          GestureDetector(
            onTap: _onAdminIconTap,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.accentOrange.withOpacity(0.1),
                borderRadius: AppRadius.circularRadius,
              ),
              child: const Icon(
                Icons.admin_panel_settings,
                color: AppColors.accentOrange,
                size: 24,
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Cart Badge
          CartBadgeWidget(
            itemCount: cartProvider.totalQuantity,
            onTap: () {
              setState(() => _selectedIndex = 1);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildGreenFarmBanner() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Container(
        height: 160,
        decoration: BoxDecoration(
          gradient: AppColors.primaryGradient,
          borderRadius: AppRadius.xlargeRadius,
          boxShadow: [
            BoxShadow(
              color: AppColors.primaryGreen.withOpacity(0.3),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Stack(
          children: [
            Positioned(
              right: -20,
              bottom: -20,
              child: Icon(
                Icons.eco,
                size: 140,
                color: Colors.white.withOpacity(0.15),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: AppRadius.smallRadius,
                    ),
                    child: const Text(
                      'GREEN FARM',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Yangi meva-sabzavotlar!',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Uyda o\'tirib do\'konlarni ko\'ring va\ntez buyurtma bering.',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accentYellow,
                      foregroundColor: AppColors.textBlack,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: AppRadius.largeRadius,
                      ),
                    ),
                    child: const Text('Buyurtma berish'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategorySection(List<String> categories, ShopProvider shopProvider) {
    return Column(
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
                  fontWeight: FontWeight.bold,
                  color: AppColors.textBlack,
                ),
              ),
              TextButton(
                onPressed: () {
                  setState(() => _selectedCategory = null);
                  shopProvider.filterByCategory(null);
                },
                child: const Text('Tozalash'),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 80,
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            scrollDirection: Axis.horizontal,
            children: [
              _CategoryPill(
                label: 'Barchasi',
                selected: _selectedCategory == null,
                icon: Icons.grid_view,
                onTap: () {
                  setState(() => _selectedCategory = null);
                  shopProvider.filterByCategory(null);
                },
              ),
              for (final category in categories)
                _CategoryPill(
                  label: _displayCategory(category),
                  selected: _selectedCategory == category,
                  icon: Icons.restaurant_menu,
                  onTap: () {
                    setState(() => _selectedCategory = category);
                    shopProvider.filterByCategory(category);
                  },
                ),
            ],
          ),
        ),
      ],
    );
  }

  String _displayCategory(String category) {
    switch (category) {
      case 'oziq-ovqat':
        return 'Meva';
      case 'ichimliklar':
        return 'Ichimlik';
      case 'go\'sht':
        return 'Go\'sht';
      case 'sut':
        return 'Sut';
      default:
        return category;
    }
  }

  Widget _buildCartTab(CartProvider cartProvider) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Savat'),
        actions: [
          if (cartProvider.itemCount > 0)
            TextButton(
              onPressed: () => _showClearCartDialog(context, cartProvider),
              child: const Text('Tozalash'),
            ),
        ],
      ),
      body: cartProvider.isEmpty
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.shopping_cart_outlined,
                    size: 64,
                    color: AppColors.textLight,
                  ),
                  SizedBox(height: 16),
                  Text(
                    'Savat bo\'sh',
                    style: TextStyle(
                      fontSize: 18,
                      color: AppColors.textGray,
                    ),
                  ),
                ],
              ),
            )
          : _buildCartContent(cartProvider),
    );
  }

  Widget _buildCartContent(CartProvider cartProvider) {
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: cartProvider.cartItems.length,
            itemBuilder: (context, index) {
              final item = cartProvider.cartItems[index];
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: AppRadius.largeRadius,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.shadow,
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 70,
                      height: 70,
                      decoration: BoxDecoration(
                        color: AppColors.backgroundGray,
                        borderRadius: AppRadius.mediumRadius,
                      ),
                      child: const Icon(Icons.inventory_2, color: AppColors.textLight),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.product.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: AppColors.textBlack,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '\$${(item.product.price / 10000).toStringAsFixed(2)}',
                            style: const TextStyle(
                              color: AppColors.primaryGreen,
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Row(
                      children: [
                        _buildQuantityButton(
                          Icons.remove,
                          () => cartProvider.decrementQuantity(item.product.id),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: Text(
                            item.quantity.toString(),
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        _buildQuantityButton(
                          Icons.add,
                          () => cartProvider.incrementQuantity(item.product.id),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        _buildCartSummary(cartProvider),
      ],
    );
  }

  Widget _buildQuantityButton(IconData icon, VoidCallback onPressed) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.primaryGreen.withOpacity(0.1),
        borderRadius: AppRadius.smallRadius,
      ),
      child: IconButton(
        icon: Icon(icon, size: 18, color: AppColors.primaryGreen),
        onPressed: onPressed,
        padding: const EdgeInsets.all(4),
      ),
    );
  }

  Widget _buildCartSummary(CartProvider cartProvider) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: const BorderRadius.only(
          topLeft: AppRadius.xlarge,
          topRight: AppRadius.xlarge,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Jami:',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textBlack,
                ),
              ),
              Text(
                '\$${(cartProvider.totalAmount / 10000).toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryGreen,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pushNamed(context, '/checkout');
              },
              child: const Text('Buyurtma berish'),
            ),
          ),
        ],
      ),
    );
  }

  void _showClearCartDialog(BuildContext context, CartProvider cartProvider) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.largeRadius,
        ),
        title: const Text('Savatni tozalash'),
        content: const Text('Savatdagi barcha mahsulotlarni o\'chirmoqchimisiz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Bekor qilish'),
          ),
          TextButton(
            onPressed: () {
              cartProvider.clearCart();
              Navigator.pop(context);
            },
            child: const Text('Tozalash', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileTab() {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 50, 16, 24),
              child: Row(
                children: [
                  Container(
                    width: 70,
                    height: 70,
                    decoration: BoxDecoration(
                      color: AppColors.primaryGreen.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.person,
                      size: 36,
                      color: AppColors.primaryGreen,
                    ),
                  ),
                  const SizedBox(width: 16),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Mehmon',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textBlack,
                          ),
                        ),
                        Text(
                          'Telefon: +998 90 123 45 67',
                          style: TextStyle(
                            fontSize: 14,
                            color: AppColors.textGray,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: _buildProfileMenuItem(Icons.receipt_long, 'Buyurtmalarim', () {}),
          ),
          SliverToBoxAdapter(
            child: _buildProfileMenuItem(Icons.location_on, 'Manzillar', () {}),
          ),
          SliverToBoxAdapter(
            child: _buildProfileMenuItem(Icons.payment, 'To\'lov usullari', () {}),
          ),
          SliverToBoxAdapter(
            child: _buildProfileMenuItem(Icons.settings, 'Sozlamalar', () {}),
          ),
          SliverToBoxAdapter(
            child: _buildProfileMenuItem(Icons.help_outline, 'Yordam', () {}),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.logout),
                  label: const Text('Chiqish'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.error,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            ),
          ),
          const SliverToBoxAdapter(
            child: SizedBox(height: 40),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileMenuItem(IconData icon, String label, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.largeRadius,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: AppRadius.largeRadius,
            boxShadow: [
              BoxShadow(
                color: AppColors.shadow,
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Icon(icon, color: AppColors.primaryGreen),
              const SizedBox(width: 16),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textBlack,
                ),
              ),
              const Spacer(),
              const Icon(Icons.chevron_right, color: AppColors.textLight),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoryPill extends StatelessWidget {
  final String label;
  final bool selected;
  final IconData icon;
  final VoidCallback onTap;

  const _CategoryPill({
    required this.label,
    required this.selected,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.largeRadius,
        child: Container(
          width: 78,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: selected ? AppColors.primaryGreen : AppColors.surface,
            borderRadius: AppRadius.largeRadius,
            boxShadow: [
              BoxShadow(
                color: AppColors.shadow,
                blurRadius: 12,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: selected ? Colors.white : AppColors.primaryGreen),
              const SizedBox(height: 6),
              Text(
                label,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: selected ? Colors.white : AppColors.primaryGreen,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
