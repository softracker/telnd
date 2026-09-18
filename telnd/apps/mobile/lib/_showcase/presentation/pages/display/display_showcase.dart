import 'dart:io';
import 'package:flutter/material.dart';
import 'package:telnd_mobile/shared/presentation/widgets/components/app_dropdown.dart';
import 'package:telnd_mobile/shared/presentation/widgets/components/app_form_select.dart';
import 'package:telnd_mobile/shared/presentation/widgets/components/app_search_dropdown.dart';
import 'package:telnd_mobile/shared/presentation/widgets/components/app_checkbox_dropdown.dart';
import 'package:telnd_mobile/shared/presentation/widgets/components/app_image_option_dropdown.dart';
import 'package:telnd_mobile/shared/presentation/widgets/components/app_file_upload.dart';
import 'package:telnd_mobile/shared/presentation/widgets/components/app_actions_dropdown.dart';

class DisplayShowcase extends StatefulWidget {
  const DisplayShowcase({super.key});

  @override
  State<DisplayShowcase> createState() => _DisplayShowcaseState();
}

class _DisplayShowcaseState extends State<DisplayShowcase> {
  FormSelectItem? _selectedItem;
  FormSelectItem? _selectedCategory;
  SearchDropdownItem? _selectedSearch;
  List<String> _selectedSkillLabels = [];
  ImageOptionItem? _selectedCountry;
  List<File> _uploadedFiles = [];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dropdowns & Selects')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _section('Actions Dropdown', [
            AppActionsDropdown(
              items: const [
                ActionItem(label: 'Edit', icon: Icons.edit_outlined, shortcut: '⌘E'),
                ActionItem(label: 'Duplicate', icon: Icons.copy_outlined),
                ActionItem(label: 'Share', icon: Icons.share_outlined),
                ActionItem(label: 'Archive', icon: Icons.archive_outlined),
                ActionItem(label: 'Delete', icon: Icons.delete_outline, danger: true, shortcut: '⌘⌫'),
              ],
              onSelected: (i) {},
              child: Card(
                child: ListTile(
                  leading: const CircleAvatar(child: Text('JD')),
                  title: const Text('John Doe'),
                  subtitle: const Text('Software Engineer'),
                  trailing: const Icon(Icons.more_vert),
                ),
              ),
            ),
          ]),
          _section('Dropdown (Long press)', [
            AppDropdown(
              items: const [
                DropdownItem(label: 'Edit', icon: Icons.edit_outlined),
                DropdownItem(label: 'Duplicate', icon: Icons.copy_outlined),
                DropdownItem(label: 'Share', icon: Icons.share_outlined),
                DropdownItem(label: 'Archive', icon: Icons.archive_outlined),
                DropdownItem(label: 'Delete', icon: Icons.delete_outline, danger: true),
              ],
              onSelected: (i) {},
              child: Card(
                child: ListTile(
                  leading: const CircleAvatar(child: Text('AB')),
                  title: const Text('Alice Brown'),
                  subtitle: const Text('Product Manager'),
                  trailing: const Icon(Icons.more_vert),
                ),
              ),
            ),
          ]),
          _section('Form Select', [
            AppFormSelect(
              label: 'Job Type',
              hint: 'Select job type',
              value: _selectedItem,
              items: const [
                FormSelectItem(label: 'Full-time', description: '40 hours/week'),
                FormSelectItem(label: 'Part-time', description: '20 hours/week'),
                FormSelectItem(label: 'Contract', description: 'Project-based'),
                FormSelectItem(label: 'Internship', description: 'Learning opportunity'),
              ],
              onChanged: (item) => setState(() => _selectedItem = item),
            ),
            const SizedBox(height: 16),
            AppFormSelect(
              label: 'Category',
              hint: 'Select category',
              required: true,
              value: _selectedCategory,
              items: const [
                FormSelectItem(label: 'Technology'),
                FormSelectItem(label: 'Healthcare'),
                FormSelectItem(label: 'Finance'),
                FormSelectItem(label: 'Education'),
              ],
              onChanged: (item) => setState(() => _selectedCategory = item),
            ),
          ]),
          _section('Search Dropdown', [
            AppSearchDropdown(
              label: 'Country',
              hint: 'Search country...',
              value: _selectedSearch,
              items: const [
                SearchDropdownItem(label: 'Bangladesh', description: 'BD', icon: Icons.flag),
                SearchDropdownItem(label: 'India', description: 'IN', icon: Icons.flag),
                SearchDropdownItem(label: 'United States', description: 'US', icon: Icons.flag),
                SearchDropdownItem(label: 'United Kingdom', description: 'UK', icon: Icons.flag),
                SearchDropdownItem(label: 'Canada', description: 'CA', icon: Icons.flag),
                SearchDropdownItem(label: 'Australia', description: 'AU', icon: Icons.flag),
                SearchDropdownItem(label: 'Germany', description: 'DE', icon: Icons.flag),
                SearchDropdownItem(label: 'France', description: 'FR', icon: Icons.flag),
                SearchDropdownItem(label: 'Japan', description: 'JP', icon: Icons.flag),
                SearchDropdownItem(label: 'Singapore', description: 'SG', icon: Icons.flag),
              ],
              onChanged: (item) => setState(() => _selectedSearch = item),
            ),
          ]),
          _section('Checkbox Dropdown', [
            AppCheckboxDropdown(
              label: 'Skills',
              hint: 'Select skills',
              title: 'Select Skills',
              allItems: const [
                CheckboxDropdownItem(label: 'Flutter', description: 'Mobile development'),
                CheckboxDropdownItem(label: 'React', description: 'Web development'),
                CheckboxDropdownItem(label: 'Node.js', description: 'Backend development'),
                CheckboxDropdownItem(label: 'Python', description: 'Data science & AI'),
                CheckboxDropdownItem(label: 'Docker', description: 'DevOps'),
                CheckboxDropdownItem(label: 'AWS', description: 'Cloud services'),
              ],
              selectedLabels: _selectedSkillLabels,
              onChanged: (labels) => setState(() => _selectedSkillLabels = labels),
            ),
          ]),
          _section('Image + Option Dropdown', [
            AppImageOptionDropdown(
              label: 'Country',
              hint: 'Select country',
              value: _selectedCountry,
              title: 'Select Country',
              items: const [
                ImageOptionItem(
                  label: 'Bangladesh',
                  description: 'BD',
                  icon: Icons.flag,
                ),
                ImageOptionItem(
                  label: 'India',
                  description: 'IN',
                  icon: Icons.flag,
                ),
                ImageOptionItem(
                  label: 'United States',
                  description: 'US',
                  icon: Icons.flag,
                ),
                ImageOptionItem(
                  label: 'United Kingdom',
                  description: 'UK',
                  icon: Icons.flag,
                ),
              ],
              onChanged: (item) => setState(() => _selectedCountry = item),
            ),
          ]),
          _section('File Upload', [
            AppFileUpload(
              label: 'Upload Documents',
              files: _uploadedFiles,
              onChanged: (files) => setState(() => _uploadedFiles = files),
              maxFiles: 5,
              maxSizeMB: 10,
            ),
          ]),
          const SizedBox(height: 32),
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
