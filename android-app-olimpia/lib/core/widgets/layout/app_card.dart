import 'package:flutter/material.dart';

import '../../resources/app_colors.dart';
import '../../resources/app_dimens.dart';

/// White rounded card with 1px border (Figma "q", "card", "rate").
class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppDimens.cardPadding),
    this.radius = AppDimens.radiusCard,
    this.color = AppColors.surface,
    this.borderColor = AppColors.border,
  });

  /// Highlighted card for conditional questions (Figma: "Aparece porque marcou…").
  const AppCard.conditional({super.key, required this.child})
      : padding = const EdgeInsets.all(AppDimens.cardPadding),
        radius = AppDimens.radiusCard,
        color = AppColors.tealTint,
        borderColor = AppColors.tealBorder;

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final Color color;
  final Color borderColor;

  @override
  Widget build(BuildContext context) => DecoratedBox(
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(radius),
          border: Border.all(color: borderColor),
        ),
        child: Padding(padding: padding, child: child),
      );
}
