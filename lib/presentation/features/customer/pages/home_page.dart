/// Customer home page - presentation layer

import 'package:flutter/material.dart';
import 'package:online_store_guliston/core/providers/app_providers.dart';
import 'package:online_store_guliston/domain/repositories/shop_repository.dart';
import 'package:online_store_guliston/presentation/common_widgets/loading_widget.dart';
import 'package:online_store_guliston/presentation/common_widgets/error_widget.dart';
import 'package:online_store_guliston/presentation/features/customer/widgets/category_chip.dart';
import 'package:online_store_guliston/presentation/features/customer/widgets/shop_card.dart';
import 'package:provider/provider.dart';

// Customer home page
class HomePage extends StatefulWidget {
  final String selectedCity;

  const HomePage({super.key, required this.selectedCity});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  @override
  Widget build(BuildContext context) {
    final shopRepository = Provider.of<ShopRepository>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Online Store Guliston'),
        centerTitle: true,
        backgroundColor: Colors.blue,
      ),
      body: CustomScrollView(
        slivers: [
          // Search bar
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: TextField(
                decoration: InputDecoration(
                  hintText: 'Mahsulot yoki do\'kon nomini qidirish...',
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8.0),
                  ),
                ),
              ),
            ),
          ),
          // Categories section
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Kategoriyalar',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 120,
                    child: StreamBuilder(
                      stream: shopRepository.getCategories(),
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
                        final categories = snapshot.data!.getOrElse(() => []);
                        return ListView.builder(
                          scrollDirection: Axis.horizontal,
                          itemCount: categories.length,
                          itemBuilder: (context, index) {
                            final category = categories[index];
                            return Padding(
                              padding: const EdgeInsets.only(right: 12.0),
                              child: CategoryChip(category: category),
                            );
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Shops section
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Yaqin atrofdagi do\'konlar',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  StreamBuilder(
                    stream: shopRepository.getShops(widget.selectedCity),
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
                      final shops = snapshot.data!.getOrElse(() => []);
                      return ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: shops.length,
                        itemBuilder: (context, index) {
                          final shop = shops[index];
                          return ShopCard(
                            shop: shop,
                            onTap: () {
                              // Navigate to shop detail
                            },
                          );
                        },
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Bosh sahifa',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.shopping_cart),
            label: 'Savat',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profil',
          ),
        ],
        currentIndex: 0,
        onTap: (index) {
          if (index == 1) {
            // Navigate to cart
          } else if (index == 2) {
            // Navigate to profile
          }
        },
      ),
    );
  }
}