import 'dart:async';

import 'package:uuid/uuid.dart';

import '../../domain/entities/researcher.dart';
import '../../domain/entities/survey.dart';
import '../../domain/repositories/questionnaire_repository.dart';
import '../../domain/repositories/survey_repository.dart';
import '../datasources/local/survey_local_datasource.dart';
import '../mapper/survey_mapper.dart';

class SurveyRepositoryImpl implements SurveyRepository {
  SurveyRepositoryImpl(
    this._local,
    this._questionnaires, {
    Uuid uuid = const Uuid(),
    DateTime Function()? clock,
  }) : _uuid = uuid,
       _now = clock ?? DateTime.now;

  final SurveyLocalDataSource _local;
  final QuestionnaireRepository _questionnaires;
  final Uuid _uuid;
  final DateTime Function() _now;
  final _changes = StreamController<void>.broadcast();

  @override
  Stream<void> get changes => _changes.stream;

  void _notify() => _changes.add(null);

  String _ts() => _now().toUtc().toIso8601String();

  Future<String> _deviceId() async {
    final existing = await _local.deviceId();
    if (existing != null) return existing;
    final id = _uuid.v4();
    await _local.saveDeviceId(id);
    return (await _local.deviceId())!;
  }

  @override
  Future<Survey> startOrResume(Researcher researcher) async {
    final draft = await _local.draftOf(researcher.code);
    if (draft != null) return (await byId(draft['id']! as String))!;
    final now = _now();
    final survey = Survey(
      id: _uuid.v4(),
      protocol: 0,
      researcherCode: researcher.code,
      location: researcher.location,
      status: SurveyStatus.draft,
      startedAt: now,
      updatedAt: now,
      deviceId: await _deviceId(),
    );
    final questionnaire = await _questionnaires.load();
    await _local.insertWithNextProtocol(
      SurveyMapper.toRow(survey, questionnaireVersion: questionnaire.version),
    );
    _notify();
    return (await byId(survey.id))!;
  }

  @override
  Future<Survey?> byId(String id) async {
    final rows = await _local.full(id);
    return rows == null
        ? null
        : SurveyMapper.fromRows(
            rows.survey,
            answers: rows.answers,
            flags: rows.flags,
          );
  }

  @override
  Future<void> saveAnswer(
    String surveyId,
    String questionKey,
    Object? value, {
    required String changedBy,
  }) async {
    await _local.saveAnswer(
      surveyId: surveyId,
      questionKey: questionKey,
      encodedValue: SurveyMapper.encodeValue(value),
      changedBy: changedBy,
      at: _ts(),
    );
    _notify();
  }

  @override
  Future<void> saveFlags(
    String surveyId,
    List<SurveyFlag> flags, {
    int? sectionId,
  }) async {
    await _local.replaceFlags(surveyId, [
      for (final f in flags)
        if (sectionId == null || f.sectionId == sectionId)
          SurveyMapper.flagToRow(surveyId, f),
    ], sectionId: sectionId);
    _notify();
  }

  @override
  Future<Survey> complete(
    String surveyId, {
    required List<SurveyFlag> flags,
  }) async {
    await saveFlags(surveyId, flags);
    final ts = _ts();
    await _local.update(surveyId, {
      'status': SurveyStatus.pending.name,
      'finished_at': ts,
      'updated_at': ts,
    });
    _notify();
    return (await byId(surveyId))!;
  }

  @override
  Future<List<SurveySummary>> completedSummaries({
    String? researcherCode,
    DateTime? day,
  }) async {
    String? from, to;
    if (day != null) {
      final start = DateTime(day.year, day.month, day.day);
      from = start.toUtc().toIso8601String();
      to = start.add(const Duration(days: 1)).toUtc().toIso8601String();
    }
    final rows = await _local.completedSummaries(
      researcherCode: researcherCode,
      fromUtc: from,
      toUtc: to,
    );
    return rows.map(SurveyMapper.summaryFromRow).toList();
  }

  @override
  Future<int> queuedCount() => _local.countByStatuses([
    SurveyStatus.pending.name,
    SurveyStatus.sending.name,
  ]);

  @override
  Future<List<Survey>> takePending(int limit) async {
    final ids = await _local.idsByStatus(
      SurveyStatus.pending.name,
      limit: limit,
    );
    return [for (final row in ids) ?await byId(row['id']! as String)];
  }

  @override
  Future<List<AuditEntry>> history(String surveyId) async => [
    for (final h in await _local.history(surveyId))
      (
        questionKey: h['question_key']! as String,
        oldValue: SurveyMapper.decodeValue(h['old_value']),
        newValue: SurveyMapper.decodeValue(h['new_value']),
        changedAt: DateTime.parse(h['changed_at']! as String),
        changedBy: h['changed_by']! as String,
      ),
  ];

  @override
  Future<void> markSending(List<String> ids) async {
    await _local.updateMany(ids, {
      'status': SurveyStatus.sending.name,
    }, incrementAttempts: true);
    _notify();
  }

  @override
  Future<void> markSynced(List<String> ids, DateTime at) async {
    await _local.updateMany(ids, {
      'status': SurveyStatus.synced.name,
      'synced_at': at.toUtc().toIso8601String(),
      'last_error': null,
    });
    _notify();
  }

  @override
  Future<void> markFailed(List<String> ids, String error) async {
    await _local.updateMany(ids, {
      'status': SurveyStatus.pending.name,
      'last_error': error,
    });
    _notify();
  }

  @override
  Future<void> resetStuckSending() async {
    final ids = await _local.idsByStatus(SurveyStatus.sending.name);
    await _local.updateMany(
      [for (final r in ids) r['id']! as String],
      {'status': SurveyStatus.pending.name},
    );
  }
}
