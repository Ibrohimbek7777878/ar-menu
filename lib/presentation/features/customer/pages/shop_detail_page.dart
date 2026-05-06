/// Shop detail page - presentation layer

import 'package:flutter/material.dart';
import 'package:online_store_guliston/core/providers/app_providers.dart';
import 'package:online_store_guliston/domain/repositories/shop_repository.dart';
import 'package:online_store_guliston/presentation/common_widgets/loading_widget.dart';
import 'package:online_store_guliston/presentation/common_widgets/error_widget.dart';
import 'package:provider/provider.dart';

// Shop detail page
class ShopDetailPage extends StatefulWidget {
  final String shopId;
  final String shopName;

  const ShopDetailPage({
    super.key,
    required this.shopId,
    required this.shopName,
  });

  @override
  State<ShopDetailPage> createState() => _ShopDetailPageState();
}

class _ShopDetailPageState extends State<ShopDetailPage> {
  @override
  Widget build(BuildContext context) {
    final shopRepository = Provider.of<ShopRepository>(context);

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
            child: StreamBuilder(
              stream: shopRepository.getProducts(widget.shopId),
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return const ErrorWidget(
                    message: 'Xatolik yuz berdi',
                    onRetry: () {},
                  );
                }
                if (!snapshot.hasData || snapshot.data!.isLeft()) {
                  return const LoadingWidget();
                }
                final products = snapshot.data!.getOrElse(() => []);
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: products.length,
                    itemBuilder: (context, index) {
                      final product = products[index];
                      return ListTile(
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
                        trailing: IconButton(
                          icon: const Icon(Icons.add_shopping_cart),
                          onPressed: () {
                            // Add to cart
                          },
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