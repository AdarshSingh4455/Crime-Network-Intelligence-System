import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Compass,
  Search,
  Share2,
  GitFork,
  ArrowRight,
  AlertTriangle,
  FileText,
  Clock,
  Shield,
  Layers,
  MapPin,
  Briefcase,
  Users,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Info,
  Calendar,
  Filter,
  Check,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';
import {
  InvestigationResponse,
  InvestigationPathResponse,
  InvestigationRelationship,
  CaseItem,
  LocationItem,
  SuspiciousPattern,
  NetworkNode,
} from '../types';

export const Investigation: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Target selection state
  const targetTypeParam = (searchParams.get('target_type') || searchParams.get('type') || 'case').toLowerCase();
  const targetIdParam =
    searchParams.get('target_id') ||
    searchParams.get('case') ||
    searchParams.get('entity') ||
    searchParams.get('location') ||
    searchParams.get('anomaly') ||
    searchParams.get('id') ||
    'CR-1001';
  const temporalWindowParam = searchParams.get('temporal_window') || searchParams.get('window') || 'all';

  const [targetType, setTargetType] = useState<string>(targetTypeParam);
  const [targetId, setTargetId] = useState<string>(targetIdParam);
  const [temporalWindow, setTemporalWindow] = useState<string>(temporalWindowParam);

  // Investigation Dossier state
  const [dossier, setDossier] = useState<InvestigationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Reference lists for dropdown selection
  const [availableCases, setAvailableCases] = useState<CaseItem[]>([]);
  const [availableEntities, setAvailableEntities] = useState<NetworkNode[]>([]);
  const [availableLocations, setAvailableLocations] = useState<LocationItem[]>([]);
  const [availableAnomalies, setAvailableAnomalies] = useState<SuspiciousPattern[]>([]);

  // Path Analysis tool state
  const [pathStart, setPathStart] = useState<string>('Ravi Malhotra');
  const [pathEnd, setPathEnd] = useState<string>('Vikram Rao');
  const [pathResult, setPathResult] = useState<InvestigationPathResponse | null>(null);
  const [pathLoading, setPathLoading] = useState<boolean>(false);
  const [pathError, setPathError] = useState<string | null>(null);

  // Initial reference lists load
  useEffect(() => {
    const loadReferences = async () => {
      try {
        const [casesRes, entitiesRes, locsRes, anomsRes] = await Promise.all([
          api.getCases(),
          api.getEntities(),
          api.getLocations(),
          api.getAnomalies(),
        ]);
        setAvailableCases(casesRes.cases || []);
        setAvailableEntities(entitiesRes || []);
        setAvailableLocations(locsRes || []);
        setAvailableAnomalies(anomsRes || []);
      } catch (e) {
        console.error('Failed to load investigation reference options:', e);
      }
    };
    loadReferences();
  }, []);

  // Sync state from URL params
  useEffect(() => {
    const newType = (searchParams.get('target_type') || searchParams.get('type') || 'case').toLowerCase();
    const newId =
      searchParams.get('target_id') ||
      searchParams.get('case') ||
      searchParams.get('entity') ||
      searchParams.get('location') ||
      searchParams.get('anomaly') ||
      searchParams.get('id') ||
      'CR-1001';
    const newWindow = searchParams.get('temporal_window') || searchParams.get('window') || 'all';

    setTargetType(newType);
    setTargetId(newId);
    setTemporalWindow(newWindow);
  }, [searchParams]);

  // Fetch dossier when target or temporal window changes
  useEffect(() => {
    const fetchDossier = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getInvestigation(targetType, targetId, temporalWindow);
        setDossier(data);

        // If target is entity and path start empty, pre-fill
        if (targetType === 'entity') {
          setPathStart(targetId);
        }
      } catch (err: any) {
        console.error('Failed to load investigation dossier:', err);
        setError(
          err?.response?.data?.detail ||
            `Target '${targetId}' of type '${targetType}' was not found in active intelligence records.`
        );
        setDossier(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDossier();
  }, [targetType, targetId, temporalWindow]);

  // Update URL params
  const updateInvestigationTarget = (type: string, id: string, window: string = temporalWindow) => {
    setTargetType(type);
    setTargetId(id);
    setTemporalWindow(window);
    setSearchParams({
      target_type: type,
      target_id: id,
      temporal_window: window,
    });
  };

  // Run path analysis
  const handleAnalyzePath = async () => {
    if (!pathStart || !pathEnd) return;
    try {
      setPathLoading(true);
      setPathError(null);
      const res = await api.getPathAnalysis(pathStart, pathEnd);
      setPathResult(res);
    } catch (err: any) {
      console.error('Path analysis failed:', err);
      setPathError(err?.response?.data?.detail || 'Failed to compute network path between selected entities.');
      setPathResult(null);
    } finally {
      setPathLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-[#F8FAFC] pb-16">
      {/* ─── TOP CONTROL BAR ─── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Title & Badge */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-700 text-white flex items-center justify-center shadow-xs">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                    Investigation Command Workspace
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">
                    Phase 3E Intelligence
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Targeted multi-vector analysis • Shortest path corroboration • Observed cross-case overlap
                </p>
              </div>
            </div>

            {/* Target Selectors & Temporal Filter */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Target Type Selector */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                {(['case', 'entity', 'location', 'anomaly'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      let defaultId = 'CR-1001';
                      if (t === 'entity') defaultId = 'Ravi Malhotra';
                      if (t === 'location') defaultId = 'Andheri Warehouse';
                      if (t === 'anomaly') defaultId = 'ANOM-001';
                      updateInvestigationTarget(t, defaultId);
                    }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      targetType === t
                        ? 'bg-white text-cyan-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {/* Target ID Dropdown */}
              <div className="relative">
                {targetType === 'case' && (
                  <select
                    value={targetId}
                    onChange={(e) => updateInvestigationTarget('case', e.target.value)}
                    className="text-xs font-mono font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-2xs"
                  >
                    {availableCases.map((c) => (
                      <option key={c.case_id} value={c.case_id}>
                        {c.case_id}: {c.short_title}
                      </option>
                    ))}
                  </select>
                )}
                {targetType === 'entity' && (
                  <select
                    value={targetId}
                    onChange={(e) => updateInvestigationTarget('entity', e.target.value)}
                    className="text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-2xs"
                  >
                    {availableEntities.map((ent) => (
                      <option key={ent.id} value={ent.id}>
                        {ent.id} ({ent.type})
                      </option>
                    ))}
                  </select>
                )}
                {targetType === 'location' && (
                  <select
                    value={targetId}
                    onChange={(e) => updateInvestigationTarget('location', e.target.value)}
                    className="text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-2xs"
                  >
                    {availableLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.id} ({l.record_count} records)
                      </option>
                    ))}
                  </select>
                )}
                {targetType === 'anomaly' && (
                  <select
                    value={targetId}
                    onChange={(e) => updateInvestigationTarget('anomaly', e.target.value)}
                    className="text-xs font-mono font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-2xs"
                  >
                    {availableAnomalies.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.id} ({a.pattern})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Temporal Window Filter */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-0.5 rounded-lg">
                <span className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Window:
                </span>
                {(
                  [
                    { id: 'all', label: 'All Dates' },
                    { id: '24h', label: '24 Hours' },
                    { id: '48h', label: '48 Hours' },
                    { id: '7d', label: '7 Days' },
                  ] as const
                ).map((w) => (
                  <button
                    key={w.id}
                    onClick={() => updateInvestigationTarget(targetType, targetId, w.id)}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-all ${
                      temporalWindow === w.id
                        ? 'bg-cyan-700 text-white font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT CONTAINER ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="py-20 text-center space-y-4">
            <div className="w-10 h-10 border-3 border-cyan-700 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Synthesizing Investigation Dossier...</p>
            <p className="text-xs text-slate-400">
              Querying intelligence graph, computing pairwise relationships, and evaluating cross-case overlap
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
            <h3 className="text-base font-bold text-rose-900">Target Investigation Error</h3>
            <p className="text-xs text-rose-700 max-w-lg mx-auto">{error}</p>
            <button
              onClick={() => updateInvestigationTarget('case', 'CR-1001')}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg transition-colors"
            >
              Reset to Primary Case CR-1001
            </button>
          </div>
        )}

        {/* Dossier Ready */}
        {!loading && dossier && (
          <>
            {/* ─── SECTION 1: INVESTIGATION SUMMARY BANNER ─── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-100 text-cyan-800 border border-cyan-200 uppercase">
                      {dossier.target.type} TARGET
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-500">
                      ID: {dossier.target.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {dossier.target.category}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{dossier.summary.target_label}</h2>
                </div>

                {/* Direct Cross-Module Links */}
                <div className="flex items-center gap-2 flex-wrap">
                  {dossier.target.type === 'case' && (
                    <button
                      onClick={() => navigate(`/cases?id=${encodeURIComponent(dossier.target.id)}`)}
                      className="px-3 py-1.5 text-xs font-semibold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      View Case Dossier
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                  {dossier.target.type === 'entity' && (
                    <button
                      onClick={() => navigate(`/network?focus=${encodeURIComponent(dossier.target.id)}`)}
                      className="px-3 py-1.5 text-xs font-semibold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Focus in Network
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                  {dossier.target.type === 'location' && (
                    <button
                      onClick={() => navigate(`/locations?id=${encodeURIComponent(dossier.target.id)}`)}
                      className="px-3 py-1.5 text-xs font-semibold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Location Details
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                  {dossier.target.type === 'anomaly' && (
                    <button
                      onClick={() => navigate(`/anomalies?id=${encodeURIComponent(dossier.target.id)}`)}
                      className="px-3 py-1.5 text-xs font-semibold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Anomaly Signals
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* 4 Metric Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    Source Records
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-1 font-mono">
                    {dossier.summary.record_count}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Corroborated mentions</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    Extracted Entities
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-1 font-mono">
                    {dossier.summary.entity_count}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Involved actors & sites</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    Analytical Signals
                  </p>
                  <p className="text-xl font-bold text-amber-700 mt-1 font-mono">
                    {dossier.summary.signal_count}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Algorithmic anomalies</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    Overlapping Cases
                  </p>
                  <p className="text-xl font-bold text-cyan-800 mt-1 font-mono">
                    {dossier.summary.related_case_count}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Cross-case nexus</p>
                </div>
              </div>

              {/* Factual Deterministic Summary */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans">
                <span className="font-bold text-slate-900">Deterministic Intelligence Synthesis: </span>
                {dossier.summary.summary_text}
              </div>

              {/* Mandatory Responsible Analysis Disclaimer */}
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="leading-snug">{dossier.disclaimer}</p>
              </div>
            </div>

            {/* ─── SECTION 2: SHORTEST PATH ANALYSIS TOOL ─── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <GitFork className="w-4 h-4 text-cyan-700" />
                    Corroborated Shortest Path Analysis
                  </h3>
                  <p className="text-xs text-slate-500">
                    Identify shortest connection paths between entities with hop-by-hop record corroboration.
                  </p>
                </div>

                {/* Pre-fill quick pairs */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono text-slate-400">Quick Test Pairs:</span>
                  {[
                    { a: 'Ravi Malhotra', b: 'Suresh Nair' },
                    { a: 'Ravi Malhotra', b: 'Vikram Rao' },
                    { a: 'Suresh Nair', b: 'Deepak Shah' },
                  ].map((pair, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setPathStart(pair.a);
                        setPathEnd(pair.b);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
                    >
                      {pair.a.split(' ')[0]} ➔ {pair.b.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-5 space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Origin Entity
                  </label>
                  <select
                    value={pathStart}
                    onChange={(e) => setPathStart(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {availableEntities.map((ent) => (
                      <option key={ent.id} value={ent.id}>
                        {ent.id} ({ent.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 flex items-center justify-center pt-4">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                <div className="md:col-span-5 space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Destination Entity
                  </label>
                  <select
                    value={pathEnd}
                    onChange={(e) => setPathEnd(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {availableEntities.map((ent) => (
                      <option key={ent.id} value={ent.id}>
                        {ent.id} ({ent.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleAnalyzePath}
                  disabled={pathLoading || !pathStart || !pathEnd}
                  className="px-4 py-2 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-2 shadow-2xs"
                >
                  {pathLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <GitFork className="w-3.5 h-3.5" />
                  )}
                  {pathLoading ? 'Analyzing Network Topology...' : 'Calculate Shortest Path'}
                </button>
              </div>

              {/* Path Analysis Results */}
              {pathError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  {pathError}
                </div>
              )}

              {pathResult && (
                <div className="space-y-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          pathResult.found
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {pathResult.found ? 'Corroborated Path Found' : 'No Observed Path'}
                      </span>
                      {pathResult.found && (
                        <span className="text-xs font-mono text-slate-500">
                          Hop Distance: {pathResult.length} {pathResult.length === 1 ? 'hop' : 'hops'}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-serif italic">
                      "{pathResult.message}"
                    </span>
                  </div>

                  {/* Visual Node Path Chain */}
                  {pathResult.found && pathResult.path.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">
                        Path Traversal Chain
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {pathResult.path.map((node, i) => (
                          <React.Fragment key={i}>
                            <button
                              onClick={() => navigate(`/network?focus=${encodeURIComponent(node)}`)}
                              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-cyan-500 text-xs font-semibold text-slate-900 shadow-2xs hover:text-cyan-800 transition-all inline-flex items-center gap-1.5"
                            >
                              <Users className="w-3 h-3 text-slate-400" />
                              {node}
                            </button>
                            {i < pathResult.path.length - 1 && (
                              <ArrowRight className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hop Corroboration Details Table */}
                  {pathResult.found && pathResult.edges.length > 0 && (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 text-[10px] font-mono uppercase text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Hop</th>
                            <th className="py-2.5 px-3">From Entity</th>
                            <th className="py-2.5 px-3">To Entity</th>
                            <th className="py-2.5 px-3">Co-occurrence Weight</th>
                            <th className="py-2.5 px-3">Corroborating Records</th>
                            <th className="py-2.5 px-3">Dates</th>
                            <th className="py-2.5 px-3">Analytical Basis</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {pathResult.edges.map((edge, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-cyan-800">
                                Hop {idx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                {edge.source}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                {edge.target}
                              </td>
                              <td className="py-2.5 px-3 font-mono">{edge.weight}</td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1 flex-wrap">
                                  {edge.records.map((rid) => (
                                    <button
                                      key={rid}
                                      onClick={() => navigate(`/timeline?record_id=${encodeURIComponent(rid)}`)}
                                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200 font-semibold"
                                    >
                                      {rid}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                                {edge.dates.join(', ')}
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-slate-600">
                                {edge.basis}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ─── SECTION 3: OBSERVED CROSS-CASE OVERLAP MATRIX ─── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-700" />
                    Observed Cross-Case Overlap Matrix
                  </h3>
                  <p className="text-xs text-slate-500">
                    Traceable overlap of entities, locations, and signals across related case dossiers.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {dossier.cross_case_matrix.cases.length} Compared Cases • {dossier.cross_case_matrix.attributes.length} Monitored Attributes
                </span>
              </div>

              {dossier.cross_case_matrix.attributes.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No cross-case overlaps recorded for this target in current intelligence baseline.
                </p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-mono uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 min-w-[200px]">Intelligence Attribute</th>
                        <th className="py-3 px-3">Type</th>
                        {dossier.cross_case_matrix.cases.map((cid) => (
                          <th key={cid} className="py-3 px-3 text-center min-w-[100px]">
                            <button
                              onClick={() => navigate(`/cases?id=${encodeURIComponent(cid)}`)}
                              className="font-bold text-cyan-800 hover:text-cyan-900 hover:underline font-mono inline-flex items-center gap-1"
                            >
                              {cid}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dossier.cross_case_matrix.attributes.map((attr, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-900">
                            {attr.name}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {attr.category}
                            </span>
                          </td>
                          {dossier.cross_case_matrix.cases.map((cid) => {
                            const present = attr.cases_present[cid];
                            return (
                              <td key={cid} className="py-2.5 px-3 text-center">
                                {present ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                                    <Check className="w-3.5 h-3.5" />
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-mono">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ─── SECTION 4: ENTITY RELATIONSHIP EXPLORER ─── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-cyan-700" />
                    Entity Relationship Explorer
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pairwise entity co-occurrences directly corroborated by source incident records.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {dossier.relationships.length} Observed Connections
                </span>
              </div>

              {dossier.relationships.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No co-occurring entity connections recorded in this context.
                </p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-mono uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Source Node</th>
                        <th className="py-2.5 px-3">Target Node</th>
                        <th className="py-2.5 px-3 font-mono">Weight</th>
                        <th className="py-2.5 px-3">Supporting Records</th>
                        <th className="py-2.5 px-3">Observation Dates</th>
                        <th className="py-2.5 px-3">Factual Basis</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dossier.relationships.map((rel, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {rel.source}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {rel.target}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-cyan-800">
                            {rel.weight}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              {rel.records.map((r) => (
                                <button
                                  key={r}
                                  onClick={() => navigate(`/timeline?record_id=${encodeURIComponent(r)}`)}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200 font-semibold"
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {rel.dates.join(', ')}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600">
                            {rel.basis}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => navigate(`/network?focus=${encodeURIComponent(rel.target)}`)}
                              className="px-2 py-1 text-[10px] font-medium text-cyan-700 hover:bg-cyan-50 rounded transition-colors inline-flex items-center gap-1 border border-cyan-200"
                            >
                              Focus
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ─── SECTION 5: EVIDENCE CONTEXT & TRACE CHAIN ─── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-700" />
                    Evidence Context & Trace Chain
                  </h3>
                  <p className="text-xs text-slate-500">
                    Transparent provenance traversal: Target ➔ Ingested Record ➔ Extracted Entity ➔ Detection Signal ➔ Case File.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {dossier.evidence_trace.map((step) => (
                  <div
                    key={step.step}
                    onClick={() => navigate(step.module_url)}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/40 transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-5 h-5 rounded-full bg-cyan-700 text-white flex items-center justify-center text-[10px] font-bold font-mono">
                        {step.step}
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 group-hover:text-cyan-700">
                        {step.category}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 group-hover:text-cyan-900 line-clamp-2">
                      {step.label}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-cyan-700 font-semibold pt-1">
                      <span>Inspect Module</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── SECTION 6: 4-TIER ASSESSMENT LAYER ─── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-700" />
                    4-Tier Intelligence Assessment Layer
                  </h3>
                  <p className="text-xs text-slate-500">
                    Rigorous epistemic separation between facts, mathematical models, anomaly alerts, and human review steps.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tier 1: Observed Intelligence */}
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 font-mono">
                      1. Observed Intelligence (Ground Truth)
                    </h4>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                    {dossier.assessment.observed.map((item, i) => (
                      <li key={i} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tier 2: Derived Intelligence */}
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 font-mono">
                      2. Derived Intelligence (Graph Metrics)
                    </h4>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                    {dossier.assessment.derived.map((item, i) => (
                      <li key={i} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tier 3: Analytical Signals */}
                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 font-mono">
                      3. Analytical Signals (Anomaly Flags)
                    </h4>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                    {dossier.assessment.signals.map((item, i) => (
                      <li key={i} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tier 4: Review Required */}
                <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 font-mono">
                      4. Investigator Review Required (Validation)
                    </h4>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                    {dossier.assessment.review_required.map((item, i) => (
                      <li key={i} className="leading-relaxed font-medium text-rose-900">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
export default Investigation;
