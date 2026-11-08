import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hangwise/routing/app_router.dart';
import 'package:hangwise/theme/hangwise_theme.dart';

class HangwiseApp extends ConsumerWidget {
  const HangwiseApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'Hangwise',
      theme: hangwiseTheme,
      routerConfig: ref.watch(routerProvider),
      debugShowCheckedModeBanner: false,
    );
  }
}
