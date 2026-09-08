import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  Database,
  Users,
  Share2,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Award,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client';
import { OverviewMetrics } from '../types';

export const Overview: React.FC = () => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Single API call for Overview data
      const data = await api.getOverview();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to FastAPI intelligence backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !metrics) {
    return (
      <div className="p-12 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-cyan-600 animate-spin mx-auto" />
        <div className="text-xs font-mono text-slate-500">Loading intelligence data stream...</div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-900 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>FastAPI Intelligence Server Connection Error</span>
          </div>
          <p className="text-xs text-rose-700">{error || 'Unable to fetch pipeline metrics.'}</p>
          <button
            onClick={loadData}
            className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-medium hover:bg-rose-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Entity Breakdown calculation from real backend data
  const entityCounts = metrics.nodes_by_type || {};
  const totalEnt = metrics.total_entities || 0;

  const entityTypesList = [
    { key: 'PERSON', label: 'Persons', count: entityCounts['PERSON'] || 0, color: '#E11D48' },
    { key: 'PHONE', label: 'Phone Numbers', count: entityCounts['PHONE'] || 0, color: '#6366F1' },
    { key: 'VEHICLE', label: 'Vehicles', count: entityCounts['VEHICLE'] || 0, color: '#D97706' },
    { key: 'LOCATION', label: 'Locations', count: entityCounts['LOCATION'] || 0, color: '#059669' },
    { key: 'ORG', label: 'Organizations', count: entityCounts['ORG'] || 0, color: '#2563EB' },
    { key: 'MONEY', label: 'Financial Assets', count: entityCounts['MONEY'] || 0, color: '#7C3AED' },
  ];

  // SVG Donut Chart calculation from real data
  let cumulativePercent = 0;
  const donutSlices = entityTypesList.map((item) => {
    const percent = totalEnt > 0 ? (item.count / totalEnt) * 100 : 0;
    const startAngle = (cumulativePercent / 100) * 360;
    cumulativePercent += percent;
    const endAngle = (cumulativePercent / 100) * 360;
    return { ...item, percent, startAngle, endAngle };
  });

  const recentActivityList = metrics.recent_activity || [];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[11px] font-semibold text-cyan-800 bg-cyan-50 px-2.5 py-0.5 rounded border border-cyan-200 uppercase tracking-wider">
              CNIS SECTION :: OVERVIEW
            </span>
            <span className="text-xs text-slate-500 font-mono">PHASE 2B REAL DATA ACTIVE</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Intelligence Overview</h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            High-level operational intelligence metrics, entity distribution, and key player rankings
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-mono font-medium shadow-2xs hover:border-slate-300 transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-700 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Operational Status Strip */}
      <div className="ui-panel p-4 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 shadow-panel">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">FastAPI Backend Intelligence Pipeline</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-soft-pulse"></span>
                Online
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              FastAPI REST Service &amp; Python Engine Connected
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 text-xs font-mono text-slate-600">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">API Status</span>
            <span className="font-semibold text-emerald-700">Healthy (200 OK)</span>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Graph Density</span>
            <span className="font-semibold text-slate-800">{metrics.density}</span>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Sources Connected</span>
            <span className="font-semibold text-slate-800">{metrics.sources_count} Feeds</span>
          </div>
        </div>
      </div>

      {/* KPI Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Ingested Records */}
        <div className="ui-panel p-5 rounded-xl bg-white border border-slate-200 shadow-panel hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
              Ingested Records
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center border border-cyan-100">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-slate-900">{metrics.total_records}</span>
            <span className="text-[10px] font-mono text-slate-400">{metrics.sources_count} Sources</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Validated case files &amp; call logs</p>
        </div>

        {/* Card 2: Graph Entities */}
        <div className="ui-panel p-5 rounded-xl bg-white border border-slate-200 shadow-panel hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
              Graph Entities
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-indigo-900">{metrics.total_entities}</span>
            <span className="text-[10px] font-mono text-slate-400">{Object.keys(metrics.nodes_by_type).length} Types</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Extracted structured nodes</p>
        </div>

        {/* Card 3: Graph Relationships */}
        <div className="ui-panel p-5 rounded-xl bg-white border border-slate-200 shadow-panel hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
              Graph Relationships
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center border border-cyan-100">
              <Share2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-cyan-900">{metrics.total_relationships}</span>
            <span className="text-[10px] font-mono text-slate-400">Weighted Edges</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Co-occurrence links</p>
        </div>

        {/* Card 4: Suspicious Patterns */}
        <div className="ui-panel p-5 rounded-xl bg-white border border-slate-200 shadow-panel hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
              Suspicious Patterns
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-rose-900">{metrics.suspicious_patterns_count}</span>
            <span className="text-[10px] font-mono text-slate-400">Flagged Anomalies</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Investigative leads identified</p>
        </div>
      </div>

      {/* Main Overview Grid (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Entity Distribution + Key Players */}
        <div className="lg:col-span-6 space-y-8">
          {/* Entity Type Distribution Card */}
          <div className="ui-panel p-6 rounded-xl bg-white border border-slate-200 shadow-panel">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Entity Type Distribution</h3>
                <p className="text-xs text-slate-500 mt-0.5">Breakdown of {totalEnt} extracted graph nodes</p>
              </div>
              <span className="text-[11px] font-mono text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                100% Real Data
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center pt-6">
              {/* Donut Visual Representation */}
              <div className="sm:col-span-5 flex justify-center">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#E2E8F0" strokeWidth="3.5" />
                    {donutSlices.map((slice, i) => {
                      const dashArray = `${slice.percent} ${100 - slice.percent}`;
                      let offset = 0;
                      for (let j = 0; j < i; j++) {
                        offset += donutSlices[j].percent;
                      }
                      const dashOffset = 100 - offset;
                      return (
                        <circle
                          key={slice.key}
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth="3.5"
                          strokeDasharray={dashArray}
                          strokeDashoffset={dashOffset}
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold font-mono text-slate-900">{totalEnt}</span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Entities</span>
                  </div>
                </div>
              </div>

              {/* Legend & Percentages List */}
              <div className="sm:col-span-7 space-y-2.5">
                {entityTypesList.map((item) => {
                  const pct = totalEnt > 0 ? Math.round((item.count / totalEnt) * 100) : 0;
                  return (
                    <div key={item.key} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-700 font-medium">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-slate-500 text-[11px]">{pct}%</span>
                        <span className="font-semibold text-slate-900 w-4 text-right">{item.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Key Players Leaderboard Card */}
          <div className="ui-panel p-6 rounded-xl bg-white border border-slate-200 shadow-panel">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-700" />
                <h3 className="text-sm font-bold text-slate-900">Key Network Influencers</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Composite Influence Score</span>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {metrics.top_key_players.map((player, idx) => (
                <div key={player.entity} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">{player.entity}</div>
                      <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                        <span>TYPE: {player.type}</span>
                        <span>•</span>
                        <span>Degree: {player.degree}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className="bg-cyan-600 h-full rounded-full"
                        style={{ width: `${Math.min(player.influence_score * 250, 100)}%` }}
                      />
                    </div>
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {player.influence_score.toFixed(4)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed + System Info */}
        <div className="lg:col-span-6 space-y-8">
          {/* Recent Operational Activity Card */}
          <div className="ui-panel p-6 rounded-xl bg-white border border-slate-200 shadow-panel">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-700" />
                <h3 className="text-sm font-bold text-slate-900">Recent Investigative Leads &amp; Flagged Events</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">From Case Files</span>
            </div>

            <div className="mt-4 space-y-4 max-h-[460px] overflow-y-auto pr-1">
              {recentActivityList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono">
                  No flagged events available.
                </div>
              ) : (
                recentActivityList.slice(0, 7).map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider">
                          {item.pattern.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {item.date ? (
                        <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {item.date}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          No date recorded
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-sans">{item.note}</p>
                    {item.entity && (
                      <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                        <span>Target Node: <strong className="text-slate-800">{item.entity}</strong></span>
                        {item.record_id && <span>Record: {item.record_id}</span>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pipeline Service Architecture Card */}
          <div className="ui-panel p-5 rounded-xl bg-cyan-950 text-white border border-cyan-900 shadow-panel">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold font-mono text-cyan-200 uppercase tracking-wider">
                    CNIS Pipeline Architecture
                  </h4>
                </div>
                <p className="text-xs text-slate-300">
                  Data flows directly from <code className="text-cyan-300 font-mono">src/pipeline.py</code> into memory cache for zero-latency investigative queries.
                </p>
              </div>
            </div>
            <div className="mt-4 p-2.5 rounded bg-cyan-900/60 border border-cyan-800 text-[10px] font-mono text-cyan-300 flex items-center justify-between">
              <span>GET /api/overview &bull; 200 OK</span>
              <span>Python 3.12 + FastAPI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
