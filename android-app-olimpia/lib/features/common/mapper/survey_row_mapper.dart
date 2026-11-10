import '../../../core/resources/app_strings.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/status/status_badges.dart';
import '../../../domain/entities/survey.dart';

/// Row shown in "Coletas de hoje" and in the sync queue.
class SurveyRowViewModel {
  const SurveyRowViewModel({
    required this.title,
    required this.subtitle,
    required this.tag,
    required this.tone,
  });

  final String title;
  final String subtitle;
  final String tag;
  final TagTone tone;
}

/// Domain summary -> row view model. One mapper, two contexts (home and sync).
abstract final class SurveyRowMapper {
  static String title(SurveySummary s) {
    final origin = s.abroad
        ? AppStrings.exterior
        : switch ((s.city, s.uf)) {
            (final String city, final String uf) => '$city, $uf',
            (final String city, null) => city,
            (null, final String uf) => uf,
            (null, null) => AppStrings.noCity,
          };
    return '${Formatters.protocol(s.protocol)} · $origin';
  }

  static SurveyRowViewModel forHome(SurveySummary s) {
    final at = Formatters.time(s.finishedAt ?? s.startedAt);
    return switch (s.status) {
      SurveyStatus.synced => SurveyRowViewModel(
        title: title(s),
        subtitle:
            '$at · ${AppStrings.sentAtLong(Formatters.time(s.syncedAt!))}',
        tag: AppStrings.tagSynced,
        tone: TagTone.success,
      ),
      _ when s.flagCount > 0 => SurveyRowViewModel(
        title: title(s),
        subtitle: '$at · ${AppStrings.suspicious(s.flagCount)}',
        tag: AppStrings.tagAlert,
        tone: TagTone.warning,
      ),
      SurveyStatus.sending => SurveyRowViewModel(
        title: title(s),
        subtitle: '$at · ${AppStrings.complete}',
        tag: AppStrings.tagSending,
        tone: TagTone.pending,
      ),
      _ => SurveyRowViewModel(
        title: title(s),
        subtitle: '$at · ${AppStrings.complete}',
        tag: AppStrings.tagPending,
        tone: TagTone.pending,
      ),
    };
  }

  static SurveyRowViewModel forSync(SurveySummary s) {
    final collected = AppStrings.collectedAt(
      Formatters.time(s.finishedAt ?? s.startedAt),
    );
    return switch (s.status) {
      SurveyStatus.synced when s.flagCount > 0 => SurveyRowViewModel(
        title: title(s),
        subtitle: AppStrings.sentToCuration,
        tag: AppStrings.tagInReview,
        tone: TagTone.warning,
      ),
      SurveyStatus.synced => SurveyRowViewModel(
        title: title(s),
        subtitle: AppStrings.sentAt(Formatters.time(s.syncedAt!)),
        tag: AppStrings.tagSynced,
        tone: TagTone.success,
      ),
      SurveyStatus.sending => SurveyRowViewModel(
        title: title(s),
        subtitle: collected,
        tag: AppStrings.tagSending,
        tone: TagTone.pending,
      ),
      _ => SurveyRowViewModel(
        title: title(s),
        subtitle: s.flagCount > 0
            ? AppStrings.flaggedCount(s.flagCount)
            : collected,
        tag: AppStrings.tagQueued,
        tone: TagTone.pending,
      ),
    };
  }
}
