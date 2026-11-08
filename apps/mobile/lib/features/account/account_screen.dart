import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hangwise/demo/personas.dart';
import 'package:hangwise/domain/models.dart';
import 'package:hangwise/state/providers.dart';
import 'package:hangwise/widgets/async_page.dart';

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final persona = ref.watch(personaProvider);
    final config = ref.watch(appConfigProvider);
    final health = ref.watch(healthProvider);
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('Account', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 8),
        const Text('Development persona switcher. The API rejects these headers unless AUTH_MODE=development and NODE_ENV is development or test.'),
        const SizedBox(height: 12),
        DropdownButton<DemoPersona>(
          isExpanded: true,
          value: persona,
          items: DemoPersona.all
              .map((item) => DropdownMenuItem(value: item, child: Text('${item.label} (${item.role})')))
              .toList(),
          onChanged: (value) {
            if (value == null) return;
            ref.read(personaProvider.notifier).select(value);
          },
        ),
        const SizedBox(height: 12),
        Text('API base URL: ${config.normalizedBaseUrl}'),
        const SizedBox(height: 8),
        const Text('iOS Simulator: http://127.0.0.1:3000. Android emulator: http://10.0.2.2:3000. A physical device needs your computer\'s LAN address. Pass it with --dart-define=API_BASE_URL=...'),
        const SizedBox(height: 16),
        AsyncPage<HealthStatus>(
          value: health,
          onRetry: () => ref.invalidate(healthProvider),
          data: (status) => Text(
            'Server says demoMode=${status.demoMode}, payments=${status.payments}, verification=${status.verification}, auth=${status.authMode}, fee=${status.feePolicy}.',
          ),
        ),
        const SizedBox(height: 16),
        OutlinedButton(onPressed: () => context.go('/safety'), child: const Text('Safety and reports')),
      ],
    );
  }
}
