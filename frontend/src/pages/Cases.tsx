import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import {
  CasesResponse,
  CaseItem,
  CaseDetail,
  EntityType,
} from "../types";
import {
  Briefcase,
  Search,
  Filter,
  ArrowUpDown,
  FileText,
  Users,
  AlertTriangle,
  MapPin,
  Clock,
  Share2,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Shield,
  Calendar,
  Lock,
  Server,
  Activity,
  Car,
  Phone,
  Building2,
  DollarSign,
  Circle,
  Radio,
  CreditCard,
  Eye,
  Info,
  Layers,
  GitMerge,
  ChevronLeft,
  X,
  Copy,
  Check,
  Compass,
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
  { icon: LucideIcon; color: string; bg: string; border: string; label: string }
> = {
  police_case_management: {
    icon: Shield,
    color: "#0284C7", // Sky/Cyan 600
    bg: "#F0F9FF",
    border: "#BAE6FD",
    label: "Police Case Mgmt",
  },
  call_detail_records: {
    icon: Radio,
    color: "#4F46E5", // Indigo 600
    bg: "#EEF2FF",
    border: "#C7D2FE",
    label: "Telecom CDR",
  },
  financial_intelligence_unit: {
    icon: CreditCard,
    color: "#7C3AED", // Violet 600
    bg: "#F5F3FF",
    border: "#DDD6FE",
    label: "Financial FIU",
  },
  informant_tip: {
    icon: Eye,
    color: "#D97706", // Amber 600
    bg: "#FFFBEB",
    border: "#FDE68A",
    label: "HUMINT Tips",
  },
};

const getSourceTheme = (sourceId: string) =>
  SOURCE_THEMES[sourceId] ?? {
    icon: FileText,
    color: "#475569",
    bg: "#F8FAFC",
    border: "#E2E8F0",
    label: sourceId.replace(/_/g, " "),
  };

export const Cases: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCaseId = searchParams.get("id");

  const [casesData, setCasesData] = useState<CasesResponse | null>(null);
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "anomalies" | "entities">("date_desc");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Detail workspace active tab
  const [detailTab, setDetailTab] = useState<"records" | "entities" | "anomalies" | "timeline" | "locations" | "network" | "references" | "notes">("records");

  // Temporary local note in workspace (session only, explicitly labeled)
  const [tempNote, setTempNote] = useState("");
  const [copiedId, setCopiedId] = useState(false);

  // Load cases list
  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCases();
      setCasesData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load case dossiers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  // Load case detail when activeCaseId changes
  useEffect(() => {
    if (!activeCaseId) {
      setSelectedCaseDetail(null);
      return;
    }
    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const detail = await api.getCaseDetail(activeCaseId);
        setSelectedCaseDetail(detail);
      } catch (err) {
        console.error("Failed to load case detail:", err);
      } finally {
        setLoadingDetail(false);
      }
    };
    fetchDetail();
  }, [activeCaseId]);

  // Open a case workspace
  const handleOpenCase = (caseId: string) => {
    setSearchParams({ id: caseId });
    setDetailTab("records");
  };

  // Close case detail and return to registry
  const handleCloseCase = () => {
    setSearchParams({});
    setSelectedCaseDetail(null);
  };

  // Copy case ID to clipboard
  const handleCopyCaseId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  };

  // Filtered & sorted cases
  const filteredCases = useMemo(() => {
    if (!casesData) return [];
    let list = [...casesData.cases];

    // Query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.case_id.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          c.source_label.toLowerCase().includes(q) ||
          c.entities.some((e) => e.toLowerCase().includes(q)) ||
          c.locations.some((l) => l.toLowerCase().includes(q))
      );
    }

    // Source filter
    if (selectedSource !== "ALL") {
      list = list.filter((c) => c.source === selectedSource);
    }

    // Status filter
    if (selectedStatus !== "ALL") {
      list = list.filter((c) => c.workflow_status === selectedStatus);
    }

    // Priority filter
    if (selectedPriority !== "ALL") {
      list = list.filter((c) => c.priority === selectedPriority);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "date_desc") return b.date.localeCompare(a.date);
      if (sortBy === "date_asc") return a.date.localeCompare(b.date);
      if (sortBy === "anomalies") return b.anomaly_count - a.anomaly_count;
      if (sortBy === "entities") return b.entity_count - a.entity_count;
      return 0;
    });

    return list;
  }, [casesData, searchQuery, selectedSource, selectedStatus, selectedPriority, sortBy]);

  return (
    <div className="min-h-full bg-[#F8FAFC] pb-16">
      {/* ─── Page Header ─────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-800 border border-cyan-200 font-mono uppercase tracking-wider">
                <Briefcase className="w-3 h-3 text-cyan-600" />
                Case Management Workspace
              </span>
              <span className="text-xs text-slate-400 font-mono">•</span>
              <span className="text-xs font-mono text-slate-500">
                Phase 3B Investigation Orchestration
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {selectedCaseDetail ? `Case Workspace :: ${selectedCaseDetail.case_id}` : "Case Management"}
            </h1>
            <p className="mt-1 text-xs text-slate-500 max-w-3xl">
              {selectedCaseDetail
                ? "Investigator dossier synthesizing case records, extracted entities, correlated analytical signals, and chronological timeline events."
                : "Organize source records and derived intelligence into investigation workspaces. Trace every entity, anomaly, and location back to source case reports."}
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-3">
            {selectedCaseDetail ? (
              <button
                onClick={handleCloseCase}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back to Case Registry
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    viewMode === "cards"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Card Grid
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    viewMode === "table"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Dossier Table
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Responsible Investigative Disclaimer Banner */}
        <div className="mt-4 rounded-lg bg-cyan-50/70 border border-cyan-200/80 p-3 flex items-start gap-2.5 text-xs text-cyan-900">
          <Info className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Investigative Context: </span>
            <span>
              Case intelligence is derived from available source records and analytical signals. Investigative conclusions require authorized human review.
            </span>
          </div>
        </div>
      </div>

      {/* ─── CASE DETAIL WORKSPACE VIEW ──────────────────────────────────── */}
      {selectedCaseDetail ? (
        <div className="px-8 py-6 space-y-6 animate-fadeIn">
          {/* Case Dossier Header Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {selectedCaseDetail.case_id}
                  </span>
                  <button
                    onClick={() => handleCopyCaseId(selectedCaseDetail.case_id)}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded"
                    title="Copy Case ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <span className="text-xs text-slate-300">•</span>
                  <span
                    className="text-[11px] font-mono px-2 py-0.5 rounded border font-semibold"
                    style={{
                      backgroundColor: selectedCaseDetail.priority === "HIGH" ? "#FFF1F2" : selectedCaseDetail.priority === "MEDIUM" ? "#FFFBEB" : "#F8FAFC",
                      borderColor: selectedCaseDetail.priority === "HIGH" ? "#FECDD3" : selectedCaseDetail.priority === "MEDIUM" ? "#FDE68A" : "#E2E8F0",
                      color: selectedCaseDetail.priority === "HIGH" ? "#9F1239" : selectedCaseDetail.priority === "MEDIUM" ? "#92400E" : "#475569",
                    }}
                  >
                    {selectedCaseDetail.priority} PRIORITY
                  </span>
                  <span className="text-xs text-slate-300">•</span>
                  <span className="text-[11px] font-mono bg-cyan-50 text-cyan-800 px-2 py-0.5 rounded border border-cyan-200">
                    {selectedCaseDetail.workflow_status}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-slate-900">
                  {selectedCaseDetail.title}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {selectedCaseDetail.date} {selectedCaseDetail.time ? `(${selectedCaseDetail.time})` : ""}
                  </span>
                  <span>•</span>
                  <span className="font-medium text-slate-700">
                    Source: {selectedCaseDetail.source_label}
                  </span>
                  <span>•</span>
                  <span className="text-slate-500 font-mono">
                    State: {selectedCaseDetail.source_status}
                  </span>
                </div>
              </div>

              {/* Cross-Module Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => navigate(`/timeline?record_id=${encodeURIComponent(selectedCaseDetail.case_id)}`)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
                  title="Open in Chronological Timeline"
                >
                  <Clock className="w-3.5 h-3.5 text-cyan-700" />
                  Timeline View
                </button>

                {selectedCaseDetail.entities.length > 0 && (
                  <button
                    onClick={() => navigate(`/network?focus=${encodeURIComponent(selectedCaseDetail.entities[0].id)}`)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
                    title="Focus network on primary case entity"
                  >
                    <Share2 className="w-3.5 h-3.5 text-indigo-700" />
                    Network Focus
                  </button>
                )}

                <button
                  onClick={() => navigate(`/sources?id=${encodeURIComponent(selectedCaseDetail.source)}`)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
                  title="Inspect Source Provenance"
                >
                  <Server className="w-3.5 h-3.5 text-slate-600" />
                  Source Ingestion
                </button>

                <button
                  onClick={() => navigate("/reports")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
                  title="View Intelligence Synthesis"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-700" />
                  Reports
                </button>
              </div>
            </div>

            {/* Case Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">RECORDS</span>
                <span className="text-base font-bold font-mono text-slate-900">{selectedCaseDetail.metrics.records}</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">ENTITIES</span>
                <span className="text-base font-bold font-mono text-slate-900">{selectedCaseDetail.metrics.entities}</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">ANOMALIES</span>
                <span className="text-base font-bold font-mono text-rose-700">{selectedCaseDetail.metrics.anomalies}</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">LOCATIONS</span>
                <span className="text-base font-bold font-mono text-slate-900">{selectedCaseDetail.metrics.locations}</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">KEY PLAYERS</span>
                <span className="text-base font-bold font-mono text-indigo-700">{selectedCaseDetail.metrics.key_players}</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">CONNECTIONS</span>
                <span className="text-base font-bold font-mono text-slate-900">{selectedCaseDetail.metrics.internal_connections}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden">
            <div className="flex flex-wrap items-center gap-1 px-4 pt-2 border-b border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setDetailTab("records")}
                className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  detailTab === "records"
                    ? "border-cyan-600 text-cyan-900 bg-white rounded-t-md"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Case Records ({selectedCaseDetail.metrics.records})
              </button>
              <button
                onClick={() => setDetailTab("entities")}
                className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  detailTab === "entities"
                    ? "border-cyan-600 text-cyan-900 bg-white rounded-t-md"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Extracted Entities ({selectedCaseDetail.entities.length})
              </button>
              <button
                onClick={() => setDetailTab("anomalies")}
                className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  detailTab === "anomalies"
                    ? "border-cyan-600 text-cyan-900 bg-white rounded-t-md"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Correlated Signals ({selectedCaseDetail.anomalies.length})
              </button>
              <button
                onClick={() => setDetailTab("timeline")}
                className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  detailTab === "timeline"
                    ? "border-cyan-600 text-cyan-900 bg-white rounded-t-md"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Chronology ({selectedCaseDetail.timeline_events.length})
              </button>
              <button
                onClick={() => setDetailTab("locations")}
                className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  detailTab === "locations"
                    ? "border-cyan-600 text-cyan-900 bg-white rounded-t-md"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Locations ({selectedCaseDetail.locations.length})
              </button>
              <button
                onClick={() => setDetailTab("network")}
                className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  detailTab === "network"
                    ? "border-cyan-600 text-cyan-900 bg-white rounded-t-md"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Network Subgraph ({selectedCaseDetail.network_context.links.length} Links)
              </button>
              <button
                onClick={() => setDetailTab("references")}
                className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  detailTab === "references"
                    ? "border-cyan-600 text-cyan-900 bg-white rounded-t-md"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Intelligence References ({selectedCaseDetail.intelligence_references.length})
              </button>
              <button
                onClick={() => setDetailTab("notes")}
                className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  detailTab === "notes"
                    ? "border-cyan-600 text-cyan-900 bg-white rounded-t-md"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Investigator Notes
              </button>
            </div>

            {/* Tab Viewport */}
            <div className="p-6">
              {/* TAB 1: Case Records */}
              {detailTab === "records" && (
                <div className="space-y-6">
                  {/* Primary Record */}
                  <div className="rounded-xl border border-cyan-200 bg-cyan-50/30 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded font-semibold border border-cyan-300">
                          Primary Case Record
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {selectedCaseDetail.primary_record.record_id}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-600 font-mono">
                          {selectedCaseDetail.primary_record.date}
                        </span>
                      </div>
                      <button
                        onClick={() => navigate(`/timeline?record_id=${encodeURIComponent(selectedCaseDetail.primary_record.record_id)}`)}
                        className="text-xs font-medium text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer"
                      >
                        Timeline Context
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-800 leading-relaxed font-sans bg-white p-3.5 rounded-lg border border-cyan-100 shadow-2xs">
                      "{selectedCaseDetail.primary_record.text}"
                    </p>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5">
                        Extracted Entities in Record ({selectedCaseDetail.primary_record.extracted_entities.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCaseDetail.primary_record.extracted_entities.map((ent, idx) => {
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

                  {/* Cross-Referencing Records */}
                  {selectedCaseDetail.related_records.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-slate-500" />
                          Co-Occurring Cross-Reference Records ({selectedCaseDetail.related_records.length})
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Records sharing multi-entity co-occurrence or key players
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {selectedCaseDetail.related_records.map((rr) => (
                          <div
                            key={rr.record_id}
                            className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 hover:bg-white hover:border-slate-300 transition-all"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                                  {rr.record_id}
                                </span>
                                <span className="text-xs text-slate-500 font-mono">{rr.date}</span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs font-medium text-slate-700">{rr.source_label}</span>
                              </div>
                              <button
                                onClick={() => handleOpenCase(rr.record_id)}
                                className="text-xs font-medium text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer"
                              >
                                Open Case Dossier
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>

                            <p className="text-xs text-slate-700 leading-relaxed font-sans mb-2.5">
                              "{rr.text}"
                            </p>

                            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-200/50 pt-2">
                              <span>{rr.relationship_note}</span>
                              <div className="flex gap-1">
                                {rr.common_entities?.map((ce) => (
                                  <span key={ce} className="bg-white px-1.5 py-0.2 rounded border border-slate-200 text-slate-700">
                                    {ce}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Extracted Entities */}
              {detailTab === "entities" && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-500">
                    Entities extracted from this case record. Influence score and centrality are computed from the full CNIS co-occurrence intelligence graph.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedCaseDetail.entities.map((entity) => {
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
                            <button
                              onClick={() => navigate(`/network?focus=${encodeURIComponent(entity.id)}`)}
                              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                            >
                              <Share2 className="w-3 h-3 text-slate-400" />
                              Focus
                            </button>
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
              {detailTab === "anomalies" && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-500">
                    Analytical signals detected by the CNIS anomaly engine directly citing this case report or participating entities.
                  </div>

                  <div className="space-y-3">
                    {selectedCaseDetail.anomalies.length === 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                        No anomalous signals directly associated with this record.
                      </div>
                    ) : (
                      selectedCaseDetail.anomalies.map((anom) => (
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

              {/* TAB 4: Case Timeline */}
              {detailTab === "timeline" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      Chronological intelligence events corresponding to this case report and related co-occurrences.
                    </div>
                    <button
                      onClick={() => navigate("/timeline")}
                      className="text-xs font-medium text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer"
                    >
                      Open Full Timeline
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {selectedCaseDetail.timeline_events.map((evt) => (
                      <div
                        key={evt.event_id}
                        className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {evt.date} {evt.time ? `• ${evt.time}` : ""}
                            </span>
                            <span className="text-xs font-semibold text-slate-700">
                              {evt.source_label}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{evt.event_id}</span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-sans mb-3">
                          {evt.description}
                        </p>

                        <div className="flex flex-wrap gap-1.5">
                          {evt.entities.map((e) => (
                            <span
                              key={e.id}
                              className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                            >
                              {e.id}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: Case Locations */}
              {detailTab === "locations" && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-500">
                    Geographic sites mentioned in this case report.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedCaseDetail.locations.length === 0 ? (
                      <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                        No physical locations cited in this case report.
                      </div>
                    ) : (
                      selectedCaseDetail.locations.map((loc) => (
                        <div
                          key={loc.id}
                          className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded border bg-emerald-50 text-emerald-800 border-emerald-200">
                                <MapPin className="w-2.5 h-2.5" />
                                Location Site
                              </span>
                              {loc.is_bridge_node && (
                                <span className="text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                                  Bridge Hub
                                </span>
                              )}
                            </div>

                            <h4 className="text-xs font-bold text-slate-900 mb-1">
                              {loc.name}
                            </h4>

                            <div className="grid grid-cols-3 gap-1 bg-slate-50 rounded p-1.5 text-center text-[10px] font-mono text-slate-600 mb-2 border border-slate-100">
                              <div>
                                <span className="text-slate-400 block text-[9px]">ACTIVITY</span>
                                <span className="font-bold text-slate-800">{loc.activity_score}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px]">RECORDS</span>
                                <span className="font-bold text-slate-800">{loc.record_count}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px]">ENTITIES</span>
                                <span className="font-bold text-slate-800">{loc.entity_count}</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-mono">
                              Community C-{loc.community}
                            </span>
                            <button
                              onClick={() => navigate(`/locations?id=${encodeURIComponent(loc.id)}`)}
                              className="text-xs font-medium text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer"
                            >
                              Location Intel
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: Network Context */}
              {detailTab === "network" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      Co-occurrence subgraph relationships existing strictly between case entities.
                    </div>
                    <button
                      onClick={() => navigate("/network")}
                      className="text-xs font-medium text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer"
                    >
                      Open Full Network
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                    <div className="text-xs font-bold text-slate-800 font-mono uppercase mb-2">
                      Internal Co-occurrence Links ({selectedCaseDetail.network_context.links.length})
                    </div>
                    <div className="space-y-2">
                      {selectedCaseDetail.network_context.links.length === 0 ? (
                        <div className="text-xs text-slate-500 italic">
                          No direct co-occurrence edges between these entities.
                        </div>
                      ) : (
                        selectedCaseDetail.network_context.links.map((link, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-2.5 rounded border border-slate-200 flex items-center justify-between text-xs font-mono"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">{link.source}</span>
                              <span className="text-slate-400">↔</span>
                              <span className="font-semibold text-slate-900">{link.target}</span>
                            </div>
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                              Weight: {link.weight} ({link.records.length} records)
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: Intelligence References */}
              {detailTab === "references" && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-500">
                    Traceable evidentiary lineage. Every displayed intelligence artifact maps back to normalized records and algorithmic pipelines.
                  </div>

                  <div className="rounded-lg border border-slate-200 overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-mono uppercase text-slate-500">
                          <th className="p-3">Reference Type</th>
                          <th className="p-3">Identifier</th>
                          <th className="p-3">Source System</th>
                          <th className="p-3">Timestamp / Date</th>
                          <th className="p-3">Trace Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedCaseDetail.intelligence_references.map((ref, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-900">{ref.ref_type}</td>
                            <td className="p-3 font-mono text-cyan-800">{ref.identifier}</td>
                            <td className="p-3 text-slate-700">{ref.source_system}</td>
                            <td className="p-3 font-mono text-slate-500">{ref.date}</td>
                            <td className="p-3 text-slate-600">{ref.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 8: Investigator Notes */}
              {detailTab === "notes" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Review Workspace Notice: </span>
                      <span>
                        Notes entered here are temporary session notes for active investigator review. CNIS does not simulate or pretend persistent storage without enterprise database infrastructure.
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="text-xs font-bold font-mono text-slate-800 uppercase block">
                        Case Analysis &amp; Debrief Notes:
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-mono uppercase">Quick Tags:</span>
                        {[
                          "Additional Review Required",
                          "Review In Progress",
                          "Case Debrief Complete",
                          "Source Cross-Referenced",
                        ].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setTempNote((prev) => (prev ? `${prev}\n[${tag}]` : `[${tag}]`));
                            }}
                            className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-200 bg-slate-100 hover:bg-cyan-50 hover:text-cyan-800 hover:border-cyan-200 text-slate-700 transition-colors cursor-pointer"
                          >
                            +{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      value={tempNote}
                      onChange={(e) => setTempNote(e.target.value)}
                      placeholder="Enter investigative observations, coordination notes, or review status..."
                      rows={5}
                      className="w-full rounded-lg border border-slate-300 p-3 text-xs font-sans text-slate-800 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 outline-none resize-none bg-white"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Session-bound investigator scratchpad (no automated recommendations)</span>
                      {tempNote && (
                        <span className="text-emerald-700 font-medium">
                          {tempNote.length} characters drafted
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ─── CASE REGISTRY (MASTER VIEW) ─────────────────────────────────── */
        <div className="px-8 py-6 space-y-6">
          {/* Summary Strip */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Case Dossiers</span>
                <span className="rounded-md bg-cyan-50 p-1.5 text-cyan-700">
                  <Briefcase className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {casesData?.total_cases ?? 10}
                </span>
                <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  100% Ingested
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Derived from source case reports
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Review Required</span>
                <span className="rounded-md bg-rose-50 p-1.5 text-rose-700">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-rose-800">
                  {casesData?.review_required_count ?? 7}
                </span>
                <span className="text-[11px] text-rose-700 font-mono">High Priority</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Multiple key players or burst patterns
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Intelligence Available</span>
                <span className="rounded-md bg-sky-50 p-1.5 text-sky-700">
                  <Activity className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {casesData?.intelligence_available_count ?? 3}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">Monitored</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Correlated records & phone linkages
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Indexed Entities</span>
                <span className="rounded-md bg-indigo-50 p-1.5 text-indigo-700">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {casesData?.total_entities ?? 15}
                </span>
                <span className="text-[11px] text-indigo-700 font-mono">Involved</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Entities participating in cases
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Anomaly Signals</span>
                <span className="rounded-md bg-amber-50 p-1.5 text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {casesData?.total_anomalies ?? 25}
                </span>
                <span className="text-[11px] text-amber-700 font-mono">Flagged</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Pattern triggers across dataset
              </p>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by case ID (CR-1001), entity name, location, or case description..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 outline-none text-slate-800 placeholder-slate-400 font-sans"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Source filter */}
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-700 outline-none focus:border-cyan-600"
              >
                <option value="ALL">All Sources (4)</option>
                <option value="police_case_management">Police Case Management</option>
                <option value="call_detail_records">Call Detail Records</option>
                <option value="financial_intelligence_unit">Financial Intelligence Unit</option>
                <option value="informant_tip">Confidential HUMINT</option>
              </select>

              {/* Status filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-700 outline-none focus:border-cyan-600"
              >
                <option value="ALL">All Workflow Statuses</option>
                <option value="Review Required">Review Required</option>
                <option value="Intelligence Available">Intelligence Available</option>
                <option value="Source Record Active">Source Record Active</option>
              </select>

              {/* Priority filter */}
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-700 outline-none focus:border-cyan-600"
              >
                <option value="ALL">All Priorities</option>
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="STANDARD">Standard Priority</option>
              </select>

              {/* Sort by */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-700 outline-none focus:border-cyan-600"
              >
                <option value="date_desc">Date: Newest First</option>
                <option value="date_asc">Date: Oldest First</option>
                <option value="anomalies">Anomalies: Most First</option>
                <option value="entities">Entities: Most First</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
              <span>Showing {filteredCases.length} of {casesData?.cases.length ?? 10} Case Dossiers</span>
              <span>
                Coverage:{" "}
                {casesData?.date_coverage?.start && casesData?.date_coverage?.end
                  ? `${casesData.date_coverage.start} → ${casesData.date_coverage.end}`
                  : "Active Ingestion Period"}
              </span>
            </div>
          </div>

          {/* Cases Cards Grid */}
          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredCases.map((caseItem) => {
                const theme = getSourceTheme(caseItem.source);
                const Icon = theme.icon;

                return (
                  <div
                    key={caseItem.case_id}
                    onClick={() => handleOpenCase(caseItem.case_id)}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-cyan-600 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Top Bar */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-7 h-7 rounded-lg flex items-center justify-center border"
                            style={{
                              backgroundColor: theme.bg,
                              borderColor: theme.border,
                              color: theme.color,
                            }}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <div>
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {caseItem.case_id}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono ml-2">
                              {caseItem.date} {caseItem.time ? `(${caseItem.time})` : ""}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold"
                            style={{
                              backgroundColor: caseItem.priority === "HIGH" ? "#FFF1F2" : caseItem.priority === "MEDIUM" ? "#FFFBEB" : "#F8FAFC",
                              borderColor: caseItem.priority === "HIGH" ? "#FECDD3" : caseItem.priority === "MEDIUM" ? "#FDE68A" : "#E2E8F0",
                              color: caseItem.priority === "HIGH" ? "#9F1239" : caseItem.priority === "MEDIUM" ? "#92400E" : "#475569",
                            }}
                          >
                            {caseItem.priority}
                          </span>
                          <span className="text-[10px] font-mono bg-cyan-50 text-cyan-800 px-1.5 py-0.2 rounded border border-cyan-200">
                            {caseItem.workflow_status}
                          </span>
                        </div>
                      </div>

                      {/* Title & Preview */}
                      <h3 className="text-sm font-bold text-slate-900 mb-1.5 line-clamp-1">
                        {caseItem.short_title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-4">
                        "{caseItem.summary}"
                      </p>

                      {/* Operational Statistics */}
                      <div className="grid grid-cols-4 gap-2 bg-slate-50 rounded-lg p-2 border border-slate-100 mb-4 text-center">
                        <div>
                          <span className="text-xs font-bold font-mono text-slate-900">{caseItem.record_count}</span>
                          <span className="text-[9px] text-slate-400 uppercase font-mono block">RECORD</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold font-mono text-slate-900">{caseItem.entity_count}</span>
                          <span className="text-[9px] text-slate-400 uppercase font-mono block">ENTITIES</span>
                        </div>
                        <div>
                          <span className={`text-xs font-bold font-mono ${caseItem.anomaly_count > 0 ? "text-rose-700" : "text-slate-900"}`}>
                            {caseItem.anomaly_count}
                          </span>
                          <span className="text-[9px] text-slate-400 uppercase font-mono block">SIGNALS</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold font-mono text-slate-900">{caseItem.location_count}</span>
                          <span className="text-[9px] text-slate-400 uppercase font-mono block">LOCS</span>
                        </div>
                      </div>

                      {/* Entities preview */}
                      <div className="mb-2">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                          Associated Entities:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {caseItem.entities.slice(0, 4).map((ent) => (
                            <span
                              key={ent}
                              className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200 font-medium"
                            >
                              {ent}
                            </span>
                          ))}
                          {caseItem.entities.length > 4 && (
                            <span className="text-[10px] text-slate-400 font-mono self-center">
                              +{caseItem.entities.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-mono text-[11px]">
                        {caseItem.source_label}
                      </span>
                      <span className="text-cyan-700 font-medium flex items-center gap-1 hover:text-cyan-900">
                        Open Workspace
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-mono uppercase text-slate-500">
                    <th className="p-3">Case ID</th>
                    <th className="p-3">Title / Subject</th>
                    <th className="p-3">Source Channel</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Workflow State</th>
                    <th className="p-3 text-center">Entities</th>
                    <th className="p-3 text-center">Anomalies</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCases.map((c) => (
                    <tr
                      key={c.case_id}
                      onClick={() => handleOpenCase(c.case_id)}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                    >
                      <td className="p-3 font-mono font-bold text-slate-900">{c.case_id}</td>
                      <td className="p-3 font-medium text-slate-900 max-w-xs truncate">{c.short_title}</td>
                      <td className="p-3 text-slate-600">{c.source_label}</td>
                      <td className="p-3 font-mono text-slate-500">{c.date}</td>
                      <td className="p-3">
                        <span
                          className="text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold"
                          style={{
                            backgroundColor: c.priority === "HIGH" ? "#FFF1F2" : c.priority === "MEDIUM" ? "#FFFBEB" : "#F8FAFC",
                            borderColor: c.priority === "HIGH" ? "#FECDD3" : c.priority === "MEDIUM" ? "#FDE68A" : "#E2E8F0",
                            color: c.priority === "HIGH" ? "#9F1239" : c.priority === "MEDIUM" ? "#92400E" : "#475569",
                          }}
                        >
                          {c.priority}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-mono bg-cyan-50 text-cyan-800 px-1.5 py-0.2 rounded border border-cyan-200">
                          {c.workflow_status}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono">{c.entity_count}</td>
                      <td className="p-3 text-center font-mono font-bold text-rose-700">{c.anomaly_count}</td>
                      <td className="p-3 text-right">
                        <span className="text-cyan-700 font-medium inline-flex items-center gap-1 hover:text-cyan-900">
                          Open
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
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
  );
};

export default Cases;
