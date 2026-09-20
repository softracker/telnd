import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:telnd_mobile/core/theme.dart';

class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  final _emailController = TextEditingController();
  bool _sent = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (context.canPop()) {
          context.pop();
        } else {
          context.go('/');
        }
      },
      child: ColoredBox(
      color: isDark ? AppTheme.darkBackground : AppTheme.lightBackground,
      child: Material(
        color: Colors.transparent,
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              children: [
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerLeft,
                  child: GestureDetector(
                    onTap: () {
                      if (context.canPop()) {
                        context.pop();
                      } else {
                        context.go('/auth/login');
                      }
                    },
                    child: SvgPicture.asset(
                      'assets/icons/close.svg',
                      width: 28,
                      height: 28,
                      colorFilter: ColorFilter.mode(
                        isDark ? Colors.white70 : const Color(0xFF1F2937),
                        BlendMode.srcIn,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Image.asset(
                    'assets/icons/favicon.png',
                    width: 56,
                    height: 56,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(height: 28),
                Text(
                  _sent ? 'Check Your Email' : 'Forgot Password?',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  _sent
                      ? 'We\'ve sent a password reset link to your email address'
                      : 'Enter your email and we\'ll send you a reset link',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.white.withOpacity(0.5) : const Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 40),
                if (_sent) ...[
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: const Color(0xFF059669).withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Center(
                      child: Icon(
                        Icons.mark_email_read_outlined,
                        size: 32,
                        color: Color(0xFF059669),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  GestureDetector(
                    onTap: () {
                      setState(() => _sent = false);
                      _emailController.clear();
                    },
                    child: Text.rich(
                      TextSpan(
                        text: 'Didn\'t receive the email? ',
                        style: TextStyle(
                          fontSize: 14,
                          color: isDark ? Colors.white.withOpacity(0.5) : const Color(0xFF64748B),
                        ),
                        children: [
                          TextSpan(
                            text: 'Resend',
                            style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ),
                ] else ...[
                  _buildInput(
                    context: context,
                    label: 'Email',
                    hint: 'rahim@example.com',
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    iconAsset: 'assets/icons/email.svg',
                    isDark: isDark,
                  ),
                  const SizedBox(height: 28),
                  _buildPrimaryButton('Send Reset Link', () {
                    if (_emailController.text.isNotEmpty) {
                      setState(() => _sent = true);
                    }
                  }),
                ],
                const SizedBox(height: 40),
                GestureDetector(
                  onTap: () {
                    if (context.canPop()) {
                      context.pop();
                    } else {
                      context.go('/auth/login');
                    }
                  },
                  child: Text(
                    'Back to Sign In',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.primary,
                    ),
                  ),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
        ),
      ),
    );
  }

  Widget _buildInput({
    required BuildContext context,
    required String label,
    required String hint,
    required TextEditingController controller,
    required bool isDark,
    required String iconAsset,
    TextInputType? keyboardType,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          style: const TextStyle(fontSize: 14),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: isDark ? Colors.white24 : Colors.black26),
            prefixIcon: Padding(
              padding: const EdgeInsets.all(12),
              child: SvgPicture.asset(
                iconAsset,
                width: 20,
                height: 20,
                colorFilter: ColorFilter.mode(
                  isDark ? Colors.white38 : Colors.black38,
                  BlendMode.srcIn,
                ),
              ),
            ),
            filled: true,
            fillColor: isDark ? Colors.white.withOpacity(0.05) : const Color(0xFFF1F5F9),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppTheme.primary, width: 1.5),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          ),
        ),
      ],
    );
  }

  Widget _buildPrimaryButton(String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        height: 50,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppTheme.primary, Color(0xFF045E62)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: AppTheme.primary.withOpacity(0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Center(
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}
