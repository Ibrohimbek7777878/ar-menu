import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:go_router/go_router.dart';
import '../../config/app_colors.dart';
import '../../widgets/admin_scaffold.dart';
import '../../models/weather.dart';
import '../../models/order.dart';
import '../../providers/admin_settings_provider.dart';
import '../../providers/weather_provider.dart';
import '../../services/admin_auth.dart';
import '../../services/order_service.dart';
import '../../services/product_service.dart';
import '../../services/shop_service.dart';
import '../../widgets/admin_dashboard_sections.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  final ShopService _shopService = ShopService();
  final ProductService _productService = ProductService();
  final OrderService _orderService = OrderService();

  int totalOrders = 0;
  double todayRevenue = 0;
  int activeShops = 0;
  int totalProducts = 0;
  List<Order> _orders = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await AdminAuth().redirectToLoginIfNeeded(context);
      _loadWeatherData();
      _loadDashboardStats();
    });
  }

  Future<void> _loadWeatherData() async {
    final settingsProvider = Provider.of<AdminSettingsProvider>(context, listen: false);
    final weatherProvider = Provider.of<WeatherProvider>(context, listen: false);
    final apiKey = settingsProvider.getSetting('weather_api_key');

    if (apiKey.isEmpty) {
      weatherProvider.loadDemoWeather();
      return;
    }

    await weatherProvider.refreshWeather(apiKey);
    if (weatherProvider.currentWeather == null) {
      weatherProvider.loadDemoWeather();
    }
  }

  Future<void> _loadDashboardStats() async {
    final shops = await _shopService.getShops();
    final products = await _productService.getProducts();
    final orders = await _orderService.getOrders();
    final revenue = await _orderService.getTotalRevenue();

    if (mounted) {
      setState(() {
        activeShops = shops.where((shop) => shop.isOpen).length;
        totalProducts = products.length;
        totalOrders = orders.length;
        todayRevenue = revenue;
        _orders = orders;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AdminScaffold(
      title: 'Dashboard',
      actions: [
        IconButton(
          icon: const Icon(Icons.logout),
          onPressed: () async {
            await AdminAuth().logout();
            if (context.mounted) {
              context.go('/admin/login');
            }
          },
        ),
      ],
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: _buildDashboardContent(),
        ),
      ),
    );
  }

  List<Widget> _buildDashboardContent() {
    return <Widget>[
      _buildHeroBanner(),
      const SizedBox(height: 16),
      _buildStatsRow(),
      const SizedBox(height: 12),
      _buildSecondaryStatsRow(),
      const SizedBox(height: 24),
      Consumer<WeatherProvider>(
        builder: (context, weatherProvider, child) {
          final weather = weatherProvider.currentWeather;
          if (weather == null) {
            return const SizedBox.shrink();
          }
          return _buildWeatherSummaryCard(weather);
        },
      ),
      const SizedBox(height: 24),
      _buildSectionTitle('Kunlik sotuv'),
      const SizedBox(height: 12),
      _buildSalesChart(),
      const SizedBox(height: 24),
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Expanded(
            child: DashboardProductSection(
              productChart: _buildTopProductsChart(),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: DashboardOrderSection(
              orderChart: _buildOrderStatusChart(),
            ),
          ),
        ],
      ),
      const SizedBox(height: 24),
      _buildSectionTitle('Tezkor navigatsiya'),
      const SizedBox(height: 12),
      _buildQuickNav(),
      const SizedBox(height: 40),
    ];
  }

  Widget _buildHeroBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: AppColors.primaryGreen.withValues(alpha: 0.18), blurRadius: 16, offset: const Offset(0, 6)),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Icon(Icons.dashboard_rounded, color: Colors.white, size: 30),
          ),
          const SizedBox(width: 14),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Admin Markaz',
                  style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                ),
                SizedBox(height: 4),
                Text(
                  'Buyurtmalar, do‘konlar va mahsulotlar bir joyda',
                  style: TextStyle(color: Colors.white70, fontSize: 13),
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
            child: const Text(
              'LIVE',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 11),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsRow() {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        _animatedStatCard(
          'Jami buyurtmalar',
          totalOrders.toDouble(),
          Icons.receipt_long,
          AppColors.primaryGreen,
          formatter: (v) => v.toInt().toString(),
        ),
        _animatedStatCard(
          'Bugungi tushum',
          todayRevenue,
          Icons.monetization_on,
          AppColors.accentOrange,
          formatter: (v) => '${(v / 1000).toStringAsFixed(0)}k',
        ),
      ],
    );
  }

  Widget _animatedStatCard(
    String label,
    double target,
    IconData icon,
    Color color, {
    required String Function(double value) formatter,
  }) {
    return SizedBox(
      width: (MediaQuery.of(context).size.width - 44) / 2,
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: target),
        duration: const Duration(milliseconds: 900),
        builder: (context, value, child) {
          return _buildStatCard(label, formatter(value), icon, color);
        },
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: AppColors.shadow, blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(height: 14),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: const TextStyle(color: AppColors.textGray, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: AppColors.textBlack,
      ),
    );
  }

  Widget _buildSecondaryStatsRow() {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        SizedBox(
          width: (MediaQuery.of(context).size.width - 44) / 2,
          child: _buildStatCard('Faol do\'konlar', activeShops.toString(), Icons.storefront, AppColors.primaryGreen),
        ),
        SizedBox(
          width: (MediaQuery.of(context).size.width - 44) / 2,
          child: _buildStatCard('Mahsulotlar', totalProducts.toString(), Icons.inventory_2, AppColors.accentOrange),
        ),
      ],
    );
  }

  Widget _buildWeatherSummaryCard(Weather weather) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF16A34A), Color(0xFF22C55E)],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: AppColors.primaryGreen.withValues(alpha: 0.2), blurRadius: 16, offset: const Offset(0, 6)),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(
            _getWeatherIcon(weather.icon),
            size: 42,
            color: Colors.white,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  weather.city,
                  style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  weather.description,
                  style: const TextStyle(color: Colors.white70, fontSize: 14),
                ),
                const SizedBox(height: 8),
                Text(
                  weather.temperatureString,
                  style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('Namlik: ${weather.humidityString}', style: const TextStyle(color: Colors.white70)),
              const SizedBox(height: 4),
              Text('Shamol: ${weather.windSpeedString}', style: const TextStyle(color: Colors.white70)),
            ],
          ),
        ],
      ),
    );
  }

  IconData _getWeatherIcon(String iconCode) {
    if (iconCode.isEmpty) {
      return Icons.wb_sunny;
    }
    switch (iconCode.substring(0, 2)) {
      case '01':
        return Icons.wb_sunny;
      case '02':
        return Icons.wb_cloudy;
      case '03':
      case '04':
        return Icons.cloud;
      case '09':
      case '10':
        return Icons.grain;
      case '11':
        return Icons.flash_on;
      case '13':
        return Icons.ac_unit;
      case '50':
        return Icons.blur_on;
      default:
        return Icons.wb_sunny;
    }
  }

  Widget _buildSalesChart() {
    final spots = [
      const FlSpot(0, 800),
      const FlSpot(1, 1200),
      const FlSpot(2, 900),
      const FlSpot(3, 1500),
      const FlSpot(4, 1100),
      const FlSpot(5, 1800),
      const FlSpot(6, 1250),
    ];

    return Container(
      height: 180,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: AppColors.shadow, blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: 2000,
          barTouchData: BarTouchData(enabled: true),
          titlesData: FlTitlesData(
            show: true,
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  const days = ['Du', 'Se', 'Cho', 'Pay', 'Ju', 'Sha', 'Yak'];
                  return Text(days[value.toInt()], style: const TextStyle(fontSize: 10));
                },
              ),
            ),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(showTitles: true, reservedSize: 40),
            ),
            topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          borderData: FlBorderData(show: false),
          barGroups: spots.map((spot) {
            return BarChartGroupData(
              x: spot.x.toInt(),
              barRods: [
                BarChartRodData(
                  toY: spot.y,
                  color: AppColors.primaryGreen,
                  width: 14,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildTopProductsChart() {
    final topProducts = <String, int>{};
    for (final order in _orders) {
      for (final item in order.items) {
        topProducts[item.productName] = (topProducts[item.productName] ?? 0) + item.quantity;
      }
    }
    final sorted = topProducts.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final data = sorted.take(3).toList();

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: AppColors.shadow, blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Top mahsulotlar', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
          const SizedBox(height: 12),
          if (data.isEmpty)
            const Text('Maʼlumot yetarli emas', style: TextStyle(color: AppColors.textGray, fontSize: 12))
          else
            ...data.asMap().entries.map((entry) {
              final index = entry.key;
              final item = entry.value;
              final colors = [AppColors.primaryGreen, AppColors.accentOrange, Colors.blue];
              return Padding(
                padding: EdgeInsets.only(bottom: index == data.length - 1 ? 0 : 8),
                child: _productBar(item.key, item.value, colors[index % colors.length]),
              );
            }),
        ],
      ),
    );
  }

  Widget _productBar(String name, int count, Color color) {
    final maxCount = 50.0;
    return Row(
      children: [
        SizedBox(width: 36, child: Text(name, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500))),
        const SizedBox(width: 8),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: count / maxCount,
              backgroundColor: color.withValues(alpha: 0.1),
              valueColor: AlwaysStoppedAnimation(color),
              minHeight: 14,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text('$count', style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildOrderStatusChart() {
    final counts = <String, int>{
      'pending': 0,
      'confirmed': 0,
      'preparing': 0,
      'ready': 0,
      'outForDelivery': 0,
      'delivered': 0,
      'cancelled': 0,
    };
    for (final order in _orders) {
      counts[order.status.value] = (counts[order.status.value] ?? 0) + 1;
    }

    final sections = <PieChartSectionData>[
      PieChartSectionData(value: counts['pending']!.toDouble(), color: AppColors.statusPending, title: '${counts['pending']}', radius: 22, titleStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white)),
      PieChartSectionData(value: counts['outForDelivery']!.toDouble(), color: AppColors.statusOutForDelivery, title: '${counts['outForDelivery']}', radius: 22, titleStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white)),
      PieChartSectionData(value: counts['delivered']!.toDouble(), color: AppColors.statusDelivered, title: '${counts['delivered']}', radius: 22, titleStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white)),
      PieChartSectionData(value: counts['cancelled']!.toDouble(), color: AppColors.statusCancelled, title: '${counts['cancelled']}', radius: 22, titleStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white)),
    ].where((section) => section.value > 0).toList();

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: AppColors.shadow, blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Buyurtma statusi', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
          const SizedBox(height: 12),
          SizedBox(
            height: 150,
            child: sections.isEmpty
                ? const Center(
                    child: Text('Maʼlumot yoʼq', style: TextStyle(color: AppColors.textGray, fontSize: 12)),
                  )
                : PieChart(
                    PieChartData(
                      sectionsSpace: 2,
                      centerSpaceRadius: 20,
                      sections: sections,
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickNav() {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        _navButton('Do\'konlar', Icons.store, AppColors.primaryGreen, () => context.go('/admin/shops')),
        _navButton('Mahsulotlar', Icons.inventory, AppColors.accentOrange, () => context.go('/admin/products')),
        _navButton('To‘plamlar', Icons.auto_awesome, Colors.teal, () => context.push('/seller/agro/starter-packs')),
        _navButton('Kunlik narx', Icons.price_change, Colors.deepOrange, () => context.push('/seller/agro/daily-prices')),
        _navButton('Buyurtmalar', Icons.receipt, Colors.blue, () => context.go('/admin/orders')),
        _navButton('Sozlamalar', Icons.settings, Colors.purple, () => context.go('/admin/settings')),
        _navButton('Matnlar', Icons.text_fields, Colors.teal, () => context.go('/admin/texts')),
        _navButton('Kategoriyalar', Icons.category, Colors.pink, () => context.go('/admin/categories')),
        _navButton('Kuryerlar', Icons.delivery_dining, Colors.brown, () => context.go('/admin/couriers')),
      ],
    );
  }

  Widget _navButton(String label, IconData icon, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 104,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(color: AppColors.shadow, blurRadius: 6, offset: const Offset(0, 2)),
          ],
        ),
        child: Column(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 11, color: AppColors.textBlack, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
