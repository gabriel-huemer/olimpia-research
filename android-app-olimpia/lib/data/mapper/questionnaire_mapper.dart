import 'dart:convert';

import '../../domain/entities/questionnaire.dart';

typedef Row = Map<String, Object?>;

/// Seed JSON (generated from the xlsx) <-> SQLite rows <-> domain entities.
abstract final class QuestionnaireMapper {
  static const _coreKeys = {
    'key',
    'section',
    'position',
    'type',
    'label',
    'sourceText',
    'xlsxColumn',
    'options',
  };

  // ---- seed -> rows ----

  static Row sectionToRow(Map<String, Object?> s) => {
    'id': s['id'],
    'title': s['title'],
    'subtitle': s['subtitle'],
    'review_title': s['reviewTitle'],
    'layout': s['layout'] ?? SectionLayout.form.name,
    'searchable': s['searchable'] == true ? 1 : 0,
    'search_placeholder': s['searchPlaceholder'],
    'bulk_value': s['bulkValue'],
  };

  static Row questionToRow(Map<String, Object?> q) => {
    'key': q['key'],
    'section_id': q['section'],
    'position': q['position'],
    'type': q['type'],
    'label': q['label'],
    'source_text': q['sourceText'],
    'xlsx_column': q['xlsxColumn'],
    'config': jsonEncode({
      for (final e in q.entries)
        if (!_coreKeys.contains(e.key)) e.key: e.value,
    }),
  };

  static List<Row> optionsToRows(Map<String, Object?> q) {
    final options =
        (q['options'] as List?)?.cast<Map<String, Object?>>() ?? const [];
    return [
      for (var i = 0; i < options.length; i++)
        {
          'question_key': q['key'],
          'position': i,
          'value': options[i]['value'],
          'label': options[i]['label'],
          'tone': options[i]['tone'],
          'uf': options[i]['uf'],
        },
    ];
  }

  // ---- rows -> entities ----

  static Questionnaire fromRows({
    required int version,
    required List<Row> sections,
    required List<Row> questions,
    required List<Row> options,
  }) {
    final optionsByQuestion = <String, List<QuestionOption>>{};
    for (final o in options) {
      optionsByQuestion
          .putIfAbsent(o['question_key']! as String, () => [])
          .add(_option(o));
    }
    return Questionnaire(
      version: version,
      sections: sections.map(_section).toList(),
      questions: [
        for (final q in questions)
          _question(q, optionsByQuestion[q['key']] ?? const []),
      ],
    );
  }

  static Section _section(Row r) => Section(
    id: r['id']! as int,
    title: r['title']! as String,
    subtitle: r['subtitle']! as String,
    reviewTitle: r['review_title']! as String,
    layout: SectionLayout.values.byName(r['layout']! as String),
    searchable: r['searchable'] == 1,
    searchPlaceholder: r['search_placeholder'] as String?,
    bulkValue: r['bulk_value'] as String?,
  );

  static QuestionOption _option(Row r) => QuestionOption(
    value: r['value']! as String,
    label: r['label']! as String,
    tone: _enum(OptionTone.values, r['tone'], OptionTone.neutral),
    uf: r['uf'] as String?,
  );

  static Question _question(Row r, List<QuestionOption> options) {
    final c = jsonDecode(r['config']! as String) as Map<String, Object?>;
    final type = QuestionType.values.byName(r['type']! as String);
    final dep = c['dependsOn'] as Map<String, Object?>?;
    final hasSuspect = c['suspectMin'] != null || c['suspectMax'] != null;
    return Question(
      key: r['key']! as String,
      sectionId: r['section_id']! as int,
      position: r['position']! as int,
      type: type,
      label: r['label']! as String,
      sourceText: r['source_text']! as String,
      xlsxColumn: r['xlsx_column']! as int,
      options: options,
      cardId: c['card'] as String?,
      cardTitle: c['cardTitle'] as String?,
      labelStyle: _enum(LabelStyle.values, c['labelStyle'], LabelStyle.title),
      display: _enum(ChoiceDisplay.values, c['display'], ChoiceDisplay.radio),
      hint:
          _nonEmpty(c['hint']) ??
          (type == QuestionType.multi && c['hint'] == null ? _multiHint : null),
      placeholder: c['placeholder'] as String?,
      footnote: c['footnote'] as String?,
      suffix: c['suffix'] as String?,
      min: (c['min'] as num?)?.toInt(),
      max: (c['max'] as num?)?.toInt(),
      maxLength: (c['maxLength'] as num?)?.toInt(),
      dependsOn: dep == null
          ? null
          : QuestionDependency(
              key: dep['key']! as String,
              values: (dep['values'] as List?)?.cast<String>() ?? const [],
              notValues:
                  (dep['notValues'] as List?)?.cast<String>() ?? const [],
            ),
      conditionalNote: c['conditionalNote'] == true,
      suspect: hasSuspect
          ? SuspectRange(
              min: c['suspectMin'] as num?,
              max: c['suspectMax'] as num?,
              title: c['suspectTitle'] as String? ?? 'Valor fora do esperado',
              message:
                  c['suspectMessage'] as String? ??
                  '{value} parece incorreto. Confirme com o entrevistado.',
              reviewTag: c['reviewTag'] as String?,
            )
          : null,
      scaleVariant: _enum(
        ScaleVariant.values,
        c['variant'],
        ScaleVariant.plain,
      ),
      minLabel: c['minLabel'] as String?,
      maxLabel: c['maxLabel'] as String?,
      exteriorValue: c['exteriorValue'] as String?,
      exteriorLabel: c['exteriorLabel'] as String?,
      dayUseLabel: c['dayUseLabel'] as String?,
    );
  }

  static const _multiHint = 'Pode marcar mais de um';

  static String? _nonEmpty(Object? v) => v is String && v.isNotEmpty ? v : null;

  static T _enum<T extends Enum>(List<T> values, Object? name, T fallback) {
    for (final v in values) {
      if (v.name == name) return v;
    }
    return fallback;
  }
}
