import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:telnd_mobile/core/theme.dart';

class CustomAppBar extends StatelessWidget implements PreferredSizeWidget {
  final Widget? leading;
  final List<Widget>? actions;
  final bool showBackButton;

  const CustomAppBar({
    super.key,
    this.leading,
    this.actions,
    this.showBackButton = false,
  });

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppTheme.darkTextPrimary : AppTheme.lightTextPrimary;

    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            if (showBackButton)
              IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: textColor),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              )
            else if (leading != null)
              leading!
            else
              buildLogo(),
            const Spacer(),
            if (actions != null) ...actions!,
          ],
        ),
      ),
    );
  }

  static Widget buildLogo() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: Image.asset(
        'assets/icons/favicon.png',
        width: 36,
        height: 36,
        fit: BoxFit.cover,
      ),
    );
  }
}

class HomeAppBar extends StatelessWidget implements PreferredSizeWidget {
  const HomeAppBar({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final iconColor = isDark ? AppTheme.darkTextPrimary : AppTheme.lightTextPrimary;

    return CustomAppBar(
      leading: CustomAppBar.buildLogo(),
      actions: [
        _NavBarIcon(
          asset: 'assets/icons/notification-store.svg',
          color: iconColor,
          onTap: () {},
        ),
        const SizedBox(width: 16),
        GestureDetector(
          onTap: () => context.go('/profile'),
          child: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.primary.withOpacity(0.15),
            ),
            child: Center(
              child: SvgPicture.asset(
                'assets/icons/user-stroke.svg',
                width: 20,
                height: 20,
                colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _NavBarIcon extends StatelessWidget {
  final String asset;
  final Color color;
  final VoidCallback onTap;

  const _NavBarIcon({
    required this.asset,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SvgPicture.asset(
        asset,
        width: 24,
        height: 24,
        colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
      ),
    );
  }
}

class ExploreAppBar extends StatelessWidget implements PreferredSizeWidget {
  final TextEditingController? controller;
  final FocusNode? focusNode;
  final ValueChanged<String>? onChanged;

  const ExploreAppBar({
    super.key,
    this.controller,
    this.focusNode,
    this.onChanged,
  });

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final iconColor = isDark ? AppTheme.darkTextPrimary : AppTheme.lightTextPrimary;

    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            CustomAppBar.buildLogo(),
            const SizedBox(width: 12),
            Expanded(
              child: Container(
                height: 36,
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withOpacity(0.06)
                      : Colors.black.withOpacity(0.04),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: TextField(
                  controller: controller,
                  focusNode: focusNode,
                  onChanged: onChanged,
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.white : const Color(0xFF1F2937),
                  ),
                  decoration: InputDecoration(
                    hintText: 'Search...',
                    hintStyle: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.white38 : Colors.black38,
                    ),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 8,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: () => context.go('/profile'),
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppTheme.primary.withOpacity(0.15),
                ),
                child: Center(
                  child: SvgPicture.asset(
                    'assets/icons/user-stroke.svg',
                    width: 20,
                    height: 20,
                    colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class MessagesAppBar extends StatelessWidget implements PreferredSizeWidget {
  const MessagesAppBar({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final iconColor = isDark ? AppTheme.darkTextPrimary : AppTheme.lightTextPrimary;

    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            CustomAppBar.buildLogo(),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Messages',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: iconColor,
                ),
              ),
            ),
            GestureDetector(
              onTap: () {},
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppTheme.primary.withOpacity(0.15),
                ),
                child: Center(
                  child: SvgPicture.asset(
                    'assets/icons/new-message.svg',
                    width: 20,
                    height: 20,
                    colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
