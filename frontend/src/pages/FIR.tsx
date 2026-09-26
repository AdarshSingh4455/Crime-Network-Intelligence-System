import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Shield,
  AlertTriangle,
  FileText,
  Calendar,
  Building,
  UserCheck,
  UserX,
  Users,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Scale,
  X,
  Lock,
  Tag,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { api } from "../api/client";
import {
  FIRRecord,
  FIRListResponse,
  FIRKPIsResponse,
  FIRLegalCatalogItem,
  FIRLegalCatalogResponse,
  FIRAccusedPerson,
  FIRPropertyEvidence,
  FIRLegalProvision,
  BNSSuggestionItem,
} from "../types";
import { useNavigate } from "react-router-dom";

export const FIR: React.FC = () => {
  const navigate = useNavigate();

  // Data states
  const [firs, setFirs] = useState<FIRRecord[]>([]);
  const [kpis, setKpis] = useState<FIRKPIsResponse | null>(null);
  const [catalog, setCatalog] = useState<FIRLegalCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active view tab: "registry" | "create" | "catalog"
  const [activeTab, setActiveTab] = useState<"registry" | "create" | "catalog">("registry");

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stationFilter, setStationFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // Detail Modal / View
  const [selectedFir, setSelectedFir] = useState<FIRRecord | null>(null);

  // Form State for Create / Edit
  const [formAdmin, setFormAdmin] = useState({
    fir_number: "",
    police_station: "Andheri Police Station",
    district: "Mumbai Suburban",
    state: "Maharashtra",
    registration_date: new Date().toISOString().slice(0, 10),
    occurrence_date_from: "",
    occurrence_date_to: "",
    general_diary_ref: "",
    investigating_officer: "Inspector K. Shinde",
    officer_rank: "Inspector of Police",
    officer_id: "MH-MUM-4402",
  });

  const [formComplainant, setFormComplainant] = useState({
    name: "",
    contact_number: "",
    address: "",
    relationship_to_victim: "Self",
    complainant_role: "Aggrieved Person",
  });

  const [formIncident, setFormIncident] = useState({
    incident_location: "",
    jurisdiction: "Andheri Division",
    incident_date: new Date().toISOString().slice(0, 10),
    incident_category: "Financial Fraud / Hawala",
    summary: "",
  });

  const [formNarrative, setFormNarrative] = useState("");
  const [formAccused, setFormAccused] = useState<Array<{ name: string; alias: string; status: string; role: string }>>([
    { name: "", alias: "", status: "Suspect", role: "" },
  ]);
  const [formProvisions, setFormProvisions] = useState<Array<{ bns_section: string; ipc_legacy_section: string; offense_name: string; officer_notes: string }>>([
    {
      bns_section: "BNS Section 318(4)",
      ipc_legacy_section: "IPC Section 420",
      offense_name: "Cheating and Dishonestly Inducing Delivery of Property",
      officer_notes: "Allegation of structured fund diversion",
    },
  ]);
  const [formIntelligence, setFormIntelligence] = useState({
    case_id: "",
    linked_entity_ids: "",
    linked_evidence_ids: "",
    linked_record_ids: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // BNS Suggestion Engine state
  const [bnsSuggestions, setBnsSuggestions] = useState<BNSSuggestionItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [suggestionSearch, setSuggestionSearch] = useState("");
  const [suggestionFilterConfidence, setSuggestionFilterConfidence] = useState<"ALL" | "HIGH" | "MEDIUM">("ALL");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const suggestionAbortRef = React.useRef<AbortController | null>(null);

  // ─── Data Loading ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, kpiRes, catRes] = await Promise.all([
        api.listFirs({ limit: 100 }),
        api.getFirKPIs(),
        api.getFirLegalProvisions(),
      ]);
      setFirs(listRes.firs || []);
      setKpis(kpiRes);
      setCatalog(catRes.provisions || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load FIR records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dynamic real-time high-precision BNS suggestion trigger with cancellation
  useEffect(() => {
    if (activeTab !== "create") return;
    if (!formIncident.incident_category && !formNarrative.trim() && !formIncident.summary.trim()) {
      setBnsSuggestions([]);
      return;
    }

    if (suggestionAbortRef.current) {
      suggestionAbortRef.current.abort();
    }
    const controller = new AbortController();
    suggestionAbortRef.current = controller;

    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const fullText = `${formIncident.summary} ${formNarrative}`.trim();
        const res = await api.suggestBnsProvisions(formIncident.incident_category, fullText);
        if (!controller.signal.aborted && res && res.suggestions) {
          setBnsSuggestions(res.suggestions);
        }
      } catch (err: any) {
        if (err.name !== "CanceledError" && err.name !== "AbortError") {
          console.error("Failed to fetch BNS suggestions:", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSuggestions(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [formIncident.incident_category, formIncident.summary, formNarrative, activeTab]);

  const handleAcceptSuggestion = (sug: BNSSuggestionItem) => {
    const exists = formProvisions.some((p) => p.bns_section === sug.bns_section);
    if (!exists) {
      setFormProvisions((prev) => [
        ...prev,
        {
          bns_section: sug.bns_section,
          ipc_legacy_section: sug.ipc_legacy_section,
          offense_name: sug.offense_name,
          officer_notes: sug.reason || sug.match_reason || "Accepted from AI Statutory Recommendation Engine",
        },
      ]);
    }
  };

  const handleCopySection = (sug: BNSSuggestionItem) => {
    const textToCopy = `${sug.bns_section} (${sug.ipc_legacy_section}) - ${sug.offense_name}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSection(sug.bns_section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleDismissSuggestion = (bnsSection: string) => {
    setDismissedSuggestions((prev) => new Set(prev).add(bnsSection));
  };

  // ─── Search & Filter Execution ────────────────────────────────────────────

  const handleExecuteSearch = async () => {
    setLoading(true);
    try {
      const res = await api.searchFirs({
        q: searchQuery.trim() || undefined,
        police_station: stationFilter.trim() || undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        start_date: startDateFilter || undefined,
        end_date: endDateFilter || undefined,
      });
      setFirs(res.firs || []);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setStationFilter("");
    setStartDateFilter("");
    setEndDateFilter("");
    loadData();
  };

  // ─── Create FIR Submission ────────────────────────────────────────────────

  const handleAddAccusedRow = () => {
    setFormAccused([...formAccused, { name: "", alias: "", status: "Suspect", role: "" }]);
  };

  const handleRemoveAccusedRow = (index: number) => {
    setFormAccused(formAccused.filter((_, i) => i !== index));
  };

  const handleAddProvisionRow = () => {
    setFormProvisions([
      ...formProvisions,
      {
        bns_section: "BNS Section 61(2)",
        ipc_legacy_section: "IPC Section 120B",
        offense_name: "Criminal Conspiracy",
        officer_notes: "",
      },
    ]);
  };

  const handleRemoveProvisionRow = (index: number) => {
    setFormProvisions(formProvisions.filter((_, i) => i !== index));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);

    if (!formAdmin.fir_number.trim()) {
      setFormMessage({ type: "error", text: "Please enter a valid FIR number." });
      return;
    }
    if (!formAdmin.police_station.trim()) {
      setFormMessage({ type: "error", text: "Police station is required." });
      return;
    }
    if (!formComplainant.name.trim()) {
      setFormMessage({ type: "error", text: "Complainant name is required." });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        administrative: formAdmin,
        complainant: formComplainant,
        incident: formIncident,
        narrative: formNarrative,
        accused: formAccused
          .filter((a) => a.name.trim().length > 0)
          .map((a, idx) => ({
            accused_id: `ACC-${String(idx + 1).padStart(2, "0")}`,
            name: a.name.trim(),
            alias: a.alias.trim(),
            status: a.status,
            alleged_role: a.role,
          })),
        legal_provisions: formProvisions.map((p, idx) => ({
          provision_id: `LP-${String(idx + 1).padStart(2, "0")}`,
          bns_section: p.bns_section,
          ipc_legacy_section: p.ipc_legacy_section,
          offense_name: p.offense_name,
          review_status: "Pending Officer Review",
          officer_notes: p.officer_notes,
        })),
        intelligence_links: {
          case_id: formIntelligence.case_id.trim() || undefined,
          linked_entity_ids: formIntelligence.linked_entity_ids
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          linked_evidence_ids: formIntelligence.linked_evidence_ids
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          linked_record_ids: formIntelligence.linked_record_ids
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      };

      const created = await api.createFir(payload);
      setFormMessage({ type: "success", text: `FIR ${created.fir_number} successfully registered and persisted!` });
      // Reset form
      setFormAdmin({
        ...formAdmin,
        fir_number: "",
      });
      setFormNarrative("");
      // Reload and switch back to registry after 1.5s
      setTimeout(() => {
        loadData();
        setActiveTab("registry");
        setSelectedFir(created);
      }, 1200);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to create FIR";
      setFormMessage({ type: "error", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Legal Review Toggle on Detail View ───────────────────────────────────

  const handleToggleLegalReview = async (firId: string, provisionId: string) => {
    if (!selectedFir) return;
    const updatedProvisions = selectedFir.legal_provisions.map((lp) => {
      if (lp.provision_id === provisionId) {
        const nextStatus =
          lp.review_status === "Reviewed & Verified" ? "Pending Officer Review" : "Reviewed & Verified";
        return { ...lp, review_status: nextStatus };
      }
      return lp;
    });

    try {
      const updated = await api.updateFir(firId, {
        legal_provisions: updatedProvisions,
        audit_action: "REVIEWED",
        audit_summary: `Legal provision status updated by reviewing officer.`,
      });
      setSelectedFir(updated);
      setFirs((prev) => prev.map((f) => (f.fir_id === firId ? updated : f)));
    } catch (err) {
      console.error("Failed to update review status:", err);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100">
      {/* ─── Page Header ────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white/80 backdrop-blur-md shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-700 text-white flex items-center justify-center shadow-xs">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">FIR Workspace</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Statutory First Information Reports · BNS 2023 Provisions · Case Intake & Evidence Cross-Reference
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab(activeTab === "create" ? "registry" : "create");
                setFormMessage(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-all ${
                activeTab === "create"
                  ? "bg-slate-800 text-white hover:bg-slate-700"
                  : "bg-cyan-700 text-white hover:bg-cyan-800"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              {activeTab === "create" ? "View Registry" : "Register New FIR"}
            </button>

            <button
              onClick={() => setActiveTab("catalog")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                activeTab === "catalog"
                  ? "bg-indigo-50 text-indigo-700 border-indigo-300 font-semibold"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              BNS / IPC Reference
            </button>

            <button
              onClick={loadData}
              className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              title="Refresh Registry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Epistemic Jurisprudence Notice Banner ──────────────────────────── */}
      <div className="px-6 py-2 bg-amber-50/80 border-b border-amber-200/80 text-[11px] text-amber-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Statutory Legal Safeguard:</strong> In accordance with Indian Criminal Jurisprudence (Sec. 173 BNSS
            / 154 CrPC), an FIR is an intake statement alleging an offense, NOT substantive proof of guilt. Mention in
            an FIR does not automatically establish guilt, criminal hierarchy, or verified relational links.
          </span>
        </div>
      </div>

      {/* ─── Main Content Body ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ─── KPI Metric Cards ─────────────────────────────────────────────── */}
        {kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Total FIRs</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{kpis.total_firs}</span>
              <span className="text-[10px] text-slate-400">Persisted Records</span>
            </div>

            <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Registered</span>
              <span className="text-xl font-bold font-mono text-cyan-700 mt-1 block">
                {kpis.by_status?.Registered || 0}
              </span>
              <span className="text-[10px] text-cyan-600">Active Intake</span>
            </div>

            <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Under Investigation</span>
              <span className="text-xl font-bold font-mono text-indigo-700 mt-1 block">
                {kpis.by_status?.["Under Investigation"] || 0}
              </span>
              <span className="text-[10px] text-indigo-600">Inquiry Active</span>
            </div>

            <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Accused / POIs</span>
              <span className="text-xl font-bold font-mono text-amber-700 mt-1 block">
                {kpis.total_accused_count || 0}
              </span>
              <span className="text-[10px] text-amber-600">Presumption of Innocence</span>
            </div>

            <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Linked Cases</span>
              <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">
                {kpis.linked_case_count || 0}
              </span>
              <span className="text-[10px] text-emerald-600">Dossier Association</span>
            </div>

            <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Pending BNS Reviews</span>
              <span className="text-xl font-bold font-mono text-purple-700 mt-1 block">
                {kpis.pending_review_provisions || 0}
              </span>
              <span className="text-[10px] text-purple-600">Officer Validation Needed</span>
            </div>
          </div>
        )}

        {/* ─── VIEW 1: REGISTRY & SEARCH ────────────────────────────────────── */}
        {activeTab === "registry" && (
          <div className="space-y-4">
            {/* Filter / Search Bar */}
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by FIR #, accused name, complainant, police station, BNS section, narrative..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleExecuteSearch()}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-cyan-600"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 focus:ring-2 focus:ring-cyan-600"
                  >
                    <option value="all">All Categories</option>
                    <option value="Financial Fraud / Hawala">Financial Fraud / Hawala</option>
                    <option value="Smuggling / Customs">Smuggling / Customs</option>
                    <option value="Organised Extortion">Organised Extortion</option>
                    <option value="Document Forgery">Document Forgery</option>
                    <option value="General Investigation">General Investigation</option>
                  </select>

                  <button
                    onClick={handleExecuteSearch}
                    className="px-3.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-2xs"
                  >
                    Filter
                  </button>

                  <button
                    onClick={handleResetFilters}
                    className="px-2.5 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* FIR Table Card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              {loading ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500">Loading persistent FIR registry...</p>
                </div>
              ) : firs.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800">No FIR Records Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    The persistent FIR registry is currently empty. Click "Register New FIR" to file an operational
                    statutory intake report.
                  </p>
                  <button
                    onClick={() => setActiveTab("create")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-700 text-white text-xs font-semibold rounded-lg hover:bg-cyan-800 transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Register First FIR
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 font-mono text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">FIR Number</th>
                        <th className="px-3 py-3">Station & District</th>
                        <th className="px-3 py-3">Date Registered</th>
                        <th className="px-3 py-3">Complainant</th>
                        <th className="px-3 py-3">Accused Persons</th>
                        <th className="px-3 py-3">Primary BNS Sections</th>
                        <th className="px-3 py-3 text-center">Status</th>
                        <th className="px-3 py-3 text-center">Linked Case</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {firs.map((fir) => (
                        <tr key={fir.fir_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-slate-900 block">{fir.fir_number}</span>
                            <span className="text-[10px] font-mono text-slate-400">{fir.fir_id}</span>
                          </td>

                          <td className="px-3 py-3">
                            <span className="font-semibold text-slate-800 block">
                              {fir.administrative?.police_station || "N/A"}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {fir.administrative?.district || "Maharashtra"}
                            </span>
                          </td>

                          <td className="px-3 py-3 font-mono text-slate-600">
                            {fir.administrative?.registration_date || fir.created_at?.slice(0, 10)}
                          </td>

                          <td className="px-3 py-3">
                            <span className="font-medium text-slate-800 block">{fir.complainant?.name || "N/A"}</span>
                            <span className="text-[10px] text-slate-400">
                              {fir.complainant?.complainant_role || "Informant"}
                            </span>
                          </td>

                          <td className="px-3 py-3">
                            {fir.accused && fir.accused.length > 0 ? (
                              <div className="space-y-0.5">
                                {fir.accused.slice(0, 2).map((a, i) => (
                                  <span
                                    key={i}
                                    className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-mono mr-1"
                                  >
                                    {a.name}
                                  </span>
                                ))}
                                {fir.accused.length > 2 && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    +{fir.accused.length - 2} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Unknown Person(s)</span>
                            )}
                          </td>

                          <td className="px-3 py-3">
                            {fir.legal_provisions && fir.legal_provisions.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {fir.legal_provisions.map((lp, i) => (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-mono"
                                    title={`Legacy: ${lp.ipc_legacy_section}`}
                                  >
                                    {lp.bns_section}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Pending Framing</span>
                            )}
                          </td>

                          <td className="px-3 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                fir.status === "Registered"
                                  ? "bg-cyan-50 text-cyan-800 border border-cyan-200"
                                  : fir.status === "Under Investigation"
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {fir.status}
                            </span>
                          </td>

                          <td className="px-3 py-3 text-center">
                            {fir.intelligence_links?.case_id ? (
                              <button
                                onClick={() => navigate(`/cases?id=${encodeURIComponent(fir.intelligence_links.case_id!)}`)}
                                className="font-mono text-cyan-700 hover:text-cyan-900 font-semibold underline text-[11px]"
                              >
                                {fir.intelligence_links.case_id}
                              </button>
                            ) : (
                              <span className="text-slate-300 font-mono text-[10px]">None</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSelectedFir(fir)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 border border-slate-200 hover:border-cyan-300 rounded transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── VIEW 2: CREATE / REGISTER NEW FIR ────────────────────────────── */}
        {activeTab === "create" && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6 max-w-4xl mx-auto">
            <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-700" />
                  Statutory FIR Registration Intake Form
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enter administrative and substantive allegations for statutory registration. All entries are persisted to
                  the operational registry.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("registry")}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Back to Registry
              </button>
            </div>

            {formMessage && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  formMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {formMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{formMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-6">
              {/* Section A: Administrative Information */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                    A
                  </span>
                  Administrative & Police Station Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      FIR Number <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. FIR-2024-00101"
                      value={formAdmin.fir_number}
                      onChange={(e) => setFormAdmin({ ...formAdmin, fir_number: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-cyan-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Police Station <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formAdmin.police_station}
                      onChange={(e) => setFormAdmin({ ...formAdmin, police_station: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-cyan-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">District</label>
                    <input
                      type="text"
                      value={formAdmin.district}
                      onChange={(e) => setFormAdmin({ ...formAdmin, district: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-cyan-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Registration Date</label>
                    <input
                      type="date"
                      value={formAdmin.registration_date}
                      onChange={(e) => setFormAdmin({ ...formAdmin, registration_date: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-cyan-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Investigating Officer (IO)</label>
                    <input
                      type="text"
                      value={formAdmin.investigating_officer}
                      onChange={(e) => setFormAdmin({ ...formAdmin, investigating_officer: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-cyan-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">General Diary Reference</label>
                    <input
                      type="text"
                      placeholder="e.g. GD No. 42/2024"
                      value={formAdmin.general_diary_ref}
                      onChange={(e) => setFormAdmin({ ...formAdmin, general_diary_ref: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-cyan-600"
                    />
                  </div>
                </div>
              </div>

              {/* Section B: Informant / Complainant */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                    B
                  </span>
                  Informant / Complainant Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Complainant Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={formComplainant.name}
                      onChange={(e) => setFormComplainant({ ...formComplainant, name: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-cyan-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Contact Number</label>
                    <input
                      type="text"
                      placeholder="Mobile / Phone"
                      value={formComplainant.contact_number}
                      onChange={(e) => setFormComplainant({ ...formComplainant, contact_number: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-cyan-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Complainant Role</label>
                    <input
                      type="text"
                      value={formComplainant.complainant_role}
                      onChange={(e) => setFormComplainant({ ...formComplainant, complainant_role: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-cyan-600"
                    />
                  </div>
                </div>
              </div>

              {/* Section C: Accused Persons */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-600 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                      C
                    </span>
                    Accused / Persons of Interest (Intake Allegation Only)
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddAccusedRow}
                    className="text-[11px] font-semibold text-cyan-700 hover:text-cyan-900 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Accused
                  </button>
                </div>

                <div className="p-2.5 bg-amber-50 rounded-lg text-[11px] text-amber-800 border border-amber-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Accused listings reflect preliminary statements recorded at FIR lodging. They do not constitute
                    judicial evidence of guilt.
                  </span>
                </div>

                <div className="space-y-2">
                  {formAccused.map((acc, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg items-center"
                    >
                      <div>
                        <input
                          type="text"
                          placeholder="Accused Name / Unknown"
                          value={acc.name}
                          onChange={(e) => {
                            const n = [...formAccused];
                            n[idx].name = e.target.value;
                            setFormAccused(n);
                          }}
                          className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Alias / Nickname"
                          value={acc.alias}
                          onChange={(e) => {
                            const n = [...formAccused];
                            n[idx].alias = e.target.value;
                            setFormAccused(n);
                          }}
                          className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <select
                          value={acc.status}
                          onChange={(e) => {
                            const n = [...formAccused];
                            n[idx].status = e.target.value;
                            setFormAccused(n);
                          }}
                          className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                        >
                          <option value="Suspect">Suspect</option>
                          <option value="Identified">Identified</option>
                          <option value="Named in FIR">Named in FIR</option>
                          <option value="Unknown">Unknown</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Alleged Role"
                          value={acc.role}
                          onChange={(e) => {
                            const n = [...formAccused];
                            n[idx].role = e.target.value;
                            setFormAccused(n);
                          }}
                          className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                        />
                        {formAccused.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAccusedRow(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section D: Incident & Narrative */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                    D
                  </span>
                  Incident Details & Narrative
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Incident Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Andheri East, Mumbai"
                      value={formIncident.incident_location}
                      onChange={(e) => setFormIncident({ ...formIncident, incident_location: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-cyan-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Category</label>
                    <select
                      value={formIncident.incident_category}
                      onChange={(e) => setFormIncident({ ...formIncident, incident_category: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-cyan-600"
                    >
                      <option value="Financial Fraud / Hawala">Financial Fraud / Hawala</option>
                      <option value="Smuggling / Customs">Smuggling / Customs</option>
                      <option value="Organised Extortion">Organised Extortion</option>
                      <option value="Document Forgery">Document Forgery</option>
                      <option value="General Investigation">General Investigation</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Incident Summary</label>
                  <input
                    type="text"
                    placeholder="Brief single-line statement of alleged incident"
                    value={formIncident.summary}
                    onChange={(e) => setFormIncident({ ...formIncident, summary: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-cyan-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Structured Narrative / Recorded Complaint
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Enter the factual statement of the complainant as recorded..."
                    value={formNarrative}
                    onChange={(e) => setFormNarrative(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-cyan-600 font-sans"
                  />
                </div>
              </div>

              {/* Section E: Legal Provisions */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-600 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                      E
                    </span>
                    BNS (2023) Legal Provisions (with Legacy IPC Mapping)
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddProvisionRow}
                    className="text-[11px] font-semibold text-cyan-700 hover:text-cyan-900 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Legal Section
                  </button>
                </div>

                {/* Real-time High-Precision BNS Recommendation Card */}
                {bnsSuggestions.filter((s) => !dismissedSuggestions.has(s.bns_section)).length > 0 && (
                  <div className="p-4 bg-gradient-to-r from-purple-50/90 via-indigo-50/90 to-cyan-50/90 border border-purple-200 rounded-xl space-y-3 shadow-xs transition-all">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center shadow-2xs">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-purple-950 flex items-center gap-2">
                            AI Statutory Recommendation Engine — BNS 2023
                            {loadingSuggestions && (
                              <span className="flex items-center gap-1 text-[10px] text-purple-600 font-normal">
                                <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                                Analyzing...
                              </span>
                            )}
                          </h4>
                          <p className="text-[10px] text-purple-700">
                            High-precision NLP & Hinglish synonym evaluation against 40+ canonical BNS statutory provisions
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-0.5 bg-purple-100/90 text-purple-900 border border-purple-300 rounded-full font-mono text-[10px] font-bold">
                          {bnsSuggestions.filter((s) => !dismissedSuggestions.has(s.bns_section)).length} Recommendations
                        </span>
                      </div>
                    </div>

                    {/* Filter & Quick Search Bar inside BNS Suggestions Card */}
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <div className="relative flex-1 w-full">
                        <Search className="w-3.5 h-3.5 text-purple-400 absolute left-2.5 top-2" />
                        <input
                          type="text"
                          placeholder="Search recommended BNS sections, IPC, or matched keywords..."
                          value={suggestionSearch}
                          onChange={(e) => setSuggestionSearch(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-1 text-xs bg-white/90 border border-purple-200 rounded-lg text-slate-800 placeholder:text-purple-300 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setSuggestionFilterConfidence("ALL")}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                            suggestionFilterConfidence === "ALL"
                              ? "bg-purple-700 text-white shadow-2xs"
                              : "bg-white/80 text-purple-800 hover:bg-purple-100 border border-purple-200"
                          }`}
                        >
                          All Matches
                        </button>
                        <button
                          type="button"
                          onClick={() => setSuggestionFilterConfidence("HIGH")}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                            suggestionFilterConfidence === "HIGH"
                              ? "bg-emerald-700 text-white shadow-2xs"
                              : "bg-white/80 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                          }`}
                        >
                          High Precision (≥70%)
                        </button>
                      </div>
                    </div>

                    {/* Suggestions List */}
                    <div className="grid grid-cols-1 gap-2.5 max-h-96 overflow-y-auto pr-1">
                      {bnsSuggestions
                        .filter((s) => !dismissedSuggestions.has(s.bns_section))
                        .filter((s) => {
                          if (suggestionFilterConfidence === "HIGH") {
                            return (s.confidence || 0) >= 0.70;
                          }
                          return true;
                        })
                        .filter((s) => {
                          if (!suggestionSearch.trim()) return true;
                          const q = suggestionSearch.toLowerCase();
                          return (
                            s.bns_section.toLowerCase().includes(q) ||
                            s.ipc_legacy_section.toLowerCase().includes(q) ||
                            s.offense_name.toLowerCase().includes(q) ||
                            (s.matched_keywords && s.matched_keywords.some((k) => k.toLowerCase().includes(q))) ||
                            (s.reason && s.reason.toLowerCase().includes(q))
                          );
                        })
                        .map((sug, idx) => {
                          const isAlreadyAdded = formProvisions.some((p) => p.bns_section === sug.bns_section);
                          const confPct = sug.confidence_percentage || `${Math.round((sug.confidence || 0) * 100)}%`;
                          const isHigh = (sug.confidence || 0) >= 0.70;

                          return (
                            <div
                              key={idx}
                              className="p-3 bg-white border border-purple-200/80 hover:border-purple-300 rounded-xl flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-2xs transition-all"
                            >
                              <div className="space-y-1.5 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono font-bold text-purple-950 text-xs bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                    {sug.bns_section}
                                  </span>

                                  <span className="text-[10px] font-mono font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                    Legacy: {sug.ipc_legacy_section}
                                  </span>

                                  {/* Confidence Badge */}
                                  <span
                                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                                      isHigh
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                        : "bg-indigo-50 text-indigo-800 border-indigo-200"
                                    }`}
                                  >
                                    <Sparkles className="w-3 h-3 text-emerald-600" />
                                    {confPct} Precision Match
                                  </span>

                                  {/* Statutory Badges */}
                                  {sug.cognizable && (
                                    <span
                                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                                        sug.cognizable === "Cognizable"
                                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                                          : "bg-amber-50 text-amber-700 border border-amber-200"
                                      }`}
                                    >
                                      {sug.cognizable}
                                    </span>
                                  )}

                                  {sug.bailable && (
                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold bg-slate-100 text-slate-700">
                                      {sug.bailable}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <p className="text-xs font-bold text-slate-900">{sug.offense_name}</p>
                                  {sug.description && (
                                    <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{sug.description}</p>
                                  )}
                                </div>

                                {sug.punishment && (
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    <strong>Statutory Punishment:</strong> {sug.punishment}
                                  </div>
                                )}

                                {/* Rationale & Matched Keyword Tags */}
                                <div className="space-y-1 pt-1">
                                  <p className="text-[10px] text-purple-900 font-medium">
                                    <span className="font-semibold text-purple-950">Match Rationale:</span> {sug.reason || sug.match_reason}
                                  </p>

                                  {sug.matched_keywords && sug.matched_keywords.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1">
                                      <span className="text-[10px] text-slate-400 font-mono">Matched Keywords:</span>
                                      {sug.matched_keywords.map((kw, kidx) => (
                                        <span
                                          key={kidx}
                                          className="text-[9px] font-mono bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded"
                                        >
                                          #{kw}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                {isAlreadyAdded ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Added to FIR
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleAcceptSuggestion(sug)}
                                    className="px-3 py-1.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-all hover:scale-[1.02]"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    Accept & Add Section
                                  </button>
                                )}

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleCopySection(sug)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-medium flex items-center gap-1 transition-colors"
                                    title="Copy provision details"
                                  >
                                    {copiedSection === sug.bns_section ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        Copied!
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3 text-slate-500" />
                                        Copy
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDismissSuggestion(sug.bns_section)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors"
                                    title="Dismiss recommendation"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    <div className="text-[10px] text-purple-900/80 flex items-center gap-1 pt-1 border-t border-purple-200/50">
                      <Scale className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                      <span>
                        Non-binding statutory assistance under BNSS 2023. Final section framing remains under investigating officer's judicial discretion.
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {formProvisions.map((prov, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                        <div>
                          <label className="text-[10px] text-slate-500 font-mono block mb-0.5">BNS Section (Primary)</label>
                          <input
                            type="text"
                            value={prov.bns_section}
                            onChange={(e) => {
                              const n = [...formProvisions];
                              n[idx].bns_section = e.target.value;
                              setFormProvisions(n);
                            }}
                            className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white font-mono font-bold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 font-mono block mb-0.5">IPC Section (Legacy Reference)</label>
                          <input
                            type="text"
                            value={prov.ipc_legacy_section}
                            onChange={(e) => {
                              const n = [...formProvisions];
                              n[idx].ipc_legacy_section = e.target.value;
                              setFormProvisions(n);
                            }}
                            className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white font-mono text-slate-600"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-500 font-mono block mb-0.5">Offense Name</label>
                            <input
                              type="text"
                              value={prov.offense_name}
                              onChange={(e) => {
                                const n = [...formProvisions];
                                n[idx].offense_name = e.target.value;
                                setFormProvisions(n);
                              }}
                              className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                            />
                          </div>
                          {formProvisions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveProvisionRow(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 mt-3"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Officer Reason / Basis for applying this section..."
                          value={prov.officer_notes}
                          onChange={(e) => {
                            const n = [...formProvisions];
                            n[idx].officer_notes = e.target.value;
                            setFormProvisions(n);
                          }}
                          className="w-full px-2.5 py-1 text-[11px] border border-slate-200 rounded bg-white text-slate-600 placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section F: Intelligence Links */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                    F
                  </span>
                  Intelligence Dossier Cross-Reference (Optional)
                </h3>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-2">
                  <p>
                    Link this statutory FIR to existing intelligence cases or resolved entities. Note: linking does
                    <strong>not</strong> fabricate graph relationships.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Case ID Reference</label>
                      <input
                        type="text"
                        placeholder="e.g. CR-2024-001"
                        value={formIntelligence.case_id}
                        onChange={(e) => setFormIntelligence({ ...formIntelligence, case_id: e.target.value })}
                        className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                        Linked Entity Names (comma separated)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ravi Malhotra, Vikram Rao"
                        value={formIntelligence.linked_entity_ids}
                        onChange={(e) =>
                          setFormIntelligence({ ...formIntelligence, linked_entity_ids: e.target.value })
                        }
                        className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("registry")}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Register & Persist FIR
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── VIEW 3: BNS & IPC LEGAL CATALOG REFERENCE ────────────────────── */}
        {activeTab === "catalog" && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-indigo-700" />
                  Bharatiya Nyaya Sanhita (BNS, 2023) Legal Reference Catalog
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Statutory criminal law reference under BNS with legacy IPC cross-references for economic offenses,
                  organized crime, and conspiracy.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("registry")}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Back to Registry
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {catalog.map((cat, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2.5 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        {cat.bns_section}
                      </span>
                      <span className="ml-2 text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Legacy: {cat.ipc_legacy_section}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">{cat.category}</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{cat.offense_name}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{cat.description}</p>

                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100 text-[10px] font-mono">
                    <span
                      className={`px-1.5 py-0.5 rounded font-semibold ${
                        cat.bailable === "Bailable"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {cat.bailable}
                    </span>
                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                      {cat.cognizable}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: DETAILED FIR RECORD INSPECTOR ──────────────────────────── */}
      {selectedFir && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold">
                    OFFICIAL RECORD
                  </span>
                  <h2 className="text-lg font-bold font-mono text-slate-900">{selectedFir.fir_number}</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedFir.administrative?.police_station} · {selectedFir.administrative?.district} · Registered:{" "}
                  {selectedFir.administrative?.registration_date || selectedFir.created_at?.slice(0, 10)}
                </p>
              </div>
              <button
                onClick={() => setSelectedFir(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Statutory Disclaimer */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] flex items-start gap-2">
                <Scale className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>{selectedFir.epistemic_guardrail}</span>
              </div>

              {/* Administrative Details */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="font-mono font-bold uppercase text-[10px] tracking-wider text-slate-500">
                  Administrative Details
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Status</span>
                    <span className="font-semibold text-slate-800">{selectedFir.status}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Investigating Officer</span>
                    <span className="font-semibold text-slate-800">
                      {selectedFir.administrative?.investigating_officer || "Unassigned"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">GD Reference</span>
                    <span className="font-mono text-slate-800">
                      {selectedFir.administrative?.general_diary_ref || "None"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">System Record ID</span>
                    <span className="font-mono text-slate-800">{selectedFir.fir_id}</span>
                  </div>
                </div>
              </div>

              {/* Complainant & Incident */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <h3 className="font-mono font-bold uppercase text-[10px] tracking-wider text-slate-500">
                    Complainant Details
                  </h3>
                  <p className="font-bold text-slate-900">{selectedFir.complainant?.name || "N/A"}</p>
                  <p className="text-slate-600">Phone: {selectedFir.complainant?.contact_number || "Not recorded"}</p>
                  <p className="text-slate-500">Role: {selectedFir.complainant?.complainant_role || "Informant"}</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <h3 className="font-mono font-bold uppercase text-[10px] tracking-wider text-slate-500">
                    Incident Summary
                  </h3>
                  <p className="font-bold text-slate-900">{selectedFir.incident?.incident_category}</p>
                  <p className="text-slate-600">Location: {selectedFir.incident?.incident_location || "N/A"}</p>
                  <p className="text-slate-500">{selectedFir.incident?.summary}</p>
                </div>
              </div>

              {/* Accused Persons */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="font-mono font-bold uppercase text-[10px] tracking-wider text-slate-500">
                  Accused / Persons of Interest Mentioned ({selectedFir.accused?.length || 0})
                </h3>
                {selectedFir.accused && selectedFir.accused.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedFir.accused.map((acc, i) => (
                      <div
                        key={i}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{acc.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            {acc.status}
                          </span>
                        </div>
                        {acc.alias && <p className="text-slate-500 text-[11px]">Alias: {acc.alias}</p>}
                        {acc.alleged_role && <p className="text-slate-600 text-[11px]">{acc.alleged_role}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No named accused recorded in initial report.</p>
                )}
              </div>

              {/* Legal Provisions (with Officer Review Toggle) */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono font-bold uppercase text-[10px] tracking-wider text-slate-500">
                    BNS Legal Provisions ({selectedFir.legal_provisions?.length || 0})
                  </h3>
                  <span className="text-[10px] text-slate-400 italic">Click status to toggle officer review</span>
                </div>

                <div className="space-y-2">
                  {(selectedFir.legal_provisions || []).map((lp, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-700 text-xs">{lp.bns_section}</span>
                          <span className="text-[10px] font-mono text-slate-400">({lp.ipc_legacy_section})</span>
                        </div>
                        <p className="font-medium text-slate-800 mt-0.5">{lp.offense_name}</p>
                        {lp.officer_notes && <p className="text-slate-500 text-[11px] mt-0.5">{lp.officer_notes}</p>}
                      </div>

                      <button
                        onClick={() => handleToggleLegalReview(selectedFir.fir_id, lp.provision_id)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all shrink-0 ${
                          lp.review_status === "Reviewed & Verified"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200"
                            : "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
                        }`}
                        title="Click to toggle Review Status"
                      >
                        {lp.review_status === "Reviewed & Verified" ? "✓ Reviewed & Verified" : "⏳ Pending Officer Review"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recorded Narrative */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <h3 className="font-mono font-bold uppercase text-[10px] tracking-wider text-slate-500">
                  Recorded Narrative / Statement
                </h3>
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed font-sans bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {selectedFir.narrative || "No extended narrative transcribed."}
                </p>
              </div>

              {/* Intelligence Links */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <h3 className="font-mono font-bold uppercase text-[10px] tracking-wider text-slate-500">
                  Intelligence Dossier Association
                </h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  {selectedFir.intelligence_links?.case_id && (
                    <span className="px-2 py-1 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded font-mono">
                      Case: {selectedFir.intelligence_links.case_id}
                    </span>
                  )}
                  {(selectedFir.intelligence_links?.linked_entity_ids || []).map((ent, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded font-mono"
                    >
                      Entity: {ent}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 italic mt-1">
                  {selectedFir.intelligence_links?.provenance_note}
                </p>
              </div>

              {/* Audit Trail */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <h3 className="font-mono font-bold uppercase text-[10px] tracking-wider text-slate-500">
                  Audit Trail History ({selectedFir.audit_trail?.length || 0})
                </h3>
                <div className="space-y-1 font-mono text-[11px]">
                  {(selectedFir.audit_trail || []).map((a, i) => (
                    <div key={i} className="text-slate-600 flex items-center gap-2">
                      <span className="text-slate-400">{a.timestamp?.slice(0, 19)}</span>
                      <span className="font-bold text-slate-700">[{a.action}]</span>
                      <span>{a.summary}</span>
                      <span className="text-slate-400">({a.user})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">CNIS Operational Record</span>
              <button
                onClick={() => setSelectedFir(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700"
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
