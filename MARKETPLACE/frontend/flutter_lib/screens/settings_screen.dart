import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../config/app_colors.dart';
import '../providers/language_provider.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Sozlamalar'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildSettingTile(
            context,
            Icons.notifications,
            'Bildirishnomalar',
            'Ob-havo yangiliklari va buyurtma statuslari uchun.',
            onTap: () => _showNotificationsDialog(context),
          ),
          const SizedBox(height: 12),
          _buildSettingTile(
            context,
            Icons.location_on,
            'Manzil sozlamalari',
            'Yetkazib berish manzilingizni yoki mahalliy do\'konlarni sozlang.',
            onTap: () => context.push('/location'),
          ),
          const SizedBox(height: 12),
          _buildSettingTile(
            context,
            Icons.language,
            'Til',
            'O\'zbek tilini tanlang.',
            onTap: () => _showLanguagePicker(context),
          ),
          const SizedBox(height: 24),
          const Text(
            'Sozlamalarni o\'zgartirish uchun tugmalarni bosing yoki buyurtma qilish oldidan yangilang.',
            style: TextStyle(color: AppColors.textGray, fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingTile(
    BuildContext context,
    IconData icon,
    String title,
    String subtitle, {
    VoidCallback? onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: AppColors.shadow,
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primarySurface,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: AppColors.primaryGreen, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textBlack)),
                    const SizedBox(height: 4),
                    Text(subtitle, style: const TextStyle(color: AppColors.textGray, fontSize: 14)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.textGray),
            ],
          ),
        ),
      ),
    );
  }

  void _showLanguagePicker(BuildContext context) {
    final languageProvider = Provider.of<LanguageProvider>(context, listen: false);
    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 16),
              const Text('Tilni tanlang', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              ...languageProvider.supportedDisplayLanguages.map((code) {
                return ListTile(
                  title: Text(languageProvider.getLanguageName(code)),
                  trailing: languageProvider.displayLanguageCode == code
                      ? const Icon(Icons.check, color: AppColors.primaryGreen)
                      : null,
                  onTap: () {
                    languageProvider.setLocale(code);
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('${languageProvider.getLanguageName(code)} tanlandi')),
                    );
                  },
                );
              }),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  void _showNotificationsDialog(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Bildirishnomalar'),
        content: const Text('Bu bo\'lim keyingi bosqichda yoqib/o\'chirib boshqariladi.'),
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