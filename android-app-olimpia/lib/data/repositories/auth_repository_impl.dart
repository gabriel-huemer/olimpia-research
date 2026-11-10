import '../../domain/entities/researcher.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/local/session_local_datasource.dart';

/// Offline login against the locally cached researcher list.
class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl(this._local);

  final SessionLocalDataSource _local;

  static String normalizeCode(String code) => code.toUpperCase().replaceAll(RegExp('[^A-Z0-9]'), '');

  static Researcher _map(Map<String, Object?> r) =>
      Researcher(code: r['code']! as String, name: r['name']! as String, location: r['location']! as String);

  @override
  Future<Researcher?> login(String code) async {
    final row = await _local.researcher(normalizeCode(code));
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
