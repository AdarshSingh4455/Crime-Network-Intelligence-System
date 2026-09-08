import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { SuspiciousPattern, AnomalyDetail, EntityType } from "../types";
import {
  AlertTriangle, Search, X, RefreshCw, ExternalLink, Users, Phone,
  Car, MapPin, Building2, DollarSign, Circle, ChevronUp, ChevronDown,
  ChevronsUpDown, FileText, Share2, Activity, Zap, ShieldAlert,
  ArrowRight, CheckCircle2, Info, Eye
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Entity configuration ───────────────────────────────────────────────────
interface EntityCfg { color: string; border: string; bg: string; label: string; icon: LucideIcon; }
const ENTITY_CFG: Record<string, EntityCfg> = {
  PERSON:   { color: "#E11D48", border: "#9F1239", bg: "#FFF1F2", label: "Person",   icon: Users },
  PHONE:    { color: "#6366F1", border: "#4338CA", bg: "#EEF2FF", label: "Phone",    icon: Phone },
  VEHICLE:  { color: "#D97706", border: "#92400E", bg: "#FFFBEB", label: "Vehicle",  icon: Car },
  LOCATION: { color: "#059669", border: "#065F46", bg: "#ECFDF5", label: "Location", icon: MapPin },
  ORG:      { color: "#2563EB", border: "#1E3A8A", bg: "#EFF6FF", label: "Org",      icon: Building2 },
  MONEY:    { color: "#7C3AED", border: "#4C1D95", bg: "#F5F3FF", label: "Money",    icon: DollarSign },
  UNKNOWN:  { color: "#6B7280", border: "#374151", bg: "#F9FAFB", label: "Unknown",  icon: Circle },
};
const getEntityCfg = (type?: string): EntityCfg => ENTITY_CFG[type || ""] ?? ENTITY_CFG.UNKNOWN;

// ─── Pattern styling ────────────────────────────────────────────────────────
interface PatternCfg {
  label: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  barColor: string;
  icon: LucideIcon;
  description: string;
}
const PATTERN_CFG: Record<string, PatternCfg> = {
  burst_activity: {
    label: "Burst Activity",
    badgeBg: "#FFF7ED",
    badgeText: "#C2410C",
    borderColor: "#FDBA74",
    barColor: "#EA580C",
    icon: Zap,
    description: "High interaction volume in short timeframe indicating coordinated operations.",
  },
  new_entity_spike: {
    label: "New Entity Spike",
    badgeBg: "#FFFBEB",
    badgeText: "#B45309",
    borderColor: "#FCD34D",
    barColor: "#D97706",
    icon: ShieldAlert,
    description: "First appearance already linked to multiple known entities.",
  },
  statistical_outlier: {
    label: "Statistical Outlier",
    badgeBg: "#ECFEFF",
    badgeText: "#0E7490",
    borderColor: "#67E8F9",
    barColor: "#0891B2",
    icon: Activity,
    description: "Centrality-feature profile is a statistical outlier across graph topology.",
  },
  structuring: {
    label: "Structuring",
    badgeBg: "#F5F3FF",
    badgeText: "#6D28D9",
    borderColor: "#C4B5FD",
    barColor: "#7C3AED",
    icon: DollarSign,
    description: "Financial transactions deliberately split to evade regulatory reporting thresholds.",
  },
};
const getPatternCfg = (pattern: string): PatternCfg =>
  PATTERN_CFG[pattern] ?? {
    label: pattern,
    badgeBg: "#F1F5F9",
    badgeText: "#475569",
    borderColor: "#CBD5E1",
    barColor: "#64748B",
    icon: AlertTriangle,
    description: "Suspicious pattern detected by intelligence engine.",
  };

// ─── Table Sorting ──────────────────────────────────────────────────────────
type SortKey = "id" | "pattern" | "entity" | "date" | "event_count";
type SortDir = "asc" | "desc";

// ─── Main Component ─────────────────────────────────────────────────────────
export const Anomalies: React.FC = () => {
  const navigate = useNavigate();
  const [anomalies, setAnomalies] = useState<SuspiciousPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail panel state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AnomalyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [activePatternFilter, setActivePatternFilter] = useState<string>("all");

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Load anomalies
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAnomalies();
      setAnomalies(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to load anomaly intelligence");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load detail when selectedId changes
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    api.getAnomalyDetail(selectedId)
      .then(d => setDetail(d))
      .catch((e: unknown) => setDetailError(e instanceof Error ? e.message : "Failed to load anomaly detail"))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  // Derive dynamic counts
  const patternCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of anomalies) {
      counts[a.pattern] = (counts[a.pattern] || 0) + 1;
    }
    return counts;
  }, [anomalies]);

  // Filtered & sorted anomalies
  const displayList = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = anomalies.filter(a => {
      if (activePatternFilter !== "all" && a.pattern !== activePatternFilter) {
        return false;
      }
      if (q) {
        const ent = (a.entity || "").toLowerCase();
        const pat = (a.pattern || "").toLowerCase();
        const note = (a.note || "").toLowerCase();
        const rec = (a.record_id || "").toLowerCase();
        const dt = (a.date || "").toLowerCase();
        const id = (a.id || "").toLowerCase();
        if (!ent.includes(q) && !pat.includes(q) && !note.includes(q) && !rec.includes(q) && !dt.includes(q) && !id.includes(q)) {
          return false;
        }
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (sortKey === "id") { av = a.id || ""; bv = b.id || ""; }
      else if (sortKey === "pattern") { av = a.pattern; bv = b.pattern; }
      else if (sortKey === "entity") { av = a.entity || ""; bv = b.entity || ""; }
      else if (sortKey === "date") { av = a.date || ""; bv = b.date || ""; }
      else if (sortKey === "event_count") { av = a.event_count || 0; bv = b.event_count || 0; }

      if (typeof av === "string") {
        return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

    return list;
  }, [anomalies, search, activePatternFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-[#F8FAFC]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-700 font-semibold">Loading anomaly intelligence...</p>
          <p className="text-slate-400 text-sm">Running detection algorithms across intelligence graph</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-[#F8FAFC]">
        <div className="text-center space-y-3 max-w-md p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Unable to load anomaly intelligence</h2>
          <p className="text-slate-500 text-sm">{error}</p>
          <button
            onClick={loadData}
            className="mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const distinctPatterns = Object.keys(PATTERN_CFG).filter(p => (patternCounts[p] || 0) > 0);

  return (
    <div className="flex h-full overflow-hidden bg-[#F8FAFC]">
      {/* ── Main Left Container ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Page Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h1 className="text-xl font-bold text-slate-900">Anomaly &amp; Pattern Center</h1>
              </div>
              <p className="text-sm text-slate-500">
                Investigative leads: burst calling signatures, financial structuring, and node spikes detected by CNIS engine · {anomalies.length} total signals
              </p>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              Refresh Data Stream
            </button>
          </div>
        </div>

        {/* Dynamic Summary Cards Bar */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Flags</span>
                <AlertTriangle className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-xl font-bold text-slate-900">{anomalies.length}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Across all pattern types</p>
            </div>

            {distinctPatterns.map(p => {
              const pcfg = getPatternCfg(p);
              const PIcon = pcfg.icon;
              const count = patternCounts[p] || 0;
              return (
                <div
                  key={p}
                  onClick={() => setActivePatternFilter(activePatternFilter === p ? "all" : p)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    activePatternFilter === p
                      ? "bg-white ring-2 ring-amber-500 shadow-sm"
                      : "bg-slate-50 border-slate-200/80 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate" title={pcfg.label}>
                      {pcfg.label}
                    </span>
                    <PIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: pcfg.barColor }} />
                  </div>
                  <p className="text-xl font-bold text-slate-900">{count}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{((count / (anomalies.length || 1)) * 100).toFixed(0)}% of total</p>
                </div>
              );
            })}
          </div>

          {/* Pattern Distribution Segmented Bar */}
          <div className="mt-3.5 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-medium">
              <span>Pattern Distribution</span>
              <span>{anomalies.length} Signals Detected</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
              {distinctPatterns.map(p => {
                const pcfg = getPatternCfg(p);
                const count = patternCounts[p] || 0;
                const widthPct = (count / (anomalies.length || 1)) * 100;
                return (
                  <div
                    key={p}
                    style={{ width: `${widthPct}%`, backgroundColor: pcfg.barColor }}
                    className="h-full transition-all hover:opacity-80"
                    title={`${pcfg.label}: ${count} (${widthPct.toFixed(1)}%)`}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {distinctPatterns.map(p => {
                const pcfg = getPatternCfg(p);
                const count = patternCounts[p] || 0;
                return (
                  <div key={p} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pcfg.barColor }} />
                    <span className="font-medium">{pcfg.label}</span>
                    <span className="text-slate-400">({count})</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Toolbar: Search + Filters */}
        <div className="px-6 py-2.5 border-b border-slate-200 bg-white flex-shrink-0 flex items-center justify-between gap-4 flex-wrap">
          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActivePatternFilter("all")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                activePatternFilter === "all"
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              All Signals ({anomalies.length})
            </button>
            {distinctPatterns.map(p => {
              const pcfg = getPatternCfg(p);
              const PIcon = pcfg.icon;
              const count = patternCounts[p] || 0;
              const active = activePatternFilter === p;
              return (
                <button
                  key={p}
                  onClick={() => setActivePatternFilter(active ? "all" : p)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? "text-white border-transparent"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                  style={active ? { backgroundColor: pcfg.barColor } : {}}
                >
                  <PIcon className="w-3 h-3" />
                  {pcfg.label}
                  <span className={`ml-0.5 ${active ? "text-white/80" : "text-slate-400"}`}>{count}</span>
                </button>
              );
            })}
            {activePatternFilter !== "all" && (
              <button
                onClick={() => setActivePatternFilter("all")}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2 py-0.5"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by entity, ID, note, record..."
              className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Anomaly Table */}
        <div className="flex-1 overflow-auto bg-white">
          {displayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <AlertTriangle className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-700 font-semibold">No anomalies detected in the available dataset.</p>
              <p className="text-slate-400 text-sm mt-1">Try clearing filters or changing your search criteria.</p>
              {(search || activePatternFilter !== "all") && (
                <button
                  onClick={() => { setSearch(""); setActivePatternFilter("all"); }}
                  className="mt-3 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                >
                  Reset all filters
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                <tr>
                  <Th label="Signal ID" sortKey="id" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <Th label="Pattern Type" sortKey="pattern" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <Th label="Affected Entity" sortKey="entity" current={sortKey} dir={sortDir} onSort={toggleSort} wide />
                  <Th label="Detection Date" sortKey="date" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <Th label="Event Trigger" sortKey="event_count" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">Detection Signal &amp; Reason</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-500 uppercase tracking-wider">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayList.map(a => {
                  const pcfg = getPatternCfg(a.pattern);
                  const PIcon = pcfg.icon;
                  const isSelected = selectedId === a.id;
                  const ecfg = getEntityCfg(a.entity_type);
                  const EIcon = ecfg.icon;

                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedId(isSelected ? null : (a.id || null))}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-amber-50/70 border-l-2 border-l-amber-500"
                          : "hover:bg-slate-50/80 border-l-2 border-l-transparent"
                      }`}
                    >
                      {/* Signal ID */}
                      <td className="px-4 py-2.5 font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {a.id}
                      </td>

                      {/* Pattern Badge */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: pcfg.badgeBg, color: pcfg.badgeText }}
                        >
                          <PIcon className="w-3 h-3" />
                          {pcfg.label}
                        </span>
                      </td>

                      {/* Affected Entity */}
                      <td className="px-4 py-2.5 font-medium text-slate-900 max-w-[200px]">
                        {a.entity ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: ecfg.bg }}>
                              <EIcon className="w-3 h-3" style={{ color: ecfg.color }} />
                            </div>
                            <span className="truncate" title={a.entity}>{a.entity}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No specific entity</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-2.5 text-slate-600 font-mono whitespace-nowrap">
                        {a.date ? a.date : <span className="text-slate-300">—</span>}
                      </td>

                      {/* Event Trigger */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {a.event_count ? (
                          <span className="font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            {a.event_count} events
                          </span>
                        ) : a.record_id ? (
                          <span className="font-mono text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded text-[11px] font-medium">
                            {a.record_id}
                          </span>
                        ) : (
                          <span className="text-slate-400">Graph metric</span>
                        )}
                      </td>

                      {/* Reason / Note Snippet */}
                      <td className="px-4 py-2.5 text-slate-600 max-w-[320px] truncate" title={a.note}>
                        {a.note}
                      </td>

                      {/* Inspect Arrow */}
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md ${
                          isSelected ? "bg-amber-100 text-amber-700" : "text-slate-400 hover:text-slate-600"
                        }`}>
                          <Eye className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-2 border-t border-slate-200 bg-white flex-shrink-0">
          <p className="text-xs text-slate-400">
            Showing <span className="font-semibold text-slate-700">{displayList.length}</span> of{" "}
            <span className="font-semibold text-slate-700">{anomalies.length}</span> anomaly leads
            {search && <span> matching <em>"{search}"</em></span>}
          </p>
        </div>
      </div>

      {/* ── Right Detail Panel ── */}
      <div className="w-[380px] flex-shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden">
        {selectedId ? (
          detailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-slate-500 text-xs font-medium">Loading investigative context...</p>
              </div>
            </div>
          ) : detailError ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div className="space-y-2">
                <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
                <p className="text-slate-800 text-sm font-semibold">Failed to load detail</p>
                <p className="text-slate-400 text-xs">{detailError}</p>
                <button
                  onClick={() => setSelectedId(null)}
                  className="mt-2 text-xs text-slate-600 hover:text-slate-900 underline"
                >
                  Close panel
                </button>
              </div>
            </div>
          ) : detail ? (
            <AnomalyDetailView
              detail={detail}
              onClose={() => setSelectedId(null)}
              onNavigateEntity={(id) => navigate(`/entities?id=${encodeURIComponent(id)}`)}
              onNavigateNetwork={(id) => navigate(`/network?focus=${encodeURIComponent(id)}`)}
            />
          ) : null
        ) : (
          <AnomalyHintPanel totalSignals={anomalies.length} patternCounts={patternCounts} />
        )}
      </div>
    </div>
  );
};

// ─── Table Header Cell ──────────────────────────────────────────────────────
interface ThProps {
  label: string;
  sortKey?: SortKey;
  current?: SortKey;
  dir?: SortDir;
  onSort?: (k: SortKey) => void;
  wide?: boolean;
}
const Th: React.FC<ThProps> = ({ label, sortKey, current, dir, onSort, wide }) => {
  const isSorted = sortKey && current === sortKey;
  return (
    <th
      className={`px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${
        sortKey ? "cursor-pointer select-none hover:text-slate-700" : ""
      } ${wide ? "min-w-[150px]" : ""}`}
      onClick={() => sortKey && onSort && onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey && (
          isSorted ? (
            dir === "asc" ? <ChevronUp className="w-3 h-3 text-amber-600" /> : <ChevronDown className="w-3 h-3 text-amber-600" />
          ) : (
            <ChevronsUpDown className="w-3 h-3 text-slate-300" />
          )
        )}
      </div>
    </th>
  );
};

// ─── Anomaly Hint Panel (no selection) ──────────────────────────────────────
const AnomalyHintPanel: React.FC<{ totalSignals: number; patternCounts: Record<string, number> }> = ({
  totalSignals,
  patternCounts,
}) => (
  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
      <AlertTriangle className="w-7 h-7 text-amber-600" />
    </div>
    <h3 className="text-slate-800 font-bold text-sm mb-1">Select an Anomaly Signal</h3>
    <p className="text-slate-400 text-xs leading-relaxed max-w-xs mb-6">
      Click any anomaly row to inspect why it was flagged, the supporting case records, affected entity metrics, and network graph context.
    </p>

    <div className="w-full space-y-2 text-left">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">Engine Pattern Guide</p>
      {Object.entries(PATTERN_CFG).map(([key, cfg]) => {
        const PIcon = cfg.icon;
        const cnt = patternCounts[key] || 0;
        return (
          <div key={key} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                <PIcon className="w-3.5 h-3.5" style={{ color: cfg.barColor }} />
                {cfg.label}
              </span>
              <span className="text-[11px] font-bold text-slate-600 font-mono">{cnt}</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">{cfg.description}</p>
          </div>
        );
      })}
    </div>
  </div>
);

// ─── Anomaly Detail View ────────────────────────────────────────────────────
interface AnomalyDetailViewProps {
  detail: AnomalyDetail;
  onClose: () => void;
  onNavigateEntity: (id: string) => void;
  onNavigateNetwork: (id: string) => void;
}
const AnomalyDetailView: React.FC<AnomalyDetailViewProps> = ({
  detail,
  onClose,
  onNavigateEntity,
  onNavigateNetwork,
}) => {
  const pcfg = getPatternCfg(detail.pattern);
  const PIcon = pcfg.icon;
  const ecfg = getEntityCfg(detail.entity_type);
  const EIcon = ecfg.icon;
  const entDetails = detail.entity_details;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-start justify-between flex-shrink-0 bg-white">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              {detail.id}
            </span>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: pcfg.badgeBg, color: pcfg.badgeText }}
            >
              <PIcon className="w-3 h-3" />
              {pcfg.label}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {detail.date ? `Observed on ${detail.date}` : "Graph-wide anomaly detection"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 rounded flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Detection Signal (Why Flagged) */}
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            Detection Signal &amp; Reason
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {detail.note}
          </p>
          <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-slate-500">
            {detail.event_count && (
              <span>Linked events count: <strong className="text-slate-800">{detail.event_count}</strong></span>
            )}
            {detail.record_id && (
              <span>Trigger record: <strong className="text-cyan-700 font-mono">{detail.record_id}</strong></span>
            )}
          </div>
        </div>

        {/* Affected Entity Section */}
        {detail.entity && (
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Affected Entity</span>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
                style={{ backgroundColor: ecfg.bg, color: ecfg.color }}
              >
                {ecfg.label}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: ecfg.bg }}
              >
                <EIcon className="w-5 h-5" style={{ color: ecfg.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate" title={detail.entity}>
                  {detail.entity}
                </p>
                {entDetails && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                      C{entDetails.community}
                    </span>
                    {entDetails.is_key_player && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 font-medium px-1.5 py-0.2 rounded">
                        Key Player
                      </span>
                    )}
                    {entDetails.is_bridge_node && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 font-medium px-1.5 py-0.2 rounded">
                        Bridge Node
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Entity Centrality Metrics */}
            {entDetails && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400">Degree</p>
                  <p className="text-xs font-bold text-slate-800 font-mono">{entDetails.degree.toFixed(3)}</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400">Betweenness</p>
                  <p className="text-xs font-bold text-slate-800 font-mono">{entDetails.betweenness.toFixed(3)}</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400">Influence</p>
                  <p className="text-xs font-bold text-slate-800 font-mono">{entDetails.influence_score.toFixed(3)}</p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => onNavigateEntity(detail.entity!)}
                className="w-full py-1.5 px-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Users className="w-3 h-3 text-slate-500" />
                View Entity
              </button>
              <button
                onClick={() => onNavigateNetwork(detail.entity!)}
                className="w-full py-1.5 px-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3 h-3 text-slate-500" />
                View in Network
              </button>
            </div>
          </div>
        )}

        {/* Supporting Evidence / Case Records */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Supporting Records ({detail.associated_records?.length || 0})
            </span>
          </div>

          {(!detail.associated_records || detail.associated_records.length === 0) ? (
            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-400 text-center italic border border-slate-100">
              No direct record text linked to this graph signal.
            </div>
          ) : (
            <div className="space-y-2">
              {detail.associated_records.map(rec => (
                <div key={rec.record_id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-cyan-800 bg-cyan-100/70 px-1.5 py-0.2 rounded">
                      {rec.record_id}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{rec.date}</span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Source: {rec.source.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/60 font-sans">
                    "{rec.text}"
                  </p>
                  {rec.extracted_entities && rec.extracted_entities.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {rec.extracted_entities.map((e, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 text-slate-700"
                        >
                          {e.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connected Entities in Network */}
        {detail.connected_entities && detail.connected_entities.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Connected Graph Entities ({detail.connected_entities.length})
              </span>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {detail.connected_entities.slice(0, 8).map(conn => (
                <div
                  key={conn.entity}
                  onClick={() => onNavigateEntity(conn.entity)}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
                >
                  <span className="text-xs font-medium text-slate-800 truncate" title={conn.entity}>
                    {conn.entity}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono">weight {conn.weight}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Anomalies;