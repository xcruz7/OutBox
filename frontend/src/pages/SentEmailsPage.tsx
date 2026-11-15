import React, { useEffect, useState } from 'react';
import { getSentEmails } from '../services/emailService.js';
import { Email } from '../types/index.js';
import { SentTable } from '../components/emails/SentTable.js';
import { useToast } from '../context/ToastContext.js';
import { RefreshCw } from 'lucide-react';

export const SentEmailsPage: React.FC = () => {
  const { showToast } = useToast();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSent = async () => {
    try {
      setLoading(true);
      const data = await getSentEmails();
      setEmails(data);
    } catch (err) {
      console.error('Failed to load sent emails', err);
      showToast('Could not load sent emails', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSent();
    const interval = setInterval(fetchSent, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="page-heading flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sent Emails</h1>
          <p className="text-sm text-white/70 mt-1">
            History of successfully dispatched emails with Ethereal live message previews.
          </p>
        </div>
        <div>
          <button
            onClick={fetchSent}
            disabled={loading}
            className="glass-button flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <SentTable emails={emails} loading={loading} />
    </div>
  );
};
