import 'dart:async';

import '../../../core/mvp/base_presenter.dart';
import '../../../core/mvp/connectivity_aware.dart';
import '../../../data/services/connectivity_service.dart';
import '../../../data/services/sync_service.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../domain/repositories/survey_repository.dart';
import '../../common/mapper/survey_row_mapper.dart';
import '../view/sync_view.dart';

class SyncPresenter extends BasePresenter<SyncView> with ConnectivityAware<SyncView> {
  SyncPresenter(this._auth, this._surveys, this.connectivity, this._sync);

  final AuthRepository _auth;
  final SurveyRepository _surveys;
  @override
  final ConnectivityService connectivity;
  final SyncService _sync;

  @override
  void onAttach() {
    listenConnectivity();
    final sub = _surveys.changes.listen((_) => _load());
    addDisposer(sub.cancel);
    _sync.progress.addListener(_load);
    addDisposer(() => _sync.progress.removeListener(_load));
    unawaited(_load());
    // Opening the queue online triggers a send attempt.
    _sync.requestSync();
  }

  @override
  void onConnectivityChanged(bool online) => unawaited(_load());

  Future<void> _load() async {
    final researcher = await _auth.currentResearcher();
    final rows = await _surveys.completedSummaries(researcherCode: researcher?.code);
    final queued = await _surveys.queuedCount();
    final p = _sync.progress.value;
    final online = isOnline;
    final state = !online
        ? SyncBannerState.offline
        : p.running
            ? SyncBannerState.sending
            : p.lastError != null && queued > 0
                ? SyncBannerState.error
                : queued > 0
                    ? SyncBannerState.idle
                    : SyncBannerState.done;
    final total = p.total == 0 ? rows.length : p.total;
    final sent = p.total == 0 ? rows.length - queued : p.sent;
    withView((v) => v.render(SyncViewModel(
          online: online,
          state: state,
          sent: sent.clamp(0, total),
          total: total,
          batchSize: _sync.batchSize,
          rows: rows.map(SurveyRowMapper.forSync).toList(),
        )));
  }

  void retry() => unawaited(_sync.syncNow());

  void back() => withView((v) => v.close());
}
