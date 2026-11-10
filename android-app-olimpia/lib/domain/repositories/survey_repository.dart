import '../entities/researcher.dart';
import '../entities/survey.dart';

abstract interface class SurveyRepository {
  /// Emits whenever a survey changes (answers, status, sync).
  Stream<void> get changes;

  /// Resumes the researcher's open draft or creates a new one with the next protocol (RF16).
  Future<Survey> startOrResume(Researcher researcher);

  Future<Survey?> byId(String id);

  /// Persists one answer immediately and records the audit trail (RF15).
  Future<void> saveAnswer(
    String surveyId,
    String questionKey,
    Object? value, {
    required String changedBy,
  });

  /// Replaces the survey flags (all, or only those of [sectionId]).
  Future<void> saveFlags(
    String surveyId,
    List<SurveyFlag> flags, {
    int? sectionId,
  });

  /// Edit history of every answer (RF15).
  Future<List<AuditEntry>> history(String surveyId);

  /// Marks the survey as completed and queued for sync.
  Future<Survey> complete(String surveyId, {required List<SurveyFlag> flags});

  Future<List<SurveySummary>> completedSummaries({
    String? researcherCode,
    DateTime? day,
  });

  Future<int> queuedCount();

  // ---- sync support ----
  Future<List<Survey>> takePending(int limit);

  Future<void> markSending(List<String> ids);

  Future<void> markSynced(List<String> ids, DateTime at);

  Future<void> markFailed(List<String> ids, String error);

  /// Puts back surveys left in "sending" (e.g. app killed mid-batch).
  Future<void> resetStuckSending();
}
