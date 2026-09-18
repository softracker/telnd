import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ShowcaseScreen extends StatelessWidget {
  const ShowcaseScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final categories = [
      _Category('Buttons', Icons.smart_button, '/showcase/buttons'),
      _Category('Forms', Icons.edit_note, '/showcase/forms'),
      _Category('Display', Icons.dashboard, '/showcase/display'),
      _Category('Feedback', Icons.notifications_active, '/showcase/feedback'),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Component Showcase'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/profile'),
        ),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final cat = categories[index];
          return Card(
            child: ListTile(
              leading: Icon(cat.icon, color: Theme.of(context).colorScheme.primary),
              title: Text(cat.label),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push(cat.route),
            ),
          );
        },
      ),
    );
  }
}

class _Category {
  final String label;
  final IconData icon;
  final String route;

  const _Category(this.label, this.icon, this.route);
}
