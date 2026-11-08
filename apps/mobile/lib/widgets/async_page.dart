import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AsyncPage<T> extends StatelessWidget {
  const AsyncPage({
    super.key,
    required this.value,
    required this.onRetry,
    required this.data,
    this.isEmpty,
    this.empty,
  });

  final AsyncValue<T> value;
  final VoidCallback onRetry;
  final Widget Function(T data) data;
  final bool Function(T data)? isEmpty;
  final Widget? empty;

  @override
  Widget build(BuildContext context) {
    return value.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => _Message(
        title: 'Could not load this screen',
        body: '$error\n\nDemo mode does not replace a failed request with sample data.',
        action: onRetry,
      ),
      data: (payload) {
        if (isEmpty != null && isEmpty!(payload)) {
          return empty ?? const _Message(title: 'Nothing here yet', body: 'The server returned an empty list.');
        }
        return data(payload);
      },
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.title, required this.body, this.action});

  final String title;
  final String body;
  final VoidCallback? action;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final minHeight = constraints.maxHeight.isFinite ? constraints.maxHeight : 0.0;
        return SingleChildScrollView(
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: minHeight),
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleMedium, textAlign: TextAlign.center),
                  const SizedBox(height: 8),
                  Text(body, textAlign: TextAlign.center),
                  if (action != null) ...[
                    const SizedBox(height: 16),
                    OutlinedButton(onPressed: action, child: const Text('Try again')),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
