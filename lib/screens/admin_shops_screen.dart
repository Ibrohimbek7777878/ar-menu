import 'package:flutter/material.dart';

// Admin Shops Screen - manages shops (add, edit, delete)
class AdminShopsScreen extends StatefulWidget {
  const AdminShopsScreen({super.key});

  @override
  State<AdminShopsScreen> createState() => _AdminShopsScreenState();
}

class _AdminShopsScreenState extends State<AdminShopsScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Do\'konlar'),
        backgroundColor: Colors.blue,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              // Show add shop dialog
              _showAddShopDialog(context);
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
              'Do\'konlar ro\'yxati',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            // Sample shops list
            Expanded(
              child: ListView.builder(
                itemCount: 3,
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
                        child: const Icon(Icons.store),
                      ),
                      title: Text('Do\'kon $index'),
                      subtitle: const Text('Guliston shahri, Yangi Yer tumani'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit, size: 18),
                            onPressed: () {
                              // Show edit shop dialog
                              _showEditShopDialog(context, index);
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
                      onTap: () {
                        // Navigate to shop products screen
                        Navigator.pushNamed(
                          context,
                          '/admin/products/123',
                        );
                      },
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

  void _showAddShopDialog(BuildContext context) {
    final nameController = TextEditingController();
    final addressController = TextEditingController();
    final cityController = TextEditingController();
    final phoneController = TextEditingController();
    final startTimeController = TextEditingController();
    final endTimeController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Do\'kon qo\'shish'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextFormField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Nomi'),
              ),
              TextFormField(
                controller: addressController,
                decoration: const InputDecoration(labelText: 'Manzili'),
              ),
              TextFormField(
                controller: cityController,
                decoration: const InputDecoration(labelText: 'Shahar (Yangi Yer/Guliston)'),
              ),
              TextFormField(
                controller: phoneController,
                decoration: const InputDecoration(labelText: 'Telefon raqami'),
              ),
              TextFormField(
                controller: startTimeController,
                decoration: const InputDecoration(labelText: 'Ish vaqti (boshlanish)'),
              ),
              TextFormField(
                controller: endTimeController,
                decoration: const InputDecoration(labelText: 'Ish vaqti (tugash)'),
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
                const SnackBar(content: Text('Do\'kon qo\'shildi!')),
              );
            },
            child: const Text('Saqlash'),
          ),
        ],
      ),
    );
  }

  void _showEditShopDialog(BuildContext context, int index) {
    final nameController = TextEditingController(text: 'Do\'kon $index');
    final addressController = TextEditingController(text: 'Guliston shahri, Yangi Yer tumani');
    final cityController = TextEditingController(text: 'Guliston');
    final phoneController = TextEditingController(text: '+998 90 123 45 67');
    final startTimeController = TextEditingController(text: '09:00');
    final endTimeController = TextEditingController(text: '21:00');

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Do\'konni tahrirlash'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextFormField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Nomi'),
              ),
              TextFormField(
                controller: addressController,
                decoration: const InputDecoration(labelText: 'Manzili'),
              ),
              TextFormField(
                controller: cityController,
                decoration: const InputDecoration(labelText: 'Shahar (Yangi Yer/Guliston)'),
              ),
              TextFormField(
                controller: phoneController,
                decoration: const InputDecoration(labelText: 'Telefon raqami'),
              ),
              TextFormField(
                controller: startTimeController,
                decoration: const InputDecoration(labelText: 'Ish vaqti (boshlanish)'),
              ),
              TextFormField(
                controller: endTimeController,
                decoration: const InputDecoration(labelText: 'Ish vaqti (tugash)'),
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
                const SnackBar(content: Text('Do\'kon tahrirlangan!')),
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
        title: const Text('Do\'konni o\'chirish'),
        content: const Text('Bu do\'konni o\'chirishni xohlaysizmi?'),
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
                const SnackBar(content: Text('Do\'kon o\'chirildi!')),
              );
            },
            child: const Text('Ha'),
          ),
        ],
      ),
    );
  }
}