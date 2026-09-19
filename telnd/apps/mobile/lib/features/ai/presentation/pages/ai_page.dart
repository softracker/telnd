import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:telnd_mobile/core/theme.dart';

class AiPage extends StatefulWidget {
  const AiPage({super.key});

  @override
  State<AiPage> createState() => _AiPageState();
}

class _AiPageState extends State<AiPage> with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _glowController;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);
    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _glowController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? AppTheme.accent : AppTheme.primary;
    final secondary = isDark ? const Color(0xFF34D399) : AppTheme.accent;
    final textColor = isDark ? Colors.white : const Color(0xFF1F2937);
    final subtextColor = isDark ? Colors.white54 : Colors.black38;

    return Scaffold(
      body: Stack(
        children: [
          AnimatedBuilder(
            animation: Listenable.merge([_pulseController, _glowController]),
            builder: (context, child) {
              return CustomPaint(
                painter: _AiBackgroundPainter(
                  pulseValue: _pulseController.value,
                  glowValue: _glowController.value,
                  primary: primary,
                  secondary: secondary,
                  isDark: isDark,
                ),
                size: Size.infinite,
              );
            },
          ),
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    children: [
                      GestureDetector(
                        onTap: () {},
                        child: SvgPicture.asset(
                          'assets/icons/chat-history.svg',
                          width: 24,
                          height: 24,
                          colorFilter: ColorFilter.mode(textColor, BlendMode.srcIn),
                        ),
                      ),
                      const Spacer(),
                      GestureDetector(
                        onTap: () {},
                        child: SvgPicture.asset(
                          'assets/icons/talk to ai.svg',
                          width: 24,
                          height: 24,
                          colorFilter: ColorFilter.mode(textColor, BlendMode.srcIn),
                        ),
                      ),
                      const SizedBox(width: 16),
                      GestureDetector(
                        onTap: () {},
                        child: Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: primary.withOpacity(isDark ? 0.15 : 0.10),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(Icons.add_rounded, size: 18, color: primary),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Hey, what\'s on your mind?',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: textColor,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'I can help with jobs, tutors, doctors & more',
                            style: TextStyle(
                              fontSize: 13,
                              color: subtextColor,
                            ),
                          ),
                          const SizedBox(height: 24),
                          GestureDetector(
                            onTap: () {},
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [primary, secondary],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                                borderRadius: BorderRadius.circular(14),
                                boxShadow: [
                                  BoxShadow(
                                    color: primary.withOpacity(0.3),
                                    blurRadius: 16,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  SvgPicture.asset(
                                    'assets/icons/talk to ai.svg',
                                    width: 20,
                                    height: 20,
                                    colorFilter: const ColorFilter.mode(
                                      Colors.white,
                                      BlendMode.srcIn,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Text(
                                    'Start Talking',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                _buildInputBar(context, isDark, primary, secondary, textColor, subtextColor),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputBar(BuildContext context, bool isDark, Color primary, Color secondary, Color textColor, Color subtextColor) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      decoration: const BoxDecoration(),
      child: Container(
        height: 52,
        decoration: BoxDecoration(
          color: isDark
              ? Colors.white.withOpacity(0.06)
              : Colors.black.withOpacity(0.04),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark
                ? Colors.white.withOpacity(0.08)
                : Colors.black.withOpacity(0.05),
          ),
        ),
        child: Row(
          children: [
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () => _showUploadOptions(context, isDark, primary),
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: primary.withOpacity(isDark ? 0.12 : 0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: SvgPicture.asset(
                  'assets/icons/add-media.svg',
                  width: 18,
                  height: 18,
                  colorFilter: ColorFilter.mode(primary, BlendMode.srcIn),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: _searchController,
                style: TextStyle(
                  fontSize: 15,
                  color: textColor,
                ),
                decoration: InputDecoration(
                  hintText: 'Ask anything...',
                  hintStyle: TextStyle(
                    fontSize: 15,
                    color: subtextColor,
                  ),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
                ),
              ),
            ),
            GestureDetector(
              onTap: () {},
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: SvgPicture.asset(
                  'assets/icons/voice-input.svg',
                  width: 22,
                  height: 22,
                  colorFilter: ColorFilter.mode(subtextColor, BlendMode.srcIn),
                ),
              ),
            ),
            const SizedBox(width: 4),
            GestureDetector(
              onTap: () {},
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [primary, secondary],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.arrow_upward_rounded,
                  size: 20,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(width: 4),
          ],
        ),
      ),
    );
  }

  void _showUploadOptions(BuildContext context, bool isDark, Color primary) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _UploadSheet(isDark: isDark, primary: primary),
    );
  }
}

class _UploadSheet extends StatelessWidget {
  final bool isDark;
  final Color primary;

  const _UploadSheet({required this.isDark, required this.primary});

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
          const SizedBox(height: 20),
          Text(
            'Upload File',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: isDark ? Colors.white : const Color(0xFF1F2937),
            ),
          ),
          const SizedBox(height: 20),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildOption(
                  icon: 'assets/icons/camera.svg',
                  label: 'Camera',
                  color: primary,
                  isDark: isDark,
                  onTap: () => Navigator.pop(context),
                ),
                _buildOption(
                  icon: 'assets/icons/gallery.svg',
                  label: 'Photos',
                  color: primary,
                  isDark: isDark,
                  onTap: () => Navigator.pop(context),
                ),
                _buildOption(
                  icon: 'assets/icons/file-upload.svg',
                  label: 'Files',
                  color: primary,
                  isDark: isDark,
                  onTap: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOption({
    required String icon,
    required String label,
    required Color color,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: color.withOpacity(isDark ? 0.12 : 0.08),
              shape: BoxShape.circle,
              border: Border.all(
                color: color.withOpacity(isDark ? 0.15 : 0.10),
              ),
            ),
            child: Center(
              child: SvgPicture.asset(
                icon,
                width: 26,
                height: 26,
                colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : const Color(0xFF1F2937),
            ),
          ),
        ],
      ),
    );
  }
}

class _AiBackgroundPainter extends CustomPainter {
  final double pulseValue;
  final double glowValue;
  final Color primary;
  final Color secondary;
  final bool isDark;

  _AiBackgroundPainter({
    required this.pulseValue,
    required this.glowValue,
    required this.primary,
    required this.secondary,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = isDark ? const Color(0xFF0D0D0D) : const Color(0xFFF0F4F8);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    final glow1 = Paint()
      ..shader = RadialGradient(
        colors: [
          primary.withOpacity(0.08 + pulseValue * 0.04),
          Colors.transparent,
        ],
      ).createShader(
        Rect.fromCircle(
          center: Offset(size.width * 0.3, size.height * 0.2),
          radius: size.width * 0.5,
        ),
      );
    canvas.drawCircle(
      Offset(size.width * 0.3, size.height * 0.2),
      size.width * 0.5,
      glow1,
    );

    final glow2 = Paint()
      ..shader = RadialGradient(
        colors: [
          secondary.withOpacity(0.06 + glowValue * 0.03),
          Colors.transparent,
        ],
      ).createShader(
        Rect.fromCircle(
          center: Offset(size.width * 0.75, size.height * 0.35),
          radius: size.width * 0.4,
        ),
      );
    canvas.drawCircle(
      Offset(size.width * 0.75, size.height * 0.35),
      size.width * 0.4,
      glow2,
    );

    final glow3 = Paint()
      ..shader = RadialGradient(
        colors: [
          primary.withOpacity(0.04 + pulseValue * 0.02),
          Colors.transparent,
        ],
      ).createShader(
        Rect.fromCircle(
          center: Offset(size.width * 0.5, size.height * 0.6),
          radius: size.width * 0.6,
        ),
      );
    canvas.drawCircle(
      Offset(size.width * 0.5, size.height * 0.6),
      size.width * 0.6,
      glow3,
    );

    final linePaint = Paint()
      ..color = primary.withOpacity(0.03 + pulseValue * 0.02)
      ..strokeWidth = 1
      ..style = PaintingStyle.stroke;

    final rng = Random(42);
    for (int i = 0; i < 15; i++) {
      final x1 = rng.nextDouble() * size.width;
      final y1 = rng.nextDouble() * size.height;
      final x2 = x1 + (rng.nextDouble() - 0.5) * 120;
      final y2 = y1 + (rng.nextDouble() - 0.5) * 120;
      canvas.drawLine(Offset(x1, y1), Offset(x2, y2), linePaint);
    }

    final dotPaint = Paint()..color = primary.withOpacity(0.05 + glowValue * 0.03);
    for (int i = 0; i < 30; i++) {
      final x = rng.nextDouble() * size.width;
      final y = rng.nextDouble() * size.height;
      final r = 1.0 + rng.nextDouble() * 2;
      canvas.drawCircle(Offset(x, y), r, dotPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _AiBackgroundPainter oldDelegate) =>
      pulseValue != oldDelegate.pulseValue ||
      glowValue != oldDelegate.glowValue;
}
