import 'package:flutter/material.dart';

import '../../resources/app_colors.dart';
import '../../resources/app_dimens.dart';

/// Colored stripe of the city identity (Figma "Faixa institucional").
class InstitutionalStripe extends StatelessWidget {
  const InstitutionalStripe({super.key, this.height = AppDimens.stripeHeight});

  final double height;

  @override
  Widget build(BuildContext context) => SizedBox(
        height: height,
        child: Row(
          children: [
            for (final c in AppColors.institutionalStripe) Expanded(child: ColoredBox(color: c)),
          ],
        ),
      );
}
