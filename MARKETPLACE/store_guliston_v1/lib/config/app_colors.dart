import 'package:flutter/material.dart';

/// Uzum Market style design system
/// Primary Green: #16a34a, Light Green: #dcfce7
/// Background: #f8fafc, Shadow: rgba(22,163,74,0.08)

class AppColors {
  // Primary colors — Uzum Market style
  static const Color primary = Color(0xFF16A34A);
  static const Color primaryLight = Color(0xFF22C55E);
  static const Color primaryDark = Color(0xFF15803D);
  static const Color primarySurface = Color(0xFFDCFCE7);

  static const Color primaryGreen = primary;
  static const Color primaryGreenLight = primaryLight;
  static const Color primaryGreenDark = primaryDark;

  // Text colors
  static const Color textBlack = Color(0xFF0F172A);
  static const Color textGray = Color(0xFF64748B);
  static const Color textLight = Color(0xFFBDBDBD);
  static const Color textWhite = Colors.white;

  // Background colors
  static const Color background = Color(0xFFF8FAFC);
  static const Color backgroundGray = Color(0xFFF1F5F9);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFF0FDF4);

  // Accent colors
  static const Color accent = Color(0xFFFF6F00);
  static const Color accentLight = Color(0xFFFF9E40);
  static const Color accentDark = Color(0xFFC43E00);
  static const Color accentOrange = accent;
  static const Color accentOrangeLight = accentLight;
  static const Color accentYellow = Color(0xFFFFA726);

  // Status colors
  static const Color success = Color(0xFF4CAF50);
  static const Color warning = Color(0xFFFF9800);
  static const Color error = Color(0xFFF44336);
  static const Color info = Color(0xFF2196F3);

  // UI element colors
  static const Color divider = Color(0xFFE5E7EB);
  static const Color shadow = Color(0x14FF0000); // ~8% opacity black

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
    colors: [primary, primaryLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient accentGradient = LinearGradient(
    colors: [accent, accentLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Uzum-style light green gradient for banners
  static const LinearGradient leafGradient = LinearGradient(
    colors: [primary, primaryDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

/// Border radius constants for Uzum-style rounded widgets
class AppRadius {
  static const double small = 8.0;
  static const double medium = 12.0;
  static const double large = 16.0;
  static const double xlarge = 24.0;
  static const double xxlarge = 32.0;
  static const double circular = 50.0;

  static BorderRadius get smallRadius => BorderRadius.circular(small);
  static BorderRadius get mediumRadius => BorderRadius.circular(medium);
  static BorderRadius get largeRadius => BorderRadius.circular(large);
  static BorderRadius get xlargeRadius => BorderRadius.circular(xlarge);
  static BorderRadius get xxlargeRadius => BorderRadius.circular(xxlarge);
  static BorderRadius get circularRadius => BorderRadius.circular(circular);
}