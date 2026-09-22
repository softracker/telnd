import 'dart:async';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

enum StoryAction { none, swipeUp, viewDetails }

class StoryViewerPage extends StatefulWidget {
  final String title;
  final List<String> images;
  final StoryAction action;
  final String? actionLabel;

  const StoryViewerPage({
    super.key,
    required this.title,
    required this.images,
    this.action = StoryAction.none,
    this.actionLabel,
  });

  @override
  State<StoryViewerPage> createState() => _StoryViewerPageState();
}

class _StoryViewerPageState extends State<StoryViewerPage> {
  int _currentIndex = 0;
  bool _paused = false;
  Timer? _timer;
  double _progress = 0.0;
  bool _finished = false;
  Color _dominantColor = Colors.black;

  static const Duration _imageDuration = Duration(seconds: 5);
  static const int _progressTicks = 100;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _extractColor(0);
    _startTimer();
  }

  Future<void> _extractColor(int index) async {
    try {
      final data = await DefaultAssetBundle.of(context).load(widget.images[index]);
      final codec = await ui.instantiateImageCodec(data.buffer.asUint8List());
      final frame = await codec.getNextFrame();
      final image = frame.image;
      final byteData = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
      if (byteData == null) return;

      final pixels = byteData.buffer.asUint8List();
      final width = image.width;
      final height = image.height;

      int r = 0, g = 0, b = 0, count = 0;
      // Sample pixels from top and bottom rows
      for (int row = 0; row < height; row += (height / 20).ceil()) {
        for (int col = 0; col < width; col += (width / 20).ceil()) {
          final offset = (row * width + col) * 4;
          if (offset + 3 < pixels.length) {
            r += pixels[offset];
            g += pixels[offset + 1];
            b += pixels[offset + 2];
            count++;
          }
        }
      }

      image.dispose();

      if (count > 0 && mounted) {
        setState(() {
          _dominantColor = Color.fromARGB(
            255,
            r ~/ count,
            g ~/ count,
            b ~/ count,
          );
        });
      }
    } catch (_) {}
  }

  void _startTimer() {
    _timer?.cancel();
    _progress = 0.0;
    final tickMs = _imageDuration.inMilliseconds ~/ _progressTicks;
    _timer = Timer.periodic(Duration(milliseconds: tickMs), (timer) {
      if (!mounted || _paused || _finished) {
        timer.cancel();
        return;
      }
      setState(() {
        _progress += 1.0 / _progressTicks;
        if (_progress >= 1.0) {
          _progress = 1.0;
          _nextImage();
        }
      });
    });
  }

  void _nextImage() {
    if (_currentIndex < widget.images.length - 1) {
      _currentIndex++;
      _progress = 0.0;
      _extractColor(_currentIndex);
      setState(() {});
      _startTimer();
    } else {
      _finish();
    }
  }

  void _prevImage() {
    if (_currentIndex > 0) {
      _currentIndex--;
      _progress = 0.0;
      _extractColor(_currentIndex);
      setState(() {});
      _startTimer();
    }
  }

  void _finish() {
    if (_finished || !mounted) return;
    _finished = true;
    _timer?.cancel();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    Navigator.of(context, rootNavigator: true).pop();
  }

  void _openLink() {
    launchUrl(
      Uri.parse('https://telnd.com'),
      mode: LaunchMode.inAppWebView,
    );
  }

  void _onTapDown(TapDownDetails details) {
    setState(() => _paused = true);
  }

  void _onTapUp(TapUpDetails details) {
    if (_finished) return;
    final screenWidth = MediaQuery.of(context).size.width;
    final tapX = details.globalPosition.dx;

    if (tapX < screenWidth / 3) {
      _prevImage();
    } else if (tapX > screenWidth * 2 / 3) {
      _nextImage();
    }

    setState(() => _paused = false);
  }

  @override
  void dispose() {
    _finished = true;
    _timer?.cancel();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        systemNavigationBarColor: Colors.black,
        systemNavigationBarIconBrightness: Brightness.light,
      ),
      child: Scaffold(
        backgroundColor: _dominantColor,
        body: GestureDetector(
          onTapDown: _onTapDown,
          onTapUp: _onTapUp,
          onVerticalDragEnd: widget.action == StoryAction.swipeUp
              ? (details) {
                  if (details.primaryVelocity != null &&
                      details.primaryVelocity! < -100) {
                    _openLink();
                  }
                }
              : null,
          child: SizedBox.expand(
            child: Stack(
              children: [
                // Full-screen image with contain
                Positioned.fill(
                  child: Image.asset(
                    widget.images[_currentIndex],
                    fit: BoxFit.contain,
                  ),
                ),
                // Gradient overlay for top/bottom readability
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black.withOpacity(0.2),
                          Colors.transparent,
                          Colors.transparent,
                          Colors.black.withOpacity(0.3),
                        ],
                        stops: const [0.0, 0.1, 0.85, 1.0],
                      ),
                    ),
                  ),
                ),
                // Progress bars
                Positioned(
                  top: MediaQuery.of(context).padding.top + 6,
                  left: 10,
                  right: 10,
                  child: Row(
                    children: List.generate(widget.images.length, (index) {
                      return Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 2),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(2),
                            child: LinearProgressIndicator(
                              value: index < _currentIndex
                                  ? 1.0
                                  : index == _currentIndex
                                      ? _progress
                                      : 0.0,
                              minHeight: 2.5,
                              backgroundColor: Colors.white.withOpacity(0.3),
                              valueColor: const AlwaysStoppedAnimation<Color>(
                                  Colors.white),
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                ),
                // Close button
                Positioned(
                  top: MediaQuery.of(context).padding.top + 16,
                  right: 12,
                  child: GestureDetector(
                    onTap: _finish,
                    child: Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.black.withOpacity(0.4),
                      ),
                      child: const Icon(
                        Icons.close_rounded,
                        size: 16,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                // Title
                Positioned(
                  top: MediaQuery.of(context).padding.top + 18,
                  left: 14,
                  right: 56,
                  child: Text(
                    widget.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      shadows: [
                        Shadow(blurRadius: 6, color: Colors.black54),
                      ],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                // Swipe up indicator
                if (widget.action == StoryAction.swipeUp)
                  Positioned(
                    bottom: bottomPadding + 20,
                    left: 0,
                    right: 0,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.keyboard_arrow_up_rounded,
                          size: 28,
                          color: Colors.white.withOpacity(0.8),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.actionLabel ?? 'Swipe to learn more',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: Colors.white.withOpacity(0.8),
                            decoration: TextDecoration.underline,
                            decorationColor: Colors.white.withOpacity(0.5),
                          ),
                        ),
                      ],
                    ),
                  ),
                // View Details button
                if (widget.action == StoryAction.viewDetails)
                  Positioned(
                    bottom: bottomPadding + 20,
                    left: 24,
                    right: 24,
                    child: GestureDetector(
                      onTap: _openLink,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              widget.actionLabel ?? 'View Details',
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF1F2937),
                              ),
                            ),
                            const SizedBox(width: 6),
                            const Icon(
                              Icons.arrow_forward_ios_rounded,
                              size: 14,
                              color: Color(0xFF1F2937),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
