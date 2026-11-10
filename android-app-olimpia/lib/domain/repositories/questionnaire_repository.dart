import '../entities/city.dart';
import '../entities/questionnaire.dart';

abstract interface class QuestionnaireRepository {
  /// Imports the bundled seed (xlsx questions + IBGE cities) into SQLite when missing or outdated.
  Future<void> ensureCached();

  /// Questionnaire read from the SQLite cache (memoized after the first call).
  Future<Questionnaire> load();

  /// Offline, accent-insensitive city search.
  Future<List<City>> searchCities(String query, {String? uf, int limit = 20});
}
