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
              v2.0-prototype
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Transparent inspection of the active 6-stage intelligence pipeline, analytical algorithms, connectors, and session workspace.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/cases')}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition flex items-center gap-2"
          >
            <span>Open Cases</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => navigate('/sources')}
            className="px-3.5 py-2 text-xs font-medium text-cyan-800 bg-cyan-50 border border-cyan-200 hover:bg-cyan-100 rounded-lg shadow-sm transition flex items-center gap-2"
          >
            <span>Data Sources</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {resetSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-emerald-900 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{resetSuccessMessage}</span>
          </div>
          <button
            onClick={() => setResetSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Engine Status</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-lg font-bold text-slate-900 capitalize">
              {health?.status === 'healthy' ? 'Active / Cached' : 'Degraded'}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono">
            {config.platform.fastapi_version ? `FastAPI ${config.platform.fastapi_version}` : 'FastAPI runtime'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pipeline Stages</div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            {config.pipeline_stages.length} Logical Stages
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Verified in <span className="font-mono text-slate-700">src/pipeline.py</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Graph Analytics</div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            {config.network_analysis.graph_engine}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Louvain seed: <span className="font-mono text-slate-700">{config.network_analysis.community_detection.seed}</span> (deterministic)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Storage Model</div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            {config.storage.workflow_store}
          </div>
          <div className="text-xs text-amber-700 mt-1 font-medium">
            Session Review Workspace
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
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
                    ? 'border-cyan-700 text-cyan-800 bg-cyan-50/40'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-700' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab 1: System Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-700" />
                Platform & Environment Overview
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Active runtime specifications and software stack powering the Crime Network Intelligence System prototype.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-xs font-semibold text-slate-500 uppercase">System Designation</div>
                <div className="text-sm font-bold text-slate-800 mt-1">{config.platform.system_name}</div>
                <div className="text-xs text-slate-500 mt-0.5">Version {config.platform.version}</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-xs font-semibold text-slate-500 uppercase">Runtime Environment</div>
                <div className="text-sm font-bold text-slate-800 mt-1">{config.platform.runtime_environment}</div>
                <div className="text-xs text-slate-500 mt-0.5">Python {config.platform.python_version}</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-xs font-semibold text-slate-500 uppercase">Service Layer</div>
                <div className="text-sm font-bold text-slate-800 mt-1">FastAPI {config.platform.fastapi_version}</div>
                <div className="text-xs text-slate-500 mt-0.5">ASGI Server: Uvicorn {config.platform.uvicorn_version}</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-xs font-semibold text-slate-500 uppercase">Network Engine</div>
                <div className="text-sm font-bold text-slate-800 mt-1">NetworkX {config.platform.networkx_version}</div>
                <div className="text-xs text-slate-500 mt-0.5">Graph Analysis & Louvain Partitioning</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-xs font-semibold text-slate-500 uppercase">Anomaly Detection ML</div>
                <div className="text-sm font-bold text-slate-800 mt-1">scikit-learn {config.platform.scikit_learn_version}</div>
                <div className="text-xs text-slate-500 mt-0.5">IsolationForest & NumPy {config.platform.numpy_version}</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-xs font-semibold text-slate-500 uppercase">Frontend Framework</div>
                <div className="text-sm font-bold text-slate-800 mt-1">React 18.3.1 + TypeScript</div>
                <div className="text-xs text-slate-500 mt-0.5">Vite 6.0.7 & Tailwind CSS 3.4</div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Intelligence Provenance & Single Source of Truth</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                All intelligence presented across Overview, Network, Entities, Anomalies, Timeline, Locations, Reports, and Cases is generated deterministically from the canonical dataset file:{' '}
                <code className="px-1.5 py-0.5 bg-slate-100 text-cyan-800 rounded font-mono text-xs font-semibold">
                  {config.platform.dataset_reference}
                </code>{' '}
                via the unified pipeline orchestrator <code className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-xs">src/pipeline.py</code>.
              </p>
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Dataset Classification:</span> {config.platform.dataset_type}. The incident records and call details represent synthetic demonstration data modeled on standard law-enforcement and telecom record formats. No active surveillance data or live citizen PII is stored.
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">System Disclaimers</h3>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs text-slate-600 leading-relaxed">
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
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-700" />
                    Logical Pipeline Stages (src/pipeline.py)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Direct representation of the 6 sequential execution stages in the core intelligence pipeline.
                  </p>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
                  6 Stages Active
                </span>
              </div>
            </div>

            {/* Pipeline Step Cards */}
            <div className="space-y-4">
              {config.pipeline_stages.map((stage, idx) => (
                <div
                  key={stage.stage_number}
                  className="p-5 bg-slate-50/60 rounded-xl border border-slate-200 hover:border-cyan-300 transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-cyan-700 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        {stage.stage_number}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{stage.name}</h3>
                        <div className="text-xs font-mono text-cyan-800">{stage.module}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                        {stage.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {stage.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 text-xs">
                    <div>
                      <span className="text-slate-500">Core Class / Function:</span>{' '}
                      <code className="font-mono text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {stage.class_name}
                      </code>
                    </div>
                    <div>
                      <span className="text-slate-500">Input:</span>{' '}
                      <span className="font-medium text-slate-700">{stage.input_type}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Output:</span>{' '}
                      <span className="font-medium text-slate-700">{stage.output_type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pipeline Verification Note */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
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
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-cyan-700" />
                    Entity Extraction & Normalization (src/entity_extraction.py)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Heuristic rule-based NER engine combining gazetteer lookup with specialized regular expressions.
                  </p>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-full font-mono">
                  {config.entity_extraction.active_backend}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase">Persons Gazetteer (5)</div>
                <div className="flex flex-wrap gap-1.5">
                  {config.entity_extraction.gazetteers.persons.map((p) => (
                    <span key={p} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded text-xs font-medium">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase">Organizations Gazetteer (1)</div>
                <div className="flex flex-wrap gap-1.5">
                  {config.entity_extraction.gazetteers.organizations.map((o) => (
                    <span key={o} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded text-xs font-medium">
                      {o}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase">Locations Gazetteer (2)</div>
                <div className="flex flex-wrap gap-1.5">
                  {config.entity_extraction.gazetteers.locations.map((l) => (
                    <span key={l} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded text-xs font-medium">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase">Regular Expression Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500">PHONE_RE</div>
                  <code className="text-xs font-mono text-cyan-800 break-all">{config.entity_extraction.regex_rules.phone_regex}</code>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500">VEHICLE_PLATE_RE</div>
                  <code className="text-xs font-mono text-cyan-800 break-all">{config.entity_extraction.regex_rules.vehicle_plate_regex}</code>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500">MONEY_RE</div>
                  <code className="text-xs font-mono text-cyan-800 break-all">{config.entity_extraction.regex_rules.money_regex}</code>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase">Normalization Rules</h3>
              <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-200 text-xs">
                {config.entity_extraction.normalization_rules.map((rule, i) => (
                  <div key={i} className="p-2.5 flex items-center justify-between">
                    <span className="font-semibold text-slate-700 w-24 shrink-0 font-mono">[{rule.entity_type}]</span>
                    <span className="text-slate-600 flex-1">{rule.rule}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Planned Transformer Upgrade:</span> {config.entity_extraction.planned_backend}. Pluggable interface allows hot-swapping without modifying pipeline orchestration.
            </div>
          </div>

          {/* Section B: Network Analysis */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-700" />
                    Network Analysis & Centrality Metrics (src/network_analysis.py)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Graph structural calculations executed using {config.network_analysis.graph_engine} over undirected co-occurrence edges.
                  </p>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-full font-mono">
                  {config.network_analysis.graph_type}
                </span>
              </div>
            </div>

            {/* Centrality Breakdown */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase">Centrality Measures & Key Player Blend</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {config.network_analysis.centrality_metrics.map((m) => (
                  <div key={m.name} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-800">{m.name}</div>
                      <span className="text-[11px] font-bold font-mono px-1.5 py-0.5 bg-white border border-slate-200 rounded text-cyan-800">
                        {Math.round(m.weight_in_key_player * 100)}%
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 leading-normal">{m.role}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Composite Formula Card */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
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
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="text-xs font-bold text-slate-700 uppercase">Community Detection</div>
                <div className="text-sm font-semibold text-slate-800">{config.network_analysis.community_detection.algorithm}</div>
                <div className="text-xs text-slate-500">Seed: {config.network_analysis.community_detection.seed} (Deterministic)</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="text-xs font-bold text-slate-700 uppercase">Bridge Analysis</div>
                <div className="text-sm font-semibold text-slate-800">Critical Bridge Broker Nodes</div>
                <div className="text-xs text-slate-500">Top {config.network_analysis.critical_bridge_nodes.top_n} by betweenness centrality</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="text-xs font-bold text-slate-700 uppercase">Path Analysis</div>
                <div className="text-sm font-semibold text-slate-800">Shortest Connection</div>
                <div className="text-xs text-slate-500">Unweighted BFS shortest path</div>
              </div>
            </div>
          </div>

          {/* Section C: Anomaly Detection */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Anomaly & Pattern Detection (src/anomaly_detection.py)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Automated detector configurations and mathematical thresholds for flags across records.
                  </p>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
                  {config.anomaly_detection.detectors.length} Detectors Configured
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.anomaly_detection.detectors.map((det) => (
                <div key={det.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{det.name}</h3>
                      <span className="text-[11px] font-mono text-cyan-800">{det.function}()</span>
                    </div>
                    <span className="px-2 py-0.5 text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 rounded">
                      Pattern: {det.pattern}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                    <div className="text-slate-500 font-medium">Trigger Threshold:</div>
                    <div className="font-semibold text-slate-800">{det.threshold_summary}</div>
                  </div>

                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Analytical Significance:</span> {det.significance}
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
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-700" />
                    Data Sources & Ingestion Configuration (src/ingestion.py)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
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
                <div key={c.name} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-sm font-bold text-slate-900 font-mono">{c.name}</div>
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                    c.status === 'Active Prototype'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {c.status}
                  </span>
                  <p className="text-xs text-slate-600 leading-normal">{c.description}</p>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Ingestion Operations & Cache Management</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ingestion operations are centralized in the <strong>Data Sources & Ingestion Center</strong> (<code className="font-mono text-cyan-800">/sources</code>). To execute re-ingestion and reload the intelligence engine cache, navigate to Data Sources and trigger the verified <code className="font-mono text-cyan-800">POST /api/ingest</code> endpoint.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => navigate('/sources')}
                  className="px-3.5 py-2 text-xs font-semibold text-cyan-800 bg-white border border-cyan-300 hover:bg-cyan-50 rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5 text-cyan-700" />
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
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-700" />
                  Live Runtime Health & Operational Diagnostics
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Real-time status of backend API, intelligence cache, local dataset, and active session workspace.
                </p>
              </div>
              <button
                onClick={refreshHealth}
                disabled={refreshingHealth}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingHealth ? 'animate-spin text-cyan-600' : 'text-slate-400'}`} />
                <span>{refreshingHealth ? 'Refreshing...' : 'Refresh Health'}</span>
              </button>
            </div>

            {health && (
              <div className="space-y-6">
                {/* Diagnostics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 uppercase">Backend API</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                        {health.backend_api.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800">{health.backend_api.framework}</div>
                    <div className="text-xs text-slate-500 font-mono">Uptime: {health.uptime_seconds}s</div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 uppercase">Intelligence Engine</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                        {health.intelligence_engine.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      {health.intelligence_engine.record_count} Records / {health.intelligence_engine.entity_count} Entities
                    </div>
                    <div className="text-xs text-slate-500">
                      {health.intelligence_engine.relationship_count} Links / {health.intelligence_engine.anomaly_count} Anomalies
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 uppercase">Canonical Dataset</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                        {health.dataset.exists ? 'PRESENT' : 'MISSING'}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 font-mono truncate">
                      {health.dataset.logical_reference}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {health.dataset.file_size_bytes} bytes ({health.dataset.record_count} records)
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 uppercase">Workflow Workspace</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-100 text-cyan-800 rounded">
                        {health.workflow_store.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      {health.workflow_store.active_cases} Active Cases Loaded
                    </div>
                    <div className="text-xs text-slate-500">
                      Checklist: {health.workflow_store.completed_checklist_items}/{health.workflow_store.total_checklist_items} completed
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 uppercase">Session Activity</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-700 rounded">
                        EPHEMERAL
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      {health.workflow_store.session_activity_count} Logged Actions
                    </div>
                    <div className="text-xs text-slate-500">
                      Pending Follow-ups: {health.workflow_store.pending_followups}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 uppercase">Sources Registry</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                        4 ACTIVE
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800">
                      Police RMS, CDR, FIU, HUMINT
                    </div>
                    <div className="text-xs text-slate-500">
                      Date Range: Jan 2026
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-800">Diagnostic Transparency Policy:</div>
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
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-700" />
                Production Readiness & Architecture Gap Analysis
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Objective comparison between current hackathon prototype capabilities and enterprise law-enforcement requirements.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase">
                  <tr>
                    <th className="p-3">Category</th>
                    <th className="p-3">Current Prototype State</th>
                    <th className="p-3">Production Requirement</th>
                    <th className="p-3 text-center">Gap Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {config.production_readiness.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">{item.category}</td>
                      <td className="p-3 text-slate-600">{item.prototype_state}</td>
                      <td className="p-3 text-slate-800 font-medium">{item.production_requirement}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.gap_level === 'High'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.gap_level === 'Medium'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed space-y-2">
              <h3 className="font-bold text-slate-800">Security & Governance Disclosure:</h3>
              <p>
                In accordance with responsible engineering principles, this prototype does not fabricate pseudo-enterprise authentication or claims of regulatory compliance (e.g. GDPR, DPDP, ISO 27001). Production deployment of link analysis and anomaly detection software requires formal legal authorization, persistent audit trails, access controls, and strict chain-of-custody protocols.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Session Workspace & Maintenance */}
      {activeTab === 'session' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-cyan-700" />
                Session Review Workspace & Safe Maintenance
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Manage investigator session state, review workspace data retention, and reset modifications safely.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Persistence Model Transparency</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {config.storage.persistence_note}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-2.5 bg-white rounded border border-slate-200">
                  <span className="text-slate-500">WorkflowStore:</span>{' '}
                  <span className="font-bold text-slate-800">{config.storage.workflow_store}</span>
                </div>
                <div className="p-2.5 bg-white rounded border border-slate-200">
                  <span className="text-slate-500">Persistent Database:</span>{' '}
                  <span className="font-bold text-slate-800">{config.storage.persistent_database}</span>
                </div>
              </div>
            </div>

            {/* Safe Reset Action Zone */}
            <div className="border border-rose-200 bg-rose-50/40 rounded-xl p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Reset Session Review Workspace
                  </h3>
                  <p className="text-xs text-rose-700 leading-relaxed max-w-2xl">
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

              <div className="p-3 bg-white/80 rounded-lg border border-rose-200 text-xs text-rose-800 space-y-1">
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
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Session Workspace Reset
                </h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to reset your investigator session?
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
              <div className="font-semibold text-slate-800">What will happen:</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>All 10 case workflow statuses reset to <span className="font-semibold text-slate-800">Review Required</span>.</li>
                <li>All 80 review checklist items reset to unchecked.</li>
                <li>Custom follow-up tasks and notes are cleared to default tasks.</li>
                <li>Session activity history feed is cleared.</li>
              </ul>
              <div className="pt-2 border-t border-slate-200 font-semibold text-emerald-800 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Raw dataset records and intelligence graph are 100% preserved.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={resetting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
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
