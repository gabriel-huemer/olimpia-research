import '../../core/utils/text_normalizer.dart';
import '../../domain/entities/city.dart';
import '../../domain/entities/questionnaire.dart';
import '../../domain/repositories/questionnaire_repository.dart';
import '../datasources/local/questionnaire_local_datasource.dart';
import '../datasources/local/seed_asset_datasource.dart';
import '../mapper/questionnaire_mapper.dart';

class QuestionnaireRepositoryImpl implements QuestionnaireRepository {
  QuestionnaireRepositoryImpl(this._local, this._seed);

  final QuestionnaireLocalDataSource _local;
  final SeedAssetDataSource _seed;
  Questionnaire? _cache;

  static int _version(Map<String, Object?> json) => (json['version']! as num).toInt();

  @override
  Future<void> ensureCached() async {
    await _cacheQuestionnaire();
    await _cacheCities();
    await _cacheResearchers();
  }

  Future<void> _cacheQuestionnaire() async {
    final seed = await _seed.questionnaire();
    final version = _version(seed);
    if (await _local.metaInt(QuestionnaireLocalDataSource.questionnaireVersionKey) == version) return;
    final sections = (seed['sections']! as List).cast<Map<String, Object?>>();
    final questions = (seed['questions']! as List).cast<Map<String, Object?>>();
    await _local.replaceQuestionnaire(
      version: version,
      sections: sections.map(QuestionnaireMapper.sectionToRow).toList(),
      questions: questions.map(QuestionnaireMapper.questionToRow).toList(),
      options: questions.expand(QuestionnaireMapper.optionsToRows).toList(),
    );
    _cache = null;
  }

  Future<void> _cacheCities() async {
    final seed = await _seed.cities();
    final version = _version(seed);
    if (await _local.metaInt(QuestionnaireLocalDataSource.citiesVersionKey) == version) return;
    final byUf = (seed['cities']! as Map).cast<String, List<Object?>>();
    await _local.replaceCities(version, [
      for (final entry in byUf.entries)
        for (final name in entry.value.cast<String>())
          {'name': name, 'uf': entry.key, 'search_name': TextNormalizer.normalize(name)},
    ]);
  }

  Future<void> _cacheResearchers() async {
    final seed = await _seed.researchers();
    final version = _version(seed);
    if (await _local.metaInt(QuestionnaireLocalDataSource.researchersVersionKey) == version) return;
    await _local.upsertResearchers(version, (seed['researchers']! as List).cast<Map<String, Object?>>());
  }

  @override
  Future<Questionnaire> load() async {
    if (_cache != null) return _cache!;
    final rows = await _local.readQuestionnaire();
    final version = await _local.metaInt(QuestionnaireLocalDataSource.questionnaireVersionKey) ?? 0;
    return _cache = QuestionnaireMapper.fromRows(
      version: version,
      sections: rows.sections,
      questions: rows.questions,
      options: rows.options,
    );
  }

  @override
  Future<List<City>> searchCities(String query, {String? uf, int limit = 20}) async {
    final normalized = TextNormalizer.normalize(query);
    if (normalized.isEmpty) return const [];
    final rows = await _local.searchCities(normalized, uf: uf, limit: limit);
    return [for (final r in rows) City(name: r['name']! as String, uf: r['uf']! as String)];
  }
}
