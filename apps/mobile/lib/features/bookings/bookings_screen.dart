import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hangwise/demo/personas.dart';
import 'package:hangwise/domain/format.dart';
import 'package:hangwise/domain/models.dart';
import 'package:hangwise/state/providers.dart';
import 'package:hangwise/widgets/async_page.dart';

class BookingsScreen extends ConsumerWidget {
  const BookingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookings = ref.watch(bookingsProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
          child: Text('Bookings', style: Theme.of(context).textTheme.headlineSmall),
        ),
        Expanded(
          child: AsyncPage<List<Booking>>(
            value: bookings,
            onRetry: () => ref.invalidate(bookingsProvider),
            isEmpty: (rows) => rows.isEmpty,
            empty: const Center(child: Text('No bookings for this demo persona.')),
            data: (rows) => ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: rows.length,
              separatorBuilder: (context, index) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final booking = rows[index];
                return ListTile(
                  tileColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  title: Text('${booking.venueName} · ${booking.status}'),
                  subtitle: Text('${formatBangkok(booking.startsAt)}\n${formatMinor(booking.price.minor, booking.price.currency)} · fee ${booking.price.feePolicy}'),
                  isThreeLine: true,
                  onTap: () => context.go('/bookings/${booking.id}'),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

class BookingDetailScreen extends ConsumerWidget {
  const BookingDetailScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookings = ref.watch(bookingsProvider);
    final persona = ref.watch(personaProvider);
    return AsyncPage<List<Booking>>(
      value: bookings,
      onRetry: () => ref.invalidate(bookingsProvider),
      data: (rows) {
        Booking? booking;
        for (final row in rows) {
          if (row.id == id) booking = row;
        }
        if (booking == null) {
          return const Center(child: Text('This persona cannot see that booking, or it does not exist.'));
        }
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(booking.venueName, style: Theme.of(context).textTheme.headlineSmall),
            Text(booking.venueArea),
            const SizedBox(height: 8),
            Text('${formatBangkok(booking.startsAt)} – ${formatBangkok(booking.endsAt)}'),
            const SizedBox(height: 8),
            Text('Status: ${booking.status}'),
            Text(formatMinor(booking.price.minor, booking.price.currency)),
            Text('Platform fee: ${booking.price.feePolicy}. Payment authorized: ${booking.paymentAuthorized}.'),
            if (booking.customerNote != null) Text(booking.customerNote!),
            const SizedBox(height: 16),
            ..._actions(context, ref, booking, persona),
          ],
        );
      },
    );
  }

  List<Widget> _actions(BuildContext context, WidgetRef ref, Booking booking, DemoPersona persona) {
    final companionSide = persona.role == 'companion' || persona.role == 'admin';
    final buttons = <Widget>[];
    if (companionSide && booking.status == 'requested') {
      buttons.add(_button(ref, booking.id, 'accept', 'Accept'));
      buttons.add(_button(ref, booking.id, 'decline', 'Decline'));
    }
    if (companionSide && booking.status == 'accepted') {
      buttons.add(_button(ref, booking.id, 'hold', 'Hold 30 min, no charge', body: {'holdMinutes': 30}));
      buttons.add(_button(ref, booking.id, 'complete', 'Mark complete'));
    }
    final cancellable = (persona.role == 'customer' && ['requested', 'accepted', 'hold'].contains(booking.status)) ||
        (persona.role == 'companion' && ['accepted', 'hold'].contains(booking.status)) ||
        (persona.role == 'admin' && ['requested', 'accepted', 'hold'].contains(booking.status));
    if (cancellable) buttons.add(_button(ref, booking.id, 'cancel', 'Cancel'));
    return buttons;
  }

  Widget _button(WidgetRef ref, String id, String action, String label, {Map<String, dynamic>? body}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: FilledButton(
        onPressed: () async {
          await ref.read(apiClientProvider).transition(id, action, body: body);
          ref.invalidate(bookingsProvider);
        },
        child: Text(label),
      ),
    );
  }
}
