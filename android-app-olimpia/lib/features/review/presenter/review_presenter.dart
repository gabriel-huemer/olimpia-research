import 'dart:async';

import '../../../core/mvp/base_presenter.dart';
import '../../../core/mvp/connectivity_aware.dart';
import '../../../core/resources/app_strings.dart';
import '../../../core/routes/app_routes.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/services/connectivity_service.dart';
import '../../../data/services/sync_service.dart';
import '../../../domain/entities/questionnaire.dart';
import '../../../domain/entities/researcher.dart';
import '../../../domain/entities/survey.dart';
import '../../../domain/repositories/questionnaire_repository.dart';
import '../../../domain/repositories/survey_repository.dart';
import '../../../core/widgets/status/status_badges.dart';
import '../../../domain/rules/suspicion_rules.dart';
import '../view/review_view.dart';

class ReviewPresenter extends BasePresenter<ReviewView> with ConnectivityAware<ReviewView> {
  ReviewPresenter(this.surveyId, this._questionnaires, this._surveys, this.connectivity, this._sync);

  final String surveyId;
  final QuestionnaireRepository _questionnaires;
  final SurveyRepository _surveys;
  @override
  final ConnectivityService connectivity;
  final SyncService _sync;

  Questionnaire? _questionnaire;
  Survey? _survey;
  bool _saving = false;

  @override
  void onAttach() {
    listenConnectivity();
    // Reloads when the researcher returns from editing a section.
    final sub = _surveys.changes.listen((_) => _load());
    addDisposer(sub.cancel);
    unawaited(_load());
  }

  @override
  void onConnectivityChanged(bool online) => _render();

  Future<void> _load() async {
    _questionnaire ??= await _questionnaires.load();
    _survey = await _surveys.byId(surveyId);
    _render();
  }

  /// Counters start at their minimum value, so they count as answered.
  static bool _countsAsAnswered(Question q, Object? v) => q.type == QuestionType.counter || hasAnswer(v);

  void _render() {
    final q = _questionnaire, s = _survey;
    if (q == null || s == null) return;
    final rows = <ReviewRowViewModel>[];
    for (final section in q.sections) {
      final flags = s.flags.where((f) => f.sectionId == section.id).toList();
      final missing = q.visibleQuestionsOf(section.id, s.answers).where((x) => !_countsAsAnswered(x, s.answers[x.key]));
      final title = '${q.sections.indexOf(section) + 1}. ${section.reviewTitle}';
      rows.add(switch (flags.length) {
        1 => ReviewRowViewModel(sectionId: section.id, title: title, tag: flags.first.reviewTag, tone: TagTone.warning),
        > 1 => ReviewRowViewModel(
            sectionId: section.id, title: title, tag: AppStrings.alertsCount(flags.length), tone: TagTone.warning),
        _ when missing.isNotEmpty => ReviewRowViewModel(
            sectionId: section.id, title: title, tag: AppStrings.unanswered(missing.length), tone: TagTone.pending),
        _ => ReviewRowViewModel(sectionId: section.id, title: title),
      });
    }
    withView((v) => v.render(ReviewViewModel(
          protocol: Formatters.protocol(s.protocol),
          online: isOnline,
          flagCount: s.flags.length,
          rows: rows,
          researcherCode: Researcher(code: s.researcherCode, name: '', location: '').displayCode,
          startTime: Formatters.time(s.startedAt),
          endTime: Formatters.time(DateTime.now()),
          location: s.location,
          saving: _saving,
        )));
  }

  void editSection(int sectionId) =>
      withView((v) => v.openSection(SectionArgs(surveyId: surveyId, sectionId: sectionId, fromReview: true)));

  void back() => withView((v) => v.close());

  /// Saves even with flags or blank answers: nothing blocks (RF13). Flags go to curation (RF19).
  Future<void> save() async {
    final q = _questionnaire, s = _survey;
    if (q == null || s == null || _saving) return;
    _saving = true;
    _render();
    final previous = {for (final f in s.flags) f.ruleId: f};
    final flags = [
      for (final h in SuspicionRuleEngine(q).evaluate(s.answers))
        SurveyFlag(
          ruleId: h.ruleId,
          questionKey: h.questionKey,
          sectionId: h.sectionId,
          title: h.title,
          message: h.message,
          reviewTag: h.reviewTag,
          status: previous[h.ruleId]?.status ?? FlagStatus.open,
          createdAt: previous[h.ruleId]?.createdAt ?? DateTime.now(),
        ),
    ];
    await _surveys.complete(surveyId, flags: flags);
    _sync.requestSync();
    withView((v) => v.openSaved(surveyId));
  }
}
