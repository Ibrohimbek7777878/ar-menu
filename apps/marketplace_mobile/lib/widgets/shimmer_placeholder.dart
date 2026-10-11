import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../config/app_colors.dart';

/// A reusable shimmer placeholder used across admin screens while data is loading.
class ShimmerPlaceholder extends StatelessWidget {
  const ShimmerPlaceholder({
    super.key,
    this.itemCount = 1,
    this.width = double.infinity,
    this.height = 80.0,
    this.borderRadius = 12.0,
  });

  /// Number of shimmer items to display.
  final int itemCount;
  /// Width of each placeholder.
  final double width;
  /// Height of each placeholder.
  final double height;
  /// Border radius for placeholder containers.
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      itemCount: itemCount,
      itemBuilder: (context, index) {
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8.0),
          child: Shimmer.fromColors(
            baseColor: AppColors.backgroundGray.withValues(alpha: 0.3),
            highlightColor: AppColors.backgroundGray.withValues(alpha: 0.1),
            child: Container(
              width: width,
              height: height,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(borderRadius),
              ),
            ),
          ),
        );
      },
    );
  }
}
