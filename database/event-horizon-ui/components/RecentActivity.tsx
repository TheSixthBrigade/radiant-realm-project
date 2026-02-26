"use client";

interface Activity {
  id: string;
  type: 'query' | 'create' | 'update' | 'delete' | 'login';
  description: string;
  timestamp: string;
  project?: string;
}

const activityTypeColors = {
  query: 'bg-[var(--color-accent)]',
  create: 'bg-[var(--color-success)]',
  update: 'bg-[var(--color-warning)]',
  delete: 'bg-[var(--color-error)]',
  login: 'bg-[var(--color-secondary)]',
};

const activityTypeLabels = {
  query: 'Query',
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  login: 'Login',
};

// Sample activity data - in production, this would come from an API
const sampleActivities: Activity[] = [
  {
    id: '1',
    type: 'query',
    description: 'SELECT * FROM users WHERE email LIKE %@example.com',
    timestamp: '2024-01-15T14:32:00Z',
    project: 'production-db',
  },
  {
    id: '2',
    type: 'create',
    description: 'Created table: analytics_events',
    timestamp: '2024-01-15T13:45:00Z',
    project: 'production-db',
  },
  {
    id: '3',
    type: 'update',
    description: 'Updated 247 rows in: user_sessions',
    timestamp: '2024-01-15T12:20:00Z',
    project: 'staging-db',
  },
  {
    id: '4',
    type: 'login',
    description: 'User logged in from 192.168.1.1',
    timestamp: '2024-01-15T11:00:00Z',
    project: null,
  },
  {
    id: '5',
    type: 'delete',
    description: 'Deleted 12 rows from: temp_cache',
    timestamp: '2024-01-15T10:15:00Z',
    project: 'production-db',
  },
];

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function RecentActivity() {
  return (
    <div className="divide-y divide-[var(--border-light)]">
      {sampleActivities.map((activity) => (
        <div key={activity.id} className="py-4 first:pt-0 last:pb-0">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              <div className={`w-2 h-2 rounded-full ${activityTypeColors[activity.type]}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono uppercase tracking-wide text-[var(--color-neutral-dark)]">
                  {activityTypeLabels[activity.type]}
                </span>
                {activity.project && (
                  <>
                    <span className="text-[var(--color-neutral-dark)]">·</span>
                    <span className="text-xs font-mono text-[var(--color-accent)]">
                      {activity.project}
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm font-mono text-[var(--color-secondary)] truncate">
                {activity.description}
              </p>
              <p className="text-xs font-mono text-[var(--color-neutral-dark)] mt-1">
                {formatTimestamp(activity.timestamp)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}