import 'package:flutter/services.dart';
import 'package:get_it/get_it.dart';

import '../../data/database/app_database.dart';
import '../../data/datasources/local/questionnaire_local_datasource.dart';
import '../../data/datasources/local/seed_asset_datasource.dart';
import '../../data/datasources/local/session_local_datasource.dart';
import '../../data/datasources/local/survey_local_datasource.dart';
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

Future<void> configureDependencies({
  AppDatabase? database,
  SyncApi? syncApi,
  AssetBundle? bundle,
}) async {
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
              : HttpSyncApi(baseUrl: _syncApiUrl)),
    )
    ..registerLazySingleton(ConnectivityService.new)
    // Repositories
    ..registerLazySingleton<QuestionnaireRepository>(
      () => QuestionnaireRepositoryImpl(sl(), sl()),
    )
    ..registerLazySingleton<AuthRepository>(() => AuthRepositoryImpl(sl()))
    ..registerLazySingleton<SurveyRepository>(
      () => SurveyRepositoryImpl(sl(), sl()),
    )
    ..registerLazySingleton(() => SyncService(sl(), sl(), sl(), sl()))
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
