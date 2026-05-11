import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:store_guliston/config/app_colors.dart';
import 'package:store_guliston/models/order.dart';
import '../providers/order_provider.dart';
import '../providers/shop_provider.dart';
import 'admin_orders_screen.dart';
import 'admin_products_screen.dart';
import 'admin_shops_screen.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  int _selectedIndex = 0;
  bool _isCollapsed = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final orderProvider = Provider.of<OrderProvider>(context, listen: false);
    final shopProvider = Provider.of<ShopProvider>(context, listen: false);

    await orderProvider.loadOrders();
    await shopProvider.loadShops();
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width >= 1024;

    if (isDesktop) {
      return _buildDesktopLayout();
    } else {
      return _buildMobileLayout();
    }
  }

  Widget _buildDesktopLayout() {
    return Scaffold(
      backgroundColor: AppColors.backgroundGray,
      body: Row(
        children: [
          // Sidebar Navigation
          _buildSidebar(),
          
          // Main Content
          Expanded(
            child: IndexedStack(
              index: _selectedIndex,
              children: [
                _buildDashboardOverview(),
                const AdminOrdersScreen(),
                const AdminProductsScreen(),
                const AdminShopsScreen(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSidebar() {
    return Container(
      width: 260,
      height: MediaQuery.of(context).size.height,
      decoration: BoxDecoration(
        color: AppColors.surface,
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 20,
            offset: const Offset(4, 0),
          ),
        ],
      ),
      child: Column(
        children: [
          // Logo & Title
          Container(
            padding: const EdgeInsets.all(24),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primaryGreen.withOpacity(0.1),
                    borderRadius: AppRadius.largeRadius,
                  ),
                  child: const Icon(
                    Icons.store,
                    color: AppColors.primaryGreen,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Store Guliston',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textBlack,
                        ),
                      ),
                      Text(
                        'Admin Panel',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textGray,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          // Navigation Items
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 16),
              children: [
                _buildNavItem(Icons.dashboard, 'Boshqaruv', 0),
                _buildNavItem(Icons.receipt, 'Buyurtmalar', 1),
                _buildNavItem(Icons.inventory_2, 'Mahsulotlar', 2),
                _buildNavItem(Icons.store, 'Do\'konlar', 3),
              ],
            ),
          ),

          // User Section
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(color: AppColors.divider),
              ),
            ),
            child: Row(
              children: [
                const CircleAvatar(
                  backgroundColor: AppColors.primaryGreen,
                  child: Icon(Icons.person, color: Colors.white),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Admin',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        'admin@store.uz',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textGray,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.logout, size: 20),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, int index) {
    final isSelected = _selectedIndex == index;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: InkWell(
        onTap: () => _onItemTapped(index),
        borderRadius: AppRadius.largeRadius,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primaryGreen.withOpacity(0.1) : Colors.transparent,
            borderRadius: AppRadius.largeRadius,
          ),
          child: Row(
            children: [
              Icon(
                icon,
                color: isSelected ? AppColors.primaryGreen : AppColors.textLight,
                size: 22,
              ),
              const SizedBox(width: 12),
              Text(
                label,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                  color: isSelected ? AppColors.primaryGreen : AppColors.textGray,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMobileLayout() {
    return Scaffold(
      backgroundColor: AppColors.backgroundGray,
      appBar: AppBar(
        title: const Text(
          'Admin Panel',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        backgroundColor: AppColors.primaryGreen,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _loadData,
          ),
        ],
      ),
      body: IndexedStack(
        index: _selectedIndex,
        children: [
          _buildDashboardOverview(),
          const AdminOrdersScreen(),
          const AdminProductsScreen(),
          const AdminShopsScreen(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        items: const <BottomNavigationBarItem>[
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard),
            label: 'Boshqaruv',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt),
            label: 'Buyurtmalar',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.inventory_2),
            label: 'Mahsulotlar',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.store),
            label: 'Do\'konlar',
          ),
        ],
        currentIndex: _selectedIndex,
        selectedItemColor: AppColors.primaryGreen,
        unselectedItemColor: AppColors.textLight,
        backgroundColor: AppColors.surface,
        type: BottomNavigationBarType.fixed,
        onTap: _onItemTapped,
      ),
    );
  }

  Widget _buildDashboardOverview() {
    return Consumer2<OrderProvider, ShopProvider>(
      builder: (context, orderProvider, shopProvider, child) {
        final totalOrders = orderProvider.orders.length;
        final totalShops = shopProvider.shops.length;
        final pendingOrders = orderProvider.getOrdersByStatus(OrderStatus.pending).length;
        final deliveredOrders = orderProvider.getOrdersByStatus(OrderStatus.delivered).length;
        final totalRevenue = orderProvider.orders
            .where((o) => o.status == OrderStatus.delivered)
            .fold(0.0, (sum, order) => sum + order.totalAmount);

        return RefreshIndicator(
          onRefresh: _loadData,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Welcome Card
                _buildWelcomeCard(),
                
                const SizedBox(height: 28),

                // Revenue Section
                const Text(
                  'Umumiy Savdo',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textGray,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${totalRevenue.toStringAsFixed(0)} so\'m',
                  style: const TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primaryGreen,
                  ),
                ),
                
                const SizedBox(height: 28),

                // Metric Cards Grid
                LayoutBuilder(
                  builder: (context, constraints) {
                    final crossAxisCount = constraints.maxWidth >= 800 ? 4 : 2;
                    return GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: crossAxisCount,
                      mainAxisSpacing: 20,
                      crossAxisSpacing: 20,
                      childAspectRatio: 1.3,
                      children: [
                        _buildMetricCard(
                          title: 'UMUMIY SAVDO',
                          value: '${totalRevenue.toStringAsFixed(0)} so\'m',
                          icon: Icons.shopping_cart,
                          color: AppColors.primaryGreen,
                          trend: '+12%',
                          trendUp: true,
                        ),
                        _buildMetricCard(
                          title: 'YANGI BUYURTMALAR',
                          value: pendingOrders.toString(),
                          icon: Icons.add_shopping_cart,
                          color: AppColors.warning,
                          trend: '+5',
                          trendUp: true,
                        ),
                        _buildMetricCard(
                          title: 'YETKAZILDI',
                          value: deliveredOrders.toString(),
                          icon: Icons.local_shipping,
                          color: AppColors.success,
                          trend: '+8',
                          trendUp: true,
                        ),
                        _buildMetricCard(
                          title: 'DO\'KONLAR',
                          value: totalShops.toString(),
                          icon: Icons.store_mall_directory,
                          color: const Color(0xFF9C27B0),
                          trend: '+2',
                          trendUp: true,
                        ),
                      ],
                    );
                  },
                ),

                const SizedBox(height: 32),

                // Charts Row
                if (MediaQuery.of(context).size.width >= 1024)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 2,
                        child: _buildLineChartSection(),
                      ),
                      const SizedBox(width: 24),
                      Expanded(
                        flex: 1,
                        child: _buildDonutChartSection(orderProvider),
                      ),
                    ],
                  )
                else
                  Column(
                    children: [
                      _buildLineChartSection(),
                      const SizedBox(height: 24),
                      _buildDonutChartSection(orderProvider),
                    ],
                  ),

                const SizedBox(height: 32),

                // Recent Orders
                _buildRecentOrdersSection(orderProvider),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildWelcomeCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: AppRadius.xlargeRadius,
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryGreen.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Xush kelibsiz, Admin!",
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  DateTime.now().toString().split(' ')[0],
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white.withOpacity(0.8),
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: AppRadius.largeRadius,
            ),
            child: const Icon(
              Icons.analytics_outlined,
              color: Colors.white,
              size: 36,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required String trend,
    required bool trendUp,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: AppRadius.xlargeRadius,
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: AppRadius.mediumRadius,
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: trendUp ? Colors.green.withOpacity(0.1) : Colors.red.withOpacity(0.1),
                  borderRadius: AppRadius.smallRadius,
                ),
                child: Text(
                  trend,
                  style: TextStyle(
                    color: trendUp ? Colors.green : Colors.red,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryGreen,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textGray,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLineChartSection() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: AppRadius.xlargeRadius,
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'OYLIK SAVDO DINAMIKASI',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textBlack,
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 180,
            child: Stack(
              children: [
                Positioned.fill(
                  child: CustomPaint(
                    painter: GridPainter(),
                  ),
                ),
                Positioned.fill(
                  child: CustomPaint(
                    painter: LineChartPainter(),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildChartLabel('Dush'),
              _buildChartLabel('Sesh'),
              _buildChartLabel('Chor'),
              _buildChartLabel('Pay'),
              _buildChartLabel('Juma'),
              _buildChartLabel('Shan'),
              _buildChartLabel('Yak'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildChartLabel(String label) {
    return Text(
      label,
      style: TextStyle(
        fontSize: 11,
        color: AppColors.textLight,
      ),
    );
  }

  Widget _buildDonutChartSection(OrderProvider orderProvider) {
    final statusCounts = orderProvider.getOrderStatusCounts();
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: AppRadius.xlargeRadius,
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'BUYURTMALAR TAQSIMOTI',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textBlack,
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              SizedBox(
                width: 140,
                height: 140,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 140,
                      height: 140,
                      child: CustomPaint(
                        painter: DonutChartPainter(statusCounts),
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '${statusCounts.values.fold(0, (a, b) => a + b)}',
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primaryGreen,
                          ),
                        ),
                        const Text(
                          'Jami',
                          style: TextStyle(fontSize: 12, color: AppColors.textGray),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 24),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildLegendItem('Kutilmoqda', statusCounts[OrderStatus.pending] ?? 0, Colors.orange),
                    const SizedBox(height: 12),
                    _buildLegendItem('Tasdiqlangan', statusCounts[OrderStatus.confirmed] ?? 0, Colors.blue),
                    const SizedBox(height: 12),
                    _buildLegendItem('Tayyorlanmoqda', statusCounts[OrderStatus.preparing] ?? 0, Colors.purple),
                    const SizedBox(height: 12),
                    _buildLegendItem('Yetkazildi', statusCounts[OrderStatus.delivered] ?? 0, Colors.green),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem(String label, int count, Color color) {
    return Row(
      children: [
        Container(
          width: 14,
          height: 14,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(fontSize: 13, color: AppColors.textGray),
          ),
        ),
        Text(
          count.toString(),
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
        ),
      ],
    );
  }

  Widget _buildRecentOrdersSection(OrderProvider orderProvider) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: AppRadius.xlargeRadius,
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'SO\'NGGI BUYURTMALAR',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textBlack,
                ),
              ),
              TextButton(
                onPressed: () => _onItemTapped(1),
                child: const Text('Barchasi'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (orderProvider.isLoading)
            const Center(child: CircularProgressIndicator())
          else if (orderProvider.orders.isEmpty)
            Center(
              child: Column(
                children: [
                  Icon(Icons.inbox, size: 48, color: AppColors.textLight),
                  const SizedBox(height: 12),
                  Text(
                    'Buyurtmalar mavjud emas',
                    style: TextStyle(color: AppColors.textGray),
                  ),
                ],
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: orderProvider.getRecentOrders(5).length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final order = orderProvider.getRecentOrders(5)[index];
                return _buildOrderTile(order);
              },
            ),
        ],
      ),
    );
  }

  Widget _buildOrderTile(dynamic order) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundGray,
        borderRadius: AppRadius.largeRadius,
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: _getStatusColor(order.status).withOpacity(0.1),
            child: Icon(
              _getStatusIcon(order.status),
              color: _getStatusColor(order.status),
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Buyurtma #${order.id.length > 6 ? order.id.substring(order.id.length - 6).toUpperCase() : order.id}',
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                ),
                const SizedBox(height: 4),
                Text(
                  "${order.customerName ?? 'Mijoz'} - ${order.totalAmount.toStringAsFixed(0)} so'm",
                  style: TextStyle(color: AppColors.textGray, fontSize: 13),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: _getStatusColor(order.status).withOpacity(0.1),
              borderRadius: AppRadius.circularRadius,
            ),
            child: Text(
              _getStatusText(order.status),
              style: TextStyle(
                color: _getStatusColor(order.status),
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
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

  String _getStatusText(OrderStatus status) {
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
}

// Grid painter for chart background
class GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.grey.withOpacity(0.08)
      ..strokeWidth = 1;

    // Horizontal lines
    for (int i = 0; i <= 4; i++) {
      final y = size.height * i / 4;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// Line chart painter
class LineChartPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.primaryGreen
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final fillPaint = Paint()
      ..color = AppColors.primaryGreen.withOpacity(0.1)
      ..style = PaintingStyle.fill;

    // Sample data points
    final points = [
      Offset(size.width * 0.0, size.height * 0.7),
      Offset(size.width * 0.16, size.height * 0.5),
      Offset(size.width * 0.32, size.height * 0.6),
      Offset(size.width * 0.48, size.height * 0.3),
      Offset(size.width * 0.64, size.height * 0.4),
      Offset(size.width * 0.8, size.height * 0.2),
      Offset(size.width * 1.0, size.height * 0.15),
    ];

    // Draw filled area
    final path = Path();
    path.moveTo(points[0].dx, points[0].dy);
    for (int i = 1; i < points.length; i++) {
      path.lineTo(points[i].dx, points[i].dy);
    }
    path.lineTo(points.last.dx, size.height);
    path.lineTo(points.first.dx, size.height);
    path.close();
    canvas.drawPath(path, fillPaint);

    // Draw line
    final linePath = Path();
    linePath.moveTo(points[0].dx, points[0].dy);
    for (int i = 1; i < points.length; i++) {
      linePath.lineTo(points[i].dx, points[i].dy);
    }
    canvas.drawPath(linePath, paint);

    // Draw dots
    final dotPaint = Paint()
      ..color = AppColors.primaryGreen
      ..style = PaintingStyle.fill;

    for (final point in points) {
      canvas.drawCircle(point, 5, dotPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// Donut chart painter
class DonutChartPainter extends CustomPainter {
  final Map<OrderStatus, int> statusCounts;

  DonutChartPainter(this.statusCounts);

  @override
  void paint(Canvas canvas, Size size) {
    final total = statusCounts.values.fold(0, (a, b) => a + b);
    if (total == 0) return;

    final colors = [
      Colors.orange,
      Colors.blue,
      Colors.purple,
      Colors.green,
      Colors.red,
      Colors.teal,
      Colors.indigo,
    ];

    double startAngle = -90 * (3.14159 / 180); // Start from top
    final rect = Offset.zero & size;

    for (int i = 0; i < statusCounts.length && i < colors.length; i++) {
      final count = statusCounts.values.elementAt(i);
      if (count == 0) continue;

      final sweepAngle = (count / total) * 2 * 3.14159;

      final paint = Paint()
        ..color = colors[i]
        ..style = PaintingStyle.stroke
        ..strokeWidth = 24
        ..strokeCap = StrokeCap.butt;

      canvas.drawArc(rect, startAngle, sweepAngle, false, paint);
      startAngle += sweepAngle;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}