import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getScheduledEmails, cancelEmail } from '../services/emailService.js';
import { Email } from '../types/index.js';
import { ScheduledTable } from '../components/emails/ScheduledTable.js';
import { useToast } from '../context/ToastContext.js';
import { Plus, RefreshCw } from 'lucide-react';

export const ScheduledEmailsPage: React.FC = () => {
  const { openCompose } = useOutletContext<{ openCompose: () => void }>();
  const { showToast } = useToast();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScheduled = async () => {
    try {
      setLoading(true);
      const data = await getScheduledEmails();
      setEmails(data);
    } catch (err) {
      console.error('Failed to load scheduled emails', err);
      showToast('Could not load scheduled emails', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled email?')) return;

    try {
      await cancelEmail(id);
      showToast('Scheduled email cancelled successfully', 'success');
      fetchScheduled();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to cancel email';
      showToast(msg, 'error');
    }
  };

  useEffect(() => {
    fetchScheduled();
    const interval = setInterval(fetchScheduled, 8000); // Poll every 8s
    const handleEmailScheduled = () => fetchScheduled();
    window.addEventListener('email-scheduled', handleEmailScheduled);

    return () => {
      clearInterval(interval);
      window.removeEventListener('email-scheduled', handleEmailScheduled);
    };
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Scheduled Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            Emails queued in BullMQ awaiting target dispatch timestamp.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchScheduled}
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
            <span>Compose Email</span>
          </button>
        </div>
      </div>

      <ScheduledTable emails={emails} loading={loading} onCancel={handleCancel} />
    </div>
  );
};
