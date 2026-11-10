import 'package:flutter/material.dart';

import '../../resources/app_colors.dart';
import '../../resources/app_dimens.dart';
import '../../resources/app_strings.dart';
import '../../resources/app_text_styles.dart';

/// "● Offline" / "● Online" pill of the app bars.
class ConnectivityPill extends StatelessWidget {
  const ConnectivityPill({super.key, required this.online});

  final bool online;

  @override
  Widget build(BuildContext context) {
    final fg = online ? AppColors.successDark : AppColors.dangerDark;
    return Container(
      height: AppDimens.pillHeight,
      padding: const EdgeInsets.only(left: 10, right: 11),
      decoration: BoxDecoration(
        color: online ? AppColors.successSoft : AppColors.dangerSoft,
        borderRadius: BorderRadius.circular(AppDimens.pillHeight / 2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(color: fg, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(online ? AppStrings.online : AppStrings.offline, style: AppTextStyles.pill.copyWith(color: fg)),
        ],
      ),
    );
  }
}

enum TagTone {
  pending(AppColors.infoSoft, AppColors.info),
  warning(AppColors.warningSoft, AppColors.warningText),
  success(AppColors.successSoft, AppColors.successDark),
  danger(AppColors.dangerSoft, AppColors.dangerDark);

  const TagTone(this.background, this.foreground);

  final Color background;
  final Color foreground;
}

/// Small status tag (Pendente / Alerta / Sincronizada / Na fila…).
class StatusTag extends StatelessWidget {
  const StatusTag({super.key, required this.label, required this.tone});

  final String label;
  final TagTone tone;

  @override
  Widget build(BuildContext context) => Container(
        height: AppDimens.tagHeight,
        padding: const EdgeInsets.symmetric(horizontal: 8),
        alignment: Alignment.center,
        decoration: BoxDecoration(color: tone.background, borderRadius: BorderRadius.circular(AppDimens.radiusTag)),
        child: Text(label, style: AppTextStyles.tag.copyWith(color: tone.foreground)),
      );
}

/// Green "✓" used when a question/section is answered.
class AnsweredCheck extends StatelessWidget {
  const AnsweredCheck({super.key, this.large = false});

  final bool large;

  @override
  Widget build(BuildContext context) => Text('✓', style: large ? AppTextStyles.checkLarge : AppTextStyles.check);
}
