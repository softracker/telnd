'use client';

import { allComponents, componentCategories } from './componentList';

interface ShowcaseRightSidebarProps {
  selectedComponent: string | null;
}

export function ShowcaseRightSidebar({ selectedComponent }: ShowcaseRightSidebarProps) {
  const component = allComponents.find((c) => c.id === selectedComponent);
  const category = componentCategories.find((c) => c.id === component?.categoryId);

  if (!component) {
    return (
      <aside className="showcase-right-sidebar">
        <div className="showcase-info-section">
          <div className="showcase-info-label">Component Details</div>
          <div className="showcase-info-value" style={{ color: '#94a3b8', fontStyle: 'italic' }}>
            Select a component from the list or grid to see its details.
          </div>
        </div>

        <div className="showcase-info-section">
          <div className="showcase-info-label">How to Use</div>
          <div className="showcase-info-value">
            1. Click a category in the left sidebar
            <br />
            2. Click a component to see its details
            <br />
            3. Details will appear here
          </div>
        </div>

        <div className="showcase-info-section">
          <div className="showcase-info-label">After Build</div>
          <div className="showcase-info-value">
            Each component will be moved to its final path under{' '}
            <code style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: '3px', fontSize: '11px' }}>
              src/components/
            </code>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="showcase-right-sidebar">
      {/* Component Name */}
      <div className="showcase-info-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '20px' }}>{component.icon}</span>
          <span className="showcase-section-heading" style={{ fontSize: '16px' }}>
            {component.name}
          </span>
        </div>
        <span className={`showcase-status ${component.status}`}>
          {component.status === 'ready' ? '● Ready' : '○ Pending'}
        </span>
      </div>

      {/* Description */}
      <div className="showcase-info-section">
        <div className="showcase-info-label">Description</div>
        <div className="showcase-info-value">{component.description}</div>
      </div>

      {/* Category */}
      <div className="showcase-info-section">
        <div className="showcase-info-label">Category</div>
        <div className="showcase-info-value">
          {category?.icon} {category?.name}
        </div>
      </div>

      {/* File Path */}
      <div className="showcase-info-section">
        <div className="showcase-info-label">File Path</div>
        <div
          className="showcase-info-value"
          style={{
            fontFamily: 'monospace',
            fontSize: '12px',
            background: '#e2e8f0',
            padding: '6px 10px',
            borderRadius: '6px',
            wordBreak: 'break-all',
          }}
        >
          src/{component.filePath}
        </div>
      </div>

      {/* Dependencies */}
      <div className="showcase-info-section">
        <div className="showcase-info-label">Dependencies</div>
        {component.dependencies.length > 0 ? (
          <ul className="showcase-dep-list">
            {component.dependencies.map((dep) => (
              <li key={dep}>{dep}</li>
            ))}
          </ul>
        ) : (
          <div className="showcase-info-value" style={{ fontStyle: 'italic' }}>
            No dependencies
          </div>
        )}
      </div>

      {/* Props Preview */}
      <div className="showcase-info-section">
        <div className="showcase-info-label">Props Interface</div>
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '11px',
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '12px',
            borderRadius: '8px',
            lineHeight: 1.6,
            overflow: 'auto',
          }}
        >
          <span style={{ color: '#93c5fd' }}>interface</span>{' '}
          <span style={{ color: '#fbbf24' }}>{component.name}Props</span> {'{'}
          <br />
          {'  '}<span style={{ color: '#94a3b8' }}>className</span>?: string;
          <br />
          {'  '}<span style={{ color: '#94a3b8' }}>children</span>?: ReactNode;
          <br />
          {'}'}
        </div>
      </div>

      {/* Implementation Steps */}
      <div className="showcase-info-section">
        <div className="showcase-info-label">Implementation Steps</div>
        <div className="showcase-info-value">
          <ol style={{ paddingLeft: '16px', margin: 0 }}>
            <li style={{ marginBottom: '4px' }}>Create at <code style={{ fontSize: '11px' }}>src/{component.filePath}</code></li>
            <li style={{ marginBottom: '4px' }}>Define props interface</li>
            <li style={{ marginBottom: '4px' }}>Implement component</li>
            <li style={{ marginBottom: '4px' }}>Add tests</li>
            <li>Export and update status to &quot;ready&quot;</li>
          </ol>
        </div>
      </div>
    </aside>
  );
}
