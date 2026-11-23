import '../entities/researcher.dart';

/// The server could not be reached and this code was never used on this device.
class LoginUnavailableException implements Exception {
  const LoginUnavailableException();
}

abstract interface class AuthRepository {
  /// Returns the researcher for [code] (case/separator insensitive) and opens the session.
  /// Throws [LoginUnavailableException] when the code cannot be checked.
  Future<Researcher?> login(String code);

  Future<Researcher?> currentResearcher();

  Future<void> logout();
}
