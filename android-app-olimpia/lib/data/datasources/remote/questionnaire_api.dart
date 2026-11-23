import 'dart:convert';

import 'package:http/http.dart' as http;

import 'sync_api.dart';

/// Downloads the published questionnaire (RF05), in the same JSON format as the bundled seed.
abstract interface class QuestionnaireApi {
  Future<Map<String, Object?>> fetch();
}

/// `GET {baseUrl}/api/v1/formulario`.
class HttpQuestionnaireApi implements QuestionnaireApi {
  HttpQuestionnaireApi({required this.baseUrl, http.Client? client, this.token}) : _client = client ?? http.Client();

  final String baseUrl;
  final String? token;
  final http.Client _client;

  @override
  Future<Map<String, Object?>> fetch() async {
    final response = await _client
        .get(
          Uri.parse('$baseUrl/api/v1/formulario'),
          headers: {if (token != null) 'Authorization': 'Bearer $token'},
        )
        .timeout(const Duration(seconds: 15));
    if (response.statusCode != 200) throw SyncApiException('HTTP ${response.statusCode}');
    return jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, Object?>;
  }
}
