'use client';

import { useState } from 'react';
import Link from 'next/link';
import '@/app/globals.css';
import '@/../src/_showcase/showcase.css';
import { Header } from '@/components/Header';
import { ShowcaseLeftSidebar } from '@/../src/_showcase/ShowcaseLeftSidebar';
import { ShowcaseRightSidebar } from '@/../src/_showcase/ShowcaseRightSidebar';
import {
  componentCategories,
  totalComponents,
  totalCategories,
  readyComponents,
  pendingComponents,
} from '@/../src/_showcase/componentList';

const componentRoutes: Record<string, string> = {
  'button': '/components/buttons',
  'icon-button': '/components/buttons',
  'button-group': '/components/buttons',
  'fab': '/components/buttons',
  'dropdown': '/components/dropdowns',
  'context-menu': '/components/dropdowns',
  'select': '/components/dropdowns',
  'input': '/components/forms',
  'textarea': '/components/forms',
  'checkbox': '/components/forms',
  'radio': '/components/forms',
  'switch': '/components/forms',
  'search-bar': '/components/forms',
  'file-upload': '/components/forms',
  'date-picker': '/components/forms',
  'autocomplete': '/components/forms',
  'slider': '/components/forms',
  'form-field': '/components/forms',
  'form-select': '/components/forms',
};

export default function ComponentsPage() {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectCategory = (id: string) => {
    setSelectedCategory((prev) => (prev === id ? null : id));
    setSelectedComponent(null);
  };

  const handleSelectComponent = (id: string) => {
    setSelectedComponent(id);
  };

  const filteredCategories = componentCategories
    .map((cat) => ({
      ...cat,
      components: cat.components.filter(
        (comp) =>
          comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          comp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cat.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((cat) => cat.components.length > 0);

  const displayCategories = selectedCategory
    ? filteredCategories.filter((c) => c.id === selectedCategory)
    : filteredCategories;

  return (
    <main className="min-h-screen">
      <Header showSearch searchValue={searchQuery} onSearchChange={setSearchQuery} />
      <div className="showcase-layout rounded-t-3xl mt-0">
        <ShowcaseLeftSidebar
          selectedComponent={selectedComponent}
          onSelectComponent={handleSelectComponent}
          onSelectCategory={handleSelectCategory}
          selectedCategory={selectedCategory}
        />

        <div className="showcase-main">
          <div className="showcase-page-header">
            <h1 className="showcase-page-title">
              Component Showcase
              <span style={{ fontSize: '10px', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '10px', fontWeight: 600, marginLeft: '8px', verticalAlign: 'middle' }}>
                TEMPORARY
              </span>
            </h1>
            <p className="showcase-page-subtitle">
              {readyComponents} ready, {pendingComponents} pending — {totalComponents} total across {totalCategories} categories.
            </p>
          </div>

          <div className="showcase-stats-bar">
            <div className="showcase-stat">
              <span className="showcase-stat-value">{totalCategories}</span>
              <span className="showcase-stat-label">Categories</span>
            </div>
            <div className="showcase-stat">
              <span className="showcase-stat-value">{totalComponents}</span>
              <span className="showcase-stat-label">Total</span>
            </div>
            <div className="showcase-stat">
              <span className="showcase-stat-value" style={{ color: '#16a34a' }}>{readyComponents}</span>
              <span className="showcase-stat-label">Ready</span>
            </div>
            <div className="showcase-stat">
              <span className="showcase-stat-value" style={{ color: '#ea580c' }}>{pendingComponents}</span>
              <span className="showcase-stat-label">Pending</span>
            </div>
            <div className="showcase-stat">
              <span className="showcase-stat-value" style={{ color: '#30A9A2' }}>
                {Math.round((readyComponents / totalComponents) * 100)}%
              </span>
              <span className="showcase-stat-label">Progress</span>
            </div>
          </div>

          {/* Design System — Brand Colors */}
          <div style={{ marginBottom: '24px' }}>
            <div className="showcase-section-heading">🎨 Design System — Brand Colors</div>
            <p className="showcase-section-desc">
              Official TELND color palette. Use these colors consistently across all components.
            </p>

            {/* Primary Colors */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Primary Colors
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {[
                  { name: 'Primary', hex: '#034548', desc: 'Dark Teal — Main brand, headers, buttons', textColor: '#fff' },
                  { name: 'Secondary', hex: '#0B1B2F', desc: 'Dark Navy — Dark backgrounds, footer', textColor: '#fff' },
                ].map((color) => (
                  <div key={color.hex} style={{ flex: '1 1 280px' }}>
                    <div style={{
                      background: color.hex,
                      color: color.textColor,
                      borderRadius: '10px',
                      padding: '16px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{color.name}</div>
                        <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>{color.desc}</div>
                      </div>
                      <code style={{ fontSize: '12px', background: 'rgba(255,255,255,0.15)', padding: '3px 8px', borderRadius: '4px' }}>
                        {color.hex}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Accent Colors */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Accent Colors
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {[
                  { name: 'Accent 1 (Teal)', hex: '#30A9A2', desc: 'Links, highlights, CTAs, active states', textColor: '#fff' },
                  { name: 'Accent 2 (Orange)', hex: '#FE793F', desc: 'Warnings, badges, premium, attention', textColor: '#fff' },
                ].map((color) => (
                  <div key={color.hex} style={{ flex: '1 1 280px' }}>
                    <div style={{
                      background: color.hex,
                      color: color.textColor,
                      borderRadius: '10px',
                      padding: '16px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{color.name}</div>
                        <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>{color.desc}</div>
                      </div>
                      <code style={{ fontSize: '12px', background: 'rgba(255,255,255,0.15)', padding: '3px 8px', borderRadius: '4px' }}>
                        {color.hex}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Neutral Colors */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Neutral Colors
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {[
                  { name: 'Background', hex: '#F9F6F0', desc: 'Page background (warm off-white)', textColor: '#1F2937' },
                  { name: 'Light', hex: '#F1F5F9', desc: 'Cards, surfaces, subtle bg', textColor: '#1F2937' },
                  { name: 'Dark', hex: '#1F2937', desc: 'Text, dark elements', textColor: '#fff' },
                  { name: 'Gray', hex: '#64748B', desc: 'Secondary text, placeholders', textColor: '#fff' },
                  { name: 'Light Gray', hex: '#E2E8F0', desc: 'Borders, dividers', textColor: '#1F2937' },
                  { name: 'White', hex: '#FFFFFF', desc: 'Cards, inputs, clean surfaces', textColor: '#1F2937' },
                ].map((color) => (
                  <div key={color.hex} style={{ flex: '1 1 140px', maxWidth: '180px' }}>
                    <div style={{
                      background: color.hex,
                      border: color.hex === '#FFFFFF' || color.hex === '#F9F6F0' || color.hex === '#F1F5F9' || color.hex === '#E2E8F0' ? '1px solid #e2e8f0' : 'none',
                      color: color.textColor,
                      borderRadius: '10px',
                      padding: '12px 14px',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>{color.name}</div>
                      <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>{color.desc}</div>
                      <code style={{ fontSize: '11px', background: color.textColor === '#fff' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)', padding: '2px 6px', borderRadius: '3px', display: 'inline-block', marginTop: '6px' }}>
                        {color.hex}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {displayCategories.map((category) => (
            <div key={category.id} style={{ marginBottom: '32px' }}>
              <div className="showcase-section-heading">
                {category.icon} {category.name}
              </div>
              <p className="showcase-section-desc">{category.description}</p>

              <div className="showcase-grid">
                {category.components.map((component) => {
                  const route = componentRoutes[component.id];
                  const cardContent = (
                    <>
                      <div className="showcase-component-card-icon">{component.icon}</div>
                      <div className="showcase-component-card-name">{component.name}</div>
                      <div className="showcase-component-card-desc">{component.description}</div>
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          className={`showcase-status ${component.status}`}
                          style={{ fontSize: '10px', padding: '1px 6px' }}
                        >
                          {component.status === 'ready' ? '● Ready' : '○ Pending'}
                        </span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {component.filePath.split('/').pop()}
                        </span>
                      </div>
                    </>
                  );

                  if (route && component.status === 'ready') {
                    return (
                      <Link
                        key={component.id}
                        href={route}
                        className="showcase-component-card"
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        {cardContent}
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={component.id}
                      className={`showcase-component-card ${selectedComponent === component.id ? 'selected' : ''}`}
                      onClick={() => handleSelectComponent(component.id)}
                    >
                      {cardContent}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>No components found</div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>Try a different search term</div>
            </div>
          )}
        </div>

        <ShowcaseRightSidebar selectedComponent={selectedComponent} />
      </div>
    </main>
  );
}
