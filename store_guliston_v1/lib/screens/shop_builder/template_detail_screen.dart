import 'package:flutter/material.dart';
import '../../models/shop_template.dart';
import '../../services/shop_service.dart';

/// Shablon "mahsulot kartochkasi" detali: jonli preview + moslash
/// + "Saqlash va o'rnatish" (yangi shablon saqlanadi + do'konga o'rnatiladi).
class TemplateDetailScreen extends StatefulWidget {
  final ShopTemplate template;
  const TemplateDetailScreen({super.key, required this.template});

  @override
  State<TemplateDetailScreen> createState() => _TemplateDetailScreenState();
}

class _TemplateDetailScreenState extends State<TemplateDetailScreen> {
  final ShopService _shopService = ShopService();

  late Map<String, Color> _colors;
  late List<Map<String, dynamic>> _sections;
  late final TextEditingController _nameCtrl;
  bool _saving = false;

  static const _colorLabels = {
    'primary': 'Asosiy',
    'accent': 'Aksent',
    'background': 'Fon',
    'surface': 'Kartochka',
    'text_primary': 'Matn',
  };

  static const _palettes = [
    {'primary': '#16a34a', 'accent': '#22c55e', 'background': '#ffffff', 'surface': '#f8fafc', 'text_primary': '#1a1a1a'},
    {'primary': '#b45309', 'accent': '#f59e0b', 'background': '#fffbeb', 'surface': '#fef3c7', 'text_primary': '#1a1a1a'},
    {'primary': '#1d4ed8', 'accent': '#3b82f6', 'background': '#ffffff', 'surface': '#eff6ff', 'text_primary': '#0f172a'},
    {'primary': '#be123c', 'accent': '#f43f5e', 'background': '#fff1f2', 'surface': '#ffe4e6', 'text_primary': '#1a1a1a'},
    {'primary': '#6d28d9', 'accent': '#8b5cf6', 'background': '#f5f3ff', 'surface': '#ede9fe', 'text_primary': '#1a1a1a'},
    {'primary': '#0f172a', 'accent': '#0ea5e9', 'background': '#0f172a', 'surface': '#1e293b', 'text_primary': '#f8fafc'},
  ];

  static const _typeLabels = {
    'hero': 'Hero', 'product_grid': 'Mahsulotlar', 'category_strip': 'Kategoriyalar',
    'banner': 'Banner', 'map': 'Xarita', 'reviews': 'Sharhlar', 'cta': 'Chaqiriq', 'richtext': 'Matn',
    'features': 'Afzalliklar', 'info_strip': 'Aloqa chizig\'i',
  };

  @override
  void initState() {
    super.initState();
    _colors = {
      for (final e in widget.template.defaultColors.entries)
        if (_colorLabels.containsKey(e.key) && e.value is String && (e.value as String).startsWith('#'))
          e.key: _parse(e.value)
    };
    _sections = List<Map<String, dynamic>>.from(widget.template.defaultLayout);
    _nameCtrl = TextEditingController(text: '${widget.template.name} (moslangani)');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Color _parse(String hex) {
    final clean = hex.replaceFirst('#', '');
    if (clean.length == 6) return Color(int.parse('FF$clean', radix: 16));
    return Colors.green;
  }

  String _toHex(Color c) {
    final argb = c.toARGB32();
    return '#${(argb & 0xFFFFFF).toRadixString(16).padLeft(6, '0')}';
  }

  Future<void> _pickColor(String key) async {
    final picked = await showModalBottomSheet<Color>(
      context: context,
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${_colorLabels[key]} rangi', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (final p in _palettes)
                    for (final entry in p.entries)
                      if (entry.key == key)
                        _swatch(_parse(entry.value), tag: p),
                ],
              ),
            ],
          ),
        ),
      ),
    );
    if (picked != null && mounted) setState(() => _colors[key] = picked);
  }

  Widget _swatch(Color color, {Map<String, String>? tag}) {
    return GestureDetector(
      onTap: () {
        // Butun palitrani qo'llash — barcha kalitlar mos kelganda
        if (tag != null) {
          setState(() {
            for (final e in tag.entries) {
              if (_colors.containsKey(e.key)) _colors[e.key] = _parse(e.value);
            }
          });
        }
        Navigator.pop(context, color);
      },
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.black12),
        ),
      ),
    );
  }

  Future<void> _saveAndInstall() async {
    setState(() => _saving = true);
    final colorsJson = {for (final e in _colors.entries) e.key: _toHex(e.value)};
    final ok = await _shopService.applyTemplate(
      widget.template.slug,
      layout: {'sections': _sections},
      saveAsTemplate: true,
      templateName: _nameCtrl.text.trim(),
      colors: colorsJson,
    );
    if (!mounted) return;
    setState(() => _saving = false);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(ok ? 'Saqlandi va do\'koningizga o\'rnatildi!' : 'Saqlashda xatolik (avval tizimga kiring)'),
    ));
    if (ok) Navigator.pop(context, widget.template.slug);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            title: Text(widget.template.name),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: _colors['background'] ?? Colors.white,
                padding: const EdgeInsets.fromLTRB(16, 90, 16, 16),
                child: _miniShopPreview(),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(widget.template.name, style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 4),
                          Text(widget.template.category.toUpperCase(),
                              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                        ]),
                      ),
                      if (widget.template.isPremium)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: Colors.amber.shade100, borderRadius: BorderRadius.circular(999)),
                          child: const Text('PRO', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Ranglar
                  Text('Ranglar', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 10,
                    children: [
                      for (final e in _colors.entries)
                        GestureDetector(
                          onTap: () => _pickColor(e.key),
                          child: Column(children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: e.value,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.black12),
                              ),
                              child: const Icon(Icons.edit, size: 16, color: Colors.white70),
                            ),
                            const SizedBox(height: 4),
                            Text(_colorLabels[e.key] ?? e.key, style: theme.textTheme.bodySmall),
                          ]),
                        ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Sectionlar
                  Text('Bo\'limlar', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 10),
                  for (var i = 0; i < _sections.length; i++)
                    Card(
                      margin: const EdgeInsets.only(bottom: 6),
                      child: ListTile(
                        dense: true,
                        leading: Text('${i + 1}', style: theme.textTheme.bodySmall),
                        title: Text(_typeLabels[_sections[i]['type']] ?? _sections[i]['type'],
                            style: const TextStyle(fontWeight: FontWeight.w600)),
                        trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                          if (i > 0)
                            IconButton(icon: const Icon(Icons.arrow_upward, size: 18), onPressed: () => setState(() {
                              final s = _sections.removeAt(i);
                              _sections.insert(i - 1, s);
                            })),
                          if (i < _sections.length - 1)
                            IconButton(icon: const Icon(Icons.arrow_downward, size: 18), onPressed: () => setState(() {
                              final s = _sections.removeAt(i);
                              _sections.insert(i + 1, s);
                            })),
                          IconButton(icon: const Icon(Icons.delete_outline, size: 18), onPressed: () => setState(() => _sections.removeAt(i))),
                        ]),
                      ),
                    ),

                  const SizedBox(height: 16),
                  // Nom
                  TextField(
                    controller: _nameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Shablon nomi (galereyada saqlanadi)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                      onPressed: _saving ? null : _saveAndInstall,
                      icon: _saving
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.save),
                      label: const Text('Saqlash va o\'rnatish', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                    ),
                  ),
                  const SizedBox(height: 30),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Shablon ranglaridan chizilgan mini do'kon maketi (jonli preview)
  Widget _miniShopPreview() {
    final primary = _colors['primary'] ?? Colors.green;
    final accent = _colors['accent'] ?? primary;
    final surface = _colors['surface'] ?? const Color(0xFFF8FAFC);
    final text = _colors['text_primary'] ?? const Color(0xFF1A1A1A);
    final bg = _colors['background'] ?? Colors.white;

    return Container(
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.black12)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            color: surface,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            child: Row(children: [
              Icon(Icons.store_rounded, size: 16, color: primary),
              const SizedBox(width: 6),
              Container(width: 60, height: 6, decoration: BoxDecoration(color: text.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(3))),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                for (final s in _sections) ...[
                  if (s['type'] == 'hero')
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [primary, accent]),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(s['title'] ?? "Do'kon nomi", style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
                        const SizedBox(height: 6),
                        Container(width: 80, height: 5, decoration: BoxDecoration(color: Colors.white54, borderRadius: BorderRadius.circular(3))),
                      ]),
                    ),
                  if (s['type'] == 'category_strip')
                    Row(
                      children: [24, 34, 28].map((w) => Container(
                        width: w.toDouble(),
                        height: 12,
                        margin: const EdgeInsets.only(right: 6),
                        decoration: BoxDecoration(color: accent.withValues(alpha: 0.25), borderRadius: BorderRadius.circular(999)),
                      )).toList(),
                    ),
                  if (s['type'] == 'product_grid')
                    Row(
                      children: List.generate(3, (_) => Expanded(
                        child: Container(
                          height: 46,
                          margin: const EdgeInsets.only(right: 6),
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(color: surface, borderRadius: BorderRadius.circular(8)),
                          child: Column(children: [
                            Expanded(child: Container(decoration: BoxDecoration(color: accent.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(4)))),
                            const SizedBox(height: 3),
                            Container(height: 4, decoration: BoxDecoration(color: text.withValues(alpha: 0.35), borderRadius: BorderRadius.circular(2))),
                          ]),
                        ),
                      )).toList(),
                    ),
                  if (s['type'] == 'cta')
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: primary, borderRadius: BorderRadius.circular(10)),
                      child: Center(child: Text(s['title'] ?? 'Chaqiriq', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12))),
                    ),
                  if (s['type'] == 'banner')
                    Container(
                      width: double.infinity,
                      height: 34,
                      decoration: BoxDecoration(color: accent, borderRadius: BorderRadius.circular(10)),
                    ),
                  if (s['type'] == 'features')
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: List.generate(3, (_) => Column(
                        children: [
                          Icon(Icons.star_rounded, size: 16, color: accent),
                          const SizedBox(height: 4),
                          Container(width: 24, height: 4, decoration: BoxDecoration(color: text.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(2))),
                        ],
                      )),
                    ),
                  if (s['type'] == 'info_strip')
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      decoration: BoxDecoration(color: primary, borderRadius: BorderRadius.circular(4)),
                      child: Center(child: Container(width: 60, height: 4, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(2)))),
                    ),
                  const SizedBox(height: 8),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
