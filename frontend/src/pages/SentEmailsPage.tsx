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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Sent Emails</h1>
          <p className="text-sm text-slate-500 mt-1">
            History of successfully dispatched emails with Ethereal live message previews.
          </p>
        </div>
        <div>
          <button
            onClick={fetchSent}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg text-sm bg-white hover:bg-slate-50 transition-colors shadow-sm"
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
