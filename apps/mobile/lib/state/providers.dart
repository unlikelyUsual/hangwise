import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hangwise/config/app_config.dart';
import 'package:hangwise/data/api_client.dart';
import 'package:hangwise/demo/personas.dart';
import 'package:hangwise/domain/models.dart';
import 'package:http/http.dart' as http;

final appConfigProvider = Provider<AppConfig>((ref) => AppConfig.fromEnvironment);

final httpClientProvider = Provider<http.Client>((ref) {
  final client = http.Client();
  ref.onDispose(client.close);
  return client;
});

class PersonaController extends Notifier<DemoPersona> {
  @override
  DemoPersona build() => DemoPersona.alex;

  void select(DemoPersona persona) => state = persona;
}

final personaProvider = NotifierProvider<PersonaController, DemoPersona>(PersonaController.new);

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    config: ref.watch(appConfigProvider),
    persona: ref.watch(personaProvider),
    httpClient: ref.watch(httpClientProvider),
  );
});

final companionsProvider = FutureProvider<List<Companion>>((ref) {
  return ref.watch(apiClientProvider).listCompanions();
});

final bookingsProvider = FutureProvider<List<Booking>>((ref) {
  return ref.watch(apiClientProvider).listBookings();
});

final conversationsProvider = FutureProvider<List<ConversationSummary>>((ref) {
  return ref.watch(apiClientProvider).conversations();
});

final healthProvider = FutureProvider<HealthStatus>((ref) {
  return ref.watch(apiClientProvider).health();
});

final policyProvider = FutureProvider<Map<String, dynamic>>((ref) {
  return ref.watch(apiClientProvider).policy();
});
