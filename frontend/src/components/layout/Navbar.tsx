import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LogOut, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `top-nav-link ${isActive ? 'top-nav-link--active' : ''}`;

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="top-nav mx-auto flex max-w-7xl items-center justify-between gap-4">
      <Link to="/dashboard" className="brand-mark" aria-label="Outbox Scheduler home">
        <span className="brand-icon"><Mail className="h-5 w-5" /></span>
        <span className="brand-name">Outbox<span>Scheduler</span></span>
      </Link>

      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          <NavLink to="/dashboard" className={navClass}>Overview</NavLink>
          <NavLink to="/scheduled" className={navClass}>Scheduled</NavLink>
          <NavLink to="/sent" className={navClass}>Sent</NavLink>
        </nav>

        <div className="account-chip">
          <span className="account-avatar" aria-hidden="true">{user?.name?.charAt(0)?.toUpperCase() || 'O'}</span>
          <span className="hidden min-w-0 sm:block">
            <span className="account-name block truncate">{user?.name}</span>
            <span className="account-email block truncate">{user?.email}</span>
          </span>
          <button onClick={logout} title="Log out" aria-label="Log out" className="logout-button">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
