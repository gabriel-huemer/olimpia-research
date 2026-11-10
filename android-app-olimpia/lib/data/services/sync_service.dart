import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../domain/repositories/questionnaire_repository.dart';
import '../../domain/repositories/survey_repository.dart';
import '../datasources/remote/sync_api.dart';
import '../mapper/sync_payload_mapper.dart';
import 'connectivity_service.dart';

@immutable
class SyncProgress {
  const SyncProgress({
    this.running = false,
    this.sent = 0,
    this.total = 0,
    this.lastError,
  });

  final bool running;
  final int sent;
  final int total;
  final String? lastError;
}

/// Sends completed surveys in batches when the connection returns (RF08).
///
/// * Survey UUID = idempotency key: a batch resent after a crash is not duplicated.
/// * A failed batch goes back to "pending" (nothing is lost) and is retried later.
class SyncService {
  SyncService(
    this._surveys,
    this._questionnaires,
    this._api,
    this._connectivity, {
    this.batchSize = 5,
    this.retryDelay = const Duration(seconds: 30),
  });

  final SurveyRepository _surveys;
  final QuestionnaireRepository _questionnaires;
  final SyncApi _api;
  final ConnectivityService _connectivity;
  final int batchSize;
  final Duration retryDelay;

  final ValueNotifier<SyncProgress> progress = ValueNotifier(
    const SyncProgress(),
  );
  Timer? _retry;
  bool _started = false;

  Future<void> start() async {
    if (_started) return;
    _started = true;
    await _surveys.resetStuckSending();
    _connectivity.online.addListener(_onConnectivity);
    _onConnectivity();
  }

  void _onConnectivity() {
    if (_connectivity.online.value) unawaited(syncNow());
  }

  /// Call after saving a survey: sends right away when online.
  void requestSync() => _onConnectivity();

  Future<void> syncNow() async {
    if (progress.value.running || !_connectivity.online.value) return;
    _retry?.cancel();
    final total = await _surveys.queuedCount();
    if (total == 0) {
      progress.value = const SyncProgress();
      return;
    }
    var sent = 0;
    progress.value = SyncProgress(running: true, total: total);
    final questionnaire = await _questionnaires.load();
    try {
      while (_connectivity.online.value) {
        final batch = await _surveys.takePending(batchSize);
        if (batch.isEmpty) break;
        final ids = [for (final s in batch) s.id];
        await _surveys.markSending(ids);
        final payloads = [
          for (final s in batch)
            SyncPayloadMapper.toJson(
              s,
              questionnaire,
              await _surveys.history(s.id),
            ),
        ];
        final result = await _api.sendBatch(payloads);
        await _surveys.markSynced(result.accepted, DateTime.now());
        final failed = ids
            .where((id) => !result.accepted.contains(id))
            .toList();
        if (failed.isNotEmpty) {
          await _surveys.markFailed(failed, result.rejected.values.join('; '));
        }
        sent += result.accepted.length;
        progress.value = SyncProgress(running: true, sent: sent, total: total);
        if (result.accepted.isEmpty) break;
      }
      progress.value = SyncProgress(sent: sent, total: total);
    } on Object catch (e) {
      // Batch in flight goes back to the queue; nothing is lost.
      await _surveys.resetStuckSending();
      progress.value = SyncProgress(sent: sent, total: total, lastError: '$e');
      _retry = Timer(retryDelay, _onConnectivity);
    }
  }

  Future<void> dispose() async {
    _retry?.cancel();
    _connectivity.online.removeListener(_onConnectivity);
    progress.dispose();
  }
}
