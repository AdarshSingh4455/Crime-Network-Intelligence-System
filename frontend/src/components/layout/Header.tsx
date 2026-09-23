import React from 'react';
import { Search, Bell, ShieldCheck, Cpu, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 bg-white dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between z-10 sticky top-0 shadow-2xs transition-colors">
      {/* Global Search Input Shell */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Open Global Intelligence Search (Ctrl+K)"
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-md bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all text-xs group"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors" />
            <span>Search entities, vehicles, phone numbers, cases...</span>
          </div>
          <kbd className="hidden sm:inline-block font-mono text-[10px] bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 shadow-2xs">
            Ctrl + K
          </kbd>
        </button>
      </div>

      {/* Header Right Status Controls */}
      <div className="flex items-center gap-3">
        {/* Status Indicator Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <span className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-emerald-500 animate-soft-pulse' : 'bg-amber-500'}`} />
          <span className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 tracking-wide">
            {systemStatus}
          </span>
        </div>

        {/* Python Engine Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 text-xs font-mono font-medium">
          <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Python Engine 2.0</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-4.5 h-4.5 text-amber-400 hover:rotate-12 transition-transform" />
          ) : (
            <Moon className="w-4.5 h-4.5 text-slate-600 hover:-rotate-12 transition-transform" />
          )}
        </button>

        {/* Notifications Icon */}
        <button
          type="button"
          aria-label="System Notifications"
          className="relative p-2 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="System Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
        </button>

        {/* Investigator Profile Badge */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-cyan-700 dark:bg-cyan-600 text-white flex items-center justify-center text-xs font-mono font-bold shadow-2xs">
            IA
          </div>
          <div className="hidden xl:block">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">Intel Analyst</div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Unit-7 Crime Desk</div>
          </div>
        </div>
      </div>
    </header>
  );
};
