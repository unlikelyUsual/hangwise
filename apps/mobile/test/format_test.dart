import 'package:flutter_test/flutter_test.dart';
import 'package:hangwise/domain/format.dart';

void main() {
  test('formats THB minor units with grouping', () {
    expect(formatMinor(150000, 'THB'), '1,500.00 THB');
    expect(formatMinor(300000, 'THB'), '3,000.00 THB');
  });

  test('formats an instant in Asia/Bangkok', () {
    expect(formatBangkok(DateTime.parse('2026-11-09T03:00:00.000Z')), '9 Nov 2026, 10:00 Asia/Bangkok');
  });
}
