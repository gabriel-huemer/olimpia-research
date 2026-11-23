import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:oto_pesquisador/core/di/injector.dart';
import 'package:oto_pesquisador/data/database/app_database.dart';
import 'package:oto_pesquisador/data/datasources/remote/questionnaire_api.dart';
import 'package:oto_pesquisador/data/datasources/remote/researcher_api.dart';
import 'package:oto_pesquisador/data/datasources/remote/sync_api.dart';
import 'package:oto_pesquisador/domain/entities/researcher.dart';
import 'package:oto_pesquisador/domain/entities/survey.dart';
import 'package:oto_pesquisador/domain/repositories/auth_repository.dart';
import 'package:oto_pesquisador/domain/repositories/questionnaire_repository.dart';
import 'package:oto_pesquisador/domain/repositories/survey_repository.dart';
import 'package:path/path.dart' as p;
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// Banco SQLite temporário + injeção de dependências, compartilhados pelos testes do app.
class Harness {
  Harness._(this.database, this.directory);

  final AppDatabase database;
  final Directory directory;

  static Future<Harness> open({required SyncApi api, ResearcherApi? researcherApi, QuestionnaireApi? questionnaireApi}) async {
    TestWidgetsFlutterBinding.ensureInitialized();
    sqfliteFfiInit();
    await initializeDateFormatting('pt_BR');
    await sl.reset();
    final dir = await Directory.systemTemp.createTemp('oto_pesquisador_test_');
    final db = AppDatabase(factory: databaseFactoryFfi, path: p.join(dir.path, 'test.db'));
    await configureDependencies(database: db, syncApi: api, researcherApi: researcherApi, questionnaireApi: questionnaireApi);
    await sl<QuestionnaireRepository>().ensureCached();
    return Harness._(db, dir);
  }

  Future<void> close() async {
    await database.close();
    await sl.reset();
    await directory.delete(recursive: true);
  }

  Future<Researcher> login([String code = 'OTO482']) async => (await sl<AuthRepository>().login(code))!;

  /// Cria e conclui uma pesquisa com as respostas dadas.
  Future<Survey> completedSurvey(Researcher r, Map<String, Object?> answers, {List<SurveyFlag> flags = const []}) async {
    final surveys = sl<SurveyRepository>();
    final s = await surveys.startOrResume(r);
    for (final e in answers.entries) {
      await surveys.saveAnswer(s.id, e.key, e.value, changedBy: r.code);
    }
    return surveys.complete(s.id, flags: flags);
  }
}
