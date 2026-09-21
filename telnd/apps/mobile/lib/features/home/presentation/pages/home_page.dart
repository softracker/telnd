import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:telnd_mobile/core/theme.dart';

final ValueNotifier<double> homeScrollProgress = ValueNotifier<double>(0.0);

/// Corner radius of the white sheet. The pinned header paints only the two
/// corner "notches" of this radius, so scrolling content can reach the curve.
const double _kSheetRadius = 24;

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    const maxScroll = 150.0;
    final progress = (_scrollController.offset / maxScroll).clamp(0.0, 1.0);
    homeScrollProgress.value = progress;
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    homeScrollProgress.value = 0.0;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ValueListenableBuilder<double>(
      valueListenable: homeScrollProgress,
      builder: (context, progress, _) {
        final bgColor = isDark
            ? Color.lerp(AppTheme.darkBackground, AppTheme.primary, progress)!
            : Color.lerp(const Color(0xFFE6F6F5), AppTheme.primary, progress)!;
        final sheetColor = isDark ? const Color(0xFF1C1C1E) : Colors.white;

        return AnnotatedRegion<SystemUiOverlayStyle>(
          value: SystemUiOverlayStyle(
            statusBarColor: bgColor,
            statusBarIconBrightness:
                isDark ? Brightness.light : Brightness.dark,
          ),
          child: Scaffold(
            extendBodyBehindAppBar: true,
            backgroundColor: bgColor,
            body: ColoredBox(
              color: bgColor,
              child: RefreshIndicator(
                color: AppTheme.primary,
                backgroundColor: isDark ? const Color(0xFF1C1C1E) : Colors.white,
                onRefresh: () async {
                  await Future.delayed(const Duration(seconds: 1));
                },
                child: CustomScrollView(
                  controller: _scrollController,
                  slivers: [
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    sliver: SliverToBoxAdapter(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Welcome to TELND',
                            style:
                                Theme.of(context).textTheme.headlineMedium,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Discover opportunities, prove your skills, get hired.',
                            style: Theme.of(context)
                                .textTheme
                                .bodyLarge
                                ?.copyWith(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurface
                                      .withOpacity(0.6),
                                ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SliverPersistentHeader(
                    pinned: true,
                    delegate: _PinnedHeaderDelegate(
                      isDark: isDark,
                      bgColor: bgColor,
                      onTapAll: () => _showAllSheet(context, isDark),
                    ),
                  ),
                  // The sheet is pulled up by _kSheetRadius so it sits
                  // underneath the corner notches painted by the header.
                  // The ColoredBox fills the gap this leaves at the bottom.
                  SliverToBoxAdapter(
                    child: ColoredBox(
                      color: sheetColor,
                      child: Transform.translate(
                        offset: const Offset(0, -_kSheetRadius),
                        child: _WhiteContent(isDark: isDark),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
      },
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

/// Paints everything EXCEPT a rounded- rectangle, i.e. just the two top
/// corner notches. The middle stays transparent so the sheet shows through.
class _TopCornerPainter extends CustomPainter {
  final Color color;

  const _TopCornerPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path.combine(
      PathOperation.difference,
      Path()..addRect(Offset.zero & size),
      Path()
        ..addRRect(
          RRect.fromRectAndCorners(
            Rect.fromLTWH(0, 0, size.width, size.height + _kSheetRadius),
            topLeft: const Radius.circular(_kSheetRadius),
            topRight: const Radius.circular(_kSheetRadius),
          ),
        ),
    );
    canvas.drawPath(
      path,
      Paint()
        ..color = color
        ..isAntiAlias = true,
    );
  }

  @override
  bool shouldRepaint(covariant _TopCornerPainter oldDelegate) =>
      oldDelegate.color != color;
}

class _PinnedHeaderDelegate extends SliverPersistentHeaderDelegate {
  final bool isDark;
  final Color bgColor;
  final VoidCallback onTapAll;

  _PinnedHeaderDelegate({
    required this.isDark,
    required this.bgColor,
    required this.onTapAll,
  });

  @override
  double get maxExtent => 186;

  @override
  double get minExtent => 76;

  @override
  bool shouldRebuild(covariant _PinnedHeaderDelegate oldDelegate) =>
      isDark != oldDelegate.isDark || bgColor != oldDelegate.bgColor;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    final t = (shrinkOffset / (maxExtent - minExtent)).clamp(0.0, 1.0);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Expanded(
          child: Stack(
            clipBehavior: Clip.hardEdge,
            children: [
              // Always opaque: the sheet genuinely scrolls underneath now.
              Positioned.fill(child: ColoredBox(color: bgColor)),
              if (t < 0.5)
                Positioned(
                  top: 20 * (1 - t * 2),
                  left: 0,
                  right: 0,
                  child: Opacity(
                    opacity: (1.0 - t * 2).clamp(0.0, 1.0),
                    child: _buildFullCards(context),
                  ),
                ),
              if (t > 0.5)
                Positioned.fill(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildCompactBar(context),
                    ],
                  ),
                ),
            ],
          ),
        ),
        // Only the corner notches — the centre is transparent, so content
        // scrolling under it is visible right up to the curve.
        SizedBox(
          height: _kSheetRadius,
          child: CustomPaint(
            size: Size.infinite,
            painter: _TopCornerPainter(color: bgColor),
          ),
        ),
      ],
    );
  }

  Widget _buildFullCards(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 16),
      child: SizedBox(
        height: 126,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.only(right: 16),
          itemCount: _items.length + 1,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (context, index) {
            if (index == _items.length) {
              return _AllCard(isDark: isDark, onTap: onTapAll);
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
    );
  }

  Widget _buildCompactBar(BuildContext context) {
    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(vertical: 4),
      alignment: Alignment.centerLeft,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final item = _items[index];
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    color: item.color,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: SvgPicture.asset(
                      item.iconAsset,
                      colorFilter: const ColorFilter.mode(
                        Colors.white,
                        BlendMode.srcIn,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 7),
                Text(
                  item.title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _WhiteContent extends StatelessWidget {
  final bool isDark;

  const _WhiteContent({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Breathing room under the pinned curve.
          const SizedBox(height: _kSheetRadius),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Recommended For You',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 100,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _demoCards.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (context, index) {
                final card = _demoCards[index];
                return Container(
                  width: 140,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: card.color.withOpacity(isDark ? 0.15 : 0.08),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(card.icon, size: 24, color: card.color),
                      const Spacer(),
                      Text(
                        card.title,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: isDark
                              ? Colors.white
                              : const Color(0xFF1F2937),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        card.subtitle,
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark
                              ? Colors.white.withOpacity(0.45)
                              : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 28),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Quick Stats',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _StatCard(
                  label: 'Profile Views',
                  value: '1.2K',
                  icon: Icons.visibility_outlined,
                  color: const Color(0xFF3B82F6),
                  isDark: isDark,
                ),
                const SizedBox(width: 10),
                _StatCard(
                  label: 'Applications',
                  value: '24',
                  icon: Icons.send_outlined,
                  color: const Color(0xFF10B981),
                  isDark: isDark,
                ),
                const SizedBox(width: 10),
                _StatCard(
                  label: 'Matches',
                  value: '8',
                  icon: Icons.favorite_outline,
                  color: const Color(0xFFE11D48),
                  isDark: isDark,
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Nearby Opportunities',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 12),
          ...List.generate(_demoNearby.length, (index) {
            final item = _demoNearby[index];
            return Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark
                      ? Color.lerp(
                          const Color(0xFF1C1C1E), Colors.white, 0.04)
                      : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
      height: 38,
                      decoration: BoxDecoration(
                        color: item.color.withOpacity(isDark ? 0.2 : 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child:
                          Icon(item.icon, size: 22, color: item.color),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.title,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: isDark
                                  ? Colors.white
                                  : const Color(0xFF1F2937),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            item.location,
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
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: item.color.withOpacity(isDark ? 0.2 : 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        item.tag,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: item.color,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
          const SizedBox(height: 28),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Popular Services',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 12),
          ...List.generate(_demoServices.length, (index) {
            final svc = _demoServices[index];
            return Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark
                      ? Color.lerp(
                          const Color(0xFF1C1C1E), Colors.white, 0.04)
                      : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: svc.color.withOpacity(isDark ? 0.2 : 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child:
                          Icon(svc.icon, size: 20, color: svc.color),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            svc.title,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: isDark
                                  ? Colors.white
                                  : const Color(0xFF1F2937),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            svc.subtitle,
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
          }),
          const SizedBox(height: 28),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Upcoming Events',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 12),
          ...List.generate(_demoEvents.length, (index) {
            final evt = _demoEvents[index];
            return Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark
                      ? Color.lerp(
                          const Color(0xFF1C1C1E), Colors.white, 0.04)
                      : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: evt.color.withOpacity(isDark ? 0.2 : 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            evt.day,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: evt.color,
                            ),
                          ),
                          Text(
                            evt.month,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: evt.color.withOpacity(0.7),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            evt.title,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: isDark
                                  ? Colors.white
                                  : const Color(0xFF1F2937),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            evt.subtitle,
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
          }),
          const SizedBox(height: 28),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Recent Activity',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark
                    ? Color.lerp(
                        const Color(0xFF1C1C1E), Colors.white, 0.04)
                    : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                'No recent activity yet.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.4),
                    ),
              ),
            ),
          ),
          const SizedBox(height: 120),
        ],
      ),
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
    title: 'Study Abroad',
    desc: 'Explore overseas education',
    iconAsset: 'assets/icons/study-abroad.svg',
    color: Color(0xFF0EA5E9),
  ),
  _ItemData(
    title: 'Doctors',
    desc: 'Healthcare specialists',
    iconAsset: 'assets/icons/doctor.svg',
    color: Color(0xFF0D9488),
  ),
  _ItemData(
    title: 'Lawyer',
    desc: 'Legal assistance',
    iconAsset: 'assets/icons/lawyer.svg',
    color: Color(0xFFEA580C),
  ),
  _ItemData(
    title: 'Matrimony',
    desc: 'Find your match',
    iconAsset: 'assets/icons/matrimony.svg',
    color: Color(0xFFE11D48),
  ),
];

const _allItems = [
  ..._items,
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

class _DemoCardData {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;

  const _DemoCardData({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
  });
}

const _demoCards = [
  _DemoCardData(
    title: 'Top Rated',
    subtitle: '120+ providers',
    icon: Icons.star_rounded,
    color: Color(0xFFF59E0B),
  ),
  _DemoCardData(
    title: 'New Jobs',
    subtitle: '45 openings',
    icon: Icons.work_outline_rounded,
    color: Color(0xFF3B82F6),
  ),
  _DemoCardData(
    title: 'Tutors',
    subtitle: '80+ experts',
    icon: Icons.school_outlined,
    color: Color(0xFF8B5CF6),
  ),
  _DemoCardData(
    title: 'Events',
    subtitle: '12 this week',
    icon: Icons.event_outlined,
    color: Color(0xFF10B981),
  ),
];

class _DemoServiceData {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;

  const _DemoServiceData({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
  });
}

const _demoServices = [
  _DemoServiceData(
    title: 'Resume Builder',
    subtitle: 'Create professional resumes',
    icon: Icons.description_outlined,
    color: Color(0xFF0891B2),
  ),
  _DemoServiceData(
    title: 'Interview Prep',
    subtitle: 'Practice with AI feedback',
    icon: Icons.mic_outlined,
    color: Color(0xFF2563EB),
  ),
  _DemoServiceData(
    title: 'Skill Assessment',
    subtitle: 'Verify your abilities',
    icon: Icons.psychology_outlined,
    color: Color(0xFF7C3AED),
  ),
  _DemoServiceData(
    title: 'Mentorship',
    subtitle: 'Connect with mentors',
    icon: Icons.handshake_outlined,
    color: Color(0xFF059669),
  ),
];

class _NearbyData {
  final String title;
  final String location;
  final String tag;
  final IconData icon;
  final Color color;

  const _NearbyData({
    required this.title,
    required this.location,
    required this.tag,
    required this.icon,
    required this.color,
  });
}

const _demoNearby = [
  _NearbyData(
    title: 'Senior Flutter Dev',
    location: 'Dhaka, Bangladesh',
    tag: 'Remote',
    icon: Icons.phone_android,
    color: Color(0xFF0891B2),
  ),
  _NearbyData(
    title: 'UI/UX Designer',
    location: 'Chittagong, Bangladesh',
    tag: 'On-site',
    icon: Icons.palette_outlined,
    color: Color(0xFF8B5CF6),
  ),
  _NearbyData(
    title: 'Data Scientist',
    location: 'Sylhet, Bangladesh',
    tag: 'Hybrid',
    icon: Icons.analytics_outlined,
    color: Color(0xFF10B981),
  ),
  _NearbyData(
    title: 'Marketing Lead',
    location: 'Rajshahi, Bangladesh',
    tag: 'Remote',
    icon: Icons.campaign_outlined,
    color: Color(0xFFEA580C),
  ),
];

class _EventData {
  final String title;
  final String subtitle;
  final String day;
  final String month;
  final Color color;

  const _EventData({
    required this.title,
    required this.subtitle,
    required this.day,
    required this.month,
    required this.color,
  });
}

const _demoEvents = [
  _EventData(
    title: 'Tech Career Fair',
    subtitle: 'Meet 50+ employers hiring now',
    day: '25',
    month: 'SEP',
    color: Color(0xFF3B82F6),
  ),
  _EventData(
    title: 'Flutter Workshop',
    subtitle: 'Build your first app in 2 hours',
    day: '28',
    month: 'SEP',
    color: Color(0xFF0EA5E9),
  ),
  _EventData(
    title: 'Networking Night',
    subtitle: 'Connect with industry leaders',
    day: '02',
    month: 'OCT',
    color: Color(0xFF7C3AED),
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
                      color:
                          isDark ? Colors.white : const Color(0xFF1F2937),
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

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final bool isDark;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(height: 10),
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: isDark ? Colors.white : const Color(0xFF1F2937),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: isDark
                    ? Colors.white.withOpacity(0.45)
                    : const Color(0xFF64748B),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
