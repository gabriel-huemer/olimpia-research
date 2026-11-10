import 'package:flutter/painting.dart';

import 'app_colors.dart';

/// Inter text styles used in the prototype. Names follow `<size><weight>` from Figma.
abstract final class AppTextStyles {
  static const family = 'Inter';

  static TextStyle _s(double size, FontWeight weight, Color color, {double? lineHeightPx, double? letterSpacing}) =>
      TextStyle(
        fontFamily: family,
        fontSize: size,
        fontWeight: weight,
        color: color,
        height: lineHeightPx == null ? null : lineHeightPx / size,
        letterSpacing: letterSpacing,
        leadingDistribution: TextLeadingDistribution.even,
      );

  // Access screen
  static final heroTitle = _s(28, FontWeight.w800, AppColors.surface, lineHeightPx: 32.2);
  static final heroSubtitle = _s(14, FontWeight.w400, AppColors.surface);
  static final heroInstitution = _s(12, FontWeight.w500, AppColors.onNavyMuted, lineHeightPx: 17);
  static final sheetTitle = _s(20, FontWeight.w800, AppColors.textPrimary);
  static final codeDigit = _s(22, FontWeight.w800, AppColors.navy);

  // Headings
  static final pageTitle = _s(22, FontWeight.w800, AppColors.navy, letterSpacing: 22 * -0.0136);
  static final pageSubtitle = _s(13, FontWeight.w400, AppColors.textSecondary, lineHeightPx: 18.2);
  static final appBarTitle = _s(17, FontWeight.w700, AppColors.textPrimary);
  static final appBarProtocol = _s(14, FontWeight.w500, AppColors.textHint);
  static final greetingName = _s(20, FontWeight.w700, AppColors.textPrimary);
  static final successTitle = _s(24, FontWeight.w800, AppColors.navy);
  static final statValue = _s(24, FontWeight.w800, AppColors.navy);
  static final bigCounter = _s(36, FontWeight.w800, AppColors.surface);
  static final bigCounterUnit = _s(15, FontWeight.w600, AppColors.surface);

  // Body
  static final questionTitle = _s(14, FontWeight.w700, AppColors.textPrimary, lineHeightPx: 18.9);
  static final cardTitle = _s(14, FontWeight.w800, AppColors.textPrimary);
  static final rowTitle = _s(14, FontWeight.w700, AppColors.textPrimary);
  static final body14 = _s(14, FontWeight.w400, AppColors.textPrimary);
  static final body13 = _s(13, FontWeight.w400, AppColors.textPrimary);
  static final body15 = _s(15, FontWeight.w400, AppColors.textSecondary, lineHeightPx: 22.5);
  static final body15Bold = _s(15, FontWeight.w700, AppColors.textPrimary, lineHeightPx: 22.5);
  static final caption = _s(12, FontWeight.w400, AppColors.textSecondary);
  static final captionMedium = _s(12, FontWeight.w500, AppColors.textSecondary);
  static final captionStrong = _s(12, FontWeight.w600, AppColors.textSecondary);
  static final captionLh = _s(12, FontWeight.w400, AppColors.textSecondary, lineHeightPx: 18);
  static final capsLabel = _s(12, FontWeight.w600, AppColors.textSecondary);
  static final conditionalNote = _s(12, FontWeight.w700, AppColors.teal);
  static final counterHint = _s(11, FontWeight.w400, AppColors.textHint);

  // Inputs
  static final input = _s(15, FontWeight.w400, AppColors.textPrimary);
  static final inputStrong = _s(15, FontWeight.w700, AppColors.textPrimary);
  static final inputHint = _s(15, FontWeight.w400, AppColors.textHint);
  static final inputCheck = _s(15, FontWeight.w800, AppColors.success);
  static final textArea = _s(14, FontWeight.w400, AppColors.textChip, lineHeightPx: 19.6);
  static final dropdownMatch = _s(14, FontWeight.w700, AppColors.teal);
  static final dropdownRest = _s(14, FontWeight.w400, AppColors.textPrimary);

  // Controls
  static final buttonLarge = _s(17, FontWeight.w700, AppColors.surface);
  static final button = _s(16, FontWeight.w700, AppColors.surface);
  static final link = _s(15, FontWeight.w700, AppColors.navy);
  static final linkTeal = _s(13, FontWeight.w700, AppColors.teal);
  static final chip = _s(13, FontWeight.w500, AppColors.textChip);
  static final chipSelected = _s(13, FontWeight.w600, AppColors.surface);
  static final segment = _s(11.5, FontWeight.w600, AppColors.textSecondary, lineHeightPx: 12.7);
  static final scaleNumber = _s(14, FontWeight.w700, AppColors.textChip);
  static final stepperSign = _s(18, FontWeight.w700, AppColors.navy);
  static final stepperValue = _s(16, FontWeight.w700, AppColors.textPrimary);
  static final pill = _s(12, FontWeight.w600, AppColors.dangerDark);
  static final tag = _s(11, FontWeight.w700, AppColors.info);
  static final check = _s(11, FontWeight.w600, AppColors.successDark);
  static final checkLarge = _s(14, FontWeight.w700, AppColors.success);
  static final smallButton = _s(12, FontWeight.w700, AppColors.surface);

  // Alerts
  static final alertTitle = _s(14, FontWeight.w700, AppColors.warningTitle, lineHeightPx: 19.6);
  static final alertBody = _s(13, FontWeight.w400, AppColors.warningBody, lineHeightPx: 18.2);
  static final alertAction = _s(12.5, FontWeight.w700, AppColors.surface, lineHeightPx: 17.5);
  static final alertIcon = _s(14, FontWeight.w800, AppColors.surface);

  // Sync banner
  static final syncBannerTitle = _s(15, FontWeight.w800, AppColors.successDark);
  static final syncBannerCaption = _s(12, FontWeight.w600, AppColors.successDark);
}
