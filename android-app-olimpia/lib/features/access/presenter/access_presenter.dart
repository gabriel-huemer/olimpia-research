import '../../../core/mvp/base_presenter.dart';
import '../../../core/resources/app_strings.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../view/access_view.dart';

class AccessPresenter extends BasePresenter<AccessView> {
  AccessPresenter(this._auth);

  final AuthRepository _auth;
  static const codeLength = 6;

  var _vm = const AccessViewModel(code: '');

  void _emit(AccessViewModel vm) {
    _vm = vm;
    withView((v) => v.render(vm));
  }

  @override
  void onAttach() => _emit(_vm);

  void onCodeChanged(String raw) {
    final code = raw.toUpperCase().replaceAll(RegExp('[^A-Z0-9]'), '');
    _emit(
      AccessViewModel(
        code: code.length > codeLength ? code.substring(0, codeLength) : code,
      ),
    );
  }

  Future<void> submit() async {
    if (!_vm.canSubmit) return;
    _emit(_vm.copyWith(loading: true));
    final researcher = await _auth.login(_vm.code);
    if (researcher == null) {
      _emit(_vm.copyWith(loading: false, error: AppStrings.loginInvalid));
      return;
    }
    withView((v) => v.openHome());
  }
}
