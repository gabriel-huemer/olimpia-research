import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;
import 'package:oto_pesquisador/core/di/injector.dart';
import 'package:oto_pesquisador/data/database/app_database.dart';
import 'package:oto_pesquisador/data/datasources/remote/sync_api.dart';
import 'package:oto_pesquisador/domain/entities/questionnaire.dart';
import 'package:oto_pesquisador/domain/repositories/questionnaire_repository.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late AppDatabase database;
  late Directory dir;
  late Questionnaire q;

  setUpAll(sqfliteFfiInit);

  setUp(() async {
    await sl.reset();
    dir = await Directory.systemTemp.createTemp('oto_day_use_test_');
    database = AppDatabase(factory: databaseFactoryFfi, path: p.join(dir.path, 'test.db'));
    await configureDependencies(database: database, syncApi: MockSyncApi(latency: Duration.zero));
    await sl<QuestionnaireRepository>().ensureCached();
    q = await sl<QuestionnaireRepository>().load();
  });

  tearDown(() async {
    await database.close();
    await sl.reset();
    await dir.delete(recursive: true);
  });

  List<String> missing(Map<String, Object?> answers) =>
      q.unansweredOf(2, answers).map((x) => x.key).where((k) => k.startsWith('data_') || k == 'pernoites').toList();

  test('day use does not ask for arrival and departure dates', () {
    expect(missing({'pernoites': 0}), isEmpty);
    expect(missing({'pernoites': 0, 'data_chegada': '2026-11-23'}), isEmpty);
  });

  test('without day use, blank dates are still listed', () {
    expect(missing({}), ['data_chegada', 'data_partida', 'pernoites']);
    expect(missing({'pernoites': 2}), ['data_chegada', 'data_partida']);
  });

  test('other blank questions of the section are still listed', () {
    final all = q.unansweredOf(2, {}).map((x) => x.key).toSet();
    final withDayUse = q.unansweredOf(2, {'pernoites': 0}).map((x) => x.key).toSet();
    expect(all.difference(withDayUse), {'data_chegada', 'data_partida', 'pernoites'});
  });
}
