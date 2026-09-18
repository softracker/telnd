'use client';

import { useState } from 'react';
import Link from 'next/link';
import '@/app/globals.css';
import '@/../src/_showcase/showcase.css';
import { Header } from '@/components/Header';
import { ShowcaseLeftSidebar } from '@/../src/_showcase/ShowcaseLeftSidebar';
import { ShowcaseRightSidebar } from '@/../src/_showcase/ShowcaseRightSidebar';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { ButtonGroup } from '@/components/ButtonGroup';
import { FAB } from '@/components/FAB';

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

export default function ButtonsShowcase() {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const simulateLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

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
              <Link href="/components" className="text-accent-500 hover:text-accent-400 text-sm font-medium transition-colors">
                Components
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Buttons</span>
            </div>
            <h1 className="showcase-page-title">Buttons</h1>
            <p className="showcase-page-subtitle">All button variants, sizes, and states for the TELND platform.</p>
          </div>

          {/* Variants */}
          <Section title="Variants">
            <Row>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="accent">Accent</Button>
              <Button variant="orange">Orange</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="link">Link</Button>
            </Row>
          </Section>

          {/* Sizes */}
          <Section title="Sizes">
            <Row>
              <Button size="xs">Extra Small</Button>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </Row>
          </Section>

          {/* With Icons */}
          <Section title="With Icons">
            <Row>
              <Button variant="primary" icon={<PlusIcon />}>Add Job</Button>
              <Button variant="accent" icon={<HeartIcon />}>Save</Button>
              <Button variant="orange" icon={<DownloadIcon />} iconPosition="right">Download</Button>
              <Button variant="danger" icon={<TrashIcon />}>Delete</Button>
              <Button variant="outline" icon={<SearchIcon />}>Search</Button>
              <Button variant="primary" icon={<CheckIcon />}>Apply</Button>
            </Row>
          </Section>

          {/* Icon Only */}
          <Section title="Icon Only">
            <Row>
              <IconButton variant="primary" tooltip="Add"><PlusIcon /></IconButton>
              <IconButton variant="accent" tooltip="Save"><HeartIcon /></IconButton>
              <IconButton variant="orange" tooltip="Download"><DownloadIcon /></IconButton>
              <IconButton variant="danger" tooltip="Delete"><TrashIcon /></IconButton>
              <IconButton variant="outline" tooltip="Search"><SearchIcon /></IconButton>
              <IconButton variant="ghost" tooltip="More"><PlusIcon /></IconButton>
            </Row>
          </Section>

          {/* Icon Button Sizes */}
          <Section title="Icon Button Sizes">
            <Row>
              <IconButton size="xs" tooltip="XS"><PlusIcon /></IconButton>
              <IconButton size="sm" tooltip="SM"><PlusIcon /></IconButton>
              <IconButton size="md" tooltip="MD"><PlusIcon /></IconButton>
              <IconButton size="lg" tooltip="LG"><PlusIcon /></IconButton>
            </Row>
          </Section>

          {/* Button Group */}
          <Section title="Button Group">
            <Row>
              <ButtonGroup>
                <Button variant="outline">Left</Button>
                <Button variant="outline">Center</Button>
                <Button variant="outline">Right</Button>
              </ButtonGroup>
            </Row>
            <Row className="mt-3">
              <ButtonGroup attached>
                <Button variant="primary">One</Button>
                <Button variant="primary">Two</Button>
                <Button variant="primary">Three</Button>
              </ButtonGroup>
            </Row>
          </Section>

          {/* States */}
          <Section title="States">
            <Row>
              <Button variant="primary">Normal</Button>
              <Button variant="primary" loading>Loading</Button>
              <Button variant="primary" disabled>Disabled</Button>
              <Button variant="accent" loading>Processing</Button>
              <Button variant="danger" disabled>Disabled</Button>
            </Row>
            <Row className="mt-3">
              <Button variant="primary" loading={loading} onClick={simulateLoading}>
                {loading ? 'Saving...' : 'Click to Load'}
              </Button>
            </Row>
          </Section>

          {/* Full Width */}
          <Section title="Full Width">
            <Button variant="primary" fullWidth>Full Width Primary</Button>
            <div className="mt-2">
              <Button variant="accent" fullWidth>Full Width Accent</Button>
            </div>
            <div className="mt-2">
              <Button variant="outline" fullWidth>Full Width Outline</Button>
            </div>
          </Section>

          {/* Dark Mode */}
          <Section title="Dark Mode">
            <div className="p-6 rounded-xl bg-gray-900 dark:bg-gray-950 space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider font-semibold">All Variants</p>
                <Row>
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="accent">Accent</Button>
                  <Button variant="orange">Orange</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="link">Link</Button>
                </Row>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider font-semibold">With Icons</p>
                <Row>
                  <Button variant="primary" icon={<PlusIcon />}>Add Job</Button>
                  <Button variant="accent" icon={<HeartIcon />}>Save</Button>
                  <Button variant="orange" icon={<DownloadIcon />} iconPosition="right">Download</Button>
                  <Button variant="danger" icon={<TrashIcon />}>Delete</Button>
                </Row>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider font-semibold">Icon Buttons</p>
                <Row>
                  <IconButton variant="primary" tooltip="Add"><PlusIcon /></IconButton>
                  <IconButton variant="accent" tooltip="Save"><HeartIcon /></IconButton>
                  <IconButton variant="orange" tooltip="Download"><DownloadIcon /></IconButton>
                  <IconButton variant="danger" tooltip="Delete"><TrashIcon /></IconButton>
                  <IconButton variant="outline" tooltip="Search"><SearchIcon /></IconButton>
                  <IconButton variant="ghost" tooltip="More"><PlusIcon /></IconButton>
                </Row>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider font-semibold">States</p>
                <Row>
                  <Button variant="primary">Normal</Button>
                  <Button variant="primary" loading>Loading</Button>
                  <Button variant="primary" disabled>Disabled</Button>
                </Row>
              </div>
            </div>
          </Section>

          {/* Use Cases */}
          <Section title="Use Cases">
            <Row>
              <Button variant="primary" icon={<ArrowRightIcon />} iconPosition="right">Find Jobs</Button>
              <Button variant="accent">Get Started</Button>
              <Button variant="outline">Learn More</Button>
              <Button variant="ghost">Skip</Button>
              <Button variant="danger" icon={<TrashIcon />}>Remove</Button>
            </Row>
          </Section>
        </div>

        <ShowcaseRightSidebar selectedComponent={selectedComponent} />
      </div>

      {/* Demo FABs */}
      <FAB variant="primary" position="bottom-right" tooltip="Add new">
        <PlusIcon />
      </FAB>
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
