import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:telnd_mobile/core/app.dart';
import 'package:telnd_mobile/core/theme_provider.dart';

class ThemeToggle extends ConsumerWidget {
  const ThemeToggle({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeProvider = ref.watch(themeProviderNotifier);
    final themeNotifier = ref.read(themeProviderNotifier.notifier);

    return PopupMenuButton<AppThemeMode>(
      icon: Icon(
        themeProvider.themeModeIcon,
        color: Theme.of(context).colorScheme.primary,
      ),
      onSelected: (AppThemeMode mode) {
        themeNotifier.setThemeMode(mode);
      },
      itemBuilder: (BuildContext context) => [
        PopupMenuItem<AppThemeMode>(
          value: AppThemeMode.light,
          child: Row(
            children: [
              const Icon(Icons.light_mode, size: 20),
              const SizedBox(width: 12),
              const Text('Light'),
              if (themeProvider.themeMode == AppThemeMode.light)
                const Padding(
                  padding: EdgeInsets.only(left: 8),
                  child: Icon(Icons.check, size: 16, color: Colors.green),
                ),
            ],
          ),
        ),
        PopupMenuItem<AppThemeMode>(
          value: AppThemeMode.dark,
          child: Row(
            children: [
              const Icon(Icons.dark_mode, size: 20),
              const SizedBox(width: 12),
              const Text('Dark'),
              if (themeProvider.themeMode == AppThemeMode.dark)
                const Padding(
                  padding: EdgeInsets.only(left: 8),
                  child: Icon(Icons.check, size: 16, color: Colors.green),
                ),
            ],
          ),
        ),
        PopupMenuItem<AppThemeMode>(
          value: AppThemeMode.system,
          child: Row(
            children: [
              const Icon(Icons.brightness_auto, size: 20),
              const SizedBox(width: 12),
              const Text('System'),
              if (themeProvider.themeMode == AppThemeMode.system)
                const Padding(
                  padding: EdgeInsets.only(left: 8),
                  child: Icon(Icons.check, size: 16, color: Colors.green),
                ),
            ],
          ),
        ),
      ],
    );
  }
}
