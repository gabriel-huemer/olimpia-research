import 'package:flutter_test/flutter_test.dart';
import 'package:oto_pesquisador/core/di/injector.dart';
import 'package:oto_pesquisador/data/datasources/remote/sync_api.dart';
import 'package:oto_pesquisador/domain/entities/survey.dart';
import 'package:oto_pesquisador/domain/repositories/auth_repository.dart';
import 'package:oto_pesquisador/domain/repositories/survey_repository.dart';

import 'support/harness.dart';

void main() {
  late Harness h;
  setUp(() async => h = await Harness.open(api: MockSyncApi(latency: Duration.zero)));
  tearDown(() => h.close());

  group('login do pesquisador (offline)', () {
    test('aceita o código com qualquer formatação', () async {
      for (final c in ['OTO482', 'oto-482', ' oto 482 ']) {
        final r = await sl<AuthRepository>().login(c);
        expect(r?.code, 'OTO482', reason: c);
        expect(r?.displayCode, 'OTO-482');
      }
    });

    test('código desconhecido ou vazio não entra', () async {
      expect(await sl<AuthRepository>().login('ZZZ999'), isNull);
      expect(await sl<AuthRepository>().login(''), isNull);
    });

    test('a sessão persiste e logout encerra', () async {
      await sl<AuthRepository>().login('OTO482');
      expect((await sl<AuthRepository>().currentResearcher())?.code, 'OTO482');
      await sl<AuthRepository>().logout();
      expect(await sl<AuthRepository>().currentResearcher(), isNull);
    });
  });

  group('pesquisa', () {
    test('o protocolo é sequencial por pesquisador', () async {
      final r = await h.login();
      final s1 = await h.completedSurvey(r, {'idade': 30});
      final s2 = await h.completedSurvey(r, {'idade': 31});
      expect(s2.protocol, s1.protocol + 1);
      expect(s1.researcherCode, 'OTO482');
      expect(s1.location, r.location);
    });

    test('pesquisa concluída entra na fila como pendente', () async {
      final r = await h.login();
      final s = await h.completedSurvey(r, {'idade': 500});
      expect(s.status, SurveyStatus.pending);
      expect(s.finishedAt, isNotNull);
      expect(await sl<SurveyRepository>().queuedCount(), 1);
    });

    test('reabrir o app retoma o rascunho, que não vai para a fila', () async {
      final r = await h.login();
      final surveys = sl<SurveyRepository>();
      final a = await surveys.startOrResume(r);
      final b = await surveys.startOrResume(r);
      expect(b.id, a.id);
      expect(await surveys.queuedCount(), 0);
    });

    test('o histórico registra só alterações reais de resposta', () async {
      final r = await h.login();
      final surveys = sl<SurveyRepository>();
      final s = await surveys.startOrResume(r);
      await surveys.saveAnswer(s.id, 'idade', 20, changedBy: r.code);
      await surveys.saveAnswer(s.id, 'idade', 20, changedBy: r.code);
      await surveys.saveAnswer(s.id, 'idade', 21, changedBy: r.code);
      final hist = await surveys.history(s.id);
      expect(hist, hasLength(2));
      expect(hist.every((e) => e.changedBy == 'OTO482'), isTrue);
    });
  });
}
