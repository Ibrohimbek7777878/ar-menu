import 'package:flutter/material.dart';

/// Universal responsive helper — telefon, planshet, desktop, foldable uchun
/// 
/// Breakpoints (Material 3 mos):
/// - smallMobile: <360 (kichik telefonlar, masalan, Galaxy S Mini)
/// - mobile: 360-600 (oddiy telefonlar)
/// - tablet: 600-900 (7-9" planshetlar, katta telefonlar landscape)
/// - desktop: 900-1200 (10" planshetlar, kichik desktop)
/// - largeDesktop: >1200 (katta planshetlar, desktop)
///
/// Foydalanish:
/// ```dart
/// if (Responsive.isTablet(context)) ...
/// Responsive.gridCrossAxisCount(context) // 2,3,4
/// ```
class Responsive {
  static const double smallMobileBreakpoint = 360;
  static const double mobileBreakpoint = 600;
  static const double tabletBreakpoint = 900;
  static const double desktopBreakpoint = 1200;

  static bool isSmallMobile(BuildContext context) =>
      MediaQuery.of(context).size.width < smallMobileBreakpoint;

  static bool isMobile(BuildContext context) =>
      MediaQuery.of(context).size.width < mobileBreakpoint;

  static bool isTablet(BuildContext context) =>
      MediaQuery.of(context).size.width >= mobileBreakpoint &&
      MediaQuery.of(context).size.width < tabletBreakpoint;

  static bool isDesktop(BuildContext context) =>
      MediaQuery.of(context).size.width >= tabletBreakpoint &&
      MediaQuery.of(context).size.width < desktopBreakpoint;

  static bool isLargeDesktop(BuildContext context) =>
      MediaQuery.of(context).size.width >= desktopBreakpoint;

  static bool isPhone(BuildContext context) => isMobile(context) || isSmallMobile(context);

  /// Grid uchun ustunlar soni — mahsulot/do'kon kartalari uchun
  static int gridCrossAxisCount(BuildContext context, {int mobile = 2, int tablet = 3, int desktop = 4}) {
    final width = MediaQuery.of(context).size.width;
    if (width >= desktopBreakpoint) return desktop + 1; // 5 for large
    if (width >= tabletBreakpoint) return desktop; // 4
    if (width >= mobileBreakpoint) return tablet; // 3
    if (width >= 400) return mobile; // 2 for normal phone
    return 2; // small mobile also 2 (not 1, to avoid huge cards)
  }

  /// Shop list uchun — list vs grid
  static int shopGridCount(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    if (width >= desktopBreakpoint) return 3;
    if (width >= tabletBreakpoint) return 2;
    return 1; // phone: list
  }

  /// Horizontal padding — ekranga mos
  static double horizontalPadding(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    if (width >= desktopBreakpoint) return 32;
    if (width >= tabletBreakpoint) return 24;
    return 16;
  }

  /// Card aspect ratio — ekranga mos
  static double productCardAspectRatio(BuildContext context) {
    if (isSmallMobile(context)) return 0.68;
    if (isMobile(context)) return 0.72;
    if (isTablet(context)) return 0.75;
    return 0.78;
  }

  /// Font scale ni cheklash — juda katta fontlarda layout buzilmasligi uchun
  static double clampTextScale(BuildContext context) {
    final scale = MediaQuery.textScalerOf(context).scale(1.0);
    return scale.clamp(0.85, 1.3);
  }

  /// Safe area bilan birga padding
  static EdgeInsets safePadding(BuildContext context, {double vertical = 16}) {
    return EdgeInsets.symmetric(
      horizontal: horizontalPadding(context),
      vertical: vertical,
    ).copyWith(
      top: MediaQuery.of(context).padding.top > 0 ? 8 : vertical,
    );
  }
}

/// ResponsiveBuilder — widget darajasida ishlatish uchun
class ResponsiveBuilder extends StatelessWidget {
  final Widget Function(BuildContext context, bool isMobile, bool isTablet, bool isDesktop) builder;
  const ResponsiveBuilder({super.key, required this.builder});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final isMobile = width < Responsive.mobileBreakpoint;
        final isTablet = width >= Responsive.mobileBreakpoint && width < Responsive.tabletBreakpoint;
        final isDesktop = width >= Responsive.tabletBreakpoint;
        return builder(context, isMobile, isTablet, isDesktop);
      },
    );
  }
}

/// ResponsiveGrid — universal grid, avtomatik ustunlar
class ResponsiveGrid extends StatelessWidget {
  final List<Widget> children;
  final double crossAxisSpacing;
  final double mainAxisSpacing;
  final double childAspectRatio;
  final EdgeInsets? padding;

  const ResponsiveGrid({
    super.key,
    required this.children,
    this.crossAxisSpacing = 12,
    this.mainAxisSpacing = 12,
    this.childAspectRatio = 0.72,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final count = Responsive.gridCrossAxisCount(context);
        final pad = padding ?? EdgeInsets.symmetric(horizontal: Responsive.horizontalPadding(context));
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: pad,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: count,
            crossAxisSpacing: crossAxisSpacing,
            mainAxisSpacing: mainAxisSpacing,
            childAspectRatio: childAspectRatio,
          ),
          itemCount: children.length,
          itemBuilder: (context, index) => children[index],
        );
      },
    );
  }
}
