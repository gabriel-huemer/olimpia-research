import '../../../core/mvp/base_presenter.dart';
import '../../../core/routes/app_routes.dart';
import '../../../core/widgets/status/status_badges.dart';

class ReviewRowViewModel {
  const ReviewRowViewModel({required this.sectionId, required this.title, this.tag, this.tone});

  final int sectionId;
  final String title;

  /// null = section complete (green ✓).
  final String? tag;
  final TagTone? tone;
}

class ReviewViewModel {
  const ReviewViewModel({
    required this.protocol,
    required this.online,
    required this.flagCount,
    required this.rows,
    required this.researcherCode,
    required this.startTime,
    required this.endTime,
    required this.location,
    this.saving = false,
  });

  final String protocol;
  final bool online;
  final int flagCount;
  final List<ReviewRowViewModel> rows;
  final String researcherCode;
  final String startTime;
  final String endTime;
  final String location;
  final bool saving;
}

abstract interface class ReviewView implements RenderView<ReviewViewModel> {
  void openSection(SectionArgs args);

  void openSaved(String surveyId);

  void close();
}
