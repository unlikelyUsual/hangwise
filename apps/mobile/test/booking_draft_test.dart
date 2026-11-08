import 'package:flutter_test/flutter_test.dart';
import 'package:hangwise/domain/booking_draft.dart';

void main() {
  test('requires a public venue, an area, and the policy acknowledgement', () {
    final start = DateTime.utc(2026, 11, 10, 3);
    final draft = BookingDraft(startsAt: start, windowEnd: start.add(const Duration(hours: 8)));
    expect(draft.validate(), contains('public venue'));
    final named = draft.copyWith(venueName: 'Lumpini Park', venueArea: 'Pathum Wan');
    expect(named.validate(), contains('Acknowledge'));
    expect(named.copyWith(acknowledged: true).validate(), isNull);
    expect(
      named.copyWith(acknowledged: true, durationHours: 4, windowEnd: start.add(const Duration(hours: 3))).validate(),
      contains('past the published'),
    );
  });
}
