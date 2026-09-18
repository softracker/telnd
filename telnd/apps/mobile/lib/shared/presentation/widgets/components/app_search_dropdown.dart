import 'package:flutter/material.dart';

class SearchDropdownItem {
  final String label;
  final String? description;
  final IconData? icon;

  const SearchDropdownItem({
    required this.label,
    this.description,
    this.icon,
  });
}

class AppSearchDropdown extends StatefulWidget {
  final String? label;
  final String? hint;
  final String? error;
  final bool required;
  final bool enabled;
  final SearchDropdownItem? value;
  final List<SearchDropdownItem> items;
  final ValueChanged<SearchDropdownItem?>? onChanged;
  final String? helperText;
  final String searchHint;

  const AppSearchDropdown({
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
    this.searchHint = 'Search...',
  });

  @override
  State<AppSearchDropdown> createState() => _AppSearchDropdownState();
}

class _AppSearchDropdownState extends State<AppSearchDropdown> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.label != null) ...[
          Row(
            children: [
              Text(
                widget.label!,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
              ),
              if (widget.required) const Text(' *', style: TextStyle(color: Color(0xFFDC2626))),
            ],
          ),
          const SizedBox(height: 6),
        ],
        InkWell(
          onTap: widget.enabled ? () => _showPicker(context) : null,
          borderRadius: BorderRadius.circular(8),
          child: InputDecorator(
            decoration: InputDecoration(
              hintText: widget.hint ?? 'Select...',
              errorText: widget.error,
              helperText: widget.helperText,
              helperMaxLines: 2,
              filled: true,
              fillColor: widget.enabled
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
            child: widget.value != null
                ? Text(
                    widget.value!.label,
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
    _searchController.clear();
    List<SearchDropdownItem> filtered = List.from(widget.items);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
              ),
              child: Column(
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
                    child: TextField(
                      controller: _searchController,
                      autofocus: true,
                      decoration: InputDecoration(
                        hintText: widget.searchHint,
                        prefixIcon: const Icon(Icons.search, size: 20),
                        filled: true,
                        fillColor: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.5),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                      onChanged: (value) {
                        setModalState(() {
                          filtered = widget.items
                              .where((item) =>
                                  item.label.toLowerCase().contains(value.toLowerCase()) ||
                                  (item.description?.toLowerCase().contains(value.toLowerCase()) ?? false))
                              .toList();
                        });
                      },
                    ),
                  ),
                  const Divider(height: 1),
                  ConstrainedBox(
                    constraints: BoxConstraints(
                      maxHeight: MediaQuery.of(context).size.height * 0.4,
                    ),
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final item = filtered[index];
                        final isSelected = widget.value?.label == item.label;
                        return ListTile(
                          leading: item.icon != null ? Icon(item.icon, size: 20) : null,
                          title: Text(item.label, style: const TextStyle(fontSize: 14)),
                          subtitle: item.description != null
                              ? Text(item.description!, style: const TextStyle(fontSize: 12))
                              : null,
                          trailing: isSelected
                              ? Icon(Icons.check, color: Theme.of(context).colorScheme.primary, size: 20)
                              : null,
                          dense: true,
                          onTap: () {
                            widget.onChanged?.call(item);
                            Navigator.pop(context);
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
