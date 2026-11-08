import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hangwise/data/api_exception.dart';
import 'package:hangwise/features/discover/discover_screen.dart';
import 'package:hangwise/state/providers.dart';
import 'package:hangwise/widgets/demo_banner.dart';

void main() {
  testWidgets('shows the demo banner', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: DemoBanner())));
    expect(find.textContaining('DEMO'), findsOneWidget);
    expect(find.textContaining('does not'), findsNothing);
    expect(find.textContaining('not replaced'), findsOneWidget);
  });

  testWidgets('a failed discover call does not show fictional companions', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          companionsProvider.overrideWith((ref) async => throw ApiException('offline')),
        ],
        child: const MaterialApp(home: DiscoverScreen()),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('Could not load'), findsOneWidget);
    expect(find.textContaining('does not replace'), findsOneWidget);
    expect(find.text('Maya Srisai'), findsNothing);
  });
}
