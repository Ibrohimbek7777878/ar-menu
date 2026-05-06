import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:online_store_guliston/services/firestore_service.dart';
import 'package:online_store_guliston/screens/product_detail_screen.dart';
import 'package:online_store_guliston/providers/cart_provider.dart';
import 'package:provider/provider.dart';

// Shop Detail Screen - displays shop information and products
class ShopDetailScreen extends StatefulWidget {
  final String shopId;
  final String shopName;

  const ShopDetailScreen({super.key, required this.shopId, required this.shopName});

  @override
  State<ShopDetailScreen> createState() => _ShopDetailScreenState();
}

class _ShopDetailScreenState extends State<ShopDetailScreen> {
  final FirestoreService _firestoreService = FirestoreService();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.shopName),
        backgroundColor: Colors.blue,
      ),
      body: CustomScrollView(
        slivers: [
          // Shop info section
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Shop image placeholder
                  Container(
                    height: 200,
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Center(
                      child: Icon(Icons.store, size: 64, color: Colors.grey),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    widget.shopName,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text('Guliston shahri, Yangi Yer tumani'),
                  const SizedBox(height: 8),
                  const Text('Ish vaqti: 09:00 - 21:00'),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.phone, size: 18),
                      const SizedBox(width: 8),
                      const Text('+998 90 123 45 67'),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(),
                  const SizedBox(height: 16),
                  const Text(
                    'Mahsulotlar',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Products section
          SliverToBoxAdapter(
            child: StreamBuilder<List<Product>>(
              stream: _firestoreService.getProducts(widget.shopId),
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return const Center(child: Text('Xatolik yuz berdi'));
                }
                if (!snapshot.hasData || snapshot.data!.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: snapshot.data!.length,
                    itemBuilder: (context, index) {
                      final product = snapshot.data![index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          leading: Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              color: Colors.grey[200],
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.shopping_bag, size: 32),
                          ),
                          title: Text(product.name),
                          subtitle: Text('${product.price} so\'m / ${product.unit}'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.add_shopping_cart),
                                onPressed: () {
                                  final cartProvider = Provider.of<CartProvider>(context, listen: false);
                                  cartProvider.addItem(
                                    product.id,
                                    widget.shopId,
                                    product.name,
                                    product.price,
                                    product.unit,
                                    1,
                                  );
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Savatga qo\'shildi!')),
                                  );
                                },
                              ),
                              const SizedBox(width: 8),
                              IconButton(
                                icon: const Icon(Icons.arrow_forward_ios, size: 16),
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => ProductDetailScreen(
                                        productId: product.id,
                                        shopId: widget.shopId,
                                        productName: product.name,
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}