'use client';

import { componentCategories } from './componentList';

interface ShowcaseLeftSidebarProps {
  selectedComponent: string | null;
  onSelectComponent: (id: string) => void;
  onSelectCategory: (id: string) => void;
  selectedCategory: string | null;
}

export function ShowcaseLeftSidebar({
  selectedComponent,
  onSelectComponent,
  onSelectCategory,
  selectedCategory,
}: ShowcaseLeftSidebarProps) {
  return (
    <aside className="showcase-left-sidebar">
      <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }} className="dark:text-white">
          Component Explorer
        </div>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
          {componentCategories.length} categories &bull;{' '}
          {componentCategories.reduce((sum, cat) => sum + cat.components.length, 0)} components
        </div>
      </div>

      {componentCategories.map((category) => (
        <div key={category.id} className="showcase-category">
          <button
            onClick={() => onSelectCategory(category.id)}
            className="showcase-category-title"
            style={{
              width: '100%',
              textAlign: 'left',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{category.icon}</span>
            <span>{category.name}</span>
          </button>

          {selectedCategory === category.id && (
            <div>
              {category.components.map((component) => (
                <button
                  key={component.id}
                  onClick={() => onSelectComponent(component.id)}
                  className={`showcase-item ${selectedComponent === component.id ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', textAlign: 'left' }}
                >
                  <span className="showcase-item-icon">{component.icon}</span>
                  <span>{component.name}</span>
                  <span className="showcase-item-count">
                    {component.status === 'ready' ? '✓' : '○'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </aside>
  );
}
