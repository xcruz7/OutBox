import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../services/emailService.js';
import { DashboardMetrics } from '../types/index.js';
import { Badge } from '../components/common/Badge.js';
import {
  Mail,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const data = await getDashboardStats();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Auto-refresh metrics every 10 seconds or when an email is scheduled
    const interval = setInterval(fetchMetrics, 10000);
    const handleEmailScheduled = () => fetchMetrics();
    window.addEventListener('email-scheduled', handleEmailScheduled);

    return () => {
      clearInterval(interval);
      window.removeEventListener('email-scheduled', handleEmailScheduled);
    };
  }, []);

  const stats = [
    {
      title: 'Total Emails',
      value: metrics?.total ?? 0,
      icon: Mail,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
    {
      title: 'Scheduled Queue',
      value: metrics?.scheduled ?? 0,
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Successfully Sent',
      value: metrics?.sent ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Failed Attempts',
      value: metrics?.failed ?? 0,
      icon: AlertTriangle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="dashboard-heading flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[.19em] text-white/65">Your workspace</p>
          <h2 className="text-2xl font-bold text-white tracking-tight">Queue overview</h2>
          <p className="mt-1 text-sm text-white/70">
            A clear view of what’s queued, delivered, and needs attention.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="glass-button flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="glass-card p-5 sm:p-6 flex items-center justify-between transition-transform duration-300 hover:-translate-y-1"
            >
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {loading && !metrics ? '...' : stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Architecture Status Panel */}
      <div className="worker-card p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Distributed Worker Active
          </div>
          <h3 className="text-lg font-bold">BullMQ Delayed Jobs & Redis AOF Persistence</h3>
          <p className="text-sm text-slate-300 max-w-2xl">
            Emails are queued with exact millisecond delays and persisted across backend restarts.
            The database functions as the durable source of truth with automated reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/scheduled"
            className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow"
          >
            <span>View Queue</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="glass-card activity-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800">Recent Queue Activity</h3>
          <Link to="/scheduled" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
            View All &rarr;
          </Link>
        </div>

        {loading && !metrics ? (
          <div className="py-8 text-center text-slate-400 text-sm">Loading activity...</div>
        ) : metrics?.recentActivity.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">No activity recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {metrics?.recentActivity.map((email) => (
              <div key={email.id} className="py-3 flex items-center justify-between text-sm">
                <div className="space-y-0.5">
                  <div className="font-medium text-slate-800">{email.subject}</div>
                  <div className="text-xs text-slate-500">To: {email.recipient}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {new Date(email.scheduledAt).toLocaleString()}
                  </span>
                  <Badge status={email.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
