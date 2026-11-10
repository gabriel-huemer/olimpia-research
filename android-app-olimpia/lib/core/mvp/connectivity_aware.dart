import '../../data/services/connectivity_service.dart';
import 'base_presenter.dart';

/// Reusable online/offline subscription for presenters that show the status pill.
mixin ConnectivityAware<V> on BasePresenter<V> {
  ConnectivityService get connectivity;

  bool get isOnline => connectivity.online.value;

  /// Called on every connectivity change.
  void onConnectivityChanged(bool online);

  void listenConnectivity() {
    void listener() => onConnectivityChanged(connectivity.online.value);
    connectivity.online.addListener(listener);
    addDisposer(() => connectivity.online.removeListener(listener));
  }
}
