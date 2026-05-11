import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/shop_provider.dart';
import '../providers/cart_provider.dart';
import '../models/shop.dart';
import 'shop_card_widget.dart';

class ShopListWidget extends StatefulWidget {
  const ShopListWidget({super.key});

  @override
  State<ShopListWidget> createState() => _ShopListWidgetState();
}

class _ShopListWidgetState extends State<ShopListWidget> {
  final TextEditingController _searchController = TextEditingController();
  String? _selectedCategory;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<ShopProvider, CartProvider>(
      builder: (context, shopProvider, cartProvider, child) {
        final shops = shopProvider.shops;
        final categories = shopProvider.getCategories();

        return Column(
          children: [
            // Search and filter bar
            Container(
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: Column(
                children: [
                  // Search field
                  TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Do\'kon qidirish...',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      filled: true,
                      fillColor: Colors.grey.shade50,
                    ),
                    onChanged: (value) {
                      shopProvider.searchShops(value);
                    },
                  ),
                  const SizedBox(height: 12),
                  // Category filter
                  SizedBox(
                    height: 40,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: [
                        // All categories button
                        FilterChip(
                          label: const Text('Barcha'),
                          selected: _selectedCategory == null,
                          onSelected: (selected) {
                            setState(() => _selectedCategory = null);
                            shopProvider.filterByCategory(null);
                          },
                        ),
                        const SizedBox(width: 8),
                        // Category chips
                        ...categories.map((category) => Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: FilterChip(
                            label: Text(_getCategoryDisplayName(category)),
                            selected: _selectedCategory == category,
                            onSelected: (selected) {
                              setState(() => _selectedCategory = selected ? category : null);
                              shopProvider.filterByCategory(selected ? category : null);
                            },
                          ),
                        )),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Shop list
            Expanded(
              child: shopProvider.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : shops.isEmpty
                      ? const Center(
                          child: Text('Do\'konlar topilmadi'),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: shops.length,
                          itemBuilder: (context, index) {
                            final shop = shops[index];
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 16),
                              child: ShopCardWidget(shop: shop),
                            );
                          },
                        ),
            ),
          ],
        );
      },
    );
  }

  String _getCategoryDisplayName(String category) {
    switch (category) {
      case 'oziq-ovqat':
        return 'Oziq-ovqat';
      case 'ichimliklar':
        return 'Ichimliklar';
      case 'go\'sht':
        return 'Go\'sht';
      case 'sut':
        return 'Sut mahsulotlari';
      default:
        return category;
    }
  }
}