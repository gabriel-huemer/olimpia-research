import 'package:flutter_test/flutter_test.dart';
import 'package:oto_pesquisador/core/di/injector.dart';
import 'package:oto_pesquisador/data/datasources/remote/sync_api.dart';
import 'package:oto_pesquisador/domain/repositories/questionnaire_repository.dart';
import 'package:oto_pesquisador/domain/rules/suspicion_rules.dart';

import 'support/harness.dart';

void main() {
  late Harness h;
  late SuspicionRuleEngine engine;

  setUp(() async {
    h = await Harness.open(api: MockSyncApi(latency: Duration.zero));
    engine = SuspicionRuleEngine(await sl<QuestionnaireRepository>().load());
  });
  tearDown(() => h.close());

  Set<String> ids(Map<String, Object?> answers) => engine.evaluate(answers).map((r) => r.ruleId).toSet();

  test('respostas dentro do esperado não geram sinalização', () {
    expect(ids({'idade': 35, 'pernoites': 3, 'gasto_diario': 300}), isEmpty);
  });

  test('idade absurda é sinalizada, com a mensagem contendo o valor', () {
    for (final idade in [150, 500]) {
      final hit = engine.evaluate({'idade': idade}).singleWhere((r) => r.ruleId == 'range:idade');
      expect(hit.message, contains('$idade'));
      expect(hit.inline, isTrue);
    }
  });

  test('"Sozinho(a)" sem acompanhantes é válido; com acompanhantes é sinalizado', () {
    expect(ids({'com_quem': ['Sozinho(a)']}), isNot(contains('alone_with_companions')));
    expect(ids({'com_quem': ['Sozinho(a)'], 'acomp_0_12': 0, 'acomp_13_17': 0}), isNot(contains('alone_with_companions')));
    final um = engine.evaluate({'com_quem': ['Sozinho(a)'], 'acomp_18_29': 1}).singleWhere((r) => r.ruleId == 'alone_with_companions');
    expect(um.message, contains('1 acompanhante.'), reason: 'singular');
    final tres = engine.evaluate({'com_quem': ['Sozinho(a)'], 'acomp_18_29': 1, 'acomp_30_44': 2}).singleWhere((r) => r.ruleId == 'alone_with_companions');
    expect(tres.message, contains('3 acompanhantes'));
  });

  test('viajar acompanhado sem marcar "Sozinho(a)" não é sinalizado', () {
    expect(ids({'com_quem': ['Família'], 'acomp_30_44': 2}), isNot(contains('alone_with_companions')));
  });

  test('partida antes da chegada é sinalizada; mesmo dia ou depois, não', () {
    expect(ids({'data_chegada': '2026-10-27', 'data_partida': '2026-10-24'}), contains('departure_before_arrival'));
    expect(ids({'data_chegada': '2026-10-27', 'data_partida': '2026-10-27'}), isNot(contains('departure_before_arrival')));
    expect(ids({'data_chegada': '2026-10-27', 'data_partida': '2026-10-30'}), isNot(contains('departure_before_arrival')));
    expect(ids({'data_chegada': '2026-10-27'}), isNot(contains('departure_before_arrival')));
  });

  test('a regra da data oferece limpar data_partida ao corrigir', () {
    final hit = engine.evaluate({'data_chegada': '2026-10-27', 'data_partida': '2026-10-24'}).singleWhere((r) => r.ruleId == 'departure_before_arrival');
    expect(hit.clearOnCorrect, 'data_partida');
  });

  test('várias regras podem disparar juntas e nenhuma bloqueia o fluxo', () {
    final hits = engine.evaluate({
      'idade': 500,
      'com_quem': ['Sozinho(a)'],
      'acomp_30_44': 2,
      'data_chegada': '2026-10-27',
      'data_partida': '2026-10-24',
    });
    expect(hits.map((r) => r.ruleId), containsAll(['range:idade', 'alone_with_companions', 'departure_before_arrival']));
  });
}
