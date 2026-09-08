import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { LocationItem, LocationEntity, CaseRecord, SuspiciousPattern, EntityType } from "../types";
import {
  MapPin, Search, X, RefreshCw, ExternalLink, Share2, Users,
  Phone, Car, Building2, DollarSign, Circle, AlertTriangle,
  Shield, Activity, FileText, ArrowRight, Eye, ChevronRight,
  TrendingUp, Layers, CheckCircle2, Clock, Briefcase
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

// ─── Pattern Configuration ──────────────────────────────────────────────────
interface PatternCfg {
  label: string;
  color: string;
  bg: string;
}
const PATTERN_CONFIG: Record<string, PatternCfg> = {
  burst_activity:      { label: "Burst Activity",        color: "#C2410C", bg: "#FFF7ED" },
  new_entity_spike:    { label: "New Entity Spike",      color: "#B45309", bg: "#FFFBEB" },
  statistical_outlier: { label: "Statistical Outlier",   color: "#0E7490", bg: "#ECFEFF" },
  structuring:         { label: "Structuring",           color: "#6D28D9", bg: "#F5F3FF" },
};
const getPatternCfg = (pattern: string): PatternCfg =>
  PATTERN_CONFIG[pattern] ?? { label: pattern, color: "#475569", bg: "#F1F5F9" };

export const Locations: React.FC = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  const paramId = searchParams.get("id");

  // Selection & Detail Drawer
  const [selectedId, setSelectedId] = useState<string | null>(paramId || null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "high_activity" | "anomaly_flagged" | "bridge_hubs">("all");

  useEffect(() => {
    if (paramId) {
      setSelectedId(paramId);
    }
  }, [paramId]);

  // Load Locations Data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLocations();
      setLocations(data);
      // Auto-select first location if none selected
      if (data.length > 0 && !selectedId && !paramId) {
        setSelectedId(data[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load location intelligence.");
    } finally {
      setLoading(false);
    }
  }, [selectedId, paramId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived Metrics
  const metrics = useMemo(() => {
    const totalLocations = locations.length;
    let totalReferences = 0;
    let highActivityCount = 0;
    let withAnomaliesCount = 0;

    for (const loc of locations) {
      totalReferences += loc.record_count;
      // High activity definition: activity_score >= 10 (co-occurrence incidents)
      if (loc.activity_score >= 10) {
        highActivityCount += 1;
      }
      if (loc.anomaly_count > 0) {
        withAnomaliesCount += 1;
      }
    }

    return {
      totalLocations,
      totalReferences,
      highActivityCount,
      withAnomaliesCount,
    };
  }, [locations]);

  // Filtered List
  const filteredLocations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return locations.filter(loc => {
      // Filter mode
      if (filterMode === "high_activity" && loc.activity_score < 10) {
        return false;
      }
      if (filterMode === "anomaly_flagged" && loc.anomaly_count === 0) {
        return false;
      }
      if (filterMode === "bridge_hubs" && !loc.is_bridge_node) {
        return false;
      }

      // Search query
      if (q) {
        const inName = loc.name.toLowerCase().includes(q);
        const inEntities = loc.entities.some(e => e.id.toLowerCase().includes(q) || e.type.toLowerCase().includes(q));
        const inRecords = loc.records.some(r => r.record_id.toLowerCase().includes(q) || r.text.toLowerCase().includes(q) || r.source.toLowerCase().includes(q));
        const inAnomalies = loc.anomalies.some(a => a.pattern.toLowerCase().includes(q) || a.note.toLowerCase().includes(q));

        if (!inName && !inEntities && !inRecords && !inAnomalies) {
          return false;
        }
      }

      return true;
    });
  }, [locations, searchQuery, filterMode]);

  // Active selected location object
  const activeLocation = useMemo(() => {
    return locations.find(l => l.id.toLowerCase() === (selectedId || "").toLowerCase()) || null;
  }, [locations, selectedId]);

  // Max activity score for bar width scaling
  const maxActivityScore = useMemo(() => {
    return Math.max(...locations.map(l => l.activity_score), 1);
  }, [locations]);

  // Render Loading
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-[#F8FAFC]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-700 font-semibold">Loading location intelligence...</p>
          <p className="text-slate-400 text-sm">Aggregating spatial entity associations and co-occurrence hubs</p>
        </div>
      </div>
    );
  }

  // Render Error
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-[#F8FAFC]">
        <div className="text-center space-y-3 max-w-md p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Unable to load location intelligence.</h2>
          <p className="text-slate-500 text-sm">{error}</p>
          <button
            onClick={loadData}
            className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-[#F8FAFC]">
      {/* ── Left Main Content Container ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Page Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  CNIS SECTION :: LOCATIONS
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">Location Intelligence Analysis</h1>
              <p className="text-sm text-slate-500">
                Spatial entity associations, location-based case records, and high-activity hubs · Real Pipeline Data · Source: CNIS Intelligence Engine
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

        {/* Summary Cards Strip */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Locations Identified</span>
                <MapPin className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-slate-900">{metrics.totalLocations}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Extracted by NER engine</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Case References</span>
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-xl font-bold text-slate-900">{metrics.totalReferences}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Total incident occurrences</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">High-Activity Hubs</span>
                <TrendingUp className="w-4 h-4 text-cyan-600" />
              </div>
              <p className="text-xl font-bold text-cyan-700">{metrics.highActivityCount}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Activity score &ge; 10 (multi-link)</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Locations With Anomalies</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xl font-bold text-amber-600">{metrics.withAnomaliesCount}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Flagged for suspicious patterns</p>
            </div>
          </div>

          {/* Activity Ranking Chart (Transparent, Real Data) */}
          <div className="mt-3.5 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                Location Activity Ranking
              </span>
              <span className="text-[11px] text-slate-400">
                Score based on total incident co-occurrence weight across all case events
              </span>
            </div>
            <div className="space-y-2">
              {locations.map(loc => {
                const pct = (loc.activity_score / maxActivityScore) * 100;
                const isSelected = selectedId === loc.id;
                return (
                  <div
                    key={loc.id}
                    onClick={() => setSelectedId(loc.id)}
                    className={`p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? "bg-emerald-50/70 border border-emerald-200" : "bg-slate-50/80 hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{loc.name}</span>
                        {loc.is_bridge_node && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-medium">
                            Bridge Hub
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500">
                          {loc.record_count} records · {loc.entity_count} entities · {loc.anomaly_count} signals
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-700">
                        score {loc.activity_score}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Toolbar: Search + Filter Chips */}
        <div className="px-6 py-2.5 border-b border-slate-200 bg-white flex-shrink-0 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                filterMode === "all"
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              All Locations ({locations.length})
            </button>
            <button
              onClick={() => setFilterMode("high_activity")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                filterMode === "high_activity"
                  ? "bg-cyan-700 text-white border-cyan-700"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              High Activity ({metrics.highActivityCount})
            </button>
            <button
              onClick={() => setFilterMode("anomaly_flagged")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                filterMode === "anomaly_flagged"
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              Anomaly Flagged ({metrics.withAnomaliesCount})
            </button>
            <button
              onClick={() => setFilterMode("bridge_hubs")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                filterMode === "bridge_hubs"
                  ? "bg-indigo-700 text-white border-indigo-700"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              Bridge Hubs ({locations.filter(l => l.is_bridge_node).length})
            </button>

            {(searchQuery || filterMode !== "all") && (
              <button
                onClick={() => { setSearchQuery(""); setFilterMode("all"); }}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2 py-0.5 font-medium"
              >
                <X className="w-3 h-3" /> Clear Filters
              </button>
            )}
          </div>

          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search location, entity, record..."
              className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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

        {/* Location Registry Table */}
        <div className="flex-1 overflow-auto bg-white">
          {filteredLocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <MapPin className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-700 font-semibold">No locations match the current filters.</p>
              <p className="text-slate-400 text-sm mt-1">Try clearing the search query or resetting filters.</p>
              <button
                onClick={() => { setSearchQuery(""); setFilterMode("all"); }}
                className="mt-3 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">Case Records</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">Associated Entities</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">Anomalies</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">Community</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">Activity Score</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-500 uppercase tracking-wider">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLocations.map(loc => {
                  const isSelected = selectedId === loc.id;
                  return (
                    <tr
                      key={loc.id}
                      onClick={() => setSelectedId(loc.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-emerald-50/70 border-l-2 border-l-emerald-600"
                          : "hover:bg-slate-50/80 border-l-2 border-l-transparent"
                      }`}
                    >
                      {/* Name */}
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                          </div>
                          <span className="font-bold text-slate-900">{loc.name}</span>
                          {loc.is_bridge_node && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-medium">
                              Bridge
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {loc.type}
                        </span>
                      </td>

                      {/* Records */}
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {loc.record_count} records
                        </span>
                      </td>

                      {/* Entities */}
                      <td className="px-4 py-3 text-slate-700">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                          {loc.entity_count} entities
                        </span>
                      </td>

                      {/* Anomalies */}
                      <td className="px-4 py-3">
                        {loc.anomaly_count > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold text-[11px]">
                            <AlertTriangle className="w-3 h-3" />
                            {loc.anomaly_count} signals
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Community */}
                      <td className="px-4 py-3">
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700">
                          C{loc.community}
                        </span>
                      </td>

                      {/* Activity Score */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 flex-shrink-0">
                            <div
                              className="h-1.5 rounded-full bg-emerald-600"
                              style={{ width: `${(loc.activity_score / maxActivityScore) * 100}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-800 text-[11px]">
                            {loc.activity_score}
                          </span>
                        </div>
                      </td>

                      {/* Inspect Action */}
                      <td className="px-3 py-3 text-right">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md ${
                          isSelected ? "bg-emerald-100 text-emerald-800" : "text-slate-400 hover:text-slate-600"
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
            Showing <span className="font-semibold text-slate-700">{filteredLocations.length}</span> of{" "}
            <span className="font-semibold text-slate-700">{locations.length}</span> location nodes
            {searchQuery && <span> matching <em>"{searchQuery}"</em></span>}
          </p>
        </div>
      </div>

      {/* ── Right Detail Drawer ── */}
      <div className="w-[380px] flex-shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden">
        {activeLocation ? (
          <LocationDetailDrawer
            location={activeLocation}
            onClose={() => setSelectedId(null)}
            onNavigateEntity={(id) => navigate(`/entities?id=${encodeURIComponent(id)}`)}
            onNavigateNetwork={(id) => navigate(`/network?focus=${encodeURIComponent(id)}`)}
            onNavigateTimeline={() => navigate("/timeline")}
            onNavigateAnomalies={() => navigate("/anomalies")}
          />
        ) : (
          <LocationHintPanel totalLocations={locations.length} />
        )}
      </div>
    </div>
  );
};

// ─── Location Detail Drawer ─────────────────────────────────────────────────
interface LocationDetailDrawerProps {
  location: LocationItem;
  onClose: () => void;
  onNavigateEntity: (id: string) => void;
  onNavigateNetwork: (id: string) => void;
  onNavigateTimeline: () => void;
  onNavigateAnomalies: () => void;
}

const LocationDetailDrawer: React.FC<LocationDetailDrawerProps> = ({
  location,
  onClose,
  onNavigateEntity,
  onNavigateNetwork,
  onNavigateTimeline,
  onNavigateAnomalies,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"entities" | "records" | "anomalies">("entities");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-100 flex items-start justify-between flex-shrink-0 bg-white">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              LOCATION
            </span>
            <span className="font-mono text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
              C{location.community}
            </span>
            {location.is_bridge_node && (
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                Bridge Hub
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-slate-900 truncate" title={location.name}>
            {location.name}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Degree: {location.degree.toFixed(3)} · Betweenness: {location.betweenness.toFixed(3)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 rounded flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Cross-Module Quick Actions */}
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 flex-wrap flex-shrink-0">
        <button
          onClick={() => onNavigateEntity(location.id)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
        >
          <Users className="w-3 h-3 text-slate-500" />
          Entity Explorer
        </button>
        <button
          onClick={() => onNavigateNetwork(location.id)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
        >
          <Share2 className="w-3 h-3 text-slate-500" />
          View in Network
        </button>
      </div>

      {/* Activity Metric Badges */}
      <div className="grid grid-cols-3 gap-2 p-3.5 border-b border-slate-100 bg-white text-center flex-shrink-0">
        <div className="p-2 bg-slate-50 rounded-lg">
          <p className="text-[10px] text-slate-400">Records</p>
          <p className="text-sm font-bold text-slate-800">{location.record_count}</p>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg">
          <p className="text-[10px] text-slate-400">Entities</p>
          <p className="text-sm font-bold text-slate-800">{location.entity_count}</p>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg">
          <p className="text-[10px] text-slate-400">Anomalies</p>
          <p className="text-sm font-bold text-amber-600">{location.anomaly_count}</p>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200 flex-shrink-0 bg-white">
        <button
          onClick={() => setActiveTab("entities")}
          className={`flex-1 py-2 text-xs font-semibold text-center transition-colors ${
            activeTab === "entities"
              ? "border-b-2 border-emerald-600 text-emerald-700"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Entities ({location.entities.length})
        </button>
        <button
          onClick={() => setActiveTab("records")}
          className={`flex-1 py-2 text-xs font-semibold text-center transition-colors ${
            activeTab === "records"
              ? "border-b-2 border-emerald-600 text-emerald-700"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Records ({location.records.length})
        </button>
        <button
          onClick={() => setActiveTab("anomalies")}
          className={`flex-1 py-2 text-xs font-semibold text-center transition-colors ${
            activeTab === "anomalies"
              ? "border-b-2 border-emerald-600 text-emerald-700"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Anomalies ({location.anomalies.length})
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* ── Entities Tab ── */}
        {activeTab === "entities" && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Connected Subjects &amp; Assets ({location.entities.length})
            </p>
            <div className="space-y-1.5">
              {location.entities.map(ent => {
                const ecfg = getEntityCfg(ent.type);
                const EIcon = ecfg.icon;
                return (
                  <div
                    key={ent.id}
                    onClick={() => onNavigateEntity(ent.id)}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50/70 cursor-pointer transition-all flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: ecfg.bg }}
                      >
                        <EIcon className="w-3.5 h-3.5" style={{ color: ecfg.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate" title={ent.id}>
                          {ent.id}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {ecfg.label} · {ent.record_count} co-occurring case{ent.record_count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        wt {ent.weight}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Records Tab ── */}
        {activeTab === "records" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Case Records at this Location ({location.records.length})
              </p>
              <button
                onClick={onNavigateTimeline}
                className="text-[11px] text-cyan-700 hover:underline inline-flex items-center gap-0.5 font-medium"
              >
                Open Timeline <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2.5">
              {location.records.map(rec => (
                <div key={rec.record_id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-cyan-800 bg-cyan-100/70 px-1.5 py-0.2 rounded">
                        {rec.record_id}
                      </span>
                      <button
                        onClick={() => navigate(`/cases?id=${encodeURIComponent(rec.record_id)}`)}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded transition-colors"
                        title={`Open Case Dossier ${rec.record_id}`}
                      >
                        <Briefcase className="w-2.5 h-2.5 text-cyan-700" />
                        Case File
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{rec.date}</span>
                  </div>
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                    Source: {rec.source.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/60">
                    "{rec.text}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Anomalies Tab ── */}
        {activeTab === "anomalies" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Correlated Detection Signals ({location.anomalies.length})
              </p>
              <button
                onClick={onNavigateAnomalies}
                className="text-[11px] text-amber-800 hover:underline inline-flex items-center gap-0.5 font-medium"
              >
                Open Anomaly Center <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {location.anomalies.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-lg text-center text-xs text-slate-400 italic">
                No active anomaly signals at this location.
              </div>
            ) : (
              <div className="space-y-2">
                {location.anomalies.map((anom, idx) => {
                  const pcfg = getPatternCfg(anom.pattern);
                  return (
                    <div
                      key={anom.id || idx}
                      className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="font-semibold px-2 py-0.5 rounded text-[10px]"
                          style={{ backgroundColor: pcfg.bg, color: pcfg.color }}
                        >
                          {pcfg.label}
                        </span>
                        {anom.id && (
                          <span className="font-mono text-[10px] font-bold text-slate-500">
                            {anom.id}
                          </span>
                        )}
                      </div>
                      {anom.entity && (
                        <p className="text-[11px] font-medium text-slate-700">
                          Entity: <strong className="text-slate-900">{anom.entity}</strong>
                        </p>
                      )}
                      <p className="text-xs text-slate-600 leading-snug">
                        {anom.note}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Location Hint Panel (No Selection) ─────────────────────────────────────
const LocationHintPanel: React.FC<{ totalLocations: number }> = ({ totalLocations }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
    <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4">
      <MapPin className="w-7 h-7 text-emerald-600" />
    </div>
    <h3 className="text-slate-800 font-bold text-sm mb-1">Select a Location Hub</h3>
    <p className="text-slate-400 text-xs leading-relaxed max-w-xs mb-6">
      Inspect real spatial associations, connected suspects, vehicles, and case records linked to operational sites across {totalLocations} indexed locations.
    </p>
    <div className="w-full space-y-2 text-left">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">Location Analysis Insight</p>
      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 text-xs text-slate-600 space-y-1">
        <p className="font-semibold text-slate-800">Operational Hubs in Dataset:</p>
        <p className="text-[11px] leading-relaxed">
          The Python NER engine extracted two primary location nodes: <strong>Andheri</strong> and <strong>Andheri Warehouse</strong>. Both act as critical bridge nodes coordinating persons (Ravi Malhotra, Suresh Nair, Deepak Shah) and assets (MH12AB1234).
        </p>
      </div>
    </div>
  </div>
);

export default Locations;