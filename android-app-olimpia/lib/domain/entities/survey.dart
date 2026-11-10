enum SurveyStatus {
  /// Being filled by the researcher.
  draft,

  /// Completed and waiting to be sent.
  pending,

  /// Inside a batch being sent right now.
  sending,

  /// Accepted by the server.
  synced;

  bool get isQueued => this == pending || this == sending;
}

enum FlagStatus {
  /// Rule violated; the researcher did not confirm it yet.
  open,

  /// Researcher chose "Manter e sinalizar".
  confirmed,
}

/// A suspicious or inconsistent answer (RF13). Never blocks saving; goes to curation (RF19).
class SurveyFlag {
  const SurveyFlag({
    required this.ruleId,
    required this.questionKey,
    required this.sectionId,
    required this.title,
    required this.message,
    required this.reviewTag,
    required this.status,
    required this.createdAt,
  });

  final String ruleId;
  final String questionKey;
  final int sectionId;
  final String title;
  final String message;
  final String reviewTag;
  final FlagStatus status;
  final DateTime createdAt;
}

class Survey {
  const Survey({
    required this.id,
    required this.protocol,
    required this.researcherCode,
    required this.location,
    required this.status,
    required this.startedAt,
    required this.updatedAt,
    required this.deviceId,
    this.finishedAt,
    this.syncedAt,
    this.answers = const {},
    this.flags = const [],
  });

  /// UUID: idempotency key for the batch sync (RF08, no duplicates).
  final String id;

  /// Sequential protocol per researcher (RF16).
  final int protocol;
  final String researcherCode;
  final String location;
  final SurveyStatus status;
  final DateTime startedAt;
  final DateTime updatedAt;
  final DateTime? finishedAt;
  final DateTime? syncedAt;
  final String deviceId;
  final Map<String, Object?> answers;
  final List<SurveyFlag> flags;

  bool get hasFlags => flags.isNotEmpty;

  Survey copyWith({
    SurveyStatus? status,
    DateTime? updatedAt,
    DateTime? finishedAt,
    DateTime? syncedAt,
    Map<String, Object?>? answers,
    List<SurveyFlag>? flags,
  }) => Survey(
    id: id,
    protocol: protocol,
    researcherCode: researcherCode,
    location: location,
    status: status ?? this.status,
    startedAt: startedAt,
    updatedAt: updatedAt ?? this.updatedAt,
    finishedAt: finishedAt ?? this.finishedAt,
    syncedAt: syncedAt ?? this.syncedAt,
    deviceId: deviceId,
    answers: answers ?? this.answers,
    flags: flags ?? this.flags,
  );
}

/// One change of an answer (RF15 edit history).
typedef AuditEntry = ({
  String questionKey,
  Object? oldValue,
  Object? newValue,
  DateTime changedAt,
  String changedBy,
});

/// Light projection used by lists (home, sync queue).
class SurveySummary {
  const SurveySummary({
    required this.id,
    required this.protocol,
    required this.status,
    required this.startedAt,
    required this.finishedAt,
    required this.syncedAt,
    required this.city,
    required this.uf,
    required this.flagCount,
    this.abroad = false,
  });

  final String id;
  final int protocol;
  final SurveyStatus status;
  final DateTime startedAt;
  final DateTime? finishedAt;
  final DateTime? syncedAt;
  final String? city;
  final String? uf;
  final int flagCount;

  /// Interviewee lives abroad (state answer = "Residente Exterior").
  final bool abroad;
}
