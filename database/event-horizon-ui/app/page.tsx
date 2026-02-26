"use client";

import { StatCard } from '@/components/StatCard';
import { RecentActivity } from '@/components/RecentActivity';
import { QuickActions } from '@/components/QuickActions';
import Link from 'next/link';

export default function Dashboard() {
  return (
    <>
      {/* Hero Section - Asymmetrical Layout */}
      <section className="mb-16">
        <div className="grid-12">
          <div className="col-span-8">
            <h1 className="text-display-lg mb-6">
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
              <div className="mt-4 pt-4 border-t border-[var(--border-light)]">
                <Link 
                  href="/activity" 
                  className="text-sm font-mono text-[var(--color-accent)] hover:underline"
                >
                  View all activity →
                </Link>
              </div>
            </div>
          </div>
          <div className="col-span-4">
            <div className="panel h-full">
              <div className="panel-header">
                <h2 className="text-h2">Quick Links</h2>
              </div>
              <ul className="space-y-4">
                <li>
                  <Link 
                    href="/projects/new" 
                    className="flex items-center gap-3 text-sm group"
                  >
                    <span className="w-1 h-1 bg-[var(--color-primary)] group-hover:scale-150 transition-transform" />
                    Create new project
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/sql" 
                    className="flex items-center gap-3 text-sm group"
                  >
                    <span className="w-1 h-1 bg-[var(--color-accent)] group-hover:scale-150 transition-transform" />
                    Run SQL query
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/api-docs" 
                    className="flex items-center gap-3 text-sm group"
                  >
                    <span className="w-1 h-1 bg-[var(--color-secondary)] group-hover:scale-150 transition-transform" />
                    View API documentation
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/databases" 
                    className="flex items-center gap-3 text-sm group"
                  >
                    <span className="w-1 h-1 bg-[var(--color-success)] group-hover:scale-150 transition-transform" />
                    Manage databases
                  </Link>
                </li>
              </ul>

              <div className="mt-8 pt-6 border-t border-[var(--border-light)]">
                <h3 className="font-mono text-sm uppercase tracking-wide text-[var(--color-neutral-dark)] mb-4">
                  System Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database</span>
                    <span className="badge badge-success">Healthy</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API</span>
                    <span className="badge badge-success">Operational</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Storage</span>
                    <span className="badge badge-default">68% used</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}