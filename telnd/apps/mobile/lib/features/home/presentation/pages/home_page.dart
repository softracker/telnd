import 'package:flutter/material.dart';
import 'package:telnd_mobile/core/theme.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Welcome to TELND',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 6),
            Text(
              'Discover opportunities, prove your skills, get hired.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 150,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _items.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (context, index) {
                  final item = _items[index];
                  return _ActionCard(
                    title: item.title,
                    desc: item.desc,
                    icon: item.icon,
                    color: item.color,
                    isDark: isDark,
                    onTap: () {},
                  );
                },
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Recent Activity',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withOpacity(0.05)
                    : Colors.black.withOpacity(0.03),
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
}

const _items = [
  _ItemData(
    title: 'Find Jobs',
    desc: 'Browse curated opportunities',
    icon: Icons.work_outline_rounded,
    color: Color(0xFF034548),
  ),
  _ItemData(
    title: 'Tutors',
    desc: 'Find expert guidance',
    icon: Icons.school_outlined,
    color: Color(0xFF2563EB),
  ),
  _ItemData(
    title: 'Influencers',
    desc: 'Connect with creators',
    icon: Icons.star_outline_rounded,
    color: Color(0xFF7C3AED),
  ),
  _ItemData(
    title: 'Fix',
    desc: 'Get issues resolved',
    icon: Icons.build_outlined,
    color: Color(0xFFEA580C),
  ),
  _ItemData(
    title: 'Learn',
    desc: 'Courses & skill building',
    icon: Icons.menu_book_outlined,
    color: Color(0xFF059669),
  ),
];

class _ItemData {
  final String title;
  final String desc;
  final IconData icon;
  final Color color;

  const _ItemData({
    required this.title,
    required this.desc,
    required this.icon,
    required this.color,
  });
}

class _ActionCard extends StatelessWidget {
  final String title;
  final String desc;
  final IconData icon;
  final Color color;
  final bool isDark;
  final VoidCallback onTap;

  const _ActionCard({
    required this.title,
    required this.desc,
    required this.icon,
    required this.color,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 150,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark
              ? color.withOpacity(0.10)
              : color.withOpacity(0.06),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 18, color: Colors.white),
            ),
            const Spacer(),
            Text(
              title,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: isDark ? Colors.white : const Color(0xFF1F2937),
              ),
            ),
            const SizedBox(height: 3),
            Text(
              desc,
              style: TextStyle(
                fontSize: 11,
                color: isDark
                    ? Colors.white.withOpacity(0.45)
                    : const Color(0xFF64748B),
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.bottomRight,
              child: Icon(
                Icons.arrow_forward_rounded,
                size: 14,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
