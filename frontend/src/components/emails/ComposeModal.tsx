import React, { useRef, useState } from 'react';
import { Modal } from '../common/Modal.js';
import { scheduleEmail, scheduleEmails } from '../../services/emailService.js';
import { useToast } from '../../context/ToastContext.js';
import { AlertCircle, Clock, FileText, Sparkles, Upload, Users, X } from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_RECIPIENT_FILE_SIZE_BYTES = 1024 * 1024;
const MAX_RECIPIENTS = 500;
const EMAIL_PATTERN = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;
const EMAIL_CANDIDATE_PATTERN = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+/gi;

interface ParsedRecipients {
  recipients: string[];
  invalidCount: number;
}

function parseRecipientFile(contents: string): ParsedRecipients {
  const recipients = new Set<string>();
  let invalidCount = 0;

  // This accepts one address per line and common CSV/TSV formats, including cells such as
  // "Jane Doe <jane@example.com>". Text without an @ symbol is treated as a header or note.
  const cells = contents.replace(/^\uFEFF/, '').split(/[\r\n,;\t]+/);

  for (const cell of cells) {
    const value = cell.trim().replace(/^['"<\s]+|[>'"\s]+$/g, '');
    if (!value || !value.includes('@')) continue;

    const candidates = value.match(EMAIL_CANDIDATE_PATTERN);
    if (!candidates?.length) {
      invalidCount += 1;
      continue;
    }

    for (const candidate of candidates) {
      const email = candidate.toLowerCase();
      if (EMAIL_PATTERN.test(email)) {
        recipients.add(email);
      } else {
        invalidCount += 1;
      }
    }
  }

  return { recipients: [...recipients], invalidCount };
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const recipientFileInput = useRef<HTMLInputElement>(null);
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [uploadedRecipients, setUploadedRecipients] = useState<string[]>([]);
  const [recipientFileName, setRecipientFileName] = useState('');
  const [invalidRecipientCount, setInvalidRecipientCount] = useState(0);
  const [isReadingRecipientFile, setIsReadingRecipientFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local ISO min for the datetime-local picker
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const minDateTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);

  const setPresetDelay = (seconds: number) => {
    const target = new Date(Date.now() + seconds * 1000);
    const localISOTime = new Date(target.getTime() - tzOffset).toISOString().slice(0, 19);
    setScheduledAt(localISOTime.slice(0, 16));
  };

  const totalRecipientCount = new Set([
    ...uploadedRecipients,
    ...(recipient.trim() ? [recipient.trim().toLowerCase()] : []),
  ]).size;

  const clearRecipientFile = () => {
    setUploadedRecipients([]);
    setRecipientFileName('');
    setInvalidRecipientCount(0);
    if (recipientFileInput.current) recipientFileInput.current.value = '';
  };

  const handleRecipientFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.txt')) {
      showToast('Upload a CSV or TXT file containing recipient email addresses.', 'error');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_RECIPIENT_FILE_SIZE_BYTES) {
      showToast('Recipient files must be 1 MB or smaller.', 'error');
      event.target.value = '';
      return;
    }

    try {
      setIsReadingRecipientFile(true);
      const parsed = parseRecipientFile(await file.text());

      if (parsed.recipients.length === 0) {
        showToast('No valid recipient email addresses were found in that file.', 'error');
        event.target.value = '';
        return;
      }

      if (parsed.recipients.length > MAX_RECIPIENTS) {
        showToast(`A recipient list can contain up to ${MAX_RECIPIENTS} unique email addresses.`, 'error');
        event.target.value = '';
        return;
      }

      setUploadedRecipients(parsed.recipients);
      setRecipientFileName(file.name);
      setInvalidRecipientCount(parsed.invalidCount);
    } catch {
      showToast('The recipient file could not be read. Please try another CSV or TXT file.', 'error');
      event.target.value = '';
    } finally {
      setIsReadingRecipientFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedManualRecipient = recipient.trim().toLowerCase();
    const recipients = [...new Set([
      ...uploadedRecipients,
      ...(normalizedManualRecipient ? [normalizedManualRecipient] : []),
    ])];

    if (!recipients.length || !subject || !body || !scheduledAt) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (recipients.length > MAX_RECIPIENTS) {
      showToast(`A recipient list can contain up to ${MAX_RECIPIENTS} unique email addresses.`, 'error');
      return;
    }

    if (normalizedManualRecipient && !EMAIL_PATTERN.test(normalizedManualRecipient)) {
      showToast('Enter a valid recipient email address.', 'error');
      return;
    }

    const targetDate = new Date(scheduledAt);
    if (isNaN(targetDate.getTime()) || targetDate.getTime() < Date.now() - 60000) {
      showToast('Scheduled date & time must be in the future', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      if (recipients.length === 1 && uploadedRecipients.length === 0) {
        await scheduleEmail({
          recipient: recipients[0],
          subject,
          body,
          scheduledAt: targetDate.toISOString(),
        });
      } else {
        await scheduleEmails({
          recipients,
          subject,
          body,
          scheduledAt: targetDate.toISOString(),
        });
      }

      showToast(
        recipients.length === 1
          ? 'Email scheduled successfully! Job enqueued in BullMQ.'
          : `${recipients.length} emails scheduled successfully! Jobs enqueued in BullMQ.`,
        'success'
      );
      setRecipient('');
      setSubject('');
      setBody('');
      setScheduledAt('');
      clearRecipientFile();
      onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to schedule email';
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
            Recipient Email <span className="normal-case font-normal">(optional with a list)</span>
          </label>
          <input
            type="email"
            required={uploadedRecipients.length === 0}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="colleague@example.com"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 mb-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Recipient list <span className="normal-case font-normal">(CSV or TXT)</span>
            </label>
            {uploadedRecipients.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700">
                <Users className="w-3.5 h-3.5" /> {uploadedRecipients.length} ready
              </span>
            )}
          </div>
          <p className="mb-2 text-xs text-slate-500">
            Upload a list to send this same message at the same time to every address. One address per line or an email column both work.
          </p>
          <input
            ref={recipientFileInput}
            id="recipient-file"
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            onChange={handleRecipientFileChange}
            className="sr-only"
          />
          <label
            htmlFor="recipient-file"
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
          >
            <Upload className="w-4 h-4" />
            <span>{isReadingRecipientFile ? 'Reading recipient list...' : 'Choose recipient file'}</span>
          </label>

          {recipientFileName && (
            <div className="mt-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-slate-700">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="w-4 h-4 shrink-0 text-brand-600" />
                  <span className="truncate font-medium">{recipientFileName}</span>
                  <span className="shrink-0 text-brand-700">{uploadedRecipients.length} unique recipients</span>
                </div>
                <button
                  type="button"
                  onClick={clearRecipientFile}
                  className="rounded p-0.5 text-slate-500 hover:bg-white hover:text-slate-700"
                  aria-label="Remove recipient file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {invalidRecipientCount > 0 && (
                <p className="mt-1 flex items-center gap-1 text-amber-700">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {invalidRecipientCount} invalid {invalidRecipientCount === 1 ? 'address was' : 'addresses were'} skipped.
                </p>
              )}
            </div>
          )}
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
            disabled={isSubmitting || isReadingRecipientFile}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <Clock className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Scheduling...'
                : uploadedRecipients.length > 0
                  ? `Schedule ${totalRecipientCount} Emails`
                  : 'Schedule Email'}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
