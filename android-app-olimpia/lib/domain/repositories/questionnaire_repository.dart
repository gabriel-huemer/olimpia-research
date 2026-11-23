import '../entities/city.dart';
import '../entities/questionnaire.dart';

abstract interface class QuestionnaireRepository {
  /// Imports the bundled seed (xlsx questions + IBGE cities) into SQLite when missing or outdated.
  Future<void> ensureCached();

  /// Downloads the published version. Does nothing in demo mode, when already up to date, or while there is an open or
  /// unsent survey (those must be finished with the version they started with). Throws when the server fails.
  Future<bool> refresh();

  /// Questionnaire read from the SQLite cache (memoized after the first call).
  Future<Questionnaire> load();

  /// Offline, accent-insensitive city search.
  Future<List<City>> searchCities(String query, {String? uf, int limit = 20});
}
