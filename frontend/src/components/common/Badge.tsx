import React from 'react';
import { EmailStatus } from '../../types/index.js';

interface BadgeProps {
  status: EmailStatus;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const getStyles = () => {
    switch (status) {
      case 'SENT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'SCHEDULED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PROCESSING':
        return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
      case 'PENDING':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'FAILED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStyles()}`}
    >
      {status}
    </span>
  );
};
