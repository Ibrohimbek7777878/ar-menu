import 'package:flutter/material.dart';
import '../config/app_colors.dart';
import '../services/api_service.dart';
import '../services/product_service.dart';

class ReviewsCarousel extends StatefulWidget {
  final String shopId;
  const ReviewsCarousel({super.key, required this.shopId});
  @override
  State<ReviewsCarousel> createState() => _ReviewsCarouselState();
}

class _ReviewsCarouselState extends State<ReviewsCarousel> {
  final ApiService _api = ApiService();
  final ProductService _productService = ProductService();
  List<Map<String, dynamic>> _reviews = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final sid = int.tryParse(widget.shopId) ?? 0;
    if (sid == 0) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      final list = await _api.getShopReviews(sid);
      if (mounted) setState(() {_reviews = list; _loading = false;});
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showAddDialog() async {
    // load shop products for picker
    final products = await _productService.getProducts(shopId: widget.shopId);
    if (!mounted) return;
    if (products.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Mahsulot yo\'q')));
      return;
    }
    int? selectedId = int.tryParse(products.first.id);
    int rating = 5;
    final ctrl = TextEditingController();
    final res = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: const Text('Sharh yozish'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              DropdownButton<int>(
                value: selectedId,
                isExpanded: true,
                items: products.map((p) => DropdownMenuItem(value: int.tryParse(p.id) ?? 0, child: Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis))).toList(),
                onChanged: (v) => setState(() => selectedId = v),
              ),
              const SizedBox(height: 8),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(5, (i) => IconButton(icon: Icon(i < rating ? Icons.star : Icons.star_border, color: const Color(0xFFFFA726)), onPressed: () => setState(() => rating = i + 1)))),
              TextField(controller: ctrl, decoration: const InputDecoration(hintText: 'Izoh (ixtiyoriy)', border: OutlineInputBorder()), maxLines: 3, maxLength: 200),
            ]),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Bekor')),
            FilledButton(onPressed: () => Navigator.pop(context, {'product_id': selectedId, 'rating': rating, 'comment': ctrl.text}), child: const Text('Yuborish')),
          ],
        ),
      ),
    );
    if (res == null) return;
    try {
      await _api.createReview(productId: res['product_id'], rating: res['rating'], comment: res['comment']);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Rahmat! Sharhingiz saqlandi')));
      _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Xatolik: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const SizedBox(height: 60, child: Center(child: CircularProgressIndicator(strokeWidth: 2)));
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Row(children: [
          const Icon(Icons.star, size: 16, color: Color(0xFFFFA726)),
          const SizedBox(width: 6),
          const Text('Sharhlar', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textBlack)),
          const SizedBox(width: 8),
          Text('(${_reviews.length})', style: const TextStyle(fontSize: 12, color: AppColors.textGray)),
          const Spacer(),
          TextButton.icon(onPressed: _showAddDialog, icon: const Icon(Icons.rate_review, size: 14), label: const Text('Yozish', style: TextStyle(fontSize: 12))),
        ]),
      ),
      if (_reviews.isEmpty)
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: AppColors.backgroundGray, borderRadius: BorderRadius.circular(12)),
            child: const Text('Hali sharh yo\'q — birinchi bo\'ling!', style: TextStyle(fontSize: 13, color: AppColors.textGray), textAlign: TextAlign.center),
          ),
        )
      else
        SizedBox(
          height: 120,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _reviews.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (_, i) {
              final r = _reviews[i];
              final rating = (r['rating'] as num?)?.toInt() ?? 5;
              final comment = r['comment']?.toString() ?? '';
              final name = r['customer_name']?.toString() ?? 'Anonim';
              final productName = r['product_name']?.toString() ?? '';
              return Container(
                width: 220,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.divider)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    ...List.generate(5, (idx) => Icon(idx < rating ? Icons.star : Icons.star_border, size: 14, color: const Color(0xFFFFA726))),
                    const Spacer(),
                    Text(name, style: const TextStyle(fontSize: 11, color: AppColors.textGray), maxLines: 1, overflow: TextOverflow.ellipsis),
                  ]),
                  if (productName.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 4), child: Text(productName, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis)),
                  const SizedBox(height: 6),
                  Expanded(child: Text(comment.isEmpty ? '—' : comment, style: const TextStyle(fontSize: 12, color: AppColors.textBlack), maxLines: 3, overflow: TextOverflow.ellipsis)),
                  const SizedBox(height: 4),
                  Text((r['created_at']?.toString() ?? '').split('T').first, style: const TextStyle(fontSize: 10, color: AppColors.textGray)),
                ]),
              );
            },
          ),
        ),
    ]);
  }
}
