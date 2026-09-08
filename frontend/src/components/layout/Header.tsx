import React from 'react';
import { Search, Bell, ShieldCheck, Cpu } from 'lucide-react';

interface HeaderProps {
  onOpenSearch: () => void;
  systemStatus?: string;
  isBackendConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  systemStatus = 'Active Investigation Mode',
  isBackendConnected = true,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 sticky top-0 shadow-2xs">
      {/* Global Search Input Shell */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Open Global Intelligence Search (Ctrl+K)"
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-md bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 hover:border-slate-300 transition-all text-xs group"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-cyan-700 transition-colors" />
            <span>Search entities, vehicles, phone numbers, cases...</span>
          </div>
          <kbd className="hidden sm:inline-block font-mono text-[10px] bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
            Ctrl + K
          </kbd>
        </button>
      </div>

      {/* Header Right Status Controls */}
      <div className="flex items-center gap-3">
        {/* Status Indicator Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
          <span className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-emerald-500 animate-soft-pulse' : 'bg-amber-500'}`} />
          <span className="text-[11px] font-mono font-medium text-slate-700 tracking-wide">
            {systemStatus}
          </span>
        </div>

        {/* Python Engine Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-mono font-medium">
          <Cpu className="w-3.5 h-3.5 text-cyan-600" />
          <span>Python Engine 2.0</span>
        </div>

        {/* Notifications Icon */}
        <button
          type="button"
          aria-label="System Notifications"
          className="relative p-2 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="System Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* Investigator Profile Badge */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-cyan-700 text-white flex items-center justify-center text-xs font-mono font-bold shadow-2xs">
            IA
          </div>
          <div className="hidden xl:block">
            <div className="text-xs font-semibold text-slate-900 leading-tight">Intel Analyst</div>
            <div className="text-[10px] font-mono text-slate-500">Unit-7 Crime Desk</div>
          </div>
        </div>
      </div>
    </header>
  );
};
