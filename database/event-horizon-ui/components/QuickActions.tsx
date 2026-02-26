"use client";

import Link from 'next/link';

const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const CodeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const DatabaseIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
  </svg>
);

const DocumentIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const actions = [
  { name: 'New Project', href: '/projects/new', icon: PlusIcon, primary: true },
  { name: 'SQL Editor', href: '/sql', icon: CodeIcon, primary: false },
  { name: 'New Database', href: '/databases/new', icon: DatabaseIcon, primary: false },
  { name: 'API Docs', href: '/api-docs', icon: DocumentIcon, primary: false },
];

export function QuickActions() {
  return (
    <div className="flex flex-col gap-2">
      {actions.map((action) => (
        <Link
          key={action.name}
          href={action.href}
          className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-150 ${
            action.primary
              ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
              : 'bg-[var(--color-neutral-light)] text-[var(--color-secondary)] hover:bg-[var(--color-neutral-mid)] border border-[var(--border-light)]'
          }`}
        >
          <action.icon className="w-4 h-4" />
          {action.name}
        </Link>
      ))}
    </div>
  );
}