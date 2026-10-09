import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/admin_settings_provider.dart';
import '../../services/admin_auth.dart';
import '../../config/app_colors.dart';
import '../../widgets/admin_scaffold.dart';

class AppTextsScreen extends StatefulWidget {
  const AppTextsScreen({super.key});

  @override
  State<AppTextsScreen> createState() => _AppTextsScreenState();
}

class _AppTextsScreenState extends State<AppTextsScreen> {
  final Map<String, TextEditingController> _controllers = {};
  bool _isInitialized = false;

  final List<Map<String, String>> _textKeys = [
    {'key': 'app_name', 'label': 'Ilova nomi', 'default': 'Online Store Guliston'},
    {'key': 'home_title', 'label': 'Bosh sahifa sarlavhasi', 'default': 'Do\'konlar'},
    {'key': 'categories_title', 'label': 'Kategoriyalar sarlavhasi', 'default': 'Kategoriyalar'},
    {'key': 'order_button', 'label': 'Buyurtma tugmasi matni', 'default': 'Buyurtma berish'},
    {'key': 'success_message', 'label': 'Muvaffaqiyat xabari', 'default': 'Buyurtmangiz qabul qilindi!'},
    {'key': 'cart_title', 'label': 'Savat sarlavhasi', 'default': 'Savat'},
    {'key': 'checkout_title', 'label': 'Buyurtma berish sarlavhasi', 'default': 'Buyurtma berish'},
    {'key': 'profile_title', 'label': 'Profil sarlavhasi', 'default': 'Profil'},
  ];

  @override
  void initState() {
    super.initState();
    for (var textItem in _textKeys) {
      final controller = TextEditingController();
      _controllers[textItem['key']!] = controller;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await AdminAuth().redirectToLoginIfNeeded(context);
    });
  }

  @override
  void dispose() {
    for (var controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _updateText(String key) async {
    final provider = context.read<AdminSettingsProvider>();
    final controller = _controllers[key];
    if (controller != null) {
      await provider.updateText(key, controller.text);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${_getLabel(key)} yangilandi')),
        );
      }
    }
  }

  Future<void> _resetText(String key) async {
    final provider = context.read<AdminSettingsProvider>();
    final defaultValue = _textKeys.firstWhere((item) => item['key'] == key)['default']!;
    final controller = _controllers[key];
    if (controller != null) {
      controller.text = defaultValue;
      await provider.updateText(key, defaultValue);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${_getLabel(key)} tiklandi')),
        );
      }
    }
  }

  String _getLabel(String key) {
    return _textKeys.firstWhere((item) => item['key'] == key)['label']!;
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AdminSettingsProvider>(
      builder: (context, provider, child) {
        if (!_isInitialized && provider.texts.isNotEmpty) {
          for (var textItem in _textKeys) {
            final key = textItem['key']!;
            final controller = _controllers[key];
            if (controller != null) {
              controller.text = provider.getText(key);
            }
          }
          _isInitialized = true;
        }

        return AdminScaffold(
          title: 'Matnlar',
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(),
                const SizedBox(height: 16),
                _buildQuickSummary(),
                const SizedBox(height: 16),
                ..._textKeys.map((textItem) {
                  final key = textItem['key']!;
                  final controller = _controllers[key]!;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 10, offset: const Offset(0, 4))],
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 42,
                                height: 42,
                                decoration: BoxDecoration(
                                  color: AppColors.primarySurface,
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: const Icon(Icons.text_fields, color: AppColors.primaryGreen),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      textItem['label']!,
                                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.textBlack),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      textItem['key']!,
                                      style: const TextStyle(fontSize: 11, color: AppColors.textGray),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.backgroundGray,
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  key.contains('message') ? 'Ko‘p satr' : 'Bir satr',
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textGray),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Container(
                            decoration: BoxDecoration(
                              color: AppColors.backgroundGray,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: TextField(
                              controller: controller,
                              decoration: InputDecoration(
                                hintText: textItem['default'],
                                border: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                              ),
                              maxLines: key.contains('message') ? 3 : 1,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: () => _updateText(key),
                                  icon: const Icon(Icons.save, size: 18),
                                  label: const Text('Saqlash'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primaryGreen,
                                    foregroundColor: Colors.white,
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () => _resetText(key),
                                  icon: const Icon(Icons.restart_alt, size: 18),
                                  label: const Text('Tiklash'),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.accentOrange,
                                    side: const BorderSide(color: AppColors.accentOrange),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 24),
              ],
            ),
          ),
        );
      },
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
            child: const Icon(Icons.text_fields, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 14),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('CMS / Matnlar', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                SizedBox(height: 4),
                Text('Ilova ichidagi matnlarni tez o‘zgartiring', style: TextStyle(color: Colors.white70, fontSize: 13)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Text('CMS', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickSummary() {
    return Row(
      children: [
        Expanded(child: _summaryCard('Matnlar', _textKeys.length.toString(), AppColors.primaryGreen)),
        const SizedBox(width: 8),
        Expanded(child: _summaryCard('O‘zgardi', _controllers.values.where((c) => c.text.isNotEmpty).length.toString(), AppColors.accentOrange)),
      ],
    );
  }

  Widget _summaryCard(String label, String value, Color color) {
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
          Text(label, style: const TextStyle(color: AppColors.textGray, fontSize: 11)),
        ],
      ),
    );
  }
}
