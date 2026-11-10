import '../../../core/mvp/base_presenter.dart';
import '../../common/mapper/survey_row_mapper.dart';

enum SyncBannerState { offline, sending, idle, done, error }

class SyncViewModel {
  const SyncViewModel({
    required this.online,
    required this.state,
    required this.sent,
    required this.total,
    required this.batchSize,
    required this.rows,
  });

  final bool online;
  final SyncBannerState state;
  final int sent;
  final int total;
  final int batchSize;
  final List<SurveyRowViewModel> rows;
}

abstract interface class SyncView implements RenderView<SyncViewModel> {
  void close();
}
