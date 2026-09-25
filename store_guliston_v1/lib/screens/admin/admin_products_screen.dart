import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../config/app_colors.dart';
import '../../database/database_helper.dart';
import '../../models/category.dart';
import '../../models/product.dart';
import '../../models/shop.dart';
import '../../services/admin_auth.dart';
import '../../services/product_service.dart';
import '../../services/shop_service.dart';
import '../../widgets/admin_scaffold.dart';
import '../../widgets/hover_action_button.dart';
import '../../widgets/shimmer_placeholder.dart';

class AdminProductsScreen extends StatefulWidget {
  const AdminProductsScreen({super.key});

  @override
  State<AdminProductsScreen> createState() => _AdminProductsScreenState();
}

class _AdminProductsScreenState extends State<AdminProductsScreen> {
  final ProductService _productService = ProductService();
  final ShopService _shopService = ShopService();
  final DatabaseHelper _dbHelper = DatabaseHelper();
  final TextEditingController _searchController = TextEditingController();

  List<Product> _products = [];
  List<Shop> _shops = [];
  List<Category> _categories = [];
  bool _isLoading = true;
  String? _selectedShopId;
  String? _selectedCategoryId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await AdminAuth().redirectToLoginIfNeeded(context);
      await _loadData();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final products = await _productService.getProducts();
    final shops = await _shopService.getShops();
    final db = await _dbHelper.database;
    final cats = await db.query('categories', orderBy: 'sort_order ASC');
    if (!mounted) return;
    setState(() {
      _products = products;
      _shops = shops;
      _categories = cats.map((m) => Category.fromMap(m)).toList();
      _isLoading = false;
    });
  }

  List<Product> get _filteredProducts {
    final q = _searchController.text.toLowerCase();
    return _products.where((p) {
      final matchesSearch = q.isEmpty || p.name.toLowerCase().contains(q);
      final matchesShop = _selectedShopId == null || p.shopId == _selectedShopId;
      final matchesCategory = _selectedCategoryId == null || p.categoryId == _selectedCategoryId;
      return matchesSearch && matchesShop && matchesCategory;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredProducts;

    return AdminScaffold(
      title: 'Mahsulotlar',
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddEditProduct(null),
        backgroundColor: AppColors.primaryGreen,
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          _buildSummaryHeader(),
          const SizedBox(height: 12),
          _buildQuickOnboardingRibbon(),
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 6, offset: const Offset(0, 2))],
              ),
              child: TextField(
                controller: _searchController,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  hintText: 'Mahsulot qidirish...',
                  prefixIcon: Icon(Icons.search, color: AppColors.textGray),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
            ),
          ),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _filterChip(
                'Barchasi',
                selected: _selectedShopId == null && _selectedCategoryId == null,
                onTap: () => setState(() {
                  _selectedShopId = null;
                  _selectedCategoryId = null;
                }),
              ),
              ..._shops.map(
                (shop) => _filterChip(
                  shop.name,
                  selected: _selectedShopId == shop.id,
                  onTap: () => setState(() => _selectedShopId = shop.id),
                ),
              ),
              ..._categories.map(
                (cat) => _filterChip(
                  cat.name,
                  selected: _selectedCategoryId == cat.id,
                  onTap: () => setState(() => _selectedCategoryId = cat.id),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Expanded(
            child: _isLoading
                ? ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 0),
                    itemCount: 6,
                    itemBuilder: (_, __) => const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: ShimmerPlaceholder(width: double.infinity, height: 96),
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _loadData,
                    child: filtered.isEmpty
                        ? ListView(
                            children: const [
                              SizedBox(height: 100),
                              Center(
                                child: Column(
                                  children: [
                                    Icon(Icons.inventory_outlined, size: 64, color: AppColors.textLight),
                                    SizedBox(height: 16),
                                    Text('Mahsulotlar topilmadi', style: TextStyle(color: AppColors.textGray)),
                                  ],
                                ),
                              ),
                            ],
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.only(top: 4),
                            itemCount: filtered.length,
                            itemBuilder: (context, index) {
                              final product = filtered[index];
                              final shopName = _shops.firstWhere(
                                (s) => s.id == product.shopId,
                                orElse: () => Shop(id: '', name: '-', address: '', phone: '', latitude: 0, longitude: 0, category: '', imageUrl: '', workingHours: '', isOpen: false, rating: 0),
                              ).name;
                              return Card(
                                elevation: 0,
                                color: Colors.transparent,
                                margin: const EdgeInsets.only(bottom: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                child: ListTile(
                                  onTap: () => _showAddEditProduct(product),
                                  contentPadding: const EdgeInsets.all(14),
                                  leading: Container(
                                    width: 56,
                                    height: 56,
                                    decoration: BoxDecoration(
                                      gradient: LinearGradient(
                                        colors: [
                                          AppColors.accentOrange.withValues(alpha: 0.18),
                                          AppColors.accentOrange.withValues(alpha: 0.08),
                                        ],
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                      ),
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    child: const Icon(Icons.inventory_2, color: AppColors.accentOrange),
                                  ),
                                  title: Text(
                                    product.name,
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.textBlack),
                                  ),
                                  subtitle: Padding(
                                    padding: const EdgeInsets.only(top: 6),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          shopName,
                                          style: const TextStyle(fontSize: 12, color: AppColors.textGray),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${product.price.toStringAsFixed(0)} so\'m | ${product.unit}',
                                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primaryGreen),
                                        ),
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: product.isAvailable ? AppColors.primarySurface : AppColors.error.withValues(alpha: 0.12),
                                                borderRadius: BorderRadius.circular(999),
                                              ),
                                              child: Text(
                                                product.isAvailable ? 'Bor' : 'Yo‘q',
                                                style: TextStyle(
                                                  color: product.isAvailable ? AppColors.primaryGreen : AppColors.error,
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w700,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: AppColors.backgroundGray,
                                                borderRadius: BorderRadius.circular(999),
                                              ),
                                              child: Text(
                                                product.category.isNotEmpty ? product.category : 'Kategoriya yo‘q',
                                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textGray),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  isThreeLine: true,
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      HoverActionButton(
                                        icon: Icons.edit,
                                        color: AppColors.accentOrange,
                                        onPressed: () => _showAddEditProduct(product),
                                      ),
                                      HoverActionButton(
                                        icon: Icons.delete,
                                        color: AppColors.error,
                                        onPressed: () async {
                                          await _productService.deleteProduct(product.id);
                                          await _loadData();
                                        },
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryHeader() {
    final availableCount = _products.where((p) => p.isAvailable).length;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: AppColors.primaryGreen.withValues(alpha: 0.14), blurRadius: 16, offset: const Offset(0, 6)),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Icon(Icons.inventory_2, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_products.length} mahsulot',
                  style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  '$availableCount ta faol, qidirish va filtrlar bilan boshqaring',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 13),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              '${_shops.length} do‘kon',
              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickOnboardingRibbon() {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _quickActionButton(
              icon: Icons.auto_awesome,
              label: 'Tayyor to‘plamlar',
              badge: 'Tezkor',
              color: AppColors.primaryGreen,
              onTap: () async {
                final shopParam = _selectedShopId != null ? '?shopId=$_selectedShopId' : '';
                await context.push('/seller/agro/starter-packs$shopParam');
                await _loadData();
              },
            ),
            const SizedBox(width: 8),
            _quickActionButton(
              icon: Icons.price_change_outlined,
              label: 'Bozor narxlarini yangilash',
              badge: '1 daqiqada',
              color: AppColors.accentOrange,
              onTap: () async {
                final shopParam = _selectedShopId != null ? '?shopId=$_selectedShopId' : '';
                await context.push('/seller/agro/daily-prices$shopParam');
                await _loadData();
              },
            ),
            const SizedBox(width: 8),
            _quickActionButton(
              icon: Icons.playlist_add_check,
              label: 'Baza katalogi (52+)',
              badge: 'Agro/Oziq',
              color: Colors.blue.shade700,
              onTap: () async {
                final shopParam = _selectedShopId != null ? '?shopId=$_selectedShopId' : '';
                await context.push('/seller/agro/catalog-claim$shopParam');
                await _loadData();
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _quickActionButton({
    required IconData icon,
    required String label,
    required String badge,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                badge,
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _filterChip(String label, {required bool selected, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.primaryGreen : AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: selected ? AppColors.primaryGreen : AppColors.divider),
        ),
        child: Text(label, style: TextStyle(color: selected ? Colors.white : AppColors.textGray, fontSize: 12)),
      ),
    );
  }

  void _showAddEditProduct(Product? existingProduct) {
    final nameController = TextEditingController(text: existingProduct?.name ?? '');
    final priceController = TextEditingController(text: existingProduct?.price.toString() ?? '');
    final descController = TextEditingController(text: existingProduct?.description ?? '');
    final stockController = TextEditingController(text: existingProduct?.stock.toString() ?? '0');
    String? selectedShopId = existingProduct?.shopId ?? (_shops.isNotEmpty ? _shops.first.id : null);
    String? selectedCategoryId = existingProduct?.categoryId ?? (_categories.isNotEmpty ? _categories.first.id : null);
    String selectedUnit = existingProduct?.unit ?? 'dona';
    bool isAvailable = existingProduct?.isAvailable ?? true;
    final formKey = GlobalKey<FormState>();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 16, right: 16, top: 16),
        child: Form(
          key: formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(controller: nameController, decoration: const InputDecoration(labelText: 'Nomi')),
                TextFormField(controller: priceController, decoration: const InputDecoration(labelText: 'Narxi')),
                DropdownButtonFormField<String>(
                  value: selectedShopId,
                  items: _shops.map((s) => DropdownMenuItem(value: s.id, child: Text(s.name))).toList(),
                  onChanged: (v) => selectedShopId = v,
                  decoration: const InputDecoration(labelText: 'Do\'kon'),
                ),
                DropdownButtonFormField<String>(
                  value: selectedCategoryId,
                  items: _categories.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
                  onChanged: (v) => selectedCategoryId = v,
                  decoration: const InputDecoration(labelText: 'Kategoriya'),
                ),
                DropdownButtonFormField<String>(
                  value: selectedUnit,
                  items: const ['dona', 'kg', 'litr', 'paket'].map((u) => DropdownMenuItem(value: u, child: Text(u))).toList(),
                  onChanged: (v) => selectedUnit = v ?? selectedUnit,
                  decoration: const InputDecoration(labelText: 'O\'lchov'),
                ),
                TextFormField(controller: stockController, decoration: const InputDecoration(labelText: 'Ombor soni')),
                TextFormField(controller: descController, decoration: const InputDecoration(labelText: 'Tavsif')),
                SwitchListTile(
                  value: isAvailable,
                  onChanged: (v) => setState(() => isAvailable = v),
                  title: const Text('Mavjud'),
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () async {
                    if (selectedShopId == null || selectedCategoryId == null) return;
                    final product = Product(
                      id: existingProduct?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
                      shopId: selectedShopId!,
                      categoryId: selectedCategoryId,
                      category: _categories.firstWhere((c) => c.id == selectedCategoryId).name,
                      name: nameController.text,
                      description: descController.text,
                      price: double.tryParse(priceController.text) ?? 0,
                      unit: selectedUnit,
                      imageUrl: existingProduct?.imageUrl ?? '',
                      isAvailable: isAvailable,
                      stock: int.tryParse(stockController.text) ?? 0,
                    );
                    if (existingProduct == null) {
                      await _productService.createProduct(product);
                    } else {
                      await _productService.updateProduct(product.id, product);
                    }
                    if (context.mounted) Navigator.pop(ctx);
                    await _loadData();
                  },
                  child: Text(existingProduct == null ? 'Qo\'shish' : 'Saqlash'),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
