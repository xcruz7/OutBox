import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Clock, CheckCircle2 } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/scheduled', label: 'Scheduled Emails', icon: Clock },
    { to: '/sent', label: 'Sent Emails', icon: CheckCircle2 },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500 space-y-1">
        <div className="font-semibold text-slate-700">Outbox Labs Engine</div>
        <div>BullMQ + Redis 7.0</div>
        <div>MySQL + Prisma ORM</div>
      </div>
    </aside>
  );
};
