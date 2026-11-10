import '../../../core/mvp/base_presenter.dart';
import '../../../core/routes/app_routes.dart';

class SavedViewModel {
  const SavedViewModel({required this.protocol, required this.online, required this.queued, this.starting = false});

  final String protocol;
  final bool online;
  final int queued;
  final bool starting;
}

abstract interface class SavedView implements RenderView<SavedViewModel> {
  void openSection(SectionArgs args);

  void openHome();
}
