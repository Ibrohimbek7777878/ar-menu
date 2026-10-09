import 'package:flutter/material.dart';
import '../utils/responsive.dart';

/// Universal responsive list/grid — telefon, planshet, desktop uchun
/// 
/// - <600: ListView (telefon, 1 ustun)
/// - 600-900: Grid 2 ustun (kichik planshet)
/// - 900-1200: Grid 3 ustun (katta planshet)
/// - >1200: Grid 4 ustun (desktop)
class ResponsiveGridList extends StatelessWidget {
  final IndexedWidgetBuilder itemBuilder;
  final int itemCount;
  /// Agar true bo'lsa, telefon ham grid (mahsulotlar uchun)
  final bool forceGridOnMobile;
  const ResponsiveGridList({
    Key? key,
    required this.itemBuilder,
    required this.itemCount,
    this.forceGridOnMobile = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        // Telefon uchun grid majbur bo'lsa (masalan, mahsulotlar)
        if (forceGridOnMobile && width < 600) {
          return GridView.builder(
            padding: EdgeInsets.symmetric(
              horizontal: Responsive.horizontalPadding(context),
              vertical: 8,
            ),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: width < 360 ? 2 : 2,
              childAspectRatio: Responsive.productCardAspectRatio(context),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: itemCount,
            itemBuilder: itemBuilder,
          );
        }
        if (width >= 1200) {
          return GridView.builder(
            padding: EdgeInsets.symmetric(horizontal: Responsive.horizontalPadding(context), vertical: 8),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              childAspectRatio: 2.8,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
            ),
            itemCount: itemCount,
            itemBuilder: itemBuilder,
          );
        } else if (width >= 900) {
          return GridView.builder(
            padding: EdgeInsets.symmetric(horizontal: Responsive.horizontalPadding(context), vertical: 8),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              childAspectRatio: 2.9,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
            ),
            itemCount: itemCount,
            itemBuilder: itemBuilder,
          );
        } else if (width >= 600) {
          return GridView.builder(
            padding: EdgeInsets.symmetric(horizontal: Responsive.horizontalPadding(context), vertical: 8),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 3,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
            ),
            itemCount: itemCount,
            itemBuilder: itemBuilder,
          );
        } else {
          return ListView.builder(
            padding: EdgeInsets.symmetric(horizontal: Responsive.horizontalPadding(context), vertical: 8),
            itemCount: itemCount,
            itemBuilder: itemBuilder,
          );
        }
      },
    );
  }
}
