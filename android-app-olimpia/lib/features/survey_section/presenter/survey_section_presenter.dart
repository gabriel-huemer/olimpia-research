import 'dart:async';

import '../../../core/mvp/base_presenter.dart';
import '../../../core/mvp/connectivity_aware.dart';
import '../../../core/routes/app_routes.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/services/connectivity_service.dart';
import '../../../domain/entities/city.dart';
import '../../../domain/entities/questionnaire.dart';
import '../../../domain/entities/survey.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../domain/repositories/questionnaire_repository.dart';
import '../../../domain/repositories/survey_repository.dart';
import '../../../domain/rules/suspicion_rules.dart';
import '../mapper/section_view_mapper.dart';
import '../view/survey_section_view.dart';

/// One presenter for the 10 sections: behavior comes from the questionnaire cached in SQLite.
class SurveySectionPresenter extends BasePresenter<SurveySectionView>
    with ConnectivityAware<SurveySectionView> {
  SurveySectionPresenter(
    this.args,
    this._questionnaires,
    this._surveys,
    this._auth,
    this.connectivity,
  );

  final SectionArgs args;
  final QuestionnaireRepository _questionnaires;
  final SurveyRepository _surveys;
  final AuthRepository _auth;
  @override
  final ConnectivityService connectivity;

  static const _typingDebounce = Duration(milliseconds: 700);
  static const _typed = {
    QuestionType.text,
    QuestionType.integer,
    QuestionType.currency,
  };

  late Questionnaire _questionnaire;
  late Section _section;
  late SuspicionRuleEngine _rules;
  late Survey _survey;
  String _changedBy = '';
  final Map<String, Object?> _answers = {};
  final Set<String> _kept = {};
  final Map<String, DateTime> _flagCreatedAt = {};
  final Map<String, Timer> _pendingWrites = {};
  List<RuleHit> _hits = const [];
  String _query = '';
  bool _ready = false;

  @override
  void onAttach() {
    listenConnectivity();
    unawaited(_load());
  }

  @override
  void onConnectivityChanged(bool online) => _render();

  Future<void> _load() async {
    _questionnaire = await _questionnaires.load();
    _section = _questionnaire.section(args.sectionId);
    _rules = SuspicionRuleEngine(_questionnaire);
    _survey = (await _surveys.byId(args.surveyId))!;
    _changedBy =
        (await _auth.currentResearcher())?.code ?? _survey.researcherCode;
    _answers
      ..clear()
      ..addAll(_survey.answers);
    for (final f in _survey.flags) {
      _flagCreatedAt[f.ruleId] = f.createdAt;
      if (f.status == FlagStatus.confirmed) _kept.add(f.ruleId);
    }
    _hits = _rules.evaluate(_answers);
    _ready = true;
    _render();
  }

  void _render() {
    if (!_ready) return;
    withView(
      (v) => v.render(
        SectionViewMapper.map(
          questionnaire: _questionnaire,
          section: _section,
          answers: _answers,
          hits: _hits,
          keptRuleIds: _kept,
          protocol: _survey.protocol,
          online: isOnline,
          fromReview: args.fromReview,
          query: _query,
        ),
      ),
    );
  }

  // ------------------------------------------------------------ answers

  /// Every control ends here: updates memory, derived answers, rules and SQLite.
  void setAnswer(String key, Object? value) {
    _put(key, value);
    _applyDerivedAnswers(key);
    _dropHiddenAnswers();
    _evaluateRules();
    _render();
  }

  void toggleOption(String key, String value) {
    final current = [...?(_answers[key] as List?)?.cast<Object?>()];
    current.contains(value) ? current.remove(value) : current.add(value);
    setAnswer(key, current.isEmpty ? null : current);
  }

  void addCity(String key, City city) {
    final current = [...?(_answers[key] as List?)?.cast<Object?>()];
    if (!current.any((c) => City.fromAnswer(c) == city)) {
      current.add(city.toAnswer());
    }
    setAnswer(key, current);
  }

  void removeCity(String key, City city) {
    final current = [...?(_answers[key] as List?)?.cast<Object?>()]
      ..removeWhere((c) => City.fromAnswer(c) == city);
    setAnswer(key, current.isEmpty ? null : current);
  }

  /// "Day use (não pernoitou)": departure = arrival and 0 nights.
  void setDayUse(bool dayUse) {
    if (dayUse) {
      final arrival = _answers['data_chegada'];
      if (arrival != null) _put('data_partida', arrival);
      setAnswer('pernoites', 0);
    } else {
      _put('data_partida', null);
      setAnswer('pernoites', null);
    }
  }

  Future<List<City>> searchCities(String query, String? uf) =>
      _questionnaires.searchCities(query, uf: uf);

  void _put(String key, Object? value) {
    final question = _questionnaire.question(key);
    if (value == null || (value is String && value.isEmpty)) {
      _answers.remove(key);
      value = null;
    } else {
      _answers[key] = value;
    }
    final debounce = question != null && _typed.contains(question.type);
    _pendingWrites.remove(key)?.cancel();
    if (debounce) {
      // Avoids one audit entry per keystroke.
      _pendingWrites[key] = Timer(_typingDebounce, () => _write(key));
    } else {
      _write(key);
    }
  }

  void _write(String key) {
    _pendingWrites.remove(key);
    unawaited(
      _surveys.saveAnswer(
        _survey.id,
        key,
        _answers[key],
        changedBy: _changedBy,
      ),
    );
  }

  void _applyDerivedAnswers(String key) {
    if (key == 'data_chegada' || key == 'data_partida') {
      final a = Formatters.parseIsoDate(_answers['data_chegada']);
      final d = Formatters.parseIsoDate(_answers['data_partida']);
      if (a != null && d != null) {
        final nights = DateTime.utc(
          d.year,
          d.month,
          d.day,
        ).difference(DateTime.utc(a.year, a.month, a.day)).inDays;
        _put('pernoites', nights >= 0 ? nights : null);
      }
    }
    if (key == 'estado') {
      final state = _questionnaire.question('estado');
      final uf = state?.optionFor('${_answers['estado']}')?.uf;
      final city = City.fromAnswer(_answers['cidade']);
      if (city != null && city.uf != uf) _put('cidade', null);
    }
  }

  /// Answers of questions that became hidden are removed (e.g. "aeroporto" after changing transport).
  void _dropHiddenAnswers() {
    for (final q in _questionnaire.questionsOf(_section.id)) {
      if (q.dependsOn != null &&
          _answers.containsKey(q.key) &&
          !_questionnaire.isVisible(q, _answers)) {
        _put(q.key, null);
      }
    }
  }

  // ------------------------------------------------------------ flags (RF13)

  void _evaluateRules() {
    _hits = _rules.evaluate(_answers);
    final active = {for (final h in _hits) h.ruleId};
    _kept.removeWhere((id) => !active.contains(id));
    _saveFlags();
  }

  /// Only this section's flags: other sections are owned by their own presenters.
  void _saveFlags() => unawaited(
    _surveys.saveFlags(_survey.id, _flags(), sectionId: _section.id),
  );

  List<SurveyFlag> _flags() => [
    for (final h in _hits)
      SurveyFlag(
        ruleId: h.ruleId,
        questionKey: h.questionKey,
        sectionId: h.sectionId,
        title: h.title,
        message: h.message,
        reviewTag: h.reviewTag,
        status: _kept.contains(h.ruleId)
            ? FlagStatus.confirmed
            : FlagStatus.open,
        createdAt: _flagCreatedAt.putIfAbsent(h.ruleId, DateTime.now),
      ),
  ];

  void keepAndFlag(String ruleId) {
    _kept.add(ruleId);
    _saveFlags();
    _render();
  }

  void correct(String ruleId) {
    final hit = _hits.where((h) => h.ruleId == ruleId).firstOrNull;
    if (hit == null) return;
    _kept.remove(ruleId);
    final target = hit.clearOnCorrect ?? hit.questionKey;
    if (hit.clearOnCorrect != null) setAnswer(hit.clearOnCorrect!, null);
    withView((v) => v.scrollTo(target));
  }

  // ------------------------------------------------------------ ratings section

  void search(String query) {
    _query = query;
    _render();
  }

  /// "Marcar os N restantes como Não utilizei".
  void fillRemaining() {
    final value = _section.bulkValue;
    if (value == null) return;
    for (final q in _questionnaire.visibleQuestionsOf(_section.id, _answers)) {
      if (!hasAnswer(_answers[q.key])) _put(q.key, value);
    }
    _evaluateRules();
    _render();
  }

  // ------------------------------------------------------------ navigation

  void next() {
    _flushWrites();
    final index = _questionnaire.sections.indexOf(_section);
    final isLast = index == _questionnaire.sections.length - 1;
    withView((v) {
      if (args.fromReview) {
        v.close();
      } else if (isLast) {
        v.openReview(_survey.id);
      } else {
        v.openSection(
          SectionArgs(
            surveyId: _survey.id,
            sectionId: _questionnaire.sections[index + 1].id,
          ),
        );
      }
    });
  }

  void back() {
    _flushWrites();
    withView(
      (v) => _section.id == _questionnaire.sections.first.id && !args.fromReview
          ? v.askLeave()
          : v.close(),
    );
  }

  void leaveConfirmed() => withView((v) => v.backToHome());

  void _flushWrites() {
    for (final key in [..._pendingWrites.keys]) {
      _pendingWrites[key]?.cancel();
      _write(key);
    }
  }

  @override
  void detach() {
    if (_ready) _flushWrites();
    super.detach();
  }
}
