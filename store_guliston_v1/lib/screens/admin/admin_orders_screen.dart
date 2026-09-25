import 'package:flutter/material.dart';

import '../../config/app_colors.dart';
import '../../database/database_helper.dart';
import '../../models/courier.dart';
import '../../models/order.dart';
import '../../services/admin_auth.dart';
import '../../services/order_service.dart';
import '../../widgets/admin_scaffold.dart';
import '../../widgets/responsive_grid_list.dart';

class AdminOrdersScreen extends StatefulWidget {
  const AdminOrdersScreen({super.key});

  @override
  State<AdminOrdersScreen> createState() => _AdminOrdersScreenState();
}

class _AdminOrdersScreenState extends State<AdminOrdersScreen> {
  final OrderService _orderService = OrderService();
  final DatabaseHelper _dbHelper = DatabaseHelper();
  final TextEditingController _searchController = TextEditingController();

  List<Order> _orders = [];
  List<Courier> _couriers = [];
  bool _isLoading = true;
  String _statusFilter = 'all';

  final Map<String, String> statusLabels = {
    'all': 'Barchasi',
    'pending': 'Kutilmoqda',
    'confirmed': 'Tasdiqlangan',
    'preparing': 'Tayyorlanmoqda',
    'ready': 'Tayyor',
    'outForDelivery': 'Yetkazilmoqda',
    'delivered': 'Yetkazildi',
    'cancelled': 'Bekor qilingan',
  };

  final Map<String, Color> statusColors = {
    'pending': AppColors.statusPending,
    'confirmed': Colors.blue,
    'preparing': AppColors.statusPreparing,
    'ready': AppColors.statusReady,
    'outForDelivery': AppColors.statusOutForDelivery,
    'delivered': AppColors.statusDelivered,
    'cancelled': AppColors.statusCancelled,
  };

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await AdminAuth().redirectToLoginIfNeeded(context);
      _loadOrders();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadOrders() async {
    setState(() => _isLoading = true);
    final status = _statusFilter != 'all' ? _statusFilter : null;
    final orders = await _orderService.getOrders(status: status);
    final db = await _dbHelper.database;
    final courierRows = await db.query('couriers', orderBy: 'created_at DESC');

    if (!mounted) return;
    setState(() {
      _orders = orders;
      _couriers = courierRows.map((map) => Courier.fromMap(map)).toList();
      _isLoading = false;
    });
  }

  List<Order> get _filteredOrders {
    final q = _searchController.text.toLowerCase();
    return _orders.where((o) {
      final orderNumber = o.orderNumber?.toLowerCase() ?? '';
      final customerName = o.customerName?.toLowerCase() ?? '';
      final phones = o.customerPhones.join(', ').toLowerCase();
      return q.isEmpty || orderNumber.contains(q) || customerName.contains(q) || phones.contains(q);
    }).toList();
  }

  Future<void> _changeStatus(Order order, String newStatus) async {
    await _orderService.updateOrderStatus(order.id, newStatus);
    await _loadOrders();
  }

  Future<void> _assignCourier(Order order) async {
    if (_couriers.isEmpty) return;

    final selectedCourier = await showDialog<Courier>(
      context: context,
      builder: (ctx) => SimpleDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Kuryer tayinlash'),
        children: _couriers
            .map(
              (courier) => SimpleDialogOption(
                onPressed: () => Navigator.pop(ctx, courier),
                child: Text('${courier.name} • ${courier.phone}'),
              ),
            )
            .toList(),
      ),
    );

    if (selectedCourier == null) return;

    final db = await _dbHelper.database;
    await db.update(
      'orders',
      {
        'courier_name': selectedCourier.name,
        'courier_phone': selectedCourier.phone,
        'updated_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      where: 'id = ?',
      whereArgs: [order.id],
    );
    await _loadOrders();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredOrders;
    final pendingCount = _orders.where((o) => o.status.value == 'pending').length;
    final deliveredCount = _orders.where((o) => o.status.value == 'delivered').length;
    final cancelledCount = _orders.where((o) => o.status.value == 'cancelled').length;

    return AdminScaffold(
      title: 'Buyurtmalar',
      body: Column(
        children: [
          _buildSummaryHeader(),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _miniStat('Kutilmoqda', pendingCount.toString(), AppColors.statusPending)),
              const SizedBox(width: 8),
              Expanded(child: _miniStat('Yetkazildi', deliveredCount.toString(), AppColors.statusDelivered)),
              const SizedBox(width: 8),
              Expanded(child: _miniStat('Bekor', cancelledCount.toString(), AppColors.statusCancelled)),
            ],
          ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 0, vertical: 0),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 6, offset: const Offset(0, 2))],
              ),
              child: TextField(
                controller: _searchController,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  hintText: 'Buyurtma raqami yoki telefon...',
                  prefixIcon: Icon(Icons.search, color: AppColors.textGray),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
            ),
          ),
          SizedBox(
            height: 38,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: statusLabels.entries.map((entry) {
                final selected = _statusFilter == entry.key;
                final color = statusColors[entry.key] ?? AppColors.primaryGreen;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () {
                      setState(() => _statusFilter = entry.key);
                      _loadOrders();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: selected ? color : AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: selected ? color : AppColors.divider, width: 1),
                      ),
                      child: Text(
                        entry.value,
                        style: TextStyle(
                          color: selected ? Colors.white : AppColors.textGray,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: _loadOrders,
                    child: filtered.isEmpty
                        ? ListView(
                            children: const [
                              SizedBox(height: 100),
                              Center(
                                child: Column(
                                  children: [
                                    Icon(Icons.receipt_long_outlined, size: 64, color: AppColors.textLight),
                                    SizedBox(height: 16),
                                    Text('Buyurtmalar topilmadi', style: TextStyle(color: AppColors.textGray)),
                                  ],
                                ),
                              ),
                            ],
                          )
                        : ResponsiveGridList(
                            itemCount: filtered.length,
                            itemBuilder: (context, index) {
                              final order = filtered[index];
                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(20),
                                  boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 8, offset: const Offset(0, 2))],
                                ),
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(20),
                                  onTap: () => _showOrderDetail(order),
                                  child: Padding(
                                    padding: const EdgeInsets.all(14),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 48,
                                          height: 48,
                                          decoration: BoxDecoration(
                                            color: (statusColors[order.status.value] ?? Colors.grey).withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(14),
                                          ),
                                          child: Icon(Icons.receipt, color: statusColors[order.status.value] ?? Colors.grey, size: 22),
                                        ),
                                        const SizedBox(width: 14),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                order.orderNumber ?? '#${order.id.substring(order.id.length - 6)}',
                                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.textBlack),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                '${order.customerName ?? ''} | ${order.customerPhones.join(', ')}',
                                                style: const TextStyle(fontSize: 12, color: AppColors.textGray),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                '${order.finalAmount.toStringAsFixed(0)} so\'m',
                                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primaryGreen),
                                              ),
                                            ],
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                          decoration: BoxDecoration(
                                            color: statusColors[order.status.value] ?? Colors.grey,
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            statusLabels[order.status.value] ?? order.status.value,
                                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryHeader() {
    final totalRevenue = _orders.fold<double>(0, (sum, order) => sum + order.finalAmount);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: AppColors.primaryGreen.withValues(alpha: 0.14), blurRadius: 16, offset: const Offset(0, 6)),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Icon(Icons.receipt_long, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_orders.length} buyurtma',
                  style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  'Jami tushum: ${totalRevenue.toStringAsFixed(0)} so\'m',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 13),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              '${_orders.where((o) => o.status.value == 'delivered').length} yetkazildi',
              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _miniStat(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textGray)),
        ],
      ),
    );
  }

  void _showOrderDetail(Order order) {
    final statuses = statusLabels.keys.where((k) => k != 'all').toList();
    final currentIndex = statuses.indexOf(order.status.value);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: AppColors.divider, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Text(
                  order.orderNumber ?? '#${order.id.substring(order.id.length - 6)}',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.textBlack),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusColors[order.status.value] ?? Colors.grey,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    statusLabels[order.status.value] ?? order.status.value,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 12),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            const Text('Mijoz ma\'lumotlari', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            _detailRow('Ism', order.customerName ?? '—'),
            _detailRow('Telefon', order.customerPhones.join(', ')),
            const SizedBox(height: 16),
            const Text('Yetkazish', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            _detailRow('Manzil', order.deliveryAddress ?? 'Olib ketish'),
            const SizedBox(height: 16),
            const Text('Moliyaviy', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            _detailRow('Jami', '${order.totalAmount.toStringAsFixed(0)} so\'m'),
            _detailRow('Yakuniy', '${order.finalAmount.toStringAsFixed(0)} so\'m', AppColors.primaryGreen),
            _detailRow('Kuryer', order.courierName ?? 'Tayinlanmagan'),
            if (order.notes != null && order.notes!.isNotEmpty) ...[
              const SizedBox(height: 12),
              _detailRow('Izoh', order.notes!),
            ],
            const SizedBox(height: 20),
            if (currentIndex < statuses.length - 1) ...[
              const Text('Holatni o\'zgartirish', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(color: AppColors.backgroundGray, borderRadius: BorderRadius.circular(14)),
                child: DropdownButton<String>(
                  value: order.status.value,
                  isExpanded: true,
                  underline: const SizedBox(),
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  items: statuses
                      .map(
                        (s) => DropdownMenuItem(
                          value: s,
                          child: Row(
                            children: [
                              Container(width: 10, height: 10, decoration: BoxDecoration(color: statusColors[s] ?? Colors.grey, shape: BoxShape.circle)),
                              const SizedBox(width: 8),
                              Text(statusLabels[s] ?? s, style: const TextStyle(fontWeight: FontWeight.w500)),
                            ],
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (v) {
                    if (v != null && v != order.status.value) {
                      Navigator.pop(ctx);
                      _changeStatus(order, v);
                    }
                  },
                ),
              ),
            ],
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _couriers.isEmpty ? null : () => _assignCourier(order),
                icon: const Icon(Icons.delivery_dining, size: 18),
                label: const Text('Kuryer tayinlash', style: TextStyle(fontWeight: FontWeight.w600)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primaryGreen,
                  side: const BorderSide(color: AppColors.primaryGreen),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value, [Color? valueColor]) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text(label, style: const TextStyle(color: AppColors.textGray, fontSize: 13)),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(fontWeight: FontWeight.w500, fontSize: 13, color: valueColor ?? AppColors.textBlack),
            ),
          ),
        ],
      ),
    );
  }
}
