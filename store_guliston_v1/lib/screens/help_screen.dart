import 'package:flutter/material.dart';
import '../config/app_colors.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Yordam'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Tez yordam',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            _buildHelpTile('Buyurtma holati', 'Buyurtmangizni qayerda ekanligini ko\'ring.'),
            const SizedBox(height: 12),
            _buildHelpTile('To\'lov savollari', 'Tolov usullari va karta ma\'lumotlari haqida ko\'proq bilib oling.'),
            const SizedBox(height: 12),
            _buildHelpTile('Contact Center', 'Biz bilan bog\'lanish: +998 90 123 45 67'),
            const SizedBox(height: 24),
            const Text(
              'Agar muammo bo\'lsa, bizning qo\'llab-quvvatlash markaziga qo\'ng\'iroq qiling yoki profilning yordam bo\'limiga o\'ting.',
              style: TextStyle(color: AppColors.textGray, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHelpTile(String title, String subtitle) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                Text(subtitle, style: const TextStyle(color: AppColors.textGray, fontSize: 14)),
              ],
            ),
          ),
          const Icon(Icons.help_outline, color: AppColors.primaryGreen),
        ],
      ),
    );
  }
}
