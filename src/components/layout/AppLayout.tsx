import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notifications, removeNotification } = useApp();

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 flex flex-col font-sans bg-cyber-grid selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main App Container */}
      <div className="pl-20 md:pl-64 flex flex-col flex-1 min-w-0 transition-all duration-300">
        <Header />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="pointer-events-auto p-3.5 rounded-xl bg-slate-900/95 border border-cyan-500/40 backdrop-blur-md shadow-2xl shadow-cyan-950/80 flex items-start justify-between gap-3 text-sm animate-in slide-in-from-bottom-5 duration-200"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              {n.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
              {n.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
              {n.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
              {n.type === 'info' && <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />}
              <span className="text-slate-100 leading-snug">{n.message}</span>
            </div>
            <button
              onClick={() => removeNotification(n.id)}
              className="text-slate-400 hover:text-slate-100 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
