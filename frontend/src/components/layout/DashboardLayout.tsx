import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar.js';
import { Sidebar } from './Sidebar.js';
import { ComposeModal } from '../emails/ComposeModal.js';

export const DashboardLayout: React.FC = () => {
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar onOpenCompose={() => setIsComposeOpen(true)} />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet context={{ openCompose: () => setIsComposeOpen(true) }} />
        </main>
      </div>

      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => {
          setIsComposeOpen(false);
          // Dispatch window event so tables refresh automatically
          window.dispatchEvent(new CustomEvent('email-scheduled'));
        }}
      />
    </div>
  );
};
