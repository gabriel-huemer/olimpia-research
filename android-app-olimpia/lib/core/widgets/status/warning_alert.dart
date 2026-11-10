import 'package:flutter/material.dart';

import '../../resources/app_colors.dart';
import '../../resources/app_dimens.dart';
import '../../resources/app_strings.dart';
import '../../resources/app_text_styles.dart';
import '../buttons/app_buttons.dart';

/// Yellow alert for suspicious/inconsistent answers (RF13) and the review summary.
/// It never blocks: the researcher can correct or keep the answer flagged.
class WarningAlert extends StatelessWidget {
  const WarningAlert({
    super.key,
    required this.title,
    required this.message,
    this.onCorrect,
    this.onKeep,
    this.kept = false,
  });

  final String title;
  final String message;
  final VoidCallback? onCorrect;
  final VoidCallback? onKeep;

  /// Already confirmed with "Manter e sinalizar".
  final bool kept;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: AppColors.warningSoft,
          borderRadius: BorderRadius.circular(AppDimens.radiusRateCard),
          border: Border.all(color: AppColors.warning),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: AppDimens.alertIcon,
              height: AppDimens.alertIcon,
              alignment: Alignment.center,
              decoration: const BoxDecoration(color: AppColors.warning, shape: BoxShape.circle),
              child: Text('!', style: AppTextStyles.alertIcon),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: AppTextStyles.alertTitle),
                  const SizedBox(height: 2),
                  Text(message, style: AppTextStyles.alertBody),
                  if (kept) ...[
                    const SizedBox(height: 8),
                    Text('✓ ${AppStrings.flagged}',
                        style: AppTextStyles.alertAction.copyWith(color: AppColors.warningText)),
                  ] else if (onCorrect != null || onKeep != null) ...[
                    const SizedBox(height: 9),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        if (onCorrect != null) AlertActionButton(label: AppStrings.correct, onPressed: onCorrect),
                        if (onKeep != null)
                          AlertActionButton(label: AppStrings.keepAndFlag, onPressed: onKeep, filled: false),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      );
}
