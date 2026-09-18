import 'package:flutter/material.dart';

enum AppSwitchSize { sm, md, lg }

class AppSwitch extends StatelessWidget {
  final String? label;
  final String? description;
  final bool value;
  final ValueChanged<bool>? onChanged;
  final AppSwitchSize size;
  final bool enabled;

  const AppSwitch({
    super.key,
    this.label,
    this.description,
    required this.value,
    this.onChanged,
    this.size = AppSwitchSize.md,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDisabled = !enabled || onChanged == null;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: GestureDetector(
            onTap: isDisabled ? null : () => onChanged?.call(!value),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (label != null)
                  Text(
                    label!,
                    style: TextStyle(
                      fontSize: size == AppSwitchSize.sm ? 12 : 14,
                      fontWeight: FontWeight.w500,
                      color: isDisabled
                          ? Theme.of(context).disabledColor
                          : Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                if (description != null)
                  Text(
                    description!,
                    style: TextStyle(
                      fontSize: size == AppSwitchSize.sm ? 10 : 12,
                      color: isDisabled
                          ? Theme.of(context).disabledColor.withOpacity(0.6)
                          : Theme.of(context).textTheme.bodySmall?.color,
                    ),
                  ),
              ],
            ),
          ),
        ),
        Opacity(
          opacity: isDisabled ? 0.4 : 1.0,
          child: Transform.scale(
            scale: _getScale(),
            child: Switch(
              value: value,
              onChanged: isDisabled ? null : onChanged,
              activeColor: Colors.white,
              activeTrackColor: const Color(0xFF30A9A2),
              inactiveTrackColor: Theme.of(context).dividerColor,
              inactiveThumbColor: Colors.white,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ),
        ),
      ],
    );
  }

  double _getScale() {
    switch (size) {
      case AppSwitchSize.sm: return 0.8;
      case AppSwitchSize.md: return 1.0;
      case AppSwitchSize.lg: return 1.2;
    }
  }
}
