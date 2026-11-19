import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:oto_pesquisador/data/datasources/remote/sync_api.dart';

// Contrato com o painel: POST {baseUrl}/api/v1/pesquisas/lote
//   corpo     {"pesquisas": [...]}
//   resposta  {"aceitas": [uuid], "duplicadas": n, "rejeitadas": {uuid: motivo}}
void main() {
  test('envia para /api/v1/pesquisas/lote com o corpo e os cabeçalhos esperados', () async {
    late http.Request visto;
    final api = HttpSyncApi(
      baseUrl: 'http://10.0.2.2:3000',
      token: 'abc',
      client: MockClient((req) async {
        visto = req;
        return http.Response(jsonEncode({'aceitas': ['a'], 'duplicadas': 0, 'rejeitadas': {}}), 200);
      }),
    );
    await api.sendBatch([
      {'id': 'a', 'protocolo': 1},
    ]);
    expect(visto.method, 'POST');
    expect(visto.url.toString(), 'http://10.0.2.2:3000/api/v1/pesquisas/lote');
    expect(visto.headers['Content-Type'], contains('application/json'));
    expect(visto.headers['Authorization'], 'Bearer abc');
    expect(jsonDecode(visto.body), {
      'pesquisas': [
        {'id': 'a', 'protocolo': 1},
      ],
    });
  });

  test('sem token não envia o cabeçalho Authorization', () async {
    late http.Request visto;
    final api = HttpSyncApi(
      baseUrl: 'http://x',
      client: MockClient((req) async {
        visto = req;
        return http.Response('{"aceitas":[]}', 200);
      }),
    );
    await api.sendBatch(const []);
    expect(visto.headers.containsKey('Authorization'), isFalse);
  });

  test('lê aceitas e rejeitadas, inclusive com acentos no motivo', () async {
    final api = HttpSyncApi(
      baseUrl: 'http://x',
      client: MockClient((_) async => http.Response.bytes(
            utf8.encode(jsonEncode({'aceitas': ['a', 'b'], 'rejeitadas': {'c': 'pesquisador não cadastrado'}})),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          )),
    );
    final r = await api.sendBatch([{'id': 'a'}, {'id': 'b'}, {'id': 'c'}]);
    expect(r.accepted, ['a', 'b']);
    expect(r.rejected, {'c': 'pesquisador não cadastrado'});
  });

  test('resposta sem os campos esperados vira lista vazia, não erro', () async {
    final api = HttpSyncApi(baseUrl: 'http://x', client: MockClient((_) async => http.Response('{}', 200)));
    final r = await api.sendBatch(const []);
    expect(r.accepted, isEmpty);
    expect(r.rejected, isEmpty);
  });

  for (final status in [400, 413, 500, 503]) {
    test('HTTP $status lança SyncApiException (o lote volta para a fila)', () async {
      final api = HttpSyncApi(baseUrl: 'http://x', client: MockClient((_) async => http.Response('{"error":"x"}', status)));
      await expectLater(api.sendBatch(const []), throwsA(isA<SyncApiException>()));
    });
  }

  test('falha de rede propaga a exceção', () async {
    final api = HttpSyncApi(baseUrl: 'http://x', client: MockClient((_) async => throw http.ClientException('sem rede')));
    await expectLater(api.sendBatch(const []), throwsA(isA<http.ClientException>()));
  });
}
