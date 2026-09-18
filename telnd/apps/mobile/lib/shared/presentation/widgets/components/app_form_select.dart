import 'package:flutter/material.dart';

class FormSelectItem {
  final String label;
  final String? description;

  const FormSelectItem({required this.label, this.description});
}

class AppFormSelect extends StatelessWidget {
  final String? label;
  final String? hint;
  final String? error;
  final bool required;
  final bool enabled;
  final FormSelectItem? value;
  final List<FormSelectItem> items;
  final ValueChanged<FormSelectItem?>? onChanged;
  final String? helperText;
  final String title;

  const AppFormSelect({
    super.key,
    this.label,
    this.hint,
    this.error,
    this.required = false,
    this.enabled = true,
    this.value,
    required this.items,
    this.onChanged,
    this.helperText,
    this.title = 'Select',
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (label != null) ...[
          Row(
            children: [
              Text(
                label!,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
              ),
              if (required) const Text(' *', style: TextStyle(color: Color(0xFFDC2626))),
            ],
          ),
          const SizedBox(height: 6),
        ],
        InkWell(
          onTap: enabled ? () => _showPicker(context) : null,
          borderRadius: BorderRadius.circular(8),
          child: InputDecorator(
            decoration: InputDecoration(
              hintText: hint ?? 'Select...',
              errorText: error,
              helperText: helperText,
              helperMaxLines: 2,
              filled: true,
              fillColor: enabled
                  ? Theme.of(context).colorScheme.surface
                  : Theme.of(context).disabledColor.withOpacity(0.1),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: Theme.of(context).dividerColor),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: Theme.of(context).dividerColor),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: Theme.of(context).colorScheme.primary, width: 2),
              ),
              errorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFFDC2626)),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              suffixIcon: const Icon(Icons.unfold_more, size: 20),
            ),
            child: value != null
                ? Text(
                    value!.label,
                    style: const TextStyle(fontSize: 14),
                    overflow: TextOverflow.ellipsis,
                  )
                : null,
          ),
        ),
      ],
    );
  }

  void _showPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Theme.of(context).dividerColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text(title, style: Theme.of(context).textTheme.titleMedium),
            ),
            const Divider(height: 1),
            ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.4,
              ),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: items.length,
                itemBuilder: (context, index) {
                  final item = items[index];
                  final isSelected = value?.label == item.label;
                  return ListTile(
                    title: Text(item.label, style: const TextStyle(fontSize: 14)),
                    subtitle: item.description != null
                        ? Text(item.description!, style: const TextStyle(fontSize: 12))
                        : null,
                    trailing: isSelected
                        ? Icon(Icons.check, color: Theme.of(context).colorScheme.primary, size: 20)
                        : null,
                    onTap: () {
                      onChanged?.call(item);
                      Navigator.pop(context);
                    },
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }
}
