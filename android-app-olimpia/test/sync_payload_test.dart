import 'package:flutter_test/flutter_test.dart';
import 'package:oto_pesquisador/core/di/injector.dart';
import 'package:oto_pesquisador/data/datasources/remote/sync_api.dart';
import 'package:oto_pesquisador/data/mapper/sync_payload_mapper.dart';
import 'package:oto_pesquisador/domain/repositories/questionnaire_repository.dart';
import 'package:oto_pesquisador/domain/repositories/survey_repository.dart';

import 'support/harness.dart';

// O payload é o contrato com POST /api/v1/pesquisas/lote do painel (dashboard/src/lib/ingestao).
void main() {
  late Harness h;
  setUp(() async => h = await Harness.open(api: MockSyncApi(latency: Duration.zero)));
  tearDown(() => h.close());

  Future<Map<String, Object?>> payloadOf(Map<String, Object?> answers) async {
    final r = await h.login();
    final s = await h.completedSurvey(r, answers);
    final q = await sl<QuestionnaireRepository>().load();
    final surveys = sl<SurveyRepository>();
    return SyncPayloadMapper.toJson((await surveys.byId(s.id))!, q, await surveys.history(s.id));
  }

  Map<String, Object?> respostas(Map<String, Object?> p) => {
    for (final x in p['respostas']! as List) (x as Map)['chave'] as String: x['valor'],
  };

  test('campos de identificação e datas em UTC', () async {
    final p = await payloadOf({'idade': 30});
    expect(p['pesquisador'], 'OTO482');
    expect(p['id'], isA<String>());
    expect(p['dispositivo'], isA<String>());
    expect(p['versaoQuestionario'], isNotNull);
    expect((p['iniciadaEm']! as String).endsWith('Z'), isTrue);
    expect((p['finalizadaEm']! as String).endsWith('Z'), isTrue);
  });

  test('múltipla escolha vai como texto separado por vírgula (formato Google Forms)', () async {
    final p = await payloadOf({'com_quem': ['Sozinho(a)', 'Família']});
    expect(respostas(p)['com_quem'], 'Sozinho(a), Família');
  });

  test('cidade única vai só com o nome; cidades múltiplas como "Nome, UF; Nome, UF"', () async {
    final p = await payloadOf({
      'cidade': {'name': 'Marília', 'uf': 'SP'},
      'destinos': [
        {'name': 'Barretos', 'uf': 'SP'},
        {'name': 'Caldas Novas', 'uf': 'GO'},
      ],
    });
    final r = respostas(p);
    expect(r['cidade'], 'Marília');
    expect(r['destinos'], 'Barretos, SP; Caldas Novas, GO');
  });

  test('só entram respostas que existem; números e textos mantêm o tipo', () async {
    final p = await payloadOf({'idade': 30, 'gasto_diario': 250});
    final r = respostas(p);
    expect(r.keys, containsAll(['idade', 'gasto_diario']));
    expect(r.containsKey('nps'), isFalse);
    expect(r['idade'], isA<int>());
  });

  test('cada resposta carrega a coluna da planilha e o texto da pergunta', () async {
    final p = await payloadOf({'idade': 30});
    final idade = (p['respostas']! as List).cast<Map>().firstWhere((x) => x['chave'] == 'idade');
    expect(idade.keys, containsAll(['chave', 'colunaPlanilha', 'pergunta', 'valor']));
  });

  test('o histórico de alterações vai junto, com autor e valores anterior e novo', () async {
    final r = await h.login();
    final surveys = sl<SurveyRepository>();
    final s = await surveys.startOrResume(r);
    await surveys.saveAnswer(s.id, 'idade', 500, changedBy: r.code);
    await surveys.saveAnswer(s.id, 'idade', 50, changedBy: r.code);
    final done = await surveys.complete(s.id, flags: const []);
    final q = await sl<QuestionnaireRepository>().load();
    final p = SyncPayloadMapper.toJson(done, q, await surveys.history(s.id));
    final hist = (p['historico']! as List).cast<Map>();
    expect(hist, hasLength(2));
    expect(hist.last['alteradoPor'], 'OTO482');
    expect(hist.last['chave'], 'idade');
    expect(p['sinalizacoes'], isEmpty);
  });
}
