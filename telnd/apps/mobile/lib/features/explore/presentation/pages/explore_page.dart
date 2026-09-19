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
    _ServiceItem(title: 'Doctors', iconAsset: 'assets/icons/doctor.svg', color: Color(0xFF0D9488)),
    _ServiceItem(title: 'Matrimony', iconAsset: 'assets/icons/matrimony.svg', color: Color(0xFFE11D48)),
    _ServiceItem(title: 'Fix', iconAsset: 'assets/icons/fix.svg', color: Color(0xFFEA580C)),
    _ServiceItem(title: 'Laundry', iconAsset: 'assets/icons/laundry.svg', color: Color(0xFF0EA5E9)),
    _ServiceItem(title: 'Influencers', iconAsset: 'assets/icons/user-star-01-stroke-rounded.svg', color: Color(0xFF7C3AED)),
    _ServiceItem(title: 'Learn', iconAsset: 'assets/icons/learn.svg', color: Color(0xFF059669)),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final searchQuery = ref.watch(exploreSearchQueryProvider);

    final filtered = searchQuery.isEmpty
        ? _allServices
        : _allServices
            .where((s) => s.title.toLowerCase().contains(searchQuery.toLowerCase()))
            .toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.only(bottom: 100),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withOpacity(0.05)
                  : Colors.white.withOpacity(0.7),
              border: Border.all(
                color: isDark
                    ? Colors.white.withOpacity(0.08)
                    : Colors.black.withOpacity(0.05),
              ),
              boxShadow: [
                BoxShadow(
                  color: (isDark ? AppTheme.accent : AppTheme.primary)
                      .withOpacity(0.06),
                  blurRadius: 24,
                  spreadRadius: -2,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                  child: Text(
                    'All Services',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final itemWidth = (constraints.maxWidth - 4 * 4) / 5;
                      return Wrap(
                        spacing: 4,
                        runSpacing: 24,
                        children: filtered.map((service) {
                          return SizedBox(
                            width: itemWidth,
                        child: GestureDetector(
                          onTap: () {},
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 52,
                                height: 52,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: service.color.withOpacity(isDark ? 0.15 : 0.10),
                                  border: Border.all(
                                    color: service.color.withOpacity(isDark ? 0.20 : 0.12),
                                  ),
                                ),
                                child: Center(
                                  child: Padding(
                                    padding: const EdgeInsets.all(13),
                                    child: SvgPicture.asset(
                                      service.iconAsset,
                                      colorFilter: ColorFilter.mode(
                                        service.color,
                                        BlendMode.srcIn,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                service.title,
                                textAlign: TextAlign.center,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? Colors.white : const Color(0xFF1F2937),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                      );
                    },
                  ),
                ),
              ],
            ),
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
