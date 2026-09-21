import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:telnd_mobile/shared/presentation/widgets/theme_toggle.dart';

const Color _kBrand = Color(0xFF034548);
const Color _kBrandLight = Color(0xFF0D9488);

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final scaffoldBg =
        isDark ? const Color(0xFF111214) : const Color(0xFFF4F6F8);

    return Scaffold(
      backgroundColor: scaffoldBg,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            elevation: 0,
            scrolledUnderElevation: 0.5,
            backgroundColor: scaffoldBg,
            surfaceTintColor: Colors.transparent,
            centerTitle: false,
            titleSpacing: 20,
            title: Text(
              'My Telnd',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.4,
                color: isDark ? Colors.white : const Color(0xFF0F172A),
              ),
            ),
            actions: const [
              ThemeToggle(),
              SizedBox(width: 12),
            ],
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 110),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                const _ProfileHeader(),
                const SizedBox(height: 22),
                _Section(
                  title: 'My Applications',
                  isDark: isDark,
                  items: [
                    _SectionItem(
                      icon: Icons.work_outline_rounded,
                      title: 'Applied Jobs',
                      color: const Color(0xFF3B82F6),
                      trailingBadge: '12',
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.bookmark_outline_rounded,
                      title: 'Saved Jobs',
                      color: const Color(0xFF8B5CF6),
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.star_outline_rounded,
                      title: 'Shortlisted',
                      color: const Color(0xFFF59E0B),
                      trailingBadge: '3',
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.mail_outline_rounded,
                      title: 'Invitations',
                      color: const Color(0xFF0EA5E9),
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.timeline_outlined,
                      title: 'Application Timeline',
                      color: const Color(0xFF10B981),
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.description_outlined,
                      title: 'Offer Letters',
                      color: const Color(0xFF14B8A6),
                      onTap: () {},
                    ),
                  ],
                ),
                _Section(
                  title: 'My Documents',
                  isDark: isDark,
                  items: [
                    _SectionItem(
                      icon: Icons.folder_outlined,
                      title: 'CV Box',
                      color: const Color(0xFF6366F1),
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.lock_outline_rounded,
                      title: 'Document Vault',
                      color: const Color(0xFF64748B),
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.emoji_events_outlined,
                      title: 'Certificates',
                      color: const Color(0xFFF59E0B),
                      onTap: () {},
                    ),
                  ],
                ),
                _Section(
                  title: 'My Learning',
                  isDark: isDark,
                  items: [
                    _SectionItem(
                      icon: Icons.school_outlined,
                      title: 'My Enrollments',
                      color: const Color(0xFF059669),
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.menu_book_outlined,
                      title: 'Find Tutors',
                      color: const Color(0xFF2563EB),
                      onTap: () {},
                    ),
                  ],
                ),
                _Section(
                  title: 'Wallet & Payments',
                  isDark: isDark,
                  items: [
                    _SectionItem(
                      icon: Icons.account_balance_wallet_outlined,
                      title: 'My Wallet',
                      color: const Color(0xFF10B981),
                      trailingText: '৳ 0.00',
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.add_card_outlined,
                      title: 'Top Up',
                      color: const Color(0xFF0891B2),
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.receipt_long_outlined,
                      title: 'Transaction History',
                      color: const Color(0xFF64748B),
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.card_membership_outlined,
                      title: 'Packages & Subscriptions',
                      color: const Color(0xFF7C3AED),
                      onTap: () {},
                    ),
                  ],
                ),
                _Section(
                  title: 'Messages & Calls',
                  isDark: isDark,
                  items: [
                    _SectionItem(
                      icon: Icons.chat_bubble_outline_rounded,
                      title: 'Messages',
                      color: const Color(0xFF3B82F6),
                      trailingBadge: '5',
                      onTap: () => context.go('/messages'),
                    ),
                    _SectionItem(
                      icon: Icons.call_outlined,
                      title: 'Voice Calls',
                      color: const Color(0xFF059669),
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.videocam_outlined,
                      title: 'Video Calls',
                      color: const Color(0xFFE11D48),
                      onTap: () {},
                    ),
                  ],
                ),
                _Section(
                  title: 'Notifications',
                  isDark: isDark,
                  items: [
                    _SectionItem(
                      icon: Icons.notifications_outlined,
                      title: 'Job Notifications',
                      color: const Color(0xFFF59E0B),
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.update_outlined,
                      title: 'Application Updates',
                      color: const Color(0xFF0EA5E9),
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.mark_email_unread_outlined,
                      title: 'Message Alerts',
                      color: const Color(0xFF8B5CF6),
                      onTap: () {},
                    ),
                  ],
                ),
                _Section(
                  title: 'Help & Support',
                  isDark: isDark,
                  items: [
                    _SectionItem(
                      icon: Icons.help_outline_rounded,
                      title: 'Help Center',
                      color: const Color(0xFF0891B2),
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.support_agent_outlined,
                      title: 'Contact Support',
                      color: const Color(0xFF3B82F6),
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.feedback_outlined,
                      title: 'Send Feedback',
                      color: const Color(0xFF10B981),
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.report_outlined,
                      title: 'Report Issue',
                      color: const Color(0xFFEA580C),
                      onTap: () {},
                    ),
                  ],
                ),
                _Section(
                  title: 'Settings',
                  isDark: isDark,
                  items: [
                    _SectionItem(
                      icon: Icons.edit_outlined,
                      title: 'Edit Profile',
                      color: const Color(0xFF6366F1),
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.palette_outlined,
                      title: 'Theme Selection',
                      color: const Color(0xFFE11D48),
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.language_outlined,
                      title: 'Language',
                      color: const Color(0xFF0EA5E9),
                      trailingText: 'English',
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.shield_outlined,
                      title: 'Privacy & Security',
                      color: const Color(0xFF64748B),
                      onTap: () {},
                    ),
                  ],
                ),
                _Section(
                  title: 'Legal & About',
                  isDark: isDark,
                  items: [
                    _SectionItem(
                      icon: Icons.gavel_outlined,
                      title: 'Terms of Service',
                      color: const Color(0xFF64748B),
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.privacy_tip_outlined,
                      title: 'Privacy Policy',
                      color: const Color(0xFF64748B),
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.groups_outlined,
                      title: 'Community Guidelines',
                      color: const Color(0xFF059669),
                      onTap: () {},
                    ),
                    _SectionItem(
                      icon: Icons.info_outline_rounded,
                      title: 'About TELND',
                      color: const Color(0xFF0891B2),
                      onTap: () {},
                    ),
                  ],
                ),
                _LogOutButton(isDark: isDark, onTap: () {}),
                const SizedBox(height: 18),
                Center(
                  child: Text(
                    'TELND · Version 1.0.0',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: (isDark ? Colors.white : Colors.black)
                          .withOpacity(0.32),
                    ),
                  ),
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

/// Gradient identity card with avatar, actions and an overlapping stat strip.
class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(20, 26, 20, 46),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(26),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [_kBrand, _kBrandLight],
            ),
            boxShadow: [
              BoxShadow(
                color: _kBrand.withOpacity(isDark ? 0.35 : 0.28),
                blurRadius: 24,
                spreadRadius: -6,
                offset: const Offset(0, 12),
              ),
            ],
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(3),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: Colors.white.withOpacity(0.35),
                    width: 2,
                  ),
                ),
                child: CircleAvatar(
                  radius: 38,
                  backgroundColor: Colors.white.withOpacity(0.16),
                  child: const Icon(
                    Icons.person_rounded,
                    size: 40,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'Guest User',
                style: TextStyle(
                  fontSize: 21,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.3,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Sign in to unlock your full profile',
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.white.withOpacity(0.75),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: _HeaderButton(
                      label: 'Sign In',
                      filled: true,
                      onTap: () => context.push('/auth/welcome'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _HeaderButton(
                      label: 'Sign Up',
                      filled: false,
                      onTap: () => context.push('/auth/welcome'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        Transform.translate(
          offset: const Offset(0, -30),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 14),
            padding: const EdgeInsets.symmetric(vertical: 14),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1C1E21) : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isDark
                    ? Colors.white.withOpacity(0.07)
                    : Colors.black.withOpacity(0.04),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(isDark ? 0.3 : 0.06),
                  blurRadius: 18,
                  spreadRadius: -4,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Row(
              children: [
                _Stat(value: '0', label: 'Applied', isDark: isDark),
                _StatDivider(isDark: isDark),
                _Stat(value: '0', label: 'Saved', isDark: isDark),
                _StatDivider(isDark: isDark),
                _Stat(value: '0', label: 'Offers', isDark: isDark),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _HeaderButton extends StatelessWidget {
  final String label;
  final bool filled;
  final VoidCallback onTap;

  const _HeaderButton({
    required this.label,
    required this.filled,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: filled ? Colors.white : Colors.white.withOpacity(0.12),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          height: 46,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: filled
                ? null
                : Border.all(color: Colors.white.withOpacity(0.45)),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14.5,
              fontWeight: FontWeight.w700,
              color: filled ? _kBrand : Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String value;
  final String label;
  final bool isDark;

  const _Stat({
    required this.value,
    required this.label,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: isDark ? Colors.white : const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w500,
              color: (isDark ? Colors.white : Colors.black).withOpacity(0.45),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatDivider extends StatelessWidget {
  final bool isDark;

  const _StatDivider({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 28,
      color: (isDark ? Colors.white : Colors.black).withOpacity(0.07),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final List<_SectionItem> items;
  final bool isDark;

  const _Section({
    required this.title,
    required this.items,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(6, 0, 6, 10),
            child: Text(
              title.toUpperCase(),
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.9,
                color: (isDark ? Colors.white : Colors.black).withOpacity(0.42),
              ),
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1C1E21) : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isDark
                    ? Colors.white.withOpacity(0.07)
                    : Colors.black.withOpacity(0.04),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(isDark ? 0.22 : 0.04),
                  blurRadius: 14,
                  spreadRadius: -4,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Column(
                children: [
                  for (int i = 0; i < items.length; i++) ...[
                    if (i > 0) _ItemDivider(isDark: isDark),
                    _ItemTile(item: items[i], isDark: isDark),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ItemDivider extends StatelessWidget {
  final bool isDark;

  const _ItemDivider({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 62),
      child: Container(
        height: 1,
        color: (isDark ? Colors.white : Colors.black).withOpacity(0.05),
      ),
    );
  }
}

class _ItemTile extends StatelessWidget {
  final _SectionItem item;
  final bool isDark;

  const _ItemTile({required this.item, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: item.onTap,
        splashColor: item.color.withOpacity(0.08),
        highlightColor: item.color.withOpacity(0.05),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          child: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: item.color.withOpacity(isDark ? 0.20 : 0.11),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(item.icon, size: 18.5, color: item.color),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  item.title,
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.1,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
              ),
              if (item.trailingText != null)
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: Text(
                    item.trailingText!,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: (isDark ? Colors.white : Colors.black)
                          .withOpacity(0.4),
                    ),
                  ),
                ),
              if (item.trailingBadge != null)
                Container(
                  margin: const EdgeInsets.only(right: 8),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: item.color,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    item.trailingBadge!,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: (isDark ? Colors.white : Colors.black).withOpacity(0.25),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LogOutButton extends StatelessWidget {
  final bool isDark;
  final VoidCallback onTap;

  const _LogOutButton({required this.isDark, required this.onTap});

  @override
  Widget build(BuildContext context) {
    const red = Color(0xFFE11D48);

    return Material(
      color: isDark ? red.withOpacity(0.12) : red.withOpacity(0.07),
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          height: 52,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: red.withOpacity(0.22)),
          ),
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.logout_rounded, size: 19, color: red),
              SizedBox(width: 9),
              Text(
                'Log Out',
                style: TextStyle(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700,
                  color: red,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionItem {
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final Color color;
  final String? trailingText;
  final String? trailingBadge;

  const _SectionItem({
    required this.icon,
    required this.title,
    required this.onTap,
    this.color = _kBrandLight,
    this.trailingText,
    this.trailingBadge,
  });
}
