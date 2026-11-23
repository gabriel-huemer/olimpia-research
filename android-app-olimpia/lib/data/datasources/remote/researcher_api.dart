import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../domain/entities/researcher.dart';
import 'sync_api.dart';

/// Checks a researcher code on the server (RF03).
abstract interface class ResearcherApi {
  /// Null when the server does not know the code (wrong, replaced or deactivated).
  /// Throws when the server cannot be reached or answers with an error.
  Future<Researcher?> find(String code);
}

/// `POST {baseUrl}/api/v1/pesquisador` with `{"codigo": "OTO482"}`.
class HttpResearcherApi implements ResearcherApi {
  HttpResearcherApi({required this.baseUrl, http.Client? client, this.token}) : _client = client ?? http.Client();

  final String baseUrl;
  final String? token;
  final http.Client _client;

  @override
  Future<Researcher?> find(String code) async {
    final response = await _client
        .post(
          Uri.parse('$baseUrl/api/v1/pesquisador'),
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            if (token != null) 'Authorization': 'Bearer $token',
          },
          body: jsonEncode({'codigo': code}),
        )
        .timeout(const Duration(seconds: 10));
    if (response.statusCode == 404 || response.statusCode == 400) {
      // Only our API answers with {"error": ...}; a captive portal or wrong address must not remove the code.
      if (response.body.contains('"error"')) return null;
      throw SyncApiException('HTTP ${response.statusCode}');
    }
    if (response.statusCode != 200) throw SyncApiException('HTTP ${response.statusCode}');
    final body = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, Object?>;
    return Researcher(
      code: body['codigo']! as String,
      name: body['nome']! as String,
      location: body['local'] as String? ?? '',
    );
  }
}
