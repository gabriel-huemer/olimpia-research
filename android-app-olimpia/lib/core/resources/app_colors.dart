import 'package:flutter/painting.dart';

/// Palette extracted from the Figma prototype "OTO – App do Pesquisador".
abstract final class AppColors {
  // Brand
  static const navy = Color(0xFF1B2556);
  static const teal = Color(0xFF007F74);
  static const tealBright = Color(0xFF00A395);
  static const tealSoft = Color(0xFFE6F5F3);
  static const tealTint = Color(0xFFF3FBFA);
  static const tealBorder = Color(0xFF8FD3C9);
  static const tealFocusRing = Color(0x26007F74); // rgba(0,127,116,.15)

  // Neutrals
  static const background = Color(0xFFF4F6FA);
  static const surface = Color(0xFFFFFFFF);
  static const textPrimary = Color(0xFF1A2233);
  static const textSecondary = Color(0xFF5A6478);
  static const textChip = Color(0xFF343E52);
  static const textHint = Color(0xFF8C96A8);
  static const onNavyMuted = Color(0xFFC9CFE6);
  static const border = Color(0xFFE3E7EF);
  static const borderInput = Color(0xFFCBD2DE);
  static const borderSegment = Color(0xFFD6DCE6);
  static const divider = Color(0xFFEEF1F6);
  static const radioIdle = Color(0xFFA7B0C0);
  static const whiteOverlay = Color(0x26FFFFFF); // rgba(255,255,255,.15)

  // Status
  static const success = Color(0xFF1E8E5A);
  static const successDark = Color(0xFF1E7A4E);
  static const successSoft = Color(0xFFE3F4EC);
  static const successTrack = Color(0xFFC6E6D5);
  static const danger = Color(0xFFD32A30);
  static const dangerDark = Color(0xFFA12B2B);
  static const dangerSoft = Color(0xFFFDECEC);
  static const warning = Color(0xFFE0A100);
  static const warningStrong = Color(0xFFF6C944);
  static const warningSoft = Color(0xFFFFF4D6);
  static const warningInput = Color(0xFFFFFBEF);
  static const warningBorder = Color(0xFFB88400);
  static const warningText = Color(0xFF7A5200);
  static const warningTitle = Color(0xFF3D2E00);
  static const warningBody = Color(0xFF5C3F00);
  static const info = Color(0xFF1F6FB0);
  static const infoSoft = Color(0xFFE6F0FA);

  // NPS scale backgrounds
  static const npsDetractor = Color(0xFFF6DADA);
  static const npsNeutral = Color(0xFFFBEFC9);
  static const npsPromoter = Color(0xFFD8EFE4);

  // Shadows
  static const dropdownShadow = Color(0x1F1B2556); // rgba(27,37,86,.12)

  /// Colored stripe used on top of institutional headers (Figma "Faixa institucional").
  static const institutionalStripe = [
    Color(0xFFF6C944),
    Color(0xFF2782C5),
    Color(0xFFDC232A),
    Color(0xFF00A395),
    Color(0xFF4BBED1),
    Color(0xFFF6C944),
    Color(0xFF2782C5),
  ];
}
