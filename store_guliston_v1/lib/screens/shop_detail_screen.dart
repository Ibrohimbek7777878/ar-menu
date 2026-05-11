import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/shop.dart';
import '../models/product.dart';
import '../providers/product_provider.dart';
import '../providers/cart_provider.dart';
import '../widgets/product_card_widget.dart';
import '../screens/cart_screen.dart';

class ShopDetailScreen extends StatefulWidget {
  final Shop shop;

  const ShopDetailScreen({
    super.key,
    required this.shop,
  });

  @override
  State<ShopDetailScreen> createState() => _ShopDetailScreenState();
}

class _ShopDetailScreenState extends State<ShopDetailScreen> {
  List<Product> _products = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  Future<void> _loadProducts() async {
    // For demo, we'll create products directly
    // In real app, this would come from ProductProvider
    setState(() {
      _products = _getDemoProducts(widget.shop.id);
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final cartProvider = Provider.of<CartProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.shop.name),
        actions: [
          // Cart badge
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_cart),
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const CartScreen()),
                  );
                },
              ),
              if (cartProvider.itemCount > 0)
                Positioned(
                  right: 0,
                  top: 0,
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 20,
                      minHeight: 20,
                    ),
                    child: Text(
                      cartProvider.itemCount.toString(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Shop header
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Shop image and basic info
                Row(
                  children: [
                    Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        color: Colors.green.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.store,
                        color: Colors.green,
                        size: 30,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.shop.name,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            widget.shop.address,
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Shop details
                Row(
                  children: [
                    // Rating
                    Icon(
                      Icons.star,
                      size: 16,
                      color: Colors.amber,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      widget.shop.rating.toString(),
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 16),

                    // Working hours
                    Icon(
                      Icons.access_time,
                      size: 16,
                      color: Colors.grey,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      widget.shop.workingHours,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(width: 16),

                    // Status
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: widget.shop.isOpen ? Colors.green : Colors.red,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        widget.shop.isOpen ? 'Ochilgan' : 'Yopilgan',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 8),

                // Phone
                Row(
                  children: [
                    Icon(
                      Icons.phone,
                      size: 16,
                      color: Colors.grey,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      widget.shop.phone,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Products list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _products.isEmpty
                    ? const Center(
                        child: Text('Mahsulotlar mavjud emas'),
                      )
                    : GridView.builder(
                        padding: const EdgeInsets.all(16),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 0.75,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                        ),
                        itemCount: _products.length,
                        itemBuilder: (context, index) {
                          final product = _products[index];
                          return ProductCardWidget(product: product);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  List<Product> _getDemoProducts(String shopId) {
    if (shopId == 'shop_1') { // Yangi Yer Market
      return [
        Product(
          id: 'prod_1',
          shopId: shopId,
          name: 'Qora choy',
          description: 'Sifatli qora choy, 100gr',
          price: 15000,
          category: 'ichimliklar',
          imageUrl: 'assets/images/products/black_tea.jpg',
          unit: 'gr',
          isAvailable: true,
          stock: 50,
        ),
        Product(
          id: 'prod_2',
          shopId: shopId,
          name: 'Tuxum',
          description: 'Taza tuxum, 10 dona',
          price: 25000,
          category: 'oziq-ovqat',
          imageUrl: 'assets/images/products/eggs.jpg',
          unit: 'dona',
          isAvailable: true,
          stock: 100,
        ),
        Product(
          id: 'prod_3',
          shopId: shopId,
          name: 'Kofe',
          description: 'Instant kofe, 200gr',
          price: 45000,
          category: 'ichimliklar',
          imageUrl: 'assets/images/products/coffee.jpg',
          unit: 'gr',
          isAvailable: true,
          stock: 30,
        ),
      ];
    } else if (shopId == 'shop_2') { // Choy va Kofe Do'koni
      return [
        Product(
          id: 'prod_4',
          shopId: shopId,
          name: 'Yashil choy',
          description: 'Yangi yig\'ilgan yashil choy',
          price: 20000,
          category: 'ichimliklar',
          imageUrl: 'assets/images/products/green_tea.jpg',
          unit: 'gr',
          isAvailable: true,
          stock: 25,
        ),
        Product(
          id: 'prod_5',
          shopId: shopId,
          name: 'Qahva',
          description: 'Turkiy qahva, 100gr',
          price: 35000,
          category: 'ichimliklar',
          imageUrl: 'assets/images/products/turkish_coffee.jpg',
          unit: 'gr',
          isAvailable: true,
          stock: 20,
        ),
      ];
    } else if (shopId == 'shop_3') { // Go'sht va Sut
      return [
        Product(
          id: 'prod_6',
          shopId: shopId,
          name: 'Mol go\'shti',
          description: 'Taza mol go\'shti, 1kg',
          price: 120000,
          category: 'go\'sht',
          imageUrl: 'assets/images/products/beef.jpg',
          unit: 'kg',
          isAvailable: true,
          stock: 15,
        ),
        Product(
          id: 'prod_7',
          shopId: shopId,
          name: 'Sut',
          description: 'Taza sut, 1 litr',
          price: 8000,
          category: 'sut',
          imageUrl: 'assets/images/products/milk.jpg',
          unit: 'litr',
          isAvailable: true,
          stock: 40,
        ),
      ];
    }
    return [];
  }
}