import 'package:flutter/material.dart';
import '../config/app_colors.dart';

class PaymentMethodsScreen extends StatelessWidget {
  const PaymentMethodsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("To'lov usullari"),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Mavjud to\'lov usullari',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            _buildPaymentOption(Icons.credit_card, 'Bank kartasi'),
            const SizedBox(height: 12),
            _buildPaymentOption(Icons.wallet, 'Naqd pul (kuryerga)'),
            const SizedBox(height: 12),
            _buildPaymentOption(Icons.phone_android, 'Payme / Click'),
            const SizedBox(height: 24),
            const Text(
              'To\'lov sozlamalari',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Iltimos, yetkazib berish vaqtida eng qulay usulni tanlang. Siz kartadan yoki naqd puldan foydalanishingiz mumkin.',
              style: TextStyle(color: AppColors.textGray),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentOption(IconData icon, String title) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Icon(icon, color: AppColors.primaryGreen),
          const SizedBox(width: 14),
          Text(
            title,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}
