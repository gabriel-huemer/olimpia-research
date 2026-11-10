import 'dart:async';

import '../../../core/mvp/base_presenter.dart';
import '../../../core/mvp/connectivity_aware.dart';
import '../../../core/routes/app_routes.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/services/connectivity_service.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../domain/repositories/survey_repository.dart';
import '../view/saved_view.dart';

class SavedPresenter extends BasePresenter<SavedView> with ConnectivityAware<SavedView> {
  SavedPresenter(this.surveyId, this._surveys, this._auth, this.connectivity);

  final String surveyId;
  final SurveyRepository _surveys;
  final AuthRepository _auth;
  @override
  final ConnectivityService connectivity;

  int? _protocol;
  bool _starting = false;

  @override
  void onAttach() {
    listenConnectivity();
    final sub = _surveys.changes.listen((_) => _load());
    addDisposer(sub.cancel);
    unawaited(_load());
  }

  @override
  void onConnectivityChanged(bool online) => unawaited(_load());

  Future<void> _load() async {
    _protocol ??= (await _surveys.byId(surveyId))?.protocol;
    final queued = await _surveys.queuedCount();
    withView((v) => v.render(SavedViewModel(
          protocol: Formatters.protocol(_protocol ?? 0),
          online: isOnline,
          queued: queued,
          starting: _starting,
        )));
  }

  Future<void> newSurvey() async {
    final researcher = await _auth.currentResearcher();
    if (researcher == null || _starting) return;
    _starting = true;
    final survey = await _surveys.startOrResume(researcher);
    _starting = false;
    withView((v) => v.openSection(SectionArgs(surveyId: survey.id, sectionId: 1)));
  }

  void backHome() => withView((v) => v.openHome());
}
