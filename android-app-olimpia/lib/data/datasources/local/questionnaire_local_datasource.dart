import 'package:sqflite/sqflite.dart';

import '../../database/app_database.dart';
import '../../database/db_schema.dart';

typedef Row = Map<String, Object?>;

/// SQLite cache of the questionnaire, cities and researchers.
class QuestionnaireLocalDataSource {
  QuestionnaireLocalDataSource(this._database);

  final AppDatabase _database;

  static const questionnaireVersionKey = 'questionnaire_version';
  static const citiesVersionKey = 'cities_version';
  static const researchersVersionKey = 'researchers_version';

  Future<int?> metaInt(String key) async {
    final db = await _database.db;
    final rows = await db.query(DbSchema.meta, where: 'key = ?', whereArgs: [key]);
    return rows.isEmpty ? null : int.tryParse(rows.first['value']! as String);
  }

  Future<void> _setMeta(Transaction txn, String key, Object value) =>
      txn.insert(DbSchema.meta, {'key': key, 'value': '$value'}, conflictAlgorithm: ConflictAlgorithm.replace);

  /// Replaces the questionnaire atomically (old version is kept if anything fails).
  Future<void> replaceQuestionnaire({
    required int version,
    required List<Row> sections,
    required List<Row> questions,
    required List<Row> options,
  }) async {
    final db = await _database.db;
    await db.transaction((txn) async {
      await txn.delete(DbSchema.options);
      await txn.delete(DbSchema.questions);
      await txn.delete(DbSchema.sections);
      final batch = txn.batch();
      for (final r in sections) {
        batch.insert(DbSchema.sections, r);
      }
      for (final r in questions) {
        batch.insert(DbSchema.questions, r);
      }
      for (final r in options) {
        batch.insert(DbSchema.options, r);
      }
      await batch.commit(noResult: true);
      await _setMeta(txn, questionnaireVersionKey, version);
    });
  }

  Future<void> replaceCities(int version, List<Row> cities) async {
    final db = await _database.db;
    await db.transaction((txn) async {
      await txn.delete(DbSchema.cities);
      final batch = txn.batch();
      for (final r in cities) {
        batch.insert(DbSchema.cities, r);
      }
      await batch.commit(noResult: true);
      await _setMeta(txn, citiesVersionKey, version);
    });
  }

  Future<void> upsertResearchers(int version, List<Row> researchers) async {
    final db = await _database.db;
    await db.transaction((txn) async {
      final batch = txn.batch();
      for (final r in researchers) {
        batch.insert(DbSchema.researchers, r, conflictAlgorithm: ConflictAlgorithm.replace);
      }
      await batch.commit(noResult: true);
      await _setMeta(txn, researchersVersionKey, version);
    });
  }

  Future<({List<Row> sections, List<Row> questions, List<Row> options})> readQuestionnaire() async {
    final db = await _database.db;
    return (
      sections: await db.query(DbSchema.sections, orderBy: 'id'),
      questions: await db.query(DbSchema.questions, orderBy: 'section_id, position'),
      options: await db.query(DbSchema.options, orderBy: 'question_key, position'),
    );
  }

  /// Prefix matches first, then "contains" matches. [normalized] must be accent-free lowercase.
  Future<List<Row>> searchCities(String normalized, {String? uf, required int limit}) async {
    final db = await _database.db;
    final ufFilter = uf == null ? '' : 'uf = ? AND ';
    final ufArgs = uf == null ? const <Object>[] : [uf];
    return db.rawQuery(
      'SELECT name, uf, CASE WHEN search_name LIKE ? THEN 0 ELSE 1 END AS rank '
      'FROM ${DbSchema.cities} WHERE $ufFilter search_name LIKE ? '
      'ORDER BY rank, name LIMIT ?',
      ['$normalized%', ...ufArgs, '%$normalized%', limit],
    );
  }
}
