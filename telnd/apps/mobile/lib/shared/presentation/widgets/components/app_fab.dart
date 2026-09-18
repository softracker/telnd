import 'package:flutter/material.dart';

enum AppFabVariant { primary, accent, orange, secondary }

class AppFAB extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final AppFabVariant variant;
  final String? label;

  const AppFAB({
    super.key,
    required this.icon,
    this.onPressed,
    this.variant = AppFabVariant.primary,
    this.label,
  });

  @override
  Widget build(BuildContext context) {
    final colors = _getColors();

    if (label != null) {
      return FloatingActionButton.extended(
        onPressed: onPressed,
        backgroundColor: colors.$1,
        foregroundColor: colors.$2,
        icon: Icon(icon),
        label: Text(label!),
      );
    }

    return FloatingActionButton(
      onPressed: onPressed,
      backgroundColor: colors.$1,
      foregroundColor: colors.$2,
      child: Icon(icon),
    );
  }

  (Color, Color) _getColors() {
    switch (variant) {
      case AppFabVariant.primary:
        return (const Color(0xFF034548), Colors.white);
      case AppFabVariant.accent:
        return (const Color(0xFF30A9A2), Colors.white);
      case AppFabVariant.orange:
        return (const Color(0xFFFE793F), Colors.white);
      case AppFabVariant.secondary:
        return (const Color(0xFF0B1B2F), Colors.white);
    }
  }
}
