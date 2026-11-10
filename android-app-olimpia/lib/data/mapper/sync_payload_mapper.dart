import '../../domain/entities/questionnaire.dart';
import '../../domain/entities/survey.dart';

/// Builds the JSON sent to the REST batch endpoint.
///
/// Each answer carries the spreadsheet column/header so the backend can export
/// to the same layout as "PLANILHA TABULAÇÃO PESQUISA DEMANDA TURISTICA 2026".
abstract final class SyncPayloadMapper {
  static Map<String, Object?> toJson(
    Survey s,
    Questionnaire q,
    List<AuditEntry> history,
  ) => {
    'id': s.id,
    'protocolo': s.protocol,
    'pesquisador': s.researcherCode,
    'local': s.location,
    'dispositivo': s.deviceId,
    'versaoQuestionario': q.version,
    'iniciadaEm': s.startedAt.toUtc().toIso8601String(),
    'finalizadaEm': s.finishedAt?.toUtc().toIso8601String(),
    'respostas': [
      for (final question in q.questions)
        if (s.answers.containsKey(question.key))
          {
            'chave': question.key,
            'colunaPlanilha': question.xlsxColumn,
            'pergunta': question.sourceText,
            'valor': _exportValue(question, s.answers[question.key]),
          },
    ],
    'sinalizacoes': [
      for (final f in s.flags)
        {
          'regra': f.ruleId,
          'chave': f.questionKey,
          'titulo': f.title,
          'mensagem': f.message,
          'status': f.status.name,
          'criadaEm': f.createdAt.toUtc().toIso8601String(),
        },
    ],
    'historico': [
      for (final h in history)
        {
          'chave': h.questionKey,
          'anterior': h.oldValue,
          'novo': h.newValue,
          'alteradoEm': h.changedAt.toUtc().toIso8601String(),
          'alteradoPor': h.changedBy,
        },
    ],
  };

  /// Multi answers are exported like Google Forms: "A, B, C".
  static Object? _exportValue(Question q, Object? value) => switch (value) {
    final List<Object?> list when q.type == QuestionType.multi => list.join(
      ', ',
    ),
    final List<Object?> list when q.type == QuestionType.cityMulti =>
      list
          .whereType<Map<Object?, Object?>>()
          .map((c) => '${c['name']}, ${c['uf']}')
          .join('; '),
    {'name': final Object? name, 'uf': _} when q.type == QuestionType.city =>
      name,
    _ => value,
  };
}
