import 'package:flutter/material.dart';
import 'package:telnd_mobile/shared/presentation/widgets/components/app_button.dart';
import 'package:telnd_mobile/shared/presentation/widgets/components/app_icon_button.dart';
import 'package:telnd_mobile/shared/presentation/widgets/components/app_fab.dart';

class ButtonsShowcase extends StatefulWidget {
  const ButtonsShowcase({super.key});

  @override
  State<ButtonsShowcase> createState() => _ButtonsShowcaseState();
}

class _ButtonsShowcaseState extends State<ButtonsShowcase> {
  bool _loading = false;

  void _toggleLoading() {
    setState(() => _loading = !_loading);
    if (_loading) Future.delayed(const Duration(seconds: 2), () => setState(() => _loading = false));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Buttons')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _section('Variants', [
            AppButton(label: 'Primary', onPressed: () {}),
            const SizedBox(height: 8),
            AppButton(label: 'Secondary', variant: AppButtonVariant.secondary, onPressed: () {}),
            const SizedBox(height: 8),
            AppButton(label: 'Accent', variant: AppButtonVariant.accent, onPressed: () {}),
            const SizedBox(height: 8),
            AppButton(label: 'Orange', variant: AppButtonVariant.orange, onPressed: () {}),
            const SizedBox(height: 8),
            AppButton(label: 'Outline', variant: AppButtonVariant.outline, onPressed: () {}),
            const SizedBox(height: 8),
            AppButton(label: 'Ghost', variant: AppButtonVariant.ghost, onPressed: () {}),
            const SizedBox(height: 8),
            AppButton(label: 'Danger', variant: AppButtonVariant.danger, onPressed: () {}),
            const SizedBox(height: 8),
            AppButton(label: 'Link', variant: AppButtonVariant.link, onPressed: () {}),
          ]),
          _section('Sizes', [
            AppButton(label: 'Extra Small', size: AppButtonSize.xs, onPressed: () {}),
            const SizedBox(height: 8),
            AppButton(label: 'Small', size: AppButtonSize.sm, onPressed: () {}),
            const SizedBox(height: 8),
            AppButton(label: 'Medium', size: AppButtonSize.md, onPressed: () {}),
            const SizedBox(height: 8),
            AppButton(label: 'Large', size: AppButtonSize.lg, onPressed: () {}),
            const SizedBox(height: 8),
            AppButton(label: 'Extra Large', size: AppButtonSize.xl, onPressed: () {}),
          ]),
          _section('With Icons', [
            AppButton(label: 'Download', iconLeading: Icons.download, onPressed: () {}),
            const SizedBox(height: 8),
            AppButton(label: 'Next', iconTrailing: Icons.arrow_forward, variant: AppButtonVariant.outline, onPressed: () {}),
          ]),
          _section('Loading & Full Width', [
            AppButton(label: 'Loading', loading: _loading, onPressed: _toggleLoading),
            const SizedBox(height: 8),
            AppButton(label: 'Full Width', fullWidth: true, onPressed: () {}),
          ]),
          _section('Icon Button', [
            Row(
              children: [
                AppIconButton(icon: Icons.add, tooltip: 'Add', onPressed: () {}),
                const SizedBox(width: 8),
                AppIconButton(icon: Icons.edit, tooltip: 'Edit', onPressed: () {}),
                const SizedBox(width: 8),
                AppIconButton(icon: Icons.delete, tooltip: 'Delete', onPressed: () {}),
                const SizedBox(width: 8),
                AppIconButton(icon: Icons.share, tooltip: 'Share', onPressed: () {}),
              ],
            ),
          ]),
          _section('FAB', [
            Row(
              children: [
                const AppFAB(icon: Icons.add, variant: AppFabVariant.primary),
                const SizedBox(width: 8),
                const AppFAB(icon: Icons.add, variant: AppFabVariant.accent),
                const SizedBox(width: 8),
                const AppFAB(icon: Icons.add, variant: AppFabVariant.orange),
                const SizedBox(width: 8),
                const AppFAB(icon: Icons.add, variant: AppFabVariant.secondary),
              ],
            ),
            const SizedBox(height: 8),
            const AppFAB(icon: Icons.add, label: 'Create Job', variant: AppFabVariant.primary),
          ]),
        ],
      ),
    );
  }

  Widget _section(String title, List<Widget> children) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }
}
