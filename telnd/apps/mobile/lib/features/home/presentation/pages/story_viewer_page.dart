import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class StoryViewerPage extends StatefulWidget {
  final String title;
  final List<String> images;
  final String? actionLabel;

  const StoryViewerPage({
    super.key,
    required this.title,
    required this.images,
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

  static const Duration _imageDuration = Duration(seconds: 5);
  static const int _progressTicks = 100;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    _progress = 0.0;
    final tickMs = _imageDuration.inMilliseconds ~/ _progressTicks;
    _timer = Timer.periodic(Duration(milliseconds: tickMs), (timer) {
      if (_paused) return;
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
      setState(() {});
      _startTimer();
    }
  }

  void _finish() {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    Navigator.of(context).pop();
  }

  void _onTapDown(TapDownDetails details) {
    setState(() => _paused = true);
  }

  void _onTapUp(TapUpDetails details) {
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
    _timer?.cancel();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        systemNavigationBarColor: Colors.black,
        systemNavigationBarIconBrightness: Brightness.light,
      ),
      child: Scaffold(
        backgroundColor: Colors.black,
        body: GestureDetector(
          onTapDown: _onTapDown,
          onTapUp: _onTapUp,
          child: SizedBox.expand(
            child: Stack(
              children: [
                // Full-screen image
                Positioned.fill(
                  child: Image.asset(
                    widget.images[_currentIndex],
                    fit: BoxFit.cover,
                  ),
                ),
                // Gradient overlay for readability
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black.withOpacity(0.35),
                          Colors.transparent,
                          Colors.transparent,
                          Colors.black.withOpacity(0.5),
                        ],
                        stops: const [0.0, 0.12, 0.8, 1.0],
                      ),
                    ),
                  ),
                ),
                // Progress bars — at very top
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
                // Action button — bottom
                if (widget.actionLabel != null)
                  Positioned(
                    bottom: MediaQuery.of(context).padding.bottom + 20,
                    left: 24,
                    right: 24,
                    child: GestureDetector(
                      onTap: () {},
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
                              widget.actionLabel!,
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
