import 'package:flutter/material.dart';

// Admin Orders Screen - displays and manages orders
class AdminOrdersScreen extends StatefulWidget {
  const AdminOrdersScreen({super.key});

  @override
  State<AdminOrdersScreen> createState() => _AdminOrdersScreenState();
}

class _AdminOrdersScreenState extends State<AdminOrdersScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Buyurtmalar'),
        backgroundColor: Colors.blue,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Buyurtmalar ro\'yxati',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            // Sample orders list
            Expanded(
              child: ListView.builder(
                itemCount: 5,
                itemBuilder: (context, index) {
                  final status = ['Yangi', 'Qabul qilindi', 'Yo\'lda', 'Yetkazildi'][index % 4];
                  final statusColor = [
                    Colors.red,
                    Colors.orange,
                    Colors.blue,
                    Colors.green
                  ][index % 4];

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
                        child: const Icon(Icons.shopping_cart),
                      ),
                      title: Text('#1234${index + 1}'),
                      subtitle: Text('Alijonov Ali • +998 90 123 45 67'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: statusColor.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              status,
                              style: TextStyle(color: statusColor),
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            icon: const Icon(Icons.phone, size: 18),
                            onPressed: () {
                              // In real app, this would make a phone call
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Qo\'ng\'iroq qilish')), 
                              );
                            },
                          ),
                        ],
                      ),
                      onTap: () {
                        // Show order details
                        _showOrderDetails(context, index);
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

  void _showOrderDetails(BuildContext context, int index) {
    final statusOptions = ['Yangi', 'Qabul qilindi', 'Yo\'lda', 'Yetkazildi'];
    final statusColors = [Colors.red, Colors.orange, Colors.blue, Colors.green];

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Buyurtma tafsilotlari'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Buyurtma raqami: #12345'),
              const SizedBox(height: 8),
              const Text('Mijoz: Alijonov Ali'),
              const SizedBox(height: 8),
              const Text('Telefon: +998 90 123 45 67'),
              const SizedBox(height: 8),
              const Text('Do\'kon: Guliston Do\'kon'),
              const SizedBox(height: 8),
              const Text('Jami summa: 45 000 so\'m'),
              const SizedBox(height: 8),
              const Text('Mahsulotlar:'),
              const SizedBox(height: 8),
              ListTile(
                leading: const Icon(Icons.shopping_bag),
                title: const Text('Non'),
                subtitle: const Text('2 kg • 15 000 so\'m'),
              ),
              ListTile(
                leading: const Icon(Icons.shopping_bag),
                title: const Text('Go\'sh'),
                subtitle: const Text('1 kg • 30 000 so\'m'),
              ),
              const SizedBox(height: 16),
              const Text('Holatni o\'zgartirish:'),
              const SizedBox(height: 8),
              DropdownButton<String>(
                value: statusOptions[index % 4],
                items: statusOptions.map((String status) {
                  final colorIndex = statusOptions.indexOf(status);
                  return DropdownMenuItem<String>(
                    value: status,
                    child: Text(
                      status,
                      style: TextStyle(color: statusColors[colorIndex]),
                    ),
                  );
                }).toList(),
                onChanged: (String? newValue) {
                  // In real app, this would update order status in Firebase
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Holat $newValue ga o\'zgartirildi!')),
                  );
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Yopish'),
          ),
        ],
      ),
    );
  }
}