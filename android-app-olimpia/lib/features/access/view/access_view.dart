import '../../../core/mvp/base_presenter.dart';

class AccessViewModel {
  const AccessViewModel({required this.code, this.loading = false, this.error});

  final String code;
  final bool loading;
  final String? error;

  bool get canSubmit => code.length == 6 && !loading;

  AccessViewModel copyWith({bool? loading, String? error}) =>
      AccessViewModel(code: code, loading: loading ?? this.loading, error: error);
}

abstract interface class AccessView implements RenderView<AccessViewModel> {
  void openHome();
}
