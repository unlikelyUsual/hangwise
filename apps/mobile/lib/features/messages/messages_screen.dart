import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hangwise/domain/models.dart';
import 'package:hangwise/state/providers.dart';
import 'package:hangwise/widgets/async_page.dart';

final messagesProvider = FutureProvider.family<List<ChatMessage>, String>((ref, id) {
  return ref.watch(apiClientProvider).messages(id);
});

class MessagesScreen extends ConsumerWidget {
  const MessagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final conversations = ref.watch(conversationsProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
          child: Text('Messages', style: Theme.of(context).textTheme.headlineSmall),
        ),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 20),
          child: Text('Stored messages only. Nothing is pushed to a phone, and there is no emergency alert.'),
        ),
        Expanded(
          child: AsyncPage<List<ConversationSummary>>(
            value: conversations,
            onRetry: () => ref.invalidate(conversationsProvider),
            isEmpty: (rows) => rows.isEmpty,
            empty: const Center(child: Text('No conversations for this demo persona.')),
            data: (rows) => ListView.builder(
              itemCount: rows.length,
              itemBuilder: (context, index) {
                final row = rows[index];
                return ListTile(
                  title: Text(row.lastMessagePreview ?? 'No messages yet'),
                  subtitle: Text(row.bookingId == null ? 'Conversation' : 'About a booking'),
                  onTap: () => context.go('/messages/${row.id}'),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

class ThreadScreen extends ConsumerStatefulWidget {
  const ThreadScreen({super.key, required this.conversationId});

  final String conversationId;

  @override
  ConsumerState<ThreadScreen> createState() => _ThreadScreenState();
}

class _ThreadScreenState extends ConsumerState<ThreadScreen> {
  final _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final messages = ref.watch(messagesProvider(widget.conversationId));
    return Column(
      children: [
        Expanded(
          child: AsyncPage<List<ChatMessage>>(
            value: messages,
            onRetry: () => ref.invalidate(messagesProvider(widget.conversationId)),
            isEmpty: (rows) => rows.isEmpty,
            empty: const Center(child: Text('No messages yet.')),
            data: (rows) => ListView(
              padding: const EdgeInsets.all(16),
              children: rows.map((message) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(message.body),
              )).toList(),
            ),
          ),
        ),
        if (_error != null) Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Text(_error!)),
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(child: TextField(controller: _controller, decoration: const InputDecoration(hintText: 'Message'))),
              IconButton(onPressed: _send, icon: const Icon(Icons.send)),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    try {
      await ref.read(apiClientProvider).sendMessage(widget.conversationId, text);
      _controller.clear();
      ref.invalidate(messagesProvider(widget.conversationId));
      ref.invalidate(conversationsProvider);
      if (mounted) setState(() => _error = null);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    }
  }
}
