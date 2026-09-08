import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import {
  SourcesResponse,
  SourceItem,
  SourceDetail,
  IngestResponse,
  EntityType,
} from "../types";
import {
  Database,
  Radio,
  Shield,
  CreditCard,
  Eye,
  FileText,
  Users,
  AlertTriangle,
  MapPin,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  Layers,
  Cpu,
  GitMerge,
  Sliders,
  X,
  ChevronRight,
  Info,
  Calendar,
  Lock,
  Server,
  Activity,
  Car,
  Phone,
  Building2,
  DollarSign,
  Circle,
  Clock,
  Briefcase,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Entity Type Configuration ──────────────────────────────────────────────
interface EntityCfg {
  color: string;
  border: string;
  bg: string;
  label: string;
  icon: LucideIcon;
}

const ENTITY_CONFIG: Record<string, EntityCfg> = {
  PERSON:   { color: "#E11D48", border: "#9F1239", bg: "#FFF1F2", label: "Person",   icon: Users },
  PHONE:    { color: "#6366F1", border: "#4338CA", bg: "#EEF2FF", label: "Phone",    icon: Phone },
  VEHICLE:  { color: "#D97706", border: "#92400E", bg: "#FFFBEB", label: "Vehicle",  icon: Car },
  LOCATION: { color: "#059669", border: "#065F46", bg: "#ECFDF5", label: "Location", icon: MapPin },
  ORG:      { color: "#2563EB", border: "#1E3A8A", bg: "#EFF6FF", label: "Org",      icon: Building2 },
  MONEY:    { color: "#7C3AED", border: "#4C1D95", bg: "#F5F3FF", label: "Money",    icon: DollarSign },
  UNKNOWN:  { color: "#6B7280", border: "#374151", bg: "#F9FAFB", label: "Unknown",  icon: Circle },
};

const getEntityCfg = (type?: string): EntityCfg =>
  ENTITY_CONFIG[type || ""] ?? ENTITY_CONFIG.UNKNOWN;

// ─── Source Icons & Theme Colors ─────────────────────────────────────────────
const SOURCE_THEMES: Record<
  string,
  { icon: LucideIcon; color: string; bg: string; border: string }
> = {
  police_case_management: {
    icon: Shield,
    color: "#0284C7", // Sky/Cyan 600
    bg: "#F0F9FF",
    border: "#BAE6FD",
  },
  call_detail_records: {
    icon: Radio,
    color: "#4F46E5", // Indigo 600
    bg: "#EEF2FF",
    border: "#C7D2FE",
  },
  financial_intelligence_unit: {
    icon: CreditCard,
    color: "#7C3AED", // Violet 600
    bg: "#F5F3FF",
    border: "#DDD6FE",
  },
  informant_tip: {
    icon: Eye,
    color: "#D97706", // Amber 600
    bg: "#FFFBEB",
    border: "#FDE68A",
  },
};

const getSourceTheme = (sourceId: string) =>
  SOURCE_THEMES[sourceId] ?? {
    icon: Database,
    color: "#475569",
    bg: "#F8FAFC",
    border: "#E2E8F0",
  };

export const Sources: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSourceId = searchParams.get("id");

  const [sourcesData, setSourcesData] = useState<SourcesResponse | null>(null);
  const [selectedSourceDetail, setSelectedSourceDetail] = useState<SourceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isReingesting, setIsReingesting] = useState(false);
  const [reingestResult, setReingestResult] = useState<IngestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Inspector active tab: records | entities | anomalies | connector
  const [inspectorTab, setInspectorTab] = useState<"records" | "entities" | "anomalies" | "connector">("records");

  // Load sources list
  const loadSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSources();
      setSourcesData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load data sources.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  // Load detail when activeSourceId changes
  useEffect(() => {
    if (!activeSourceId) {
      setSelectedSourceDetail(null);
      return;
    }
    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const detail = await api.getSourceDetail(activeSourceId);
        setSelectedSourceDetail(detail);
      } catch (err) {
        console.error("Failed to load source detail:", err);
      } finally {
        setLoadingDetail(false);
      }
    };
    fetchDetail();
  }, [activeSourceId]);

  // Select a source
  const handleSelectSource = (id: string) => {
    setSearchParams({ id });
    setInspectorTab("records");
  };

  const handleCloseDetail = () => {
    setSearchParams({});
    setSelectedSourceDetail(null);
  };

  // Trigger re-ingestion
  const handleReingest = async () => {
    setIsReingesting(true);
    setReingestResult(null);
    try {
      const res = await api.triggerIngestion();
      setReingestResult(res);
      // Reload sources data to reflect any updates
      await loadSources();
      if (activeSourceId) {
        const detail = await api.getSourceDetail(activeSourceId);
        setSelectedSourceDetail(detail);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Re-ingestion failed.");
    } finally {
      setIsReingesting(false);
    }
  };

  return (
    <div className="min-h-full bg-[#F8FAFC] pb-16">
      {/* ─── Page Header ─────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-800 border border-cyan-200 font-mono uppercase tracking-wider">
                <Database className="w-3 h-3 text-cyan-600" />
                Intelligence Ingestion Center
              </span>
              <span className="text-xs text-slate-400 font-mono">•</span>
              <span className="text-xs font-mono text-slate-500">
                Phase 3A Provenance Layer
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Data Sources & Ingestion Center
            </h1>
            <p className="mt-1 text-xs text-slate-500 max-w-3xl">
              Heterogeneous intelligence provenance, unified normalization pipeline, and connector architecture.
              Inspect raw case records, extracted entity distributions, and production adapter specifications.
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleReingest}
              disabled={isReingesting}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-cyan-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReingesting ? "animate-spin" : ""}`} />
              {isReingesting ? "Re-Ingesting Pipeline..." : "Re-Ingest Dataset"}
            </button>
          </div>
        </div>

        {/* Re-ingest Confirmation Banner */}
        {reingestResult && (
          <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 flex items-center justify-between text-xs text-emerald-900 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-semibold">Pipeline Re-Ingested Successfully: </span>
                <span>
                  {reingestResult.records_ingested} records normalized • {reingestResult.entities_extracted} entities extracted • {reingestResult.relationships_built} relationships built • {reingestResult.anomalies_detected} anomalies detected.
                </span>
                <span className="ml-2 text-[11px] text-emerald-700 font-mono">
                  ({new Date(reingestResult.reloaded_at).toLocaleTimeString()})
                </span>
              </div>
            </div>
            <button
              onClick={() => setReingestResult(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-medium cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error Notification Banner */}
        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3.5 flex items-center gap-2.5 text-xs text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}
      </div>

      <div className="px-8 py-6 space-y-8">
        {/* ─── Top Metrics Strip ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Active Data Sources</span>
              <span className="rounded-md bg-cyan-50 p-1.5 text-cyan-700">
                <Database className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {sourcesData?.total_sources ?? 4}
              </span>
              <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                100% Ingested
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Police RMS, Telecom CDR, FIU STR, HUMINT
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Normalized Records</span>
              <span className="rounded-md bg-sky-50 p-1.5 text-sky-700">
                <FileText className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {sourcesData?.total_records_ingested ?? 10}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Case Reports</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Unified <span className="font-mono text-slate-600">Record</span> schema normalization
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Entities Contributed</span>
              <span className="rounded-md bg-indigo-50 p-1.5 text-indigo-700">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {sourcesData?.total_entities_extracted ?? 15}
              </span>
              <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                6 Entity Types
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Extracted via RuleBasedNER from raw texts
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Correlated Anomalies</span>
              <span className="rounded-md bg-amber-50 p-1.5 text-amber-700">
                <AlertTriangle className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {sourcesData?.total_anomalies_detected ?? 25}
              </span>
              <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                Cross-Source
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Pattern flags across burst, structuring, outlier
            </p>
          </div>
        </div>

        {/* ─── Conceptual Ingestion Pipeline Flow ───────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-cyan-700" />
                CNIS Ingestion Architecture & Data Pipeline
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Heterogeneous ingestion abstraction: raw sources are normalized before NLP extraction and graph construction.
              </p>
            </div>
            <span className="rounded bg-slate-100 px-2.5 py-1 text-[11px] font-mono text-slate-600 border border-slate-200">
              src/ingestion.py • BaseConnector Interface
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Step 1 */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">
                    Stage 1
                  </span>
                  <span className="text-[10px] font-mono bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded">
                    Connectors
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-700" />
                  Heterogeneous Intake
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  JSONFileConnector reads 4 source categories (RMS, CDR, FIU, HUMINT) from raw data export.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] font-mono text-slate-600">
                JSON / SQL / CSV
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">
                    Stage 2
                  </span>
                  <span className="text-[10px] font-mono bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded">
                    Standardize
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-700" />
                  Record Normalization
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Normalized into uniform dataclass with record_id, source, date, text, and structured fields.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] font-mono text-slate-600">
                10 Ingested Records
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">
                    Stage 3
                  </span>
                  <span className="text-[10px] font-mono bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                    NLP Extraction
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-700" />
                  Entity Extraction
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  RuleBasedNER extracts persons, phone numbers, vehicles, locations, organizations, and currencies.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] font-mono text-slate-600">
                15 Unique Entities
              </div>
            </div>

            {/* Step 4 */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    Stage 4
                  </span>
                  <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                    Network Graph
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <GitMerge className="w-3.5 h-3.5 text-purple-700" />
                  Graph Construction
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Co-occurrence edges construct NetworkX graph, calculating Degree, Betweenness, and Louvain communities.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] font-mono text-slate-600">
                52 Co-occurrence Edges
              </div>
            </div>

            {/* Step 5 */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    Stage 5
                  </span>
                  <span className="text-[10px] font-mono bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                    Intelligence
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                  Anomaly Detection
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  IsolationForest outlier detector and burst activity, structuring, and entity spike rules execute.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] font-mono text-slate-600">
                25 Actionable Signals
              </div>
            </div>
          </div>
        </div>

        {/* ─── Main Content Grid: Sources List & Inspector ─────────────────── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Registered Ingested Sources ({sourcesData?.sources.length ?? 4})
              </h2>
              <p className="text-xs text-slate-500">
                Actual data categories loaded into the CNIS investigation memory. Click any source to inspect its raw records, extracted entities, and connector specifications.
              </p>
            </div>
            <div className="text-xs font-mono text-slate-500">
              Source of Truth: <span className="font-semibold text-slate-800">data/sample_records.json</span>
            </div>
          </div>

          {/* Sources Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {sourcesData?.sources.map((source) => {
              const theme = getSourceTheme(source.id);
              const Icon = theme.icon;
              const isSelected = activeSourceId === source.id;

              return (
                <div
                  key={source.id}
                  onClick={() => handleSelectSource(source.id)}
                  className={`rounded-xl border transition-all duration-200 p-5 cursor-pointer bg-white flex flex-col justify-between ${
                    isSelected
                      ? "border-cyan-600 ring-2 ring-cyan-100 shadow-md"
                      : "border-slate-200 hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <div>
                    {/* Top pill bar */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-8 h-8 rounded-lg flex items-center justify-center border"
                          style={{
                            backgroundColor: theme.bg,
                            borderColor: theme.border,
                            color: theme.color,
                          }}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                            {source.category}
                          </span>
                          <span className="text-xs font-bold font-mono text-slate-800">
                            {source.id}
                          </span>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active (Ingested)
                      </span>
                    </div>

                    {/* Source Name & Description */}
                    <h3 className="text-sm font-bold text-slate-900 mb-1">
                      {source.name}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      {source.description}
                    </p>

                    {/* Operational Metrics Bar */}
                    <div className="grid grid-cols-4 gap-2 bg-slate-50 rounded-lg p-2.5 border border-slate-100 mb-4 text-center">
                      <div>
                        <div className="text-xs font-bold font-mono text-slate-900">
                          {source.record_count}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase font-mono">
                          Records
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold font-mono text-slate-900">
                          {source.entity_count}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase font-mono">
                          Entities
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold font-mono text-slate-900">
                          {source.anomaly_count}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase font-mono">
                          Anomalies
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold font-mono text-slate-900">
                          {source.location_count}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase font-mono">
                          Locations
                        </div>
                      </div>
                    </div>

                    {/* Entity Types Breakdown */}
                    <div className="mb-3">
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                        Contributed Entity Classifications
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(source.entity_types).map(([type, count]) => {
                          const cfg = getEntityCfg(type);
                          const EntityIcon = cfg.icon;
                          return (
                            <span
                              key={type}
                              className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded border"
                              style={{
                                backgroundColor: cfg.bg,
                                borderColor: cfg.border,
                                color: cfg.color,
                              }}
                            >
                              <EntityIcon className="w-2.5 h-2.5" />
                              {cfg.label}: {count}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sample key entities */}
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                        Primary Key Entities
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {source.sample_entities.map((ent) => (
                          <span
                            key={ent}
                            className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200"
                          >
                            {ent}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {source.date_range.start} → {source.date_range.end}
                    </div>
                    <span className="text-xs font-medium text-cyan-700 flex items-center gap-1 group-hover:text-cyan-800">
                      Inspect Intelligence
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Production Connectors & Extensibility ──────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                  Production Readiness
                </span>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                  Enterprise Connector Specifications & Extensibility
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                The CNIS ingestion framework decouples raw data extraction from the graph intelligence pipeline.
                Production adapters implement the uniform <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">BaseConnector.fetch() -&gt; Iterable[Record]</code> interface without altering graph analytics.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Defined in src/ingestion.py
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sourcesData?.planned_connectors.map((connector) => (
              <div
                key={connector.id}
                className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      {connector.category}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded border border-slate-300">
                      {connector.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">
                    {connector.name}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                    {connector.description}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 text-[10px] font-mono text-slate-500">
                  Class: <span className="font-semibold text-slate-700">{connector.connector_class}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Detail Inspector Drawer / Side Panel ─────────────────────────── */}
      {selectedSourceDetail && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-slideInRight">
            {/* Drawer Header */}
            <div className="border-b border-slate-200 p-6 bg-slate-50/80 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    {selectedSourceDetail.category}
                  </span>
                  <span className="text-xs text-slate-300">•</span>
                  <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                    Active (Ingested)
                  </span>
                  <span className="text-xs text-slate-300">•</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {selectedSourceDetail.id}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedSourceDetail.name}
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  {selectedSourceDetail.description}
                </p>
              </div>

              <button
                onClick={handleCloseDetail}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors cursor-pointer"
                title="Close Inspector"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Strip in Drawer */}
            <div className="grid grid-cols-4 gap-2 bg-white px-6 py-3 border-b border-slate-100 text-center">
              <div className="border-r border-slate-100">
                <div className="text-base font-bold font-mono text-slate-900">
                  {selectedSourceDetail.record_count}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Records</div>
              </div>
              <div className="border-r border-slate-100">
                <div className="text-base font-bold font-mono text-slate-900">
                  {selectedSourceDetail.entity_count}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Entities</div>
              </div>
              <div className="border-r border-slate-100">
                <div className="text-base font-bold font-mono text-slate-900">
                  {selectedSourceDetail.anomaly_count}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Anomalies</div>
              </div>
              <div>
                <div className="text-base font-bold font-mono text-slate-900">
                  {selectedSourceDetail.location_count}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Locations</div>
              </div>
            </div>

            {/* Navigation Tabs in Drawer */}
            <div className="border-b border-slate-200 bg-slate-50 px-6 flex items-center gap-2">
              <button
                onClick={() => setInspectorTab("records")}
                className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  inspectorTab === "records"
                    ? "border-cyan-600 text-cyan-900 bg-white"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Ingested Records ({selectedSourceDetail.records.length})
              </button>
              <button
                onClick={() => setInspectorTab("entities")}
                className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  inspectorTab === "entities"
                    ? "border-cyan-600 text-cyan-900 bg-white"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Contributed Entities ({selectedSourceDetail.entities.length})
              </button>
              <button
                onClick={() => setInspectorTab("anomalies")}
                className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  inspectorTab === "anomalies"
                    ? "border-cyan-600 text-cyan-900 bg-white"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Correlated Anomalies ({selectedSourceDetail.anomalies.length})
              </button>
              <button
                onClick={() => setInspectorTab("connector")}
                className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  inspectorTab === "connector"
                    ? "border-cyan-600 text-cyan-900 bg-white"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Connector Architecture
              </button>
            </div>

            {/* Drawer Body Viewport */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* TAB 1: Ingested Records */}
              {inspectorTab === "records" && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-500">
                    Showing raw records ingested and normalized from this source. Each record is parsed by the entity extractor into co-occurrence graph relationships.
                  </div>

                  <div className="space-y-3">
                    {selectedSourceDetail.records.map((rec) => (
                      <div
                        key={rec.record_id}
                        className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {rec.record_id}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              {rec.date}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {rec.anomaly_count > 0 && (
                              <span className="text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded font-semibold">
                                {rec.anomaly_count} Anomaly
                              </span>
                            )}
                            <button
                              onClick={() => navigate(`/cases?id=${encodeURIComponent(rec.record_id)}`)}
                              className="text-xs font-medium text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                              title={`Open Case Dossier ${rec.record_id}`}
                            >
                              <Briefcase className="w-3 h-3 text-cyan-700" />
                              Case Dossier
                            </button>
                            <button
                              onClick={() => navigate(`/timeline?record_id=${encodeURIComponent(rec.record_id)}`)}
                              className="text-xs font-medium text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer"
                            >
                              Timeline View
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-sans bg-slate-50/70 p-2.5 rounded border border-slate-100 mb-3">
                          "{rec.text}"
                        </p>

                        <div>
                          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                            Extracted Entities ({rec.extracted_entities.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {rec.extracted_entities.map((ent, idx) => {
                              const cfg = getEntityCfg(ent.label);
                              const EntIcon = cfg.icon;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => navigate(`/entities?id=${encodeURIComponent(ent.text)}`)}
                                  className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border hover:opacity-80 transition-opacity cursor-pointer"
                                  style={{
                                    backgroundColor: cfg.bg,
                                    borderColor: cfg.border,
                                    color: cfg.color,
                                  }}
                                  title={`Inspect entity ${ent.text}`}
                                >
                                  <EntIcon className="w-2.5 h-2.5" />
                                  <span>{ent.text}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: Contributed Entities */}
              {inspectorTab === "entities" && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-500">
                    Entities extracted from this source records. Network centrality and role indicators are computed from the full co-occurrence graph.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedSourceDetail.entities.map((entity) => {
                      const cfg = getEntityCfg(entity.type);
                      const EntIcon = cfg.icon;

                      return (
                        <div
                          key={entity.id}
                          className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded border"
                                style={{
                                  backgroundColor: cfg.bg,
                                  borderColor: cfg.border,
                                  color: cfg.color,
                                }}
                              >
                                <EntIcon className="w-2.5 h-2.5" />
                                {cfg.label}
                              </span>

                              {entity.is_key_player && (
                                <span className="text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded font-semibold">
                                  Key Player
                                </span>
                              )}
                              {entity.is_bridge_node && !entity.is_key_player && (
                                <span className="text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                                  Bridge Node
                                </span>
                              )}
                            </div>

                            <h4 className="text-xs font-bold text-slate-900 mb-1">
                              {entity.id}
                            </h4>

                            <div className="grid grid-cols-3 gap-1 bg-slate-50 rounded p-1.5 text-center text-[10px] font-mono text-slate-600 mb-2 border border-slate-100">
                              <div>
                                <span className="text-slate-400 block text-[9px]">INFLUENCE</span>
                                <span className="font-bold text-slate-800">
                                  {entity.influence_score > 0 ? entity.influence_score.toFixed(3) : "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px]">DEGREE</span>
                                <span className="font-bold text-slate-800">
                                  {entity.degree > 0 ? entity.degree.toFixed(2) : "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px]">COMMUNITY</span>
                                <span className="font-bold text-slate-800">
                                  {entity.community > 0 ? `C-${entity.community}` : "—"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-mono">
                              {entity.anomaly_count > 0 ? `${entity.anomaly_count} Anomalies` : "Clean"}
                            </span>
                            <button
                              onClick={() => navigate(`/entities?id=${encodeURIComponent(entity.id)}`)}
                              className="text-xs font-medium text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer"
                            >
                              Explore Entity
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: Correlated Anomalies */}
              {inspectorTab === "anomalies" && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-500">
                    Suspicious patterns detected by the CNIS anomaly engine that directly cite records or entities contributed by this source.
                  </div>

                  <div className="space-y-3">
                    {selectedSourceDetail.anomalies.length === 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                        No anomalies directly attributed to this source.
                      </div>
                    ) : (
                      selectedSourceDetail.anomalies.map((anom) => (
                        <div
                          key={anom.id}
                          className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {anom.id}
                              </span>
                              <span className="text-xs font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                {(anom as any).pattern_label || anom.pattern.replace(/_/g, " ").toUpperCase()}
                              </span>
                            </div>
                            <button
                              onClick={() => navigate(`/anomalies?id=${encodeURIComponent(anom.id || "")}`)}
                              className="text-xs font-medium text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer"
                            >
                              View Anomaly
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed mb-3">
                            {anom.note}
                          </p>

                          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                            {anom.entity && (
                              <div>
                                <span className="text-slate-400">Target Entity: </span>
                                <span className="font-bold text-slate-800">{anom.entity}</span>
                              </div>
                            )}
                            {anom.record_id && (
                              <div>
                                <span className="text-slate-400">Trigger Record: </span>
                                <span className="font-bold text-slate-800">{anom.record_id}</span>
                              </div>
                            )}
                            {anom.date && (
                              <div>
                                <span className="text-slate-400">Date: </span>
                                <span>{anom.date}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Connector Architecture */}
              {inspectorTab === "connector" && (
                <div className="space-y-5">
                  <div className="text-xs text-slate-500 leading-relaxed">
                    Technical architecture mapping prototype ingestion to enterprise deployment standards.
                  </div>

                  {/* Prototype Ingestion Spec */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase font-mono text-slate-900 flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-cyan-700" />
                      Current Prototype Ingestion Specification
                    </h4>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] font-mono uppercase block">
                          Connector Class
                        </span>
                        <span className="font-mono font-semibold text-slate-800">
                          {selectedSourceDetail.ingestion_spec.connector_class}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-mono uppercase block">
                          Code Location
                        </span>
                        <span className="font-mono text-slate-800">
                          {selectedSourceDetail.ingestion_spec.pipeline_source}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 text-[10px] font-mono uppercase block">
                          Interface Signature
                        </span>
                        <code className="font-mono text-[11px] bg-white px-2 py-1 rounded border border-slate-200 text-slate-800 block mt-0.5">
                          {selectedSourceDetail.ingestion_spec.base_interface}
                        </code>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 text-[10px] font-mono uppercase block">
                          Target Normalized Fields
                        </span>
                        <div className="flex gap-2 mt-0.5">
                          {selectedSourceDetail.ingestion_spec.target_schema.map((f) => (
                            <span
                              key={f}
                              className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Production Connector Architecture */}
                  <div className="rounded-lg border border-cyan-200 bg-cyan-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase font-mono text-cyan-900 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-cyan-700" />
                        Production Enterprise Connector
                      </h4>
                      <span className="text-[10px] font-mono bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded border border-cyan-300">
                        {selectedSourceDetail.production_connector.readiness}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-slate-500 text-[10px] font-mono uppercase block">
                          Production Connector Name
                        </span>
                        <span className="font-semibold text-slate-900">
                          {selectedSourceDetail.production_connector.name}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-slate-500 text-[10px] font-mono uppercase block">
                            Python Class
                          </span>
                          <span className="font-mono font-semibold text-cyan-900">
                            {selectedSourceDetail.production_connector.class_name}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] font-mono uppercase block">
                            Ingestion Frequency
                          </span>
                          <span className="text-slate-800">
                            {selectedSourceDetail.production_connector.ingestion_frequency}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 text-[10px] font-mono uppercase block">
                          Transfer Protocol
                        </span>
                        <span className="text-slate-800 font-mono text-[11px]">
                          {selectedSourceDetail.production_connector.protocol}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 text-[10px] font-mono uppercase block">
                          Schema Standard
                        </span>
                        <span className="text-slate-800">
                          {selectedSourceDetail.production_connector.schema_standard}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 text-[10px] font-mono uppercase block">
                          Security & Compliance Level
                        </span>
                        <span className="text-slate-800">
                          {selectedSourceDetail.production_connector.security_level}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                Source ID: {selectedSourceDetail.id}
              </span>
              <button
                onClick={handleCloseDetail}
                className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sources;
