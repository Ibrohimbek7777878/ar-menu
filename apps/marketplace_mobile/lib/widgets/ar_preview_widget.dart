import 'package:flutter/material.dart';
import '../services/ar_service.dart';

class ArPreviewButton extends StatefulWidget {
  final int productId;
  final String productName;
  const ArPreviewButton({super.key, required this.productId, required this.productName});
  @override
  State<ArPreviewButton> createState() => _ArPreviewButtonState();
}

class _ArPreviewButtonState extends State<ArPreviewButton> {
  final ArService _ar = ArService();
  Map<String, dynamic>? _data;
  bool _loading = false;

  Future<void> _open() async {
    setState(() => _loading = true);
    final d = await _ar.getArDetail(widget.productId);
    if (!mounted) return;
    setState(() {_data = d; _loading = false;});
    if (d == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('AR topilmadi')));
      return;
    }
    final ready = d['ready'] == true;
    showModalBottomSheet(context: context, isScrollControlled: true, builder: (_) => _sheet(d, ready));
    if (ready) _ar.logArView(productId: widget.productId, mode: '3d-only', durationSec: 5);
  }

  Widget _sheet(Map<String, dynamic> d, bool ready) {
    final glb = d['glb'];
    final poster = d['poster'];
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
        const SizedBox(height: 12),
        Text(widget.productName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        Container(
          height: 220,
          decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey[300]!)),
          child: Center(
            child: poster != null
                ? Image.network(poster, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.view_in_ar, size: 48))
                : const Icon(Icons.view_in_ar, size: 48),
          ),
        ),
        const SizedBox(height: 12),
        if (glb != null) Text('GLB: $glb', style: const TextStyle(fontSize: 10, color: Colors.grey), maxLines: 2, overflow: TextOverflow.ellipsis),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Yopish'))),
          const SizedBox(width: 12),
          Expanded(child: FilledButton.icon(onPressed: ready ? () { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('AR ochildi (demo)'))); } : null, icon: const Icon(Icons.view_in_ar), label: Text(ready ? 'AR ko\'rish' : 'Tayyorlanmoqda'))),
        ]),
        const SizedBox(height: 8),
        Text('Real o\'lcham ${d['scale_m'] ?? 0.3} m', style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _loading
        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
        : IconButton(onPressed: _open, icon: const Icon(Icons.view_in_ar, size: 18), tooltip: 'AR', style: IconButton.styleFrom(backgroundColor: const Color(0xFF7C3AED).withValues(alpha: 0.1)));
  }
}
