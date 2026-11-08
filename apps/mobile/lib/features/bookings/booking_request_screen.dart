import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hangwise/domain/booking_draft.dart';
import 'package:hangwise/domain/format.dart';
import 'package:hangwise/domain/models.dart';
import 'package:hangwise/features/companions/companion_screen.dart';
import 'package:hangwise/state/providers.dart';
import 'package:hangwise/widgets/async_page.dart';

final availabilityProvider = FutureProvider.family<List<AvailabilityWindow>, String>((ref, id) {
  return ref.watch(apiClientProvider).availability(id);
});

class BookingRequestScreen extends ConsumerStatefulWidget {
  const BookingRequestScreen({super.key, required this.companionId});

  final String companionId;

  @override
  ConsumerState<BookingRequestScreen> createState() => _BookingRequestScreenState();
}

class _BookingRequestScreenState extends ConsumerState<BookingRequestScreen> {
  BookingDraft _draft = const BookingDraft();
  var _submitting = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final companion = ref.watch(companionProvider(widget.companionId));
    final windows = ref.watch(availabilityProvider(widget.companionId));
    return AsyncPage<Companion>(
      value: companion,
      onRetry: () => ref.invalidate(companionProvider(widget.companionId)),
      data: (person) {
        return windows.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(child: Text('$error')),
          data: (rows) => _form(context, person, rows),
        );
      },
    );
  }

  Widget _form(BuildContext context, Companion person, List<AvailabilityWindow> windows) {
    final upcoming = windows.where((window) => window.endsAt.isAfter(DateTime.now().toUtc())).toList();
    final estimate = _draft.estimateMinor(person.hourlyRateMinor);
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('Request time with ${person.publicName}', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        const Text('Choose a public venue. This request does not start a payment.'),
        const SizedBox(height: 16),
        if (upcoming.isEmpty) const Text('No upcoming availability was published.'),
        ...upcoming.take(8).map((window) {
          final selected = _draft.startsAt != null && !_draft.startsAt!.isBefore(window.startsAt) && _draft.endsAt != null && !_draft.endsAt!.isAfter(window.endsAt);
          return ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(window.label),
            trailing: selected ? const Icon(Icons.check) : null,
            onTap: () => setState(() {
              _draft = _draft.copyWith(startsAt: window.startsAt, windowEnd: window.endsAt, durationHours: 2);
            }),
          );
        }),
        const SizedBox(height: 8),
        const Text('Hours'),
        Wrap(
          spacing: 8,
          children: [1, 2, 3, 4].map((hours) {
            return ChoiceChip(
              label: Text('$hours h'),
              selected: _draft.durationHours == hours,
              onSelected: (_) => setState(() => _draft = _draft.copyWith(durationHours: hours)),
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        TextField(
          decoration: const InputDecoration(labelText: 'Public venue'),
          onChanged: (value) => _draft = _draft.copyWith(venueName: value),
        ),
        const SizedBox(height: 12),
        TextField(
          decoration: const InputDecoration(labelText: 'Area'),
          onChanged: (value) => _draft = _draft.copyWith(venueArea: value),
        ),
        const SizedBox(height: 12),
        TextField(
          decoration: const InputDecoration(labelText: 'Note, optional'),
          onChanged: (value) => _draft = _draft.copyWith(note: value),
        ),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          value: _draft.acknowledged,
          onChanged: (value) => setState(() => _draft = _draft.copyWith(acknowledged: value ?? false)),
          title: const Text('I understand this is a public date, not a sexual service, and not a romance entitlement.'),
        ),
        if (estimate != null)
          Text('Estimate ${formatMinor(estimate, person.currency)}. The server stores the snapshot. Platform fee: unknown.'),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
        ],
        const SizedBox(height: 16),
        FilledButton(
          onPressed: _submitting ? null : () => _submit(person),
          child: Text(_submitting ? 'Sending request' : 'Send request'),
        ),
      ],
    );
  }

  Future<void> _submit(Companion person) async {
    final problem = _draft.validate();
    if (problem != null) {
      setState(() => _error = problem);
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final booking = await ref.read(apiClientProvider).createBooking(
            companionProfileId: person.id,
            startsAt: _draft.startsAt!,
            endsAt: _draft.endsAt!,
            venueName: _draft.venueName,
            venueArea: _draft.venueArea,
            note: _draft.note,
            idempotencyKey: 'mobile${DateTime.now().millisecondsSinceEpoch}',
          );
      ref.invalidate(bookingsProvider);
      if (mounted) context.go('/bookings/${booking.id}');
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }
}
