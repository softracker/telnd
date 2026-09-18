'use client';

import { useState } from 'react';
import Link from 'next/link';
import '@/app/globals.css';
import '@/../src/_showcase/showcase.css';
import { Header } from '@/components/Header';
import { ShowcaseLeftSidebar } from '@/../src/_showcase/ShowcaseLeftSidebar';
import { ShowcaseRightSidebar } from '@/../src/_showcase/ShowcaseRightSidebar';
import { Input } from '@/components/Input';
import { Textarea } from '@/components/Textarea';
import { Checkbox } from '@/components/Checkbox';
import { Radio } from '@/components/Radio';
import { Switch } from '@/components/Switch';
import { SearchBar } from '@/components/SearchBar';
import { FileUpload } from '@/components/FileUpload';
import { DatePicker } from '@/components/DatePicker';
import { Autocomplete } from '@/components/Autocomplete';
import { Slider } from '@/components/Slider';
import { FormSelect } from '@/components/FormSelect';

function MailIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>);
}
function LockIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>);
}
function SearchIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>);
}
function UserIcon() {
  return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>);
}

export default function FormsShowcase() {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [check1, setCheck1] = useState(true);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);
  const [radio1, setRadio1] = useState('option1');
  const [switch1, setSwitch1] = useState(true);
  const [switch2, setSwitch2] = useState(false);
  const [switch3, setSwitch3] = useState(false);
  const [slider1, setSlider1] = useState(50);
  const [slider2, setSlider2] = useState(30);
  const [slider3, setSlider3] = useState(60);
  const [date1, setDate1] = useState('');
  const [select1, setSelect1] = useState('');

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
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Forms & Inputs</span>
            </div>
            <h1 className="showcase-page-title">Forms & Inputs</h1>
            <p className="showcase-page-subtitle">All form controls for the TELND platform — text fields, selects, checkboxes, file uploads, and more.</p>
          </div>

          {/* Input */}
          <Section title="Input">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Email" placeholder="you@example.com" leftIcon={<MailIcon />} required />
              <Input label="Password" type="password" placeholder="••••••••" leftIcon={<LockIcon />} required />
              <Input label="With Helper" placeholder="Enter your username" helperText="This will be your public display name" />
              <Input label="With Error" placeholder="Enter value" error="This field is required" />
              <Input label="Disabled" placeholder="Cannot edit" disabled />
              <Input label="Small" placeholder="Small input" size="sm" />
              <Input label="Large" placeholder="Large input" size="lg" />
              <Input label="Search" placeholder="Search..." leftIcon={<SearchIcon />} />
            </div>
          </Section>

          {/* Textarea */}
          <Section title="Textarea">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Textarea label="About You" placeholder="Tell us about yourself..." helperText="Max 500 characters" />
              <Textarea label="With Count" placeholder="Write a bio..." maxLength={200} showCount />
              <Textarea label="Auto Resize" placeholder="This textarea grows as you type..." autoResize />
              <Textarea label="Error State" placeholder="Required field" error="Please fill in this field" />
            </div>
          </Section>

          {/* Checkbox */}
          <Section title="Checkbox">
            <div className="space-y-3">
              <Checkbox label="I agree to the Terms & Conditions" checked={check1} onChange={(e) => setCheck1(e.target.checked)} />
              <Checkbox label="Subscribe to newsletter" description="Get notified about new jobs" checked={check2} onChange={(e) => setCheck2(e.target.checked)} />
              <Checkbox label="Disabled option" disabled />
              <div className="flex gap-6">
                <Checkbox label="React" size="sm" defaultChecked />
                <Checkbox label="TypeScript" size="md" defaultChecked />
                <Checkbox label="Node.js" size="lg" />
              </div>
            </div>
          </Section>

          {/* Radio */}
          <Section title="Radio">
            <div className="space-y-3">
              <Radio name="plan" label="Free Plan" description="Basic features, limited access" value="free" checked={radio1 === 'free'} onChange={() => setRadio1('free')} />
              <Radio name="plan" label="Pro Plan" description="All features, unlimited access — ৳500/mo" value="pro" checked={radio1 === 'pro'} onChange={() => setRadio1('pro')} />
              <Radio name="plan" label="Enterprise" description="Custom pricing, dedicated support" value="enterprise" checked={radio1 === 'enterprise'} onChange={() => setRadio1('enterprise')} />
              <Radio name="plan" label="Disabled" disabled />
              <div className="flex gap-6">
                <Radio name="size" label="Small" size="sm" />
                <Radio name="size" label="Medium" size="md" />
                <Radio name="size" label="Large" size="lg" />
              </div>
            </div>
          </Section>

          {/* Switch */}
          <Section title="Switch">
            <div className="space-y-3">
              <Switch label="Email Notifications" description="Receive job alerts via email" checked={switch1} onChange={setSwitch1} />
              <Switch label="Dark Mode" checked={switch2} onChange={setSwitch2} />
              <Switch label="Disabled" disabled checked={false} onChange={() => {}} />
              <div className="flex gap-6">
                <Switch label="SM" size="sm" checked={false} onChange={() => {}} />
                <Switch label="MD" size="md" checked={false} onChange={() => {}} />
                <Switch label="LG" size="lg" checked={false} onChange={() => {}} />
              </div>
            </div>
          </Section>

          {/* FormSelect */}
          <Section title="Form Select">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormSelect
                label="Job Type"
                placeholder="Select type"
                options={[
                  { id: 'full-time', label: 'Full-time' },
                  { id: 'part-time', label: 'Part-time' },
                  { id: 'contract', label: 'Contract' },
                  { id: 'freelance', label: 'Freelance' },
                ]}
                value={select1}
                onChange={setSelect1}
              />
              <FormSelect
                label="Experience"
                placeholder="Select level"
                searchable
                options={[
                  { id: 'entry', label: 'Entry Level (0-1 years)' },
                  { id: 'junior', label: 'Junior (1-3 years)' },
                  { id: 'mid', label: 'Mid Level (3-5 years)' },
                  { id: 'senior', label: 'Senior (5+ years)' },
                ]}
                value=""
                onChange={() => {}}
              />
            </div>
          </Section>

          {/* SearchBar */}
          <Section title="SearchBar">
            <div className="space-y-4">
              <SearchBar
                placeholder="Search jobs, companies, skills..."
                suggestions={['React Developer', 'Python Engineer', 'UI/UX Designer', 'Product Manager', 'Data Analyst']}
                recentSearches={['frontend jobs dhaka', 'remote react', 'startup']}
                onSearch={(v) => console.log('search:', v)}
              />
            </div>
          </Section>

          {/* Autocomplete */}
          <Section title="Autocomplete">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Autocomplete
                label="Country"
                placeholder="Search country..."
                options={[
                  { id: 'bd', label: 'Bangladesh', category: 'Asia' },
                  { id: 'in', label: 'India', category: 'Asia' },
                  { id: 'us', label: 'United States', category: 'Americas' },
                  { id: 'uk', label: 'United Kingdom', category: 'Europe' },
                  { id: 'ca', label: 'Canada', category: 'Americas' },
                  { id: 'au', label: 'Australia', category: 'Oceania' },
                  { id: 'sg', label: 'Singapore', category: 'Asia' },
                  { id: 'de', label: 'Germany', category: 'Europe' },
                ]}
              />
              <Autocomplete
                label="Skill"
                placeholder="Search skills..."
                options={[
                  { id: 'react', label: 'React' },
                  { id: 'typescript', label: 'TypeScript' },
                  { id: 'python', label: 'Python' },
                  { id: 'flutter', label: 'Flutter' },
                  { id: 'nodejs', label: 'Node.js' },
                  { id: 'dart', label: 'Dart' },
                ]}
              />
            </div>
          </Section>

          {/* DatePicker */}
          <Section title="DatePicker">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DatePicker label="Joining Date" value={date1} onChange={setDate1} required />
              <DatePicker label="Date of Birth" placeholder="Select birth date" />
              <DatePicker label="Disabled" disabled />
            </div>
          </Section>

          {/* FileUpload */}
          <Section title="FileUpload">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FileUpload label="Upload Resume" accept=".pdf,.doc,.docx" helperText="PDF or Word document, max 5MB" />
              <FileUpload label="Upload Photo" accept="image/*" multiple helperText="JPG, PNG or GIF" />
              <FileUpload label="Error Example" error="File size exceeds limit" />
              <FileUpload label="Disabled" disabled />
            </div>
          </Section>

          {/* Slider */}
          <Section title="Slider">
            <div className="space-y-8 max-w-md">
              <Slider label="Salary Range" value={slider1} onChange={setSlider1} min={10} max={200} showMarks />
              <Slider label="Experience (years)" value={slider2} onChange={setSlider2} min={0} max={20} step={1} />
              <Slider label="Match Score" value={slider3} onChange={setSlider3} min={0} max={100} />
              <Slider label="Disabled" value={50} onChange={() => {}} disabled />
            </div>
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
