import 'package:flutter/material.dart';

import '../../features/access/page/access_page.dart';
import '../../features/home/page/home_page.dart';
import '../../features/review/page/review_page.dart';
import '../../features/saved/page/saved_page.dart';
import '../../features/survey_section/page/survey_section_page.dart';
import '../../features/sync/page/sync_page.dart';

/// Arguments of the section route.
class SectionArgs {
  const SectionArgs({required this.surveyId, required this.sectionId, this.fromReview = false});

  final String surveyId;
  final int sectionId;

  /// Opened from "Revisão": the primary button returns to the review.
  final bool fromReview;
}

/// Single source of route names and the route table.
abstract final class AppRoutes {
  static const access = '/acesso';
  static const home = '/inicio';
  static const section = '/pesquisa/secao';
  static const review = '/pesquisa/revisao';
  static const saved = '/pesquisa/salva';
  static const sync = '/sincronizacao';

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    final Widget page = switch (settings.name) {
      access => const AccessPage(),
      home => const HomePage(),
      section => SurveySectionPage(args: settings.arguments! as SectionArgs),
      review => ReviewPage(surveyId: settings.arguments! as String),
      saved => SavedPage(surveyId: settings.arguments! as String),
      sync => const SyncPage(),
      _ => const HomePage(),
    };
    return MaterialPageRoute(builder: (_) => page, settings: settings);
  }

  // ---- typed helpers (avoid repeating names/args in pages) ----

  static Future<void> openHome(BuildContext context) =>
      Navigator.of(context).pushNamedAndRemoveUntil(home, (_) => false);

  static Future<void> openAccess(BuildContext context) =>
      Navigator.of(context).pushNamedAndRemoveUntil(access, (_) => false);

  static Future<void> openSection(BuildContext context, SectionArgs args, {bool replaceStack = false}) {
    final nav = Navigator.of(context);
    if (replaceStack) {
      return nav.pushNamedAndRemoveUntil(section, (r) => r.settings.name == home, arguments: args);
    }
    return nav.pushNamed(section, arguments: args);
  }

  static Future<void> openReview(BuildContext context, String surveyId) =>
      Navigator.of(context).pushNamed(review, arguments: surveyId);

  static Future<void> openSaved(BuildContext context, String surveyId) =>
      Navigator.of(context).pushNamedAndRemoveUntil(saved, (r) => r.settings.name == home, arguments: surveyId);

  static Future<void> openSync(BuildContext context) => Navigator.of(context).pushNamed(sync);

  static void backToHome(BuildContext context) => Navigator.of(context).popUntil((r) => r.settings.name == home);
}
