import '../../core/utils/formatters.dart';
import '../entities/questionnaire.dart';

/// Result of a rule that found a suspicious/inconsistent answer (RF13).
class RuleHit {
  const RuleHit({
    required this.ruleId,
    required this.questionKey,
    required this.sectionId,
    required this.title,
    required this.message,
    required this.reviewTag,
    required this.inline,
    this.clearOnCorrect,
  });

  final String ruleId;

  /// Question the alert is attached to.
  final String questionKey;
  final int sectionId;
  final String title;
  final String message;
  final String reviewTag;

  /// `true`: alert inside the question card. `false`: alert right after the card.
  final bool inline;

  /// Answer cleared when the researcher taps "Corrigir" (null = only scroll to it).
  final String? clearOnCorrect;
}

abstract interface class SuspicionRule {
  RuleHit? evaluate(Questionnaire questionnaire, Map<String, Object?> answers);
}

/// Out-of-range numeric answer, configured per question in the seed (`suspectMin`/`suspectMax`).
class RangeRule implements SuspicionRule {
  const RangeRule(this.question);

  final Question question;

  @override
  RuleHit? evaluate(Questionnaire questionnaire, Map<String, Object?> answers) {
    final range = question.suspect;
    final value = answers[question.key];
    if (range == null ||
        value is! num ||
        !questionnaire.isVisible(question, answers)) {
      return null;
    }
    if (!range.isOutside(value)) return null;
    final text = question.type == QuestionType.currency
        ? Formatters.money(value)
        : value.toString();
    return RuleHit(
      ruleId: 'range:${question.key}',
      questionKey: question.key,
      sectionId: question.sectionId,
      title: range.title,
      message: range.message.replaceAll('{value}', text),
      reviewTag: (range.reviewTag ?? range.title).replaceAll('{value}', text),
      inline: true,
      clearOnCorrect: question.type == QuestionType.nights
          ? 'data_partida'
          : question.key,
    );
  }
}

/// "Sozinho(a)" selected while companions were counted.
class AloneWithCompanionsRule implements SuspicionRule {
  const AloneWithCompanionsRule();

  static const companionsKeys = [
    'acomp_0_12',
    'acomp_13_17',
    'acomp_18_29',
    'acomp_30_44',
    'acomp_45_64',
    'acomp_65_mais',
  ];
  static const aloneValue = 'Sozinho(a)';

  @override
  RuleHit? evaluate(Questionnaire questionnaire, Map<String, Object?> answers) {
    final withWhom = answers['com_quem'];
    if (withWhom is! List || !withWhom.contains(aloneValue)) return null;
    final total = companionsKeys.fold<int>(
      0,
      (sum, k) => sum + ((answers[k] as num?)?.toInt() ?? 0),
    );
    if (total == 0) return null;
    final anchor = questionnaire.question(companionsKeys.last);
    if (anchor == null) return null;
    return RuleHit(
      ruleId: 'alone_with_companions',
      questionKey: anchor.key,
      sectionId: anchor.sectionId,
      title: 'Resposta possivelmente inconsistente',
      message:
          'Marcou "$aloneValue", mas informou $total ${total == 1 ? 'acompanhante' : 'acompanhantes'}. '
          'Confirme com o entrevistado.',
      reviewTag: 'Inconsistência',
      inline: false,
    );
  }
}

/// Departure date earlier than arrival date.
class DepartureBeforeArrivalRule implements SuspicionRule {
  const DepartureBeforeArrivalRule();

  @override
  RuleHit? evaluate(Questionnaire questionnaire, Map<String, Object?> answers) {
    final arrival = Formatters.parseIsoDate(answers['data_chegada']);
    final departure = Formatters.parseIsoDate(answers['data_partida']);
    final anchor = questionnaire.question('pernoites');
    if (arrival == null ||
        departure == null ||
        anchor == null ||
        !departure.isBefore(arrival)) {
      return null;
    }
    return RuleHit(
      ruleId: 'departure_before_arrival',
      questionKey: anchor.key,
      sectionId: anchor.sectionId,
      title: 'Datas inconsistentes',
      message:
          'A data de partida é anterior à data de chegada. Confirme com o entrevistado.',
      reviewTag: 'Inconsistência',
      inline: false,
      clearOnCorrect: 'data_partida',
    );
  }
}

/// More people with disabilities than people in the group.
class DisabilityCountRule implements SuspicionRule {
  const DisabilityCountRule();

  @override
  RuleHit? evaluate(Questionnaire questionnaire, Map<String, Object?> answers) {
    final anchor = questionnaire.question('pcd_quantidade');
    final count = (answers['pcd_quantidade'] as num?)?.toInt();
    if (anchor == null ||
        count == null ||
        !questionnaire.isVisible(anchor, answers)) {
      return null;
    }
    final group =
        1 +
        AloneWithCompanionsRule.companionsKeys.fold<int>(
          0,
          (s, k) => s + ((answers[k] as num?)?.toInt() ?? 0),
        );
    if (count <= group) return null;
    return RuleHit(
      ruleId: 'disability_count',
      questionKey: anchor.key,
      sectionId: anchor.sectionId,
      title: 'Resposta possivelmente inconsistente',
      message:
          'Informou $count pessoas com deficiência em um grupo de $group. Confirme com o entrevistado.',
      reviewTag: 'Inconsistência',
      inline: true,
      clearOnCorrect: anchor.key,
    );
  }
}

/// Runs every rule. Rules never block the flow: they only produce flags.
class SuspicionRuleEngine {
  SuspicionRuleEngine(Questionnaire questionnaire)
    : _questionnaire = questionnaire,
      _rules = [
        for (final q in questionnaire.questions)
          if (q.suspect != null) RangeRule(q),
        const AloneWithCompanionsRule(),
        const DepartureBeforeArrivalRule(),
        const DisabilityCountRule(),
      ];

  final Questionnaire _questionnaire;
  final List<SuspicionRule> _rules;

  List<RuleHit> evaluate(Map<String, Object?> answers) => [
    for (final rule in _rules) ?rule.evaluate(_questionnaire, answers),
  ];
}
