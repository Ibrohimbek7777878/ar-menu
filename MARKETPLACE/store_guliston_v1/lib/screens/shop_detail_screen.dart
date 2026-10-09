import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config/app_colors.dart';
import '../models/product.dart';
import '../models/shop.dart';
import '../providers/cart_provider.dart';
import '../services/product_service.dart';
import '../services/ar_service.dart';
import '../services/api_service.dart';
import '../utils/responsive.dart';
import '../widgets/product_card_widget.dart';
import '../widgets/bundle_carousel.dart';
import '../widgets/reviews_carousel.dart';
import '../widgets/whatsapp_share.dart';
import '../widgets/instagram_block.dart';

class ShopDetailScreen extends StatefulWidget {
  final Shop shop;
  const ShopDetailScreen({super.key, required this.shop});
  @override
  State<ShopDetailScreen> createState() => _ShopDetailScreenState();
}

class _ShopDetailScreenState extends State<ShopDetailScreen> with SingleTickerProviderStateMixin {
  final ProductService _productService = ProductService();
  final ArService _arService = ArService();
  final ApiService _apiService = ApiService();
  final List<Product> _products = [];
  bool _isLoading = true;
  bool _isRestaurant = false;
  late TabController _tab;
  // tables
  List<Map<String, dynamic>> _halls = [];
  List<Map<String, dynamic>> _tables = [];
  bool _loadingTables = false;
  final TextEditingController _searchCtrl = TextEditingController();
  String _searchQuery = '';
  List<Product> get _filteredProducts => _searchQuery.isEmpty ? _products : _products.where((p) => p.name.toLowerCase().contains(_searchQuery.toLowerCase()) || p.description.toLowerCase().contains(_searchQuery.toLowerCase())).toList();

  @override
  void initState() {
    super.initState();
    _isRestaurant = widget.shop.storeType == 'restaurant' || widget.shop.storeType == 'cafe' || widget.shop.storeType == 'bar';
    _tab = TabController(length: _isRestaurant ? 2 : 1, vsync: this);
    _searchCtrl.addListener(() => setState(() => _searchQuery = _searchCtrl.text));
    _loadProducts();
    if (_isRestaurant) _loadTables();
    // S5-6 sotuvchi analitikasi — ko'rishlar
    if (widget.shop.slug != null) _apiService.incrementShopView(widget.shop.slug!);
  }

  @override
  void dispose() {
    _tab.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProducts() async {
    setState(() => _isLoading = true);
    final products = await _productService.getProducts(shopId: widget.shop.id);
    if (!mounted) return;
    setState(() {
      _products
        ..clear()
        ..addAll(products);
      _isLoading = false;
    });
  }

  Future<void> _loadTables() async {
    setState(() => _loadingTables = true);
    final data = await _arService.getRestaurantTables(int.tryParse(widget.shop.id) ?? 0);
    if (!mounted) return;
    setState(() {
      _halls = (data?['halls'] as List?)?.cast<Map<String, dynamic>>() ?? [];
      _tables = (data?['tables'] as List?)?.cast<Map<String, dynamic>>() ?? [];
      _loadingTables = false;
    });
  }

  Future<void> _openMap() async {
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=${widget.shop.latitude},${widget.shop.longitude}');
    if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  void _showQrScan() {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('QR token kiriting'),
        content: TextField(controller: ctrl, decoration: const InputDecoration(hintText: '31228411-...', border: OutlineInputBorder()), autofocus: true),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Bekor')),
          FilledButton(
            onPressed: () async {
              final token = ctrl.text.trim();
              if (token.isEmpty) return;
              Navigator.pop(context);
              final res = await _arService.resolveTable(token);
              if (!mounted) return;
              if (res != null) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Stol ${res['table']['number']} • ${res['shop']['name']}')));
                showDialog(context: context, builder: (_) => AlertDialog(title: Text('Stol ${res['table']['number']}'), content: Text('Do\'kon: ${res['shop']['name']}\nRedirect: ${res['redirect']}'), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))]));
              } else {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('QR topilmadi')));
              }
            },
            child: const Text('Tekshirish'),
          ),
        ],
      ),
    );
  }

  void _showTableQr(Map<String, dynamic> t) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Stol ${t['number']}'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.white, border: Border.all(color: Colors.grey[300]!), borderRadius: BorderRadius.circular(12)),
            child: Column(children: [
              const Icon(Icons.qr_code, size: 120, color: Colors.black87),
              const SizedBox(height: 8),
              SelectableText(t['qr_url']?.toString() ?? '', style: const TextStyle(fontSize: 9, color: Colors.grey)),
              const SizedBox(height: 4),
              Text('Token: ${t['qr_token']}', style: const TextStyle(fontSize: 8, color: Colors.grey)),
            ]),
          ),
          const SizedBox(height: 8),
          Text('Sig\'im: ${t['capacity']} • Holat: ${t['status']}', style: const TextStyle(fontSize: 12)),
        ]),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Yopish'))],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cartProvider = Provider.of<CartProvider>(context);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(widget.shop.name),
        bottom: _isRestaurant ? TabBar(controller: _tab, tabs: const [Tab(text: 'Menyu', icon: Icon(Icons.restaurant_menu, size: 18)), Tab(text: 'Stollar', icon: Icon(Icons.table_restaurant, size: 18))]) : null,
        actions: [
          if (_isRestaurant) IconButton(icon: const Icon(Icons.qr_code_scanner), tooltip: 'QR skaner', onPressed: _showQrScan),
          Stack(children: [
            IconButton(icon: const Icon(Icons.shopping_cart, color: AppColors.textBlack), onPressed: () => GoRouter.of(context).push('/cart')),
            if (cartProvider.itemCount > 0)
              Positioned(
                right: 4, top: 4,
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(color: AppColors.primaryGreen, borderRadius: BorderRadius.circular(10)),
                  constraints: const BoxConstraints(minWidth: 20, minHeight: 20),
                  child: Text(cartProvider.itemCount.toString(), textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ),
          ]),
        ],
      ),
      body: Column(
        children: [
          _header(),
          InstagramBlock(instagramUrl: widget.shop.instagramUrl, shopName: widget.shop.name),
          Expanded(
            child: _isRestaurant
                ? TabBarView(controller: _tab, children: [_productsGrid(), _tablesGrid()])
                : _productsGrid(),
          ),
        ],
      ),
      floatingActionButton: !cartProvider.isEmpty
          ? FloatingActionButton.extended(
              onPressed: () => context.push('/cart'),
              backgroundColor: AppColors.primaryGreen,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.shopping_cart, size: 20),
              label: Text('Savat: \$${(cartProvider.totalAmount / 10000).toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w600)),
            )
          : null,
    );
  }

  Widget _header() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      color: AppColors.surface,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 60, height: 60,
            decoration: BoxDecoration(color: AppColors.primarySurface, borderRadius: BorderRadius.circular(14)),
            child: Icon(widget.shop.storeType == 'restaurant' ? Icons.restaurant : widget.shop.storeType == 'cafe' ? Icons.local_cafe : widget.shop.storeType == 'bar' ? Icons.local_bar : Icons.store, color: AppColors.primaryGreen, size: 30),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(widget.shop.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textBlack), maxLines: 1, overflow: TextOverflow.ellipsis)),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: widget.shop.storeType == 'restaurant' ? const Color(0xFF7C3AED) : widget.shop.storeType == 'cafe' ? const Color(0xFFEA580C) : widget.shop.storeType == 'bar' ? const Color(0xFF0EA5E9) : AppColors.primarySurface, borderRadius: BorderRadius.circular(6)),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(widget.shop.storeType == 'restaurant' ? Icons.restaurant : widget.shop.storeType == 'cafe' ? Icons.local_cafe : widget.shop.storeType == 'bar' ? Icons.local_bar : Icons.store, size: 12, color: Colors.white),
                    const SizedBox(width: 4),
                    Text(widget.shop.storeType == 'restaurant' ? 'Restoran' : widget.shop.storeType == 'cafe' ? 'Kafe' : widget.shop.storeType == 'bar' ? 'Bar' : 'Do\'kon', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
                    if (widget.shop.hasAr) const Padding(padding: EdgeInsets.only(left: 4), child: Icon(Icons.view_in_ar, size: 12, color: Colors.white)),
                  ]),
                ),
              ]),
              const SizedBox(height: 4),
              Text(widget.shop.address, style: const TextStyle(fontSize: 14, color: AppColors.textGray), maxLines: 1, overflow: TextOverflow.ellipsis),
            ]),
          ),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          const Icon(Icons.star, size: 16, color: Color(0xFFFFA726)),
          const SizedBox(width: 4),
          Text(widget.shop.rating.toStringAsFixed(1), style: const TextStyle(color: AppColors.textBlack)),
          const SizedBox(width: 12),
          const Icon(Icons.visibility, size: 16, color: AppColors.textGray),
          const SizedBox(width: 4),
          Text('${widget.shop.views}', style: const TextStyle(fontSize: 13, color: AppColors.textGray)),
          const SizedBox(width: 12),
          const Icon(Icons.access_time, size: 16, color: AppColors.textGray),
          const SizedBox(width: 4),
          Text(widget.shop.workingHours, style: const TextStyle(fontSize: 14, color: AppColors.textGray)),
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(color: widget.shop.isOpen ? AppColors.primaryGreen : AppColors.error, borderRadius: BorderRadius.circular(6)),
            child: Text(widget.shop.isOpen ? 'Ochiq' : 'Yopiq', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
          ),
        ]),
        const SizedBox(height: 8),
        Row(children: [
          const Icon(Icons.phone, size: 16, color: AppColors.textGray),
          const SizedBox(width: 4),
          Text(widget.shop.phone, style: const TextStyle(color: AppColors.textGray)),
          const Spacer(),
          if (_isRestaurant)
            TextButton.icon(onPressed: _loadTables, icon: const Icon(Icons.refresh, size: 16), label: const Text('Yangilash', style: TextStyle(fontSize: 12))),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          ElevatedButton.icon(onPressed: _openMap, icon: const Icon(Icons.map, size: 18), label: const Text('Xaritada'), style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryGreen, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)))),
          const SizedBox(width: 10),
          WhatsAppShare.buttonShop(context, shopName: widget.shop.name, shopSlug: widget.shop.slug ?? widget.shop.id),
          Expanded(child: Text(widget.shop.storeType == 'restaurant' ? 'AR menyu • 3D ko\'rish mavjud' : 'Yetkazib berish 5000 so\'m', style: TextStyle(fontSize: 13, color: widget.shop.hasAr ? const Color(0xFF7C3AED) : AppColors.textGray, fontWeight: widget.shop.hasAr ? FontWeight.w600 : FontWeight.normal))),
        ]),
      ]),
    );
  }

  Widget _productsGrid() {
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    if (_products.isEmpty) return const Center(child: Text('Mahsulotlar mavjud emas'));
    final list = _filteredProducts;
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
        child: TextField(
          controller: _searchCtrl,
          decoration: InputDecoration(
            hintText: 'Menyuda qidirish...',
            prefixIcon: const Icon(Icons.search, size: 18),
            suffixIcon: _searchQuery.isNotEmpty ? IconButton(icon: const Icon(Icons.clear, size: 18), onPressed: () => _searchCtrl.clear()) : null,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            filled: true,
            fillColor: Colors.white,
          ),
        ),
      ),
      BundleCarousel(shopId: widget.shop.id),
      ReviewsCarousel(shopId: widget.shop.id),
      // S5-8 MCP tarjima tugmasi (demo) — mahsulot nomini RU ga tarjima
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Row(children: [
          const Icon(Icons.translate, size: 14, color: AppColors.textGray),
          const SizedBox(width: 6),
          const Text('Menyu MCP tarjima', style: TextStyle(fontSize: 12, color: AppColors.textGray)),
          const Spacer(),
          TextButton(
            onPressed: () async {
              // demo: birinchi mahsulotni rus tiliga tarjima so'rovi — MCP router orqali (backend ai/mcp)
              try {
                await _apiService.getHeaders();
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('MCP tarjima: backend ai/mcp/router tayyor (GEMINI/CLAUDE)')));
              } catch (_) {}
            },
            child: const Text('Tarjima', style: TextStyle(fontSize: 12)),
          ),
        ]),
      ),
      Expanded(
        child: list.isEmpty
            ? const Center(child: Text('Topilmadi'))
            : LayoutBuilder(builder: (context, constraints) {
                final crossAxisCount = Responsive.gridCrossAxisCount(context);
                return GridView.builder(
                  padding: EdgeInsets.all(Responsive.horizontalPadding(context)),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: crossAxisCount, childAspectRatio: Responsive.productCardAspectRatio(context), crossAxisSpacing: 12, mainAxisSpacing: 12),
                  itemCount: list.length,
                  itemBuilder: (context, index) => ProductCardWidget(product: list[index]),
                );
              }),
      ),
    ]);
  }

  Widget _tablesGrid() {
    if (_loadingTables) return const Center(child: CircularProgressIndicator());
    if (_tables.isEmpty) return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.table_restaurant_outlined, size: 48, color: Colors.grey), const SizedBox(height: 8), const Text('Stollar mavjud emas'), const SizedBox(height: 8), FilledButton(onPressed: _loadTables, child: const Text('Qayta yuklash'))]));
    // group by hall
    final hallsMap = {for (var h in _halls) h['id']: h['name']};
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (_halls.isNotEmpty)
          SizedBox(
            height: 36,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _halls.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) => Chip(label: Text(_halls[i]['name']?.toString() ?? 'Zal'), backgroundColor: AppColors.primarySurface),
            ),
          ),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, childAspectRatio: 1.6, crossAxisSpacing: 12, mainAxisSpacing: 12),
          itemCount: _tables.length,
          itemBuilder: (_, i) {
            final t = _tables[i];
            final status = t['status']?.toString() ?? 'free';
            final color = status == 'free' ? Colors.green : status == 'occupied' ? Colors.blue : status == 'ready' ? Colors.red : Colors.orange;
            return InkWell(
              onTap: () => _showTableQr(t),
              borderRadius: BorderRadius.circular(16),
              child: Container(
                decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: color.withValues(alpha: 0.3), width: 1.5)),
                child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.table_restaurant, size: 28, color: color),
                  const SizedBox(height: 6),
                  Text('Stol ${t['number']}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(6)), child: Text(status.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600))),
                  const SizedBox(height: 6),
                  Text(hallsMap[t['hall_id']]?.toString() ?? '', style: const TextStyle(fontSize: 11, color: AppColors.textGray)),
                  const SizedBox(height: 4),
                  const Row(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.qr_code, size: 12, color: AppColors.textGray), SizedBox(width: 4), Text('QR ko\'rish', style: TextStyle(fontSize: 11, color: AppColors.textGray))]),
                ]),
              ),
            );
          },
        ),
      ],
    );
  }
}
