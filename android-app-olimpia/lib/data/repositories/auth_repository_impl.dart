import '../../domain/entities/researcher.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/local/session_local_datasource.dart';
import '../datasources/remote/researcher_api.dart';

/// Login checked on the server; a code already used on this device also works offline.
/// Without a server ([api] null, demo mode) only the bundled list is used.
class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl(this._local, {ResearcherApi? api}) : _api = api;

  final SessionLocalDataSource _local;
  final ResearcherApi? _api;

  static String normalizeCode(String code) => code.toUpperCase().replaceAll(RegExp('[^A-Z0-9]'), '');

  static Researcher _map(Map<String, Object?> r) =>
      Researcher(code: r['code']! as String, name: r['name']! as String, location: r['location']! as String);

  @override
  Future<Researcher?> login(String code) async {
    final normalized = normalizeCode(code);
    if (normalized.isEmpty) return null;
    final api = _api;
    if (api != null) {
      final Researcher? remote;
      try {
        remote = await api.find(normalized);
      } on Object {
        final cached = await _loginFromCache(normalized);
        if (cached == null) throw const LoginUnavailableException();
        return cached;
      }
      if (remote == null) {
        await _local.forgetResearcher(normalized);
        return null;
      }
      await _local.saveResearcher(remote.code, remote.name, remote.location);
    }
    return _loginFromCache(normalized);
  }

  Future<Researcher?> _loginFromCache(String code) async {
    final row = await _local.researcher(code);
    if (row == null) return null;
    final researcher = _map(row);
    await _local.open(researcher.code);
    return researcher;
  }

  @override
  Future<Researcher?> currentResearcher() async {
    final row = await _local.currentResearcher();
    return row == null ? null : _map(row);
  }

  @override
  Future<void> logout() => _local.close();
}
