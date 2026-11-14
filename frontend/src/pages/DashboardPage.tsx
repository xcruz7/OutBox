import React, { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { getDashboardStats } from '../services/emailService.js';
import { DashboardMetrics } from '../types/index.js';
import { Badge } from '../components/common/Badge.js';
import {
  Mail,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { openCompose } = useOutletContext<{ openCompose: () => void }>();
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
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Overview Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time status of your scheduled and dispatched email queues.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg text-sm bg-white hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={openCompose}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Email</span>
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
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"
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
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
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
