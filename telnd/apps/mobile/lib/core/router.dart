import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:telnd_mobile/_showcase/presentation/pages/buttons/buttons_showcase.dart';
import 'package:telnd_mobile/_showcase/presentation/pages/display/display_showcase.dart';
import 'package:telnd_mobile/_showcase/presentation/pages/feedback/feedback_showcase.dart';
import 'package:telnd_mobile/_showcase/presentation/pages/forms/forms_showcase.dart';
import 'package:telnd_mobile/_showcase/presentation/pages/showcase_screen.dart';
import 'package:telnd_mobile/features/ai/presentation/pages/ai_page.dart';
import 'package:telnd_mobile/features/auth/presentation/pages/login_page.dart';
import 'package:telnd_mobile/features/auth/presentation/pages/signup_page.dart';
import 'package:telnd_mobile/features/explore/presentation/pages/explore_page.dart';
import 'package:telnd_mobile/features/home/presentation/pages/home_page.dart';
import 'package:telnd_mobile/features/jobs/presentation/pages/jobs_page.dart';
import 'package:telnd_mobile/features/messages/presentation/pages/messages_page.dart';
import 'package:telnd_mobile/features/profile/presentation/pages/profile_page.dart';
import 'package:telnd_mobile/shared/presentation/widgets/bottom_nav.dart';
import 'package:telnd_mobile/shared/presentation/widgets/custom_app_bar.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    routes: [
      ShellRoute(
        builder: (context, state, child) {
          return MainShell(child: child);
        },
        routes: [
          GoRoute(
            path: '/',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: HomePage(),
            ),
          ),
          GoRoute(
            path: '/explore',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ExplorePage(),
            ),
          ),
          GoRoute(
            path: '/ai',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: AiPage(),
            ),
          ),
          GoRoute(
            path: '/messages',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: MessagesPage(),
            ),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ProfilePage(),
            ),
          ),
        ],
      ),
      GoRoute(
        path: '/auth/login',
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          transitionDuration: Duration.zero,
          reverseTransitionDuration: Duration.zero,
          child: const LoginPage(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return child;
          },
        ),
      ),
      GoRoute(
        path: '/auth/signup',
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          transitionDuration: Duration.zero,
          reverseTransitionDuration: Duration.zero,
          child: const SignUpPage(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return child;
          },
        ),
      ),
      GoRoute(
        path: '/showcase',
        builder: (context, state) => const ShowcaseScreen(),
      ),
      GoRoute(
        path: '/showcase/buttons',
        builder: (context, state) => const ButtonsShowcase(),
      ),
      GoRoute(
        path: '/showcase/forms',
        builder: (context, state) => const FormsShowcase(),
      ),
      GoRoute(
        path: '/showcase/display',
        builder: (context, state) => const DisplayShowcase(),
      ),
      GoRoute(
        path: '/showcase/feedback',
        builder: (context, state) => const FeedbackShowcase(),
      ),
      GoRoute(
        path: '/explore/jobs',
        builder: (context, state) => const _PlaceholderPage(title: 'Jobs & Careers'),
      ),
      GoRoute(
        path: '/explore/education',
        builder: (context, state) => const _PlaceholderPage(title: 'Education & Learning'),
      ),
      GoRoute(
        path: '/explore/health',
        builder: (context, state) => const _PlaceholderPage(title: 'Health'),
      ),
      GoRoute(
        path: '/explore/social',
        builder: (context, state) => const _PlaceholderPage(title: 'Social'),
      ),
      GoRoute(
        path: '/explore/home-services',
        builder: (context, state) => const _PlaceholderPage(title: 'Home Services'),
      ),
      GoRoute(
        path: '/explore/career-tools',
        builder: (context, state) => const _PlaceholderPage(title: 'Career Tools'),
      ),
      GoRoute(
        path: '/explore/interview',
        builder: (context, state) => const _PlaceholderPage(title: 'Interview & Assessment'),
      ),
      GoRoute(
        path: '/explore/ai-assistant',
        builder: (context, state) => const _PlaceholderPage(title: 'AI Assistant'),
      ),
    ],
  );
});

final exploreSearchQueryProvider = StateProvider<String>((ref) => '');

class MainShell extends ConsumerStatefulWidget {
  final Widget child;

  const MainShell({super.key, required this.child});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  final _exploreSearchController = TextEditingController();
  final _exploreFocusNode = FocusNode();

  @override
  void dispose() {
    _exploreSearchController.dispose();
    _exploreFocusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final appBar = _getAppBar(location);

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        extendBody: true,
        body: Column(
          children: [
            if (appBar != null) appBar,
            Expanded(child: widget.child),
          ],
        ),
        bottomNavigationBar: const BottomNav(),
      ),
    );
  }

  PreferredSizeWidget? _getAppBar(String location) {
    if (location.startsWith('/explore')) {
      return ExploreAppBar(
        controller: _exploreSearchController,
        focusNode: _exploreFocusNode,
        onChanged: (v) => ref.read(exploreSearchQueryProvider.notifier).state = v,
      );
    }
    if (location.startsWith('/ai')) return null;
    if (location.startsWith('/messages')) {
      return const MessagesAppBar();
    }
    if (location.startsWith('/profile')) return null;
    return const HomeAppBar();
  }
}

class _PlaceholderPage extends StatelessWidget {
  final String title;

  const _PlaceholderPage({required this.title});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Text(
          '$title\nComing Soon',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
          ),
        ),
      ),
    );
  }
}
