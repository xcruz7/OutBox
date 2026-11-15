import React, { useEffect, useState } from 'react';
import { getScheduledEmails, cancelEmail } from '../services/emailService.js';
import { Email } from '../types/index.js';
import { ScheduledTable } from '../components/emails/ScheduledTable.js';
import { useToast } from '../context/ToastContext.js';
import { RefreshCw } from 'lucide-react';

export const ScheduledEmailsPage: React.FC = () => {
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
      <div className="page-heading flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Scheduled Queue</h1>
          <p className="text-sm text-white/70 mt-1">
            Emails queued in BullMQ awaiting target dispatch timestamp.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchScheduled}
            disabled={loading}
            className="glass-button flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <ScheduledTable emails={emails} loading={loading} onCancel={handleCancel} />
    </div>
  );
};
