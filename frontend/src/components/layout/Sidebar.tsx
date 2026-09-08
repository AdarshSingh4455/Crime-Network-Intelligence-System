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
  ChevronRight,
  CheckCircle2
} from 'lucide-react';

interface SidebarProps {
  anomalyCount?: number;
  entitiesCount?: number;
  recordsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  anomalyCount = 25,
  entitiesCount = 15,
  recordsCount = 10,
}) => {
  const mainNav = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Network', path: '/network', icon: Share2, badge: 'Interactive' },
    { name: 'Entities', path: '/entities', icon: Users, badge: entitiesCount ? String(entitiesCount) : undefined },
    { name: 'Anomalies', path: '/anomalies', icon: AlertTriangle, badge: anomalyCount ? String(anomalyCount) : undefined, alert: true },
    { name: 'Timeline', path: '/timeline', icon: Clock },
    { name: 'Locations', path: '/locations', icon: MapPin },
    { name: 'Intelligence Reports', path: '/reports', icon: FileText },
  ];

  const secondaryNav = [
    { name: 'Data Sources', path: '/sources', icon: Database, disabled: false, badge: '4 Active' },
    { name: 'Cases', path: '/cases', icon: Briefcase, disabled: false, badge: '10 Cases' },
    { name: 'Settings', path: '/settings', icon: Settings, disabled: true, badge: 'Phase 3C' },
  ];

  return (
    <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-screen select-none z-20 shrink-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-700 text-white flex items-center justify-center shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-wider font-mono">CNIS PLATFORM</h1>
            <p className="text-[10px] text-slate-500 tracking-widest font-mono">INTELLIGENCE V2.0</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <div className="px-3 mb-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
            Investigator Workspace
          </div>
          <nav className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `group flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-cyan-50 text-cyan-900 font-semibold border-l-2 border-cyan-600 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-slate-500 group-hover:text-cyan-700 transition-colors" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        item.alert
                          ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
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

        {/* System & Sources */}
        <div>
          <div className="px-3 mb-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
            System & Sources
          </div>
          <nav className="space-y-1">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              if (!item.disabled) {
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `group flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-cyan-50 text-cyan-900 font-semibold border-l-2 border-cyan-600 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-slate-500 group-hover:text-cyan-700 transition-colors" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-800 border-emerald-200 font-medium">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              }
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium text-slate-400 cursor-not-allowed opacity-75"
                  title="Planned Expansion Module"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{item.name}</span>
                  </div>
                  <span className="text-[9px] font-mono uppercase bg-slate-200/70 text-slate-500 px-1.5 py-0.5 rounded border border-slate-300">
                    {item.badge || 'Phase 3'}
                  </span>
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div>
              <div className="text-[11px] font-semibold text-slate-800">Engine Connected</div>
              <div className="text-[10px] font-mono text-slate-500">{recordsCount} Records Ingested</div>
            </div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
      </div>
    </aside>
  );
};
