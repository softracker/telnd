import 'package:flutter/material.dart';

class ActionItem {
  final String label;
  final IconData icon;
  final bool danger;
  final bool disabled;
  final String? shortcut;

  const ActionItem({
    required this.label,
    required this.icon,
    this.danger = false,
    this.disabled = false,
    this.shortcut,
  });
}

class AppActionsDropdown extends StatelessWidget {
  final Widget child;
  final List<ActionItem> items;
  final void Function(int index)? onSelected;
  final String? title;

  const AppActionsDropdown({
    super.key,
    required this.child,
    required this.items,
    this.onSelected,
    this.title,
  });

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<int>(
      onSelected: (index) {
        if (!items[index].disabled) onSelected?.call(index);
      },
      offset: const Offset(0, 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: Theme.of(context).colorScheme.surface,
      elevation: 4,
      constraints: const BoxConstraints(minWidth: 220),
      itemBuilder: (context) => items.asMap().entries.map((entry) {
        final item = entry.value;
        final isDanger = item.danger;
        final color = isDanger
            ? const Color(0xFFDC2626)
            : item.disabled
                ? Theme.of(context).disabledColor
                : Theme.of(context).colorScheme.onSurface;

        return PopupMenuItem<int>(
          value: entry.key,
          enabled: !item.disabled,
          child: Row(
            children: [
              Icon(item.icon, size: 18, color: color),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  item.label,
                  style: TextStyle(fontSize: 14, color: color),
                ),
              ),
              if (item.shortcut != null)
                Text(
                  item.shortcut!,
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).textTheme.bodySmall?.color,
                  ),
                ),
            ],
          ),
        );
      }).toList(),
      child: child,
    );
  }
}
