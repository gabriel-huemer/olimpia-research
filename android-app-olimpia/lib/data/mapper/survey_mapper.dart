import 'dart:convert';

import '../../domain/entities/city.dart';
import '../../domain/entities/survey.dart';

typedef Row = Map<String, Object?>;

/// SQLite rows <-> survey entities. Answers are stored as JSON text.
abstract final class SurveyMapper {
  static String? encodeValue(Object? value) =>
      value == null ? null : jsonEncode(value);

  static Object? decodeValue(Object? raw) =>
      raw is String ? jsonDecode(raw) : null;

  static String _ts(DateTime d) => d.toUtc().toIso8601String();

  static DateTime? _date(Object? raw) =>
      raw is String ? DateTime.parse(raw).toLocal() : null;

  static Row toRow(Survey s, {required int questionnaireVersion}) => {
    'id': s.id,
    'protocol': s.protocol,
    'researcher_code': s.researcherCode,
    'location': s.location,
    'status': s.status.name,
    'started_at': _ts(s.startedAt),
    'updated_at': _ts(s.updatedAt),
    'finished_at': s.finishedAt == null ? null : _ts(s.finishedAt!),
    'synced_at': s.syncedAt == null ? null : _ts(s.syncedAt!),
    'device_id': s.deviceId,
    'questionnaire_version': questionnaireVersion,
  };

  static Survey fromRows(
    Row row, {
    List<Row> answers = const [],
    List<Row> flags = const [],
  }) => Survey(
    id: row['id']! as String,
    protocol: row['protocol']! as int,
    researcherCode: row['researcher_code']! as String,
    location: row['location']! as String,
    status: SurveyStatus.values.byName(row['status']! as String),
    startedAt: _date(row['started_at'])!,
    updatedAt: _date(row['updated_at'])!,
    finishedAt: _date(row['finished_at']),
    syncedAt: _date(row['synced_at']),
    deviceId: row['device_id']! as String,
    answers: {
      for (final a in answers)
        a['question_key']! as String: decodeValue(a['value']),
    },
    flags: flags.map(flagFromRow).toList(),
  );

  static Row flagToRow(String surveyId, SurveyFlag f) => {
    'survey_id': surveyId,
    'rule_id': f.ruleId,
    'question_key': f.questionKey,
    'section_id': f.sectionId,
    'title': f.title,
    'message': f.message,
    'review_tag': f.reviewTag,
    'status': f.status.name,
    'created_at': _ts(f.createdAt),
  };

  static SurveyFlag flagFromRow(Row r) => SurveyFlag(
    ruleId: r['rule_id']! as String,
    questionKey: r['question_key']! as String,
    sectionId: r['section_id']! as int,
    title: r['title']! as String,
    message: r['message']! as String,
    reviewTag: r['review_tag']! as String,
    status: FlagStatus.values.byName(r['status']! as String),
    createdAt: _date(r['created_at'])!,
  );

  /// Row from the summary query (survey + city answer + flag count).
  static SurveySummary summaryFromRow(Row r) {
    final city = City.fromAnswer(decodeValue(r['city_value']));
    final state = decodeValue(r['state_value']) as String?;
    return SurveySummary(
      id: r['id']! as String,
      protocol: r['protocol']! as int,
      status: SurveyStatus.values.byName(r['status']! as String),
      startedAt: _date(r['started_at'])!,
      finishedAt: _date(r['finished_at']),
      syncedAt: _date(r['synced_at']),
      city: city?.name,
      uf: city?.uf ?? (state == null ? null : _ufOf(state)),
      flagCount: (r['flag_count'] as int?) ?? 0,
      abroad: state == abroadValue,
    );
  }

  /// Spreadsheet value for "Reside no exterior".
  static const abroadValue = 'Residente Exterior';

  static String? _ufOf(String state) {
    final open = state.lastIndexOf('(');
    final close = state.lastIndexOf(')');
    return open >= 0 && close > open ? state.substring(open + 1, close) : null;
  }
}
