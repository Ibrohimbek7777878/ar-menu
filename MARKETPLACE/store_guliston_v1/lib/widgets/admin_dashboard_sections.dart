import 'package:flutter/material.dart';
import '../config/app_colors.dart';

/// Admin Dashboard - Tovarlar bo'limi
class DashboardProductSection extends StatelessWidget {
  final Widget productChart;
  final String title;

  const DashboardProductSection({
    required this.productChart,
    this.title = 'Eng ko\'p sotilgan',
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.textBlack,
          ),
        ),
        const SizedBox(height: 12),
        productChart,
      ],
    );
  }
}

/// Admin Dashboard - Buyurtma bo'limi
class DashboardOrderSection extends StatelessWidget {
  final Widget orderChart;
  final String title;

  const DashboardOrderSection({
    required this.orderChart,
    this.title = 'Buyurtma holatlari',
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.textBlack,
          ),
        ),
        const SizedBox(height: 12),
        orderChart,
      ],
    );
  }
}
