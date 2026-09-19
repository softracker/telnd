import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:telnd_mobile/shared/presentation/widgets/theme_toggle.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: const [
          ThemeToggle(),
          SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
        child: Column(
          children: [
            _buildProfileHeader(context, isDark),
            const SizedBox(height: 24),
            _buildSection(context, 'My Applications', [
              _SectionItem(icon: Icons.work_outline, title: 'Applied Jobs', onTap: () {}),
              _SectionItem(icon: Icons.bookmark_outline, title: 'Saved Jobs', onTap: () {}),
              _SectionItem(icon: Icons.star_outline, title: 'Shortlisted', onTap: () {}),
              _SectionItem(icon: Icons.mail_outline, title: 'Invitations', onTap: () {}),
              _SectionItem(icon: Icons.timeline_outlined, title: 'Application Timeline', onTap: () {}),
              _SectionItem(icon: Icons.description_outlined, title: 'Offer Letters', onTap: () {}),
            ], isDark),
            _buildSection(context, 'My Documents', [
              _SectionItem(icon: Icons.folder_outlined, title: 'CV Box', onTap: () {}),
              _SectionItem(icon: Icons.lock_outline, title: 'Document Vault', onTap: () {}),
              _SectionItem(icon: Icons.emoji_events_outlined, title: 'Certificates', onTap: () {}),
            ], isDark),
            _buildSection(context, 'My Learning', [
              _SectionItem(icon: Icons.school_outlined, title: 'My Enrollments', onTap: () {}),
              _SectionItem(icon: Icons.menu_book_outlined, title: 'Find Tutors', onTap: () {}),
            ], isDark),
            _buildSection(context, 'Wallet & Payments', [
              _SectionItem(icon: Icons.account_balance_wallet_outlined, title: 'My Wallet', onTap: () {}),
              _SectionItem(icon: Icons.add_card_outlined, title: 'Top Up', onTap: () {}),
              _SectionItem(icon: Icons.receipt_long_outlined, title: 'Transaction History', onTap: () {}),
              _SectionItem(icon: Icons.card_membership_outlined, title: 'Packages & Subscriptions', onTap: () {}),
            ], isDark),
            _buildSection(context, 'Messages & Calls', [
              _SectionItem(icon: Icons.chat_bubble_outline, title: 'Messages', onTap: () => context.go('/messages')),
              _SectionItem(icon: Icons.call_outlined, title: 'Voice Calls', onTap: () {}),
              _SectionItem(icon: Icons.videocam_outlined, title: 'Video Calls', onTap: () {}),
            ], isDark),
            _buildSection(context, 'Notifications', [
              _SectionItem(icon: Icons.notifications_outlined, title: 'Job Notifications', onTap: () {}),
              _SectionItem(icon: Icons.update_outlined, title: 'Application Updates', onTap: () {}),
              _SectionItem(icon: Icons.mark_email_unread_outlined, title: 'Message Alerts', onTap: () {}),
            ], isDark),
            _buildSection(context, 'Help & Support', [
              _SectionItem(icon: Icons.help_outline, title: 'Help Center', onTap: () {}),
              _SectionItem(icon: Icons.support_agent_outlined, title: 'Contact Support', onTap: () {}),
              _SectionItem(icon: Icons.feedback_outlined, title: 'Send Feedback', onTap: () {}),
              _SectionItem(icon: Icons.report_outlined, title: 'Report Issue', onTap: () {}),
            ], isDark),
            _buildSection(context, 'Legal', [
              _SectionItem(icon: Icons.gavel_outlined, title: 'Terms of Service', onTap: () {}),
              _SectionItem(icon: Icons.privacy_tip_outlined, title: 'Privacy Policy', onTap: () {}),
            ], isDark),
            _buildSection(context, 'Settings', [
              _SectionItem(icon: Icons.edit_outlined, title: 'Edit Profile', onTap: () {}),
              _SectionItem(icon: Icons.palette_outlined, title: 'Theme Selection', onTap: () {}),
              _SectionItem(icon: Icons.language_outlined, title: 'Language', onTap: () {}),
              _SectionItem(icon: Icons.shield_outlined, title: 'Privacy & Security', onTap: () {}),
              _SectionItem(icon: Icons.logout, title: 'Log Out', onTap: () {}, isDestructive: true),
            ], isDark),
            _buildSection(context, 'About', [
              _SectionItem(icon: Icons.info_outline, title: 'About TELND', onTap: () {}),
              _SectionItem(icon: Icons.android_outlined, title: 'App Version', onTap: () {}),
              _SectionItem(icon: Icons.groups_outlined, title: 'Community Guidelines', onTap: () {}),
            ], isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileHeader(BuildContext context, bool isDark) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
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
            color: (isDark ? Colors.white : Colors.black).withOpacity(0.04),
            blurRadius: 16,
            spreadRadius: -2,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          CircleAvatar(
            radius: 40,
            backgroundColor: (isDark ? Colors.white : Colors.black).withOpacity(0.1),
            child: Icon(
              Icons.person,
              size: 40,
              color: isDark ? Colors.white70 : Colors.black54,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Guest User',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Sign in to view your profile',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: (isDark ? Colors.white : Colors.black).withOpacity(0.5),
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: (isDark ? Colors.white : Colors.black).withOpacity(0.05),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.star_outline, size: 18, color: isDark ? Colors.white70 : Colors.black54),
                const SizedBox(width: 6),
                Text(
                  'Profile Score: 0%',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white70 : Colors.black54,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSection(BuildContext context, String title, List<_SectionItem> items, bool isDark) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withOpacity(0.05)
            : Colors.white.withOpacity(0.7),
        border: Border.all(
          color: isDark
              ? Colors.white.withOpacity(0.08)
              : Colors.black.withOpacity(0.05),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Text(
              title,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: (isDark ? Colors.white : Colors.black).withOpacity(0.6),
                letterSpacing: 0.5,
              ),
            ),
          ),
          const SizedBox(height: 8),
          ...items.map((item) => _buildItem(context, item, isDark)),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildItem(BuildContext context, _SectionItem item, bool isDark) {
    final textColor = item.isDestructive
        ? Colors.red
        : (isDark ? Colors.white : const Color(0xFF1F2937));

    return InkWell(
      onTap: item.onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Icon(
              item.icon,
              size: 22,
              color: item.isDestructive
                  ? Colors.red
                  : (isDark ? Colors.white54 : Colors.black45),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                item.title,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                  color: textColor,
                ),
              ),
            ),
            Icon(
              Icons.chevron_right,
              size: 20,
              color: (isDark ? Colors.white : Colors.black).withOpacity(0.3),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionItem {
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final bool isDestructive;

  const _SectionItem({
    required this.icon,
    required this.title,
    required this.onTap,
    this.isDestructive = false,
  });
}
