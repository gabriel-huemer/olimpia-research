import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:oto_pesquisador/core/di/injector.dart';
import 'package:oto_pesquisador/data/database/app_database.dart';
import 'package:oto_pesquisador/data/database/db_schema.dart';
import 'package:oto_pesquisador/data/datasources/remote/sync_api.dart';
import 'package:oto_pesquisador/data/services/sync_service.dart';
import 'package:oto_pesquisador/domain/repositories/survey_repository.dart';
import 'package:path/path.dart' as p;
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'support/harness.dart';

class _Servidor implements CancelledApi {
  final recebidas = <Map<String, Object?>>[];
  bool foraDoAr = false;

  @override
  Future<List<String>> sendCancelled(List<Map<String, Object?>> cancelled) async {
    if (foraDoAr) throw const SocketException('sem rede');
    recebidas.addAll(cancelled);
    return [for (final c in cancelled) c['id']! as String];
  }
}

void main() {
  late Harness h;
  late _Servidor servidor;

  setUp(() async {
    servidor = _Servidor();
    h = await Harness.open(api: MockSyncApi(latency: Duration.zero), cancelledApi: servidor);
  });
  tearDown(() => h.close());

  test('cancelada guarda só o motivo, espera a internet e é enviada uma vez', () async {
    final r = await h.login();
    final surveys = sl<SurveyRepository>();
    final s = await surveys.startOrResume(r);
    await surveys.saveAnswer(s.id, 'idade', 40, changedBy: r.code);
    await surveys.discardDraft(s.id, reason: 'Turista desistiu');

    servidor.foraDoAr = true;
    await expectLater(sl<SyncService>().reportCancelled(), throwsA(isA<SocketException>()));
    expect(await surveys.cancelledToReport(50), hasLength(1));

    servidor.foraDoAr = false;
    await sl<SyncService>().reportCancelled();
    await sl<SyncService>().reportCancelled();
    expect(servidor.recebidas, hasLength(1));
    expect(servidor.recebidas.single.keys, {'id', 'pesquisador', 'motivo', 'iniciadaEm', 'canceladaEm'});
    expect(servidor.recebidas.single['motivo'], 'Turista desistiu');
  });

  test('pesquisa concluída não vira cancelada', () async {
    final s = await h.completedSurvey(await h.login(), {'idade': 30});
    await sl<SurveyRepository>().discardDraft(s.id, reason: 'x');
    expect(await sl<SurveyRepository>().cancelledToReport(50), isEmpty);
    expect(await sl<SurveyRepository>().byId(s.id), isNotNull);
  });

  test('aparelho com o banco da versão anterior é atualizado sem perder dados', () async {
    final path = p.join(h.directory.path, 'antigo.db');
    final antigo = await databaseFactoryFfi.openDatabase(
      path,
      options: OpenDatabaseOptions(
        version: 1,
        onCreate: (db, _) => db.execute('CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)'),
      ),
    );
    await antigo.insert('meta', {'key': 'k', 'value': 'v'});
    await antigo.close();
    final novo = AppDatabase(factory: databaseFactoryFfi, path: path);
    final db = await novo.db;
    expect(await db.query(DbSchema.cancelled), isEmpty);
    expect(await db.query('meta'), hasLength(1));
    await novo.close();
  });
}
