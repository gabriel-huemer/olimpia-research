import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

import 'db_schema.dart';

/// Opens the single SQLite database of the app (offline storage, RF07).
class AppDatabase {
  AppDatabase({DatabaseFactory? factory, String? path})
      : _factory = factory ?? databaseFactory,
        _path = path;

  static const fileName = 'oto_pesquisador.db';
  static const version = 1;

  final DatabaseFactory _factory;
  final String? _path;
  Database? _db;

  Future<Database> get db async => _db ??= await _open();

  Future<Database> _open() async {
    final path = _path ?? p.join(await _factory.getDatabasesPath(), fileName);
    return _factory.openDatabase(
      path,
      options: OpenDatabaseOptions(
        version: version,
        onConfigure: (db) => db.execute('PRAGMA foreign_keys = ON'),
        onCreate: (db, _) async {
          final batch = db.batch();
          for (final statement in DbSchema.create) {
            batch.execute(statement);
          }
          await batch.commit(noResult: true);
        },
      ),
    );
  }

  Future<void> close() async {
    await _db?.close();
    _db = null;
  }
}
