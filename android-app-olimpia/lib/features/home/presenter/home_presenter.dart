import 'dart:async';

import '../../../core/mvp/base_presenter.dart';
import '../../../core/mvp/connectivity_aware.dart';
import '../../../core/resources/app_strings.dart';
import '../../../core/routes/app_routes.dart';
import '../../../data/services/connectivity_service.dart';
import '../../../data/services/sync_service.dart';
import '../../../domain/entities/researcher.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../domain/repositories/survey_repository.dart';
import '../../common/mapper/survey_row_mapper.dart';
import '../view/home_view.dart';

class HomePresenter extends BasePresenter<HomeView> with ConnectivityAware<HomeView> {
  HomePresenter(this._auth, this._surveys, this.connectivity, this._sync);

  final AuthRepository _auth;
  final SurveyRepository _surveys;
  @override
  final ConnectivityService connectivity;
  final SyncService _sync;

  Researcher? _researcher;
  bool _starting = false;

  @override
  void onAttach() {
    listenConnectivity();
    final sub = _surveys.changes.listen((_) => _load());
    addDisposer(sub.cancel);
    _sync.progress.addListener(_load);
    addDisposer(() => _sync.progress.removeListener(_load));
    _load();
  }

  @override
  void onConnectivityChanged(bool online) => _load();

  Future<void> _load() async {
    final researcher = _researcher ??= await _auth.currentResearcher();
    if (researcher == null) {
      withView((v) => v.openAccess());
      return;
    }
    final today = await _surveys.completedSummaries(researcherCode: researcher.code, day: DateTime.now());
    final queued = await _surveys.queuedCount();
    final online = isOnline;
    withView((v) => v.render(HomeViewModel(
          name: researcher.name,
          details: 'Código ${researcher.displayCode} · ${researcher.location}',
          online: online,
          queued: queued,
          syncHint: queued == 0
              ? AppStrings.allSyncedHint
              : online
                  ? AppStrings.savedOnlineHint
                  : AppStrings.savedOfflineHint,
          todayCount: today.length,
          alertCount: today.where((s) => s.flagCount > 0).length,
          rows: today.map(SurveyRowMapper.forHome).toList(),
          starting: _starting,
        )));
  }

  Future<void> newSurvey() async {
    final researcher = _researcher;
    if (researcher == null || _starting) return;
    _starting = true;
    unawaited(_load());
    try {
      final survey = await _surveys.startOrResume(researcher);
      withView((v) => v.openSection(SectionArgs(surveyId: survey.id, sectionId: 1)));
    } finally {
      _starting = false;
      unawaited(_load());
    }
  }

  void viewQueue() => withView((v) => v.openSync());
}
