import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_colors.dart';
import '../services/api_service.dart';

class CustomerProfileScreen extends StatefulWidget {
  const CustomerProfileScreen({super.key});

  @override
  State<CustomerProfileScreen> createState() => _CustomerProfileScreenState();
}

class _CustomerProfileScreenState extends State<CustomerProfileScreen> {
  final ApiService _api = ApiService();
  String _name = 'Mehmon';
  String _phone = '';
  bool _loggedIn = false;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (!mounted) return;
      setState(() {
        _name = prefs.getString('customer_name')?.isNotEmpty == true
            ? prefs.getString('customer_name')!
            : 'Mehmon';
        _phone = prefs.getString('customer_phone') ?? '';
        _loggedIn = prefs.getString('jwt_access_token')?.isNotEmpty == true;
      });
    } catch (_) {}
  }

  Future<void> _logout() async {
    await _api.logout();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Chiqdingiz')));
    _loadProfile();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Profil'),
      ),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
              child: Row(
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: AppColors.primarySurface,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.person, size: 32, color: AppColors.primaryGreen),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _name,
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.textBlack),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _loggedIn && _phone.isNotEmpty ? _phone : 'Kirish orqali profilingizni ulang',
                          style: const TextStyle(fontSize: 14, color: AppColors.textGray),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (!_loggedIn)
            SliverToBoxAdapter(child: _profileItem(context, Icons.login, 'Kirish / Ro\'yxatdan o\'tish', () async {
              await GoRouter.of(context).push('/auth');
              _loadProfile();
            })),
          SliverToBoxAdapter(child: _profileItem(context, Icons.receipt_long, 'Buyurtmalarim', () => GoRouter.of(context).push('/orders'))),
          SliverToBoxAdapter(child: _profileItem(context, Icons.location_on, 'Manzillar', () => GoRouter.of(context).push('/location'))),
          SliverToBoxAdapter(child: _profileItem(context, Icons.cloud, 'Ob-havo', () => GoRouter.of(context).push('/weather'))),
          SliverToBoxAdapter(child: _profileItem(context, Icons.credit_card, 'To\'lov usullari', () => GoRouter.of(context).push('/payment'))),
          SliverToBoxAdapter(child: _profileItem(context, Icons.storefront, 'Do\'kon yaratish (Sotuvchi)', () => GoRouter.of(context).push('/shop-builder'))),
          SliverToBoxAdapter(child: _profileItem(context, Icons.settings, 'Sozlamalar', () => GoRouter.of(context).push('/settings'))),
          SliverToBoxAdapter(child: _profileItem(context, Icons.help_outline, 'Yordam', () => GoRouter.of(context).push('/help'))),
          if (_loggedIn)
            SliverToBoxAdapter(child: _profileItem(context, Icons.logout, 'Chiqish', _logout, isSpecial: true)),
          const SliverToBoxAdapter(child: SizedBox(height: 20)),
          SliverToBoxAdapter(child: _profileItem(context, Icons.admin_panel_settings, 'Admin', () => GoRouter.of(context).push('/admin/login'), isSpecial: true)),
        ],
      ),
    );
  }

  Widget _profileItem(BuildContext context, IconData icon, String label, VoidCallback onTap, {bool isSpecial = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppColors.shadow,
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: ListTile(
          leading: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isSpecial ? Colors.orange.withValues(alpha: 0.1) : AppColors.primarySurface,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: isSpecial ? Colors.orange : AppColors.primaryGreen, size: 22),
          ),
          title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          trailing: const Icon(Icons.chevron_right, color: AppColors.textGray),
          onTap: onTap,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
    );
  }
}
