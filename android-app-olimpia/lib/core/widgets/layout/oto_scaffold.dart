import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../resources/app_colors.dart';
import '../../resources/app_theme.dart';

/// Page skeleton shared by every screen: status bar style, white top bar,
/// scrollable body and an optional fixed bottom bar.
class OtoScaffold extends StatelessWidget {
  const OtoScaffold({
    super.key,
    required this.body,
    this.topBar,
    this.bottomBar,
    this.topBarColor = AppColors.surface,
    this.statusBar = AppTheme.lightStatusBar,
    this.onBack,
  });

  final Widget body;
  final Widget? topBar;
  final Widget? bottomBar;
  final Color topBarColor;
  final SystemUiOverlayStyle statusBar;

  /// Intercepts the system back gesture (null = default pop).
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    Widget page = Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: true,
      body: Column(
        children: [
          ColoredBox(
            color: topBarColor,
            child: SafeArea(bottom: false, child: topBar ?? const SizedBox(width: double.infinity)),
          ),
          Expanded(child: body),
          ?bottomBar,
        ],
      ),
    );
    if (onBack != null) {
      page = PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop) onBack!();
        },
        child: page,
      );
    }
    return AnnotatedRegion<SystemUiOverlayStyle>(value: statusBar, child: page);
  }
}

/// Inserts a 1px divider between children (lists inside cards).
class DividedColumn extends StatelessWidget {
  const DividedColumn({super.key, required this.children, this.color = AppColors.divider});

  final List<Widget> children;
  final Color color;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) ColoredBox(color: color, child: const SizedBox(height: 1)),
            children[i],
          ],
        ],
      );
}
