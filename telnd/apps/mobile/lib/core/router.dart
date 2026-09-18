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
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/auth/signup',
        builder: (context, state) => const SignUpPage(),
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
    ],
  );
});

class MainShell extends StatelessWidget {
  final Widget child;

  const MainShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final appBar = _getAppBar(location);

    return Scaffold(
      extendBody: true,
      appBar: appBar,
      body: child,
      bottomNavigationBar: const BottomNav(),
    );
  }

  PreferredSizeWidget? _getAppBar(String location) {
    if (location.startsWith('/explore')) return null;
    if (location.startsWith('/ai')) return null;
    if (location.startsWith('/messages')) return null;
    if (location.startsWith('/profile')) return null;
    return const HomeAppBar();
  }
}
