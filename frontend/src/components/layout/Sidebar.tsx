import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Share2,
  Users,
  AlertTriangle,
  Clock,
  MapPin,
  FileText,
  Database,
  Briefcase,
  Settings,
  CheckCircle2,
  Compass,
  FlaskConical,
  Lightbulb,
  History,
  GitFork,
  FileSpreadsheet,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

import { X } from 'lucide-react';

interface SidebarProps {
  anomalyCount?: number;
  entitiesCount?: number;
  recordsCount?: number;
  isOpenOnMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  alert?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  anomalyCount = 25,
  entitiesCount = 15,
  recordsCount = 10,
  isOpenOnMobile = false,
  onCloseMobile,
}) => {
  const sections: NavSection[] = [
    {
      title: 'Investigator Workspace',
      items: [
        { name: 'Overview', path: '/', icon: LayoutDashboard },
        { name: 'Cases', path: '/cases', icon: Briefcase, badge: '10 Cases' },
        { name: 'Investigation', path: '/investigation', icon: Compass },
        { name: 'FIR', path: '/fir', icon: FileSpreadsheet },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { name: 'Network', path: '/network', icon: Share2 },
        { name: 'Entities', path: '/entities', icon: Users, badge: entitiesCount ? String(entitiesCount) : undefined },
        { name: 'Anomalies', path: '/anomalies', icon: AlertTriangle, badge: anomalyCount ? String(anomalyCount) : undefined, alert: true },
        { name: 'Timeline', path: '/timeline', icon: Clock },
        { name: 'Locations', path: '/locations', icon: MapPin },
        { name: 'AGI', path: '/graph-intelligence', icon: GitFork },
        { name: 'Temporal Intelligence', path: '/temporal', icon: History },
      ],
    },
    {
      title: 'Analysis & Explanation',
      items: [
        { name: 'Explainability', path: '/explainability', icon: Lightbulb },
        { name: 'Intelligence Reports', path: '/reports', icon: FileText },
      ],
    },
    {
      title: 'Data / System',
      items: [
        { name: 'Data Sources', path: '/sources', icon: Database, badge: '4 Active' },
        { name: 'Data Quality', path: '/data-quality', icon: FlaskConical },
        { name: 'Settings', path: '/settings', icon: Settings },
      ],
    },
  ];

  const sidebarContent = (
    <aside className="w-64 bg-white/95 dark:bg-slate-950/90 backdrop-blur-2xl border-r border-slate-200/80 dark:border-white/10 flex flex-col h-full select-none shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.04)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.5)] transition-all">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200/80 dark:border-white/10 bg-slate-100/70 dark:bg-slate-900/40 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/80 to-blue-600/80 text-white flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-300/40">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 dark:text-white tracking-wider font-mono">CNIS PLATFORM</h1>
            <p className="text-[10px] text-cyan-600 dark:text-cyan-400/80 tracking-widest font-mono">INTELLIGENCE V2.0</p>
          </div>
        </div>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            title="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Glassmorphic Section-Wise Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {sections.map((section) => (
          <div
            key={section.title}
            className="bg-slate-100/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-xl p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition-all hover:border-cyan-500/40 dark:hover:border-cyan-400/30 hover:bg-slate-100/90 dark:hover:bg-slate-900/60"
          >
            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono flex items-center justify-between">
              <span>{section.title}</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono font-normal">{section.items.length}</span>
            </div>
            <nav className="space-y-0.5 mt-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => onCloseMobile?.()}
                    className={({ isActive }) =>
                      `group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 font-semibold border-l-2 border-cyan-600 dark:border-cyan-400 shadow-2xs'
                          : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ml-1 shrink-0 ${
                          item.alert
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900 font-semibold'
                            : 'bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/90 dark:border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-100/70 dark:bg-slate-900/40 backdrop-blur-xl">
        <div className="bg-slate-200/60 dark:bg-slate-900/60 backdrop-blur-md p-2.5 rounded-xl border border-slate-300/60 dark:border-white/10 flex items-center justify-between shadow-[0_4px_16px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            </span>
            <div>
              <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Engine Connected</div>
              <div className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400/80">{recordsCount} Records Ingested</div>
            </div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <div className="hidden lg:flex h-full">
        {sidebarContent}
      </div>

      {/* Mobile/Tablet drawer overlay */}
      {isOpenOnMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 flex h-full max-w-xs w-full animate-fadeIn">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
