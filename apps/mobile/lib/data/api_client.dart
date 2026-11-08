import 'dart:convert';

import 'package:hangwise/config/app_config.dart';
import 'package:hangwise/data/api_exception.dart';
import 'package:hangwise/demo/personas.dart';
import 'package:hangwise/domain/models.dart';
import 'package:http/http.dart' as http;

class ApiClient {
  ApiClient({required this.config, required this.persona, required http.Client httpClient}) : _http = httpClient;

  final AppConfig config;
  final DemoPersona persona;
  final http.Client _http;

  Future<List<Companion>> listCompanions() async {
    final decoded = await _send('GET', '/v1/companions');
    if (decoded is! List) {
      throw ApiException('The companion list was not a list. Demo mode does not substitute sample cards.');
    }
    return decoded.map((item) => Companion.fromJson(asJsonMap(item, 'companion'))).toList();
  }

  Future<Companion> companion(String id) async {
    final decoded = await _send('GET', '/v1/companions/$id');
    return Companion.fromJson(asJsonMap(decoded, 'companion'));
  }

  Future<List<AvailabilityWindow>> availability(String id) async {
    final decoded = await _send('GET', '/v1/companions/$id/availability');
    if (decoded is! List) {
      throw ApiException('Availability was unreadable. Demo mode does not invent open hours.');
    }
    return decoded.map((item) => AvailabilityWindow.fromJson(asJsonMap(item, 'availability'))).toList();
  }

  Future<List<Booking>> listBookings() async {
    final decoded = await _send('GET', '/v1/bookings', authenticated: true);
    if (decoded is! List) throw ApiException('The booking list was unreadable.');
    return decoded.map((item) => Booking.fromJson(asJsonMap(item, 'booking'))).toList();
  }

  Future<Booking> createBooking({
    required String companionProfileId,
    required DateTime startsAt,
    required DateTime endsAt,
    required String venueName,
    required String venueArea,
    required String note,
    required String idempotencyKey,
  }) async {
    final decoded = await _send(
      'POST',
      '/v1/bookings',
      authenticated: true,
      idempotencyKey: idempotencyKey,
      body: {
        'companionProfileId': companionProfileId,
        'startsAt': startsAt.toUtc().toIso8601String(),
        'endsAt': endsAt.toUtc().toIso8601String(),
        'venueName': venueName,
        'venueArea': venueArea,
        if (note.trim().isNotEmpty) 'note': note.trim(),
        'acknowledgedPublicDatePolicy': true,
      },
    );
    return Booking.fromJson(asJsonMap(decoded, 'booking'));
  }

  Future<Booking> transition(String id, String action, {Map<String, dynamic>? body}) async {
    final decoded = await _send('POST', '/v1/bookings/$id/$action', authenticated: true, body: body ?? {});
    return Booking.fromJson(asJsonMap(decoded, 'booking'));
  }

  Future<List<ConversationSummary>> conversations() async {
    final decoded = await _send('GET', '/v1/conversations', authenticated: true);
    if (decoded is! List) throw ApiException('The message list was unreadable.');
    return decoded.map((item) => ConversationSummary.fromJson(asJsonMap(item, 'conversation'))).toList();
  }

  Future<List<ChatMessage>> messages(String conversationId) async {
    final decoded = await _send('GET', '/v1/conversations/$conversationId/messages', authenticated: true);
    final payload = asJsonMap(decoded, 'messages');
    final rows = payload['messages'];
    if (rows is! List) throw ApiException('Messages were unreadable.');
    return rows.map((item) => ChatMessage.fromJson(asJsonMap(item, 'message'))).toList();
  }

  Future<ChatMessage> sendMessage(String conversationId, String body) async {
    final decoded = await _send(
      'POST',
      '/v1/conversations/$conversationId/messages',
      authenticated: true,
      body: {'body': body},
    );
    return ChatMessage.fromJson(asJsonMap(decoded, 'message'));
  }

  Future<HealthStatus> health() async {
    final decoded = await _send('GET', '/health');
    return HealthStatus.fromJson(asJsonMap(decoded, 'health'));
  }

  Future<Map<String, dynamic>> policy() async {
    final decoded = await _send('GET', '/v1/safety/policy');
    return asJsonMap(decoded, 'policy');
  }

  Future<void> report({String? subjectUserId, String? bookingId, required String category, required String body}) async {
    await _send(
      'POST',
      '/v1/safety/reports',
      authenticated: true,
      body: {
        if (subjectUserId != null) 'subjectUserId': subjectUserId,
        if (bookingId != null) 'bookingId': bookingId,
        'category': category,
        'body': body,
      },
    );
  }

  Future<dynamic> _send(
    String method,
    String path, {
    bool authenticated = false,
    Map<String, dynamic>? body,
    String? idempotencyKey,
  }) async {
    final headers = <String, String>{'Accept': 'application/json'};
    if (body != null) headers['Content-Type'] = 'application/json';
    if (authenticated) {
      headers['X-Hangwise-Dev-User'] = persona.id;
      headers['X-Hangwise-Dev-Secret'] = config.devSecret;
    }
    if (idempotencyKey != null) headers['Idempotency-Key'] = idempotencyKey;
    final uri = Uri.parse('${config.normalizedBaseUrl}$path');
    late http.Response response;
    try {
      response = await switch (method) {
        'POST' => _http.post(uri, headers: headers, body: jsonEncode(body ?? {})),
        _ => _http.get(uri, headers: headers),
      };
    } on http.ClientException {
      throw ApiException('Could not reach the API. Demo mode does not replace this with sample data.');
    }
    if (response.statusCode >= 400) {
      throw _errorFrom(response);
    }
    if (response.body.isEmpty) return null;
    try {
      return jsonDecode(response.body);
    } on FormatException {
      throw ApiException('The server returned unreadable JSON. Demo mode does not substitute sample data.');
    }
  }

  ApiException _errorFrom(http.Response response) {
    var message = 'Request failed (${response.statusCode}).';
    String? code;
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map && decoded['error'] is Map) {
        final error = asJsonMap(decoded['error'], 'error');
        code = error['code']?.toString();
        message = error['message']?.toString() ?? message;
      }
    } on FormatException {
      message = 'Request failed (${response.statusCode}).';
    }
    return ApiException(message, statusCode: response.statusCode, code: code);
  }
}
