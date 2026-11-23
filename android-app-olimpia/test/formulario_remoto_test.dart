import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:oto_pesquisador/core/di/injector.dart';
import 'package:oto_pesquisador/data/datasources/remote/questionnaire_api.dart';
import 'package:oto_pesquisador/data/datasources/remote/sync_api.dart';
import 'package:oto_pesquisador/domain/entities/questionnaire.dart';
import 'package:oto_pesquisador/domain/repositories/questionnaire_repository.dart';
import 'package:oto_pesquisador/domain/repositories/survey_repository.dart';

import 'support/harness.dart';

class _Servidor implements QuestionnaireApi {
  Map<String, Object?> json = {};

  @override
  Future<Map<String, Object?>> fetch() async => json;
}

Map<String, Object?> _formulario(int versao) {
  final base = jsonDecode(File('assets/seed/questionnaire.json').readAsStringSync()) as Map<String, Object?>;
  (base['questions']! as List).add({
    'key': 'nova_pergunta',
    'section': 3,
    'position': 900,
    'type': 'single',
    'label': 'Gostou?',
    'sourceText': 'Gostou?',
    'xlsxColumn': 1001,
    'options': [
      {'value': 'Sim', 'label': 'Sim'},
      {'value': 'Não', 'label': 'Não'},
    ],
    'dependsOn': {'key': 'considerou_outro', 'values': ['Sim']},
  });
  return {...base, 'version': versao};
}

void main() {
  late Harness h;
  late _Servidor servidor;

  setUp(() async {
    servidor = _Servidor()..json = _formulario(2);
    h = await Harness.open(api: MockSyncApi(latency: Duration.zero), questionnaireApi: servidor);
  });
  tearDown(() => h.close());

  QuestionnaireRepository repo() => sl<QuestionnaireRepository>();

  test('baixa a versão nova e a mantém ao abrir de novo', () async {
    expect(await repo().refresh(), isTrue);
    expect((await repo().load()).version, 2);
    expect((await repo().load()).question('nova_pergunta')?.type, QuestionType.single);
    expect(await repo().refresh(), isFalse);
    await repo().ensureCached();
    expect((await repo().load()).version, 2);
  });

  test('não troca com pesquisa aberta nem com pesquisa na fila', () async {
    final r = await h.login();
    final s = await sl<SurveyRepository>().startOrResume(r);
    expect(await repo().refresh(), isFalse);
    await sl<SurveyRepository>().saveAnswer(s.id, 'idade', 30, changedBy: r.code);
    await sl<SurveyRepository>().complete(s.id, flags: const []);
    expect(await repo().refresh(), isFalse);
    expect((await repo().load()).version, 1);
    await sl<SurveyRepository>().markSynced([s.id], DateTime.now());
    expect(await repo().refresh(), isTrue);
  });

  test('formulário inválido não estraga o que está salvo', () async {
    (servidor.json['questions']! as List).add({
      'key': 'x', 'section': 1, 'position': 1, 'type': 'tipo_que_nao_existe', 'label': 'x', 'sourceText': 'x', 'xlsxColumn': 1,
    });
    await expectLater(repo().refresh(), throwsA(anything));
    servidor.json = {'version': 3, 'sections': <Object>[], 'questions': <Object>[]};
    await expectLater(repo().refresh(), throwsA(anything));
    expect((await repo().load()).version, 1);
    expect((await repo().load()).question('idade'), isNotNull);
  });

  test('HttpQuestionnaireApi envia o token e recusa erro do servidor', () async {
    QuestionnaireApi api(int status) => HttpQuestionnaireApi(
      baseUrl: 'http://x',
      token: 't',
      client: MockClient((req) async {
        expect(req.url.path, '/api/v1/formulario');
        expect(req.headers['Authorization'], 'Bearer t');
        return http.Response('{"version": 2}', status);
      }),
    );
    expect((await api(200).fetch())['version'], 2);
    await expectLater(api(503).fetch(), throwsA(isA<SyncApiException>()));
  });
}
