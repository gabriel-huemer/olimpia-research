import 'dart:convert';

import 'package:http/http.dart' as http;

/// Result of one batch: ids accepted by the server (already-received ids are also accepted: idempotent).
class BatchResult {
  const BatchResult({required this.accepted, this.rejected = const {}});

  final List<String> accepted;

  /// id -> reason.
  final Map<String, String> rejected;
}

/// REST batch endpoint for pending surveys (RF08).
abstract interface class SyncApi {
  Future<BatchResult> sendBatch(List<Map<String, Object?>> surveys);
}

/// `POST {baseUrl}/api/v1/pesquisas/lote` with `{"pesquisas": [...]}`.
/// Expected response: `{"aceitas": ["uuid", ...], "rejeitadas": {"uuid": "motivo"}}`.
class HttpSyncApi implements SyncApi {
  HttpSyncApi({required this.baseUrl, http.Client? client, this.token}) : _client = client ?? http.Client();

  final String baseUrl;
  final String? token;
  final http.Client _client;

  @override
  Future<BatchResult> sendBatch(List<Map<String, Object?>> surveys) async {
    final response = await _client
        .post(
          Uri.parse('$baseUrl/api/v1/pesquisas/lote'),
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            if (token != null) 'Authorization': 'Bearer $token',
          },
          body: jsonEncode({'pesquisas': surveys}),
        )
        .timeout(const Duration(seconds: 30));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw SyncApiException('HTTP ${response.statusCode}');
    }
    final body = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, Object?>;
    return BatchResult(
      accepted: (body['aceitas'] as List? ?? const []).cast<String>(),
      rejected: (body['rejeitadas'] as Map? ?? const {}).cast<String, String>(),
    );
  }
}

/// Reports cancelled interviews (RF23). Returns the ids the server stored.
abstract interface class CancelledApi {
  Future<List<String>> sendCancelled(List<Map<String, Object?>> cancelled);
}

/// `POST {baseUrl}/api/v1/pesquisas/canceladas` with `{"canceladas": [...]}`.
class HttpCancelledApi implements CancelledApi {
  HttpCancelledApi({required this.baseUrl, http.Client? client, this.token}) : _client = client ?? http.Client();

  final String baseUrl;
  final String? token;
  final http.Client _client;

  @override
  Future<List<String>> sendCancelled(List<Map<String, Object?>> cancelled) async {
    final response = await _client
        .post(
          Uri.parse('$baseUrl/api/v1/pesquisas/canceladas'),
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            if (token != null) 'Authorization': 'Bearer $token',
          },
          body: jsonEncode({'canceladas': cancelled}),
        )
        .timeout(const Duration(seconds: 15));
    if (response.statusCode != 200) throw SyncApiException('HTTP ${response.statusCode}');
    final body = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, Object?>;
    return (body['aceitas'] as List? ?? const []).cast<String>();
  }
}

/// In-memory server used while the Java/PostgreSQL backend is not available.
/// Simulates latency and keeps received ids to prove deduplication.
class MockSyncApi implements SyncApi {
  MockSyncApi({this.latency = const Duration(milliseconds: 900)});

  final Duration latency;
  final Set<String> received = {};

  @override
  Future<BatchResult> sendBatch(List<Map<String, Object?>> surveys) async {
    await Future<void>.delayed(latency);
    final ids = [for (final s in surveys) s['id']! as String];
    received.addAll(ids);
    return BatchResult(accepted: ids);
  }
}

class SyncApiException implements Exception {
  const SyncApiException(this.message);

  final String message;

  @override
  String toString() => 'SyncApiException: $message';
}
