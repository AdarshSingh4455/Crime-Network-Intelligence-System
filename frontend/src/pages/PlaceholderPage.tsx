import React, { useEffect, useState } from 'react';
import { Shield, Activity, Database, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { OverviewMetrics } from '../types';

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  sectionCode: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  subtitle,
  sectionCode,
}) => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOverview();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to communicate with FastAPI intelligence backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [sectionCode]);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30 uppercase tracking-widest">
              CNIS SECTION :: {sectionCode}
            </span>
            <span className="text-xs text-slate-500 font-mono">PHASE 2A FOUNDATION</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-1">{title}</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">{subtitle}</p>
        </div>

        <button
          onClick={fetchOverview}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh API Stream</span>
        </button>
      </div>

      {/* API Connectivity & Engine Status Card */}
      <div className="glass-panel p-6 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border ${error ? 'bg-rose-950/40 border-rose-800 text-rose-400' : 'bg-emerald-950/40 border-emerald-800 text-emerald-400'}`}>
              {error ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                FastAPI Backend Intelligence Pipeline Status
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {loading ? 'Connecting to FastAPI endpoint...' : error ? `API Error: ${error}` : 'FastAPI REST Service & Python Engine Connected'}
              </p>
            </div>
          </div>
          {!loading && !error && (
            <span className="px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
              ONLINE • 200 OK
            </span>
          )}
        </div>

        {/* Live Metrics Grid */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
            <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Ingested Records</div>
              <div className="text-xl font-bold font-mono text-slate-100 mt-1">{metrics.total_records}</div>
            </div>
            <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Graph Entities</div>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-1">{metrics.total_entities}</div>
            </div>
            <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Graph Relationships</div>
              <div className="text-xl font-bold font-mono text-indigo-400 mt-1">{metrics.total_relationships}</div>
            </div>
            <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Suspicious Patterns</div>
              <div className="text-xl font-bold font-mono text-rose-400 mt-1">{metrics.suspicious_patterns_count}</div>
            </div>
          </div>
        )}
      </div>

      {/* Module Workspace Container */}
      <div className="glass-panel p-12 rounded-xl text-center space-y-4 border-dashed border-slate-800">
        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-200">
            {title} Module Workspace Ready
          </h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            The Phase 2A Application Shell, Routing, and FastAPI Intelligence API service layer are active. Implementation for this module will follow in the next phase.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span>Source: Python Engine (`src/pipeline.py`) -&gt; FastAPI (`/api/${sectionCode.toLowerCase()}`)</span>
        </div>
      </div>
    </div>
  );
};
