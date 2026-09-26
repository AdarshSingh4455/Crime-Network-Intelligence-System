import React from 'react';
import { Search, Sun, Moon, LogOut, Menu } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onOpenSearch: () => void;
  onToggleSidebar?: () => void;
  systemStatus?: string;
  isBackendConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onToggleSidebar,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return 'IA';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-14 bg-white/80 dark:bg-slate-950/60 backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/10 px-3 sm:px-6 flex items-center justify-between z-10 sticky top-0 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all gap-2">
      {/* Mobile/Tablet Menu Button */}
      {onToggleSidebar && (
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation Menu"
          title="Toggle Navigation Menu"
          className="lg:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all shrink-0 cursor-pointer"
        >
          <Menu className="w-5 h-5 text-cyan-700 dark:text-cyan-400" />
        </button>
      )}

      {/* Global Search Input Shell */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Open Global Intelligence Search (Ctrl+K)"
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/90 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-900/70 hover:border-cyan-500/30 dark:hover:border-cyan-400/30 transition-all text-xs group shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-cyan-600 dark:text-cyan-400 group-hover:text-cyan-500 dark:group-hover:text-cyan-300 transition-colors" />
            <span className="truncate text-slate-600 dark:text-slate-400">Search entities, vehicles, phone numbers, cases...</span>
          </div>
          <kbd className="hidden sm:inline-block font-mono text-[10px] bg-slate-200/80 dark:bg-slate-800/80 text-cyan-700 dark:text-cyan-300 px-1.5 py-0.5 rounded-md border border-slate-300/80 dark:border-white/10 shadow-xs">
            Ctrl + K
          </kbd>
        </button>
      </div>

      {/* Header Right Actions & Profile */}
      <div className="flex items-center gap-2.5">
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 hover:rotate-12 transition-transform" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600 hover:-rotate-12 transition-transform" />
          )}
        </button>

        {/* Investigator Profile Badge & Logout */}
        <div className="flex items-center gap-2.5 pl-2.5 border-l border-slate-200 dark:border-slate-800">
          <div className="w-7 h-7 rounded-full bg-cyan-700 dark:bg-cyan-600 text-white flex items-center justify-center text-xs font-mono font-bold shadow-2xs">
            {getInitials(user?.name)}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
              {user?.name || 'Intel Analyst'}
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              {user?.unit || 'Unit-7 Crime Desk'}
            </div>
          </div>
          {logout && (
            <button
              type="button"
              onClick={logout}
              aria-label="Sign out"
              title="Sign out of CNIS"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

