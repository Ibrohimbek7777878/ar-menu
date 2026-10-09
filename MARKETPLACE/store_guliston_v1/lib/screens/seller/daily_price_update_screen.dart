import 'package:flutter/material.dart';

import '../../config/app_colors.dart';
import '../../models/product.dart';
import '../../models/shop.dart';
import '../../services/agro_onboarding_service.dart';
import '../../services/product_service.dart';
import '../../services/shop_service.dart';

/// Guliston dehqon bozori va oziq-ovqat do'konlari uchun kunlik narxlarni 1 daqiqada yangilash ekrani
class DailyPriceUpdateScreen extends StatefulWidget {
  final String? initialShopId;

  const DailyPriceUpdateScreen({super.key, this.initialShopId});

  @override
  State<DailyPriceUpdateScreen> createState() => _DailyPriceUpdateScreenState();
}

class _DailyPriceUpdateScreenState extends State<DailyPriceUpdateScreen> {
  final ProductService _productService = ProductService();
  final ShopService _shopService = ShopService();
  final AgroOnboardingService _agroService = AgroOnboardingService();

  List<Product> _products = [];
  List<Shop> _shops = [];
  String? _selectedShopId;
  bool _isLoading = true;
  bool _isSaving = false;

  final TextEditingController _searchController = TextEditingController();
  final Map<int, double> _editedPrices = {};
  final Map<int, bool> _editedAvailability = {};
  final Map<int, TextEditingController> _controllers = {};

  @override
  void initState() {
    super.initState();
    _selectedShopId = widget.initialShopId;
    _loadInitial();
  }

  @override
  void dispose() {
    _searchController.dispose();
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _loadInitial() async {
    setState(() => _isLoading = true);
    try {
      final shops = await _shopService.getShops();
      _shops = shops;
      if (_selectedShopId == null && shops.isNotEmpty) {
        _selectedShopId = shops.first.id;
      }
      await _loadProductsForShop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Yuklashda xatolik: $e')),
      );
    }
  }

  Future<void> _loadProductsForShop() async {
    if (_selectedShopId == null) {
      setState(() {
        _products = [];
        _isLoading = false;
      });
      return;
    }

    setState(() => _isLoading = true);
    try {
      final prods = await _productService.getProducts(shopId: _selectedShopId!);
      for (final c in _controllers.values) {
        c.dispose();
      }
      _controllers.clear();
      _editedPrices.clear();
      _editedAvailability.clear();

      for (final p in prods) {
        final id = int.tryParse(p.id) ?? 0;
        _controllers[id] = TextEditingController(text: p.price.toInt().toString());
      }

      if (!mounted) return;
      setState(() {
        _products = prods;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Mahsulotlar yuklanmadi: $e')),
      );
    }
  }

  void _onPriceChanged(int productId, String val) {
    final parsed = double.tryParse(val.replaceAll(' ', ''));
    if (parsed != null && parsed >= 0) {
      setState(() {
        _editedPrices[productId] = parsed;
      });
    }
  }

  void _adjustPrice(int productId, double delta) {
    final current = _editedPrices[productId] ??
        _products.firstWhere((p) => (int.tryParse(p.id) ?? 0) == productId).price;
    final next = (current + delta).clamp(0.0, 10000000.0);
    setState(() {
      _editedPrices[productId] = next;
      _controllers[productId]?.text = next.toInt().toString();
    });
  }

  void _toggleAvailability(int productId, bool current) {
    final next = !(_editedAvailability[productId] ?? current);
    setState(() {
      _editedAvailability[productId] = next;
    });
  }

  Future<void> _saveAllChanges() async {
    if (_selectedShopId == null) return;
    if (_editedPrices.isEmpty && _editedAvailability.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('O‘zgartirilgan narx yoki holat yo‘q')),
      );
      return;
    }

    final allProductIds = {..._editedPrices.keys, ..._editedAvailability.keys};
    final List<Map<String, dynamic>> updates = [];

    for (final pid in allProductIds) {
      final update = <String, dynamic>{'product_id': pid};
      if (_editedPrices.containsKey(pid)) {
        update['price'] = _editedPrices[pid];
      }
      if (_editedAvailability.containsKey(pid)) {
        update['is_available'] = _editedAvailability[pid];
      }
      updates.add(update);
    }

    setState(() => _isSaving = true);
    try {
      final res = await _agroService.quickPriceUpdate(
        shopId: _selectedShopId!,
        updates: updates,
      );

      if (!mounted) return;
      setState(() {
        _isSaving = false;
        _editedPrices.clear();
        _editedAvailability.clear();
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.primaryGreen,
          content: Text(
            res['message'] ?? '${updates.length} ta mahsulot narxi muvaffaqiyatli saqlandi!',
          ),
        ),
      );

      await _loadProductsForShop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Saqlashda xatolik: $e'), backgroundColor: AppColors.error),
      );
    }
  }

  List<Product> get _filteredProducts {
    final q = _searchController.text.trim().toLowerCase();
    if (q.isEmpty) return _products;
    return _products.where((p) => p.name.toLowerCase().contains(q)).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredProducts;
    final totalChanges = {..._editedPrices.keys, ..._editedAvailability.keys}.length;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Kunlik narxlarni yangilash'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textBlack,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _loadProductsForShop,
          ),
        ],
      ),
      body: Column(
        children: [
          _buildHeader(),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.store_mall_directory_outlined, size: 64, color: AppColors.textLight),
                            const SizedBox(height: 12),
                            const Text(
                              'Mahsulotlar topilmadi',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textGray),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Avval tayyor to‘plamdan mahsulotlarni yuklab oling',
                              style: TextStyle(fontSize: 13, color: AppColors.textGray),
                            ),
                            const SizedBox(height: 16),
                            FilledButton.icon(
                              style: FilledButton.styleFrom(backgroundColor: AppColors.primaryGreen),
                              icon: const Icon(Icons.add),
                              label: const Text('To‘plamdan yuklash'),
                              onPressed: () => Navigator.pop(context),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.only(left: 14, right: 14, top: 10, bottom: 90),
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final product = filtered[index];
                          return _buildProductPriceRow(product);
                        },
                      ),
          ),
        ],
      ),
      bottomSheet: totalChanges > 0
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 10,
                    offset: const Offset(0, -3),
                  ),
                ],
              ),
              child: SafeArea(
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$totalChanges ta mahsulot o‘zgartirildi',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textBlack),
                          ),
                          const Text(
                            'Barcha xaridorlar yangi narxlarni ko‘radi',
                            style: TextStyle(fontSize: 11, color: AppColors.textGray),
                          ),
                        ],
                      ),
                    ),
                    FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primaryGreen,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: _isSaving ? null : _saveAllChanges,
                      child: _isSaving
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Text('Barchasini saqlash', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildHeader() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_shops.length > 1)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: _selectedShopId,
                  icon: const Icon(Icons.arrow_drop_down, color: AppColors.primaryGreen),
                  items: _shops.map((s) {
                    return DropdownMenuItem<String>(
                      value: s.id,
                      child: Text('Do‘kon: ${s.name}', style: const TextStyle(fontWeight: FontWeight.w600)),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null && val != _selectedShopId) {
                      setState(() => _selectedShopId = val);
                      _loadProductsForShop();
                    }
                  },
                ),
              ),
            ),
          Container(
            decoration: BoxDecoration(
              color: AppColors.backgroundGray,
              borderRadius: BorderRadius.circular(12),
            ),
            child: TextField(
              controller: _searchController,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                hintText: 'Mahsulot nomi bo‘yicha qidirish...',
                prefixIcon: Icon(Icons.search, color: AppColors.textGray),
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.info_outline, size: 14, color: AppColors.textGray),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  'Bozor narxlarini tezkor o‘zgartirish uchun raqam ustiga bosing yoki +/- tugmalaridan foydalaning.',
                  style: TextStyle(fontSize: 11, color: AppColors.textGray.withValues(alpha: 0.9)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProductPriceRow(Product product) {
    final pid = int.tryParse(product.id) ?? 0;
    final isEdited = _editedPrices.containsKey(pid) || _editedAvailability.containsKey(pid);
    final isAvailable = _editedAvailability[pid] ?? product.isAvailable;
    final controller = _controllers[pid];

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isEdited ? const Color(0xFFF0FDF4) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isEdited ? AppColors.primaryGreen : AppColors.divider,
          width: isEdited ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textBlack),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Birligi: ${product.unit} • Asl narxi: ${product.price.toInt()} so‘m',
                      style: const TextStyle(fontSize: 11, color: AppColors.textGray),
                    ),
                  ],
                ),
              ),
              InkWell(
                onTap: () => _toggleAvailability(pid, product.isAvailable),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: isAvailable ? AppColors.primarySurface : AppColors.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    isAvailable ? 'Bor' : 'Tugagan',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isAvailable ? AppColors.primaryGreen : AppColors.error,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _deltaButton(pid, -5000, '-5k'),
              const SizedBox(width: 4),
              _deltaButton(pid, -1000, '-1k'),
              const SizedBox(width: 8),
              Expanded(
                child: Container(
                  height: 42,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isEdited ? AppColors.primaryGreen : AppColors.divider,
                      width: 1.5,
                    ),
                  ),
                  child: TextField(
                    controller: controller,
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primaryGreenDark),
                    decoration: const InputDecoration(
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(horizontal: 6, vertical: 10),
                      suffixText: 'so‘m',
                      suffixStyle: TextStyle(fontSize: 11, color: AppColors.textGray),
                    ),
                    onChanged: (val) => _onPriceChanged(pid, val),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              _deltaButton(pid, 1000, '+1k'),
              const SizedBox(width: 4),
              _deltaButton(pid, 5000, '+5k'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _deltaButton(int pid, double delta, String label) {
    return InkWell(
      onTap: () => _adjustPrice(pid, delta),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.backgroundGray,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textBlack),
        ),
      ),
    );
  }
}
