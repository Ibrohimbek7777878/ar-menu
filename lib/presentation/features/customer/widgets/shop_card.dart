/// Shop card widget - presentation layer

import 'package:flutter/material.dart';
import 'package:online_store_guliston/domain/entities/shop.dart';

// Shop card widget
class ShopCard extends StatelessWidget {
  final Shop shop;
  final VoidCallback onTap;

  const ShopCard({
    super.key,
    required this.shop,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            color: Colors.grey[200],
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(Icons.store),
        ),
        title: Text(shop.name),
        subtitle: Text('${shop.address} • ${shop.startTime} - ${shop.endTime}'),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: onTap,
      ),
    );
  }
}