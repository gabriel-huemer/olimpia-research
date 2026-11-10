import 'package:sqflite/sqflite.dart';

import '../../database/app_database.dart';
import '../../database/db_schema.dart';

typedef Row = Map<String, Object?>;

class SurveyLocalDataSource {
  SurveyLocalDataSource(this._database);

  final AppDatabase _database;

  static const _deviceIdKey = 'device_id';

  Future<String?> deviceId() async {
    final db = await _database.db;
    final rows = await db.query(
      DbSchema.meta,
      where: 'key = ?',
      whereArgs: [_deviceIdKey],
    );
    return rows.firstOrNull?['value'] as String?;
  }

  Future<void> saveDeviceId(String id) async {
    final db = await _database.db;
    await db.insert(DbSchema.meta, {
      'key': _deviceIdKey,
      'value': id,
    }, conflictAlgorithm: ConflictAlgorithm.ignore);
  }

  Future<Row?> draftOf(String researcherCode) async {
    final db = await _database.db;
    final rows = await db.query(
      DbSchema.surveys,
      where: 'researcher_code = ? AND status = ?',
      whereArgs: [researcherCode, 'draft'],
      orderBy: 'started_at DESC',
      limit: 1,
    );
    return rows.firstOrNull;
  }

  /// Inserts a survey with the next protocol of the researcher inside one transaction (no gaps/duplicates).
  Future<int> insertWithNextProtocol(Row row) async {
    final db = await _database.db;
    return db.transaction((txn) async {
      final result = await txn.rawQuery(
        'SELECT COALESCE(MAX(protocol), 0) + 1 AS next FROM ${DbSchema.surveys} WHERE researcher_code = ?',
        [row['researcher_code']],
      );
      final next = result.first['next']! as int;
      await txn.insert(DbSchema.surveys, {...row, 'protocol': next});
      return next;
    });
  }

  Future<({Row survey, List<Row> answers, List<Row> flags})?> full(
    String id,
  ) async {
    final db = await _database.db;
    final rows = await db.query(
      DbSchema.surveys,
      where: 'id = ?',
      whereArgs: [id],
    );
    if (rows.isEmpty) return null;
    return (
      survey: rows.first,
      answers: await db.query(
        DbSchema.answers,
        where: 'survey_id = ?',
        whereArgs: [id],
      ),
      flags: await db.query(
        DbSchema.flags,
        where: 'survey_id = ?',
        whereArgs: [id],
        orderBy: 'section_id',
      ),
    );
  }

  Future<List<Row>> history(String surveyId) async {
    final db = await _database.db;
    return db.query(
      DbSchema.answerHistory,
      where: 'survey_id = ?',
      whereArgs: [surveyId],
      orderBy: 'id',
    );
  }

  /// Upserts the answer and appends the audit entry when the value really changed.
  Future<void> saveAnswer({
    required String surveyId,
    required String questionKey,
    required String? encodedValue,
    required String changedBy,
    required String at,
  }) async {
    final db = await _database.db;
    await db.transaction((txn) async {
      final current = await txn.query(
        DbSchema.answers,
        columns: ['value'],
        where: 'survey_id = ? AND question_key = ?',
        whereArgs: [surveyId, questionKey],
      );
      final old = current.firstOrNull?['value'] as String?;
      if (old == encodedValue) return; // no change → no audit entry
      if (encodedValue == null) {
        await txn.delete(
          DbSchema.answers,
          where: 'survey_id = ? AND question_key = ?',
          whereArgs: [surveyId, questionKey],
        );
      } else {
        await txn.insert(DbSchema.answers, {
          'survey_id': surveyId,
          'question_key': questionKey,
          'value': encodedValue,
          'updated_at': at,
        }, conflictAlgorithm: ConflictAlgorithm.replace);
      }
      await txn.insert(DbSchema.answerHistory, {
        'survey_id': surveyId,
        'question_key': questionKey,
        'old_value': old,
        'new_value': encodedValue,
        'changed_at': at,
        'changed_by': changedBy,
      });
      await txn.update(
        DbSchema.surveys,
        {'updated_at': at},
        where: 'id = ?',
        whereArgs: [surveyId],
      );
    });
  }

  /// Replaces all flags of the survey, or only those of [sectionId].
  Future<void> replaceFlags(
    String surveyId,
    List<Row> flags, {
    int? sectionId,
  }) async {
    final db = await _database.db;
    await db.transaction((txn) async {
      await txn.delete(
        DbSchema.flags,
        where: sectionId == null
            ? 'survey_id = ?'
            : 'survey_id = ? AND section_id = ?',
        whereArgs: [surveyId, ?sectionId],
      );
      for (final f in flags) {
        await txn.insert(DbSchema.flags, f);
      }
    });
  }

  Future<void> update(String id, Row values) async {
    final db = await _database.db;
    await db.update(DbSchema.surveys, values, where: 'id = ?', whereArgs: [id]);
  }

  Future<void> updateMany(
    List<String> ids,
    Row values, {
    bool incrementAttempts = false,
  }) async {
    if (ids.isEmpty) return;
    final db = await _database.db;
    final marks = List.filled(ids.length, '?').join(',');
    final sets = [
      for (final k in values.keys) '$k = ?',
      if (incrementAttempts) 'sync_attempts = sync_attempts + 1',
    ];
    await db.rawUpdate(
      'UPDATE ${DbSchema.surveys} SET ${sets.join(', ')} WHERE id IN ($marks)',
      [...values.values, ...ids],
    );
  }

  Future<List<Row>> idsByStatus(String status, {int? limit}) async {
    final db = await _database.db;
    return db.query(
      DbSchema.surveys,
      columns: ['id'],
      where: 'status = ?',
      whereArgs: [status],
      orderBy: 'finished_at',
      limit: limit,
    );
  }

  Future<int> countByStatuses(List<String> statuses) async {
    final db = await _database.db;
    final marks = List.filled(statuses.length, '?').join(',');
    final r = await db.rawQuery(
      'SELECT COUNT(*) AS c FROM ${DbSchema.surveys} WHERE status IN ($marks)',
      statuses,
    );
    return r.first['c']! as int;
  }

  /// Completed surveys with origin city/state and flag count, newest first.
  Future<List<Row>> completedSummaries({
    String? researcherCode,
    String? fromUtc,
    String? toUtc,
  }) async {
    final db = await _database.db;
    final where = <String>["s.status <> 'draft'"];
    final args = <Object?>[];
    if (researcherCode != null) {
      where.add('s.researcher_code = ?');
      args.add(researcherCode);
    }
    if (fromUtc != null && toUtc != null) {
      where.add('s.finished_at >= ? AND s.finished_at < ?');
      args.addAll([fromUtc, toUtc]);
    }
    return db.rawQuery('''
      SELECT s.id, s.protocol, s.status, s.started_at, s.finished_at, s.synced_at,
        (SELECT value FROM ${DbSchema.answers} a WHERE a.survey_id = s.id AND a.question_key = 'cidade') AS city_value,
        (SELECT value FROM ${DbSchema.answers} a WHERE a.survey_id = s.id AND a.question_key = 'estado') AS state_value,
        (SELECT COUNT(*) FROM ${DbSchema.flags} f WHERE f.survey_id = s.id) AS flag_count
      FROM ${DbSchema.surveys} s
      WHERE ${where.join(' AND ')}
      ORDER BY s.finished_at DESC
    ''', args);
  }
}
