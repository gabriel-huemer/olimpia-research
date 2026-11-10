import '../entities/researcher.dart';

abstract interface class AuthRepository {
  /// Returns the researcher for [code] (case/separator insensitive) and opens the session.
  Future<Researcher?> login(String code);

  Future<Researcher?> currentResearcher();

  Future<void> logout();
}
