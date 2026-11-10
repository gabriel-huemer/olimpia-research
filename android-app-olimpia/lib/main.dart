import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'core/di/injector.dart';
import 'core/resources/app_strings.dart';
import 'core/resources/app_theme.dart';
import 'core/routes/app_routes.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('pt_BR');
  await configureDependencies();
  final loggedIn = await bootstrap();
  runApp(OtoApp(initialRoute: loggedIn ? AppRoutes.home : AppRoutes.access));
}

class OtoApp extends StatelessWidget {
  const OtoApp({super.key, required this.initialRoute});

  final String initialRoute;

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: AppStrings.appName,
    debugShowCheckedModeBanner: false,
    theme: AppTheme.light,
    locale: const Locale('pt', 'BR'),
    supportedLocales: const [Locale('pt', 'BR')],
    localizationsDelegates: GlobalMaterialLocalizations.delegates,
    initialRoute: initialRoute,
    onGenerateRoute: AppRoutes.onGenerateRoute,
    // Layout measured on 390px frames: keep system font scaling within a safe range.
    builder: (context, child) =>
        MediaQuery.withClampedTextScaling(maxScaleFactor: 1.3, child: child!),
  );
}
