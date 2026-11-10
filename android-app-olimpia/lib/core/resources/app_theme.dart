import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app_colors.dart';
import 'app_text_styles.dart';

abstract final class AppTheme {
  static ThemeData get light => ThemeData(
        useMaterial3: true,
        fontFamily: AppTextStyles.family,
        scaffoldBackgroundColor: AppColors.background,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.navy,
          primary: AppColors.navy,
          secondary: AppColors.teal,
          surface: AppColors.surface,
          error: AppColors.danger,
        ),
        textSelectionTheme: const TextSelectionThemeData(
          cursorColor: AppColors.tealBright,
          selectionColor: AppColors.tealSoft,
          selectionHandleColor: AppColors.teal,
        ),
        splashFactory: InkSparkle.splashFactory,
        datePickerTheme: const DatePickerThemeData(
          backgroundColor: AppColors.surface,
          headerBackgroundColor: AppColors.navy,
          headerForegroundColor: AppColors.surface,
        ),
      );

  /// White status bar with dark icons (all screens except Acesso).
  static const lightStatusBar = SystemUiOverlayStyle(
    statusBarColor: AppColors.surface,
    statusBarIconBrightness: Brightness.dark,
    statusBarBrightness: Brightness.light,
    systemNavigationBarColor: AppColors.surface,
    systemNavigationBarIconBrightness: Brightness.dark,
  );

  /// Navy status bar with light icons (Acesso).
  static const darkStatusBar = SystemUiOverlayStyle(
    statusBarColor: AppColors.navy,
    statusBarIconBrightness: Brightness.light,
    statusBarBrightness: Brightness.dark,
    systemNavigationBarColor: AppColors.background,
    systemNavigationBarIconBrightness: Brightness.dark,
  );
}
