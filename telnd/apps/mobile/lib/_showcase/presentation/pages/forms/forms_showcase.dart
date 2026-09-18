import 'package:flutter/material.dart';
import 'package:telnd_mobile/shared/presentation/widgets/components/app_input.dart';
import 'package:telnd_mobile/shared/presentation/widgets/components/app_textarea.dart';
import 'package:telnd_mobile/shared/presentation/widgets/components/app_checkbox.dart';
import 'package:telnd_mobile/shared/presentation/widgets/components/app_radio.dart';
import 'package:telnd_mobile/shared/presentation/widgets/components/app_switch.dart';

class FormsShowcase extends StatefulWidget {
  const FormsShowcase({super.key});

  @override
  State<FormsShowcase> createState() => _FormsShowcaseState();
}

class _FormsShowcaseState extends State<FormsShowcase> {
  bool _check1 = false;
  bool _check2 = true;
  String _radio = 'free';
  bool _switch1 = false;
  bool _switch2 = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Forms & Inputs')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _section('Input', [
            const AppInput(hint: 'Enter your name'),
            const SizedBox(height: 12),
            const AppInput(label: 'Email', hint: 'you@example.com', prefixIcon: Icons.email_outlined),
            const SizedBox(height: 12),
            const AppInput(label: 'Password', hint: '••••••••', suffixIcon: Icons.visibility_off),
            const SizedBox(height: 12),
            const AppInput(label: 'With Error', hint: 'Invalid input', error: 'This field is required'),
            const SizedBox(height: 12),
            const AppInput(label: 'Helper Text', hint: 'Enter username', helperText: 'Must be at least 4 characters'),
            const SizedBox(height: 12),
            const AppInput(label: 'Required Field', hint: 'Required', required: true),
            const SizedBox(height: 12),
            const AppInput(label: 'Disabled', hint: 'Cannot edit', enabled: false),
          ]),
          _section('Sizes', [
            const AppInput(label: 'Small', hint: 'Small input', size: AppInputSize.sm),
            const SizedBox(height: 12),
            const AppInput(label: 'Medium', hint: 'Medium input', size: AppInputSize.md),
            const SizedBox(height: 12),
            const AppInput(label: 'Large', hint: 'Large input', size: AppInputSize.lg),
          ]),
          _section('Textarea', [
            const AppTextarea(hint: 'Write something...'),
            const SizedBox(height: 12),
            const AppTextarea(label: 'Description', hint: 'Tell us about yourself', maxLines: 6),
            const SizedBox(height: 12),
            const AppTextarea(label: 'With Error', hint: 'Write here', error: 'Cannot be empty'),
          ]),
          _section('Checkbox', [
            AppCheckbox(
              label: 'I agree to Terms & Conditions',
              value: _check1,
              onChanged: (v) => setState(() => _check1 = v ?? false),
            ),
            const SizedBox(height: 8),
            AppCheckbox(
              label: 'Subscribe to newsletter',
              description: 'Get notified about new jobs',
              value: _check2,
              onChanged: (v) => setState(() => _check2 = v ?? false),
            ),
            const SizedBox(height: 8),
            const AppCheckbox(label: 'Pre-checked', value: true),
            const SizedBox(height: 8),
            const AppCheckbox(label: 'Disabled', value: false, enabled: false),
            const SizedBox(height: 8),
            const AppCheckbox(label: 'Small', value: false, size: AppCheckboxSize.sm),
            const SizedBox(height: 8),
            const AppCheckbox(label: 'Large', value: false, size: AppCheckboxSize.lg),
          ]),
          _section('Radio', [
            AppRadio(
              label: 'Free Plan',
              description: 'Basic features, limited access',
              value: 'free',
              groupValue: _radio,
              onChanged: (v) => setState(() => _radio = v ?? 'free'),
            ),
            const SizedBox(height: 8),
            AppRadio(
              label: 'Pro Plan',
              description: 'All features, unlimited access',
              value: 'pro',
              groupValue: _radio,
              onChanged: (v) => setState(() => _radio = v ?? 'free'),
            ),
            const SizedBox(height: 8),
            AppRadio(
              label: 'Enterprise',
              description: 'Custom pricing, dedicated support',
              value: 'enterprise',
              groupValue: _radio,
              onChanged: (v) => setState(() => _radio = v ?? 'free'),
            ),
          ]),
          _section('Switch', [
            AppSwitch(
              label: 'Email Notifications',
              description: 'Receive job alerts via email',
              value: _switch1,
              onChanged: (v) => setState(() => _switch1 = v),
            ),
            const SizedBox(height: 8),
            AppSwitch(
              label: 'Dark Mode',
              value: _switch2,
              onChanged: (v) => setState(() => _switch2 = v),
            ),
            const SizedBox(height: 8),
            const AppSwitch(label: 'Disabled', value: false, enabled: false),
            const SizedBox(height: 8),
            const AppSwitch(label: 'Small', value: false, size: AppSwitchSize.sm),
            const SizedBox(height: 8),
            const AppSwitch(label: 'Large', value: false, size: AppSwitchSize.lg),
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
