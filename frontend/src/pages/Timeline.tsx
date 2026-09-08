import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { TimelineEvent, TimelineEntity, TimelineAnomaly, EntityType } from "../types";
import {
  Clock, Calendar, Search, X, RefreshCw, ExternalLink, Share2,
  Users, Phone, Car, MapPin, Building2, DollarSign, Circle,
  AlertTriangle, ShieldAlert, Zap, Activity, ArrowUpDown,
  Filter, FileText, CheckCircle2, ChevronRight, Hash, Eye, Tag
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
const getEntityCfg = (type?: string): EntityCfg => ENTITY_CONFIG[type || ""] ?? ENTITY_CONFIG.UNKNOWN;

// ─── Source Configuration ───────────────────────────────────────────────────
interface SourceCfg {
  label: string;
  color: string;
  bg: string;
  border: string;
}
const SOURCE_CONFIG: Record<string, SourceCfg> = {
  police_case_management: {
    label: "Police Case Management",
    color: "#1D4ED8",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
  call_detail_records: {
    label: "Call Detail Records",
    color: "#6D28D9",
    bg: "#F5F3FF",
    border: "#DDD6FE",
  },
  financial_intelligence_unit: {
    label: "Financial Intelligence Unit",
    color: "#047857",
    bg: "#ECFDF5",
    border: "#A7F3D0",
  },
  informant_tip: {
    label: "Informant Tip",
    color: "#B45309",
    bg: "#FFFBEB",
    border: "#FDE68A",
  },
};
const getSourceCfg = (source: string): SourceCfg =>
  SOURCE_CONFIG[source] ?? {
    label: source.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    color: "#475569",
    bg: "#F1F5F9",
    border: "#CBD5E1",
  };

// ─── Pattern Configuration ──────────────────────────────────────────────────
interface PatternCfg {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: LucideIcon;
}
const PATTERN_CONFIG: Record<string, PatternCfg> = {
  burst_activity: {
    label: "Burst Activity",
    color: "#C2410C",
    bg: "#FFF7ED",
    border: "#FDBA74",
    icon: Zap,
  },
  new_entity_spike: {
    label: "New Entity Spike",
    color: "#B45309",
    bg: "#FFFBEB",
    border: "#FCD34D",
    icon: ShieldAlert,
  },
  statistical_outlier: {
    label: "Statistical Outlier",
    color: "#0E7490",
    bg: "#ECFEFF",
    border: "#67E8F9",
    icon: Activity,
  },
  structuring: {
    label: "Structuring",
    color: "#6D28D9",
    bg: "#F5F3FF",
    border: "#C4B5FD",
    icon: DollarSign,
  },
};
const getPatternCfg = (pattern: string): PatternCfg =>
  PATTERN_CONFIG[pattern] ?? {
    label: pattern.replace(/_/g, " "),
    color: "#475569",
    bg: "#F1F5F9",
    border: "#CBD5E1",
    icon: AlertTriangle,
  };

// ─── Helper: Format date for display ─────────────────────────────────────────
const formatDateLabel = (dateStr: string): string => {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${months[monthIdx]} ${year}`;
      }
    }
  } catch {
    // fallback
  }
  return dateStr;
};

export const Timeline: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramRecordId = searchParams.get("record_id") || searchParams.get("id");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState(paramRecordId || "");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [patternFilter, setPatternFilter] = useState<string>("all");
  const [anomalyOnly, setAnomalyOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    if (paramRecordId) {
      setSearchQuery(paramRecordId);
    }
  }, [paramRecordId]);

  // Load timeline data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTimeline();
      setEvents(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load timeline intelligence.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived metrics from events
  const metrics = useMemo(() => {
    const totalRecords = events.length;
    const withAnomalies = events.filter(e => e.has_anomalies).length;

    // Unique entities set
    const entitySet = new Set<string>();
    const sourceCounts: Record<string, number> = {};
    const patternCounts: Record<string, number> = {};

    for (const e of events) {
      sourceCounts[e.source] = (sourceCounts[e.source] || 0) + 1;
      for (const ent of e.entities) {
        entitySet.add(ent.id);
      }
      for (const anom of e.anomalies) {
        patternCounts[anom.pattern] = (patternCounts[anom.pattern] || 0) + 1;
      }
    }

    // Date range
    const dates = events.map(e => e.date).filter(Boolean).sort();
    const dateRange = dates.length > 0
      ? `${formatDateLabel(dates[0])} – ${formatDateLabel(dates[dates.length - 1])}`
      : "—";

    return {
      totalRecords,
      withAnomalies,
      uniqueEntitiesCount: entitySet.size,
      dateRange,
      sourceCounts,
      patternCounts,
    };
  }, [events]);

  // Filtered & Sorted events
  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return events.filter(e => {
      // Anomaly only toggle
      if (anomalyOnly && !e.has_anomalies) {
        return false;
      }

      // Source filter
      if (sourceFilter !== "all" && e.source !== sourceFilter) {
        return false;
      }

      // Pattern filter
      if (patternFilter !== "all" && !e.anomalies.some(a => a.pattern === patternFilter)) {
        return false;
      }

      // Search query
      if (q) {
        const inId = e.record_id.toLowerCase().includes(q);
        const inDesc = e.description.toLowerCase().includes(q);
        const inSource = e.source.toLowerCase().includes(q) || e.source_label.toLowerCase().includes(q);
        const inDate = e.date.toLowerCase().includes(q);
        const inEntities = e.entities.some(ent => ent.id.toLowerCase().includes(q) || ent.type.toLowerCase().includes(q));
        const inLocations = e.locations.some(loc => loc.toLowerCase().includes(q));
        const inAnomalies = e.anomalies.some(a =>
          a.pattern.toLowerCase().includes(q) ||
          a.note.toLowerCase().includes(q) ||
          (a.entity && a.entity.toLowerCase().includes(q))
        );

        if (!inId && !inDesc && !inSource && !inDate && !inEntities && !inLocations && !inAnomalies) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === "asc") {
        return a.date.localeCompare(b.date);
      }
      return b.date.localeCompare(a.date);
    });
  }, [events, searchQuery, sourceFilter, patternFilter, anomalyOnly, sortOrder]);

  // Group filtered events by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    for (const ev of filteredEvents) {
      if (!groups[ev.date]) {
        groups[ev.date] = [];
      }
      groups[ev.date].push(ev);
    }
    return groups;
  }, [filteredEvents]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setSourceFilter("all");
    setPatternFilter("all");
    setAnomalyOnly(false);
  };

  const hasActiveFilters = searchQuery !== "" || sourceFilter !== "all" || patternFilter !== "all" || anomalyOnly;

  // Render Loading State
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-[#F8FAFC]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-700 font-semibold">Loading chronological intelligence...</p>
          <p className="text-slate-400 text-sm">Sequencing case reports and correlated pattern events</p>
        </div>
      </div>
    );
  }

  // Render Error State
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-[#F8FAFC]">
        <div className="text-center space-y-3 max-w-md p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Unable to load timeline intelligence.</h2>
          <p className="text-slate-500 text-sm">{error}</p>
          <button
            onClick={loadData}
            className="mt-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                CNIS SECTION :: TIMELINE
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Chronological Intelligence Timeline</h1>
            <p className="text-sm text-slate-500">
              Time-sorted sequence of criminal case records and detected investigative events · Real Pipeline Data · Source: CNIS Intelligence Engine · {metrics.totalRecords} records indexed
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

      {/* ── Summary Strip ── */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Records</span>
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xl font-bold text-slate-900">{metrics.totalRecords}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Indexed police case events</p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Date Range</span>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-900 truncate" title={metrics.dateRange}>{metrics.dateRange}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Continuous incident window</p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Events With Anomalies</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xl font-bold text-amber-600">{metrics.withAnomalies}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Flagged by anomaly engine</p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Unique Entities</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xl font-bold text-slate-900">{metrics.uniqueEntitiesCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Identified persons, phones, vehicles</p>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="px-6 py-2.5 border-b border-slate-200 bg-white flex-shrink-0 flex items-center justify-between gap-4 flex-wrap">
        {/* Left filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Source Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            >
              <option value="all">All Sources ({events.length})</option>
              {Object.entries(metrics.sourceCounts).map(([src, cnt]) => (
                <option key={src} value={src}>
                  {getSourceCfg(src).label} ({cnt})
                </option>
              ))}
            </select>
          </div>

          {/* Pattern Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <select
              value={patternFilter}
              onChange={e => setPatternFilter(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            >
              <option value="all">All Patterns</option>
              {Object.entries(metrics.patternCounts).map(([pat, cnt]) => (
                <option key={pat} value={pat}>
                  {getPatternCfg(pat).label} ({cnt})
                </option>
              ))}
            </select>
          </div>

          {/* Anomaly Only Toggle */}
          <button
            onClick={() => setAnomalyOnly(!anomalyOnly)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              anomalyOnly
                ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Anomalies Only ({metrics.withAnomalies})
          </button>

          {/* Sort Control */}
          <button
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
            title="Toggle chronological sorting"
          >
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            {sortOrder === "desc" ? "Newest First" : "Oldest First"}
          </button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors font-medium"
            >
              <X className="w-3 h-3" /> Clear Filters
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search events, entities, records, notes..."
            className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Timeline Viewport ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <Clock className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-slate-800 font-bold text-sm">No investigative events match the current filters.</h3>
            <p className="text-slate-400 text-xs mt-1 max-w-sm">
              Try adjusting search terms, toggling source dropdowns, or clearing pattern filters.
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" /> Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8 relative">
            {/* Continuous vertical timeline guide line */}
            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-200 -z-0" />

            {Object.entries(groupedByDate).map(([date, dateEvents]) => (
              <div key={date} className="relative z-10 space-y-4">
                {/* Date Header Node */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-cyan-600 flex items-center justify-center shadow-sm flex-shrink-0">
                    <Calendar className="w-4 h-4 text-cyan-700" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      {formatDateLabel(date)}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      ({dateEvents.length} event{dateEvents.length !== 1 ? "s" : ""})
                    </span>
                  </div>
                </div>

                {/* Event Cards for this date */}
                <div className="ml-5 pl-8 space-y-4">
                  {dateEvents.map(event => {
                    const srcCfg = getSourceCfg(event.source);
                    const primaryEntity = event.entities.length > 0 ? event.entities[0].id : null;

                    return (
                      <div
                        key={event.event_id}
                        className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all space-y-4"
                      >
                        {/* Event Header Row */}
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Record ID Badge */}
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              {event.record_id}
                            </span>

                            {/* Source Badge */}
                            <span
                              className="text-xs font-medium px-2.5 py-0.5 rounded-full border"
                              style={{
                                backgroundColor: srcCfg.bg,
                                color: srcCfg.color,
                                borderColor: srcCfg.border,
                              }}
                            >
                              {srcCfg.label}
                            </span>

                            {/* Genuine Time extracted from text */}
                            {event.time && (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {event.time}
                              </span>
                            )}
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex items-center gap-2">
                            {primaryEntity && (
                              <>
                                <button
                                  onClick={() => navigate(`/entities?id=${encodeURIComponent(primaryEntity)}`)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                                  title={`Inspect ${primaryEntity} in Entity Explorer`}
                                >
                                  <Users className="w-3 h-3 text-slate-500" />
                                  View Entity
                                </button>
                                <button
                                  onClick={() => navigate(`/network?focus=${encodeURIComponent(primaryEntity)}`)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                                  title={`Center graph on ${primaryEntity}`}
                                >
                                  <Share2 className="w-3 h-3 text-slate-500" />
                                  View in Network
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Event Narrative / Original Case Text */}
                        <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/70">
                          <p className="text-xs text-slate-800 leading-relaxed font-sans">
                            "{event.description}"
                          </p>
                        </div>

                        {/* Extracted Entities Grid */}
                        {event.entities.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                              Involved Entities ({event.entities.length})
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {event.entities.map(ent => {
                                const ecfg = getEntityCfg(ent.type);
                                const EIcon = ecfg.icon;
                                return (
                                  <button
                                    key={ent.id}
                                    onClick={() => navigate(`/entities?id=${encodeURIComponent(ent.id)}`)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border hover:opacity-85 transition-opacity"
                                    style={{
                                      backgroundColor: ecfg.bg,
                                      borderColor: ecfg.border + "40",
                                      color: ecfg.color,
                                    }}
                                    title={`Click to open ${ent.id} in Entity Explorer`}
                                  >
                                    <EIcon className="w-3 h-3" />
                                    <span>{ent.id}</span>
                                    <span className="text-[10px] opacity-70">({ecfg.label})</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Locations if present */}
                        {event.locations.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-600" /> Locations:
                            </span>
                            {event.locations.map(loc => (
                              <button
                                key={loc}
                                onClick={() => navigate(`/locations?id=${encodeURIComponent(loc)}`)}
                                className="font-medium text-emerald-800 hover:underline bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                              >
                                {loc}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Correlated Anomaly Signals from Detection Engine */}
                        {event.anomalies.length > 0 && (
                          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                Investigative Signals Correlated with this Incident ({event.anomalies.length})
                              </div>
                              <button
                                onClick={() => navigate("/anomalies")}
                                className="text-[11px] text-amber-800 hover:text-amber-950 font-medium inline-flex items-center gap-1 underline"
                              >
                                Open in Anomaly Center <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="space-y-1.5">
                              {event.anomalies.map(anom => {
                                const patCfg = getPatternCfg(anom.pattern);
                                const PIcon = patCfg.icon;

                                return (
                                  <div
                                    key={anom.id}
                                    className="p-2 bg-white rounded-lg border border-amber-200/60 flex items-start gap-2.5 text-xs text-slate-700"
                                  >
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold flex-shrink-0 mt-0.5"
                                      style={{ backgroundColor: patCfg.bg, color: patCfg.color }}
                                    >
                                      <PIcon className="w-3 h-3" />
                                      {patCfg.label}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-[10px] font-bold text-slate-500">
                                          {anom.id}
                                        </span>
                                        {anom.entity && (
                                          <span className="text-[10px] text-slate-600 font-medium bg-slate-100 px-1.5 rounded">
                                            Target: {anom.entity}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-slate-600 text-xs mt-0.5 leading-snug">
                                        {anom.note}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Timeline;