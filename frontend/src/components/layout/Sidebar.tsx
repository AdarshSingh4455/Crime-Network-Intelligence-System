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
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  anomalyCount?: number;
  entitiesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ anomalyCount = 25, entitiesCount = 15 }) => {
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
    { name: 'Data Sources', path: '/sources', icon: Database, disabled: true },
    { name: 'Cases', path: '/cases', icon: Briefcase, disabled: true },
    { name: 'Settings', path: '/settings', icon: Settings, disabled: true },
  ];

  return (
    <aside className="w-64 bg-[#0E121B] border-r border-slate-800/80 flex flex-col h-screen select-none z-20">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-950">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-100 tracking-wider font-mono">CNIS PLATFORM</h1>
            <p className="text-[10px] text-slate-400 tracking-widest font-mono">INTELLIGENCE V2.0</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest font-mono">
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
                    `group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-950'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 transition-colors group-hover:text-cyan-400" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        item.alert
                          ? 'bg-rose-950/50 text-rose-300 border-rose-800/60'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
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

        {/* Secondary / Admin Navigation */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest font-mono">
            System & Sources
          </div>
          <nav className="space-y-1">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-600 cursor-not-allowed opacity-60"
                  title="Planned Expansion Module"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  <span className="text-[9px] font-mono uppercase bg-slate-900 text-slate-600 px-1 rounded border border-slate-800">
                    Phase 3
                  </span>
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-slate-800/80 bg-[#0A0D14]">
        <div className="glass-panel p-2.5 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div>
              <div className="text-[11px] font-medium text-slate-200">Engine Connected</div>
              <div className="text-[9px] font-mono text-slate-400">10 Records Ingested</div>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        </div>
      </div>
    </aside>
  );
};
