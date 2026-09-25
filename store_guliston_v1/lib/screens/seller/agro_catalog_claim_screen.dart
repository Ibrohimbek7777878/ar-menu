import 'package:flutter/material.dart';

import '../../config/app_colors.dart';
import '../../models/shop.dart';
import '../../services/agro_onboarding_service.dart';
import '../../services/shop_service.dart';

/// Oziq-ovqat va Agro Baza (52+ master mahsulot)dan do'konga tezkor qo'shish ekrani
class AgroCatalogClaimScreen extends StatefulWidget {
  final String? initialShopId;

  const AgroCatalogClaimScreen({super.key, this.initialShopId});

  @override
  State<AgroCatalogClaimScreen> createState() => _AgroCatalogClaimScreenState();
}

class _AgroCatalogClaimScreenState extends State<AgroCatalogClaimScreen> {
  final AgroOnboardingService _agroService = AgroOnboardingService();
  final ShopService _shopService = ShopService();

  List<Shop> _shops = [];
  String? _selectedShopId;
  List<Map<String, dynamic>> _masterProducts = [];
  bool _isLoading = true;
  String _selectedSector = '';
  final TextEditingController _searchController = TextEditingController();
  final Set<int> _claimedIds = {};

  final List<Map<String, String>> _sectors = [
    {'key': '', 'label': 'Barchasi', 'icon': '🌟'},
    {'key': 'vegetables', 'label': 'Sabzavot', 'icon': '🥔'},
    {'key': 'fruits', 'label': 'Meva & Poliz', 'icon': '🍉'},
    {'key': 'meat', 'label': 'Go‘sht', 'icon': '🥩'},
    {'key': 'dairy', 'label': 'Sut', 'icon': '🥛'},
    {'key': 'grains', 'label': 'Don', 'icon': '🌾'},
    {'key': 'grocery', 'label': 'Baqqollik', 'icon': '🛒'},
  ];

  @override
  void initState() {
    super.initState();
    _selectedShopId = widget.initialShopId;
    _initData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _initData() async {
    setState(() => _isLoading = true);
    try {
      final shops = await _shopService.getShops();
      _shops = shops;
      if (_selectedShopId == null && shops.isNotEmpty) {
        _selectedShopId = shops.first.id;
      }
      await _fetchMasterProducts();
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Xatolik: $e')),
      );
    }
  }

  Future<void> _fetchMasterProducts() async {
    setState(() => _isLoading = true);
    try {
      final results = await _agroService.masterSearch(
        query: _searchController.text.trim(),
        sector: _selectedSector.isNotEmpty ? _selectedSector : null,
      );
      if (!mounted) return;
      setState(() {
        _masterProducts = results;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Qidiruvda xatolik: $e')),
      );
    }
  }

  Future<void> _claimProduct(Map<String, dynamic> item) async {
    if (_selectedShopId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Iltimos, avval do‘konni tanlang')),
      );
      return;
    }

    final id = item['id'] as int;
    final defaultPrice = (item['typical_price'] as num?)?.toInt() ?? 10000;
    final priceController = TextEditingController(text: defaultPrice.toString());
    final stockController = TextEditingController(text: '100');

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Icon(Icons.add_shopping_cart, color: AppColors.primaryGreen),
            const SizedBox(width: 8),
            Expanded(child: Text(item['name'] ?? '', maxLines: 1, overflow: TextOverflow.ellipsis)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'O‘lchov birligi: ${item['unit']} • Sektor: ${item['sector_display'] ?? item['sector']}',
              style: const TextStyle(fontSize: 12, color: AppColors.textGray),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: priceController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Sotuv narxi (so‘m/${item['unit']})',
                border: const OutlineInputBorder(),
                suffixText: 'so‘m',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: stockController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Zaxira miqdori (${item['unit']})',
                border: const OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Bekor qilish'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.primaryGreen),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Do‘konga qo‘shish'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    try {
      final parsedPrice = double.tryParse(priceController.text) ?? defaultPrice.toDouble();
      final parsedStock = int.tryParse(stockController.text) ?? 100;

      await _agroService.claimProduct(
        masterProductId: id,
        shopId: _selectedShopId!,
        price: parsedPrice,
        stock: parsedStock,
      );

      if (!mounted) return;
      setState(() {
        _claimedIds.add(id);
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.primaryGreen,
          content: Text('${item['name']} do‘konga qo‘shildi!'),
          duration: const Duration(seconds: 2),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Xatolik: $e'), backgroundColor: AppColors.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Agro & Bozor katalogi (52+)'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textBlack,
        elevation: 0,
      ),
      body: Column(
        children: [
          _buildSearchAndFilters(),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _masterProducts.isEmpty
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.search_off, size: 60, color: AppColors.textLight),
                            SizedBox(height: 12),
                            Text('Mahsulot topilmadi', style: TextStyle(color: AppColors.textGray)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        itemCount: _masterProducts.length,
                        itemBuilder: (context, index) {
                          final item = _masterProducts[index];
                          return _buildMasterProductCard(item);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchAndFilters() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Column(
        children: [
          if (_shops.length > 1)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: _selectedShopId,
                  items: _shops.map((s) {
                    return DropdownMenuItem<String>(
                      value: s.id,
                      child: Text('Do‘kon: ${s.name}', style: const TextStyle(fontWeight: FontWeight.w600)),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedShopId = val);
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
              onSubmitted: (_) => _fetchMasterProducts(),
              decoration: InputDecoration(
                hintText: 'Pomidor, guruch, go‘sht yoki shtrix-kod...',
                prefixIcon: const Icon(Icons.search, color: AppColors.textGray),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.arrow_forward, color: AppColors.primaryGreen),
                  onPressed: _fetchMasterProducts,
                ),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
            ),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _sectors.map((sec) {
                final isSelected = _selectedSector == sec['key'];
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ChoiceChip(
                    label: Text('${sec['icon']} ${sec['label']}'),
                    selected: isSelected,
                    selectedColor: AppColors.primaryGreen,
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : AppColors.textBlack,
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                    onSelected: (_) {
                      setState(() => _selectedSector = sec['key']!);
                      _fetchMasterProducts();
                    },
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMasterProductCard(Map<String, dynamic> item) {
    final id = item['id'] as int;
    final isClaimed = _claimedIds.contains(id);
    final typicalPrice = (item['typical_price'] as num?)?.toInt() ?? 0;
    final unit = item['unit'] ?? 'kg';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: AppColors.primarySurface,
              borderRadius: BorderRadius.circular(12),
            ),
            alignment: Alignment.center,
            child: const Icon(Icons.eco_rounded, color: AppColors.primaryGreen, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item['name'] ?? '',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textBlack),
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.backgroundGray,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        unit,
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textGray),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Tavsiya: $typicalPrice so‘m',
                      style: const TextStyle(fontSize: 11, color: AppColors.primaryGreen, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          isClaimed
              ? Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primarySurface,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check, size: 16, color: AppColors.primaryGreen),
                      SizedBox(width: 4),
                      Text(
                        'Qo‘shildi',
                        style: TextStyle(
                          color: AppColors.primaryGreen,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                )
              : FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primaryGreen,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () => _claimProduct(item),
                  child: const Text('Qo‘shish', style: TextStyle(fontSize: 12)),
                ),
        ],
      ),
    );
  }
}
