import React, { useEffect, useState } from 'react';
import { Shield, CheckCircle2, AlertCircle, RefreshCw, Database } from 'lucide-react';
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[11px] font-semibold text-cyan-800 bg-cyan-50 px-2.5 py-0.5 rounded border border-cyan-200 uppercase tracking-wider">
              CNIS SECTION :: {sectionCode}
            </span>
            <span className="text-xs text-slate-500 font-mono">PHASE 2 ENGINE ACTIVE</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{title}</h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">{subtitle}</p>
        </div>

        <button
          onClick={fetchOverview}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-mono font-medium shadow-2xs hover:border-slate-300 transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-700 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data Stream</span>
        </button>
      </div>

      {/* API Connectivity & Engine Status Card */}
      <div className="ui-panel p-6 rounded-xl bg-white border border-slate-200 shadow-panel space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className={`p-2.5 rounded-lg border ${
                error
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-600'
              }`}
            >
              {error ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                FastAPI Backend Intelligence Pipeline Status
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {loading
                  ? 'Connecting to FastAPI endpoint...'
                  : error
                  ? `API Error: ${error}`
                  : 'FastAPI REST Service & Python Engine Connected'}
              </p>
            </div>
          </div>
          {!loading && !error && (
            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-semibold">
              ONLINE • 200 OK
            </span>
          )}
        </div>

        {/* Live Metrics Grid */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Ingested Records</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">{metrics.total_records}</div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Graph Entities</div>
              <div className="text-xl font-bold font-mono text-cyan-800 mt-1">{metrics.total_entities}</div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Graph Relationships</div>
              <div className="text-xl font-bold font-mono text-indigo-800 mt-1">{metrics.total_relationships}</div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Suspicious Patterns</div>
              <div className="text-xl font-bold font-mono text-rose-700 mt-1">{metrics.suspicious_patterns_count}</div>
            </div>
          </div>
        )}
      </div>

      {/* Module Workspace Container */}
      <div className="ui-panel p-12 rounded-xl bg-white text-center space-y-4 border-dashed border-slate-300">
        <div className="w-12 h-12 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700 mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">
            {title} Workspace Configured
          </h3>
          <p className="text-xs text-slate-600 max-w-lg mx-auto">
            The Phase 2 Light Theme Shell, Navigation, and FastAPI Intelligence API service layer are active. Data for this module is available and ready for visual rendering.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600">
          <Database className="w-3.5 h-3.5 text-cyan-700" />
          <span>Source Engine: `src/pipeline.py` -&gt; FastAPI `/api/{sectionCode.toLowerCase()}`</span>
        </div>
      </div>
    </div>
  );
};
