import '../../../core/mvp/base_presenter.dart';
import '../../../core/routes/app_routes.dart';
import '../../common/mapper/survey_row_mapper.dart';

class HomeViewModel {
  const HomeViewModel({
    required this.name,
    required this.details,
    required this.online,
    required this.queued,
    required this.syncHint,
    required this.todayCount,
    required this.alertCount,
    required this.rows,
    this.starting = false,
  });

  final String name;
  final String details;
  final bool online;
  final int queued;
  final String syncHint;
  final int todayCount;
  final int alertCount;
  final List<SurveyRowViewModel> rows;
  final bool starting;
}

abstract interface class HomeView implements RenderView<HomeViewModel> {
  void openSection(SectionArgs args);

  void openSync();

  void openAccess();
}
