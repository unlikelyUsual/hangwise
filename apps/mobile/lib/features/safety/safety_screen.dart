import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hangwise/state/providers.dart';
import 'package:hangwise/widgets/async_page.dart';

class SafetyScreen extends ConsumerStatefulWidget {
  const SafetyScreen({super.key});

  @override
  ConsumerState<SafetyScreen> createState() => _SafetyScreenState();
}

class _SafetyScreenState extends ConsumerState<SafetyScreen> {
  final _report = TextEditingController();
  String? _result;

  @override
  void dispose() {
    _report.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final policy = ref.watch(policyProvider);
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('Safety', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 8),
        const Text('This is not an emergency service. No one is monitoring a panic button, and check-in notes are records only.'),
        const SizedBox(height: 12),
        AsyncPage<Map<String, dynamic>>(
          value: policy,
          onRetry: () => ref.invalidate(policyProvider),
          data: (payload) {
            final statements = (payload['statements'] as List?)?.map((item) => item.toString()).toList() ?? [];
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: statements.map((line) => Padding(padding: const EdgeInsets.only(bottom: 6), child: Text('• $line'))).toList(),
            );
          },
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _report,
          minLines: 3,
          maxLines: 5,
          decoration: const InputDecoration(labelText: 'Report, at least 10 characters'),
        ),
        const SizedBox(height: 8),
        FilledButton(
          onPressed: () async {
            try {
              await ref.read(apiClientProvider).report(category: 'policy', body: _report.text.trim());
              if (mounted) setState(() => _result = 'Report stored. There is no review team in this demo.');
            } catch (error) {
              if (mounted) setState(() => _result = '$error');
            }
          },
          child: const Text('Store report'),
        ),
        if (_result != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_result!)),
      ],
    );
  }
}
