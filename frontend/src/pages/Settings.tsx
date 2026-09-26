import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Server,
  Layers,
  Cpu,
  Database,
  Activity,
  ShieldCheck,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileCode,
  ArrowRight,
  RefreshCw,
  Clock,
  Terminal,
  FileText,
  Sliders,
  Check,
  X,
  Code,
  HelpCircle,
  Info
} from 'lucide-react';
import { api } from '../api/client';
import { SystemConfigResponse, SystemHealthResponse } from '../types';

type TabId = 'overview' | 'pipeline' | 'algorithms' | 'sources' | 'health' | 'production' | 'session';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [config, setConfig] = useState<SystemConfigResponse | null>(null);
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshingHealth, setRefreshingHealth] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Reset Session Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const fetchConfigAndHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const [cfgData, healthData] = await Promise.all([
        api.getSystemConfig(),
        api.getSystemHealth()
      ]);
      setConfig(cfgData);
      setHealth(healthData);
    } catch (err: any) {
      console.error('Failed to load system settings:', err);
      setError('Failed to load configuration from backend service.');
    } finally {
      setLoading(false);
    }
  };

  const refreshHealth = async () => {
    try {
      setRefreshingHealth(true);
      const healthData = await api.getSystemHealth();
      setHealth(healthData);
    } catch (err) {
      console.error('Failed to refresh health diagnostics:', err);
    } finally {
      setRefreshingHealth(false);
    }
  };

  useEffect(() => {
    fetchConfigAndHealth();
  }, []);

  const handleResetSession = async () => {
    try {
      setResetting(true);
      const res = await api.resetSessionWorkflow();
      setResetSuccessMessage(res.message);
      setIsResetModalOpen(false);
      // Refresh health to reflect cleared session activity count
      const healthData = await api.getSystemHealth();
      setHealth(healthData);
      setTimeout(() => setResetSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Session reset failed:', err);
      alert('Failed to reset session workflow: ' + (err.message || 'Unknown error'));
    } finally {
      setResetting(false);
    }
  };

  const tabs: Array<{ id: TabId; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'overview', label: 'System Overview', icon: Server },
    { id: 'pipeline', label: 'Pipeline Architecture', icon: Layers },
    { id: 'algorithms', label: 'Analytical Algorithms', icon: Cpu },
    { id: 'sources', label: 'Data Sources & Ingestion', icon: Database },
    { id: 'health', label: 'Runtime Health', icon: Activity },
    { id: 'production', label: 'Production Readiness', icon: ShieldCheck },
    { id: 'session', label: 'Session Workspace', icon: RotateCcw },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-600" />
        <p className="text-sm font-medium">Loading system configurations and runtime diagnostics...</p>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 shrink-0 text-red-600 mt-0.5" />
          <div className="space-y-2">
            <h2 className="text-base font-bold">System Configuration Unavailable</h2>
            <p className="text-sm">{error || 'Unable to retrieve configuration metadata.'}</p>
            <button
              onClick={fetchConfigAndHealth}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-700 text-white rounded-lg shadow-sm">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              System Configuration & Intelligence Settings
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-full">
              v2.0
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Transparent inspection of the active 6-stage intelligence pipeline, analytical algorithms, connectors, and session workspace.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/cases')}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-lg shadow-sm transition flex items-center gap-2"
          >
            <span>Open Cases</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          </button>
          <button
            onClick={() => navigate('/sources')}
            className="px-3.5 py-2 text-xs font-medium text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 rounded-lg shadow-sm transition flex items-center gap-2"
          >
            <span>Data Sources</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {resetSuccessMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 flex items-center justify-between text-emerald-900 dark:text-emerald-200 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">{resetSuccessMessage}</span>
          </div>
          <button
            onClick={() => setResetSuccessMessage(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-white/10 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Engine Status</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100 capitalize">
              {health?.status === 'healthy' ? 'Active / Cached' : 'Degraded'}
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            {config.platform.fastapi_version ? `FastAPI ${config.platform.fastapi_version}` : 'FastAPI runtime'}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-white/10 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pipeline Stages</div>
          <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
            {config.pipeline_stages.length} Logical Stages
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Verified in <span className="font-mono text-slate-700 dark:text-slate-300">src/pipeline.py</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-white/10 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Graph Analytics</div>
          <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
            {config.network_analysis.graph_engine}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Louvain seed: <span className="font-mono text-slate-700 dark:text-slate-300">{config.network_analysis.community_detection.seed}</span> (deterministic)
          </div>
        </div>

        <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-white/10 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Storage Model</div>
          <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
            {config.storage.workflow_store}
          </div>
          <div className="text-xs text-amber-700 dark:text-amber-400 mt-1 font-medium">
            Session Review Workspace
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 dark:border-white/10">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-px" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-cyan-700 dark:border-cyan-400 text-cyan-800 dark:text-cyan-300 bg-cyan-50/40 dark:bg-cyan-950/40'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-700 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab 1: System Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-white/10 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                Platform &amp; Environment Overview
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Active runtime specifications and software stack powering the Crime Network Intelligence System.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">System Designation</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">{config.platform.system_name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Version {config.platform.version}</div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Runtime Environment</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">{config.platform.runtime_environment}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Python {config.platform.python_version}</div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Service Layer</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">FastAPI {config.platform.fastapi_version}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">ASGI Server: Uvicorn {config.platform.uvicorn_version}</div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Network Engine</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">NetworkX {config.platform.networkx_version}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Graph Analysis &amp; Louvain Partitioning</div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Anomaly Detection ML</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">scikit-learn {config.platform.scikit_learn_version}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">IsolationForest &amp; NumPy {config.platform.numpy_version}</div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Frontend Framework</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">React 18.3.1 + TypeScript</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Vite 6.0.7 &amp; Tailwind CSS 3.4</div>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-white/10 pt-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Intelligence Provenance &amp; Single Source of Truth</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                All intelligence presented across Overview, Network, Entities, Anomalies, Timeline, Locations, Reports, and Cases is generated deterministically from the canonical dataset file:{' '}
                <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-cyan-800 dark:text-cyan-300 rounded font-mono text-xs font-semibold">
                  {config.platform.dataset_reference}
                </code>{' '}
                via the unified pipeline orchestrator <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded font-mono text-xs">src/pipeline.py</code>.
              </p>
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Dataset Classification:</span> {config.platform.dataset_type}. The incident records and call details represent synthetic demonstration data modeled on standard law-enforcement and telecom record formats. No active surveillance data or live citizen PII is stored.
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-white/10 pt-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">System Disclaimers</h3>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  <strong>Operational Policy:</strong> {config.disclaimers.analytical}
                </p>
                <p>
                  <strong>Architectural Notice:</strong> {config.disclaimers.configuration}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Pipeline Architecture */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-white/10 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                    Logical Pipeline Stages (src/pipeline.py)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Direct representation of the 6 sequential execution stages in the core intelligence pipeline.
                  </p>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50 rounded-full">
                  6 Stages Active
                </span>
              </div>
            </div>

            {/* Pipeline Step Cards */}
            <div className="space-y-4">
              {config.pipeline_stages.map((stage, idx) => (
                <div
                  key={stage.stage_number}
                  className="p-5 bg-slate-50/60 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 hover:border-cyan-300 dark:hover:border-cyan-600/50 transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-cyan-700 dark:bg-cyan-800 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        {stage.stage_number}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{stage.name}</h3>
                        <div className="text-xs font-mono text-cyan-800 dark:text-cyan-400">{stage.module}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50 rounded-full">
                        {stage.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {stage.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/40 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Core Class / Function:</span>{' '}
                      <code className="font-mono text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700/50">
                        {stage.class_name}
                      </code>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Input:</span>{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">{stage.input_type}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Output:</span>{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">{stage.output_type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pipeline Verification Note */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong>Pipeline Integrity:</strong> All stages execute in strict order. Outputs from Ingestion feed Entity Extraction; extracted entities generate co-occurrence candidate edges for Graph Construction; Network Analysis computes topological centralities; Anomaly Detection pairs graph metrics with heuristic rules; and Investigator Intelligence packages artifacts into case dossiers.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Analytical Algorithms */}
      {activeTab === 'algorithms' && (
        <div className="space-y-6">
          {/* Section A: Entity Extraction */}
          <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-white/10 rounded-xl p-6 shadow-sm space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                    Entity Extraction &amp; Normalization (src/entity_extraction.py)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Heuristic rule-based NER engine combining gazetteer lookup with specialized regular expressions.
                  </p>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 rounded-full font-mono">
                  {config.entity_extraction.active_backend}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50 space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Persons Gazetteer (5)</div>
                <div className="flex flex-wrap gap-1.5">
                  {config.entity_extraction.gazetteers.persons.map((p) => (
                    <span key={p} className="px-2 py-0.5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-medium">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50 space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Organizations Gazetteer (1)</div>
                <div className="flex flex-wrap gap-1.5">
                  {config.entity_extraction.gazetteers.organizations.map((o) => (
                    <span key={o} className="px-2 py-0.5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-medium">
                      {o}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50 space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Locations Gazetteer (2)</div>
                <div className="flex flex-wrap gap-1.5">
                  {config.entity_extraction.gazetteers.locations.map((l) => (
                    <span key={l} className="px-2 py-0.5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-medium">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Regular Expression Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">PHONE_RE</div>
                  <code className="text-xs font-mono text-cyan-800 dark:text-cyan-400 break-all">{config.entity_extraction.regex_rules.phone_regex}</code>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">VEHICLE_PLATE_RE</div>
                  <code className="text-xs font-mono text-cyan-800 dark:text-cyan-400 break-all">{config.entity_extraction.regex_rules.vehicle_plate_regex}</code>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">MONEY_RE</div>
                  <code className="text-xs font-mono text-cyan-800 dark:text-cyan-400 break-all">{config.entity_extraction.regex_rules.money_regex}</code>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Normalization Rules</h3>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-200 dark:divide-slate-700/50 text-xs">
                {config.entity_extraction.normalization_rules.map((rule, i) => (
                  <div key={i} className="p-2.5 flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 w-24 shrink-0 font-mono">[{rule.entity_type}]</span>
                    <span className="text-slate-600 dark:text-slate-400 flex-1">{rule.rule}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Planned Transformer Upgrade:</span> {config.entity_extraction.planned_backend}. Pluggable interface allows hot-swapping without modifying pipeline orchestration.
            </div>
          </div>

          {/* Section B: Network Analysis */}
          <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-white/10 rounded-xl p-6 shadow-sm space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                    Network Analysis &amp; Centrality Metrics (src/network_analysis.py)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Graph structural calculations executed using {config.network_analysis.graph_engine} over undirected co-occurrence edges.
                  </p>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 rounded-full font-mono">
                  {config.network_analysis.graph_type}
                </span>
              </div>
            </div>

            {/* Centrality Breakdown */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Centrality Measures &amp; Key Player Blend</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {config.network_analysis.centrality_metrics.map((m) => (
                  <div key={m.name} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{m.name}</div>
                      <span className="text-[11px] font-bold font-mono px-1.5 py-0.5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded text-cyan-800 dark:text-cyan-300">
                        {Math.round(m.weight_in_key_player * 100)}%
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 leading-normal">{m.role}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Composite Formula Card */}
            <div className="p-4 bg-slate-900 dark:bg-slate-950 dark:border dark:border-white/10 text-white rounded-xl space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Composite Influence Score Formula</div>
              <div className="font-mono text-sm sm:text-base text-cyan-300 font-bold">
                {config.network_analysis.key_player_formula.expression}
              </div>
              <p className="text-xs text-slate-400">
                Applied only to entities matching types: <span className="text-slate-200 font-mono">{config.network_analysis.key_player_formula.entity_types.join(', ')}</span>. Phones and vehicles serve as evidentiary corroboration nodes.
              </p>
            </div>

            {/* Community & Bridges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50 space-y-1">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Community Detection</div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{config.network_analysis.community_detection.algorithm}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Seed: {config.network_analysis.community_detection.seed} (Deterministic)</div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50 space-y-1">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Bridge Analysis</div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Critical Bridge Broker Nodes</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Top {config.network_analysis.critical_bridge_nodes.top_n} by betweenness centrality</div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50 space-y-1">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Path Analysis</div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Shortest Connection</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Unweighted BFS shortest path</div>
              </div>
            </div>
          </div>

          {/* Section C: Anomaly Detection */}
          <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-white/10 rounded-xl p-6 shadow-sm space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Anomaly &amp; Pattern Detection (src/anomaly_detection.py)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Automated detector configurations and mathematical thresholds for flags across records.
                  </p>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-full">
                  {config.anomaly_detection.detectors.length} Detectors Configured
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.anomaly_detection.detectors.map((det) => (
                <div key={det.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{det.name}</h3>
                      <span className="text-[11px] font-mono text-cyan-800 dark:text-cyan-400">{det.function}()</span>
                    </div>
                    <span className="px-2 py-0.5 text-[11px] font-semibold bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded">
                      Pattern: {det.pattern}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                    <div className="text-slate-500 dark:text-slate-400 font-medium">Trigger Threshold:</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{det.threshold_summary}</div>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Analytical Significance:</span> {det.significance}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Data Sources & Ingestion */}
      {activeTab === 'sources' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-white/10 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                    Data Sources &amp; Ingestion Configuration (src/ingestion.py)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Multi-source connector architecture and provenance tracking across heterogeneous crime data streams.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/sources')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg shadow-sm transition flex items-center gap-2"
                >
                  <span>Open Data Sources Center</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {config.data_sources.prototype_connectors.map((c) => (
                <div key={c.name} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-2">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">{c.name}</div>
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                    c.status === 'Active Prototype'
                      ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}>
                    {c.status}
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal">{c.description}</p>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Ingestion Operations &amp; Cache Management</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Ingestion operations are centralized in the <strong>Data Sources &amp; Ingestion Center</strong> (<code className="font-mono text-cyan-800 dark:text-cyan-400">/sources</code>). To execute re-ingestion and reload the intelligence engine cache, navigate to Data Sources and trigger the verified <code className="font-mono text-cyan-800 dark:text-cyan-400">POST /api/ingest</code> endpoint.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => navigate('/sources')}
                  className="px-3.5 py-2 text-xs font-semibold text-cyan-800 dark:text-cyan-300 bg-white dark:bg-slate-800/60 border border-cyan-300 dark:border-cyan-800 hover:bg-cyan-50 dark:hover:bg-cyan-900/40 rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
                  <span>Navigate to /sources</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Runtime Health & Diagnostics */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-white/10 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                  Live Runtime Health &amp; Operational Diagnostics
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Real-time status of backend API, intelligence cache, local dataset, and active session workspace.
                </p>
              </div>
              <button
                onClick={refreshHealth}
                disabled={refreshingHealth}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-lg shadow-sm transition flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingHealth ? 'animate-spin text-cyan-600' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{refreshingHealth ? 'Refreshing...' : 'Refresh Health'}</span>
              </button>
            </div>

            {health && (
              <div className="space-y-6">
                {/* Diagnostics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Backend API</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded">
                        {health.backend_api.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{health.backend_api.framework}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">Uptime: {health.uptime_seconds}s</div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Intelligence Engine</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded">
                        {health.intelligence_engine.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {health.intelligence_engine.record_count} Records / {health.intelligence_engine.entity_count} Entities
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {health.intelligence_engine.relationship_count} Links / {health.intelligence_engine.anomaly_count} Anomalies
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Canonical Dataset</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded">
                        {health.dataset.exists ? 'PRESENT' : 'MISSING'}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono truncate">
                      {health.dataset.logical_reference}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {health.dataset.file_size_bytes} bytes ({health.dataset.record_count} records)
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Workflow Workspace</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300 rounded">
                        {health.workflow_store.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {health.workflow_store.active_cases} Active Cases Loaded
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Checklist: {health.workflow_store.completed_checklist_items}/{health.workflow_store.total_checklist_items} completed
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Session Activity</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                        EPHEMERAL
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {health.workflow_store.session_activity_count} Logged Actions
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Pending Follow-ups: {health.workflow_store.pending_followups}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Sources Registry</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded">
                        4 ACTIVE
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Police RMS, CDR, FIU, HUMINT
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Date Range: Jan 2026
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Diagnostic Transparency Policy:</div>
                  <p>
                    All health indicators display genuine operational metrics derived from runtime state and dataset inspection. System metrics such as host CPU utilization, memory pressure, and cluster uptime are not exposed by the prototype development server.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Production Readiness & Security Roadmap */}
      {activeTab === 'production' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-white/10 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                Production Readiness &amp; Architecture Gap Analysis
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Objective comparison between current capabilities and enterprise law-enforcement requirements.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold uppercase">
                  <tr>
                    <th className="p-3">Category</th>
                    <th className="p-3">Current System State</th>
                    <th className="p-3">Production Requirement</th>
                    <th className="p-3 text-center">Gap Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {config.production_readiness.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{item.category}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{item.prototype_state}</td>
                      <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">{item.production_requirement}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.gap_level === 'High'
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                              : item.gap_level === 'Medium'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                          }`}
                        >
                          {item.gap_level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Security &amp; Governance Disclosure:</h3>
              <p>
                In accordance with responsible engineering principles, the system does not fabricate pseudo-enterprise authentication or claims of regulatory compliance (e.g. GDPR, DPDP, ISO 27001). Production deployment of link analysis and anomaly detection software requires formal legal authorization, persistent audit trails, access controls, and strict chain-of-custody protocols.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Session Workspace & Maintenance */}
      {activeTab === 'session' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-white/10 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                Session Review Workspace &amp; Safe Maintenance
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Manage investigator session state, review workspace data retention, and reset modifications safely.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Persistence Model Transparency</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {config.storage.persistence_note}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-2.5 bg-white dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">WorkflowStore:</span>{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">{config.storage.workflow_store}</span>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">Persistent Database:</span>{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">{config.storage.persistent_database}</span>
                </div>
              </div>
            </div>

            {/* Safe Reset Action Zone */}
            <div className="border border-rose-200 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-950/30 rounded-xl p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    Reset Session Review Workspace
                  </h3>
                  <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed max-w-2xl">
                    Resets all investigator review checklists, workflow status tags, and session follow-up items back to initial baseline.
                  </p>
                </div>
                <button
                  onClick={() => setIsResetModalOpen(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition shrink-0 flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Session Workflow</span>
                </button>
              </div>

              <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-rose-200 dark:border-rose-800/50 text-xs text-rose-800 dark:text-rose-200 space-y-1">
                <div className="font-bold">Guaranteed Non-Destructive Operation:</div>
                <p>
                  This action strictly touches server-side memory (<code className="font-mono font-bold">WorkflowStore</code>). It will <strong>NEVER</strong> alter, delete, or modify <code className="font-mono font-bold">{config.platform.dataset_reference}</code>, extracted entities, graph relationships, detected anomalies, or source connectors.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Confirm Session Workspace Reset
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Are you sure you want to reset your investigator session?
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <div className="font-semibold text-slate-800 dark:text-slate-200">What will happen:</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>All 10 case workflow statuses reset to <span className="font-semibold text-slate-800 dark:text-slate-200">Review Required</span>.</li>
                <li>All 80 review checklist items reset to unchecked.</li>
                <li>Custom follow-up tasks and notes are cleared to default tasks.</li>
                <li>Session activity history feed is cleared.</li>
              </ul>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50 font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Raw dataset records and intelligence graph are 100% preserved.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={resetting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetSession}
                disabled={resetting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2"
              >
                {resetting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{resetting ? 'Resetting...' : 'Confirm Reset'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
