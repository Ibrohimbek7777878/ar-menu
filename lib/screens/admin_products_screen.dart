import 'package:flutter/material.dart';

// Admin Products Screen - manages products for a specific shop
class AdminProductsScreen extends StatefulWidget {
  final String shopId;

  const AdminProductsScreen({super.key, required this.shopId});

  @override
  State<AdminProductsScreen> createState() => _AdminProductsScreenState();
}

class _AdminProductsScreenState extends State<AdminProductsScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mahsulotlar'),
        backgroundColor: Colors.blue,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              // Show add product dialog
              _showAddProductDialog(context);
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Mahsulotlar ro\'yxati',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            // Sample products list
            Expanded(
              child: ListView.builder(
                itemCount: 5,
                itemBuilder: (context, index) {
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
                        child: const Icon(Icons.shopping_bag),
                      ),
                      title: Text('Mahsulot $index'),
                      subtitle: const Text('15 000 so\'m / kg'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit, size: 18),
                            onPressed: () {
                              // Show edit product dialog
                              _showEditProductDialog(context, index);
                            },
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete, size: 18),
                            onPressed: () {
                              // Show delete confirmation
                              _showDeleteConfirmation(context, index);
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
        ),
      ),
    );
  }

  void _showAddProductDialog(BuildContext context) {
    final nameController = TextEditingController();
    final descriptionController = TextEditingController();
    final priceController = TextEditingController();
    final unitController = TextEditingController();
    final categoryController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Mahsulot qo\'shish'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextFormField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Nomi'),
              ),
              TextFormField(
                controller: descriptionController,
                decoration: const InputDecoration(labelText: 'Tavsifi'),
                maxLines: 3,
              ),
              TextFormField(
                controller: priceController,
                decoration: const InputDecoration(labelText: 'Narxi (so\'m)'),
                keyboardType: TextInputType.number,
              ),
              TextFormField(
                controller: unitController,
                decoration: const InputDecoration(labelText: 'Birligi (dona/kg/litr)'),
              ),
              TextFormField(
                controller: categoryController,
                decoration: const InputDecoration(labelText: 'Kategoriya'),
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
            onPressed: () {
              // In real app, this would save to Firebase
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Mahsulot qo\'shildi!')),
              );
            },
            child: const Text('Saqlash'),
          ),
        ],
      ),
    );
  }

  void _showEditProductDialog(BuildContext context, int index) {
    final nameController = TextEditingController(text: 'Mahsulot $index');
    final descriptionController = TextEditingController(text: 'Bu mahsulot haqida batafsil tavsif');
    final priceController = TextEditingController(text: '15000');
    final unitController = TextEditingController(text: 'kg');
    final categoryController = TextEditingController(text: 'Non');

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Mahsulotni tahrirlash'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextFormField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Nomi'),
              ),
              TextFormField(
                controller: descriptionController,
                decoration: const InputDecoration(labelText: 'Tavsifi'),
                maxLines: 3,
              ),
              TextFormField(
                controller: priceController,
                decoration: const InputDecoration(labelText: 'Narxi (so\'m)'),
                keyboardType: TextInputType.number,
              ),
              TextFormField(
                controller: unitController,
                decoration: const InputDecoration(labelText: 'Birligi (dona/kg/litr)'),
              ),
              TextFormField(
                controller: categoryController,
                decoration: const InputDecoration(labelText: 'Kategoriya'),
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
            onPressed: () {
              // In real app, this would update in Firebase
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Mahsulot tahrirlangan!')),
              );
            },
            child: const Text('Saqlash'),
          ),
        ],
      ),
    );
  }

  void _showDeleteConfirmation(BuildContext context, int index) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Mahsulotni o\'chirish'),
        content: const Text('Bu mahsulotni o\'chirishni xohlaysizmi?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Yo\'q'),
          ),
          ElevatedButton(
            onPressed: () {
              // In real app, this would delete from Firebase
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Mahsulot o\'chirildi!')),
              );
            },
            child: const Text('Ha'),
          ),
        ],
      ),
    );
  }
}