import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../config/app_colors.dart';
import '../../models/shop.dart';
import '../../services/agro_onboarding_service.dart';
import '../../services/shop_service.dart';

/// Do'kon egalari uchun tayyor mahsulot to'plamlarini 1-bosishda yuklash ekrani
class AgroStarterPackScreen extends StatefulWidget {
  final String? initialShopId;

  const AgroStarterPackScreen({super.key, this.initialShopId});

  @override
  State<AgroStarterPackScreen> createState() => _AgroStarterPackScreenState();
}

class _AgroStarterPackScreenState extends State<AgroStarterPackScreen> {
  final AgroOnboardingService _agroService = AgroOnboardingService();
  final ShopService _shopService = ShopService();

  List<Map<String, dynamic>> _packs = [];
  List<Shop> _shops = [];
  String? _selectedShopId;
  bool _isLoading = true;
  bool _isApplying = false;

  @override
  void initState() {
    super.initState();
    _selectedShopId = widget.initialShopId;
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final shops = await _shopService.getShops();
      final packs = await _agroService.getStarterPacks();

      if (!mounted) return;
      setState(() {
        _shops = shops;
        if (_selectedShopId == null && shops.isNotEmpty) {
          _selectedShopId = shops.first.id;
        }
        _packs = packs;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Maʼlumotlarni yuklashda xatolik: $e')),
      );
    }
  }

  Future<void> _applyPack(Map<String, dynamic> pack) async {
    if (_selectedShopId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Iltimos, avval do‘konni tanlang')),
      );
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Text(pack['icon'] ?? '📦', style: const TextStyle(fontSize: 24)),
            const SizedBox(width: 8),
            Expanded(child: Text(pack['name'] ?? 'To‘plam')),
          ],
        ),
        content: Text(
          'Ushbu to‘plamdagi ${pack['items_count'] ?? 0} ta mahsulot do‘koningizga qo‘shiladi.\n\n'
          'Mahsulotlar nomi, o‘lchov birliklari (kg, litr, dona) va bozor narxlari avtomatik to‘ldiriladi.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Bekor qilish'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.primaryGreen),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Yuklash'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() => _isApplying = true);
    try {
      final res = await _agroService.applyStarterPack(
        packId: pack['id'] as int,
        shopId: _selectedShopId!,
      );

      if (!mounted) return;
      setState(() => _isApplying = false);

      final createdCount = res['created_count'] ?? 0;
      final skippedCount = res['skipped_existing'] ?? 0;

      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: AppColors.primaryGreen, size: 28),
              SizedBox(width: 8),
              Text('Muvaffaqiyatli!'),
            ],
          ),
          content: Text(
            '$createdCount ta yangi mahsulot do‘konga qo‘shildi!\n'
            '${skippedCount > 0 ? "($skippedCount ta mahsulot avvaldan mavjud bo'lgan)\n\n" : "\n"}'
            'Endi ushbu mahsulotlarning kunlik narxlarini bir martada tekshirib olishingiz mumkin.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Yopish'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: AppColors.accentOrange),
              onPressed: () {
                Navigator.pop(ctx);
                context.push('/seller/agro/daily-prices?shopId=$_selectedShopId');
              },
              child: const Text('Narxlarni sozlash'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isApplying = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Xatolik: $e'), backgroundColor: AppColors.error),
      );
    }
  }

  void _showPackPreview(Map<String, dynamic> pack) {
    final items = (pack['items'] as List<dynamic>?) ?? [];
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        height: MediaQuery.of(context).size.height * 0.75,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                children: [
                  Text(pack['icon'] ?? '📦', style: const TextStyle(fontSize: 28)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          pack['name'] ?? '',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          '${items.length} ta mahsulot tarkibi',
                          style: const TextStyle(fontSize: 13, color: AppColors.textGray),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(),
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                itemCount: items.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (ctx, i) {
                  final item = items[i] as Map<String, dynamic>;
                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    leading: CircleAvatar(
                      backgroundColor: AppColors.primarySurface,
                      child: Text(
                        '${i + 1}',
                        style: const TextStyle(
                          color: AppColors.primaryGreen,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    title: Text(
                      item['name'] ?? '',
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                    subtitle: Text(
                      'Birlik: ${item['unit']} • Tavsiya narxi: ${(item['typical_price'] as num?)?.toInt() ?? 0} so‘m',
                      style: const TextStyle(fontSize: 12, color: AppColors.textGray),
                    ),
                    trailing: Text(
                      '${(item['typical_price'] as num?)?.toInt() ?? 0} so‘m',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppColors.primaryGreen,
                      ),
                    ),
                  );
                },
              ),
            ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(backgroundColor: AppColors.primaryGreen),
                    icon: const Icon(Icons.file_download_outlined),
                    label: Text('${pack['name']} to‘plamini yuklash'),
                    onPressed: () {
                      Navigator.pop(ctx);
                      _applyPack(pack);
                    },
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Tayyor to‘plamlar (Agro & Oziq-ovqat)'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textBlack,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            tooltip: 'Katalogdan qidirish',
            onPressed: () => context.push('/seller/agro/catalog-claim?shopId=$_selectedShopId'),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              children: [
                SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildShopSelector(),
                      const SizedBox(height: 16),
                      _buildInfoBanner(),
                      const SizedBox(height: 20),
                      const Text(
                        'Mavjud to‘plamlar',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textBlack),
                      ),
                      const SizedBox(height: 12),
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _packs.length,
                        itemBuilder: (context, index) {
                          final pack = _packs[index];
                          return _buildPackCard(pack);
                        },
                      ),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
                if (_isApplying)
                  Container(
                    color: Colors.black38,
                    child: const Center(
                      child: Card(
                        child: Padding(
                          padding: EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              CircularProgressIndicator(),
                              SizedBox(height: 16),
                              Text(
                                'Mahsulotlar do‘konga kiritilmoqda...',
                                style: TextStyle(fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
    );
  }

  Widget _buildShopSelector() {
    if (_shops.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.amber.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.amber.shade200),
        ),
        child: const Row(
          children: [
            Icon(Icons.warning_amber, color: Colors.amber),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Sizda do‘kon topilmadi. Avval admin yoki sotuvchi sifatida do‘kon oching.',
                style: TextStyle(fontSize: 13),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          isExpanded: true,
          value: _selectedShopId,
          icon: const Icon(Icons.storefront, color: AppColors.primaryGreen),
          items: _shops.map((shop) {
            return DropdownMenuItem<String>(
              value: shop.id,
              child: Text(
                'Tanlangan do‘kon: ${shop.name}',
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
              ),
            );
          }).toList(),
          onChanged: (val) => setState(() => _selectedShopId = val),
        ),
      ),
    );
  }

  Widget _buildInfoBanner() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryGreen.withValues(alpha: 0.2),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: const Row(
        children: [
          Icon(Icons.flash_on_rounded, color: Colors.white, size: 36),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '1-bosishda do‘konni to‘ldirish',
                  style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 4),
                Text(
                  'Oziq-ovqat va bozor mahsulotlarini bittalab qo‘lda yozib chiqish shart emas. Kerakli to‘plamni tanlang va yuklang.',
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPackCard(Map<String, dynamic> pack) {
    final count = pack['items_count'] ?? 0;
    final icon = pack['icon'] ?? '🌱';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: AppColors.primarySurface,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  alignment: Alignment.center,
                  child: Text(icon, style: const TextStyle(fontSize: 26)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        pack['name'] ?? '',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textBlack),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$count ta mahsulot • Guliston bozori standarti',
                        style: const TextStyle(fontSize: 12, color: AppColors.textGray),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceVariant,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.primaryGreen.withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    pack['sector_display'] ?? pack['sector'] ?? 'Agro',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primaryGreen,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              pack['description'] ?? '',
              style: const TextStyle(fontSize: 13, color: AppColors.textBlack),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.primaryGreen),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.remove_red_eye_outlined, size: 18, color: AppColors.primaryGreen),
                    label: const Text('Tarkibni ko‘rish', style: TextStyle(color: AppColors.primaryGreen, fontSize: 13)),
                    onPressed: () => _showPackPreview(pack),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primaryGreen,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.add_shopping_cart, size: 18),
                    label: const Text('Do‘konga yuklash', style: TextStyle(fontSize: 13)),
                    onPressed: () => _applyPack(pack),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
