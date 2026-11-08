import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:hangwise/config/app_config.dart';
import 'package:hangwise/data/api_client.dart';
import 'package:hangwise/data/api_exception.dart';
import 'package:hangwise/demo/personas.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('a failed companion request throws and does not invent cards', () async {
    final client = ApiClient(
      config: const AppConfig(baseUrl: 'http://127.0.0.1:9', devSecret: 'hangwise-dev-secret'),
      persona: DemoPersona.alex,
      httpClient: MockClient((request) async {
        return http.Response('unavailable', 500);
      }),
    );
    expect(
      () => client.listCompanions(),
      throwsA(
        isA<ApiException>().having((error) => error.message, 'message', isNot(contains('Maya Srisai'))),
      ),
    );
  });

  test('a network failure is an error, not an empty catalog', () async {
    final client = ApiClient(
      config: const AppConfig(baseUrl: 'http://127.0.0.1:9', devSecret: 'hangwise-dev-secret'),
      persona: DemoPersona.alex,
      httpClient: MockClient((request) async => throw http.ClientException('offline')),
    );
    expect(
      () => client.listCompanions(),
      throwsA(isA<ApiException>().having((error) => error.message, 'message', contains('does not replace'))),
    );
  });

  test('parses a real companion payload', () async {
    final client = ApiClient(
      config: const AppConfig(baseUrl: 'http://127.0.0.1:3000', devSecret: 'hangwise-dev-secret'),
      persona: DemoPersona.alex,
      httpClient: MockClient((request) async {
        return http.Response(
          jsonEncode([
            {
              'id': '44444444-4444-4444-8444-444444444441',
              'userId': DemoPersona.maya.id,
              'publicName': 'Maya Srisai',
              'ageYears': 29,
              'ageVerified': false,
              'identityVerified': false,
              'headline': 'Walks',
              'bio': 'Fictional',
              'city': 'Bangkok',
              'area': 'Pathum Wan',
              'hourlyRateMinor': 150000,
              'currency': 'THB',
              'languages': ['English', 'Thai'],
              'boundaries': 'Public only',
            },
          ]),
          200,
        );
      }),
    );
    final rows = await client.listCompanions();
    expect(rows.single.publicName, 'Maya Srisai');
    expect(rows.single.ageVerified, isFalse);
  });
}
