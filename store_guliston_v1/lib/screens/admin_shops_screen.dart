import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/shop.dart';
import '../providers/shop_provider.dart';

class AdminShopsScreen extends StatelessWidget {
  const AdminShopsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<ShopProvider>(
      builder: (context, shopProvider, child) {
        if (shopProvider.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (shopProvider.shops.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.store_mall_directory, size: 64, color: Colors.grey.shade400),
                const SizedBox(height: 16),
                Text(
                  'Do\'konlar mavjud emas',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: () {
                    _showAddShopDialog(context, shopProvider);
                  },
                  icon: const Icon(Icons.add),
                  label: const Text('Do\'kon qo\'shish'),
                ),
              ],
            ),
          );
        }

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      decoration: InputDecoration(
                        hintText: 'Do\'kon qidirish...',
                        prefixIcon: const Icon(Icons.search),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        filled: true,
                        fillColor: Colors.grey.shade100,
                      ),
                      onChanged: (value) {
                        // Implement search
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  IconButton(
                    onPressed: () {
                      _showAddShopDialog(context, shopProvider);
                    },
                    icon: const Icon(Icons.add_circle, size: 32, color: Color(0xFF327F60)),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: shopProvider.shops.length,
                itemBuilder: (context, index) {
                  final shop = shopProvider.shops[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    elevation: 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: ListTile(
                      leading: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          shop.imageUrl,
                          width: 50,
                          height: 50,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Container(
                              width: 50,
                              height: 50,
                              color: Colors.grey.shade200,
                              child: const Icon(Icons.store, color: Colors.grey),
                            );
                          },
                        ),
                      ),
                      title: Text(
                        shop.name,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(shop.address),
                          if (shop.phone.isNotEmpty)
                            Text(
                              shop.phone,
                              style: const TextStyle(color: Color(0xFF327F60)),
                            ),
                        ],
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit, color: Colors.blue),
                            onPressed: () {
                              _showEditShopDialog(context, shopProvider, shop);
                            },
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete, color: Colors.red),
                            onPressed: () {
                              _confirmDelete(context, shopProvider, shop.id);
                            },
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }

  void _showAddShopDialog(BuildContext context, ShopProvider shopProvider) {
    final nameController = TextEditingController();
    final addressController = TextEditingController();
    final phoneController = TextEditingController();
    final imageUrlController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Yangi do\'kon qo\'shish'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Do\'kon nomi'),
              ),
              TextField(
                controller: addressController,
                decoration: const InputDecoration(labelText: 'Manzil'),
              ),
              TextField(
                controller: phoneController,
                decoration: const InputDecoration(labelText: 'Telefon'),
                keyboardType: TextInputType.phone,
              ),
              TextField(
                controller: imageUrlController,
                decoration: const InputDecoration(labelText: 'Rasm URL'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Bekor qilish'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.isNotEmpty) {
                final newShop = Shop(
                  id: 'shop_${DateTime.now().millisecondsSinceEpoch}',
                  name: nameController.text,
                  address: addressController.text,
                  phone: phoneController.text,
                  imageUrl: imageUrlController.text.isEmpty
                      ? 'https://via.placeholder.com/150'
                      : imageUrlController.text,
                  category: 'oziq-ovqat',
                  workingHours: '08:00 - 22:00',
                  isOpen: true,
                  rating: 0,
                  latitude: 40.5966,
                  longitude: 68.7786,
                );
                final success = await shopProvider.createShop(newShop);
                Navigator.pop(context);
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Do\'kon qo\'shildi')),
                  );
                }
              }
            },
            child: const Text('Qo\'shish'),
          ),
        ],
      ),
    );
  }

  void _showEditShopDialog(
    BuildContext context,
    ShopProvider shopProvider,
    dynamic shop,
  ) {
    final nameController = TextEditingController(text: shop.name);
    final addressController = TextEditingController(text: shop.address);
    final phoneController = TextEditingController(text: shop.phone);
    final imageUrlController = TextEditingController(text: shop.imageUrl);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Do\'konni tahrirlash'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Do\'kon nomi'),
              ),
              TextField(
                controller: addressController,
                decoration: const InputDecoration(labelText: 'Manzil'),
              ),
              TextField(
                controller: phoneController,
                decoration: const InputDecoration(labelText: 'Telefon'),
                keyboardType: TextInputType.phone,
              ),
              TextField(
                controller: imageUrlController,
                decoration: const InputDecoration(labelText: 'Rasm URL'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Bekor qilish'),
          ),
          ElevatedButton(
            onPressed: () async {
              final updatedShop = Shop(
                id: shop.id,
                name: nameController.text,
                address: addressController.text,
                phone: phoneController.text,
                imageUrl: imageUrlController.text,
                category: shop.category,
                workingHours: shop.workingHours,
                isOpen: shop.isOpen,
                rating: shop.rating,
                latitude: shop.latitude,
                longitude: shop.longitude,
              );
              final success = await shopProvider.updateShop(shop.id, updatedShop);
              Navigator.pop(context);
              if (success) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Do\'kon yangilandi')),
                );
              }
            },
            child: const Text('Saqlash'),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, ShopProvider shopProvider, String shopId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('O\'chirish'),
        content: const Text('Ushbu do\'konni o\'chirmoqchimisiz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Bekor qilish'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              final success = await shopProvider.deleteShop(shopId);
              Navigator.pop(context);
              if (success) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Do\'kon o\'chirildi')),
                );
              }
            },
            child: const Text('O\'chirish', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}