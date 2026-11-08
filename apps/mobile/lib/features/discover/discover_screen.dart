import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hangwise/domain/format.dart';
import 'package:hangwise/domain/models.dart';
import 'package:hangwise/state/providers.dart';
import 'package:hangwise/theme/hangwise_theme.dart';
import 'package:hangwise/widgets/async_page.dart';

class DiscoverScreen extends ConsumerWidget {
  const DiscoverScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final companions = ref.watch(companionsProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
          child: Text('Hangwise', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700)),
        ),
        const Padding(
          padding: EdgeInsets.fromLTRB(20, 0, 20, 12),
          child: Text('Paid time for a public hangout. Not a sexual service and not a romance.'),
        ),
        Expanded(
          child: AsyncPage<List<Companion>>(
            value: companions,
            onRetry: () => ref.invalidate(companionsProvider),
            isEmpty: (rows) => rows.isEmpty,
            empty: const Center(child: Text('No companions are listed. Seed the demo database to see fictional profiles.')),
            data: (rows) => RefreshIndicator(
              onRefresh: () async => ref.invalidate(companionsProvider),
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                itemCount: rows.length,
                separatorBuilder: (context, index) => const SizedBox(height: 12),
                itemBuilder: (context, index) => CompanionCard(companion: rows[index]),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class CompanionCard extends StatelessWidget {
  const CompanionCard({super.key, required this.companion});

  final Companion companion;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => context.go('/companions/${companion.id}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: hangwiseTeal,
                child: Text(companion.initials, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(companion.publicName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                    Text('${companion.ageYears} · age not verified · ${companion.area}'),
                    const SizedBox(height: 4),
                    Text(companion.headline),
                    const SizedBox(height: 6),
                    Text(
                      '${formatMinor(companion.hourlyRateMinor, companion.currency)} / hour · ${companion.languages.join(', ')}',
                      style: const TextStyle(color: hangwiseTeal, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
