import 'package:hangwise/data/api_exception.dart';

Map<String, dynamic> asJsonMap(dynamic value, String label) {
  if (value is Map) {
    return value.map((key, entry) => MapEntry(key.toString(), entry));
  }
  throw ApiException('The server returned an unreadable $label. Demo mode does not substitute sample data.');
}

class Companion {
  const Companion({
    required this.id,
    required this.userId,
    required this.publicName,
    required this.ageYears,
    required this.ageVerified,
    required this.identityVerified,
    required this.headline,
    required this.bio,
    required this.city,
    required this.area,
    required this.hourlyRateMinor,
    required this.currency,
    required this.languages,
    required this.boundaries,
  });

  final String id;
  final String userId;
  final String publicName;
  final int ageYears;
  final bool ageVerified;
  final bool identityVerified;
  final String headline;
  final String bio;
  final String city;
  final String area;
  final int hourlyRateMinor;
  final String currency;
  final List<String> languages;
  final String boundaries;

  String get initials {
    final parts = publicName.split(' ').where((part) => part.isNotEmpty).take(2);
    return parts.map((part) => part[0]).join().toUpperCase();
  }

  factory Companion.fromJson(Map<String, dynamic> json) {
    return Companion(
      id: json['id'] as String,
      userId: json['userId'] as String,
      publicName: json['publicName'] as String,
      ageYears: json['ageYears'] as int,
      ageVerified: json['ageVerified'] as bool,
      identityVerified: json['identityVerified'] as bool,
      headline: json['headline'] as String,
      bio: json['bio'] as String,
      city: json['city'] as String,
      area: json['area'] as String,
      hourlyRateMinor: json['hourlyRateMinor'] as int,
      currency: json['currency'] as String,
      languages: (json['languages'] as List).map((item) => item.toString()).toList(),
      boundaries: json['boundaries'] as String,
    );
  }
}

class AvailabilityWindow {
  const AvailabilityWindow({required this.id, required this.startsAt, required this.endsAt, required this.label});

  final String id;
  final DateTime startsAt;
  final DateTime endsAt;
  final String label;

  factory AvailabilityWindow.fromJson(Map<String, dynamic> json) {
    return AvailabilityWindow(
      id: json['id'] as String,
      startsAt: DateTime.parse(json['startsAt'] as String),
      endsAt: DateTime.parse(json['endsAt'] as String),
      label: json['label'] as String,
    );
  }
}

class PriceSnapshot {
  const PriceSnapshot({
    required this.minor,
    required this.currency,
    required this.platformFeeMinor,
    required this.feePolicy,
  });

  final int minor;
  final String currency;
  final int? platformFeeMinor;
  final String feePolicy;

  factory PriceSnapshot.fromJson(Map<String, dynamic> json) {
    return PriceSnapshot(
      minor: json['minor'] as int,
      currency: json['currency'] as String,
      platformFeeMinor: json['platformFeeMinor'] as int?,
      feePolicy: json['feePolicy'] as String,
    );
  }
}

class Booking {
  const Booking({
    required this.id,
    required this.status,
    required this.venueName,
    required this.venueArea,
    required this.startsAt,
    required this.endsAt,
    required this.customerId,
    required this.companionProfileId,
    required this.customerNote,
    required this.paymentAuthorized,
    required this.price,
  });

  final String id;
  final String status;
  final String venueName;
  final String venueArea;
  final DateTime startsAt;
  final DateTime endsAt;
  final String customerId;
  final String companionProfileId;
  final String? customerNote;
  final bool paymentAuthorized;
  final PriceSnapshot price;

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['id'] as String,
      status: json['status'] as String,
      venueName: json['venueName'] as String,
      venueArea: json['venueArea'] as String,
      startsAt: DateTime.parse(json['startsAt'] as String),
      endsAt: DateTime.parse(json['endsAt'] as String),
      customerId: json['customerId'] as String,
      companionProfileId: json['companionProfileId'] as String,
      customerNote: json['customerNote'] as String?,
      paymentAuthorized: json['paymentAuthorized'] as bool,
      price: PriceSnapshot.fromJson(asJsonMap(json['price'], 'price')),
    );
  }
}

class ConversationSummary {
  const ConversationSummary({
    required this.id,
    required this.bookingId,
    required this.lastMessagePreview,
  });

  final String id;
  final String? bookingId;
  final String? lastMessagePreview;

  factory ConversationSummary.fromJson(Map<String, dynamic> json) {
    return ConversationSummary(
      id: json['id'] as String,
      bookingId: json['bookingId'] as String?,
      lastMessagePreview: json['lastMessagePreview'] as String?,
    );
  }
}

class ChatMessage {
  const ChatMessage({required this.id, required this.senderUserId, required this.body, required this.createdAt});

  final String id;
  final String senderUserId;
  final String body;
  final DateTime createdAt;

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] as String,
      senderUserId: json['senderUserId'] as String,
      body: json['body'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class HealthStatus {
  const HealthStatus({
    required this.demoMode,
    required this.payments,
    required this.verification,
    required this.authMode,
    required this.feePolicy,
  });

  final bool demoMode;
  final String payments;
  final String verification;
  final String authMode;
  final String feePolicy;

  factory HealthStatus.fromJson(Map<String, dynamic> json) {
    return HealthStatus(
      demoMode: json['demoMode'] as bool,
      payments: json['payments'] as String,
      verification: json['verification'] as String,
      authMode: json['authMode'] as String,
      feePolicy: json['feePolicy'] as String,
    );
  }
}
