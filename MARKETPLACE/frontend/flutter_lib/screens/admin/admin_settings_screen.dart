import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart';
import '../../config/app_colors.dart';
import '../../services/admin_auth.dart';
import '../../providers/admin_settings_provider.dart';
import '../../widgets/admin_scaffold.dart';

class AdminSettingsScreen extends StatefulWidget {
  const AdminSettingsScreen({super.key});

  @override
  State<AdminSettingsScreen> createState() => _AdminSettingsScreenState();
}

class _AdminSettingsScreenState extends State<AdminSettingsScreen> {
  final _appNameController = TextEditingController();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _weatherApiController = TextEditingController();
  final _yandexMapsController = TextEditingController();

  Color _selectedColor = AppColors.primaryGreen;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await AdminAuth().redirectToLoginIfNeeded(context);
    });
  }

  @override
  void dispose() {
    _appNameController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _weatherApiController.dispose();
    _yandexMapsController.dispose();
    super.dispose();
  }

  Future<void> _updateAppName() async {
    final provider = context.read<AdminSettingsProvider>();
    await provider.updateSetting('app_name', _appNameController.text);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ilova nomi yangilandi')),
      );
    }
  }

  Future<void> _updateColor() async {
    final provider = context.read<AdminSettingsProvider>();
    final colorHex = '#${_selectedColor.value.toRadixString(16).substring(2)}';
    await provider.updateSetting('primary_color', colorHex);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Rang yangilandi')),
      );
    }
  }

  Future<void> _updateApiKeys() async {
    final provider = context.read<AdminSettingsProvider>();
    await provider.updateSetting('weather_api_key', _weatherApiController.text);
    await provider.updateSetting('yandex_maps_key', _yandexMapsController.text);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('API kalitlari yangilandi')),
      );
    }
  }

  Future<void> _changePassword() async {
    if (_currentPasswordController.text.isEmpty || _newPasswordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Barcha maydonlarni to\'ldiring')),
      );
      return;
    }

    final auth = AdminAuth();
    final success = await auth.updatePassword(
      _currentPasswordController.text,
      _newPasswordController.text,
    );

    if (!success) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Joriy parol noto\'g\'ri yoki sessiya muddati o\'tgan')),
        );
      }
      return;
    }

    _currentPasswordController.clear();
    _newPasswordController.clear();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Parol muvaffaqiyatli yangilandi')),
      );
    }
  }

  Future<void> _cleanupData() async {
    final provider = context.read<AdminSettingsProvider>();
    await provider.cleanupOldData();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Eski ma\'lumotlar tozalandi')),
      );
    }
  }

  Future<void> _backupData() async {
    final provider = context.read<AdminSettingsProvider>();
    await provider.exportBackup();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Backup saqlandi')),
      );
    }
  }

  Future<void> _restoreData() async {
    final provider = context.read<AdminSettingsProvider>();
    final success = await provider.restoreBackup();
    if (!success) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Backup topilmadi')),
        );
      }
      return;
    }

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Backup tiklandi')),
      );
      setState(() {});
    }
  }

  Future<void> _logout() async {
    await AdminAuth().logout();
    if (mounted) {
      GoRouter.of(context).go('/admin/login');
    }
  }

  void _showColorPicker() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Rang tanlang'),
        content: SingleChildScrollView(
          child: ColorPicker(
            pickerColor: _selectedColor,
            onColorChanged: (color) => setState(() => _selectedColor = color),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Bekor qilish'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              _updateColor();
            },
            child: const Text('Saqlash'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AdminSettingsProvider>(
      builder: (context, provider, child) {
        if (!_isInitialized && provider.settings.isNotEmpty) {
          _appNameController.text = provider.getSetting('app_name');
          _weatherApiController.text = provider.getSetting('weather_api_key');
          _yandexMapsController.text = provider.getSetting('yandex_maps_key');
          final colorHex = provider.getSetting('primary_color');
          if (colorHex.isNotEmpty) {
            _selectedColor = Color(int.parse(colorHex.replaceFirst('#', '0xFF')));
          }
          _isInitialized = true;
        }

        return AdminScaffold(
          title: 'Sozlamalar',
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(),
                const SizedBox(height: 16),
                _buildQuickActions(),
                const SizedBox(height: 16),
                _buildSectionTitle('Ilova sozlamalari'),
                _buildSettingsCard([
                  _buildTextField('Ilova nomi', _appNameController, Icons.storefront),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _updateAppName,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryGreen,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text('Saqlash', style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ),
                ]),
                const SizedBox(height: 16),

                _buildSectionTitle('Asosiy rang'),
                _buildSettingsCard([
                  Row(
                    children: [
                      Container(
                        width: 48, height: 48,
                        decoration: BoxDecoration(
                          color: _selectedColor,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            BoxShadow(color: _selectedColor.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 4)),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Text(
                          '#${_selectedColor.value.toRadixString(16).substring(2).toUpperCase()}',
                          style: const TextStyle(fontFamily: 'monospace', fontSize: 14, color: AppColors.textGray),
                        ),
                      ),
                      ElevatedButton(
                        onPressed: _showColorPicker,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryGreen,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: const Text('Tanlash', style: TextStyle(fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ),
                ]),
                const SizedBox(height: 16),

                _buildSectionTitle('API Kalitlari'),
                _buildSettingsCard([
                  _buildTextField('Ob-havo API kaliti', _weatherApiController, Icons.cloud, obscure: true),
                  const SizedBox(height: 12),
                  _buildTextField('Yandex Maps API kaliti', _yandexMapsController, Icons.map, obscure: true),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _updateApiKeys,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryGreen,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text('Saqlash', style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ),
                ]),
                const SizedBox(height: 16),

                _buildSectionTitle('Parolni o\'zgartirish'),
                _buildSettingsCard([
                  _buildTextField('Joriy parol', _currentPasswordController, Icons.lock_outlined, obscure: true),
                  const SizedBox(height: 12),
                  _buildTextField('Yangi parol', _newPasswordController, Icons.lock, obscure: true),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _changePassword,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accentOrange,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text('O\'zgartirish', style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ),
                ]),
                const SizedBox(height: 16),

                _buildSectionTitle('Ma\'lumotlar boshqaruvi'),
                _buildSettingsCard([
                  _actionButton(Icons.cleaning_services, '10 kundan eski buyurtmalarni tozalash', Colors.orange, _cleanupData),
                  const SizedBox(height: 10),
                  _actionButton(Icons.backup, 'Ma\'lumotlarni backup qilish', Colors.blue, _backupData),
                  const SizedBox(height: 10),
                  _actionButton(Icons.restore, 'Ma\'lumotlarni tiklash', Colors.teal, _restoreData),
                ]),
                const SizedBox(height: 24),

                _buildSectionTitle('Hisob'),
                _buildSettingsCard([
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _logout,
                      icon: const Icon(Icons.logout),
                      label: const Text('Chiqish', style: TextStyle(fontWeight: FontWeight.w600)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.error,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                ]),
                const SizedBox(height: 40),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w700,
          color: AppColors.textBlack,
        ),
      ),
    );
  }

  Widget _buildHeader() {
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
            child: const Icon(Icons.settings, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Tizim sozlamalari',
                  style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  'Nom, rang, API va xavfsizlikni boshqaring',
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
            child: const Text(
              'CMS',
              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        _quickActionChip('Nom', Icons.storefront, AppColors.primaryGreen, _updateAppName),
        _quickActionChip('Rang', Icons.palette, AppColors.accentOrange, _showColorPicker),
        _quickActionChip('API', Icons.key, Colors.blue, _updateApiKeys),
        _quickActionChip('Parol', Icons.lock, Colors.purple, _changePassword),
        _quickActionChip('Tozalash', Icons.cleaning_services, Colors.teal, _cleanupData),
      ],
    );
  }

  Widget _quickActionChip(String label, IconData icon, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 6, offset: const Offset(0, 2))],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, size: 18, color: color),
            ),
            const SizedBox(width: 10),
            Text(label, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.textBlack)),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingsCard(List<Widget> children) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, IconData icon, {bool obscure = false}) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.backgroundGray,
        borderRadius: BorderRadius.circular(12),
      ),
      child: TextField(
        controller: controller,
        obscureText: obscure,
        decoration: InputDecoration(
          hintText: label,
          prefixIcon: Icon(icon, color: AppColors.textGray, size: 20),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      ),
    );
  }

  Widget _actionButton(IconData icon, String label, Color color, VoidCallback onPressed) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, size: 18),
        label: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
    );
  }
}
