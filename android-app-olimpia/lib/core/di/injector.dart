import 'package:flutter/services.dart';
import 'package:get_it/get_it.dart';

import '../../data/database/app_database.dart';
import '../../data/datasources/local/questionnaire_local_datasource.dart';
import '../../data/datasources/local/seed_asset_datasource.dart';
import '../../data/datasources/local/session_local_datasource.dart';
import '../../data/datasources/local/survey_local_datasource.dart';
import '../../data/datasources/remote/questionnaire_api.dart';
import '../../data/datasources/remote/researcher_api.dart';
import '../../data/datasources/remote/sync_api.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../data/repositories/questionnaire_repository_impl.dart';
import '../../data/repositories/survey_repository_impl.dart';
import '../../data/services/connectivity_service.dart';
import '../../data/services/sync_service.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/questionnaire_repository.dart';
import '../../domain/repositories/survey_repository.dart';
import '../../features/access/presenter/access_presenter.dart';
import '../../features/home/presenter/home_presenter.dart';
import '../../features/review/presenter/review_presenter.dart';
import '../../features/saved/presenter/saved_presenter.dart';
import '../../features/survey_section/presenter/survey_section_presenter.dart';
import '../../features/sync/presenter/sync_presenter.dart';
import '../routes/app_routes.dart';

final sl = GetIt.instance;

/// Backend URL comes from `--dart-define=SYNC_API_URL=https://...`. Empty = in-memory mock server.
const _syncApiUrl = String.fromEnvironment('SYNC_API_URL');

/// Token exigido pelo painel na sincronização: `--dart-define=SYNC_API_TOKEN=...` (mesmo valor do painel).
const _syncApiToken = String.fromEnvironment('SYNC_API_TOKEN');

Future<void> configureDependencies({
  AppDatabase? database,
  SyncApi? syncApi,
  ResearcherApi? researcherApi,
  QuestionnaireApi? questionnaireApi,
  CancelledApi? cancelledApi,
  AssetBundle? bundle,
}) async {
  // Server used to check codes; null = demo mode (bundled list only).
  final researchers =
      researcherApi ??
      (_syncApiUrl.isEmpty
          ? null
          : HttpResearcherApi(baseUrl: _syncApiUrl, token: _syncApiToken.isEmpty ? null : _syncApiToken));
  final questionnaires =
      questionnaireApi ??
      (_syncApiUrl.isEmpty
          ? null
          : HttpQuestionnaireApi(baseUrl: _syncApiUrl, token: _syncApiToken.isEmpty ? null : _syncApiToken));
  final cancelled =
      cancelledApi ??
      (_syncApiUrl.isEmpty
          ? null
          : HttpCancelledApi(baseUrl: _syncApiUrl, token: _syncApiToken.isEmpty ? null : _syncApiToken));
  // Infra
  sl
    ..registerSingleton<AppDatabase>(database ?? AppDatabase())
    ..registerLazySingleton(() => SeedAssetDataSource(bundle ?? rootBundle))
    ..registerLazySingleton(() => QuestionnaireLocalDataSource(sl()))
    ..registerLazySingleton(() => SessionLocalDataSource(sl()))
    ..registerLazySingleton(() => SurveyLocalDataSource(sl()))
    ..registerLazySingleton<SyncApi>(
      () =>
          syncApi ??
          (_syncApiUrl.isEmpty
              ? MockSyncApi()
              : HttpSyncApi(
                  baseUrl: _syncApiUrl,
                  token: _syncApiToken.isEmpty ? null : _syncApiToken,
                )),
    )
    ..registerLazySingleton(ConnectivityService.new)
    // Repositories
    ..registerLazySingleton<QuestionnaireRepository>(
      () => QuestionnaireRepositoryImpl(sl(), sl(), demoResearchers: researchers == null, api: questionnaires),
    )
    ..registerLazySingleton<AuthRepository>(() => AuthRepositoryImpl(sl(), api: researchers))
    ..registerLazySingleton<SurveyRepository>(
      () => SurveyRepositoryImpl(sl(), sl()),
    )
    ..registerLazySingleton(() => SyncService(sl(), sl(), sl(), sl(), cancelled: cancelled))
    // Presenters (one instance per page)
    ..registerFactory(() => AccessPresenter(sl()))
    ..registerFactory(() => HomePresenter(sl(), sl(), sl(), sl()))
    ..registerFactoryParam<SurveySectionPresenter, SectionArgs, void>(
      (args, _) => SurveySectionPresenter(args, sl(), sl(), sl(), sl()),
    )
    ..registerFactoryParam<ReviewPresenter, String, void>(
      (surveyId, _) => ReviewPresenter(surveyId, sl(), sl(), sl(), sl()),
    )
    ..registerFactoryParam<SavedPresenter, String, void>(
      (surveyId, _) => SavedPresenter(surveyId, sl(), sl(), sl()),
    )
    ..registerFactory(() => SyncPresenter(sl(), sl(), sl(), sl()));
}

/// Loads the SQLite cache and starts background services. Returns whether a session exists.
Future<bool> bootstrap() async {
  await sl<QuestionnaireRepository>().ensureCached();
  await sl<ConnectivityService>().start();
  await sl<SyncService>().start();
  return await sl<AuthRepository>().currentResearcher() != null;
}
