import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:telnd_mobile/core/router.dart';
import 'package:telnd_mobile/core/theme.dart';

class ExplorePage extends ConsumerWidget {
  const ExplorePage({super.key});

  static const _allServices = [
    _ServiceItem(title: 'Find Jobs', iconAsset: 'assets/icons/find-jobs.svg', color: Color(0xFF0891B2)),
    _ServiceItem(title: 'Tutors', iconAsset: 'assets/icons/tutors.svg', color: Color(0xFF2563EB)),
    _ServiceItem(title: 'Study Abroad', iconAsset: 'assets/icons/study-abroad.svg', color: Color(0xFF0EA5E9)),
    _ServiceItem(title: 'Doctors', iconAsset: 'assets/icons/doctor.svg', color: Color(0xFF0D9488)),
    _ServiceItem(title: 'Lawyer', iconAsset: 'assets/icons/lawyer.svg', color: Color(0xFFEA580C)),
    _ServiceItem(title: 'Matrimony', iconAsset: 'assets/icons/matrimony.svg', color: Color(0xFFE11D48)),
    _ServiceItem(title: 'Influencers', iconAsset: 'assets/icons/user-star-01-stroke-rounded.svg', color: Color(0xFF7C3AED)),
    _ServiceItem(title: 'Learn', iconAsset: 'assets/icons/learn.svg', color: Color(0xFF059669)),
  ];

  static const _tools = [
    _ServiceItem(title: 'CV Builder', iconAsset: 'assets/icons/file-upload.svg', color: Color(0xFF8B5CF6)),
    _ServiceItem(title: 'AI Cover Letter', iconAsset: 'assets/icons/brain-stroke.svg', color: Color(0xFF0891B2)),
    _ServiceItem(title: 'Doc Compressor', iconAsset: 'assets/icons/file-upload.svg', color: Color(0xFFEA580C)),
    _ServiceItem(title: 'Image Resizer', iconAsset: 'assets/icons/gallery.svg', color: Color(0xFF059669)),
  ];

  static const _helpSupport = [
    _ServiceItem(title: 'Help Center', iconAsset: 'assets/icons/message-stroke.svg', color: Color(0xFF2563EB)),
    _ServiceItem(title: 'Live Chat', iconAsset: 'assets/icons/message-multiple.svg', color: Color(0xFF059669)),
    _ServiceItem(title: 'Support Ticket', iconAsset: 'assets/icons/chat-history.svg', color: Color(0xFFEA580C)),
    _ServiceItem(title: 'Send Feedback', iconAsset: 'assets/icons/new-message.svg', color: Color(0xFF7C3AED)),
    _ServiceItem(title: 'Report Issue', iconAsset: 'assets/icons/message-blocked-stroke-rounded.svg', color: Color(0xFFDC2626)),
  ];

  List<_ServiceItem> _filter(List<_ServiceItem> items, String query) {
    if (query.isEmpty) return items;
    final q = query.toLowerCase();
    return items.where((s) => s.title.toLowerCase().contains(q)).toList();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final query = ref.watch(exploreSearchQueryProvider);

    // A single brand accent runs through the page chrome (section markers);
    // each item's own color is reserved for its icon, not for backgrounds
    // or borders scattered everywhere.
    final accent = isDark ? AppTheme.accent : AppTheme.primary;

    final services = _filter(_allServices, query);
    final tools = _filter(_tools, query);
    final help = _filter(_helpSupport, query);
    final isSearching = query.isNotEmpty;
    final hasResults = services.isNotEmpty || tools.isNotEmpty || help.isNotEmpty;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
      child: isSearching && !hasResults
          ? _EmptySearchState(query: query, isDark: isDark)
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (services.isNotEmpty)
                  _ServiceSection(title: 'All Services', items: services, isDark: isDark, accent: accent),
                if (tools.isNotEmpty) ...[
                  const SizedBox(height: 36),
                  _ServiceSection(title: 'Tools', items: tools, isDark: isDark, accent: accent),
                ],
                if (help.isNotEmpty) ...[
                  const SizedBox(height: 36),
                  _ServiceSection(title: 'Help & Support', items: help, isDark: isDark, accent: accent),
                ],
              ],
            ),
    );
  }
}

/// Header, hairline divider, grid. No card shell around the section — the
/// accent bar and divider are enough to group it, keeping the page flat
/// and quiet rather than stacking bordered boxes inside bordered boxes.
class _ServiceSection extends StatelessWidget {
  const _ServiceSection({
    required this.title,
    required this.items,
    required this.isDark,
    required this.accent,
  });

  final String title;
  final List<_ServiceItem> items;
  final bool isDark;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 3,
              height: 16,
              decoration: BoxDecoration(color: accent, borderRadius: BorderRadius.circular(2)),
            ),
            const SizedBox(width: 10),
            Text(
              title,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                letterSpacing: -0.3,
                color: isDark ? const Color(0xFFF5F5F7) : const Color(0xFF0A0A0B),
              ),
            ),
            const Spacer(),
            _CountPill(count: items.length, isDark: isDark),
          ],
        ),
        const SizedBox(height: 14),
        Container(
          height: 1,
          color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.07),
        ),
        const SizedBox(height: 18),
        LayoutBuilder(
          builder: (context, constraints) {
            final columns = constraints.maxWidth >= 340 ? 5 : 4;
            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: items.length,
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: columns,
                mainAxisSpacing: 20,
                crossAxisSpacing: 4,
                childAspectRatio: 0.72,
              ),
              itemBuilder: (context, index) => _ServiceTile(item: items[index], isDark: isDark),
            );
          },
        ),
      ],
    );
  }
}

class _CountPill extends StatelessWidget {
  const _CountPill({required this.count, required this.isDark});

  final int count;
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    final muted = isDark ? Colors.white : Colors.black;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: muted.withOpacity(0.16)),
      ),
      child: Text(
        '$count',
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: muted.withOpacity(0.6)),
      ),
    );
  }
}

/// One consistent shape across every tile: a rounded rect with two sharp
/// corners and two soft ones. It's a repeatable geometric signature rather
/// than a different literal shape per icon, so the grid reads as a system,
/// not a novelty grab-bag.
class _ServiceTile extends StatelessWidget {
  const _ServiceTile({required this.item, required this.isDark});

  final _ServiceItem item;
  final bool isDark;

  static const _cornerRadius = BorderRadius.only(
    topLeft: Radius.circular(18),
    bottomRight: Radius.circular(18),
    topRight: Radius.circular(6),
    bottomLeft: Radius.circular(6),
  );

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {},
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              borderRadius: _cornerRadius,
              color: isDark ? Colors.white.withOpacity(0.04) : Colors.black.withOpacity(0.03),
              border: Border.all(color: item.color.withOpacity(isDark ? 0.28 : 0.18)),
              boxShadow: isDark
                  ? [
                      BoxShadow(
                        color: item.color.withOpacity(0.22),
                        blurRadius: 18,
                        spreadRadius: -6,
                      ),
                    ]
                  : null,
            ),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: SvgPicture.asset(
                item.iconAsset,
                colorFilter: ColorFilter.mode(item.color, BlendMode.srcIn),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            item.title,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.1,
              height: 1.2,
              color: isDark ? const Color(0xFFE4E4E7) : const Color(0xFF1F2937),
            ),
          ),
        ],
      ),
    );
  }
}

/// Shown when a search matches nothing across any section, instead of the
/// old behavior of silently rendering an empty grid while other sections
/// stayed fully populated underneath it.
class _EmptySearchState extends StatelessWidget {
  const _EmptySearchState({required this.query, required this.isDark});

  final String query;
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    final muted = isDark ? Colors.white : Colors.black;
    return Padding(
      padding: const EdgeInsets.only(top: 56),
      child: Column(
        children: [
          Icon(Icons.search_off_rounded, size: 40, color: muted.withOpacity(0.25)),
          const SizedBox(height: 12),
          Text(
            'No services match "$query"',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: muted.withOpacity(0.55)),
          ),
          const SizedBox(height: 4),
          Text(
            'Try a different search term.',
            style: TextStyle(fontSize: 13, color: muted.withOpacity(0.35)),
          ),
        ],
      ),
    );
  }
}

class _ServiceItem {
  final String title;
  final String iconAsset;
  final Color color;

  const _ServiceItem({
    required this.title,
    required this.iconAsset,
    required this.color,
  });
}
