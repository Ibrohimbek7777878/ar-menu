import 'package:flutter/material.dart';
import '../../models/shop_template.dart';
import '../../services/shop_service.dart';
import 'template_detail_screen.dart';

class TemplatePickerScreen extends StatefulWidget {
  final String? currentTemplate;
  const TemplatePickerScreen({super.key, this.currentTemplate});
  @override
  State<TemplatePickerScreen> createState() => _TemplatePickerScreenState();
}

class _TemplatePickerScreenState extends State<TemplatePickerScreen> {
  final ShopService _shopService = ShopService();
  List<ShopTemplate> _templates = [];
  List<ShopTemplate> _filtered = [];
  String _selectedCategory = 'all';
  bool _loading = true;

  final List<Map<String, String>> _categories = [
    {'key': 'all', 'name': 'Hammasi'},
    {'key': 'minimal', 'name': 'Minimal'},
    {'key': 'modern', 'name': 'Modern'},
    {'key': 'classic', 'name': 'Classic'},
    {'key': 'bold', 'name': 'Bold'},
    {'key': 'elegant', 'name': 'Elegant'},
    {'key': 'minimalist', 'name': 'Minimalist'},
    {'key': 'creative', 'name': 'Creative'},
    {'key': 'corporate', 'name': 'Corporate'},
    {'key': 'fashion', 'name': 'Fashion'},
    {'key': 'food', 'name': 'Food'},
    {'key': 'electronics', 'name': 'Elektronika'},
    {'key': 'grocery', 'name': 'Oziq-ovqat'},
    {'key': 'agro', 'name': 'Dehqonchilik'},
    {'key': 'beauty', 'name': "Go'zallik"},
    {'key': 'sports', 'name': 'Sport'},
    {'key': 'home', 'name': 'Uy-joy'},
    {'key': 'automotive', 'name': 'Avto'},
    {'key': 'books', 'name': 'Kitoblar'},
    {'key': 'kids', 'name': 'Bolalar'},
    {'key': 'pets', 'name': 'Uy hayvonlari'},
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final list = await _shopService.getTemplates();
    if (!mounted) return;
    setState(() {
      _templates = list;
      _filtered = list;
      _loading = false;
    });
  }

  void _filter(String cat) {
    setState(() {
      _selectedCategory = cat;
      _filtered = cat == 'all' ? _templates : _templates.where((t) => t.category == cat).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Shablon tanlash'),
        leading: IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                SizedBox(
                  height: 48,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: _categories.length,
                    itemBuilder: (c, i) {
                      final cat = _categories[i];
                      final sel = _selectedCategory == cat['key'];
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                        child: FilterChip(
                          selected: sel,
                          label: Text(cat['name']!, style: const TextStyle(fontSize: 13)),
                          onSelected: (_) => _filter(cat['key']!),
                          selectedColor: theme.colorScheme.primaryContainer,
                        ),
                      );
                    },
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: _filtered.isEmpty
                      ? const Center(child: Text('Shablonlar topilmadi'))
                      : GridView.builder(
                          padding: const EdgeInsets.all(12),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            crossAxisSpacing: 10,
                            mainAxisSpacing: 10,
                            childAspectRatio: 0.72,
                          ),
                          itemCount: _filtered.length,
                          itemBuilder: (c, i) {
                            final t = _filtered[i];
                            return _TemplateCard(
                              template: t,
                              isSelected: widget.currentTemplate == t.slug,
                              // Kartochka → ichiga kirish: detal/moslash ekrani.
                              // "Saqlash va o'rnatish" bosilsa — tanlangan qilib qaytadi.
                              onTap: () async {
                                final applied = await Navigator.push<String>(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => TemplateDetailScreen(template: t),
                                  ),
                                );
                                if (applied != null && context.mounted) {
                                  Navigator.pop(context, applied);
                                }
                              },
                            );
                          },
                        ),
                ),
              ],
            ),
    );
  }
}

class _TemplateCard extends StatelessWidget {
  final ShopTemplate template;
  final bool isSelected;
  final VoidCallback onTap;
  const _TemplateCard({required this.template, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? theme.colorScheme.primary : Colors.transparent, width: isSelected ? 2 : 1),
          color: theme.colorScheme.surfaceContainerHighest,
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Column(
          children: [
            Expanded(
              child: Container(
                width: double.infinity,
                decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(10))),
                child: _preview(),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                children: [
                  Text(template.name, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(template.category, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                      if (template.isPremium) ...[
                        const SizedBox(width: 6),
                        Icon(Icons.diamond, size: 10, color: theme.colorScheme.primary),
                        const SizedBox(width: 2),
                        Text('Pro', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.primary, fontWeight: FontWeight.w600)),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _preview() {
    final url = template.previewMobileUrl ?? template.previewUrl;
    if (url != null && url.isNotEmpty) {
      return ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(10)),
        child: Image.network(url, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _placeholder()),
      );
    }
    return _placeholder();
  }

  Widget _placeholder() {
    final c = template.defaultColors;
    final primary = _parse(c['primary'] ?? '#16a34a');
    final bg = _parse(c['background'] ?? '#ffffff');
    return Container(
      color: bg,
      child: Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 40, height: 40, decoration: BoxDecoration(color: primary.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)), child: Icon(Icons.store_rounded, color: primary, size: 22)),
          const SizedBox(height: 8),
          Container(width: 60, height: 6, decoration: BoxDecoration(color: primary.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(3))),
          const SizedBox(height: 4),
          Container(width: 50, height: 4, decoration: BoxDecoration(color: primary.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(2))),
        ]),
      ),
    );
  }

  Color _parse(String hex) {
    final clean = hex.replaceFirst('#', '');
    if (clean.length == 6) return Color(int.parse('FF$clean', radix: 16));
    return Colors.green;
  }
}
