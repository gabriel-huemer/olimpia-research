import 'package:sqflite/sqflite.dart';

import '../../database/app_database.dart';
import '../../database/db_schema.dart';

class SessionLocalDataSource {
  SessionLocalDataSource(this._database);

  final AppDatabase _database;

  Future<Map<String, Object?>?> researcher(String code) async {
    final db = await _database.db;
    final rows = await db.query(DbSchema.researchers, where: 'code = ?', whereArgs: [code]);
    return rows.firstOrNull;
  }

  Future<Map<String, Object?>?> currentResearcher() async {
    final db = await _database.db;
    final rows = await db.rawQuery(
      'SELECT r.* FROM ${DbSchema.session} s JOIN ${DbSchema.researchers} r ON r.code = s.researcher_code WHERE s.id = 1',
    );
    return rows.firstOrNull;
  }

  Future<void> saveResearcher(String code, String name, String location) async {
    final db = await _database.db;
    await db.insert(
      DbSchema.researchers,
      {'code': code, 'name': name, 'location': location},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// Removes the code from the offline list. Surveys of this code stay in the queue.
  Future<void> forgetResearcher(String code) async {
    final db = await _database.db;
    await db.transaction((txn) async {
      await txn.delete(DbSchema.session, where: 'researcher_code = ?', whereArgs: [code]);
      await txn.delete(DbSchema.researchers, where: 'code = ?', whereArgs: [code]);
    });
  }

  Future<void> open(String code) async {
    final db = await _database.db;
    await db.insert(
      DbSchema.session,
      {'id': 1, 'researcher_code': code, 'logged_at': DateTime.now().toUtc().toIso8601String()},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> close() async {
    final db = await _database.db;
    await db.delete(DbSchema.session);
  }
}
