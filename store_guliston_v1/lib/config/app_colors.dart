import 'package:flutter/material.dart';

/// App color definitions based on the design system
/// Primary Green: #327F60, Text Black: #39424C, Background: #FFFFFF, Accent Orange: #F7676D

class AppColors {
  // Primary colors
  static const Color primaryGreen = Color(0xFF327F60);
  static const Color primaryGreenLight = Color(0xFF53C488);
  static const Color primaryGreenDark = Color(0xFF28664D);

  // Text colors
  static const Color textBlack = Color(0xFF39424C);
  static const Color textGray = Color(0xFF6B7280);
  static const Color textLight = Color(0xFF9CA3AF);
  static const Color textWhite = Colors.white;

  // Background colors
  static const Color background = Color(0xFFFFFFFF);
  static const Color backgroundGray = Color(0xFFF5F5F5);
  static const Color surface = Color(0xFFFFFFFF);

  // Accent colors
  static const Color accentOrange = Color(0xFFF7676D);
  static const Color accentOrangeLight = Color(0xFFFF9B9E);
  static const Color accentYellow = Color(0xFFF3B54A);

  // Status colors
  static const Color success = Color(0xFF4CAF50);
  static const Color warning = Color(0xFFFF9800);
  static const Color error = Color(0xFFF44336);
  static const Color info = Color(0xFF2196F3);

  // UI element colors
  static const Color divider = Color(0xFFE5E7EB);
  static const Color shadow = Color(0x1A000000); // 10% black for soft shadows

  // Order status colors
  static const Color statusPending = Color(0xFFFF9800);
  static const Color statusConfirmed = Color(0xFF2196F3);
  static const Color statusPreparing = Color(0xFF9C27B0);
  static const Color statusReady = Color(0xFF00BCD4);
  static const Color statusOutForDelivery = Color(0xFF3F51B5);
  static const Color statusDelivered = Color(0xFF4CAF50);
  static const Color statusCancelled = Color(0xFFF44336);

  // Gradient definitions
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primaryGreen, primaryGreenLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient warmGradient = LinearGradient(
    colors: [accentOrange, accentYellow],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

/// Extension for soft shadow box decoration
extension AppShadows on BoxDecoration {
  static BoxDecoration softShadow({
    Color color = AppColors.shadow,
    double blurRadius = 10,
    Offset offset = const Offset(0, 4),
  }) {
    return BoxDecoration(
      boxShadow: [
        BoxShadow(
          color: color,
          blurRadius: blurRadius,
          offset: offset,
        ),
      ],
    );
  }

  static BoxDecoration cardShadow() {
    return softShadow(
      blurRadius: 16,
      offset: const Offset(0, 4),
    );
  }
}

/// Border radius constants for rounded widgets
class AppRadius {
  static const double small = 8.0;
  static const double medium = 12.0;
  static const double large = 16.0;
  static const double xlarge = 24.0;
  static const double circular = 50.0;

  static BorderRadius get smallRadius => BorderRadius.circular(small);
  static BorderRadius get mediumRadius => BorderRadius.circular(medium);
  static BorderRadius get largeRadius => BorderRadius.circular(large);
  static BorderRadius get xlargeRadius => BorderRadius.circular(xlarge);
  static BorderRadius get circularRadius => BorderRadius.circular(circular);
}