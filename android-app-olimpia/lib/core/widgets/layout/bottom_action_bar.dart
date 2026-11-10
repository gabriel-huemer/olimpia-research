import 'package:flutter/material.dart';

import '../../resources/app_colors.dart';
import '../../resources/app_dimens.dart';
import '../../resources/app_strings.dart';
import '../buttons/app_buttons.dart';

/// White fixed bar with top divider (Figma "bottom").
class BottomBarContainer extends StatelessWidget {
  const BottomBarContainer({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => DecoratedBox(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: SafeArea(
          top: false,
          minimum: const EdgeInsets.only(bottom: AppDimens.bottomBarPaddingBottom - 16),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
                AppDimens.pagePadding, AppDimens.bottomBarPaddingTop, AppDimens.pagePadding, 16),
            child: child,
          ),
        ),
      );
}

/// "Voltar" + primary action, used by all survey steps.
class BottomActionBar extends StatelessWidget {
  const BottomActionBar({
    super.key,
    required this.onBack,
    required this.primaryLabel,
    required this.onPrimary,
    this.loading = false,
  });

  final VoidCallback onBack;
  final String primaryLabel;
  final VoidCallback? onPrimary;
  final bool loading;

  @override
  Widget build(BuildContext context) => BottomBarContainer(
        child: Row(
          children: [
            SecondaryButton(label: AppStrings.back, onPressed: onBack, width: AppDimens.secondaryButtonWidth),
            const SizedBox(width: AppDimens.buttonGap),
            Expanded(child: PrimaryButton(label: primaryLabel, onPressed: onPrimary, loading: loading)),
          ],
        ),
      );
}
