class BookingDraft {
  const BookingDraft({
    this.startsAt,
    this.windowEnd,
    this.durationHours = 2,
    this.venueName = '',
    this.venueArea = '',
    this.note = '',
    this.acknowledged = false,
  });

  final DateTime? startsAt;
  final DateTime? windowEnd;
  final int durationHours;
  final String venueName;
  final String venueArea;
  final String note;
  final bool acknowledged;

  DateTime? get endsAt => startsAt?.add(Duration(hours: durationHours));

  int? estimateMinor(int hourlyRateMinor) {
    if (durationHours < 1) return null;
    return hourlyRateMinor * durationHours;
  }

  String? validate() {
    final start = startsAt;
    final end = endsAt;
    if (start == null || end == null) return 'Choose a start time.';
    if (windowEnd != null && end.isAfter(windowEnd!)) {
      return 'That duration runs past the published availability.';
    }
    if (durationHours < 1 || durationHours > 8) return 'Choose 1 to 8 hours.';
    if (venueName.trim().length < 2) return 'Name a public venue.';
    if (venueArea.trim().length < 2) return 'Name the area.';
    if (!acknowledged) return 'Acknowledge the public-date policy before requesting.';
    return null;
  }

  BookingDraft copyWith({
    DateTime? startsAt,
    DateTime? windowEnd,
    int? durationHours,
    String? venueName,
    String? venueArea,
    String? note,
    bool? acknowledged,
  }) {
    return BookingDraft(
      startsAt: startsAt ?? this.startsAt,
      windowEnd: windowEnd ?? this.windowEnd,
      durationHours: durationHours ?? this.durationHours,
      venueName: venueName ?? this.venueName,
      venueArea: venueArea ?? this.venueArea,
      note: note ?? this.note,
      acknowledged: acknowledged ?? this.acknowledged,
    );
  }
}
