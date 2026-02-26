interface StatCardProps {
  value: string | number;
  label: string;
  trend?: string;
  prefix?: string;
  suffix?: string;
}

export function StatCard({ value, label, trend, prefix = '', suffix = '' }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-value">
        {prefix}{value}{suffix}
      </div>
      <div className="stat-label">{label}</div>
      {trend && (
        <p className="text-xs font-mono text-[var(--color-neutral-dark)] mt-2">
          {trend}
        </p>
      )}
    </div>
  );
}