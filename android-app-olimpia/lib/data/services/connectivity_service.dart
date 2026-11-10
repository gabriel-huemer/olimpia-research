import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

/// Exposes the online/offline state used by the status pill and the auto-sync (RF08).
class ConnectivityService {
  ConnectivityService({Connectivity? connectivity}) : _connectivity = connectivity ?? Connectivity();

  final Connectivity _connectivity;
  final ValueNotifier<bool> online = ValueNotifier(false);
  StreamSubscription<List<ConnectivityResult>>? _sub;

  static bool _isOnline(List<ConnectivityResult> r) => r.any((c) => c != ConnectivityResult.none);

  Future<void> start() async {
    try {
      online.value = _isOnline(await _connectivity.checkConnectivity());
    } on Exception {
      online.value = false;
    }
    _sub ??= _connectivity.onConnectivityChanged.listen((r) => online.value = _isOnline(r));
  }

  Future<void> dispose() async {
    await _sub?.cancel();
    online.dispose();
  }
}
