import React from 'react';
import { Email } from '../../types/index.js';
import { Badge } from '../common/Badge.js';
import { Clock, Trash2, Calendar, Mail } from 'lucide-react';

interface ScheduledTableProps {
  emails: Email[];
  loading: boolean;
  onCancel: (id: string) => void;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({ emails, loading, onCancel }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-2" />
        <p className="text-sm">Loading scheduled emails...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <Clock className="w-6 h-6" />
        </div>
        <h4 className="text-base font-semibold text-slate-800">No scheduled emails</h4>
        <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
          You don't have any pending emails in the queue. Click "Compose Email" to schedule a delivery.
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
              <th className="py-3.5 px-4">Scheduled For</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Created At</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {emails.map((email) => {
              const scheduledDate = new Date(email.scheduledAt);
              const createdDate = new Date(email.createdAt);
              const isPast = scheduledDate.getTime() <= Date.now();

              return (
                <tr key={email.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
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
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{scheduledDate.toLocaleString()}</span>
                    </div>
                    {isPast && (
                      <span className="text-[10px] text-amber-600 font-medium">Due for delivery</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge status={email.status} />
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500">
                    {createdDate.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onCancel(email.id)}
                      title="Cancel scheduled email"
                      className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1.5 rounded-md font-medium transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
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
