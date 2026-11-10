import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:oto_pesquisador/core/di/injector.dart';
import 'package:oto_pesquisador/core/routes/app_routes.dart';
import 'package:oto_pesquisador/data/database/app_database.dart';
import 'package:oto_pesquisador/data/datasources/remote/sync_api.dart';
import 'package:oto_pesquisador/data/services/connectivity_service.dart';
import 'package:oto_pesquisador/data/services/sync_service.dart';
import 'package:oto_pesquisador/domain/repositories/auth_repository.dart';
import 'package:oto_pesquisador/domain/repositories/questionnaire_repository.dart';
import 'package:oto_pesquisador/domain/repositories/survey_repository.dart';
import 'package:oto_pesquisador/domain/rules/suspicion_rules.dart';
import 'package:oto_pesquisador/domain/entities/survey.dart';
import 'package:oto_pesquisador/main.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  late MockSyncApi api;

  setUpAll(() async {
    sqfliteFfiInit();
    await initializeDateFormatting('pt_BR');
    api = MockSyncApi(latency: Duration.zero);
    await configureDependencies(
      database: AppDatabase(
        factory: databaseFactoryFfi,
        path: inMemoryDatabasePath,
      ),
      syncApi: api,
    );
  });

  test('seed from xlsx is cached in SQLite', () async {
    final repo = sl<QuestionnaireRepository>();
    await repo.ensureCached();
    final q = await repo.load();
    expect(q.sections.length, 10);
    expect(q.questions.length, 73);
    expect(q.questionsOf(7).length, 12);
    expect(q.questionsOf(8).length, 22);
    expect(
      q.question('transporte')!.options.map((o) => o.label),
      contains('Aéreo'),
    );
    final cities = await repo.searchCities('ribei', uf: 'SP');
    expect(
      cities.map((c) => c.name),
      containsAll(['Ribeirão Preto', 'Ribeirão Pires', 'Ribeira']),
    );
    expect(cities.every((c) => c.uf == 'SP'), isTrue);
    final noAccent = await repo.searchCities('sao jose do rio preto');
    expect(noAccent.first.name, 'São José do Rio Preto');
  });

  test('rules flag suspicious answers without blocking (RF13)', () async {
    final q = await sl<QuestionnaireRepository>().load();
    final engine = SuspicionRuleEngine(q);
    final hits = engine.evaluate({
      'idade': 500,
      'com_quem': ['Sozinho(a)'],
      'acomp_30_44': 2,
      'data_chegada': '2026-10-27',
      'data_partida': '2026-10-24',
    });
    final ids = hits.map((h) => h.ruleId).toSet();
    expect(
      ids,
      containsAll([
        'range:idade',
        'alone_with_companions',
        'departure_before_arrival',
      ]),
    );
    expect(
      hits.firstWhere((h) => h.ruleId == 'range:idade').message,
      contains('500 anos'),
    );
    expect(engine.evaluate({'idade': 35}), isEmpty);
  });

  test(
    'protocol, audit history and idempotent batch sync (RF08/15/16)',
    () async {
      final researcher = (await sl<AuthRepository>().login('oto-482'))!;
      final surveys = sl<SurveyRepository>();
      final s1 = await surveys.startOrResume(researcher);
      final again = await surveys.startOrResume(researcher);
      expect(again.id, s1.id, reason: 'draft is resumed, not duplicated');
      await surveys.saveAnswer(s1.id, 'idade', 500, changedBy: researcher.code);
      await surveys.saveAnswer(s1.id, 'idade', 50, changedBy: researcher.code);
      await surveys.saveAnswer(s1.id, 'idade', 50, changedBy: researcher.code);
      expect((await surveys.history(s1.id)).length, 2);
      await surveys.complete(s1.id, flags: const []);
      final s2 = await surveys.startOrResume(researcher);
      expect(s2.protocol, s1.protocol + 1);
      await surveys.complete(s2.id, flags: const []);

      final connectivity = sl<ConnectivityService>();
      final sync = sl<SyncService>();
      connectivity.online.value = true;
      await sync.syncNow();
      expect(await surveys.queuedCount(), 0);
      expect(api.received, containsAll([s1.id, s2.id]));
      connectivity.online.value = false;
      await sl.reset();
      await configureDependencies(
        database: AppDatabase(
          factory: databaseFactoryFfi,
          path: inMemoryDatabasePath,
        ),
        syncApi: api,
      );
    },
  );

  testWidgets('navigates through all 15 screens', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    Future<void> settle() async {
      for (var i = 0; i < 15; i++) {
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 60)),
        );
        await tester.pump(const Duration(milliseconds: 100));
      }
    }

    await tester.runAsync(() => sl<QuestionnaireRepository>().ensureCached());
    await tester.pumpWidget(const OtoApp(initialRoute: AppRoutes.access));
    await settle();
    expect(find.text('Entrar como pesquisador'), findsOneWidget);

    await tester.enterText(find.byType(EditableText).first, 'OTO482');
    await settle();
    await tester.tap(find.text('Entrar'));
    await settle();
    expect(find.text('Ana Souza'), findsOneWidget);

    await tester.tap(find.text('+ Nova pesquisa'));
    await settle();
    expect(find.text('Origem do turista'), findsOneWidget);

    const titles = [
      'Estadia',
      'Decisão da viagem',
      'Transporte',
      'Grupo de viagem',
      'Hospedagem e refeições',
      'Avaliação dos serviços',
      'Avaliação dos atrativos',
      'Satisfação',
      'Perfil do entrevistado',
    ];
    for (final title in titles) {
      await tester.tap(find.text('Próxima seção'));
      await settle();
      expect(find.text(title), findsOneWidget, reason: 'section "$title"');
      if (title == 'Grupo de viagem') {
        // Inconsistency alert (Figma 07): "Sozinho(a)" + 2 companions aged 30–44.
        await tester.tap(find.text('Sozinho(a)'));
        await settle();
        await tester.drag(find.byType(ListView), const Offset(0, -300));
        await settle();
        await tester.tap(find.text('+').at(3));
        await tester.tap(find.text('+').at(3));
        await settle();
        await tester.drag(find.byType(ListView), const Offset(0, -300));
        await settle();
        expect(
          find.text('Resposta possivelmente inconsistente'),
          findsOneWidget,
        );
        await tester.tap(find.text('Manter e sinalizar'));
        await settle();
      }
      if (title == 'Avaliação dos atrativos') {
        await tester.scrollUntilVisible(
          find.textContaining('restantes como'),
          400,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.tap(find.textContaining('restantes como'));
        await settle();
        // Every attraction answered → bulk action disappears.
        expect(find.textContaining('restantes como'), findsNothing);
      }
    }

    await tester.tap(find.text('Revisar pesquisa'));
    await settle();
    expect(find.text('Confira antes de salvar'), findsOneWidget);
    expect(find.text('Inconsistência'), findsOneWidget);

    await tester.tap(find.text('Salvar pesquisa'));
    await settle();
    expect(find.textContaining('salva'), findsWidgets);

    await tester.tap(find.text('Voltar ao início'));
    await settle();
    await tester.tap(find.text('Ver fila'));
    await settle();
    expect(find.text('Sincronização'), findsOneWidget);
    expect(find.text('Na fila'), findsOneWidget);

    final saved = await tester.runAsync(
      () => sl<SurveyRepository>().completedSummaries(),
    );
    expect(saved!.single.flagCount, 1);
    expect(saved.single.status, SurveyStatus.pending);
  });
}
