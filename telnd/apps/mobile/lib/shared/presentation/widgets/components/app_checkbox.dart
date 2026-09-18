import 'package:flutter/material.dart';

enum AppCheckboxSize { sm, md, lg }

class AppCheckbox extends StatelessWidget {
  final String? label;
  final String? description;
  final bool value;
  final ValueChanged<bool?>? onChanged;
  final AppCheckboxSize size;
  final bool enabled;

  const AppCheckbox({
    super.key,
    this.label,
    this.description,
    required this.value,
    this.onChanged,
    this.size = AppCheckboxSize.md,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: enabled ? () => onChanged?.call(!value) : null,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: SizedBox(
              width: _getSize(),
              height: _getSize(),
              child: Checkbox(
                value: value,
                onChanged: enabled ? onChanged : null,
                activeColor: const Color(0xFF30A9A2),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                side: BorderSide(
                  color: enabled
                      ? Theme.of(context).dividerColor
                      : Theme.of(context).disabledColor,
                ),
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                visualDensity: VisualDensity.compact,
              ),
            ),
          ),
          if (label != null || description != null) ...[
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (label != null)
                    Text(
                      label!,
                      style: TextStyle(
                        fontSize: size == AppCheckboxSize.sm ? 12 : 14,
                        fontWeight: FontWeight.w500,
                        color: enabled
                            ? Theme.of(context).colorScheme.onSurface
                            : Theme.of(context).disabledColor,
                      ),
                    ),
                  if (description != null)
                    Text(
                      description!,
                      style: TextStyle(
                        fontSize: size == AppCheckboxSize.sm ? 10 : 12,
                        color: Theme.of(context).textTheme.bodySmall?.color,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  double _getSize() {
    switch (size) {
      case AppCheckboxSize.sm: return 16;
      case AppCheckboxSize.md: return 20;
      case AppCheckboxSize.lg: return 24;
    }
  }
}
