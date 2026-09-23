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

interface SidebarProps {
  anomalyCount?: number;
  entitiesCount?: number;
  recordsCount?: number;
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
}) => {
  const sections: NavSection[] = [
    {
      title: 'Investigator Workspace',
      items: [
        { name: 'Overview', path: '/', icon: LayoutDashboard },
        { name: 'Cases', path: '/cases', icon: Briefcase, badge: '10 Cases' },
        { name: 'Investigation', path: '/investigation', icon: Compass, badge: 'Workspace' },
        { name: 'FIR', path: '/fir', icon: FileSpreadsheet, badge: 'Phase 4' },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { name: 'Network', path: '/network', icon: Share2, badge: 'Interactive' },
        { name: 'Entities', path: '/entities', icon: Users, badge: entitiesCount ? String(entitiesCount) : undefined },
        { name: 'Anomalies', path: '/anomalies', icon: AlertTriangle, badge: anomalyCount ? String(anomalyCount) : undefined, alert: true },
        { name: 'Timeline', path: '/timeline', icon: Clock },
        { name: 'Locations', path: '/locations', icon: MapPin },
        { name: 'AGI', path: '/graph-intelligence', icon: GitFork, badge: 'Phase 3K' },
        { name: 'Temporal Intelligence', path: '/temporal', icon: History, badge: 'Phase 3J' },
      ],
    },
    {
      title: 'Analysis & Explanation',
      items: [
        { name: 'Explainability', path: '/explainability', icon: Lightbulb, badge: 'Phase 3I' },
        { name: 'Intelligence Reports', path: '/reports', icon: FileText },
      ],
    },
    {
      title: 'Data / System',
      items: [
        { name: 'Data Sources', path: '/sources', icon: Database, badge: '4 Active' },
        { name: 'Data Quality', path: '/data-quality', icon: FlaskConical, badge: 'Phase 3F' },
        { name: 'Settings', path: '/settings', icon: Settings, badge: 'Config' },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-lg border-r border-slate-200/80 dark:border-slate-800 flex flex-col h-screen select-none z-20 shrink-0 transition-colors">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-700 to-slate-900 text-white flex items-center justify-center shadow-xs border border-cyan-600/30">
            <Shield className="w-5 h-5 text-cyan-100" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-wider font-mono">CNIS PLATFORM</h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 tracking-widest font-mono">INTELLIGENCE V2.0</p>
          </div>
        </div>
      </div>

      {/* Glassmorphic Section-Wise Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {sections.map((section) => (
          <div
            key={section.title}
            className="bg-white/65 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200/70 dark:border-slate-700/60 rounded-xl p-1.5 shadow-2xs transition-all hover:border-slate-300/80 dark:hover:border-slate-600 hover:bg-white/80 dark:hover:bg-slate-800/60"
          >
            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest font-mono flex items-center justify-between">
              <span>{section.title}</span>
              <span className="text-[9px] text-slate-300 dark:text-slate-500 font-mono font-normal">{section.items.length}</span>
            </div>
            <nav className="space-y-0.5 mt-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-900 dark:text-cyan-300 font-semibold border-l-2 border-cyan-600 dark:border-cyan-400 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-700/50'
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
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-2xs">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div>
              <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Engine Connected</div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{recordsCount} Records Ingested</div>
            </div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>
    </aside>
  );
};
