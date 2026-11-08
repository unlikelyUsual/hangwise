import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hangwise/domain/format.dart';
import 'package:hangwise/domain/models.dart';
import 'package:hangwise/state/providers.dart';
import 'package:hangwise/widgets/async_page.dart';

final companionProvider = FutureProvider.family<Companion, String>((ref, id) {
  return ref.watch(apiClientProvider).companion(id);
});

class CompanionScreen extends ConsumerWidget {
  const CompanionScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final companion = ref.watch(companionProvider(id));
    return AsyncPage<Companion>(
      value: companion,
      onRetry: () => ref.invalidate(companionProvider(id)),
      data: (person) => ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(person.publicName, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text('${person.ageYears}, ${person.city} · ${person.area}'),
          const SizedBox(height: 8),
          const Text('Fictional adult. Age and identity are not verified.'),
          const SizedBox(height: 16),
          Text(person.headline, style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text(person.bio),
          const SizedBox(height: 16),
          Text(person.boundaries),
          const SizedBox(height: 16),
          Text('Languages: ${person.languages.join(', ')}'),
          const SizedBox(height: 8),
          Text('${formatMinor(person.hourlyRateMinor, person.currency)} per hour. The server snapshots the price. Platform fee: unknown.'),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () => context.go('/companions/${person.id}/request'),
            child: const Text('Request a public date'),
          ),
        ],
      ),
    );
  }
}
