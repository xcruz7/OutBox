import React from 'react';
import { Email } from '../../types/index.js';
import { Badge } from '../common/Badge.js';
import { CheckCircle2, ExternalLink, Mail, Clock } from 'lucide-react';

interface SentTableProps {
  emails: Email[];
  loading: boolean;
}

export const SentTable: React.FC<SentTableProps> = ({ emails, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-2" />
        <p className="text-sm">Loading sent emails...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="text-base font-semibold text-slate-800">No sent emails yet</h4>
        <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
          When your scheduled emails are picked up and delivered by the BullMQ worker, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-4">Recipient</th>
              <th className="py-3.5 px-4">Subject</th>
              <th className="py-3.5 px-4">Sent Timestamp</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Attempts</th>
              <th className="py-3.5 px-4 text-right">Ethereal Live Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {emails.map((email) => {
              const sentDate = email.sentAt ? new Date(email.sentAt) : null;

              return (
                <tr key={email.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-emerald-500" />
                      <span>{email.recipient}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-800 block truncate max-w-xs">
                      {email.subject}
                    </span>
                    <span className="text-xs text-slate-500 block truncate max-w-xs font-mono">
                      {email.body.slice(0, 45)}...
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sentDate ? sentDate.toLocaleString() : 'N/A'}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge status={email.status} />
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono text-slate-500">
                    {email.attempts} / {email.maxAttempts}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {email.etherealPreviewUrl ? (
                      <a
                        href={email.etherealPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-md transition-colors"
                      >
                        <span>View in Ethereal</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Delivered</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
