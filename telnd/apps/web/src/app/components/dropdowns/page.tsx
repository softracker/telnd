'use client';

import { useState } from 'react';
import Link from 'next/link';
import '@/app/globals.css';
import '@/../src/_showcase/showcase.css';
import { Header } from '@/components/Header';
import { ShowcaseLeftSidebar } from '@/../src/_showcase/ShowcaseLeftSidebar';
import { ShowcaseRightSidebar } from '@/../src/_showcase/ShowcaseRightSidebar';
import { Button } from '@/components/Button';
import { Dropdown } from '@/components/Dropdown';
import { ContextMenu } from '@/components/ContextMenu';
import { SelectSearch } from '@/components/SelectSearch';
import { FormSelect } from '@/components/FormSelect';

function CopyIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /></svg>);
}
function CutIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 1 1-5.196-3 3 3 0 0 1 5.196 3zm1.536.887a2.165 2.165 0 0 1 1.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 0 1-5.196 3 3 3 0 0 1 5.196-3zm1.536-.887a2.165 2.165 0 0 0 1.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863 2.077-1.199m0-3.328a4.323 4.323 0 0 1 2.068-1.379l5.325-1.628a4.4 4.4 0 0 1 2.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.331 4.331 0 0 0 10.607 12m3.736 0 7.794 4.5-.802.215a4.4 4.4 0 0 1-2.48-.043l-5.326-1.629a4.324 4.324 0 0 1-2.068-1.379M14.343 12l-2.882 1.664" /></svg>);
}
function PasteIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /></svg>);
}
function TrashIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>);
}
function EditIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>);
}
function ShareIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" /></svg>);
}
function StarIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>);
}
function PlusIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>);
}
function ChevronDownIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>);
}
function UserIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>);
}
function GearIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>);
}
function LogoutIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>);
}
function SearchIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>);
}
function CheckIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>);
}
function BellIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>);
}
function FilterIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" /></svg>);
}
function SortIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13-6L16.5 15m0 0L12 10.5m4.5 4.5V3" /></svg>);
}
function ColumnsIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z" /></svg>);
}

export default function DropdownsShowcase() {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastAction, setLastAction] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [formCountry, setFormCountry] = useState('');
  const [formJobType, setFormJobType] = useState('');
  const [formExperience, setFormExperience] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formError, setFormError] = useState('');

  const handleAction = (id: string) => setLastAction(id);

  const editItems = [
    { id: 'cut', label: 'Cut', icon: <CutIcon />, shortcut: '⌘X' },
    { id: 'copy', label: 'Copy', icon: <CopyIcon />, shortcut: '⌘C' },
    { id: 'paste', label: 'Paste', icon: <PasteIcon />, shortcut: '⌘V' },
    { id: 'sep', label: '', separator: true },
    { id: 'select-all', label: 'Select All', shortcut: '⌘A' },
  ];

  const userItems = [
    { id: 'profile', label: 'My Profile', icon: <UserIcon /> },
    { id: 'settings', label: 'Settings', icon: <GearIcon /> },
    { id: 'starred', label: 'Starred Items', icon: <StarIcon /> },
    { id: 'sep', label: '', separator: true },
    { id: 'share', label: 'Share', icon: <ShareIcon /> },
    { id: 'sep2', label: '', separator: true },
    { id: 'logout', label: 'Log Out', icon: <LogoutIcon />, danger: true },
  ];

  const skillOptions = [
    { id: 'react', label: 'React', icon: <span className="text-blue-500">⚛</span> },
    { id: 'typescript', label: 'TypeScript', icon: <span className="text-blue-600">TS</span> },
    { id: 'nodejs', label: 'Node.js', icon: <span className="text-green-600">N</span> },
    { id: 'python', label: 'Python', icon: <span className="text-yellow-500">Py</span> },
    { id: 'flutter', label: 'Flutter', icon: <span className="text-cyan-500">F</span> },
    { id: 'dart', label: 'Dart', icon: <span className="text-cyan-600">D</span> },
    { id: 'postgresql', label: 'PostgreSQL', icon: <span className="text-blue-700">Pg</span> },
    { id: 'redis', label: 'Redis', icon: <span className="text-red-500">R</span> },
    { id: 'docker', label: 'Docker', icon: <span className="text-blue-500">Dk</span> },
    { id: 'aws', label: 'AWS', icon: <span className="text-orange-500">A</span> },
  ];

  const cityOptions = [
    { id: 'dhaka', label: 'Dhaka' },
    { id: 'chittagong', label: 'Chittagong' },
    { id: 'sylhet', label: 'Sylhet' },
    { id: 'rajshahi', label: 'Rajshahi' },
    { id: 'khulna', label: 'Khulna' },
    { id: 'barishal', label: 'Barishal' },
    { id: 'rangpur', label: 'Rangpur' },
    { id: 'mymensingh', label: 'Mymensingh' },
  ];

  const ctxItems = [
    { id: 'cut', label: 'Cut', icon: <CutIcon />, shortcut: '⌘X' },
    { id: 'copy', label: 'Copy', icon: <CopyIcon />, shortcut: '⌘C' },
    { id: 'paste', label: 'Paste', icon: <PasteIcon />, shortcut: '⌘V' },
    { id: 'sep', label: '', separator: true },
    { id: 'edit', label: 'Edit', icon: <EditIcon /> },
    { id: 'share', label: 'Share', icon: <ShareIcon /> },
    { id: 'star', label: 'Star', icon: <StarIcon /> },
    { id: 'sep2', label: '', separator: true },
    { id: 'delete', label: 'Delete', icon: <TrashIcon />, danger: true },
  ];

  return (
    <main className="min-h-screen">
      <Header showSearch searchValue={searchQuery} onSearchChange={setSearchQuery} />
      <div className="showcase-layout">
        <ShowcaseLeftSidebar
          selectedComponent={selectedComponent}
          onSelectComponent={setSelectedComponent}
          onSelectCategory={setSelectedCategory}
          selectedCategory={selectedCategory}
        />

        <div className="showcase-main">
          <div className="showcase-page-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Link href="/components" className="text-accent-500 hover:text-accent-400 text-sm font-medium transition-colors">Components</Link>
              <span className="text-gray-400">/</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Dropdowns & Context Menus</span>
            </div>
            <h1 className="showcase-page-title">Dropdowns & Context Menus</h1>
            <p className="showcase-page-subtitle">Dropdown menus, search selects, and right-click context menus.</p>
          </div>

          {/* 1. Inline Text Dropdown */}
          <Section title="Inline Text Dropdown">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">A dropdown triggered by inline text — great for sentence-level actions.</p>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Click the{' '}
              <Dropdown
                trigger={
                  <span className="inline-flex items-center gap-1 text-accent-500 hover:text-accent-400 font-semibold cursor-pointer border-b border-dashed border-accent-500/40 hover:border-accent-400 transition-colors">
                    skills menu
                    <ChevronDownIcon />
                  </span>
                }
                items={[
                  { id: 'add', label: 'Add Skill', icon: <PlusIcon /> },
                  { id: 'edit', label: 'Edit Skills', icon: <EditIcon /> },
                  { id: 'import', label: 'Import from LinkedIn', icon: <ShareIcon /> },
                ]}
                onSelect={handleAction}
              />{' '}
              to manage your profile. Or use the{' '}
              <Dropdown
                trigger={
                  <span className="inline-flex items-center gap-1 text-orange-500 hover:text-orange-400 font-semibold cursor-pointer border-b border-dashed border-orange-500/40 hover:border-orange-400 transition-colors">
                    quick actions
                    <ChevronDownIcon />
                  </span>
                }
                items={[
                  { id: 'save', label: 'Save Draft', icon: <StarIcon /> },
                  { id: 'publish', label: 'Publish', icon: <CheckIcon /> },
                ]}
                onSelect={handleAction}
              />{' '}
              here.
            </div>
          </Section>

          {/* 2. Basic Dropdowns */}
          <Section title="Basic Dropdowns">
            <Row>
              <Dropdown
                trigger={<Button variant="outline">Edit Menu <ChevronDownIcon /></Button>}
                items={editItems}
                onSelect={handleAction}
              />
              <Dropdown
                trigger={<Button variant="primary" icon={<ChevronDownIcon />} iconPosition="right">Actions</Button>}
                items={[
                  { id: 'view', label: 'View Details', icon: <EditIcon /> },
                  { id: 'save', label: 'Save Job', icon: <StarIcon /> },
                  { id: 'sep', label: '', separator: true },
                  { id: 'report', label: 'Report', icon: <TrashIcon />, danger: true },
                ]}
                onSelect={handleAction}
              />
              <Dropdown
                trigger={<Button variant="ghost">Options <ChevronDownIcon /></Button>}
                items={editItems}
                onSelect={handleAction}
                align="right"
              />
            </Row>
          </Section>

          {/* 3. User Menu */}
          <Section title="User Menu">
            <Row>
              <Dropdown
                trigger={
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-white text-sm font-semibold">P</div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Pranta</span>
                    <ChevronDownIcon />
                  </div>
                }
                items={userItems}
                onSelect={handleAction}
                width={240}
              />
            </Row>
          </Section>

          {/* 4. Searchable Dropdown */}
          <Section title="Searchable Dropdown">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Type to filter items — great for long lists.</p>
            <Row>
              <Dropdown
                trigger={<Button variant="outline" icon={<SearchIcon />}>Select Country</Button>}
                items={[
                  { id: 'bd', label: 'Bangladesh' },
                  { id: 'in', label: 'India' },
                  { id: 'us', label: 'United States' },
                  { id: 'uk', label: 'United Kingdom' },
                  { id: 'ca', label: 'Canada' },
                  { id: 'au', label: 'Australia' },
                  { id: 'sg', label: 'Singapore' },
                  { id: 'ae', label: 'UAE' },
                  { id: 'sa', label: 'Saudi Arabia' },
                  { id: 'my', label: 'Malaysia' },
                ]}
                onSelect={handleAction}
                searchable
                searchPlaceholder="Search countries..."
                width={260}
              />
              <Dropdown
                trigger={<Button variant="outline" icon={<FilterIcon />}>Filter Status</Button>}
                items={[
                  { id: 'all', label: 'All Status' },
                  { id: 'active', label: 'Active', icon: <span className="w-2 h-2 rounded-full bg-green-500" /> },
                  { id: 'pending', label: 'Pending', icon: <span className="w-2 h-2 rounded-full bg-yellow-500" /> },
                  { id: 'closed', label: 'Closed', icon: <span className="w-2 h-2 rounded-full bg-red-500" /> },
                ]}
                onSelect={handleAction}
                searchable
                width={220}
              />
            </Row>
          </Section>

          {/* 5. Multi-Select Search */}
          <Section title="Multi-Select with Search">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Select multiple items with search — perfect for skills, tags, locations.</p>
            <div className="flex flex-wrap gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Skills</label>
                <SelectSearch
                  options={skillOptions}
                  value={selectedSkills}
                  onChange={setSelectedSkills}
                  placeholder="Select skills..."
                  searchPlaceholder="Search skills..."
                  width={320}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Cities (max 3)</label>
                <SelectSearch
                  options={cityOptions}
                  value={selectedCities}
                  onChange={setSelectedCities}
                  placeholder="Select cities..."
                  maxSelected={3}
                  width={320}
                />
              </div>
            </div>
          </Section>

          {/* 6. Icon-Only Dropdown */}
          <Section title="Icon-Only Dropdown">
            <Row>
              <Dropdown
                trigger={
                  <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors">
                    <BellIcon />
                  </button>
                }
                items={[
                  { id: 'notif1', label: 'New job match found', icon: <span className="w-2 h-2 rounded-full bg-accent-500" /> },
                  { id: 'notif2', label: 'Application viewed', icon: <span className="w-2 h-2 rounded-full bg-blue-500" /> },
                  { id: 'notif3', label: 'Interview scheduled', icon: <span className="w-2 h-2 rounded-full bg-orange-400" /> },
                  { id: 'sep', label: '', separator: true },
                  { id: 'mark-read', label: 'Mark all as read' },
                ]}
                onSelect={handleAction}
                width={280}
              />
              <Dropdown
                trigger={
                  <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors">
                    <SortIcon />
                  </button>
                }
                items={[
                  { id: 'newest', label: 'Newest first' },
                  { id: 'oldest', label: 'Oldest first' },
                  { id: 'salary-high', label: 'Salary: High to Low' },
                  { id: 'salary-low', label: 'Salary: Low to High' },
                  { id: 'relevance', label: 'Relevance' },
                ]}
                onSelect={handleAction}
                width={220}
              />
              <Dropdown
                trigger={
                  <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors">
                    <ColumnsIcon />
                  </button>
                }
                items={[
                  { id: 'grid', label: 'Grid View' },
                  { id: 'list', label: 'List View' },
                  { id: 'compact', label: 'Compact View' },
                ]}
                onSelect={handleAction}
                width={180}
              />
            </Row>
          </Section>

          {/* 7. With Disabled Items */}
          <Section title="With Disabled Items">
            <Row>
              <Dropdown
                trigger={<Button variant="outline">Actions <ChevronDownIcon /></Button>}
                items={[
                  { id: 'edit', label: 'Edit', icon: <EditIcon /> },
                  { id: 'share', label: 'Share', icon: <ShareIcon /> },
                  { id: 'sep', label: '', separator: true },
                  { id: 'delete', label: 'Delete (Admin only)', icon: <TrashIcon />, disabled: true },
                ]}
                onSelect={handleAction}
              />
            </Row>
          </Section>

          {/* 8. Form Select */}
          <Section title="Form Select">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Form-ready dropdowns with labels, validation, and helper text.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormSelect
                label="Country"
                placeholder="Select your country"
                required
                options={[
                  { id: 'bd', label: 'Bangladesh' },
                  { id: 'in', label: 'India' },
                  { id: 'us', label: 'United States' },
                  { id: 'uk', label: 'United Kingdom' },
                  { id: 'ca', label: 'Canada' },
                  { id: 'au', label: 'Australia' },
                  { id: 'sg', label: 'Singapore' },
                  { id: 'ae', label: 'UAE' },
                ]}
                value={formCountry}
                onChange={setFormCountry}
                helperText="Where you are currently located"
              />
              <FormSelect
                label="Job Type"
                placeholder="Select job type"
                options={[
                  { id: 'full-time', label: 'Full-time' },
                  { id: 'part-time', label: 'Part-time' },
                  { id: 'contract', label: 'Contract' },
                  { id: 'freelance', label: 'Freelance' },
                  { id: 'internship', label: 'Internship' },
                ]}
                value={formJobType}
                onChange={setFormJobType}
              />
              <FormSelect
                label="Experience"
                placeholder="Select experience level"
                searchable
                options={[
                  { id: 'entry', label: 'Entry Level (0-1 years)' },
                  { id: 'junior', label: 'Junior (1-3 years)' },
                  { id: 'mid', label: 'Mid Level (3-5 years)' },
                  { id: 'senior', label: 'Senior (5-8 years)' },
                  { id: 'lead', label: 'Lead (8+ years)' },
                ]}
                value={formExperience}
                onChange={setFormExperience}
                helperText="Helps match you with relevant jobs"
              />
              <FormSelect
                label="Category"
                placeholder="Select category"
                options={[
                  { id: 'tech', label: 'Technology', icon: <span className="text-blue-500">💻</span> },
                  { id: 'design', label: 'Design', icon: <span className="text-purple-500">🎨</span> },
                  { id: 'marketing', label: 'Marketing', icon: <span className="text-green-500">📈</span> },
                  { id: 'finance', label: 'Finance', icon: <span className="text-yellow-500">💰</span> },
                  { id: 'education', label: 'Education', icon: <span className="text-red-500">📚</span> },
                ]}
                value={formCategory}
                onChange={setFormCategory}
              />
              <FormSelect
                label="With Error"
                placeholder="This field has an error"
                options={[
                  { id: 'a', label: 'Option A' },
                  { id: 'b', label: 'Option B' },
                ]}
                value=""
                onChange={() => {}}
                error="This field is required"
              />
              <FormSelect
                label="Disabled"
                placeholder="Cannot select"
                options={[
                  { id: 'a', label: 'Option A' },
                ]}
                value=""
                onChange={() => {}}
                disabled
              />
              <FormSelect
                label="Small Size"
                placeholder="Small"
                size="sm"
                options={[
                  { id: 'a', label: 'Option A' },
                  { id: 'b', label: 'Option B' },
                ]}
                value=""
                onChange={() => {}}
              />
              <FormSelect
                label="Large Size"
                placeholder="Large"
                size="lg"
                options={[
                  { id: 'a', label: 'Option A' },
                  { id: 'b', label: 'Option B' },
                ]}
                value=""
                onChange={() => {}}
              />
            </div>
          </Section>

          {/* 9. Context Menu */}
          <Section title="Context Menu">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Right-click on the box below.</p>
            <ContextMenu items={ctxItems} onSelect={handleAction}>
              <div className="h-40 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm cursor-pointer hover:border-accent-400 hover:text-accent-500 transition-colors">
                Right-click here
              </div>
            </ContextMenu>
          </Section>

          {/* 10. Context Menu on Card */}
          <Section title="Context Menu on Card">
            <ContextMenu items={ctxItems} onSelect={handleAction}>
              <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Senior React Developer</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">TechCorp Inc. — Dhaka, Bangladesh</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent-500/10 text-accent-600 dark:text-accent-400">Full-time</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-400/10 text-orange-600 dark:text-orange-400">৳80K–৳120K</span>
                    </div>
                  </div>
                </div>
              </div>
            </ContextMenu>
          </Section>
        </div>

        <ShowcaseRightSidebar selectedComponent={selectedComponent} />
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Row({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {children}
    </div>
  );
}
