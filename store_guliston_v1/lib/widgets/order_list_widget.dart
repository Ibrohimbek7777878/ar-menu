import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/order_provider.dart';
import '../models/order.dart';

class OrderListWidget extends StatefulWidget {
  const OrderListWidget({super.key});

  @override
  State<OrderListWidget> createState() => _OrderListWidgetState();
}

class _OrderListWidgetState extends State<OrderListWidget> {
  OrderStatus? _selectedStatus;

  @override
  Widget build(BuildContext context) {
    return Consumer<OrderProvider>(
      builder: (context, orderProvider, child) {
        final orders = orderProvider.orders;

        return Column(
          children: [
            // Filter bar
            Container(
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: Column(
                children: [
                  // Status filter
                  SizedBox(
                    height: 40,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: [
                        // All orders button
                        FilterChip(
                          label: const Text('Barcha'),
                          selected: _selectedStatus == null,
                          onSelected: (selected) {
                            setState(() => _selectedStatus = null);
                            orderProvider.filterByStatus(null);
                          },
                        ),
                        const SizedBox(width: 8),
                        // Status chips
                        ...OrderStatus.values.map((status) => Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: FilterChip(
                            label: Text(_getStatusDisplayName(status)),
                            selected: _selectedStatus == status,
                            onSelected: (selected) {
                              setState(() => _selectedStatus = selected ? status : null);
                              orderProvider.filterByStatus(selected ? status : null);
                            },
                          ),
                        )),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Orders list
            Expanded(
              child: orderProvider.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : orders.isEmpty
                      ? const Center(
                          child: Text('Buyurtmalar mavjud emas'),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: orders.length,
                          itemBuilder: (context, index) {
                            final order = orders[index];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ExpansionTile(
                                leading: CircleAvatar(
                                  backgroundColor: _getStatusColor(order.status),
                                  child: Icon(
                                    _getStatusIcon(order.status),
                                    color: Colors.white,
                                    size: 20,
                                  ),
                                ),
                                title: Text('Buyurtma #${order.id.substring(order.id.length - 6)}'),
                                subtitle: Text(
                                  '${order.customerName ?? ''} - ${order.totalAmount.toStringAsFixed(0)} so\'m',
                                ),
                                trailing: _buildStatusDropdown(order, orderProvider),
                                children: [
                                  Padding(
                                    padding: const EdgeInsets.all(16),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        // Customer info
                                        Row(
                                          children: [
                                            const Icon(Icons.person, size: 16, color: Colors.grey),
                                            const SizedBox(width: 8),
                                            Text(order.customerName ?? ''),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        Row(
                                          children: [
                                            const Icon(Icons.phone, size: 16, color: Colors.grey),
                                            const SizedBox(width: 8),
                                            Text(order.customerPhone ?? ''),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        Row(
                                          children: [
                                            const Icon(Icons.location_on, size: 16, color: Colors.grey),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: Text(order.deliveryAddress ?? "Manzil kiritilmagan"),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 16),

                                        // Order items
                                        const Text(
                                          'Mahsulotlar:',
                                          style: TextStyle(fontWeight: FontWeight.bold),
                                        ),
                                        const SizedBox(height: 8),
                                        ...order.items.map((item) => Padding(
                                          padding: const EdgeInsets.only(bottom: 4),
                                          child: Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text('${item.productName} x${item.quantity}'),
                                              Text('${item.totalPrice.toStringAsFixed(0)} so\'m'),
                                            ],
                                          ),
                                        )),

                                        const Divider(),

                                        // Total
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            const Text(
                                              'Jami:',
                                              style: TextStyle(fontWeight: FontWeight.bold),
                                            ),
                                            Text(
                                              '${order.totalAmount.toStringAsFixed(0)} so\'m',
                                              style: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                color: Colors.green,
                                              ),
                                            ),
                                          ],
                                        ),

                                        const SizedBox(height: 8),

                                        // Order time
                                        Text(
                                          'Vaqt: ${_formatDateTime(order.createdAt)}',
                                          style: TextStyle(
                                            fontSize: 12,
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

  Widget _buildStatusDropdown(Order order, OrderProvider orderProvider) {
    return DropdownButton<OrderStatus>(
      value: order.status,
      items: OrderStatus.values.map((status) {
        return DropdownMenuItem(
          value: status,
          child: Text(
            _getStatusDisplayName(status),
            style: TextStyle(
              color: _getStatusColor(status),
              fontSize: 12,
            ),
          ),
        );
      }).toList(),
      onChanged: (newStatus) async {
        if (newStatus != null && newStatus != order.status) {
          final success = await orderProvider.updateOrderStatus(order.id, newStatus);
          if (success && mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Buyurtma holati yangilandi: ${_getStatusDisplayName(newStatus)}'),
                backgroundColor: Colors.green,
              ),
            );
          } else if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Holatni yangilashda xatolik'),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      },
      underline: const SizedBox.shrink(),
    );
  }

  String _getStatusDisplayName(OrderStatus status) {
    switch (status) {
      case OrderStatus.pending:
        return 'Kutilmoqda';
      case OrderStatus.confirmed:
        return 'Tasdiqlangan';
      case OrderStatus.preparing:
        return 'Tayyorlanmoqda';
      case OrderStatus.ready:
        return 'Tayyor';
      case OrderStatus.outForDelivery:
        return 'Yetkazilmoqda';
      case OrderStatus.delivered:
        return 'Yetkazildi';
      case OrderStatus.cancelled:
        return 'Bekor qilindi';
    }
  }

  Color _getStatusColor(OrderStatus status) {
    switch (status) {
      case OrderStatus.pending:
        return Colors.orange;
      case OrderStatus.confirmed:
        return Colors.blue;
      case OrderStatus.preparing:
        return Colors.purple;
      case OrderStatus.ready:
        return Colors.teal;
      case OrderStatus.outForDelivery:
        return Colors.indigo;
      case OrderStatus.delivered:
        return Colors.green;
      case OrderStatus.cancelled:
        return Colors.red;
    }
  }

  IconData _getStatusIcon(OrderStatus status) {
    switch (status) {
      case OrderStatus.pending:
        return Icons.pending;
      case OrderStatus.confirmed:
        return Icons.check_circle_outline;
      case OrderStatus.preparing:
        return Icons.restaurant;
      case OrderStatus.ready:
        return Icons.done;
      case OrderStatus.outForDelivery:
        return Icons.delivery_dining;
      case OrderStatus.delivered:
        return Icons.check_circle;
      case OrderStatus.cancelled:
        return Icons.cancel;
    }
  }

  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.day}.${dateTime.month}.${dateTime.year} ${dateTime.hour}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}
