import 'package:flutter_test/flutter_test.dart';
import 'package:oto_pesquisador/core/di/injector.dart';
import 'package:oto_pesquisador/data/datasources/remote/sync_api.dart';
import 'package:oto_pesquisador/data/services/connectivity_service.dart';
import 'package:oto_pesquisador/data/services/sync_service.dart';
import 'package:oto_pesquisador/domain/repositories/survey_repository.dart';

import 'support/harness.dart';

/// API de teste: registra cada lote e responde conforme o roteiro.
class ScriptedApi implements SyncApi {
  ScriptedApi(this.respond);

  final Future<BatchResult> Function(int call, List<Map<String, Object?>> surveys) respond;
  final List<List<String>> batches = [];

  @override
  Future<BatchResult> sendBatch(List<Map<String, Object?>> surveys) {
    batches.add([for (final s in surveys) s['id']! as String]);
    return respond(batches.length, surveys);
  }
}

Future<BatchResult> acceptAll(int _, List<Map<String, Object?>> s) async =>
    BatchResult(accepted: [for (final x in s) x['id']! as String]);

void main() {
  late Harness h;

  Future<ScriptedApi> boot(Future<BatchResult> Function(int, List<Map<String, Object?>>) respond) async {
    final api = ScriptedApi(respond);
    h = await Harness.open(api: api);
    return api;
  }

  tearDown(() async {
    await sl<SyncService>().dispose();
    await h.close();
  });

  test('offline: nada é enviado e a fila é mantida', () async {
    final api = await boot(acceptAll);
    final r = await h.login();
    await h.completedSurvey(r, {'idade': 30});
    sl<ConnectivityService>().online.value = false;
    await sl<SyncService>().syncNow();
    expect(api.batches, isEmpty);
    expect(await sl<SurveyRepository>().queuedCount(), 1);
  });

  test('fila vazia: não chama a API', () async {
    final api = await boot(acceptAll);
    sl<ConnectivityService>().online.value = true;
    await sl<SyncService>().syncNow();
    expect(api.batches, isEmpty);
  });

  test('divide a fila em lotes de no máximo 5 e esvazia tudo', () async {
    final api = await boot(acceptAll);
    final r = await h.login();
    for (var i = 0; i < 7; i++) {
      await h.completedSurvey(r, {'idade': 20 + i});
    }
    sl<ConnectivityService>().online.value = true;
    await sl<SyncService>().syncNow();
    expect(api.batches.map((b) => b.length), [5, 2]);
    expect(await sl<SurveyRepository>().queuedCount(), 0);
    expect(sl<SyncService>().progress.value.sent, 7);
  });

  test('falha de rede: o lote volta para a fila, nada se perde, e o erro é informado', () async {
    final api = await boot((call, s) async => throw const SyncApiException('HTTP 503'));
    final r = await h.login();
    final s1 = await h.completedSurvey(r, {'idade': 30});
    sl<ConnectivityService>().online.value = true;
    await sl<SyncService>().syncNow();
    expect(api.batches, hasLength(1));
    expect(await sl<SurveyRepository>().queuedCount(), 1);
    expect(sl<SyncService>().progress.value.lastError, contains('HTTP 503'));
    expect((await sl<SurveyRepository>().byId(s1.id))!.status.isQueued, isTrue);
  });

  test('depois da falha, nova tentativa envia a mesma pesquisa (sem duplicar)', () async {
    final api = await boot((call, s) async {
      if (call == 1) throw const SyncApiException('HTTP 500');
      return acceptAll(call, s);
    });
    final r = await h.login();
    final s1 = await h.completedSurvey(r, {'idade': 30});
    sl<ConnectivityService>().online.value = true;
    await sl<SyncService>().syncNow();
    await sl<SyncService>().syncNow();
    expect(api.batches, [
      [s1.id],
      [s1.id],
    ]);
    expect(await sl<SurveyRepository>().queuedCount(), 0);
  });

  test('pesquisa rejeitada fica na fila com o motivo e não entra em laço', () async {
    late String rejeitada;
    final api = await boot((call, s) async {
      rejeitada = s.first['id']! as String;
      return BatchResult(accepted: const [], rejected: {rejeitada: 'pesquisador não cadastrado'});
    });
    final r = await h.login();
    await h.completedSurvey(r, {'idade': 30});
    sl<ConnectivityService>().online.value = true;
    await sl<SyncService>().syncNow();
    expect(api.batches, hasLength(1), reason: 'não reenvia em laço');
    expect(await sl<SurveyRepository>().queuedCount(), 1);
    expect(rejeitada, isNotEmpty);
  });

  test('aceita parte do lote: as aceitas saem da fila e as demais continuam', () async {
    String? invalida;
    await boot((call, s) async {
      final ids = [for (final x in s) x['id']! as String];
      invalida ??= ids.last;
      return BatchResult(
        accepted: ids.where((id) => id != invalida).toList(),
        rejected: {if (ids.contains(invalida)) invalida!: 'inválida'},
      );
    });
    final r = await h.login();
    await h.completedSurvey(r, {'idade': 30});
    await h.completedSurvey(r, {'idade': 31});
    sl<ConnectivityService>().online.value = true;
    await sl<SyncService>().syncNow();
    expect(await sl<SurveyRepository>().queuedCount(), 1);
  });

  test('o conteúdo enviado respeita o contrato do painel', () async {
    List<Map<String, Object?>>? enviado;
    await boot((c, s) async {
      enviado = s;
      return acceptAll(c, s);
    });
    final r = await h.login();
    await h.completedSurvey(r, {'idade': 30, 'genero': 'Feminino'});
    sl<ConnectivityService>().online.value = true;
    await sl<SyncService>().syncNow();
    final p = enviado!.single;
    expect(p.keys, containsAll(['id', 'protocolo', 'pesquisador', 'local', 'dispositivo', 'versaoQuestionario', 'iniciadaEm', 'finalizadaEm', 'respostas', 'sinalizacoes', 'historico']));
    expect(p['pesquisador'], 'OTO482');
    expect(p['protocolo'], isA<int>());
    final respostas = {for (final x in p['respostas']! as List) (x as Map)['chave']: x['valor']};
    expect(respostas['idade'], 30);
    expect(respostas['genero'], 'Feminino');
    expect((p['iniciadaEm']! as String).endsWith('Z'), isTrue, reason: 'datas em UTC');
  });
}
