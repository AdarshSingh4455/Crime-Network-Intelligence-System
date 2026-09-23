import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import {
  IntelligenceExplanation,
  ExplainabilityOverviewResponse,
  ExplainabilityType,
  ExplanationStatus
} from "../types";
import {
  ExplanationDrawer,
  ExplanationStatusBadge,
  ExplanationTypeBadge
} from "../components/ExplanationDrawer";
import {
  Lightbulb, Shield, Search, Filter, RefreshCw,
  Sparkles, GitFork, ArrowRight, CheckCircle2,
  AlertTriangle, Layers, ExternalLink, HelpCircle,
  FileText, Users, Network as NetworkIcon, ChevronRight
} from "lucide-react";

export const Explainability: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<ExplainabilityOverviewResponse | null>(null);
  const [explanations, setExplanations] = useState<IntelligenceExplanation[]>([]);

  // Filtering states
  const [selectedType, setSelectedType] = useState<string>(searchParams.get("type") || "ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("q") || "");

  // Active drawer state
  const [activeExplanationId, setActiveExplanationId] = useState<string | null>(searchParams.get("id"));

  // Interactive Path Traversal Explanation State
  const [pathSource, setPathSource] = useState<string>("");
  const [pathTarget, setPathTarget] = useState<string>("");
  const [pathLoading, setPathLoading] = useState<boolean>(false);
  const [pathError, setPathError] = useState<string | null>(null);
  const [pathExplanation, setPathExplanation] = useState<IntelligenceExplanation | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getExplainabilityOverview();
      setOverview(data);
      setExplanations(data.explanations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load explainability overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  // Sync drawer with URL params
  useEffect(() => {
    const idFromUrl = searchParams.get("id");
    if (idFromUrl) {
      setActiveExplanationId(idFromUrl);
    }
  }, [searchParams]);

  const handleSelectExplanation = (id: string) => {
    setActiveExplanationId(id);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("id", id);
    setSearchParams(newParams);
  };

  const handleCloseDrawer = () => {
    setActiveExplanationId(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("id");
    setSearchParams(newParams);
  };

  const handleTracePath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathSource.trim() || !pathTarget.trim()) return;

    try {
      setPathLoading(true);
      setPathError(null);
      const exp = await api.getPathExplanation(pathSource.trim(), pathTarget.trim());
      setPathExplanation(exp);
      setActiveExplanationId(exp.explanation_id);
    } catch (err) {
      setPathError(err instanceof Error ? err.message : "No network path found between entities.");
      setPathExplanation(null);
    } finally {
      setPathLoading(false);
    }
  };

  // Filter explanations
  const filteredExplanations = explanations.filter(exp => {
    if (selectedType !== "ALL" && exp.explanation_type !== selectedType) {
      return false;
    }
    if (selectedStatus !== "ALL" && exp.status !== selectedStatus) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchLabel = exp.target_label?.toLowerCase().includes(q);
      const matchFinding = exp.finding?.toLowerCase().includes(q);
      const matchMethod = exp.analytical_method?.toLowerCase().includes(q);
      const matchId = exp.explanation_id?.toLowerCase().includes(q);
      const matchEntities = exp.related_entities?.some(e => e.toLowerCase().includes(q));
      if (!matchLabel && !matchFinding && !matchMethod && !matchId && !matchEntities) {
        return false;
      }
    }
    return true;
  });

  const allTypes: ExplainabilityType[] = [
    "NETWORK_IMPORTANCE",
    "RELATIONSHIP",
    "ANOMALY",
    "ENTITY_RESOLUTION",
    "COMMUNITY",
    "BRIDGE_NODE",
    "TEMPORAL_PATTERN",
    "LOCATION_PATTERN",
    "PATH_ANALYSIS",
    "REPORT_FINDING"
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
              Grounded Derivations
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Lightbulb className="w-6 h-6 text-cyan-700" />
            Explainable Intelligence Engine
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Answers <span className="font-semibold text-slate-900">“How did CNIS derive this intelligence finding?”</span> through 
            100% deterministic mathematical formulas, graph topology, and evidence traceability. Zero hallucinated inferences.
          </p>
        </div>

        <button
          onClick={fetchOverview}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer shrink-0 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Derivations</span>
        </button>
      </div>

      {/* ── Epistemic Governance Banner ─────────────────────────────────────── */}
      <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-4 flex items-start gap-3.5 shadow-2xs">
        <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-950 space-y-1">
          <div className="font-bold text-amber-900 font-mono uppercase tracking-wider text-[11px]">
            Strict Epistemic Guardrails & Non-Inference Rules
          </div>
          <p className="text-amber-900/90 leading-relaxed font-medium">
            Every explanation produced by this engine represents an explicit analytical computation, graph metric, or observed co-occurrence. 
            Centrality metrics do <span className="underline decoration-amber-400 font-semibold">not</span> equate to criminal hierarchy. 
            Graph edges indicate record co-occurrence, <span className="underline decoration-amber-400 font-semibold">not</span> proven conspiracy. 
            Anomalies are investigative signals requiring independent corroboration.
          </p>
        </div>
      </div>

      {/* ── Overview Metrics KPI Cards ───────────────────────────────────────── */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-mono uppercase text-slate-500 font-semibold">
              Total Explanations
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
              {overview.summary.total_explanations}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              100% deterministic traces
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-mono uppercase text-slate-500 font-semibold">
              Indexed Entities
            </div>
            <div className="text-2xl font-bold text-cyan-800 font-mono mt-1">
              {overview.summary.indexed_entities}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Resolution & importance explained
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-mono uppercase text-slate-500 font-semibold">
              Indexed Anomalies
            </div>
            <div className="text-2xl font-bold text-amber-700 font-mono mt-1">
              {overview.summary.indexed_anomalies}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Rule logic & thresholds anchored
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-mono uppercase text-slate-500 font-semibold">
              Network Edges
            </div>
            <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">
              {overview.summary.indexed_relationships}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Co-occurrence evidence mapped
            </div>
          </div>
        </div>
      )}

      {/* ── Interactive Multi-Hop Path Derivation Tool ────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitFork className="w-4 h-4 text-cyan-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
              Deterministic Multi-Hop Path Derivation
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Explain network connections between two entities
          </span>
        </div>

        <form onSubmit={handleTracePath} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Source Entity (e.g. Ravi Malhotra, Suresh Nair)"
              value={pathSource}
              onChange={e => setPathSource(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-600 font-mono"
            />
          </div>
          <div className="text-slate-400 flex items-center justify-center font-bold">
            <ArrowRight className="w-4 h-4" />
          </div>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Target Entity (e.g. Vikram Sharma, Anita Roy)"
              value={pathTarget}
              onChange={e => setPathTarget(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-600 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={pathLoading || !pathSource.trim() || !pathTarget.trim()}
            className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-2xs"
          >
            {pathLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Computing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Explain Path</span>
              </>
            )}
          </button>
        </form>

        {pathError && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{pathError}</span>
          </div>
        )}
      </div>

      {/* ── Filters & Search ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search explanations by entity, finding, algorithm, or explanation ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-cyan-600 font-sans"
            />
          </div>

          {/* Status selector */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600 font-mono uppercase text-[10px]">Status:</span>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-700 focus:outline-none focus:border-cyan-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETE">COMPLETE (Verified Calculation)</option>
              <option value="SIGNAL">SIGNAL (Investigative Flag)</option>
              <option value="REVIEW_REQUIRED">REVIEW REQUIRED</option>
            </select>
          </div>
        </div>

        {/* Type Filter Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
          <button
            onClick={() => setSelectedType("ALL")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
              selectedType === "ALL"
                ? "bg-cyan-700 text-white font-bold shadow-2xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            ALL ({explanations.length})
          </button>
          {allTypes.map(t => {
            const count = overview?.summary.by_type[t] || 0;
            return (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                  selectedType === t
                    ? "bg-cyan-700 text-white font-bold shadow-2xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {t.replace(/_/g, " ")} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Explanations Table / List ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
            <span>Derived Intelligence Explanations</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px]">
              {filteredExplanations.length} Results
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Click any row to open full 6-stage derivation drawer
          </span>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-600" />
            <span className="text-xs font-mono">Loading deterministic explanations...</span>
          </div>
        ) : filteredExplanations.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <Lightbulb className="w-8 h-8 mx-auto text-slate-300" />
            <div className="text-sm font-semibold text-slate-700">No Explanations Match Filters</div>
            <div className="text-xs text-slate-500">Try adjusting your search query or type filters.</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredExplanations.map(exp => (
              <div
                key={exp.explanation_id}
                onClick={() => handleSelectExplanation(exp.explanation_id)}
                className="p-4 hover:bg-cyan-50/40 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono font-bold text-slate-600 group-hover:text-cyan-800">
                      {exp.explanation_id}
                    </span>
                    <ExplanationTypeBadge type={exp.explanation_type} />
                    <ExplanationStatusBadge status={exp.status} />
                    <span className="text-[11px] font-mono text-cyan-700 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                      {exp.target_label}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-cyan-900 line-clamp-1">
                    {exp.finding}
                  </h3>

                  <div className="text-xs text-slate-500 line-clamp-1">
                    <span className="font-mono text-[11px] font-semibold text-slate-600">Method: </span>
                    {exp.analytical_method}
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono pt-0.5">
                    <span>
                      Evidence: <strong className="text-slate-700">{exp.supporting_evidence_ids.length} items</strong>
                    </span>
                    <span>
                      Source Records: <strong className="text-slate-700">{exp.supporting_source_records.length}</strong>
                    </span>
                    <span>
                      Derivation Steps: <strong className="text-slate-700">{exp.derivation_steps.length}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectExplanation(exp.explanation_id);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 group-hover:border-cyan-300 text-slate-700 group-hover:text-cyan-900 shadow-2xs transition-colors"
                  >
                    <span>Inspect</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-700" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Slide-over Explanation Drawer ───────────────────────────────────── */}
      <ExplanationDrawer
        explanationId={activeExplanationId}
        onClose={handleCloseDrawer}
      />
    </div>
  );
};
