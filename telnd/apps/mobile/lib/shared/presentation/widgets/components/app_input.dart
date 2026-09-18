import 'package:flutter/material.dart';

enum AppInputSize { sm, md, lg }

class AppInput extends StatelessWidget {
  final String? label;
  final String? hint;
  final String? error;
  final String? helperText;
  final bool required;
  final bool enabled;
  final bool readOnly;
  final IconData? prefixIcon;
  final IconData? suffixIcon;
  final VoidCallback? onSuffixTap;
  final TextEditingController? controller;
  final AppInputSize size;
  final int maxLines;
  final TextInputType? keyboardType;
  final ValueChanged<String>? onChanged;

  const AppInput({
    super.key,
    this.label,
    this.hint,
    this.error,
    this.helperText,
    this.required = false,
    this.enabled = true,
    this.readOnly = false,
    this.prefixIcon,
    this.suffixIcon,
    this.onSuffixTap,
    this.controller,
    this.size = AppInputSize.md,
    this.maxLines = 1,
    this.keyboardType,
    this.onChanged,
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
                style: TextStyle(
                  fontSize: size == AppInputSize.sm ? 12 : 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (required) const Text(' *', style: TextStyle(color: Color(0xFFDC2626))),
            ],
          ),
          const SizedBox(height: 6),
        ],
        TextField(
          controller: controller,
          enabled: enabled,
          readOnly: readOnly,
          maxLines: maxLines,
          keyboardType: keyboardType,
          onChanged: onChanged,
          style: TextStyle(fontSize: _getFontSize()),
          decoration: InputDecoration(
            hintText: hint,
            helperText: helperText,
            helperMaxLines: 2,
            errorText: error,
            prefixIcon: prefixIcon != null ? Icon(prefixIcon, size: _getIconSize()) : null,
            suffixIcon: suffixIcon != null
                ? GestureDetector(
                    onTap: onSuffixTap,
                    child: Icon(suffixIcon, size: _getIconSize()),
                  )
                : null,
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
            contentPadding: EdgeInsets.symmetric(
              horizontal: 12,
              vertical: size == AppInputSize.sm ? 8 : size == AppInputSize.lg ? 16 : 12,
            ),
          ),
        ),
      ],
    );
  }

  double _getFontSize() {
    switch (size) {
      case AppInputSize.sm: return 13;
      case AppInputSize.md: return 14;
      case AppInputSize.lg: return 16;
    }
  }

  double _getIconSize() {
    switch (size) {
      case AppInputSize.sm: return 18;
      case AppInputSize.md: return 20;
      case AppInputSize.lg: return 22;
    }
  }
}
