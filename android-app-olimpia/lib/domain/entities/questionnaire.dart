/// Whether an answer value counts as answered (empty text/list = not answered).
bool hasAnswer(Object? value) => switch (value) {
  null => false,
  final List<Object?> l => l.isNotEmpty,
  final String s => s.trim().isNotEmpty,
  _ => true,
};

enum QuestionType {
  single,
  multi,
  state,
  city,
  cityMulti,
  date,
  nights,
  counter,
  rating,
  scale,
  text,
  integer,
  currency,
}

enum ChoiceDisplay { radio, chips, segmented }

enum LabelStyle { title, caps, row }

enum OptionTone { neutral, positive, warning, negative, muted }

enum SectionLayout { form, ratings }

enum ScaleVariant { nps, plain }

class QuestionOption {
  const QuestionOption({
    required this.value,
    required this.label,
    this.tone = OptionTone.neutral,
    this.uf,
  });

  /// Exact text used in the tabulation spreadsheet (kept for COUNTIF compatibility).
  final String value;

  /// Short text shown in the app.
  final String label;
  final OptionTone tone;

  /// Only for state options.
  final String? uf;
}

/// Visibility condition: shown when [key] has one of [values] (or none of [notValues]).
class QuestionDependency {
  const QuestionDependency({
    required this.key,
    this.values = const [],
    this.notValues = const [],
  });

  final String key;
  final List<String> values;
  final List<String> notValues;

  bool isSatisfiedBy(Object? answer) {
    final selected = switch (answer) {
      final List<Object?> list => list.map((e) => '$e').toList(),
      null => const <String>[],
      _ => ['$answer'],
    };
    if (values.isNotEmpty) return selected.any(values.contains);
    if (notValues.isNotEmpty) {
      return selected.isNotEmpty && !selected.any(notValues.contains);
    }
    return true;
  }
}

class SuspectRange {
  const SuspectRange({
    this.min,
    this.max,
    required this.title,
    required this.message,
    this.reviewTag,
  });

  final num? min;
  final num? max;
  final String title;

  /// Template with `{value}`.
  final String message;
  final String? reviewTag;

  bool isOutside(num value) =>
      (min != null && value < min!) || (max != null && value > max!);
}

class Question {
  const Question({
    required this.key,
    required this.sectionId,
    required this.position,
    required this.type,
    required this.label,
    required this.sourceText,
    required this.xlsxColumn,
    this.cardId,
    this.cardTitle,
    this.labelStyle = LabelStyle.title,
    this.display = ChoiceDisplay.radio,
    this.options = const [],
    this.hint,
    this.placeholder,
    this.footnote,
    this.suffix,
    this.min,
    this.max,
    this.maxLength,
    this.dependsOn,
    this.conditionalNote = false,
    this.suspect,
    this.scaleVariant = ScaleVariant.plain,
    this.minLabel,
    this.maxLabel,
    this.exteriorValue,
    this.exteriorLabel,
    this.dayUseLabel,
  });

  final String key;
  final int sectionId;
  final int position;
  final QuestionType type;
  final String label;

  /// Original question text (spreadsheet header).
  final String sourceText;
  final int xlsxColumn;

  /// Questions sharing a card id are rendered in the same card.
  final String? cardId;
  final String? cardTitle;
  final LabelStyle labelStyle;
  final ChoiceDisplay display;
  final List<QuestionOption> options;
  final String? hint;
  final String? placeholder;
  final String? footnote;
  final String? suffix;
  final int? min;
  final int? max;
  final int? maxLength;
  final QuestionDependency? dependsOn;
  final bool conditionalNote;
  final SuspectRange? suspect;
  final ScaleVariant scaleVariant;
  final String? minLabel;
  final String? maxLabel;
  final String? exteriorValue;
  final String? exteriorLabel;
  final String? dayUseLabel;

  String get effectiveCardId => cardId ?? key;

  bool get isMultiple =>
      type == QuestionType.multi || type == QuestionType.cityMulti;

  QuestionOption? optionFor(String value) {
    for (final o in options) {
      if (o.value == value) return o;
    }
    return null;
  }
}

class Section {
  const Section({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.reviewTitle,
    this.layout = SectionLayout.form,
    this.searchable = false,
    this.searchPlaceholder,
    this.bulkValue,
  });

  final int id;
  final String title;

  /// May contain `{count}` and `{answered}` placeholders.
  final String subtitle;
  final String reviewTitle;
  final SectionLayout layout;
  final bool searchable;
  final String? searchPlaceholder;
  final String? bulkValue;
}

class Questionnaire {
  Questionnaire({
    required this.version,
    required this.sections,
    required List<Question> questions,
  }) : questions = List.unmodifiable(questions..sort(_byPosition)),
       _byKey = {for (final q in questions) q.key: q};

  final int version;
  final List<Section> sections;
  final List<Question> questions;
  final Map<String, Question> _byKey;

  static int _byPosition(Question a, Question b) => a.sectionId != b.sectionId
      ? a.sectionId.compareTo(b.sectionId)
      : a.position.compareTo(b.position);

  int get sectionCount => sections.length;

  Question? question(String key) => _byKey[key];

  Section section(int id) => sections.firstWhere((s) => s.id == id);

  List<Question> questionsOf(int sectionId) =>
      questions.where((q) => q.sectionId == sectionId).toList();

  bool isVisible(Question q, Map<String, Object?> answers) =>
      q.dependsOn == null ||
      q.dependsOn!.isSatisfiedBy(answers[q.dependsOn!.key]);

  List<Question> visibleQuestionsOf(
    int sectionId,
    Map<String, Object?> answers,
  ) => questionsOf(sectionId).where((q) => isVisible(q, answers)).toList();
}
