import 'package:flutter/material.dart';

enum AppRadioSize { sm, md, lg }

class AppRadio extends StatelessWidget {
  final String? label;
  final String? description;
  final String value;
  final String groupValue;
  final ValueChanged<String?>? onChanged;
  final AppRadioSize size;
  final bool enabled;

  const AppRadio({
    super.key,
    this.label,
    this.description,
    required this.value,
    required this.groupValue,
    this.onChanged,
    this.size = AppRadioSize.md,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: enabled ? () => onChanged?.call(value) : null,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: SizedBox(
              width: _getSize(),
              height: _getSize(),
              child: Radio<String>(
                value: value,
                groupValue: groupValue,
                onChanged: enabled ? onChanged : null,
                activeColor: const Color(0xFF30A9A2),
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
                        fontSize: size == AppRadioSize.sm ? 12 : 14,
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
                        fontSize: size == AppRadioSize.sm ? 10 : 12,
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
      case AppRadioSize.sm: return 16;
      case AppRadioSize.md: return 20;
      case AppRadioSize.lg: return 24;
    }
  }
}
