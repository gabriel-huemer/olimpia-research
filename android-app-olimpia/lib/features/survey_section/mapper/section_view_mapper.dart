import '../../../core/resources/app_strings.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/text_normalizer.dart';
import '../../../domain/entities/questionnaire.dart';
import '../../../domain/rules/suspicion_rules.dart';
import '../view/survey_section_view.dart';

/// Domain (questionnaire + answers + rule hits) -> section view model.
abstract final class SectionViewMapper {
  static SectionViewModel map({
    required Questionnaire questionnaire,
    required Section section,
    required Map<String, Object?> answers,
    required List<RuleHit> hits,
    required Set<String> keptRuleIds,
    required int protocol,
    required bool online,
    required bool fromReview,
    String query = '',
  }) {
    final visible = questionnaire.visibleQuestionsOf(section.id, answers);
    final sectionHits = hits.where((h) => h.sectionId == section.id).toList();
    AlertViewModel alert(RuleHit h) => AlertViewModel(
      ruleId: h.ruleId,
      title: h.title,
      message: h.message,
      kept: keptRuleIds.contains(h.ruleId),
    );

    final normalizedQuery = TextNormalizer.normalize(query);
    final shown = section.searchable && normalizedQuery.isNotEmpty
        ? visible
              .where(
                (q) =>
                    TextNormalizer.normalize(q.label).contains(normalizedQuery),
              )
              .toList()
        : visible;

    final cards = <CardViewModel>[];
    var i = 0;
    while (i < shown.length) {
      final cardId = shown[i].effectiveCardId;
      final group = <Question>[];
      while (i < shown.length && shown[i].effectiveCardId == cardId) {
        group.add(shown[i++]);
      }
      final keys = group.map((q) => q.key).toSet();
      cards.add(
        CardViewModel(
          id: cardId,
          title: group.first.cardTitle,
          conditionalNote: _conditionalNote(questionnaire, group.first),
          footnote: group
              .map((q) => q.footnote)
              .whereType<String>()
              .firstOrNull,
          questions: [
            for (final q in group)
              _question(questionnaire, q, answers, [
                for (final h in sectionHits)
                  if (h.inline && h.questionKey == q.key) alert(h),
              ]),
          ],
          alertsAfter: [
            for (final h in sectionHits)
              if (!h.inline && keys.contains(h.questionKey)) alert(h),
          ],
        ),
      );
    }

    final answered = visible.where((q) => hasAnswer(answers[q.key])).length;
    final remaining = visible.length - answered;
    final isLast = section.id == questionnaire.sections.last.id;
    return SectionViewModel(
      protocol: Formatters.protocol(protocol),
      number: questionnaire.sections.indexOf(section) + 1,
      total: questionnaire.sectionCount,
      title: section.title,
      subtitle: section.subtitle
          .replaceAll('{count}', '${visible.length}')
          .replaceAll('{answered}', '$answered'),
      online: online,
      layout: section.layout,
      cards: cards,
      primaryLabel: fromReview
          ? AppStrings.backToReview
          : isLast
          ? AppStrings.reviewSurvey
          : AppStrings.nextSection,
      searchPlaceholder: section.searchable ? section.searchPlaceholder : null,
      bulkLabel: section.bulkValue != null && remaining > 0
          ? AppStrings.bulkRemaining(
              remaining,
              _labelOf(visible.first, section.bulkValue!),
            )
          : null,
    );
  }

  static String _labelOf(Question q, String value) =>
      q.optionFor(value)?.label ?? value;

  static String? _conditionalNote(Questionnaire questionnaire, Question q) {
    final dep = q.dependsOn;
    if (!q.conditionalNote || dep == null || dep.values.isEmpty) return null;
    final parent = questionnaire.question(dep.key);
    return AppStrings.conditionalNote(
      parent == null ? dep.values.first : _labelOf(parent, dep.values.first),
    );
  }

  static QuestionViewModel _question(
    Questionnaire questionnaire,
    Question q,
    Map<String, Object?> answers,
    List<AlertViewModel> alerts,
  ) {
    String? hint = q.hint;
    String? uf;
    if (q.type == QuestionType.city) {
      final state = questionnaire.question(q.dependsOn?.key ?? 'estado');
      if (state != null) uf = state.optionFor('${answers[state.key]}')?.uf;
      if (uf != null) hint = '${AppStrings.showingCitiesOf} $uf';
    }
    return QuestionViewModel(
      question: q,
      value: answers[q.key],
      hint: hint,
      ufFilter: uf,
      alerts: alerts,
    );
  }
}
