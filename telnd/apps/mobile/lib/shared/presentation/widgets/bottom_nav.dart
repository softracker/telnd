import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:telnd_mobile/core/theme.dart';

class BottomNav extends StatelessWidget {
  const BottomNav({super.key});

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final selected = _getSelectedIndex(location);
    final active = isDark ? AppTheme.accent : const Color(0xFF034548);
    final inactive = isDark ? const Color(0xFF5A6B80) : const Color(0xFF94A3B8);

    return Container(
      padding: const EdgeInsets.fromLTRB(8, 8, 8, 16),
      decoration: BoxDecoration(
        color: isDark
            ? const Color(0xFF1A2639)
            : const Color(0xFFF8F9FB),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.06),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _Tab(
                icon: HugeIcons.strokeRoundedHome01,
                label: 'Home',
                selected: selected == 0,
                active: active,
                inactive: inactive,
                onTap: () => context.go('/'),
              ),
              _Tab(
                icon: HugeIcons.strokeRoundedCompass,
                label: 'Explore',
                selected: selected == 1,
                active: active,
                inactive: inactive,
                onTap: () => context.go('/explore'),
              ),
              _CenterTab(
                selected: selected == 2,
                isDark: isDark,
                onTap: () => context.go('/ai'),
              ),
              _Tab(
                icon: HugeIcons.strokeRoundedChat,
                label: 'Messages',
                selected: selected == 3,
                active: active,
                inactive: inactive,
                onTap: () => context.go('/messages'),
              ),
              _Tab(
                icon: HugeIcons.strokeRoundedUser,
                label: 'Account',
                selected: selected == 4,
                active: active,
                inactive: inactive,
                onTap: () => context.go('/profile'),
              ),
            ],
      ),
    );
  }

  int _getSelectedIndex(String location) {
    if (location.startsWith('/explore')) return 1;
    if (location.startsWith('/ai')) return 2;
    if (location.startsWith('/messages')) return 3;
    if (location.startsWith('/profile')) return 4;
    return 0;
  }
}

class _Tab extends StatelessWidget {
  final List<List<dynamic>> icon;
  final String label;
  final bool selected;
  final Color active;
  final Color inactive;
  final VoidCallback onTap;

  const _Tab({
    required this.icon,
    required this.label,
    required this.selected,
    required this.active,
    required this.inactive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? active.withOpacity(0.08) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            HugeIcon(
              icon: icon,
              size: 22,
              color: selected ? active : inactive,
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                color: selected ? active : inactive,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CenterTab extends StatelessWidget {
  final bool selected;
  final bool isDark;
  final VoidCallback onTap;

  const _CenterTab({
    required this.selected,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final primary = isDark ? AppTheme.accent : const Color(0xFF034548);
    final secondary = isDark ? const Color(0xFF34D399) : AppTheme.accent;
    final inactive = isDark ? const Color(0xFF5A6B80) : const Color(0xFF94A3B8);

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? primary.withOpacity(0.08) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [primary, secondary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: primary.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Center(
                child: HugeIcon(
                  icon: HugeIcons.strokeRoundedAiBrain03,
                  size: 20,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(height: 3),
            Text(
              'TELND',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: selected ? primary : inactive,
                letterSpacing: 0.3,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
