import 'package:flutter/material.dart';

import '../../../core/resources/app_colors.dart';
import '../../../core/resources/app_dimens.dart';
import '../../../core/resources/app_strings.dart';
import '../../../core/resources/app_text_styles.dart';
import '../../../core/widgets/layout/app_card.dart';

/// Teal card "Aguardando sincronização · 12 pesquisas · Ver fila".
class SyncQueueCard extends StatelessWidget {
  const SyncQueueCard({super.key, required this.count, required this.hint, required this.onViewQueue});

  final int count;
  final String hint;
  final VoidCallback onViewQueue;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: AppColors.teal, borderRadius: BorderRadius.circular(AppDimens.radiusHero)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(AppStrings.awaitingSync, style: AppTextStyles.body13.copyWith(color: AppColors.surface)),
            const SizedBox(height: 4),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Text.rich(TextSpan(children: [
                    TextSpan(text: '$count ', style: AppTextStyles.bigCounter),
                    TextSpan(
                      text: count == 1 ? AppStrings.surveyUnit : AppStrings.surveysUnit,
                      style: AppTextStyles.bigCounterUnit,
                    ),
                  ])),
                ),
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Material(
                    color: AppColors.whiteOverlay,
                    borderRadius: BorderRadius.circular(AppDimens.radiusSegment),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(AppDimens.radiusSegment),
                      onTap: onViewQueue,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        child: Text(AppStrings.viewQueue, style: AppTextStyles.smallButton),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(hint, style: AppTextStyles.caption.copyWith(color: AppColors.surface)),
          ],
        ),
      );
}

/// Half-width metric card ("Hoje 14 coletadas").
class StatCard extends StatelessWidget {
  const StatCard({
    super.key,
    required this.label,
    required this.value,
    required this.caption,
    this.valueColor = AppColors.navy,
  });

  final String label;
  final String value;
  final String caption;
  final Color valueColor;

  @override
  Widget build(BuildContext context) => AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: AppTextStyles.caption),
            Text(value, style: AppTextStyles.statValue.copyWith(color: valueColor)),
            Text(caption, style: AppTextStyles.caption),
          ],
        ),
      );
}
