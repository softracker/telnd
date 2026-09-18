import 'package:flutter/material.dart';

class DropdownItem {
  final String label;
  final IconData? icon;
  final bool danger;
  final bool disabled;

  const DropdownItem({
    required this.label,
    this.icon,
    this.danger = false,
    this.disabled = false,
  });
}

class AppDropdown extends StatelessWidget {
  final Widget child;
  final List<DropdownItem> items;
  final void Function(int index)? onSelected;
  final double? width;

  const AppDropdown({
    super.key,
    required this.child,
    required this.items,
    this.onSelected,
    this.width,
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
      constraints: BoxConstraints(minWidth: width ?? 200),
      itemBuilder: (context) => items.asMap().entries.map((entry) {
        final item = entry.value;
        final isDanger = item.danger;
        return PopupMenuItem<int>(
          value: entry.key,
          enabled: !item.disabled,
          child: Row(
            children: [
              if (item.icon != null) ...[
                Icon(
                  item.icon,
                  size: 18,
                  color: isDanger
                      ? const Color(0xFFDC2626)
                      : item.disabled
                          ? Theme.of(context).disabledColor
                          : Theme.of(context).colorScheme.onSurface,
                ),
                const SizedBox(width: 10),
              ],
              Expanded(
                child: Text(
                  item.label,
                  style: TextStyle(
                    fontSize: 14,
                    color: isDanger
                        ? const Color(0xFFDC2626)
                        : item.disabled
                            ? Theme.of(context).disabledColor
                            : Theme.of(context).colorScheme.onSurface,
                  ),
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
