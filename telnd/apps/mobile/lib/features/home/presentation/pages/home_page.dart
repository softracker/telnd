import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:telnd_mobile/core/theme.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(left: 16, top: 8, bottom: 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Text(
                'Welcome to TELND',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
            ),
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Text(
                'Discover opportunities, prove your skills, get hired.',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                ),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 120,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.only(right: 16),
                itemCount: _items.length + 1,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  if (index == _items.length) {
                    return _AllCard(
                      isDark: isDark,
                      onTap: () => _showAllSheet(context, isDark),
                    );
                  }
                  final item = _items[index];
                  return _ActionCard(
                    title: item.title,
                    desc: item.desc,
                    iconAsset: item.iconAsset,
                    color: item.color,
                    isDark: isDark,
                    onTap: () {},
                  );
                },
              ),
            ),
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Text(
                'Recent Activity',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark
                    ? Color.lerp(const Color(0xFF1C1C1E), Colors.white, 0.04)
                    : Color.lerp(Colors.white, const Color(0xFF1F2937), 0.03),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                'No recent activity yet.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAllSheet(BuildContext context, bool isDark) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AllSheet(isDark: isDark),
    );
  }
}

const _items = [
  _ItemData(
    title: 'Find Jobs',
    desc: 'Browse opportunities',
    iconAsset: 'assets/icons/find-jobs.svg',
    color: Color(0xFF0891B2),
  ),
  _ItemData(
    title: 'Tutors',
    desc: 'Expert guidance',
    iconAsset: 'assets/icons/tutors.svg',
    color: Color(0xFF2563EB),
  ),
  _ItemData(
    title: 'Doctors',
    desc: 'Healthcare specialists',
    iconAsset: 'assets/icons/doctor.svg',
    color: Color(0xFF0D9488),
  ),
  _ItemData(
    title: 'Matrimony',
    desc: 'Find your match',
    iconAsset: 'assets/icons/matrimony.svg',
    color: Color(0xFFE11D48),
  ),
  _ItemData(
    title: 'Fix',
    desc: 'Get issues resolved',
    iconAsset: 'assets/icons/fix.svg',
    color: Color(0xFFEA580C),
  ),
];

const _allItems = [
  ..._items,
  _ItemData(
    title: 'Laundry',
    desc: 'Wash & fold services',
    iconAsset: 'assets/icons/laundry.svg',
    color: Color(0xFF0EA5E9),
  ),
  _ItemData(
    title: 'Influencers',
    desc: 'Connect with creators',
    iconAsset: 'assets/icons/user-star-01-stroke-rounded.svg',
    color: Color(0xFF7C3AED),
  ),
  _ItemData(
    title: 'Learn',
    desc: 'Courses & skills',
    iconAsset: 'assets/icons/learn.svg',
    color: Color(0xFF059669),
  ),
];

class _ItemData {
  final String title;
  final String desc;
  final String iconAsset;
  final Color color;

  const _ItemData({
    required this.title,
    required this.desc,
    required this.iconAsset,
    required this.color,
  });
}

class _ActionCard extends StatelessWidget {
  final String title;
  final String desc;
  final String iconAsset;
  final Color color;
  final bool isDark;
  final VoidCallback onTap;

  const _ActionCard({
    required this.title,
    required this.desc,
    required this.iconAsset,
    required this.color,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 120,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark
              ? Color.lerp(const Color(0xFF1C1C1E), color, 0.12)
              : Color.lerp(Colors.white, color, 0.06),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isDark
                ? Colors.white.withOpacity(0.06)
                : Colors.black.withOpacity(0.05),
          ),
        ),
        child: Stack(
          children: [
            Positioned(
              right: -4,
              bottom: -4,
              child: SvgPicture.asset(
                iconAsset,
                width: 52,
                height: 52,
                colorFilter: ColorFilter.mode(
                  color.withOpacity(isDark ? 0.08 : 0.06),
                  BlendMode.srcIn,
                ),
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(7),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(5),
                    child: SvgPicture.asset(
                      iconAsset,
                      colorFilter: const ColorFilter.mode(
                        Colors.white,
                        BlendMode.srcIn,
                      ),
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : const Color(0xFF1F2937),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  desc,
                  style: TextStyle(
                    fontSize: 12,
                    height: 1.3,
                    color: isDark
                        ? Colors.white.withOpacity(0.45)
                        : const Color(0xFF64748B),
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AllCard extends StatelessWidget {
  final bool isDark;
  final VoidCallback onTap;

  const _AllCard({required this.isDark, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 72,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark
              ? Color.lerp(const Color(0xFF1C1C1E), Colors.white, 0.06)
              : Color.lerp(Colors.white, const Color(0xFF1F2937), 0.04),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isDark
                ? Colors.white.withOpacity(0.06)
                : Colors.black.withOpacity(0.05),
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.grid_view_rounded,
              size: 22,
              color: isDark ? Colors.white70 : const Color(0xFF64748B),
            ),
            const SizedBox(height: 6),
            Text(
              'All',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: isDark ? Colors.white : const Color(0xFF1F2937),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AllSheet extends StatelessWidget {
  final bool isDark;

  const _AllSheet({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 12),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: isDark ? Colors.white24 : Colors.black12,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Text(
                  'All Services',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : const Color(0xFF1F2937),
                  ),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Icon(
                    Icons.close_rounded,
                    size: 22,
                    color: isDark ? Colors.white54 : Colors.black45,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (int i = 0; i < _allItems.length; i++) ...[
                  if (i > 0) const SizedBox(height: 10),
                  _SheetItem(
                    title: _allItems[i].title,
                    desc: _allItems[i].desc,
                    iconAsset: _allItems[i].iconAsset,
                    color: _allItems[i].color,
                    isDark: isDark,
                    onTap: () => Navigator.pop(context),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SheetItem extends StatelessWidget {
  final String title;
  final String desc;
  final String iconAsset;
  final Color color;
  final bool isDark;
  final VoidCallback onTap;

  const _SheetItem({
    required this.title,
    required this.desc,
    required this.iconAsset,
    required this.color,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark
              ? Color.lerp(const Color(0xFF1C1C1E), color, 0.12)
              : Color.lerp(Colors.white, color, 0.08),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Padding(
                    padding: const EdgeInsets.all(8),
                    child: SvgPicture.asset(
                      iconAsset,
                      colorFilter: const ColorFilter.mode(
                        Colors.white,
                        BlendMode.srcIn,
                      ),
                    ),
                  ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : const Color(0xFF1F2937),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    desc,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark
                          ? Colors.white.withOpacity(0.45)
                          : const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              size: 20,
              color: isDark ? Colors.white24 : Colors.black26,
            ),
          ],
        ),
      ),
    );
  }
}
