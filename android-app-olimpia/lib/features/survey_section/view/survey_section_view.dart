import '../../../core/mvp/base_presenter.dart';
import '../../../core/routes/app_routes.dart';
import '../../../domain/entities/questionnaire.dart';

class AlertViewModel {
  const AlertViewModel({
    required this.ruleId,
    required this.title,
    required this.message,
    required this.kept,
  });

  final String ruleId;
  final String title;
  final String message;
  final bool kept;
}

class QuestionViewModel {
  const QuestionViewModel({
    required this.question,
    required this.value,
    this.hint,
    this.ufFilter,
    this.alerts = const [],
  });

  final Question question;
  final Object? value;

  /// Hint under the title (static from seed or dynamic, e.g. "Mostrando só cidades de SP").
  final String? hint;

  /// City search restricted to this UF.
  final String? ufFilter;

  /// Alerts shown inside the card, right after the control.
  final List<AlertViewModel> alerts;

  String get key => question.key;

  bool get hasWarning => alerts.isNotEmpty;

  bool get isAnswered => hasAnswer(value);
}

class CardViewModel {
  const CardViewModel({
    required this.id,
    required this.questions,
    this.title,
    this.conditionalNote,
    this.footnote,
    this.alertsAfter = const [],
  });

  final String id;
  final String? title;

  /// "→ Aparece porque marcou "Aéreo"" (highlighted card).
  final String? conditionalNote;
  final String? footnote;
  final List<QuestionViewModel> questions;

  /// Cross-field alerts shown right after the card.
  final List<AlertViewModel> alertsAfter;
}

class SectionViewModel {
  const SectionViewModel({
    required this.protocol,
    required this.number,
    required this.total,
    required this.title,
    required this.subtitle,
    required this.online,
    required this.layout,
    required this.cards,
    required this.primaryLabel,
    this.searchPlaceholder,
    this.bulkLabel,
  });

  final String protocol;
  final int number;
  final int total;
  final String title;
  final String subtitle;
  final bool online;
  final SectionLayout layout;
  final List<CardViewModel> cards;
  final String primaryLabel;

  /// Non-null when the section has a search box (Atrativos).
  final String? searchPlaceholder;

  /// "Marcar os 19 restantes como "Não utilizei"" (null when nothing is left).
  final String? bulkLabel;
}

abstract interface class SurveySectionView
    implements RenderView<SectionViewModel> {
  void openSection(SectionArgs args);

  void openReview(String surveyId);

  /// Pops the current section (previous section or review).
  void close();

  /// Section 1 "Voltar": confirm leaving the survey (draft stays saved).
  void askLeave();

  void backToHome();

  /// Scrolls to the card that contains [questionKey] ("Corrigir").
  void scrollTo(String questionKey);
}
