import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import {
  SearchResponse,
  SearchEntityResult,
  SearchRecordResult,
  SearchAnomalyResult,
  SearchLocationResult,
  SearchCaseResult,
  EntityType,
} from "../../types";
import {
  Search, X, Users, Phone, Car, MapPin, Building2, DollarSign,
  Circle, FileText, AlertTriangle, Zap, ShieldAlert, Activity,
  ChevronRight, ArrowRight, CornerDownLeft, ExternalLink, Shield,
  Star, Share2, Compass, Clock, RefreshCw, Cpu, Layers, Tag, Briefcase
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEntity?: (entityId: string) => void;
}

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

// ─── Pattern Styling ────────────────────────────────────────────────────────
interface PatternCfg {
  label: string;
  color: string;
  bg: string;
  icon: LucideIcon;
}

const PATTERN_CONFIG: Record<string, PatternCfg> = {
  burst_activity:      { label: "Burst Activity",        color: "#C2410C", bg: "#FFF7ED", icon: Zap },
  new_entity_spike:    { label: "New Entity Spike",      color: "#B45309", bg: "#FFFBEB", icon: ShieldAlert },
  statistical_outlier: { label: "Statistical Outlier",   color: "#0E7490", bg: "#ECFEFF", icon: Activity },
  structuring:         { label: "Structuring",           color: "#6D28D9", bg: "#F5F3FF", icon: DollarSign },
};

const getPatternCfg = (p: string): PatternCfg =>
  PATTERN_CONFIG[p] ?? { label: p.replace(/_/g, " "), color: "#475569", bg: "#F1F5F9", icon: AlertTriangle };

type ResultCategory = "all" | "cases" | "entities" | "records" | "anomalies" | "locations";

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectEntity,
}) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ResultCategory>("all");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery("");
      setDebouncedQuery("");
      setResults(null);
      setSelectedIndex(0);
      setActiveCategory("all");
    }
  }, [isOpen]);

  // Global keyboard shortcuts (Ctrl+K to toggle, ESC to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounce search query (250ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  // Fetch search results on debounced query change
  useEffect(() => {
    if (!debouncedQuery) {
      setResults(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    api.getSearchResults(debouncedQuery)
      .then((res) => {
        if (isMounted) {
          setResults(res);
          setSelectedIndex(0);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setResults({
            query: debouncedQuery,
            total_results: 0,
            cases: [],
            entities: [],
            records: [],
            anomalies: [],
            locations: [],
          });
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  // Build flattened selectable items list for keyboard navigation
  const flattenedItems = useMemo(() => {
    if (!results) return [];
    const items: Array<{
      type: "case" | "entity" | "record" | "anomaly" | "location";
      id: string;
      data: any;
    }> = [];

    if (activeCategory === "all" || activeCategory === "cases") {
      (results.cases || []).forEach((c) => items.push({ type: "case", id: c.case_id, data: c }));
    }
    if (activeCategory === "all" || activeCategory === "entities") {
      results.entities.forEach((e) => items.push({ type: "entity", id: e.id, data: e }));
    }
    if (activeCategory === "all" || activeCategory === "records") {
      results.records.forEach((r) => items.push({ type: "record", id: r.record_id, data: r }));
    }
    if (activeCategory === "all" || activeCategory === "anomalies") {
      results.anomalies.forEach((a) => items.push({ type: "anomaly", id: a.id, data: a }));
    }
    if (activeCategory === "all" || activeCategory === "locations") {
      results.locations.forEach((l) => items.push({ type: "location", id: l.id, data: l }));
    }
    return items;
  }, [results, activeCategory]);

  // Keyboard navigation within list (Arrow Up / Down, Enter)
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < flattenedItems.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : flattenedItems.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flattenedItems.length > 0 && flattenedItems[selectedIndex]) {
        executeItemAction(flattenedItems[selectedIndex]);
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (resultsContainerRef.current) {
      const activeEl = resultsContainerRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  // Execute primary item action
  const executeItemAction = useCallback((item: { type: string; id: string; data: any }) => {
    onClose();
    if (item.type === "case") {
      navigate(`/cases?id=${encodeURIComponent(item.id)}`);
    } else if (item.type === "entity") {
      if (onSelectEntity) {
        onSelectEntity(item.id);
      }
      navigate(`/entities?id=${encodeURIComponent(item.id)}`);
    } else if (item.type === "record") {
      navigate(`/timeline?record_id=${encodeURIComponent(item.id)}`);
    } else if (item.type === "anomaly") {
      navigate(`/anomalies?id=${encodeURIComponent(item.id)}`);
    } else if (item.type === "location") {
      navigate(`/locations?id=${encodeURIComponent(item.id)}`);
    }
  }, [onClose, onSelectEntity, navigate]);

  if (!isOpen) return null;

  // Suggested quick investigation queries
  const quickSearches = [
    { label: "Ravi Malhotra", type: "PERSON", category: "Person" },
    { label: "+91-9876543210", type: "PHONE", category: "Phone" },
    { label: "MH12AB1234", type: "VEHICLE", category: "Vehicle" },
    { label: "Andheri", type: "LOCATION", category: "Location" },
    { label: "CR-1001", type: "CASE", category: "Case File" },
    { label: "ANOM-001", type: "ANOMALY", category: "Anomaly" },
    { label: "structuring", type: "PATTERN", category: "Pattern" },
    { label: "Global Traders", type: "ORG", category: "Organization" },
  ];

  // Quick module access
  const quickModules = [
    { name: "Investigation Command", path: "/investigation", icon: Compass, desc: "Unified dossier, path & cross-case matrix" },
    { name: "Case Management", path: "/cases", icon: Briefcase, desc: "10 active investigation dossiers" },
    { name: "Interactive Network", path: "/network", icon: Share2, desc: "Force-directed graph view" },
    { name: "Entity Explorer", path: "/entities", icon: Users, desc: "15 indexed entities & registry" },
    { name: "Anomaly Center", path: "/anomalies", icon: AlertTriangle, desc: "25 detected pattern signals" },
    { name: "Timeline Analysis", path: "/timeline", icon: Clock, desc: "Chronological event logs" },
    { name: "Location Analysis", path: "/locations", icon: MapPin, desc: "Spatial nexus & bridge hubs" },
    { name: "Intelligence Reports", path: "/reports", icon: FileText, desc: "Synthesized case briefings" },
    { name: "Data Sources", path: "/sources", icon: Layers, desc: "Ingestion & provenance center" },
  ];

  let runningIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 md:pt-20 px-3 sm:px-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-all animate-scaleUp">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50/70">
          <div className="relative flex items-center justify-center">
            {loading ? (
              <RefreshCw className="w-5 h-5 text-cyan-600 animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-cyan-700" />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search entities, vehicles, phone numbers, cases (e.g. Ravi, 9876543210, MH12, CR-1001)..."
            className="flex-1 bg-transparent border-none text-slate-900 text-sm focus:outline-none placeholder-slate-400 font-sans"
            autoComplete="off"
            spellCheck="false"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
              title="Clear query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <kbd className="hidden sm:inline-block font-mono text-[10px] bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Category Chips (Only visible when search has results) */}
        {results && results.total_results > 0 && (
          <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => { setActiveCategory("all"); setSelectedIndex(0); }}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                activeCategory === "all"
                  ? "bg-cyan-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({results.total_results})
            </button>
            {results.cases && results.cases.length > 0 && (
              <button
                onClick={() => { setActiveCategory("cases"); setSelectedIndex(0); }}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors flex items-center gap-1 ${
                  activeCategory === "cases"
                    ? "bg-cyan-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Briefcase className="w-3 h-3" />
                Cases ({results.cases.length})
              </button>
            )}
            {results.entities.length > 0 && (
              <button
                onClick={() => { setActiveCategory("entities"); setSelectedIndex(0); }}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors flex items-center gap-1 ${
                  activeCategory === "entities"
                    ? "bg-rose-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Users className="w-3 h-3" />
                Entities ({results.entities.length})
              </button>
            )}
            {results.records.length > 0 && (
              <button
                onClick={() => { setActiveCategory("records"); setSelectedIndex(0); }}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors flex items-center gap-1 ${
                  activeCategory === "records"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <FileText className="w-3 h-3" />
                Records ({results.records.length})
              </button>
            )}
            {results.anomalies.length > 0 && (
              <button
                onClick={() => { setActiveCategory("anomalies"); setSelectedIndex(0); }}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors flex items-center gap-1 ${
                  activeCategory === "anomalies"
                    ? "bg-amber-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                Anomalies ({results.anomalies.length})
              </button>
            )}
            {results.locations.length > 0 && (
              <button
                onClick={() => { setActiveCategory("locations"); setSelectedIndex(0); }}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors flex items-center gap-1 ${
                  activeCategory === "locations"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <MapPin className="w-3 h-3" />
                Locations ({results.locations.length})
              </button>
            )}
          </div>
        )}

        {/* Results Container */}
        <div
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 divide-y divide-slate-100"
        >
          {/* STATE 1: Empty Query / Landing State */}
          {!debouncedQuery && (
            <div className="space-y-5 py-2">
              {/* Quick Investigation Queries */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-cyan-600" />
                    Quick Investigation Queries
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">Live Dataset</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {quickSearches.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setQuery(item.label);
                        inputRef.current?.focus();
                      }}
                      className="flex flex-col text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-cyan-50/50 hover:border-cyan-300 transition-all group"
                    >
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-cyan-800 truncate">
                        {item.label}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 group-hover:text-cyan-600">
                        {item.category}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Module Navigation */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    Investigation Workspace Modules
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">Direct Navigation</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {quickModules.map((mod) => {
                    const ModIcon = mod.icon;
                    return (
                      <button
                        key={mod.path}
                        onClick={() => {
                          onClose();
                          navigate(mod.path);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-100 group-hover:text-cyan-800 transition-colors">
                            <ModIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 group-hover:text-cyan-800 truncate">
                              {mod.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {mod.desc}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-cyan-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STATE 2: Loading Indicator */}
          {debouncedQuery && loading && (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-700">Searching CNIS Intelligence Engine...</p>
              <p className="text-[11px] text-slate-400">Scanning entities, case records, anomalies, and locations</p>
            </div>
          )}

          {/* STATE 3: No Results */}
          {debouncedQuery && !loading && results && results.total_results === 0 && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">No intelligence found</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No entities, case records, anomalies, or locations matched "{debouncedQuery}".
                </p>
              </div>
              <div className="pt-2">
                <p className="text-[11px] text-slate-400">
                  Search across entities, cases, anomalies and locations.
                </p>
              </div>
            </div>
          )}

          {/* STATE 4: Search Results Groups */}
          {debouncedQuery && !loading && results && results.total_results > 0 && (
            <div className="space-y-5 pt-1">
              {/* ─── GROUP 0: CASES ─── */}
              {(activeCategory === "all" || activeCategory === "cases") && results.cases && results.cases.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-cyan-700" />
                      Investigation Cases ({results.cases.length})
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">Case Management Dossiers</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.cases.map((c) => {
                      runningIndex++;
                      const thisIdx = runningIndex;
                      const isSelected = selectedIndex === thisIdx;

                      return (
                        <div
                          key={c.case_id}
                          data-index={thisIdx}
                          onClick={() => executeItemAction({ type: "case", id: c.case_id, data: c })}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-cyan-50/50 border-cyan-300 ring-1 ring-cyan-400 shadow-xs"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center flex-shrink-0">
                              <Briefcase className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 font-mono">
                                  {c.case_id}
                                </span>
                                <span className="text-xs font-semibold text-slate-800 truncate">
                                  {c.short_title}
                                </span>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                  c.priority === "HIGH"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : c.priority === "MEDIUM"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                }`}>
                                  {c.priority}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {c.date}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1 line-clamp-1 italic font-serif">
                                "{c.snippet}"
                              </p>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                                <span>{c.entity_count} entities</span>
                                <span>•</span>
                                <span>{c.anomaly_count} signals</span>
                                <span>•</span>
                                <span className="text-slate-500">{c.workflow_status}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                                navigate(`/investigation?target_type=case&target_id=${encodeURIComponent(c.case_id)}`);
                              }}
                              className="px-2 py-1 text-[10px] font-medium text-cyan-800 bg-cyan-50 hover:bg-cyan-100 rounded-md transition-colors inline-flex items-center gap-1 flex-shrink-0 border border-cyan-200"
                              title="Investigate Case in Unified Workspace"
                            >
                              <Compass className="w-3 h-3" />
                              Investigate
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                executeItemAction({ type: "case", id: c.case_id, data: c });
                              }}
                              className="px-2.5 py-1 text-[10px] font-medium text-white bg-cyan-700 hover:bg-cyan-800 rounded-md transition-colors inline-flex items-center gap-1 flex-shrink-0"
                            >
                              Case File
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── GROUP 1: ENTITIES ─── */}
              {(activeCategory === "all" || activeCategory === "entities") && results.entities.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Entities ({results.entities.length})
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">Entity Intelligence Engine</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.entities.map((ent) => {
                      runningIndex++;
                      const thisIdx = runningIndex;
                      const isSelected = selectedIndex === thisIdx;
                      const cfg = getEntityCfg(ent.type);
                      const Icon = cfg.icon;

                      return (
                        <div
                          key={ent.id}
                          data-index={thisIdx}
                          onClick={() => executeItemAction({ type: "entity", id: ent.id, data: ent })}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-rose-50/50 border-rose-300 ring-1 ring-rose-400 shadow-xs"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: cfg.bg }}
                            >
                              <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 truncate" title={ent.id}>
                                  {ent.id}
                                </span>
                                <span
                                  className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: cfg.bg, color: cfg.color }}
                                >
                                  {cfg.label}
                                </span>
                                {ent.is_key_player && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5" /> Key Player
                                  </span>
                                )}
                                {ent.is_bridge_node && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 inline-flex items-center gap-0.5">
                                    <Shield className="w-2.5 h-2.5" /> Bridge Node
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-2 flex-wrap">
                                <span>Influence {ent.influence_score.toFixed(4)}</span>
                                <span>•</span>
                                <span>Community C{ent.community}</span>
                                <span>•</span>
                                <span>Degree {ent.degree.toFixed(3)}</span>
                                {ent.anomaly_count > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-orange-600 font-semibold">
                                      {ent.anomaly_count} anomal{ent.anomaly_count === 1 ? "y" : "ies"}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                                navigate(`/investigation?target_type=entity&target_id=${encodeURIComponent(ent.id)}`);
                              }}
                              className="px-2 py-1 text-[10px] font-medium text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors hidden sm:inline-flex items-center gap-1 border border-rose-200"
                              title="Investigate Entity in Unified Workspace"
                            >
                              <Compass className="w-3 h-3" />
                              Investigate
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                                navigate(`/network?focus=${encodeURIComponent(ent.id)}`);
                              }}
                              className="px-2 py-1 text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors hidden sm:inline-flex items-center gap-1"
                              title="View in interactive graph"
                            >
                              <Share2 className="w-3 h-3 text-slate-500" />
                              Graph
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                executeItemAction({ type: "entity", id: ent.id, data: ent });
                              }}
                              className="px-2.5 py-1 text-[10px] font-medium text-white bg-cyan-700 hover:bg-cyan-800 rounded-md transition-colors inline-flex items-center gap-1"
                            >
                              Inspect
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── GROUP 2: CASE RECORDS ─── */}
              {(activeCategory === "all" || activeCategory === "records") && results.records.length > 0 && (
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Cases & Records ({results.records.length})
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">Case Ingestion Pipeline</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.records.map((rec) => {
                      runningIndex++;
                      const thisIdx = runningIndex;
                      const isSelected = selectedIndex === thisIdx;

                      return (
                        <div
                          key={rec.record_id}
                          data-index={thisIdx}
                          onClick={() => executeItemAction({ type: "record", id: rec.record_id, data: rec })}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-blue-50/50 border-blue-300 ring-1 ring-blue-400 shadow-xs"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 font-mono">
                                  {rec.record_id}
                                </span>
                                <span className="text-[10px] font-medium text-slate-600 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                                  {rec.source_label}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {rec.date}
                                </span>
                                {rec.has_anomalies && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5" /> Anomalies Flagged
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 mt-1 line-clamp-1 italic font-serif">
                                "{rec.snippet}"
                              </p>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {rec.entity_count} entities extracted
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              executeItemAction({ type: "record", id: rec.record_id, data: rec });
                            }}
                            className="px-2.5 py-1 text-[10px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors inline-flex items-center gap-1 flex-shrink-0"
                          >
                            Timeline
                            <ChevronRight className="w-3 h-3 text-slate-500" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── GROUP 3: ANOMALIES ─── */}
              {(activeCategory === "all" || activeCategory === "anomalies") && results.anomalies.length > 0 && (
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Anomalies & Patterns ({results.anomalies.length})
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">CNIS Anomaly Detection Engine</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.anomalies.map((anom) => {
                      runningIndex++;
                      const thisIdx = runningIndex;
                      const isSelected = selectedIndex === thisIdx;
                      const pcfg = getPatternCfg(anom.pattern);
                      const PIcon = pcfg.icon;

                      return (
                        <div
                          key={anom.id}
                          data-index={thisIdx}
                          onClick={() => executeItemAction({ type: "anomaly", id: anom.id, data: anom })}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-amber-50/50 border-amber-300 ring-1 ring-amber-400 shadow-xs"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: pcfg.bg }}
                            >
                              <PIcon className="w-4 h-4" style={{ color: pcfg.color }} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 font-mono">
                                  {anom.id}
                                </span>
                                <span
                                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: pcfg.bg, color: pcfg.color }}
                                >
                                  {anom.pattern_label}
                                </span>
                                {anom.entity && (
                                  <span className="text-xs font-semibold text-slate-800">
                                    {anom.entity}
                                  </span>
                                )}
                                {anom.date && (
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {anom.date}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                {anom.note}
                              </p>
                              {anom.record_id && (
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  Linked record: {anom.record_id}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                                navigate(`/investigation?target_type=anomaly&target_id=${encodeURIComponent(anom.id)}`);
                              }}
                              className="px-2 py-1 text-[10px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors inline-flex items-center gap-1 flex-shrink-0 border border-amber-200"
                              title="Investigate Anomaly in Unified Workspace"
                            >
                              <Compass className="w-3 h-3" />
                              Investigate
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                executeItemAction({ type: "anomaly", id: anom.id, data: anom });
                              }}
                              className="px-2.5 py-1 text-[10px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors inline-flex items-center gap-1 flex-shrink-0"
                            >
                              Details
                              <ChevronRight className="w-3 h-3 text-slate-500" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── GROUP 4: LOCATIONS ─── */}
              {(activeCategory === "all" || activeCategory === "locations") && results.locations.length > 0 && (
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Locations ({results.locations.length})
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">Location Intelligence Analysis</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.locations.map((loc) => {
                      runningIndex++;
                      const thisIdx = runningIndex;
                      const isSelected = selectedIndex === thisIdx;

                      return (
                        <div
                          key={loc.id}
                          data-index={thisIdx}
                          onClick={() => executeItemAction({ type: "location", id: loc.id, data: loc })}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400 shadow-xs"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900">
                                  {loc.name}
                                </span>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Activity Score: {loc.activity_score.toFixed(1)}
                                </span>
                                {loc.is_bridge_node && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 inline-flex items-center gap-0.5">
                                    <Shield className="w-2.5 h-2.5" /> Bridge Hub
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-2 flex-wrap">
                                <span>{loc.record_count} Records</span>
                                <span>•</span>
                                <span>{loc.entity_count} Associated Entities</span>
                                <span>•</span>
                                <span className="text-orange-600 font-semibold">{loc.anomaly_count} Anomalies</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                                navigate(`/investigation?target_type=location&target_id=${encodeURIComponent(loc.id)}`);
                              }}
                              className="px-2 py-1 text-[10px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors inline-flex items-center gap-1 flex-shrink-0 border border-emerald-200"
                              title="Investigate Location in Unified Workspace"
                            >
                              <Compass className="w-3 h-3" />
                              Investigate
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                executeItemAction({ type: "location", id: loc.id, data: loc });
                              }}
                              className="px-2.5 py-1 text-[10px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors inline-flex items-center gap-1 flex-shrink-0"
                            >
                              Inspect
                              <ChevronRight className="w-3 h-3 text-slate-500" />
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
        </div>

        {/* Modal Footer with Keyboard Shortcuts & Status */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] shadow-2xs font-semibold">
                ↑
              </kbd>
              <kbd className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] shadow-2xs font-semibold">
                ↓
              </kbd>
              <span className="ml-1 text-slate-400">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] shadow-2xs font-semibold">
                ↵ Enter
              </kbd>
              <span className="ml-1 text-slate-400">Open</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] shadow-2xs font-semibold">
                ESC
              </kbd>
              <span className="ml-1 text-slate-400">Close</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-cyan-600" />
            <span>CNIS Intelligence Search</span>
          </div>
        </div>
      </div>
    </div>
  );
};
