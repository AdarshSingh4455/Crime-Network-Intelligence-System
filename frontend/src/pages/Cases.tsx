import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import {
  CasesResponse,
  CaseItem,
  CaseDetail,
  EntityType,
  CaseWorkflowStatus,
  ChecklistItem,
  FollowUpItem,
  FollowUpCategory,
  FollowUpStatus,
  ActivityEvent,
  RelatedCaseItem,
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
  CheckSquare,
  ListTodo,
  History,
  Link2,
  Plus,
  RefreshCw,
  Sliders,
  ChevronDown,
  Sparkles,
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
    color: "#0284C7",
    bg: "#F0F9FF",
    border: "#BAE6FD",
    label: "Police Case Mgmt",
  },
  call_detail_records: {
    icon: Radio,
    color: "#4F46E5",
    bg: "#EEF2FF",
    border: "#C7D2FE",
    label: "Telecom CDR",
  },
  financial_intelligence_unit: {
    icon: CreditCard,
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    label: "Financial FIU",
  },
  informant_tip: {
    icon: Eye,
    color: "#D97706",
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

// ─── Workflow Status Badges ──────────────────────────────────────────────────
const WORKFLOW_BADGES: Record<
  CaseWorkflowStatus,
  { bg: string; border: string; text: string; label: string }
> = {
  "Review Required": {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    label: "Review Required",
  },
  "In Review": {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-800",
    label: "In Review",
  },
  "Follow-up Required": {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-800",
    label: "Follow-up Required",
  },
  "Review Completed": {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    label: "Review Completed",
  },
};

// ─── Neutral Follow-up Categories ────────────────────────────────────────────
const ALLOWED_CATEGORIES: FollowUpCategory[] = [
  "Source Cross-Check",
  "Entity Review",
  "Timeline Review",
  "Location Review",
  "Network Review",
  "Anomaly Review",
  "Additional Record Review",
];

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
  const [detailTab, setDetailTab] = useState<
    "records" | "related_cases" | "checklist" | "followups" | "activity" | "entities" | "anomalies" | "timeline" | "locations" | "network" | "references" | "notes"
  >("records");

  // Follow-up creation form state
  const [showAddFollowup, setShowAddFollowup] = useState(false);
  const [newFuTitle, setNewFuTitle] = useState("");
  const [newFuCategory, setNewFuCategory] = useState<FollowUpCategory>("Source Cross-Check");
  const [newFuTarget, setNewFuTarget] = useState("");
  const [newFuNotes, setNewFuNotes] = useState("");
  const [isSubmittingFu, setIsSubmittingFu] = useState(false);

  // Follow-up filters
  const [fuCategoryFilter, setFuCategoryFilter] = useState<string>("ALL");
  const [fuStatusFilter, setFuStatusFilter] = useState<string>("ALL");

  // Workflow update feedback
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);

  // Temporary local note in workspace (session only)
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

  // Update Workflow Status
  const handleUpdateWorkflowStatus = async (status: CaseWorkflowStatus) => {
    if (!selectedCaseDetail) return;
    setIsUpdatingStatus(true);
    try {
      const updatedWf = await api.updateCaseWorkflowStatus(selectedCaseDetail.case_id, status);
      setSelectedCaseDetail((prev) =>
        prev
          ? {
              ...prev,
              workflow_status: status,
              workflow: updatedWf,
              activity_history: updatedWf.activity_history,
            }
          : null
      );
      // Refresh cases registry summary
      loadCases();
    } catch (err) {
      console.error("Failed to update workflow status:", err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Toggle Checklist Item
  const handleToggleChecklist = async (itemId: string, currentCompleted: boolean) => {
    if (!selectedCaseDetail) return;
    setTogglingItemId(itemId);
    try {
      const updatedWf = await api.toggleChecklistItem(selectedCaseDetail.case_id, itemId, !currentCompleted);
      setSelectedCaseDetail((prev) =>
        prev
          ? {
              ...prev,
              workflow: updatedWf,
              activity_history: updatedWf.activity_history,
            }
          : null
      );
    } catch (err) {
      console.error("Failed to toggle checklist item:", err);
    } finally {
      setTogglingItemId(null);
    }
  };

  // Toggle / Update Follow-up Status
  const handleCycleFollowupStatus = async (followupId: string, currentStatus: FollowUpStatus) => {
    if (!selectedCaseDetail) return;
    const nextStatus: FollowUpStatus =
      currentStatus === "Pending" ? "In Progress" : currentStatus === "In Progress" ? "Completed" : "Pending";
    try {
      await api.updateCaseFollowup(selectedCaseDetail.case_id, followupId, { status: nextStatus });
      // Refresh workflow state
      const wf = await api.getCaseWorkflow(selectedCaseDetail.case_id);
      setSelectedCaseDetail((prev) =>
        prev
          ? {
              ...prev,
              workflow: wf,
              activity_history: wf.activity_history,
            }
          : null
      );
    } catch (err) {
      console.error("Failed to cycle follow-up status:", err);
    }
  };

  // Add New Follow-up Item
  const handleCreateFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseDetail || !newFuTitle.trim()) return;
    setIsSubmittingFu(true);
    try {
      await api.addCaseFollowup(selectedCaseDetail.case_id, {
        title: newFuTitle.trim(),
        category: newFuCategory,
        related_target: newFuTarget.trim() || undefined,
        notes: newFuNotes.trim() || undefined,
      });
      // Refresh workflow state
      const wf = await api.getCaseWorkflow(selectedCaseDetail.case_id);
      setSelectedCaseDetail((prev) =>
        prev
          ? {
              ...prev,
              workflow: wf,
              activity_history: wf.activity_history,
            }
          : null
      );
      // Reset form
      setNewFuTitle("");
      setNewFuTarget("");
      setNewFuNotes("");
      setShowAddFollowup(false);
    } catch (err) {
      console.error("Failed to create follow-up item:", err);
    } finally {
      setIsSubmittingFu(false);
    }
  };

  // Filtered & sorted cases in registry
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

  // Filtered follow-up items
  const filteredFollowups = useMemo(() => {
    if (!selectedCaseDetail?.workflow?.followups) return [];
    let list = [...selectedCaseDetail.workflow.followups];
    if (fuCategoryFilter !== "ALL") {
      list = list.filter((f) => f.category === fuCategoryFilter);
    }
    if (fuStatusFilter !== "ALL") {
      list = list.filter((f) => f.status === fuStatusFilter);
    }
    return list;
  }, [selectedCaseDetail, fuCategoryFilter, fuStatusFilter]);

  return (
    <div className="min-h-full bg-[#F8FAFC] pb-16">
      {/* ─── Page Header ─────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-800 border border-cyan-200 font-mono uppercase tracking-wider">
                <Briefcase className="w-3 h-3 text-cyan-600" />
                Case Management & Workflow Workspace
              </span>
              <span className="text-xs text-slate-400 font-mono">•</span>
              <span className="text-xs font-mono text-slate-500">
                Phase 3C Investigation Orchestration & Case Linking
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {selectedCaseDetail ? `Case Workspace :: ${selectedCaseDetail.case_id}` : "Case Management & Workflow"}
            </h1>
            <p className="mt-1 text-xs text-slate-500 max-w-3xl">
              {selectedCaseDetail
                ? "Investigator dossier synthesizing case records, extracted entities, correlated analytical signals, derived case links, and active workflow checklist."
                : "Organize source records, track investigation review states, manage follow-up tasks, and explore derived case links across the intelligence network."}
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
            <span className="font-semibold">Responsible Human-in-the-Loop Review: </span>
            <span>
              Case intelligence is derived from available source records and analytical signals. Investigative conclusions require authorized human review. Workflow status reflects investigator review state and does not represent an official legal or law-enforcement determination.
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
                    className="text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
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
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded border font-semibold ${WORKFLOW_BADGES[selectedCaseDetail.workflow_status]?.bg ?? "bg-slate-100"} ${WORKFLOW_BADGES[selectedCaseDetail.workflow_status]?.border ?? "border-slate-200"} ${WORKFLOW_BADGES[selectedCaseDetail.workflow_status]?.text ?? "text-slate-700"}`}>
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
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-3 text-center">
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
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">RELATED CASES</span>
                <span className="text-base font-bold font-mono text-cyan-700">{selectedCaseDetail.related_cases?.length ?? 0}</span>
              </div>
            </div>
          </div>

          {/* ─── INVESTIGATION WORKFLOW PANEL ─────────────────────────────── */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold border border-slate-200 flex items-center gap-1">
                    <ListTodo className="w-3 h-3 text-sky-600" />
                    Investigation Workflow Panel
                  </span>
                  <span className="text-xs text-slate-300">•</span>
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                    Session Review Workspace Active
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-1">
                  Investigative Review Tracking & Case Coordination
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Workflow state reflects investigator review progress for the active session. Not persisted to enterprise database.
                </p>
              </div>

              {/* Workflow Status Selector */}
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Current Review State</span>
                  <span className="text-xs font-bold text-slate-800">{selectedCaseDetail.workflow_status}</span>
                </div>
                <div className="relative">
                  <select
                    value={selectedCaseDetail.workflow_status}
                    onChange={(e) => handleUpdateWorkflowStatus(e.target.value as CaseWorkflowStatus)}
                    disabled={isUpdatingStatus}
                    className="appearance-none bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg pl-3 pr-8 py-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 cursor-pointer shadow-2xs"
                  >
                    <option value="Review Required">Review Required</option>
                    <option value="In Review">In Review</option>
                    <option value="Follow-up Required">Follow-up Required</option>
                    <option value="Review Completed">Review Completed</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Workflow Metrics & Progress Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
              {/* Metric 1: Analytical Priority (Decoupled from workflow) */}
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Signal Priority</span>
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded font-bold border"
                    style={{
                      backgroundColor: selectedCaseDetail.priority === "HIGH" ? "#FFF1F2" : selectedCaseDetail.priority === "MEDIUM" ? "#FFFBEB" : "#F8FAFC",
                      borderColor: selectedCaseDetail.priority === "HIGH" ? "#FECDD3" : selectedCaseDetail.priority === "MEDIUM" ? "#FDE68A" : "#E2E8F0",
                      color: selectedCaseDetail.priority === "HIGH" ? "#9F1239" : selectedCaseDetail.priority === "MEDIUM" ? "#92400E" : "#475569",
                    }}
                  >
                    {selectedCaseDetail.priority}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Derived from anomaly density & bridge nodes. Decoupled from review state.
                </p>
              </div>

              {/* Metric 2: Review Checklist Progress */}
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Review Checklist</span>
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {selectedCaseDetail.workflow?.checklist_reviewed_count ?? 0} / {selectedCaseDetail.workflow?.checklist_total_count ?? 8}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-sky-600 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${((selectedCaseDetail.workflow?.checklist_reviewed_count ?? 0) / (selectedCaseDetail.workflow?.checklist_total_count ?? 8)) * 100}%`,
                    }}
                  />
                </div>
                <button
                  onClick={() => setDetailTab("checklist")}
                  className="text-[11px] font-medium text-sky-700 hover:text-sky-900 mt-1.5 flex items-center gap-1 cursor-pointer"
                >
                  Complete review checklist <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Metric 3: Follow-up Tasks */}
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Follow-up Tasks</span>
                  <span className="text-xs font-mono font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                    {selectedCaseDetail.workflow?.pending_followups_count ?? 0} Pending
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {selectedCaseDetail.workflow?.followups?.length ?? 0} total tasks registered for this case file.
                </p>
                <button
                  onClick={() => setDetailTab("followups")}
                  className="text-[11px] font-medium text-violet-700 hover:text-violet-900 mt-1 flex items-center gap-1 cursor-pointer"
                >
                  Manage follow-up tasks <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Metric 4: Derived Related Cases */}
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Related Cases</span>
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {selectedCaseDetail.related_cases?.length ?? 0} Linked
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Traceable links via shared entities, locations & analytical signals.
                </p>
                <button
                  onClick={() => setDetailTab("related_cases")}
                  className="text-[11px] font-medium text-cyan-700 hover:text-cyan-900 mt-1 flex items-center gap-1 cursor-pointer"
                >
                  Inspect related cases <ArrowRight className="w-2.5 h-2.5" />
                </button>
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
                onClick={() => setDetailTab("related_cases")}
                className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  detailTab === "related_cases"
                    ? "border-cyan-600 text-cyan-900 bg-white rounded-t-md"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Link2 className="w-3 h-3 text-cyan-600" />
                Related Cases ({selectedCaseDetail.related_cases?.length ?? 0})
              </button>
              <button
                onClick={() => setDetailTab("checklist")}
                className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  detailTab === "checklist"
                    ? "border-cyan-600 text-cyan-900 bg-white rounded-t-md"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <CheckSquare className="w-3 h-3 text-sky-600" />
                Review Checklist ({selectedCaseDetail.workflow?.checklist_reviewed_count ?? 0}/{selectedCaseDetail.workflow?.checklist_total_count ?? 8})
              </button>
              <button
                onClick={() => setDetailTab("followups")}
                className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  detailTab === "followups"
                    ? "border-cyan-600 text-cyan-900 bg-white rounded-t-md"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <ListTodo className="w-3 h-3 text-violet-600" />
                Follow-ups ({selectedCaseDetail.workflow?.pending_followups_count ?? 0})
              </button>
              <button
                onClick={() => setDetailTab("activity")}
                className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  detailTab === "activity"
                    ? "border-cyan-600 text-cyan-900 bg-white rounded-t-md"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <History className="w-3 h-3 text-slate-500" />
                Session Activity ({selectedCaseDetail.activity_history?.length ?? 0})
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedCaseDetail.related_records.map((rec) => {
                          const sTheme = getSourceTheme(rec.source);
                          const SrcIcon = sTheme.icon;
                          return (
                            <div key={rec.record_id} className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors shadow-2xs space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold text-slate-900">
                                    {rec.record_id}
                                  </span>
                                  <span className="text-xs text-slate-400">•</span>
                                  <span className="text-[11px] font-mono text-slate-500">
                                    {rec.date}
                                  </span>
                                </div>
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border" style={{ backgroundColor: sTheme.bg, borderColor: sTheme.border, color: sTheme.color }}>
                                  <SrcIcon className="w-2.5 h-2.5" />
                                  {rec.source_label}
                                </span>
                              </div>

                              <p className="text-xs text-slate-700 line-clamp-3">
                                "{rec.text}"
                              </p>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                <span className="text-slate-500 text-[10px] font-mono">
                                  {rec.relationship_note}
                                </span>
                                <button
                                  onClick={() => handleOpenCase(rec.record_id)}
                                  className="text-cyan-700 hover:text-cyan-900 font-medium flex items-center gap-1 cursor-pointer"
                                >
                                  Open Case File
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Derived Related Cases */}
              {detailTab === "related_cases" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-cyan-600" />
                        Derived Case Relationships ({selectedCaseDetail.related_cases?.length ?? 0})
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Traceable case connections derived strictly from shared entities, shared locations, and shared analytical signals in source records.
                      </p>
                    </div>
                  </div>

                  {/* Responsible Note */}
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      Shared entities or locations reflect analytical co-occurrence across reporting channels. Co-occurrence indicates investigative context, not confirmed operational coordination or guilt.
                    </span>
                  </div>

                  {selectedCaseDetail.related_cases && selectedCaseDetail.related_cases.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedCaseDetail.related_cases.map((rc) => {
                        const wfBadge = WORKFLOW_BADGES[rc.workflow_status] ?? WORKFLOW_BADGES["Review Required"];
                        return (
                          <div
                            key={rc.case_id}
                            className="rounded-xl border border-slate-200 bg-white p-4 hover:border-cyan-300 hover:shadow-xs transition-all space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    {rc.case_id}
                                  </span>
                                  <span
                                    className="text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold"
                                    style={{
                                      backgroundColor: rc.priority === "HIGH" ? "#FFF1F2" : rc.priority === "MEDIUM" ? "#FFFBEB" : "#F8FAFC",
                                      borderColor: rc.priority === "HIGH" ? "#FECDD3" : rc.priority === "MEDIUM" ? "#FDE68A" : "#E2E8F0",
                                      color: rc.priority === "HIGH" ? "#9F1239" : rc.priority === "MEDIUM" ? "#92400E" : "#475569",
                                    }}
                                  >
                                    {rc.priority}
                                  </span>
                                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-medium ${wfBadge.bg} ${wfBadge.border} ${wfBadge.text}`}>
                                    {rc.workflow_status}
                                  </span>
                                </div>
                                <h5 className="text-xs font-bold text-slate-800">
                                  {rc.title}
                                </h5>
                              </div>
                              <button
                                onClick={() => handleOpenCase(rc.case_id)}
                                className="inline-flex items-center gap-1 rounded-md border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-800 hover:bg-cyan-100 transition-colors cursor-pointer shrink-0"
                              >
                                Open Case
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>

                            <p className="text-xs text-slate-600 line-clamp-2">
                              "{rc.summary}"
                            </p>

                            {/* Relationship Bases */}
                            <div className="space-y-1.5 pt-2 border-t border-slate-100">
                              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                                Relationship Basis:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {rc.shared_entities.length > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-mono text-rose-800">
                                    <Users className="w-2.5 h-2.5 text-rose-600" />
                                    Shared Entity: {rc.shared_entities.join(", ")}
                                  </span>
                                )}
                                {rc.shared_locations.length > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-mono text-emerald-800">
                                    <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                                    Shared Location: {rc.shared_locations.join(", ")}
                                  </span>
                                )}
                                {rc.shared_anomalies.length > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-mono text-amber-800">
                                    <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                    Shared Signal: {rc.shared_anomalies.map((a) => a.pattern_label).join(", ")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No related cases derived for this file based on shared entities or locations.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Review Checklist */}
              {detailTab === "checklist" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-sky-600" />
                        Standardized Investigator Review Checklist
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Eight-point methodological review aid. Progress is retained for the active session.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {selectedCaseDetail.workflow?.checklist_reviewed_count ?? 0} / {selectedCaseDetail.workflow?.checklist_total_count ?? 8} Completed
                      </span>
                    </div>
                  </div>

                  {/* Workflow notice */}
                  <div className="rounded-lg bg-sky-50 border border-sky-200 p-3 text-xs text-sky-900 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                    <span>
                      Checklist is an investigative workflow aid. Completing items does not constitute an official factual determination. Checklist state is retained for the current investigation session.
                    </span>
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-2.5">
                    {selectedCaseDetail.workflow?.checklist?.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-lg border p-3.5 transition-all flex items-start justify-between gap-3 ${
                          item.completed
                            ? "bg-slate-50/70 border-emerald-200"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleToggleChecklist(item.id, item.completed)}
                            disabled={togglingItemId === item.id}
                            className={`mt-0.5 rounded border p-1 transition-colors cursor-pointer ${
                              item.completed
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "bg-white border-slate-300 text-transparent hover:border-slate-400"
                            }`}
                            title={item.completed ? "Mark as Pending" : "Mark as Reviewed"}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${item.completed ? "text-slate-700 line-through" : "text-slate-900"}`}>
                                {item.label}
                              </span>
                              {item.completed && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  Reviewed
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        {/* Quick Context Link */}
                        <div className="shrink-0">
                          {item.id === "chk-1" && (
                            <button
                              onClick={() => setDetailTab("records")}
                              className="text-[11px] font-medium text-cyan-700 hover:text-cyan-900 cursor-pointer"
                            >
                              Inspect Records
                            </button>
                          )}
                          {item.id === "chk-2" && (
                            <button
                              onClick={() => setDetailTab("entities")}
                              className="text-[11px] font-medium text-cyan-700 hover:text-cyan-900 cursor-pointer"
                            >
                              Inspect Entities
                            </button>
                          )}
                          {item.id === "chk-3" && (
                            <button
                              onClick={() => setDetailTab("anomalies")}
                              className="text-[11px] font-medium text-cyan-700 hover:text-cyan-900 cursor-pointer"
                            >
                              Inspect Signals
                            </button>
                          )}
                          {item.id === "chk-4" && (
                            <button
                              onClick={() => setDetailTab("timeline")}
                              className="text-[11px] font-medium text-cyan-700 hover:text-cyan-900 cursor-pointer"
                            >
                              Inspect Timeline
                            </button>
                          )}
                          {item.id === "chk-5" && (
                            <button
                              onClick={() => setDetailTab("locations")}
                              className="text-[11px] font-medium text-cyan-700 hover:text-cyan-900 cursor-pointer"
                            >
                              Inspect Locations
                            </button>
                          )}
                          {item.id === "chk-6" && (
                            <button
                              onClick={() => setDetailTab("network")}
                              className="text-[11px] font-medium text-cyan-700 hover:text-cyan-900 cursor-pointer"
                            >
                              Inspect Subgraph
                            </button>
                          )}
                          {item.id === "chk-7" && (
                            <button
                              onClick={() => setDetailTab("related_cases")}
                              className="text-[11px] font-medium text-cyan-700 hover:text-cyan-900 cursor-pointer"
                            >
                              Inspect Related
                            </button>
                          )}
                          {item.id === "chk-8" && (
                            <button
                              onClick={() => setDetailTab("references")}
                              className="text-[11px] font-medium text-cyan-700 hover:text-cyan-900 cursor-pointer"
                            >
                              Inspect Provenance
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: Follow-up Items */}
              {detailTab === "followups" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <ListTodo className="w-4 h-4 text-violet-600" />
                        Investigator Follow-up Items ({selectedCaseDetail.workflow?.followups?.length ?? 0})
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Track neutral review tasks, source cross-checks, and entity verification leads.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowAddFollowup(!showAddFollowup)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {showAddFollowup ? "Close Form" : "Add Follow-up Item"}
                    </button>
                  </div>

                  {/* Add Follow-up Inline Form */}
                  {showAddFollowup && (
                    <form
                      onSubmit={handleCreateFollowup}
                      className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 space-y-3 animate-fadeIn"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-violet-900 font-mono uppercase">
                          New Follow-up Review Task
                        </span>
                        <span className="text-[11px] text-violet-600 font-mono">
                          Neutral Review Tasks Only
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-medium text-slate-700 block mb-1">
                            Follow-up Title *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Entity Review: Verify toll records for +919876543210"
                            value={newFuTitle}
                            onChange={(e) => setNewFuTitle(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-slate-700 block mb-1">
                            Review Category *
                          </label>
                          <select
                            value={newFuCategory}
                            onChange={(e) => setNewFuCategory(e.target.value as FollowUpCategory)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 cursor-pointer"
                          >
                            {ALLOWED_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-medium text-slate-700 block mb-1">
                            Related Target (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Ravi Malhotra, CR-1004, or Andheri Warehouse"
                            value={newFuTarget}
                            onChange={(e) => setNewFuTarget(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-slate-700 block mb-1">
                            Investigative Notes (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="Brief context or verification rationale"
                            value={newFuNotes}
                            onChange={(e) => setNewFuNotes(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddFollowup(false)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingFu || !newFuTitle.trim()}
                          className="px-3 py-1.5 rounded-lg bg-violet-600 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors cursor-pointer shadow-2xs"
                        >
                          {isSubmittingFu ? "Creating..." : "Save Follow-up"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Filter Bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={fuCategoryFilter}
                      onChange={(e) => setFuCategoryFilter(e.target.value)}
                      className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs text-slate-700 cursor-pointer"
                    >
                      <option value="ALL">All Categories</option>
                      {ALLOWED_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    <select
                      value={fuStatusFilter}
                      onChange={(e) => setFuStatusFilter(e.target.value)}
                      className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs text-slate-700 cursor-pointer"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>

                    <span className="text-[11px] text-slate-400 ml-auto font-mono">
                      Showing {filteredFollowups.length} of {selectedCaseDetail.workflow?.followups?.length ?? 0}
                    </span>
                  </div>

                  {/* Follow-up Cards */}
                  <div className="space-y-2.5">
                    {filteredFollowups.map((fu) => (
                      <div
                        key={fu.id}
                        className={`rounded-lg border p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          fu.status === "Completed"
                            ? "bg-slate-50/70 border-slate-200"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-400">
                              {fu.id}
                            </span>
                            <span className="inline-flex items-center rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-mono text-slate-700">
                              {fu.category}
                            </span>
                            {fu.related_target && (
                              <span className="inline-flex items-center rounded bg-cyan-50 border border-cyan-200 px-2 py-0.5 text-[10px] font-mono text-cyan-800">
                                Target: {fu.related_target}
                              </span>
                            )}
                          </div>

                          <h5 className={`text-xs font-bold ${fu.status === "Completed" ? "text-slate-600 line-through" : "text-slate-900"}`}>
                            {fu.title}
                          </h5>

                          {fu.notes && (
                            <p className="text-[11px] text-slate-500">
                              {fu.notes}
                            </p>
                          )}
                        </div>

                        {/* Status Cycle Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleCycleFollowupStatus(fu.id, fu.status)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors cursor-pointer ${
                              fu.status === "Completed"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                : fu.status === "In Progress"
                                ? "bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100"
                                : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                            }`}
                            title="Click to cycle status (Pending -> In Progress -> Completed)"
                          >
                            {fu.status === "Completed" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : fu.status === "In Progress" ? (
                              <Activity className="w-3.5 h-3.5 text-sky-600" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                            )}
                            {fu.status}
                          </button>
                        </div>
                      </div>
                    ))}

                    {filteredFollowups.length === 0 && (
                      <div className="text-center py-8 text-xs text-slate-400">
                        No follow-up items match the selected category or status filter.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: Session Activity */}
              {detailTab === "activity" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <History className="w-4 h-4 text-slate-600" />
                        Investigation Session Activity History
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Real-time audit log of investigator actions taken during the active server session.
                      </p>
                    </div>
                  </div>

                  {/* Notice */}
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      Current Session Activity: Logged during the active server session. History reflects investigator review actions, workflow state transitions, and follow-up updates.
                    </span>
                  </div>

                  {/* Activity Feed */}
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {selectedCaseDetail.activity_history && selectedCaseDetail.activity_history.length > 0 ? (
                      [...selectedCaseDetail.activity_history].reverse().map((ev) => (
                        <div key={ev.id} className="relative group">
                          <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-cyan-600 border-2 border-white ring-2 ring-cyan-100" />
                          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                {ev.action}
                              </span>
                              <span className="text-slate-400">
                                {ev.timestamp.replace("T", " ").substring(0, 19)} UTC
                              </span>
                            </div>
                            <p className="text-xs text-slate-700">
                              {ev.details}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400 py-4">
                        No activity recorded yet for this session.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: Extracted Entities */}
              {detailTab === "entities" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider">
                      Extracted Intelligence Entities ({selectedCaseDetail.entities.length})
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Classified via Rule-Based NER & Graph Centrality
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedCaseDetail.entities.map((entity) => {
                      const cfg = getEntityCfg(entity.type);
                      const EntIcon = cfg.icon;
                      return (
                        <div
                          key={entity.id}
                          className="rounded-lg border border-slate-200 bg-white p-3.5 hover:border-slate-300 transition-colors shadow-2xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border font-semibold"
                              style={{
                                backgroundColor: cfg.bg,
                                borderColor: cfg.border,
                                color: cfg.color,
                              }}
                            >
                              <EntIcon className="w-2.5 h-2.5" />
                              {cfg.label}
                            </span>
                            <div className="flex items-center gap-1">
                              {entity.is_key_player && (
                                <span className="text-[9px] font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200 font-bold">
                                  KEY PLAYER
                                </span>
                              )}
                              {entity.is_bridge_node && (
                                <span className="text-[9px] font-mono bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded border border-amber-200 font-bold">
                                  BRIDGE
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="font-bold text-xs text-slate-900 font-mono">
                            {entity.id}
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center font-mono text-[10px]">
                            <div className="bg-slate-50 p-1 rounded">
                              <span className="text-slate-400 block">DEGREE</span>
                              <span className="font-bold text-slate-700">{entity.degree}</span>
                            </div>
                            <div className="bg-slate-50 p-1 rounded">
                              <span className="text-slate-400 block">INFLUENCE</span>
                              <span className="font-bold text-slate-700">{entity.influence_score.toFixed(2)}</span>
                            </div>
                            <div className="bg-slate-50 p-1 rounded">
                              <span className="text-slate-400 block">ANOMALIES</span>
                              <span className="font-bold text-rose-700">{entity.anomaly_count}</span>
                            </div>
                          </div>

                          <div className="pt-1 flex items-center justify-between text-[11px]">
                            <button
                              onClick={() => navigate(`/network?focus=${encodeURIComponent(entity.id)}`)}
                              className="text-indigo-600 hover:text-indigo-900 font-medium flex items-center gap-1 cursor-pointer"
                            >
                              Network
                              <Share2 className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={() => navigate(`/entities?id=${encodeURIComponent(entity.id)}`)}
                              className="text-cyan-700 hover:text-cyan-900 font-medium flex items-center gap-1 cursor-pointer"
                            >
                              Entity Explorer
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 7: Correlated Signals */}
              {detailTab === "anomalies" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider">
                      Correlated Suspicious Patterns & Anomalies ({selectedCaseDetail.anomalies.length})
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Algorithmic signals flagged for this case record
                    </span>
                  </div>

                  {selectedCaseDetail.anomalies.length > 0 ? (
                    <div className="space-y-2.5">
                      {selectedCaseDetail.anomalies.map((anom, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-rose-200 bg-rose-50/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold border border-rose-200">
                                {anom.pattern_label || anom.pattern}
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-900">
                                {anom.entity || "Multi-Entity Pattern"}
                              </span>
                              {anom.date && (
                                <span className="text-[11px] font-mono text-slate-500">
                                  • {anom.date}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-700 font-sans">
                              {anom.note || "Suspicious anomaly detected by algorithmic heuristic engine."}
                            </p>
                          </div>

                          <button
                            onClick={() => navigate(`/anomalies?id=${encodeURIComponent(anom.id || "")}`)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 hover:text-rose-900 cursor-pointer self-start sm:self-auto shrink-0"
                          >
                            Anomaly Center
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No anomalies directly flagged for this individual record.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 8: Chronology */}
              {detailTab === "timeline" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider">
                      Chronological Events ({selectedCaseDetail.timeline_events.length})
                    </h4>
                    <button
                      onClick={() => navigate("/timeline")}
                      className="text-xs font-medium text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer"
                    >
                      Global Timeline
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {selectedCaseDetail.timeline_events.map((ev, idx) => (
                      <div key={idx} className="relative group">
                        <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-cyan-600 border-2 border-white ring-2 ring-cyan-100" />
                        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-slate-900">
                              {ev.date} {ev.time ? `(${ev.time})` : ""}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {ev.record_id}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700">
                            {ev.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 9: Locations */}
              {detailTab === "locations" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider">
                      Geographic & Spatial References ({selectedCaseDetail.locations.length})
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Locations linked to this case file
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedCaseDetail.locations.map((loc) => (
                      <div
                        key={loc.id}
                        className="rounded-lg border border-slate-200 bg-white p-3.5 hover:border-slate-300 transition-colors shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                            <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                            Location Hub
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            Score: {loc.activity_score}
                          </span>
                        </div>

                        <div className="font-bold text-xs text-slate-900">
                          {loc.id}
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                          <span className="text-slate-500 text-[10px]">
                            {loc.record_count} Records • {loc.entity_count} Entities
                          </span>
                          <button
                            onClick={() => navigate(`/locations?id=${encodeURIComponent(loc.id)}`)}
                            className="text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1 cursor-pointer"
                          >
                            Explore Site
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 10: Network Subgraph */}
              {detailTab === "network" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider">
                        Internal Case Co-occurrence Network ({selectedCaseDetail.network_context.links.length} Links)
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Direct co-occurrence edges between entities extracted from this case file
                      </p>
                    </div>
                    <button
                      onClick={() => navigate("/network")}
                      className="text-xs font-medium text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer"
                    >
                      Global Network
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">
                      Case Entities Represented:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCaseDetail.network_context.case_entities.map((eid) => (
                        <button
                          key={eid}
                          onClick={() => navigate(`/network?focus=${encodeURIComponent(eid)}`)}
                          className="inline-flex items-center gap-1 rounded bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-2.5 h-2.5 text-indigo-500" />
                          {eid}
                        </button>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-slate-200/80">
                      <span className="text-[10px] font-mono uppercase text-slate-500 block mb-2">
                        Internal Co-occurrence Links ({selectedCaseDetail.network_context.links.length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedCaseDetail.network_context.links.map((link, idx) => (
                          <div key={idx} className="rounded bg-white p-2.5 border border-slate-200 text-xs font-mono flex items-center justify-between">
                            <span className="text-slate-800 font-medium">
                              {link.source} <span className="text-slate-400">↔</span> {link.target}
                            </span>
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                              Weight: {link.weight}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 11: Intelligence References */}
              {detailTab === "references" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider">
                        Intelligence Provenance & Evidence References ({selectedCaseDetail.intelligence_references.length})
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Auditable lineage from raw data sources through entity extraction and analytical algorithms
                      </p>
                    </div>
                  </div>

                  {/* Provenance Pipeline Flow Banner */}
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700 flex flex-wrap items-center gap-2 font-mono">
                    <span className="font-bold text-slate-900">Provenance Flow:</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Source Record</span>
                    <span>──▶</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Entity Extraction</span>
                    <span>──▶</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Network Analysis</span>
                    <span>──▶</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Anomaly Detection</span>
                    <span>──▶</span>
                    <span className="bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 font-bold text-cyan-800">Case Dossier</span>
                  </div>

                  <div className="space-y-2.5">
                    {selectedCaseDetail.intelligence_references.map((ref, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-slate-200 bg-white p-3.5 hover:border-slate-300 transition-colors shadow-2xs space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold border border-slate-200">
                              {ref.ref_type}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-900">
                              {ref.identifier}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              • {ref.source_system} ({ref.source_label})
                            </span>
                          </div>

                          {/* Target Module Navigation Link */}
                          {ref.target_module && (
                            <button
                              onClick={() => {
                                if (ref.target_module === "/timeline" && ref.navigation_param) {
                                  navigate(`${ref.target_module}?${ref.navigation_param}`);
                                } else if (ref.target_module === "/entities" && ref.navigation_param) {
                                  navigate(`${ref.target_module}?${ref.navigation_param}`);
                                } else if (ref.target_module === "/anomalies" && ref.navigation_param) {
                                  navigate(`${ref.target_module}?${ref.navigation_param}`);
                                } else if (ref.target_module === "/locations" && ref.navigation_param) {
                                  navigate(`${ref.target_module}?${ref.navigation_param}`);
                                } else if (ref.target_module) {
                                  navigate(ref.target_module);
                                }
                              }}
                              className="text-[11px] font-medium text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer"
                            >
                              Inspect in {ref.target_module.replace("/", "").toUpperCase()}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-slate-700 font-sans">
                          {ref.details}
                        </p>

                        {ref.analytical_method && (
                          <div className="pt-1 text-[10px] font-mono text-slate-400">
                            Analytical Method: {ref.analytical_method}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 12: Investigator Notes */}
              {detailTab === "notes" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider">
                        Investigator Session Scratchpad
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Session scratchpad for active investigation review notes. Not persisted to enterprise storage.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <textarea
                      rows={5}
                      value={tempNote}
                      onChange={(e) => setTempNote(e.target.value)}
                      placeholder="Enter working investigative hypothesis, cross-reference questions, or follow-up notes..."
                      className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setTempNote((prev) => prev + (prev ? " | " : "") + "Flagged for Secondary Source Verification")}
                          className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] cursor-pointer"
                        >
                          + Secondary Verification
                        </button>
                        <button
                          onClick={() => setTempNote((prev) => prev + (prev ? " | " : "") + "Cross-reference CDR Toll Records")}
                          className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] cursor-pointer"
                        >
                          + CDR Cross-Check
                        </button>
                        <button
                          onClick={() => setTempNote((prev) => prev + (prev ? " | " : "") + "Additional Review Required")}
                          className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] cursor-pointer"
                        >
                          + Additional Review Required
                        </button>
                      </div>

                      <span className="text-[11px] text-slate-400 font-mono">
                        Session Scratchpad
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ─── CASE REGISTRY VIEW ─────────────────────────────────────────── */
        <div className="px-8 py-6 space-y-6">
          {/* Top Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold block">TOTAL CASES</span>
              <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
                {casesData?.total_cases ?? 0}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Registered Files</span>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs">
              <span className="text-[11px] font-mono uppercase text-amber-700 font-semibold block">REVIEW REQUIRED</span>
              <span className="text-2xl font-bold font-mono text-amber-900 mt-1 block">
                {casesData?.review_required_count ?? 0}
              </span>
              <span className="text-[11px] text-amber-700 mt-1 block">Initial Baseline</span>
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 shadow-xs">
              <span className="text-[11px] font-mono uppercase text-sky-700 font-semibold block">IN REVIEW</span>
              <span className="text-2xl font-bold font-mono text-sky-900 mt-1 block">
                {casesData?.in_review_count ?? 0}
              </span>
              <span className="text-[11px] text-sky-700 mt-1 block">Active Examination</span>
            </div>

            <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 shadow-xs">
              <span className="text-[11px] font-mono uppercase text-violet-700 font-semibold block">FOLLOW-UP REQUIRED</span>
              <span className="text-2xl font-bold font-mono text-violet-900 mt-1 block">
                {casesData?.followup_required_count ?? 0}
              </span>
              <span className="text-[11px] text-violet-700 mt-1 block">Tasks Pending</span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
              <span className="text-[11px] font-mono uppercase text-emerald-700 font-semibold block">REVIEW COMPLETED</span>
              <span className="text-2xl font-bold font-mono text-emerald-900 mt-1 block">
                {casesData?.review_completed_count ?? 0}
              </span>
              <span className="text-[11px] text-emerald-700 mt-1 block">Finalized Reviews</span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search case dossiers, IDs, entities, locations, narratives..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Workflow Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 cursor-pointer font-medium"
                >
                  <option value="ALL">All Workflow Statuses</option>
                  <option value="Review Required">Review Required</option>
                  <option value="In Review">In Review</option>
                  <option value="Follow-up Required">Follow-up Required</option>
                  <option value="Review Completed">Review Completed</option>
                </select>

                {/* Analytical Priority Filter */}
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 cursor-pointer font-medium"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="STANDARD">Standard Priority</option>
                </select>

                {/* Source Filter */}
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 cursor-pointer font-medium"
                >
                  <option value="ALL">All Sources</option>
                  <option value="police_case_management">Police Case Mgmt</option>
                  <option value="call_detail_records">Telecom CDR</option>
                  <option value="financial_intelligence_unit">Financial FIU</option>
                  <option value="informant_tip">HUMINT Tips</option>
                </select>

                {/* Sort Order */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 cursor-pointer font-medium"
                >
                  <option value="date_desc">Date (Newest First)</option>
                  <option value="date_asc">Date (Oldest First)</option>
                  <option value="anomalies">Most Anomalies</option>
                  <option value="entities">Most Entities</option>
                </select>
              </div>
            </div>

            {/* Sub-bar showing result count & active filters */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="font-mono">
                Showing {filteredCases.length} of {casesData?.total_cases ?? 0} cases
                {casesData?.date_coverage && (
                  <span className="ml-2 text-slate-400">
                    ({casesData.date_coverage.start} → {casesData.date_coverage.end})
                  </span>
                )}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Click any case card to open the investigation workspace
              </span>
            </div>
          </div>

          {/* Cards View */}
          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCases.map((caseItem) => {
                const sTheme = getSourceTheme(caseItem.source);
                const SrcIcon = sTheme.icon;
                const wfBadge = WORKFLOW_BADGES[caseItem.workflow_status] ?? WORKFLOW_BADGES["Review Required"];

                return (
                  <div
                    key={caseItem.case_id}
                    onClick={() => handleOpenCase(caseItem.case_id)}
                    className="rounded-xl border border-slate-200 bg-white p-5 hover:border-cyan-300 hover:shadow-xs transition-all cursor-pointer space-y-3.5 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 group-hover:bg-cyan-50 group-hover:text-cyan-900 group-hover:border-cyan-200 transition-colors">
                            {caseItem.case_id}
                          </span>
                          <span className="text-xs text-slate-300">•</span>
                          <span
                            className="text-[10px] font-mono px-2 py-0.5 rounded border font-semibold"
                            style={{
                              backgroundColor: caseItem.priority === "HIGH" ? "#FFF1F2" : caseItem.priority === "MEDIUM" ? "#FFFBEB" : "#F8FAFC",
                              borderColor: caseItem.priority === "HIGH" ? "#FECDD3" : caseItem.priority === "MEDIUM" ? "#FDE68A" : "#E2E8F0",
                              color: caseItem.priority === "HIGH" ? "#9F1239" : caseItem.priority === "MEDIUM" ? "#92400E" : "#475569",
                            }}
                          >
                            {caseItem.priority}
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-medium ${wfBadge.bg} ${wfBadge.border} ${wfBadge.text}`}>
                            {caseItem.workflow_status}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-cyan-900 transition-colors line-clamp-1">
                          {caseItem.title}
                        </h3>
                      </div>

                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded border shrink-0"
                        style={{
                          backgroundColor: sTheme.bg,
                          borderColor: sTheme.border,
                          color: sTheme.color,
                        }}
                      >
                        <SrcIcon className="w-3 h-3" />
                        {caseItem.source_label}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      "{caseItem.summary}"
                    </p>

                    {/* Entities preview */}
                    {caseItem.entities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {caseItem.entities.slice(0, 4).map((ent, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200"
                          >
                            {ent}
                          </span>
                        ))}
                        {caseItem.entities.length > 4 && (
                          <span className="text-[10px] font-mono text-slate-400 px-1 py-0.2">
                            +{caseItem.entities.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Footer strip */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>
                        {caseItem.date} {caseItem.time ? `(${caseItem.time})` : ""}
                      </span>
                      <div className="flex items-center gap-3">
                        <span>{caseItem.entity_count} ents</span>
                        {caseItem.anomaly_count > 0 && (
                          <span className="text-rose-700 font-semibold">{caseItem.anomaly_count} signals</span>
                        )}
                        <span className="text-cyan-700 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          Open File <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-mono uppercase text-slate-500 text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Case ID</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Title & Summary</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Workflow Status</th>
                    <th className="px-4 py-3 text-right">Entities</th>
                    <th className="px-4 py-3 text-right">Signals</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCases.map((caseItem) => {
                    const sTheme = getSourceTheme(caseItem.source);
                    const SrcIcon = sTheme.icon;
                    const wfBadge = WORKFLOW_BADGES[caseItem.workflow_status] ?? WORKFLOW_BADGES["Review Required"];

                    return (
                      <tr
                        key={caseItem.case_id}
                        onClick={() => handleOpenCase(caseItem.case_id)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {caseItem.case_id}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                          {caseItem.date}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border"
                            style={{
                              backgroundColor: sTheme.bg,
                              borderColor: sTheme.border,
                              color: sTheme.color,
                            }}
                          >
                            <SrcIcon className="w-2.5 h-2.5" />
                            {caseItem.source_label}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <div className="font-bold text-slate-900 truncate">
                            {caseItem.short_title}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {caseItem.summary}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className="text-[10px] font-mono px-2 py-0.5 rounded border font-semibold"
                            style={{
                              backgroundColor: caseItem.priority === "HIGH" ? "#FFF1F2" : caseItem.priority === "MEDIUM" ? "#FFFBEB" : "#F8FAFC",
                              borderColor: caseItem.priority === "HIGH" ? "#FECDD3" : caseItem.priority === "MEDIUM" ? "#FDE68A" : "#E2E8F0",
                              color: caseItem.priority === "HIGH" ? "#9F1239" : caseItem.priority === "MEDIUM" ? "#92400E" : "#475569",
                            }}
                          >
                            {caseItem.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-medium ${wfBadge.bg} ${wfBadge.border} ${wfBadge.text}`}>
                            {caseItem.workflow_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-right text-slate-700 whitespace-nowrap">
                          {caseItem.entity_count}
                        </td>
                        <td className="px-4 py-3 font-mono text-right whitespace-nowrap">
                          <span className={caseItem.anomaly_count > 0 ? "text-rose-700 font-bold" : "text-slate-400"}>
                            {caseItem.anomaly_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCase(caseItem.case_id);
                            }}
                            className="text-cyan-700 hover:text-cyan-900 font-medium inline-flex items-center gap-1 cursor-pointer"
                          >
                            Open File <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
