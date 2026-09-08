import React from 'react';
import { Search, Bell, Activity, RefreshCw, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onOpenSearch: () => void;
  systemStatus?: string;
  isBackendConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  systemStatus = 'ACTIVE INVESTIGATION',
  isBackendConnected = true,
}) => {
  return (
    <header className="h-16 bg-[#0E121B]/90 border-b border-slate-800/80 px-6 flex items-center justify-between backdrop-blur-md z-10 sticky top-0">
      {/* Search Input Shell */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all text-xs group"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            <span>Search entities, case records, vehicles, phones...</span>
          </div>
          <kbd className="hidden sm:inline-block font-mono text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
            Ctrl + K
          </kbd>
        </button>
      </div>

      {/* Header Right Status Controls */}
      <div className="flex items-center gap-4">
        {/* Status Indicator Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800">
          <span className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-[11px] font-mono font-medium text-slate-300 tracking-wide">
            {systemStatus}
          </span>
        </div>

        {/* Intelligence Engine Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 text-xs font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Python Engine 2.0</span>
        </div>

        {/* Notifications Icon */}
        <button
          className="relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          title="Notifications & System Alerts"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
        </button>

        {/* Investigator Profile Badge */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-cyan-400">
            IA
          </div>
          <div className="hidden xl:block">
            <div className="text-xs font-medium text-slate-200">Intel Analyst</div>
            <div className="text-[10px] font-mono text-slate-500">Unit-7 Crime Desk</div>
          </div>
        </div>
      </div>
    </header>
  );
};
