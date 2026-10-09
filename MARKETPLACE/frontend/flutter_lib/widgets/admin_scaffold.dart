import 'package:flutter/material.dart';
import '../config/app_colors.dart';
import 'package:go_router/go_router.dart';
import 'package:store_guliston/services/admin_auth.dart';


/// AdminScaffold – umumiy admin sahifalar uchun responsive Scaffold.
///
/// * `title` – AppBar sarlavhasi.
/// * `body` – sahifaning asosiy kontenti.
/// * `actions` – AppBar-ga qo‘shimcha tugmalar.
/// * `showDrawer` – kichik ekranlarda (width < 800) drawer‑ni ko‘rsatish.
class AdminScaffold extends StatelessWidget {
  const AdminScaffold({
    super.key,
    required this.title,
    required this.body,
    this.actions,
    this.floatingActionButton,
    this.showDrawer = true,
  });

  final String title;
  final Widget body;
  final List<Widget>? actions;
  final Widget? floatingActionButton;
  final bool showDrawer;

  EdgeInsets _adaptivePadding(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    // 4 % padding for wide screens, 8 % for mobiles
    final horiz = width > 1000 ? width * 0.04 : width * 0.08;
    return EdgeInsets.symmetric(horizontal: horiz, vertical: 16);
  }

  List<Widget> _drawerItems(BuildContext context) => [
        ListTile(
          leading: const Icon(Icons.dashboard, color: AppColors.primaryGreen),
          title: const Text('Dashboard'),
          onTap: () => context.go('/admin/dashboard'),
        ),
        ListTile(
          leading: const Icon(Icons.store, color: AppColors.primaryGreen),
          title: const Text('Do‘konlar'),
          onTap: () => context.go('/admin/shops'),
        ),
        ListTile(
          leading: const Icon(Icons.inventory, color: AppColors.accentOrange),
          title: const Text('Mahsulotlar'),
          onTap: () => context.go('/admin/products'),
        ),
        ListTile(
          leading: const Icon(Icons.receipt_long, color: Colors.blue),
          title: const Text('Buyurtmalar'),
          onTap: () => context.go('/admin/orders'),
        ),
        ListTile(
          leading: const Icon(Icons.settings, color: Colors.purple),
          title: const Text('Sozlamalar'),
          onTap: () => context.go('/admin/settings'),
        ),
        ListTile(
          leading: const Icon(Icons.text_fields, color: Colors.teal),
          title: const Text('Matnlar'),
          onTap: () => context.go('/admin/texts'),
        ),
        ListTile(
          leading: const Icon(Icons.category, color: Colors.pink),
          title: const Text('Kategoriyalar'),
          onTap: () => context.go('/admin/categories'),
        ),
        ListTile(
          leading: const Icon(Icons.delivery_dining, color: Colors.brown),
          title: const Text('Kuryerlar'),
          onTap: () => context.go('/admin/couriers'),
        ),
        const Divider(height: 1),
        ListTile(
          leading: const Icon(Icons.logout, color: AppColors.error),
          title: const Text('Chiqish'),
          onTap: () async {
            await AdminAuth().logout();
            // ignore: use_build_context_synchronously
            if (context.mounted) context.go('/admin/login');
          },
        ),
      ];

  List<NavigationRailDestination> _railDestinations() => const [
        NavigationRailDestination(
          icon: Icon(Icons.dashboard),
          selectedIcon: Icon(Icons.dashboard_rounded),
          label: Text('Dashboard'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.store),
          selectedIcon: Icon(Icons.storefront),
          label: Text('Do‘konlar'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.inventory),
          selectedIcon: Icon(Icons.inventory_2),
          label: Text('Mahsulotlar'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.receipt_long),
          selectedIcon: Icon(Icons.receipt_long),
          label: Text('Buyurtmalar'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.settings),
          selectedIcon: Icon(Icons.settings),
          label: Text('Sozlamalar'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.text_fields),
          selectedIcon: Icon(Icons.text_fields),
          label: Text('Matnlar'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.category),
          selectedIcon: Icon(Icons.category),
          label: Text('Kategoriyalar'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.delivery_dining),
          selectedIcon: Icon(Icons.delivery_dining),
          label: Text('Kuryerlar'),
        ),
      ];

  int _destinationIndexForLocation(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    if (location.startsWith('/admin/shops')) return 1;
    if (location.startsWith('/admin/products')) return 2;
    if (location.startsWith('/admin/orders')) return 3;
    if (location.startsWith('/admin/settings')) return 4;
    if (location.startsWith('/admin/texts')) return 5;
    if (location.startsWith('/admin/categories')) return 6;
    if (location.startsWith('/admin/couriers')) return 7;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 800;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textBlack,
        elevation: 0,
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        actions: actions,
      ),
      drawer: showDrawer && isMobile
          ? Drawer(
              backgroundColor: AppColors.surface,
              child: ListView(padding: EdgeInsets.zero, children: _drawerItems(context)),
            )
          : null,
      floatingActionButton: floatingActionButton,
      body: isMobile
          ? Padding(padding: _adaptivePadding(context), child: body)
          : Row(
              children: [
                Container(
                  width: 220,
                  margin: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 12, offset: const Offset(0, 4))],
                  ),
                  child: Column(
                    children: [
                      const SizedBox(height: 20),
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: const Icon(Icons.storefront, color: Colors.white),
                      ),
                      const SizedBox(height: 12),
                      const Text('Admin Panel', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.textBlack)),
                      const SizedBox(height: 16),
                      Expanded(
                        child: NavigationRail(
                          selectedIndex: _destinationIndexForLocation(context),
                          onDestinationSelected: (index) {
                            switch (index) {
                              case 0:
                                context.go('/admin/dashboard');
                                break;
                              case 1:
                                context.go('/admin/shops');
                                break;
                              case 2:
                                context.go('/admin/products');
                                break;
                              case 3:
                                context.go('/admin/orders');
                                break;
                              case 4:
                                context.go('/admin/settings');
                                break;
                              case 5:
                                context.go('/admin/texts');
                                break;
                              case 6:
                                context.go('/admin/categories');
                                break;
                              case 7:
                                context.go('/admin/couriers');
                                break;
                            }
                          },
                          labelType: NavigationRailLabelType.all,
                          backgroundColor: Colors.transparent,
                          destinations: _railDestinations(),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(child: Padding(padding: _adaptivePadding(context), child: body)),
              ],
            ),
    );
  }
}
