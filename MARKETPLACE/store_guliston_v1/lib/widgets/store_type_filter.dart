import 'package:flutter/material.dart';

class StoreTypeFilter extends StatelessWidget {
  final String selected;
  final ValueChanged<String> onSelected;
  const StoreTypeFilter({super.key, required this.selected, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    final types = [
      {'key': 'all', 'label': 'Hammasi', 'icon': Icons.storefront_outlined},
      {'key': 'shop', 'label': 'Do\'kon', 'icon': Icons.shopping_bag_outlined},
      {'key': 'restaurant', 'label': 'Restoran', 'icon': Icons.restaurant_outlined},
      {'key': 'cafe', 'label': 'Kafe', 'icon': Icons.local_cafe_outlined},
      {'key': 'bar', 'label': 'Bar', 'icon': Icons.local_bar_outlined},
    ];
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: types.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final t = types[i];
          final sel = selected == t['key'];
          return FilterChip(
            selected: sel,
            label: Row(mainAxisSize: MainAxisSize.min, children: [Icon(t['icon'] as IconData, size: 16), const SizedBox(width: 4), Text(t['label'] as String)]),
            onSelected: (_) => onSelected(t['key'] as String),
            selectedColor: Theme.of(context).colorScheme.primaryContainer,
          );
        },
      ),
    );
  }
}
