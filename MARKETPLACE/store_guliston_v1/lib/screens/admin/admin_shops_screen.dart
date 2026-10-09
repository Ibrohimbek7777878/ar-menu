import 'package:flutter/material.dart';

import '../../config/app_colors.dart';
import '../../database/database_helper.dart';
import '../../models/category.dart';
import '../../models/shop.dart';
import '../../services/admin_auth.dart';
import '../../services/shop_service.dart';
import '../../widgets/admin_scaffold.dart';
import '../../widgets/hover_action_button.dart';

class AdminShopsScreen extends StatefulWidget {
  const AdminShopsScreen({super.key});

  @override
  State<AdminShopsScreen> createState() => _AdminShopsScreenState();
}

class _AdminShopsScreenState extends State<AdminShopsScreen> {
  final ShopService _shopService = ShopService();
  final DatabaseHelper _dbHelper = DatabaseHelper();
  final TextEditingController _searchController = TextEditingController();

  List<Shop> _shops = [];
  List<Category> _categories = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await AdminAuth().redirectToLoginIfNeeded(context);
      await _loadShops();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadShops() async {
    setState(() => _isLoading = true);
    final shops = await _shopService.getShops();
    final db = await _dbHelper.database;
    final maps = await db.query('categories', orderBy: 'sort_order ASC');
    if (!mounted) return;
    setState(() {
      _shops = shops;
      _categories = maps.map((m) => Category.fromMap(m)).toList();
      _isLoading = false;
    });
  }

  List<Shop> get _filteredShops {
    final q = _searchController.text.toLowerCase();
    return _shops.where((s) => q.isEmpty || s.name.toLowerCase().contains(q) || s.address.toLowerCase().contains(q)).toList();
  }

  Future<void> _deleteShop(Shop shop) async {
    await _shopService.deleteShop(shop.id);
    await _loadShops();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredShops;

    return AdminScaffold(
      title: 'Do\'konlar',
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddEditShop(null),
        backgroundColor: AppColors.primaryGreen,
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          _buildSummaryHeader(),
          const SizedBox(height: 12),
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
                  hintText: 'Do\'kon qidirish...',
                  prefixIcon: Icon(Icons.search, color: AppColors.textGray),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: _loadShops,
                    child: filtered.isEmpty
                        ? ListView(
                            children: const [
                              SizedBox(height: 100),
                              Center(
                                child: Column(
                                  children: [
                                    Icon(Icons.store_outlined, size: 64, color: AppColors.textLight),
                                    SizedBox(height: 16),
                                    Text('Do\'konlar topilmadi', style: TextStyle(color: AppColors.textGray)),
                                  ],
                                ),
                              ),
                            ],
                          )
                        : ListView.builder(
                            itemCount: filtered.length,
                            itemBuilder: (context, index) {
                              final shop = filtered[index];
                              final categoryLabel = shop.categoryId != null
                                  ? _categories.firstWhere(
                                      (c) => c.id == shop.categoryId,
                                      orElse: () => Category(id: '', name: shop.category, color: '#4CAF50', sortOrder: 0),
                                    ).name
                                  : shop.category;
                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(20),
                                  boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 8, offset: const Offset(0, 2))],
                                ),
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(20),
                                  onTap: () => _showAddEditShop(shop),
                                  child: Padding(
                                    padding: const EdgeInsets.all(14),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 56,
                                          height: 56,
                                          decoration: BoxDecoration(
                                            gradient: LinearGradient(
                                              colors: [
                                                AppColors.primaryGreen.withValues(alpha: 0.18),
                                                AppColors.primaryGreen.withValues(alpha: 0.08),
                                              ],
                                              begin: Alignment.topLeft,
                                              end: Alignment.bottomRight,
                                            ),
                                            borderRadius: BorderRadius.circular(16),
                                          ),
                                          child: const Icon(Icons.storefront, color: AppColors.primaryGreen, size: 28),
                                        ),
                                        const SizedBox(width: 14),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Expanded(
                                                    child: Text(
                                                      shop.name,
                                                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.textBlack),
                                                    ),
                                                  ),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                    decoration: BoxDecoration(
                                                      color: shop.isOpen ? AppColors.primarySurface : AppColors.error.withValues(alpha: 0.12),
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
                                              const SizedBox(height: 5),
                                              Text(
                                                shop.address,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(fontSize: 12, color: AppColors.textGray),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                '${shop.phone} • ${categoryLabel.isEmpty ? 'Kategoriya yo‘q' : categoryLabel}',
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(fontSize: 12, color: AppColors.textGray),
                                              ),
                                              const SizedBox(height: 6),
                                              Row(
                                                children: [
                                                  Icon(Icons.star, size: 14, color: Colors.amber.shade700),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    shop.rating > 0 ? shop.rating.toStringAsFixed(1) : '0.0',
                                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textBlack),
                                                  ),
                                                  const SizedBox(width: 12),
                                                  Icon(Icons.access_time, size: 14, color: AppColors.textGray),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    shop.workingHours.isNotEmpty ? shop.workingHours : 'Soat yo‘q',
                                                    style: const TextStyle(fontSize: 12, color: AppColors.textGray),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Column(
                                          children: [
                                            HoverActionButton(
                                              icon: Icons.edit,
                                              color: AppColors.accentOrange,
                                              onPressed: () => _showAddEditShop(shop),
                                            ),
                                            const SizedBox(height: 4),
                                            HoverActionButton(
                                              icon: Icons.delete,
                                              color: AppColors.error,
                                              onPressed: () => _deleteShop(shop),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
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
            child: const Icon(Icons.storefront, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_shops.length} do‘kon',
                  style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  'Do‘konlarni tez tahrirlang, statusni kuzating',
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
              '${_shops.where((s) => s.isOpen).length} ochiq',
              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  void _showAddEditShop(Shop? existingShop) {
    final nameController = TextEditingController(text: existingShop?.name ?? '');
    final addressController = TextEditingController(text: existingShop?.address ?? '');
    final phoneController = TextEditingController(text: existingShop?.phone ?? '');
    final formKey = GlobalKey<FormState>();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 16, right: 16, top: 16),
        child: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Nom'),
                validator: (v) => v == null || v.isEmpty ? 'Nom kiriting' : null,
              ),
              TextFormField(
                controller: addressController,
                decoration: const InputDecoration(labelText: 'Manzil'),
                validator: (v) => v == null || v.isEmpty ? 'Manzil kiriting' : null,
              ),
              TextFormField(
                controller: phoneController,
                decoration: const InputDecoration(labelText: 'Telefon'),
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () async {
                  if (!formKey.currentState!.validate()) return;
                  final shop = Shop(
                    id: existingShop?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
                    name: nameController.text,
                    address: addressController.text,
                    phone: phoneController.text,
                    latitude: existingShop?.latitude ?? 0,
                    longitude: existingShop?.longitude ?? 0,
                    category: existingShop?.category ?? '',
                    imageUrl: existingShop?.imageUrl ?? '',
                    workingHours: existingShop?.workingHours ?? '',
                    isOpen: existingShop?.isOpen ?? true,
                    rating: existingShop?.rating ?? 0,
                    city: existingShop?.city ?? '',
                    categoryId: existingShop?.categoryId,
                  );
                  if (existingShop == null) {
                    await _shopService.createShop(shop);
                  } else {
                    await _shopService.updateShop(shop.id, shop);
                  }
                  if (context.mounted) Navigator.pop(ctx);
                  await _loadShops();
                },
                child: Text(existingShop == null ? 'Qo\'shish' : 'Saqlash'),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
