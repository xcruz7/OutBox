import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { CalendarClock, CheckCircle2, MailPlus } from 'lucide-react';
import { Navbar } from './Navbar.js';
import { ComposeModal } from '../emails/ComposeModal.js';

export const DashboardLayout: React.FC = () => {
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const openCompose = () => setIsComposeOpen(true);

  return (
    <div className="outbox-shell min-h-screen relative overflow-hidden">
      <div className="ambient-orb ambient-orb--pink" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--blue" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--orange" aria-hidden="true" />

      <div className="relative z-10 min-h-screen px-4 sm:px-6 lg:px-10">
        <Navbar />

        <section className="hero-section mx-auto max-w-7xl" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="hero-eyebrow"><span /> OUTBOX SCHEDULER</p>
            <h1 id="hero-title" className="hero-title">
              Your inbox,<br className="hidden sm:block" /> on your time.
            </h1>
            <p className="hero-subtitle">
              Make room for the work that matters. Write once, choose the moment, and let every message arrive right on time.
            </p>
          </div>

          <nav className="hero-actions" aria-label="Email actions">
            <button type="button" onClick={openCompose} className="hero-pill hero-pill--primary">
              <MailPlus className="h-4 w-4" />
              <span>Compose Email</span>
            </button>
            <NavLink to="/scheduled" className={({ isActive }) => `hero-pill ${isActive ? 'hero-pill--active' : ''}`}>
              <CalendarClock className="h-4 w-4" />
              <span>Scheduled Emails</span>
            </NavLink>
            <NavLink to="/sent" className={({ isActive }) => `hero-pill ${isActive ? 'hero-pill--active' : ''}`}>
              <CheckCircle2 className="h-4 w-4" />
              <span>Sent Emails</span>
            </NavLink>
          </nav>
        </section>

        <main className="mx-auto max-w-7xl pb-12 sm:pb-16">
          <Outlet context={{ openCompose }} />
        </main>
      </div>

      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => {
          setIsComposeOpen(false);
          window.dispatchEvent(new CustomEvent('email-scheduled'));
        }}
      />
    </div>
  );
};
