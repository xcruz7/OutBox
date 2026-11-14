import React, { useState } from 'react';
import { Modal } from '../common/Modal.js';
import { scheduleEmail } from '../../services/emailService.js';
import { useToast } from '../../context/ToastContext.js';
import { Clock, Sparkles } from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default min is 30 seconds from now
  const minDateTime = new Date(Date.now() + 30 * 1000).toISOString().slice(0, 16);

  const setPresetDelay = (seconds: number) => {
    const target = new Date(Date.now() + seconds * 1000);
    // Format to YYYY-MM-DDTHH:mm:ss in local time
    const offset = target.getTimezoneOffset() * 60000;
    const localISOTime = new Date(target.getTime() - offset).toISOString().slice(0, 19);
    setScheduledAt(localISOTime.slice(0, 16));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipient || !subject || !body || !scheduledAt) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    const targetDate = new Date(scheduledAt);
    if (isNaN(targetDate.getTime()) || targetDate.getTime() <= Date.now()) {
      showToast('Scheduled date & time must be strictly in the future', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await scheduleEmail({
        recipient,
        subject,
        body,
        scheduledAt: targetDate.toISOString(),
      });

      showToast('Email scheduled successfully! Job enqueued in BullMQ.', 'success');
      setRecipient('');
      setSubject('');
      setBody('');
      setScheduledAt('');
      onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to schedule email';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compose & Schedule Email">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Recipient Email
          </label>
          <input
            type="email"
            required
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="colleague@example.com"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Subject
          </label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Weekly Engineering Sync Follow-up"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Email Content (Plain Text or Markdown)
          </label>
          <textarea
            required
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hello team,\n\nHere are the action items and deliverables for our upcoming milestone..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-mono text-xs"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Scheduled Date & Time
            </label>
            <span className="text-xs text-brand-600 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Quick Presets:
            </span>
          </div>

          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setPresetDelay(30)}
              className="text-xs bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 px-2 py-1 rounded transition-colors border border-slate-200"
            >
              +30 Seconds
            </button>
            <button
              type="button"
              onClick={() => setPresetDelay(120)}
              className="text-xs bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 px-2 py-1 rounded transition-colors border border-slate-200"
            >
              +2 Minutes
            </button>
            <button
              type="button"
              onClick={() => setPresetDelay(600)}
              className="text-xs bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 px-2 py-1 rounded transition-colors border border-slate-200"
            >
              +10 Minutes
            </button>
          </div>

          <div className="relative">
            <input
              type="datetime-local"
              required
              min={minDateTime}
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <Clock className="w-4 h-4" />
            <span>{isSubmitting ? 'Scheduling...' : 'Schedule Email'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
