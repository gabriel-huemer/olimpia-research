import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:oto_pesquisador/core/di/injector.dart';
import 'package:oto_pesquisador/data/datasources/remote/researcher_api.dart';
import 'package:oto_pesquisador/data/datasources/remote/sync_api.dart';
import 'package:oto_pesquisador/domain/entities/researcher.dart';
import 'package:oto_pesquisador/domain/repositories/auth_repository.dart';
import 'package:oto_pesquisador/domain/repositories/survey_repository.dart';

import 'support/harness.dart';

class _Servidor implements ResearcherApi {
  Map<String, Researcher> cadastro = {};
  bool foraDoAr = false;

  @override
  Future<Researcher?> find(String code) async {
    if (foraDoAr) throw const SocketException('sem rede');
    return cadastro[code];
  }
}

void main() {
  late Harness h;
  late _Servidor servidor;
  const novo = Researcher(code: 'OTOK7M', name: 'Nova Pessoa', location: 'Praça da Matriz');

  setUp(() async {
    servidor = _Servidor()..cadastro = {'OTOK7M': novo};
    h = await Harness.open(api: MockSyncApi(latency: Duration.zero), researcherApi: servidor);
  });
  tearDown(() => h.close());

  AuthRepository auth() => sl<AuthRepository>();

  test('pesquisador cadastrado no painel entra, e depois entra sem internet', () async {
    expect((await auth().login('oto-k7m'))?.name, 'Nova Pessoa');
    await auth().logout();
    servidor.foraDoAr = true;
    expect((await auth().login('OTOK7M'))?.code, 'OTOK7M');
  });

  test('primeira entrada sem internet avisa, em vez de dizer que o código é inválido', () async {
    servidor.foraDoAr = true;
    await expectLater(auth().login('OTOK7M'), throwsA(isA<LoginUnavailableException>()));
  });

  test('com servidor, a lista de demonstração não serve para entrar', () async {
    expect(await auth().login('OTO482'), isNull);
    servidor.foraDoAr = true;
    await expectLater(auth().login('OTO482'), throwsA(isA<LoginUnavailableException>()));
  });

  test('código desativado deixa de entrar também offline, e a fila é preservada', () async {
    await h.completedSurvey((await auth().login('OTOK7M'))!, {'idade': 30});
    await auth().logout();
    servidor.cadastro = {};
    expect(await auth().login('OTOK7M'), isNull);
    servidor.foraDoAr = true;
    await expectLater(auth().login('OTOK7M'), throwsA(isA<LoginUnavailableException>()));
    expect(await sl<SurveyRepository>().queuedCount(), 1);
  });

  group('HttpResearcherApi', () {
    ResearcherApi api(int status, String corpo) =>
        HttpResearcherApi(baseUrl: 'http://x', token: 't', client: MockClient((req) async {
          expect(req.url.path, '/api/v1/pesquisador');
          expect(req.headers['Authorization'], 'Bearer t');
          return http.Response(corpo, status);
        }));

    test('lê o pesquisador', () async {
      final r = await api(200, '{"codigo":"OTOK7M","nome":"Nova","local":"X"}').find('OTOK7M');
      expect(r?.name, 'Nova');
    });
    test('404 da API é código desconhecido; 404 de outra página é erro', () async {
      expect(await api(404, '{"error":"x"}').find('A'), isNull);
      await expectLater(api(404, '<html>').find('A'), throwsA(isA<SyncApiException>()));
    });
    for (final s in [401, 429, 503]) {
      test('HTTP $s é erro, não código inválido', () async {
        await expectLater(api(s, '{"error":"x"}').find('A'), throwsA(isA<SyncApiException>()));
      });
    }
  });

  test('cancelar a entrevista apaga só o rascunho (RF23)', () async {
    final r = (await auth().login('OTOK7M'))!;
    final surveys = sl<SurveyRepository>();
    final concluida = await h.completedSurvey(r, {'idade': 30});
    final rascunho = await surveys.startOrResume(r);
    await surveys.saveAnswer(rascunho.id, 'idade', 40, changedBy: r.code);
    await surveys.discardDraft(rascunho.id, reason: 'Turista desistiu');
    await surveys.discardDraft(concluida.id, reason: 'x');
    expect(await surveys.byId(rascunho.id), isNull);
    expect(await surveys.byId(concluida.id), isNotNull);
    expect(await surveys.history(rascunho.id), isEmpty);
  });
}
