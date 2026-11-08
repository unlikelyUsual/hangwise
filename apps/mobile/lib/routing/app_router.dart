import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hangwise/features/account/account_screen.dart';
import 'package:hangwise/features/bookings/booking_request_screen.dart';
import 'package:hangwise/features/bookings/bookings_screen.dart';
import 'package:hangwise/features/companions/companion_screen.dart';
import 'package:hangwise/features/discover/discover_screen.dart';
import 'package:hangwise/features/messages/messages_screen.dart';
import 'package:hangwise/features/safety/safety_screen.dart';
import 'package:hangwise/widgets/demo_banner.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/discover',
    routes: [
      ShellRoute(
        builder: (context, state, child) => AppShell(location: state.uri.path, child: child),
        routes: [
          GoRoute(path: '/discover', builder: (context, state) => const DiscoverScreen()),
          GoRoute(
            path: '/companions/:id',
            builder: (context, state) => CompanionScreen(id: state.pathParameters['id']!),
            routes: [
              GoRoute(
                path: 'request',
                builder: (context, state) => BookingRequestScreen(companionId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(path: '/bookings', builder: (context, state) => const BookingsScreen()),
          GoRoute(
            path: '/bookings/:id',
            builder: (context, state) => BookingDetailScreen(id: state.pathParameters['id']!),
          ),
          GoRoute(path: '/messages', builder: (context, state) => const MessagesScreen()),
          GoRoute(
            path: '/messages/:id',
            builder: (context, state) => ThreadScreen(conversationId: state.pathParameters['id']!),
          ),
          GoRoute(path: '/account', builder: (context, state) => const AccountScreen()),
          GoRoute(path: '/safety', builder: (context, state) => const SafetyScreen()),
        ],
      ),
    ],
  );
});

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.location, required this.child});

  final String location;
  final Widget child;

  int get _index {
    if (location.startsWith('/bookings')) return 1;
    if (location.startsWith('/messages')) return 2;
    if (location.startsWith('/account') || location.startsWith('/safety')) return 3;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            const DemoBanner(),
            Expanded(child: child),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (index) {
          switch (index) {
            case 1:
              context.go('/bookings');
            case 2:
              context.go('/messages');
            case 3:
              context.go('/account');
            default:
              context.go('/discover');
          }
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.explore_outlined), selectedIcon: Icon(Icons.explore), label: 'Discover'),
          NavigationDestination(icon: Icon(Icons.event_outlined), selectedIcon: Icon(Icons.event), label: 'Bookings'),
          NavigationDestination(icon: Icon(Icons.chat_bubble_outline), selectedIcon: Icon(Icons.chat_bubble), label: 'Messages'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Account'),
        ],
      ),
    );
  }
}
