import 'package:flutter/material.dart';

class CheckboxDropdownItem {
  final String label;
  final String? description;

  const CheckboxDropdownItem({
    required this.label,
    this.description,
  });
}

class AppCheckboxDropdown extends StatelessWidget {
  final String? label;
  final String? hint;
  final String? error;
  final bool required;
  final bool enabled;
  final List<CheckboxDropdownItem> allItems;
  final List<String> selectedLabels;
  final ValueChanged<List<String>>? onChanged;
  final String? helperText;
  final int? maxSelected;
  final String title;

  const AppCheckboxDropdown({
    super.key,
    this.label,
    this.hint,
    this.error,
    this.required = false,
    this.enabled = true,
    required this.allItems,
    required this.selectedLabels,
    this.onChanged,
    this.helperText,
    this.maxSelected,
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
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              suffixIcon: const Icon(Icons.unfold_more, size: 20),
            ),
            child: selectedLabels.isNotEmpty
                ? Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: selectedLabels.map((sel) {
                      return Chip(
                        label: Text(sel, style: const TextStyle(fontSize: 12)),
                        visualDensity: VisualDensity.compact,
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        deleteIcon: const Icon(Icons.close, size: 14),
                        onDeleted: () {
                          final updated = List<String>.from(selectedLabels)..remove(sel);
                          onChanged?.call(updated);
                        },
                      );
                    }).toList(),
                  )
                : null,
          ),
        ),
      ],
    );
  }

  void _showPicker(BuildContext context) {
    final Set<String> sheetSelected = Set.from(selectedLabels);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return _PickerBody(
          title: title,
          items: allItems,
          initialSelected: sheetSelected,
          maxSelected: maxSelected,
          onDone: (result) {
            onChanged?.call(result.toList());
          },
        );
      },
    );
  }
}

class _PickerBody extends StatefulWidget {
  final String title;
  final List<CheckboxDropdownItem> items;
  final Set<String> initialSelected;
  final int? maxSelected;
  final ValueChanged<Set<String>> onDone;

  const _PickerBody({
    required this.title,
    required this.items,
    required this.initialSelected,
    this.maxSelected,
    required this.onDone,
  });

  @override
  State<_PickerBody> createState() => _PickerBodyState();
}

class _PickerBodyState extends State<_PickerBody> {
  late Set<String> _selected;

  @override
  void initState() {
    super.initState();
    _selected = Set.from(widget.initialSelected);
  }

  @override
  Widget build(BuildContext context) {
    final canSelectMore = widget.maxSelected == null || _selected.length < widget.maxSelected!;

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
          child: Row(
            children: [
              Expanded(
                child: Text(widget.title, style: Theme.of(context).textTheme.titleMedium),
              ),
              if (_selected.isNotEmpty)
                TextButton(
                  onPressed: () => setState(() => _selected.clear()),
                  child: const Text('Clear all'),
                ),
            ],
          ),
        ),
        const Divider(height: 1),
        ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.4,
          ),
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: widget.items.length,
            itemBuilder: (context, index) {
              final item = widget.items[index];
              final isChecked = _selected.contains(item.label);
              return CheckboxListTile(
                value: isChecked,
                onChanged: (value) {
                  if (value == true && !canSelectMore) return;
                  setState(() {
                    if (value == true) {
                      _selected.add(item.label);
                    } else {
                      _selected.remove(item.label);
                    }
                  });
                },
                title: Text(item.label, style: const TextStyle(fontSize: 14)),
                subtitle: item.description != null
                    ? Text(item.description!, style: const TextStyle(fontSize: 12))
                    : null,
                dense: true,
                controlAffinity: ListTileControlAffinity.leading,
              );
            },
          ),
        ),
        const Divider(height: 1),
        Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                widget.onDone(_selected);
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF034548),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Done'),
            ),
          ),
        ),
      ],
    );
  }
}
