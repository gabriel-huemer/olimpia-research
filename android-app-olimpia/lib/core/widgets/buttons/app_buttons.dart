import 'package:flutter/material.dart';

import '../../resources/app_colors.dart';
import '../../resources/app_dimens.dart';
import '../../resources/app_text_styles.dart';

/// Base tappable box: shared ripple/shape so every button looks the same.
class _ButtonBase extends StatelessWidget {
  const _ButtonBase({
    required this.child,
    required this.onPressed,
    required this.color,
    required this.height,
    required this.radius,
    this.borderColor,
    this.width,
  });

  final Widget child;
  final VoidCallback? onPressed;
  final Color color;
  final Color? borderColor;
  final double height;
  final double? width;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(radius),
      side: borderColor == null ? BorderSide.none : BorderSide(color: borderColor!),
    );
    return Opacity(
      opacity: onPressed == null ? 0.5 : 1,
      child: SizedBox(
        height: height,
        width: width,
        child: Material(
          color: color,
          shape: shape,
          clipBehavior: Clip.antiAlias,
          child: InkWell(onTap: onPressed, child: Center(child: child)),
        ),
      ),
    );
  }
}

/// Navy filled button (Figma "btn pri").
class PrimaryButton extends StatelessWidget {
  const PrimaryButton({super.key, required this.label, required this.onPressed, this.large = false, this.loading = false});

  final String label;
  final VoidCallback? onPressed;

  /// 60px / 17px variant used on the home screen.
  final bool large;
  final bool loading;

  @override
  Widget build(BuildContext context) => _ButtonBase(
        onPressed: loading ? null : onPressed,
        color: AppColors.navy,
        height: large ? AppDimens.buttonHeightLarge : AppDimens.buttonHeight,
        radius: AppDimens.radiusButton,
        child: loading
            ? const SizedBox.square(
                dimension: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: AppColors.surface))
            : Text(label, style: large ? AppTextStyles.buttonLarge : AppTextStyles.button),
      );
}

/// White outlined button (Figma "btn sec").
class SecondaryButton extends StatelessWidget {
  const SecondaryButton({super.key, required this.label, required this.onPressed, this.width});

  final String label;
  final VoidCallback? onPressed;
  final double? width;

  @override
  Widget build(BuildContext context) => _ButtonBase(
        onPressed: onPressed,
        color: AppColors.surface,
        borderColor: AppColors.borderInput,
        height: AppDimens.buttonHeight,
        width: width,
        radius: AppDimens.radiusButton,
        child: Text(label, style: AppTextStyles.button.copyWith(color: AppColors.navy)),
      );
}

/// Teal outlined action (Figma "link": bulk "Não utilizei").
class OutlineLinkButton extends StatelessWidget {
  const OutlineLinkButton({super.key, required this.label, required this.onPressed});

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => _ButtonBase(
        onPressed: onPressed,
        color: Colors.transparent,
        borderColor: AppColors.tealBorder,
        height: 42,
        radius: AppDimens.radiusRateCard,
        child: Text(label, style: AppTextStyles.linkTeal, textAlign: TextAlign.center),
      );
}

/// Small action of alerts: filled ("Corrigir") or outlined ("Manter e sinalizar").
class AlertActionButton extends StatelessWidget {
  const AlertActionButton({super.key, required this.label, required this.onPressed, this.filled = true});

  final String label;
  final VoidCallback? onPressed;
  final bool filled;

  @override
  Widget build(BuildContext context) => _ButtonBase(
        onPressed: onPressed,
        color: filled ? AppColors.warningTitle : Colors.transparent,
        borderColor: filled ? null : AppColors.warningBorder,
        height: AppDimens.alertButtonHeight,
        radius: AppDimens.radiusAlertButton,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(label,
              style: filled ? AppTextStyles.alertAction : AppTextStyles.alertAction.copyWith(color: AppColors.warningBody)),
        ),
      );
}

/// Text-only navy link ("Voltar ao início").
class TextLinkButton extends StatelessWidget {
  const TextLinkButton({super.key, required this.label, required this.onPressed});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => TextButton(
        onPressed: onPressed,
        style: TextButton.styleFrom(foregroundColor: AppColors.navy, minimumSize: const Size.fromHeight(44)),
        child: Text(label, style: AppTextStyles.link),
      );
}

/// 32px round back button with "‹".
class BackCircleButton extends StatelessWidget {
  const BackCircleButton({super.key, required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => _ButtonBase(
        onPressed: onPressed,
        color: AppColors.divider,
        height: AppDimens.backButtonSize,
        width: AppDimens.backButtonSize,
        radius: AppDimens.backButtonSize / 2,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 3),
          child: Text('‹', style: AppTextStyles.stepperSign.copyWith(fontSize: 18)),
        ),
      );
}
