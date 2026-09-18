import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:telnd_mobile/core/app.dart';
import 'package:telnd_mobile/core/theme_provider.dart';
import 'package:telnd_mobile/shared/presentation/widgets/theme_toggle.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeProvider = ref.watch(themeProviderNotifier);
    final themeNotifier = ref.read(themeProviderNotifier.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Appearance Section
            _buildSectionHeader(context, 'Appearance'),
            Card(
              child: Column(
                children: [
                  _buildThemeOption(
                    context,
                    icon: Icons.light_mode,
                    title: 'Light Mode',
                    subtitle: 'Use light theme',
                    isSelected: themeProvider.themeMode == AppThemeMode.light,
                    onTap: () => themeNotifier.setThemeMode(AppThemeMode.light),
                  ),
                  const Divider(height: 1),
                  _buildThemeOption(
                    context,
                    icon: Icons.dark_mode,
                    title: 'Dark Mode',
                    subtitle: 'Use dark theme',
                    isSelected: themeProvider.themeMode == AppThemeMode.dark,
                    onTap: () => themeNotifier.setThemeMode(AppThemeMode.dark),
                  ),
                  const Divider(height: 1),
                  _buildThemeOption(
                    context,
                    icon: Icons.brightness_auto,
                    title: 'System Default',
                    subtitle: 'Match your device settings',
                    isSelected: themeProvider.themeMode == AppThemeMode.system,
                    onTap: () => themeNotifier.setThemeMode(AppThemeMode.system),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Language Section
            _buildSectionHeader(context, 'Language'),
            Card(
              child: ListTile(
                leading: const Icon(Icons.language),
                title: const Text('Language'),
                subtitle: const Text('English'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  // TODO: Language selection
                },
              ),
            ),

            const SizedBox(height: 24),

            // Notifications Section
            _buildSectionHeader(context, 'Notifications'),
            Card(
              child: Column(
                children: [
                  SwitchListTile(
                    title: const Text('Push Notifications'),
                    subtitle: const Text('Receive push notifications'),
                    value: true,
                    onChanged: (value) {
                      // TODO: Toggle push notifications
                    },
                  ),
                  const Divider(height: 1),
                  SwitchListTile(
                    title: const Text('Email Notifications'),
                    subtitle: const Text('Receive email updates'),
                    value: true,
                    onChanged: (value) {
                      // TODO: Toggle email notifications
                    },
                  ),
                  const Divider(height: 1),
                  SwitchListTile(
                    title: const Text('Job Alerts'),
                    subtitle: const Text('Get notified about new jobs'),
                    value: true,
                    onChanged: (value) {
                      // TODO: Toggle job alerts
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Privacy Section
            _buildSectionHeader(context, 'Privacy'),
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.lock),
                    title: const Text('Change Password'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      // TODO: Change password
                    },
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.security),
                    title: const Text('Two-Factor Authentication'),
                    subtitle: const Text('Disabled'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      // TODO: 2FA settings
                    },
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.visibility),
                    title: const Text('Profile Visibility'),
                    subtitle: const Text('Public'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      // TODO: Profile visibility
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Account Section
            _buildSectionHeader(context, 'Account'),
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.person),
                    title: const Text('Edit Profile'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      // TODO: Edit profile
                    },
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.card_membership),
                    title: const Text('Subscription'),
                    subtitle: const Text('Free Plan'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      // TODO: Subscription
                    },
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.account_balance_wallet),
                    title: const Text('Wallet'),
                    subtitle: const Text('Balance: ৳0'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      // TODO: Wallet
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Support Section
            _buildSectionHeader(context, 'Support'),
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.help),
                    title: const Text('Help Center'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      // TODO: Help center
                    },
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.feedback),
                    title: const Text('Send Feedback'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      // TODO: Send feedback
                    },
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.description),
                    title: const Text('Terms of Service'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      // TODO: Terms of service
                    },
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.privacy_tip),
                    title: const Text('Privacy Policy'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      // TODO: Privacy policy
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // About Section
            _buildSectionHeader(context, 'About'),
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.info),
                    title: const Text('App Version'),
                    subtitle: const Text('1.0.0'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.code),
                    title: const Text('Build Number'),
                    subtitle: const Text('1'),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Logout Button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  // TODO: Logout
                },
                icon: const Icon(Icons.logout, color: Colors.red),
                label: const Text(
                  'Log Out',
                  style: TextStyle(color: Colors.red),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.red),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Delete Account
            SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: () {
                  // TODO: Delete account
                },
                child: const Text(
                  'Delete Account',
                  style: TextStyle(color: Colors.grey),
                ),
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.bold,
          color: Theme.of(context).colorScheme.primary,
        ),
      ),
    );
  }

  Widget _buildThemeOption(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: isSelected
          ? Icon(
              Icons.check_circle,
              color: Theme.of(context).colorScheme.primary,
            )
          : null,
      onTap: onTap,
    );
  }
}
