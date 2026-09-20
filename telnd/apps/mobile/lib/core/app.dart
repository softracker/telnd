import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:telnd_mobile/core/theme.dart';
import 'package:telnd_mobile/core/theme_provider.dart';
import 'package:telnd_mobile/core/router.dart';

class TelndApp extends ConsumerWidget {
  const TelndApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final themeProvider = ref.watch(themeProviderNotifier);
    final isDark = themeProvider.flutterThemeMode == ThemeMode.dark ||
        (themeProvider.flutterThemeMode == ThemeMode.system &&
            MediaQuery.platformBrightnessOf(context) == Brightness.dark);

    return MaterialApp.router(
      title: 'TELND',
      color: Colors.transparent,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: themeProvider.flutterThemeMode,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
      builder: (context, child) {
        return Stack(
          children: [
            Positioned.fill(
              child: ColoredBox(
                color: isDark ? AppTheme.darkBackground : AppTheme.lightBackground,
              ),
            ),
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: const Alignment(0, -0.5),
                    radius: 1.5,
                    colors: [
                      (isDark ? AppTheme.accent : AppTheme.primary)
                          .withOpacity(0.03),
                      Colors.transparent,
                    ],
                    stops: const [0.0, 1.0],
                  ),
                ),
              ),
            ),
            if (child != null) child,
          ],
        );
      },
    );
  }
}

// Theme provider notifier
final themeProviderNotifier = ChangeNotifierProvider<ThemeProvider>((ref) {
  return ThemeProvider();
});
