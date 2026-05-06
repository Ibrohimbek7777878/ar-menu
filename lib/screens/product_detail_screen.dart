import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:online_store_guliston/services/firestore_service.dart';
import 'package:online_store_guliston/providers/cart_provider.dart';
import 'package:provider/provider.dart';

// Product Detail Screen - displays product information and allows adding to cart
class ProductDetailScreen extends StatefulWidget {
  final String productId;
  final String shopId;
  final String productName;

  const ProductDetailScreen({
    super.key,
    required this.productId,
    required this.shopId,
    required this.productName,
  });

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  final FirestoreService _firestoreService = FirestoreService();
  int _quantity = 1;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.productName),
        backgroundColor: Colors.blue,
      ),
      body: CustomScrollView(
        slivers: [
          // Product images slider
          SliverToBoxAdapter(
            child: Container(
              height: 300,
              decoration: BoxDecoration(
                color: Colors.grey[200],
              ),
              child: const Center(
                child: Icon(Icons.photo, size: 64, color: Colors.grey),
              ),
            ),
          ),
          // Product info section
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.productName,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Bu mahsulot haqida batafsil tavsif. Mahsulot sifati yuqori va ishonchli do\'konlardan yetkazib beriladi.',
                    style: TextStyle(fontSize: 16),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      const Text(
                        '15 000 so\'m',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text('/ kg', style: TextStyle(fontSize: 16, color: Colors.grey)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Text('Mavjud'),
                  const SizedBox(height: 16),
                  const Text(
                    'Miqdor:',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      ElevatedButton(
                        onPressed: () {
                          setState(() {
                            if (_quantity > 1) _quantity--;
                          });
                        },
                        child: const Text('-'),
                      ),
                      const SizedBox(width: 16),
                      Text('$_quantity', style: const TextStyle(fontSize: 18)),
                      const SizedBox(width: 16),
                      ElevatedButton(
                        onPressed: () {
                          setState(() {
                            _quantity++;
                          });
                        },
                        child: const Text('+'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () {
                      final cartProvider = Provider.of<CartProvider>(context, listen: false);
                      cartProvider.addItem(
                        widget.productId,
                        widget.shopId,
                        widget.productName,
                        15000.0,
                        'kg',
                        _quantity,
                      );
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Savatga qo\'shildi!')),
                      );
                      Navigator.pop(context);
                    },
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 48,
                        vertical: 16,
                      ),
                      textStyle: const TextStyle(fontSize: 18),
                    ),
                    child: const Text('Savatga qo\'shish'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}