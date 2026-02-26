# Design Document: Database Interface Redesign

## 1. Design Tokens

### 1.1 Color System

```css
:root {
  /* Primary - International Orange */
  --color-primary: #FF3B00;
  --color-primary-hover: #E63500;
  --color-primary-light: #FFF4F0;

  /* Secondary - Deep Navy */
  --color-secondary: #0A0A0A;
  --color-secondary-hover: #1A1A1A;
  --color-secondary-light: #F5F5F5;

  /* Accent - Electric Blue */
  --color-accent: #0066FF;
  --color-accent-hover: #0052CC;

  /* Neutrals */
  --color-neutral-light: #FAFAFA;
  --color-neutral-mid: #E5E5E5;
  --color-neutral-dark: #1A1A1A;
  --color-black: #000000;
  --color-white: #FFFFFF;

  /* Semantic */
  --color-success: #00C853;
  --color-warning: #FFB300;
  --color-error: #FF3B00;
  --color-info: #0066FF;

  /* Background */
  --bg-primary: #FFFFFF;
  --bg-secondary: #FAFAFA;
  --bg-tertiary: #F5F5F5;

  /* Borders */
  --border-light: #E5E5E5;
  --border-medium: #D4D4D4;
  --border-dark: #1A1A1A;
}
```

### 1.2 Typography System

```css
:root {
  /* Font Families */
  --font-display: 'Space Grotesk', -apple-system, sans-serif;
  --font-body: 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Font Sizes - Display */
  --text-display-xl: clamp(80px, 10vw, 160px);
  --text-display-lg: clamp(64px, 8vw, 120px);
  --text-display-md: clamp(48px, 6vw, 96px);
  --text-display-sm: clamp(32px, 4vw, 64px);

  /* Font Sizes - Heading */
  --text-h1: clamp(28px, 4vw, 48px);
  --text-h2: clamp(24px, 3vw, 36px);
  --text-h3: clamp(20px, 2.5vw, 28px);
  --text-h4: clamp(18px, 2vw, 24px);

  /* Font Sizes - Body */
  --text-body-lg: 18px;
  --text-body-md: 16px;
  --text-body-sm: 14px;
  --text-body-xs: 12px;

  /* Font Sizes - Mono */
  --text-mono-lg: 14px;
  --text-mono-md: 13px;
  --text-mono-sm: 12px;

  /* Line Heights */
  --leading-tight: 1.1;
  --leading-normal: 1.5;
  --leading-relaxed: 1.7;

  /* Letter Spacing */
  --tracking-tight: -0.02em;
  --tracking-normal: 0;
  --tracking-wide: 0.02em;
}
```

### 1.3 Spacing Scale

```css
:root {
  --space-0: 0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
  --space-32: 128px;
}
```

### 1.4 Border System

```css
:root {
  --border-width-thin: 1px;
  --border-width-medium: 2px;
  --border-width-thick: 4px;

  --border-radius-none: 0;
  --border-radius-sm: 2px;
  --border-radius-md: 4px;
  --border-radius-lg: 8px;

  /* No rounded corners on major components */
  --radius-button: 0;
  --radius-input: 0;
  --radius-card: 0;
  --radius-panel: 0;
}
```

### 1.5 Motion Values

```css
:root {
  --ease-fast: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-normal: cubic-bezier(0.2, 0, 0, 1);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);

  --duration-instant: 50ms;
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
}
```

## 2. Layout Description

### 2.1 Grid System

The layout uses a 12-column grid with asymmetric divisions:

```css
.grid-12 {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-6);
}

/* Asymmetric column spans */
.col-sidebar { grid-column: span 3; }
.col-content { grid-column: span 6; }
.col-wide { grid-column: span 8; }
.col-full { grid-column: span 12; }

/* Responsive */
@media (max-width: 1024px) {
  .col-sidebar { grid-column: span 4; }
  .col-content { grid-column: span 8; }
}

@media (max-width: 768px) {
  .grid-12 { grid-template-columns: repeat(4, 1fr); }
  .col-sidebar, .col-content, .col-wide { grid-column: span 4; }
}
```

### 2.2 Section Structure

**Global Layout Shell:**
- Fixed sidebar navigation (left, 280px)
- Main content area (right, fluid)
- No top navigation bar (use sidebar for primary navigation)

**Page Layout Patterns:**

1. **Dashboard Page:**
   - Hero section: Large typography, asymmetrical layout
   - Stats grid: 4-column, border-separated
   - Recent activity: List with mono timestamps
   - Quick actions: Horizontal button group

2. **Table Browser:**
   - Sidebar: Schema/table tree
   - Main: Table data grid
   - Toolbar: Fixed top, actions bar
   - Pagination: Bottom, minimal

3. **SQL Editor:**
   - Split view: Query (top) / Results (bottom)
   - Results: Full-width data grid
   - History: Slide-out panel (right)

4. **Schema View:**
   - Visual ER diagram (center)
   - Table details (right panel, collapsible)
   - Relationship lines: Sharp, high contrast

### 2.3 Layout Principles

- Horizontal rhythm dominates
- Vertical rhythm uses generous spacing
- Content breaks across unexpected grid lines
- Elements may overlap slightly for visual interest
- Negative space is an active design element

## 3. Component List

### 3.1 Layout Primitives

| Component | Purpose | Variants |
|-----------|---------|----------|
| `Section` | Main content wrapper | flush, padded, wide |
| `Stack` | Vertical spacing container | tight, normal, loose |
| `Cluster` | Horizontal grouping | wrap, nowrap |
| `Grid` | 12-column grid | auto-fit, fixed |
| `Frame` | Aspect ratio container | square, video, portrait |

### 3.2 Navigation Components

| Component | Purpose | Variants |
|-----------|---------|----------|
| `Sidebar` | Main navigation | fixed, collapsible |
| `NavItem` | Navigation link | active, disabled, has-children |
| `NavGroup` | Collapsible nav section | expanded, collapsed |
| `Breadcrumb` | Path navigation | minimal, with-separator |
| `Tabs` | View switching | underline, pill, minimal |

### 3.3 Data Display Components

| Component | Purpose | Variants |
|-----------|---------|----------|
| `DataTable` | Tabular data display | bordered, compact, interactive |
| `TableHeader` | Column headers | sortable, fixed |
| `TableCell` | Individual cell | editable, readonly, action |
| `StatCard` | Metric display | large, small, with-trend |
| `EmptyState` | No data placeholder | minimal, illustrated |
| `Loading` | Loading states | skeleton, spinner, progress |

### 3.4 Form Components

| Component | Purpose | Variants |
|-----------|---------|----------|
| `Input` | Text input | default, search, mono |
| `Button` | Action button | primary, secondary, ghost, danger |
| `Select` | Dropdown select | default, searchable |
| `Checkbox` | Boolean input | default, toggle |
| `Toggle` | Switch control | default, with-label |
| `CodeEditor` | SQL input | full, inline |

### 3.5 Feedback Components

| Component | Purpose | Variants |
|-----------|---------|----------|
| `Toast` | Notification | success, error, warning, info |
| `Modal` | Dialog | default, wide, fullscreen |
| `Alert` | Inline message | bordered, with-icon |
| `Badge` | Status indicator | default, dot, counter |

## 4. React/Tailwind Code

### 4.1 Global Styles (globals.css)

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --color-primary: #FF3B00;
    --color-secondary: #0A0A0A;
    --color-accent: #0066FF;
    --color-neutral-light: #FAFAFA;
    --color-neutral-dark: #1A1A1A;
    --color-black: #000000;
    --color-white: #FFFFFF;

    --font-display: 'Space Grotesk', -apple-system, sans-serif;
    --font-body: 'Inter', -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

    --text-display-xl: clamp(80px, 10vw, 160px);
    --text-display-lg: clamp(64px, 8vw, 120px);
    --text-h1: clamp(28px, 4vw, 48px);
    --text-h2: clamp(24px, 3vw, 36px);
    --text-body-md: 16px;
    --text-mono-md: 13px;

    --leading-tight: 1.1;
    --leading-normal: 1.5;

    --radius-none: 0;
  }

  * {
    border-radius: var(--radius-none);
  }

  body {
    font-family: var(--font-body);
    font-size: var(--text-body-md);
    line-height: var(--leading-normal);
    color: var(--color-secondary);
    background: var(--color-white);
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-display);
    font-weight: 600;
    letter-spacing: var(--tracking-tight);
    line-height: var(--leading-tight);
  }

  /* Mono text styling */
  code, pre, .font-mono {
    font-family: var(--font-mono);
    font-size: var(--text-mono-md);
  }
}

@layer components {
  /* Button variants */
  .btn {
    @apply inline-flex items-center justify-center px-6 py-3 font-medium transition-colors duration-150;
    border: var(--border-width-medium) solid transparent;
  }

  .btn-primary {
    @apply bg-[var(--color-primary)] text-white border-[var(--color-primary)];
  }

  .btn-primary:hover {
    @apply bg-[var(--color-primary-hover)] border-[var(--color-primary-hover)];
  }

  .btn-secondary {
    @apply bg-[var(--color-secondary)] text-white border-[var(--color-secondary)];
  }

  .btn-secondary:hover {
    @apply bg-[var(--color-secondary-hover)] border-[var(--color-secondary-hover)];
  }

  .btn-ghost {
    @apply bg-transparent text-[var(--color-secondary)] border-[var(--color-secondary)];
  }

  .btn-ghost:hover {
    @apply bg-[var(--color-secondary)] text-white;
  }

  /* Input styling */
  .input {
    @apply w-full px-4 py-3 bg-white border border-[var(--border-light)] text-[var(--color-secondary)];
    font-family: var(--font-mono);
    font-size: var(--text-mono-md);
  }

  .input:focus {
    @apply outline-none border-[var(--color-accent)];
  }

  /* Table styling */
  .table-container {
    @apply overflow-x-auto border border-[var(--border-light)];
  }

  .table {
    @apply w-full text-left;
  }

  .table th {
    @apply px-4 py-3 bg-[var(--color-neutral-light)] font-medium text-sm border-b border-[var(--border-light)];
    font-family: var(--font-mono);
    font-size: var(--text-mono-sm);
    text-transform: uppercase;
    letter-spacing: var(--tracking-wide);
  }

  .table td {
    @apply px-4 py-3 border-b border-[var(--border-light)];
    font-family: var(--font-mono);
    font-size: var(--text-mono-md);
  }

  .table tr:hover td {
    @apply bg-[var(--color-neutral-light)];
  }

  /* Section styling */
  .section {
    @apply py-16 px-6;
  }

  .section-tight {
    @apply py-8 px-6;
  }

  .section-wide {
    @apply py-24 px-6;
  }

  /* Card alternative - bordered panel */
  .panel {
    @apply border border-[var(--border-light)] p-6;
  }

  .panel-header {
    @apply pb-4 mb-4 border-b border-[var(--border-light)];
  }

  /* Navigation */
  .sidebar {
    @apply fixed left-0 top-0 h-full w-[280px] bg-[var(--color-neutral-light)] border-r border-[var(--border-light)] overflow-y-auto;
  }

  .nav-item {
    @apply flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-150;
    font-family: var(--font-mono);
    font-size: var(--text-mono-sm);
  }

  .nav-item:hover {
    @apply bg-[var(--color-neutral-mid)];
  }

  .nav-item.active {
    @apply bg-[var(--color-secondary)] text-white;
  }

  /* Stat card */
  .stat-card {
    @apply border border-[var(--border-light)] p-6;
  }

  .stat-value {
    @apply text-4xl font-bold font-display tracking-tight;
    font-size: clamp(32px, 5vw, 48px);
  }

  .stat-label {
    @apply text-sm text-[var(--color-neutral-dark)] mt-1;
    font-family: var(--font-mono);
    font-size: var(--text-mono-sm);
    text-transform: uppercase;
    letter-spacing: var(--tracking-wide);
  }

  /* Badge */
  .badge {
    @apply inline-flex items-center px-2 py-1 text-xs font-medium font-mono;
    border: var(--border-width-thin) solid transparent;
  }

  .badge-default {
    @apply bg-[var(--color-neutral-light)] text-[var(--color-secondary)];
    border-color: var(--border-light);
  }

  .badge-success {
    @apply bg-[#E8F5E9] text-[#00C853];
    border-color: var(--color-success);
  }

  .badge-warning {
    @apply [var(--color-warning)] text-white;
    border-color: var(--color-warning);
  }

  .badge-error {
    @apply bg-[#FFEBEE] text-[var(--color-error)];
    border-color: var(--color-error);
  }

  /* Toast */
  .toast {
    @apply flex items-center gap-3 px-4 py-3 border-l-4 bg-white shadow-sm;
  }

  .toast-success {
    @apply border-l-[var(--color-success)];
  }

  .toast-error {
    @apply border-l-[var(--color-error)];
  }

  .toast-warning {
    @apply border-l-[var(--color-warning)];
  }

  .toast-info {
    @apply border-l-[var(--color-accent)];
  }
}

@layer utilities {
  /* Typography utilities */
  .text-display-xl {
    font-size: var(--text-display-xl);
    line-height: var(--leading-tight);
    letter-spacing: var(--tracking-tight);
    font-family: var(--font-display);
  }

  .text-display-lg {
    font-size: var(--text-display-lg);
    line-height: var(--leading-tight);
    letter-spacing: var(--tracking-tight);
    font-family: var(--font-display);
  }

  .text-h1 {
    font-size: var(--text-h1);
    line-height: var(--leading-tight);
    letter-spacing: var(--tracking-tight);
    font-family: var(--font-display);
  }

  .text-h2 {
    font-size: var(--text-h2);
    line-height: var(--leading-tight);
    letter-spacing: var(--tracking-tight);
    font-family: var(--font-display);
  }

  /* Layout utilities */
  .grid-12 {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: var(--space-6);
  }

  .sidebar-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    min-height: 100vh;
  }

  .main-content {
    @apply p-6;
  }

  /* Hide scrollbar but keep functionality */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

### 4.2 Layout Components

#### Sidebar.tsx
```tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Projects', href: '/projects', icon: FolderIcon },
  { name: 'SQL Editor', href: '/sql', icon: CodeIcon },
  { name: 'API Docs', href: '/api-docs', icon: DocumentIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

const adminNavigation = [
  { name: 'Team', href: '/team', icon: UsersIcon },
  { name: 'Billing', href: '/billing', icon: CreditCardIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="p-6 border-b border-[var(--border-light)]">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--color-primary)]" />
          <span className="font-display font-bold text-xl tracking-tight">
            VECTABASE
          </span>
        </Link>
      </div>

      <nav className="p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}

        <div className="pt-6 pb-2">
          <span className="px-4 text-xs font-mono text-[var(--color-neutral-dark)] uppercase tracking-wider">
            Admin
          </span>
        </div>

        {adminNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--border-light)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-neutral-mid)]" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">User Name</p>
            <p className="text-xs font-mono text-[var(--color-neutral-dark)] truncate">
              user@example.com
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
```

#### Dashboard Page (page.tsx)
```tsx
import { Sidebar } from '@/components/Sidebar';
import { StatCard } from '@/components/StatCard';
import { RecentActivity } from '@/components/RecentActivity';
import { QuickActions } from '@/components/QuickActions';

export default function Dashboard() {
  return (
    <div className="sidebar-layout">
      <Sidebar />
      
      <main className="main-content bg-[var(--color-white)]">
        {/* Hero Section - Asymmetrical Layout */}
        <section className="mb-16">
          <div className="grid-12">
            <div className="col-span-8">
              <h1 className="text-display-lg mb-4">
                Database
                <br />
                <span className="text-[var(--color-primary)]">Operations</span>
              </h1>
              <p className="text-lg text-[var(--color-neutral-dark)] max-w-xl leading-relaxed">
                Manage your databases, run queries, and monitor performance 
                with a powerful interface designed for developers.
              </p>
            </div>
            <div className="col-span-4 flex items-end justify-end">
              <QuickActions />
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="mb-16">
          <div className="grid-12">
            <div className="col-span-3">
              <StatCard
                value="12"
                label="Active Projects"
                trend="+2 this month"
              />
            </div>
            <div className="col-span-3">
              <StatCard
                value="847"
                label="Total Tables"
                trend="+24 this week"
              />
            </div>
            <div className="col-span-3">
              <StatCard
                value="2.4M"
                label="Rows Stored"
                trend="+180K this week"
              />
            </div>
            <div className="col-span-3">
              <StatCard
                value="99.9%"
                label="Uptime"
                trend="Last 30 days"
              />
            </div>
          </div>
        </section>

        {/* Recent Activity - Asymmetrical */}
        <section>
          <div className="grid-12">
            <div className="col-span-8">
              <div className="panel">
                <div className="panel-header">
                  <h2 className="text-h2">Recent Activity</h2>
                </div>
                <RecentActivity />
              </div>
            </div>
            <div className="col-span-4">
              <div className="panel h-full">
                <div className="panel-header">
                  <h2 className="text-h2">Quick Links</h2>
                </div>
                <ul className="space-y-3">
                  <li>
                    <a href="/projects/new" className="flex items-center gap-2 text-sm hover:text-[var(--color-primary)]">
                      <span className="w-1 h-1 bg-[var(--color-primary)]" />
                      Create new project
                    </a>
                  </li>
                  <li>
                    <a href="/sql" className="flex items-center gap-2 text-sm hover:text-[var(--color-primary)]">
                      <span className="w-1 h-1 bg-[var(--color-accent)]" />
                      Run SQL query
                    </a>
                  </li>
                  <li>
                    <a href="/api-docs" className="flex items-center gap-2 text-sm hover:text-[var(--color-primary)]">
                      <span className="w-1 h-1 bg-[var(--color-secondary)]" />
                      View API documentation
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
```

#### DataTable Component
```tsx
import { useState } from 'react';

interface Column {
  name: string;
  type: string;
  nullable?: boolean;
  default?: string;
}

interface DataTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  onEdit?: (row: Record<string, unknown>) => void;
  onDelete?: (row: Record<string, unknown>) => void;
}

export function DataTable({ columns, data, onEdit, onDelete }: DataTableProps) {
  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.name}>
                <div className="flex items-center gap-2">
                  <span>{col.name}</span>
                  <span className="text-xs text-[var(--color-neutral-dark)] font-normal">
                    {col.type}
                  </span>
                </div>
              </th>
            ))}
            <th className="w-20">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={col.name}>
                  {row[col.name] === null ? (
                    <span className="text-[var(--color-neutral-dark)] italic">NULL</span>
                  ) : (
                    String(row[col.name])
                  )}
                </td>
              ))}
              <td>
                <div className="flex items-center gap-2">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(row)}
                      className="p-1 hover:bg-[var(--color-neutral-light)]"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(row)}
                      className="p-1 hover:bg-[var(--color-error)] hover:text-white"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

#### SQL Editor Component
```tsx
import { useState } from 'react';

export function SQLEditor() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<unknown[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    try {
      const res = await fetch('/api/database/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: query }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setResults(null);
      } else {
        setResults(data.rows);
        setError(null);
      }
    } catch (e) {
      setError('Failed to execute query');
      setResults(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Query Input */}
      <div className="border border-[var(--border-light)]">
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-neutral-light)] border-b border-[var(--border-light)]">
          <span className="font-mono text-sm">query.sql</span>
          <button
            onClick={handleRun}
            className="btn btn-primary"
          >
            Run Query
          </button>
        </div>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input font-mono text-sm bg-[var(--color-secondary)] text-white"
          style={{ minHeight: '200px', resize: 'vertical' }}
          placeholder="SELECT * FROM users LIMIT 10;"
        />
      </div>

      {/* Results */}
      {error && (
        <div className="toast toast-error mt-4">
          <span className="font-mono text-sm">{error}</span>
        </div>
      )}

      {results && (
        <div className="mt-4 border border-[var(--border-light)]">
          <div className="px-4 py-2 bg-[var(--color-neutral-light)] border-b border-[var(--border-light)]">
            <span className="font-mono text-sm">
              {results.length} rows returned
            </span>
          </div>
          <DataTable
            columns={results.length > 0 ? Object.keys(results[0]).map((key) => ({
              name: key,
              type: 'unknown',
            })) : []}
            data={results}
          />
        </div>
      )}
    </div>
  );
}
```

## 5. Implementation Notes

### 5.1 Priority Order

1. **Phase 1:** Global styles, Sidebar, Dashboard layout
2. **Phase 2:** DataTable component, Table browser
3. **Phase 3:** SQL Editor
4. **Phase 4:** Schema designer, Settings pages

### 5.2 Migration Strategy

- Replace globals.css with new design tokens
- Update layout.tsx to use new sidebar
- Migrate pages one by one
- Maintain backward compatibility during transition

### 5.3 Accessibility Considerations

- All interactive elements have focus states
- Color contrast meets WCAG AA
- Keyboard navigation for all components
- Screen reader friendly markup

### 5.4 Performance Notes

- Use CSS containment for large tables
- Virtualize table rendering for >1000 rows
- Lazy load non-critical components
- Optimize font loading with font-display: swap