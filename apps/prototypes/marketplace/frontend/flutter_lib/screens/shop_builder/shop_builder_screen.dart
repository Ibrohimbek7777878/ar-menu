import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../models/product.dart';
import '../../models/shop.dart';
import '../../services/shop_service.dart';
import '../../services/product_service.dart';
import 'template_picker_screen.dart';

class ShopBuilderScreen extends StatefulWidget {
  final String? initialTemplate;
  final int? shopId; // target shop for import/manual
  const ShopBuilderScreen({super.key, this.initialTemplate, this.shopId});
  @override
  State<ShopBuilderScreen> createState() => _ShopBuilderScreenState();
}

class _ShopBuilderScreenState extends State<ShopBuilderScreen> with SingleTickerProviderStateMixin {
  final ShopService _shopService = ShopService();
  final ProductService _productService = ProductService();
  String? _selectedTemplate;
  List<Map<String, dynamic>> _sections = [];
  bool _loading = true;
  bool _isMobile = true;
  late TabController _tab;
  int? _targetShopId;

  final List<String> _types = ['hero', 'product_grid', 'category_strip', 'banner', 'map', 'reviews', 'cta', 'richtext'];
  final Map<String, String> _labels = {
    'hero': 'Hero', 'product_grid': 'Mahsulotlar', 'category_strip': 'Kategoriyalar',
    'banner': 'Banner', 'map': 'Xarita', 'reviews': 'Sharhlar', 'cta': 'Chaqiriq', 'richtext': 'Matn',
  };

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
    _targetShopId = widget.shopId;
    _load();
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final t = await _shopService.getTemplateDetail(widget.initialTemplate ?? 'minimal');
      if (!mounted) return;
      // if shopId not provided, pick first shop
      if (_targetShopId == null) {
        final shops = await _shopService.getShops();
        if (shops.isNotEmpty) _targetShopId = int.tryParse(shops.first.id);
      }
      setState(() {
        _selectedTemplate = t?.slug ?? 'minimal';
        _sections = t != null ? List<Map<String, dynamic>>.from(t.defaultLayout) : [];
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Map<String, dynamic> _defaultSection(String type) {
    switch (type) {
      case 'hero': return {'type': 'hero', 'title': "Do'kon nomi", 'subtitle': 'Tavsif', 'image': '', 'cta_text': "Katalogga o'tish", 'cta_link': '/catalog/'};
      case 'product_grid': return {'type': 'product_grid', 'title': 'Mahsulotlar', 'subtitle': '', 'product_filter': '', 'limit': 12, 'product_ids': []};
      case 'category_strip': return {'type': 'category_strip', 'title': 'Kategoriyalar', 'subtitle': ''};
      case 'banner': return {'type': 'banner', 'title': 'Banner', 'subtitle': '', 'image': ''};
      case 'map': return {'type': 'map', 'title': 'Manzil', 'subtitle': ''};
      case 'reviews': return {'type': 'reviews', 'title': 'Sharhlar', 'subtitle': ''};
      case 'cta': return {'type': 'cta', 'title': 'Chaqiriq', 'subtitle': '', 'cta_text': 'Buyurtma berish', 'cta_link': '/catalog/'};
      case 'richtext': return {'type': 'richtext', 'title': 'Matn', 'text': 'Matn kiriting...', 'subtitle': ''};
      default: return {'type': type, 'title': type, 'subtitle': ''};
    }
  }

  void _add(String type) {
    setState(() => _sections.add(_defaultSection(type)));
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Bo'lim qo'shildi")));
  }

  void _remove(int i) => setState(() => _sections.removeAt(i));

  void _reorder(int oldI, int newI) {
    setState(() {
      if (oldI < newI) newI -= 1;
      final s = _sections.removeAt(oldI);
      _sections.insert(newI, s);
    });
  }

  Future<void> _save() async {
    if (_selectedTemplate == null) return;
    try {
      // Tahrirlangan sectionlar bilan birga saqlanadi — aks holda default layout qayta yozadi
      await _shopService.applyTemplate(
        _selectedTemplate!,
        layout: {'sections': _sections},
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saqlandi')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Xatolik: $e')));
    }
  }

  Future<void> _pickTemplate() async {
    final res = await Navigator.push<String>(context, MaterialPageRoute(builder: (_) => TemplatePickerScreen(currentTemplate: _selectedTemplate)));
    if (res != null && mounted) {
      setState(() => _selectedTemplate = res);
      try {
        final t = await _shopService.getTemplateDetail(res);
        if (t != null && mounted) setState(() => _sections = List<Map<String, dynamic>>.from(t.defaultLayout));
      } catch (_) {}
    }
  }

  void _showAddDialog() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text("Bo'lim qo'shish"),
        content: Wrap(
          spacing: 8, runSpacing: 8,
          children: _types.map((t) => ActionChip(label: Text(_labels[t] ?? t), onPressed: () { Navigator.pop(context); _add(t); })).toList(),
        ),
      ),
    );
  }

  // 2-usul: Auto export – mavjud akkauntdagi mahsulotlarni yangi do'konga import
  Future<void> _showImportDialog() async {
    if (_targetShopId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Avval do'kon tanlang")));
      return;
    }
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );
    List<Shop> shops = [];
    try {
      shops = await _shopService.getMyShops();
      // exclude target
      shops = shops.where((s) => int.tryParse(s.id) != _targetShopId).toList();
    } catch (e) {
      if (mounted) Navigator.pop(context);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Yuklash xatoligi: $e')));
      return;
    }
    if (!mounted) return;
    Navigator.pop(context);
    if (shops.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Import uchun boshqa do\'kon topilmadi')));
      return;
    }
    final selected = await showDialog<Shop>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Qaysi do\'kondan import qilinsin?'),
        content: SizedBox(
          width: double.maxFinite,
          height: 300,
          child: ListView.builder(
            itemCount: shops.length,
            itemBuilder: (_, i) {
              final s = shops[i];
              return ListTile(
                leading: const Icon(Icons.store_outlined),
                title: Text(s.name),
                subtitle: Text(s.address, maxLines: 1, overflow: TextOverflow.ellipsis),
                onTap: () => Navigator.pop(context, s),
              );
            },
          ),
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Bekor'))],
      ),
    );
    if (selected == null || !mounted) return;
    final sourceId = int.tryParse(selected.id);
    if (sourceId == null) return;
    // confirm full or selective
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('"${selected.name}" dan import?'),
        content: const Text('Barcha mahsulotlar yangi do\'konga klonlanadi (nusxalanadi). Davom etilsinmi?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Bekor')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Import')),
        ],
      ),
    );
    if (confirm != true || !mounted) return;
    // proceed import
    showDialog(context: context, barrierDismissible: false, builder: (_) => const Center(child: CircularProgressIndicator()));
    try {
      final res = await _shopService.importProducts(targetShopId: _targetShopId!, sourceShopId: sourceId);
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['message'] ?? '${res['created']} ta mahsulot import qilindi')));
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Import xatoligi: $e')));
    }
  }

  // 1-usul: Qolda har birini alohida joylashtirish – product_grid sectionga mahsulot tanlash
  Future<void> _showProductPicker(int sectionIndex) async {
    if (_targetShopId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Do'kon aniqlanmadi")));
      return;
    }
    showDialog(context: context, barrierDismissible: false, builder: (_) => const Center(child: CircularProgressIndicator()));
    List<Product> products = [];
    try {
      products = await _productService.getProducts(shopId: _targetShopId.toString());
    } catch (e) {
      if (mounted) Navigator.pop(context);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Mahsulotlar yuklanmadi: $e')));
      return;
    }
    if (!mounted) return;
    Navigator.pop(context);
    if (products.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Bu do'konda mahsulot yo'q — avval import qiling")));
      return;
    }
    final currentIds = Set<int>.from((_sections[sectionIndex]['product_ids'] as List?)?.cast<int>() ?? []);
    final selectedIds = Set<int>.from(currentIds);
    final result = await showDialog<Set<int>>(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: const Text('Mahsulotlarni tanlang (qolda)'),
          content: SizedBox(
            width: double.maxFinite,
            height: 400,
            child: ListView.builder(
              itemCount: products.length,
              itemBuilder: (_, i) {
                final p = products[i];
                final id = int.tryParse(p.id) ?? -1;
                final sel = selectedIds.contains(id);
                return CheckboxListTile(
                  value: sel,
                  title: Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                  subtitle: Text('${p.price} so\'m', style: const TextStyle(fontSize: 12)),
                  onChanged: (v) => setState(() => v == true ? selectedIds.add(id) : selectedIds.remove(id)),
                );
              },
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Bekor')),
            FilledButton(onPressed: () => Navigator.pop(context, selectedIds), child: Text('Saqlash (${selectedIds.length})')),
          ],
        ),
      ),
    );
    if (result == null || !mounted) return;
    // update local layout
    setState(() {
      _sections[sectionIndex]['product_ids'] = result.toList();
      _sections[sectionIndex]['product_filter'] = result.isEmpty ? '' : 'manual';
    });
    // also persist to backend ShopPage if possible
    try {
      await _shopService.setManualProducts(shopId: _targetShopId!, sectionIndex: sectionIndex, productIds: result.toList());
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${result.length} ta mahsulot biriktirildi')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Saqlash xatoligi: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text("Do'kon muharriri"),
        bottom: TabBar(
          controller: _tab,
          onTap: (i) => setState(() => _isMobile = i == 0),
          tabs: const [Tab(text: 'Mobil'), Tab(text: 'Desktop')],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.auto_awesome),
            tooltip: 'Tayyor to‘plamlar (Agro/Oziq)',
            onPressed: () => GoRouter.of(context).push('/seller/agro/starter-packs${_targetShopId != null ? '?shopId=$_targetShopId' : ''}'),
          ),
          IconButton(icon: const Icon(Icons.input_outlined), tooltip: 'Import', onPressed: _showImportDialog),
          IconButton(icon: const Icon(Icons.palette_outlined), tooltip: 'Shablon', onPressed: _pickTemplate),
          IconButton(icon: Icon(_isMobile ? Icons.smartphone : Icons.desktop_windows), tooltip: _isMobile ? 'Mobil' : 'Desktop', onPressed: () => setState(() => _isMobile = !_isMobile)),
          IconButton(icon: const Icon(Icons.save), tooltip: 'Saqlash', onPressed: _save),
        ],
      ),
      floatingActionButton: FloatingActionButton(onPressed: _showAddDialog, child: const Icon(Icons.add)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Center(
              child: Container(
                width: _isMobile ? 390 : 900,
                margin: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: theme.colorScheme.surfaceContainerHighest, border: Border.all(color: theme.dividerColor), borderRadius: BorderRadius.circular(12)),
                child: _sections.isEmpty
                    ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.view_agenda_outlined, size: 48, color: theme.colorScheme.onSurfaceVariant),
                        const SizedBox(height: 12),
                        Text("Bo'lim qo'shish uchun + bosing", style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                      ]))
                    : ReorderableListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: _sections.length,
                        // ignore: deprecated_member_use
                        onReorder: _reorder,
                        itemBuilder: (c, i) {
                          final s = _sections[i];
                          final isProductGrid = s['type'] == 'product_grid';
                          final productCount = (s['product_ids'] as List?)?.length ?? 0;
                          return _SectionCard(
                            key: ValueKey('$i-${s['type']}'),
                            section: s,
                            subtitleExtra: isProductGrid && productCount > 0 ? ' • $productCount ta tanlangan' : null,
                            onTap: isProductGrid ? () => _showProductPicker(i) : null,
                            onRemove: () => _remove(i),
                            onUp: i > 0 ? () => _reorder(i, i - 1) : null,
                            onDown: i < _sections.length - 1 ? () => _reorder(i, i + 1) : null,
                          );
                        },
                      ),
              ),
            ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final Map<String, dynamic> section;
  final VoidCallback onRemove;
  final VoidCallback? onUp;
  final VoidCallback? onDown;
  final VoidCallback? onTap;
  final String? subtitleExtra;
  const _SectionCard({super.key, required this.section, required this.onRemove, this.onUp, this.onDown, this.onTap, this.subtitleExtra});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final type = section['type'] as String;
    final title = section['title'] as String? ?? type;
    final isInteractive = onTap != null;
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      child: ListTile(
        onTap: onTap,
        leading: _icon(type),
        title: Text(title, style: theme.textTheme.titleSmall),
        subtitle: Text('${type}${subtitleExtra ?? ''}', style: theme.textTheme.bodySmall),
        trailing: Row(mainAxisSize: MainAxisSize.min, children: [
          if (isInteractive) const Icon(Icons.touch_app, size: 16, color: Colors.green),
          IconButton(icon: const Icon(Icons.arrow_upward, size: 18), onPressed: onUp),
          IconButton(icon: const Icon(Icons.arrow_downward, size: 18), onPressed: onDown),
          IconButton(icon: const Icon(Icons.delete_outline, size: 18), onPressed: onRemove),
        ]),
      ),
    );
  }

  Widget _icon(String t) {
    switch (t) {
      case 'hero': return const Icon(Icons.slideshow_outlined);
      case 'product_grid': return const Icon(Icons.grid_view_outlined);
      case 'category_strip': return const Icon(Icons.category_outlined);
      case 'banner': return const Icon(Icons.photo_outlined);
      case 'map': return const Icon(Icons.map_outlined);
      case 'reviews': return const Icon(Icons.chat_bubble_outlined);
      case 'cta': return const Icon(Icons.campaign_outlined);
      case 'richtext': return const Icon(Icons.text_fields_outlined);
      default: return const Icon(Icons.view_agenda_outlined);
    }
  }
}
