import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/shop_provider.dart';
import '../models/shop.dart';

class ShopManagementWidget extends StatefulWidget {
  const ShopManagementWidget({super.key});

  @override
  State<ShopManagementWidget> createState() => _ShopManagementWidgetState();
}

class _ShopManagementWidgetState extends State<ShopManagementWidget> {
  final TextEditingController _searchController = TextEditingController();
  String? _selectedCategory;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ShopProvider>(
      builder: (context, shopProvider, child) {
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

            // Add shop button
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: ElevatedButton.icon(
                onPressed: () {
                  _showAddShopDialog(context, shopProvider);
                },
                icon: const Icon(Icons.add),
                label: const Text('Yangi do\'kon qo\'shish'),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 48),
                ),
              ),
            ),

            // Shops list
            Expanded(
              child: shopProvider.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : shops.isEmpty
                      ? const Center(
                          child: Text('Do\'konlar mavjud emas'),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: shops.length,
                          itemBuilder: (context, index) {
                            final shop = shops[index];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ExpansionTile(
                                leading: Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: Colors.green.shade100,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(
                                    Icons.store,
                                    color: Colors.green,
                                  ),
                                ),
                                title: Text(shop.name),
                                subtitle: Text(shop.address),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    // Status indicator
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: shop.isOpen ? Colors.green : Colors.red,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Text(
                                        shop.isOpen ? 'Ochilgan' : 'Yopilgan',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    PopupMenuButton<String>(
                                      onSelected: (value) {
                                        switch (value) {
                                          case 'edit':
                                            _showEditShopDialog(context, shopProvider, shop);
                                            break;
                                          case 'delete':
                                            _showDeleteShopDialog(context, shopProvider, shop);
                                            break;
                                        }
                                      },
                                      itemBuilder: (context) => [
                                        const PopupMenuItem(
                                          value: 'edit',
                                          child: Text('Tahrirlash'),
                                        ),
                                        const PopupMenuItem(
                                          value: 'delete',
                                          child: Text('O\'chirish'),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                children: [
                                  Padding(
                                    padding: const EdgeInsets.all(16),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        // Shop details
                                        Row(
                                          children: [
                                            const Icon(Icons.star, size: 16, color: Colors.amber),
                                            const SizedBox(width: 4),
                                            Text('Reyting: ${shop.rating}'),
                                            const SizedBox(width: 16),
                                            const Icon(Icons.access_time, size: 16, color: Colors.grey),
                                            const SizedBox(width: 4),
                                            Text(shop.workingHours),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        Row(
                                          children: [
                                            const Icon(Icons.phone, size: 16, color: Colors.grey),
                                            const SizedBox(width: 4),
                                            Text(shop.phone),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        Row(
                                          children: [
                                            const Icon(Icons.location_on, size: 16, color: Colors.grey),
                                            const SizedBox(width: 4),
                                            Text('${shop.latitude}, ${shop.longitude}'),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          'Kategoriya: ${_getCategoryDisplayName(shop.category)}',
                                          style: TextStyle(
                                            color: Colors.grey.shade600,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
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

  void _showAddShopDialog(BuildContext context, ShopProvider shopProvider) {
    final nameController = TextEditingController();
    final addressController = TextEditingController();
    final phoneController = TextEditingController();
    final latitudeController = TextEditingController(text: '40.5966');
    final longitudeController = TextEditingController(text: '68.7786');
    final workingHoursController = TextEditingController(text: '08:00 - 22:00');
    String selectedCategory = 'oziq-ovqat';
    bool isOpen = true;

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
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: latitudeController,
                      decoration: const InputDecoration(labelText: 'Latitude'),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: longitudeController,
                      decoration: const InputDecoration(labelText: 'Longitude'),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              TextField(
                controller: workingHoursController,
                decoration: const InputDecoration(labelText: 'Ish vaqti'),
              ),
              DropdownButtonFormField<String>(
                value: selectedCategory,
                decoration: const InputDecoration(labelText: 'Kategoriya'),
                items: ['oziq-ovqat', 'ichimliklar', 'go\'sht', 'sut'].map((category) {
                  return DropdownMenuItem(
                    value: category,
                    child: Text(_getCategoryDisplayName(category)),
                  );
                }).toList(),
                onChanged: (value) {
                  selectedCategory = value!;
                },
              ),
              SwitchListTile(
                title: const Text('Ochilgan'),
                value: isOpen,
                onChanged: (value) {
                  isOpen = value;
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Bekor qilish'),
          ),
          ElevatedButton(
            onPressed: () async {
              final shop = Shop(
                id: 'shop_${DateTime.now().millisecondsSinceEpoch}',
                name: nameController.text,
                address: addressController.text,
                phone: phoneController.text,
                latitude: double.parse(latitudeController.text),
                longitude: double.parse(longitudeController.text),
                category: selectedCategory,
                imageUrl: 'assets/images/shops/default.jpg',
                workingHours: workingHoursController.text,
                isOpen: isOpen,
                rating: 0.0,
              );

              final success = await shopProvider.createShop(shop);
              Navigator.of(context).pop();

              if (success && mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Do\'kon muvaffaqiyatli qo\'shildi'),
                    backgroundColor: Colors.green,
                  ),
                );
              } else if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Do\'kon qo\'shishda xatolik'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            child: const Text('Qo\'shish'),
          ),
        ],
      ),
    );
  }

  void _showEditShopDialog(BuildContext context, ShopProvider shopProvider, Shop shop) {
    final nameController = TextEditingController(text: shop.name);
    final addressController = TextEditingController(text: shop.address);
    final phoneController = TextEditingController(text: shop.phone);
    final latitudeController = TextEditingController(text: shop.latitude.toString());
    final longitudeController = TextEditingController(text: shop.longitude.toString());
    final workingHoursController = TextEditingController(text: shop.workingHours);
    String selectedCategory = shop.category;
    bool isOpen = shop.isOpen;

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
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: latitudeController,
                      decoration: const InputDecoration(labelText: 'Latitude'),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: longitudeController,
                      decoration: const InputDecoration(labelText: 'Longitude'),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              TextField(
                controller: workingHoursController,
                decoration: const InputDecoration(labelText: 'Ish vaqti'),
              ),
              DropdownButtonFormField<String>(
                value: selectedCategory,
                decoration: const InputDecoration(labelText: 'Kategoriya'),
                items: ['oziq-ovqat', 'ichimliklar', 'go\'sht', 'sut'].map((category) {
                  return DropdownMenuItem(
                    value: category,
                    child: Text(_getCategoryDisplayName(category)),
                  );
                }).toList(),
                onChanged: (value) {
                  selectedCategory = value!;
                },
              ),
              SwitchListTile(
                title: const Text('Ochilgan'),
                value: isOpen,
                onChanged: (value) {
                  isOpen = value;
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Bekor qilish'),
          ),
          ElevatedButton(
            onPressed: () async {
              final updatedShop = Shop(
                id: shop.id,
                name: nameController.text,
                address: addressController.text,
                phone: phoneController.text,
                latitude: double.parse(latitudeController.text),
                longitude: double.parse(longitudeController.text),
                category: selectedCategory,
                imageUrl: shop.imageUrl,
                workingHours: workingHoursController.text,
                isOpen: isOpen,
                rating: shop.rating,
              );

              final success = await shopProvider.updateShop(shop.id, updatedShop);
              Navigator.of(context).pop();

              if (success && mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Do\'kon muvaffaqiyatli yangilandi'),
                    backgroundColor: Colors.green,
                  ),
                );
              } else if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Do\'kon yangilashda xatolik'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            child: const Text('Saqlash'),
          ),
        ],
      ),
    );
  }

  void _showDeleteShopDialog(BuildContext context, ShopProvider shopProvider, Shop shop) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Do\'konni o\'chirish'),
        content: Text('${shop.name} do\'konini o\'chirmoqchimisiz? Bu amal qaytarib bo\'lmaydi.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Bekor qilish'),
          ),
          ElevatedButton(
            onPressed: () async {
              final success = await shopProvider.deleteShop(shop.id);
              Navigator.of(context).pop();

              if (success && mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Do\'kon muvaffaqiyatli o\'chirildi'),
                    backgroundColor: Colors.green,
                  ),
                );
              } else if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Do\'kon o\'chirishda xatolik'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('O\'chirish'),
          ),
        ],
      ),
    );
  }
}