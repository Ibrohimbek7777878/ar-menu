/// Category chip widget - presentation layer

import 'package:flutter/material.dart';

// Category chip widget
class CategoryChip extends StatelessWidget {
  final String category;

  const CategoryChip({super.key, required this.category});

  @override
  Widget build(BuildContext context) {
    return Chip(
      label: Text(category),
      backgroundColor: Colors.blue[50],
      labelStyle: const TextStyle(color: Colors.blue),
      onDeleted: () {},
      deleteIcon: const Icon(Icons.close, size: 16),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    );
  }
}
