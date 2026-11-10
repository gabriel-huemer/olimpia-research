import 'package:flutter/widgets.dart';

/// Contract implemented by every page: the presenter pushes a ready-to-draw view model.
abstract interface class RenderView<VM> {
  void render(VM viewModel);
}

/// Base presenter (MVP): holds a weak link to the view and owns subscriptions.
abstract class BasePresenter<V> {
  V? _view;
  final List<VoidCallback> _disposers = [];

  V? get view => _view;

  bool get isAttached => _view != null;

  @mustCallSuper
  void attach(V view) {
    _view = view;
    onAttach();
  }

  /// Load data / subscribe here.
  void onAttach() {}

  /// Registers something to undo on detach (listeners, subscriptions).
  void addDisposer(VoidCallback disposer) => _disposers.add(disposer);

  /// Runs [action] with the view only if it is still attached.
  void withView(void Function(V view) action) {
    final v = _view;
    if (v != null) action(v);
  }

  @mustCallSuper
  void detach() {
    for (final d in _disposers.reversed) {
      d();
    }
    _disposers.clear();
    _view = null;
  }
}

/// Wires a [State] to its presenter: attach on init, detach on dispose, and
/// stores the last view model rendered.
mixin PresenterState<W extends StatefulWidget, P extends BasePresenter<V>, V, VM> on State<W>
    implements RenderView<VM> {
  late final P presenter = createPresenter();
  VM? viewModel;

  P createPresenter();

  @override
  void initState() {
    super.initState();
    presenter.attach(this as V);
  }

  @override
  void render(VM vm) {
    if (mounted) setState(() => viewModel = vm);
  }

  @override
  void dispose() {
    presenter.detach();
    super.dispose();
  }
}
