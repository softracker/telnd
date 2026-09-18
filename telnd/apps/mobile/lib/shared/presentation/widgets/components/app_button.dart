import 'package:flutter/material.dart';

enum AppButtonVariant { primary, secondary, accent, orange, outline, ghost, danger, link }
enum AppButtonSize { xs, sm, md, lg, xl }

class AppButton extends StatelessWidget {
  final String label;
  final AppButtonVariant variant;
  final AppButtonSize size;
  final VoidCallback? onPressed;
  final bool loading;
  final bool fullWidth;
  final IconData? iconLeading;
  final IconData? iconTrailing;

  const AppButton({
    super.key,
    required this.label,
    this.variant = AppButtonVariant.primary,
    this.size = AppButtonSize.md,
    this.onPressed,
    this.loading = false,
    this.fullWidth = false,
    this.iconLeading,
    this.iconTrailing,
  });

  @override
  Widget build(BuildContext context) {
    final colors = _getColors(context);
    final padding = _getPadding();
    final fontSize = _getFontSize();
    final borderRadius = BorderRadius.circular(8);

    if (variant == AppButtonVariant.link) {
      return TextButton(
        onPressed: loading ? null : onPressed,
        child: loading
            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
            : Text(label, style: TextStyle(color: colors.foreground, fontSize: fontSize)),
      );
    }

    return SizedBox(
      width: fullWidth ? double.infinity : null,
      height: _getHeight(),
      child: variant == AppButtonVariant.outline
          ? OutlinedButton(
              onPressed: loading ? null : onPressed,
              style: OutlinedButton.styleFrom(
                foregroundColor: colors.foreground,
                side: BorderSide(color: colors.foreground),
                padding: padding,
                shape: RoundedRectangleBorder(borderRadius: borderRadius),
                textStyle: TextStyle(fontSize: fontSize, fontWeight: FontWeight.w600),
              ),
              child: _buildChild(colors.foreground),
            )
          : variant == AppButtonVariant.ghost
              ? TextButton(
                  onPressed: loading ? null : onPressed,
                  style: TextButton.styleFrom(
                    foregroundColor: colors.foreground,
                    padding: padding,
                    shape: RoundedRectangleBorder(borderRadius: borderRadius),
                    textStyle: TextStyle(fontSize: fontSize, fontWeight: FontWeight.w600),
                  ),
                  child: _buildChild(colors.foreground),
                )
              : ElevatedButton(
                  onPressed: loading ? null : onPressed,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: colors.background,
                    foregroundColor: colors.foreground,
                    padding: padding,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: borderRadius),
                    textStyle: TextStyle(fontSize: fontSize, fontWeight: FontWeight.w600),
                  ),
                  child: _buildChild(colors.foreground),
                ),
    );
  }

  Widget _buildChild(Color foregroundColor) {
    if (loading) {
      return SizedBox(
        width: 16,
        height: 16,
        child: CircularProgressIndicator(strokeWidth: 2, color: foregroundColor),
      );
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (iconLeading != null) ...[Icon(iconLeading, size: _getIconSize()), const SizedBox(width: 6)],
        Text(label),
        if (iconTrailing != null) ...[const SizedBox(width: 6), Icon(iconTrailing, size: _getIconSize())],
      ],
    );
  }

  _ButtonColors _getColors(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    switch (variant) {
      case AppButtonVariant.primary:
        return _ButtonColors(background: const Color(0xFF034548), foreground: Colors.white);
      case AppButtonVariant.secondary:
        return _ButtonColors(background: const Color(0xFF0B1B2F), foreground: Colors.white);
      case AppButtonVariant.accent:
        return _ButtonColors(background: const Color(0xFF30A9A2), foreground: Colors.white);
      case AppButtonVariant.orange:
        return _ButtonColors(background: const Color(0xFFFE793F), foreground: Colors.white);
      case AppButtonVariant.outline:
        return _ButtonColors(background: Colors.transparent, foreground: cs.primary);
      case AppButtonVariant.ghost:
        return _ButtonColors(background: Colors.transparent, foreground: cs.onSurface);
      case AppButtonVariant.danger:
        return _ButtonColors(background: const Color(0xFFDC2626), foreground: Colors.white);
      case AppButtonVariant.link:
        return _ButtonColors(background: Colors.transparent, foreground: cs.primary);
    }
  }

  EdgeInsets _getPadding() {
    switch (size) {
      case AppButtonSize.xs:
        return const EdgeInsets.symmetric(horizontal: 10, vertical: 6);
      case AppButtonSize.sm:
        return const EdgeInsets.symmetric(horizontal: 12, vertical: 8);
      case AppButtonSize.md:
        return const EdgeInsets.symmetric(horizontal: 16, vertical: 10);
      case AppButtonSize.lg:
        return const EdgeInsets.symmetric(horizontal: 20, vertical: 12);
      case AppButtonSize.xl:
        return const EdgeInsets.symmetric(horizontal: 24, vertical: 14);
    }
  }

  double _getFontSize() {
    switch (size) {
      case AppButtonSize.xs: return 12;
      case AppButtonSize.sm: return 13;
      case AppButtonSize.md: return 14;
      case AppButtonSize.lg: return 16;
      case AppButtonSize.xl: return 18;
    }
  }

  double _getHeight() {
    switch (size) {
      case AppButtonSize.xs: return 28;
      case AppButtonSize.sm: return 32;
      case AppButtonSize.md: return 40;
      case AppButtonSize.lg: return 44;
      case AppButtonSize.xl: return 48;
    }
  }

  double _getIconSize() {
    switch (size) {
      case AppButtonSize.xs: return 12;
      case AppButtonSize.sm: return 14;
      case AppButtonSize.md: return 16;
      case AppButtonSize.lg: return 18;
      case AppButtonSize.xl: return 20;
    }
  }
}

class _ButtonColors {
  final Color background;
  final Color foreground;
  const _ButtonColors({required this.background, required this.foreground});
}
