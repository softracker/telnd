import 'package:flutter/material.dart';

class ImageOptionItem {
  final String label;
  final String? description;
  final String? imageUrl;
  final IconData? icon;
  final Widget? leading;

  const ImageOptionItem({
    required this.label,
    this.description,
    this.imageUrl,
    this.icon,
    this.leading,
  });
}

class AppImageOptionDropdown extends StatefulWidget {
  final String? label;
  final String? hint;
  final String? error;
  final bool required;
  final bool enabled;
  final ImageOptionItem? value;
  final List<ImageOptionItem> items;
  final ValueChanged<ImageOptionItem?>? onChanged;
  final String? helperText;
  final String title;

  const AppImageOptionDropdown({
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
  State<AppImageOptionDropdown> createState() => _AppImageOptionDropdownState();
}

class _AppImageOptionDropdownState extends State<AppImageOptionDropdown> {
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
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              suffixIcon: const Icon(Icons.unfold_more, size: 20),
            ),
            child: widget.value != null
                ? _buildSelectedItem(widget.value!)
                : null,
          ),
        ),
      ],
    );
  }

  Widget _buildSelectedItem(ImageOptionItem item) {
    return Row(
      children: [
        _buildLeading(item, 32),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            item.label,
            style: const TextStyle(fontSize: 14),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildLeading(ImageOptionItem item, double size) {
    if (item.leading != null) return item.leading!;
    if (item.imageUrl != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(size / 2),
        child: Image.network(
          item.imageUrl!,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(
            width: size,
            height: size,
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            child: Icon(item.icon ?? Icons.image, size: size * 0.5),
          ),
        ),
      );
    }
    if (item.icon != null) {
      return CircleAvatar(
        radius: size / 2,
        child: Icon(item.icon, size: size * 0.5),
      );
    }
    return const SizedBox.shrink();
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
              child: Text(widget.title, style: Theme.of(context).textTheme.titleMedium),
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
                  final isSelected = widget.value?.label == item.label;
                  return ListTile(
                    leading: _buildLeading(item, 40),
                    title: Text(item.label, style: const TextStyle(fontSize: 14)),
                    subtitle: item.description != null
                        ? Text(item.description!, style: const TextStyle(fontSize: 12))
                        : null,
                    trailing: isSelected
                        ? Icon(Icons.check, color: Theme.of(context).colorScheme.primary, size: 20)
                        : null,
                    onTap: () {
                      widget.onChanged?.call(item);
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
