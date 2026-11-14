import React from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { LogOut, Plus, Mail } from 'lucide-react';

interface NavbarProps {
  onOpenCompose: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCompose }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-30 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="bg-brand-500 text-white p-2 rounded-lg">
          <Mail className="w-5 h-5" />
        </div>
        <span className="font-bold text-slate-800 text-lg tracking-tight">
          Outbox <span className="text-brand-600 font-normal">Scheduler</span>
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onOpenCompose}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Compose Email</span>
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-slate-800">{user?.name}</div>
            <div className="text-xs text-slate-500">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
