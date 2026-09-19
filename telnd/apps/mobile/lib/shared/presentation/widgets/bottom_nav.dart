import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:telnd_mobile/core/theme.dart';

class BottomNav extends StatefulWidget {
  const BottomNav({super.key});

  @override
  State<BottomNav> createState() => _BottomNavState();
}

class _BottomNavState extends State<BottomNav> with SingleTickerProviderStateMixin {
  late AnimationController _glowController;

  @override
  void initState() {
    super.initState();
    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _glowController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final selected = _getSelectedIndex(location);
    final active = isDark ? AppTheme.accent : const Color(0xFF034548);
    final inactive = isDark ? const Color(0xFF5A6B80) : const Color(0xFF475569);
    final isAiSelected = selected == 2;

    return SizedBox(
      height: 90,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 40, sigmaY: 40),
                child: Container(
                  padding: const EdgeInsets.fromLTRB(8, 10, 8, 16),
                    decoration: BoxDecoration(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                    border: Border(
                      top: BorderSide(
                        color: isDark
                            ? Colors.white.withOpacity(0.1)
                            : Colors.black.withOpacity(0.08),
                        width: 1,
                      ),
                    ),
                    color: isDark
                        ? const Color(0xFF1C1C1E).withOpacity(0.10)
                        : Colors.white.withOpacity(0.10),
                    boxShadow: [
                      BoxShadow(
                        color: active.withOpacity(isDark ? 0.15 : 0.08),
                        blurRadius: 24,
                        spreadRadius: -4,
                        offset: const Offset(0, -4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: _Tab(
                          iconSolid: 'assets/icons/home-solid.svg',
                          iconStroke: 'assets/icons/home-stroke.svg',
                          label: 'Home',
                          selected: selected == 0,
                          active: active,
                          inactive: inactive,
                          onTap: () => context.go('/'),
                        ),
                      ),
                      Expanded(
                        child: _Tab(
                          iconSolid: 'assets/icons/explore-solid.svg',
                          iconStroke: 'assets/icons/explore-stroke.svg',
                          label: 'Explore',
                          selected: selected == 1,
                          active: active,
                          inactive: inactive,
                          onTap: () => context.go('/explore'),
                        ),
                      ),
                      const Spacer(),
                      Expanded(
                        child: _Tab(
                          iconSolid: 'assets/icons/message-solid.svg',
                          iconStroke: 'assets/icons/message-stroke.svg',
                          label: 'Messages',
                          selected: selected == 3,
                          active: active,
                          inactive: inactive,
                          onTap: () => context.go('/messages'),
                        ),
                      ),
                      Expanded(
                        child: _Tab(
                          iconSolid: 'assets/icons/user-solid.svg',
                          iconStroke: 'assets/icons/user-stroke.svg',
                           label: 'My Telnd',
                          selected: selected == 4,
                          active: active,
                          inactive: inactive,
                          onTap: () => context.go('/profile'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Center(
              child: _CenterTab(
                selected: isAiSelected,
                isDark: isDark,
                glowController: _glowController,
                onTap: () => context.go('/ai'),
              ),
            ),
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
  final String iconSolid;
  final String iconStroke;
  final String label;
  final bool selected;
  final Color active;
  final Color inactive;
  final VoidCallback onTap;

  const _Tab({
    required this.iconSolid,
    required this.iconStroke,
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
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: selected
                  ? [
                      BoxShadow(
                        color: active.withOpacity(0.3),
                        blurRadius: 12,
                        spreadRadius: 2,
                      ),
                    ]
                  : null,
            ),
            child: SvgPicture.asset(
              selected ? iconSolid : iconStroke,
              width: 24,
              height: 24,
              colorFilter: ColorFilter.mode(
                selected ? active : inactive,
                BlendMode.srcIn,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              color: selected ? active : inactive,
            ),
          ),
        ],
      ),
    );
  }
}

class _CenterTab extends StatelessWidget {
  final bool selected;
  final bool isDark;
  final AnimationController glowController;
  final VoidCallback onTap;

  const _CenterTab({
    required this.selected,
    required this.isDark,
    required this.glowController,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final primary = isDark ? AppTheme.accent : const Color(0xFF034548);
    final secondary = isDark ? const Color(0xFF34D399) : AppTheme.accent;
    final inactive = isDark ? const Color(0xFF5A6B80) : const Color(0xFF475569);

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedBuilder(
            animation: glowController,
            builder: (context, child) {
              final double pulse = glowController.value;
              final double glowOpacity = selected ? 0.25 + pulse * 0.2 : 0.0;
              final double glowSpread = selected ? 4.0 + pulse * 4 : 0.0;
              final double glowBlur = selected ? 20.0 + pulse * 10 : 0.0;
              return Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [primary, secondary],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    if (selected) ...[
                      BoxShadow(
                        color: primary.withOpacity(glowOpacity * 0.6),
                        blurRadius: glowBlur * 1.5,
                        spreadRadius: glowSpread,
                      ),
                      BoxShadow(
                        color: secondary.withOpacity(glowOpacity * 0.4),
                        blurRadius: glowBlur,
                        spreadRadius: glowSpread * 0.5,
                        offset: const Offset(0, -2),
                      ),
                      BoxShadow(
                        color: primary.withOpacity(glowOpacity),
                        blurRadius: glowBlur * 0.6,
                        spreadRadius: 2,
                        offset: const Offset(0, 4),
                      ),
                    ] else
                      BoxShadow(
                        color: primary.withOpacity(0.3),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                  ],
                ),
                child: Center(
                  child: SvgPicture.asset(
                    'assets/icons/brain-stroke.svg',
                    width: 28,
                    height: 28,
                    colorFilter: const ColorFilter.mode(
                      Colors.white,
                      BlendMode.srcIn,
                    ),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 4),
          Text(
            'Telnd AI',
            style: TextStyle(
              fontSize: 12,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              color: selected ? primary : inactive,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}
