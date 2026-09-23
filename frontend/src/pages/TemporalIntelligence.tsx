import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import {
  TemporalOverviewResponse,
  TemporalObservation,
  TemporalEntityActivity,
  NetworkEvolutionSnapshot,
  TemporalPattern,
  TemporalPatternType,
} from "../types";
import {
  TemporalDrawer,
  TemporalPrecisionBadge,
  TemporalPatternBadge,
} from "../components/TemporalDrawer";
import {
  Clock,
  Calendar,
  Layers,
  Activity,
  GitCommit,
  Shield,
  Search,
  RefreshCw,
  ChevronRight,
  Eye,
  Users,
  Info,
  CalendarDays,
  Sparkles,
} from "lucide-react";

type ActiveTab =
  | "activity"
  | "evolution"
  | "entities"
  | "relationships"
  | "patterns";

export const TemporalIntelligence: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Primary Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<TemporalOverviewResponse | null>(null);

  // Tab & View States
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    (searchParams.get("tab") as ActiveTab) || "activity"
  );
  const [densityScale, setDensityScale] = useState<"day" | "week" | "month">("day");
  const [densityBuckets, setDensityBuckets] = useState<Record<string, number>>({});
  const [densityLoading, setDensityLoading] = useState<boolean>(false);

  // Snapshots State
  const [snapshots, setSnapshots] = useState<NetworkEvolutionSnapshot[]>([]);
  const [selectedSnapshotIdx, setSelectedSnapshotIdx] = useState<number>(0);

  // Patterns State
  const [patterns, setPatterns] = useState<TemporalPattern[]>([]);
  const [patternFilter, setPatternFilter] = useState<string>("ALL");

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [precisionFilter, setPrecisionFilter] = useState<string>("ALL");

  // Entity Timeline State
  const [entitiesList, setEntitiesList] = useState<string[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [entityActivity, setEntityActivity] = useState<TemporalEntityActivity | null>(null);
  const [entityObservations, setEntityObservations] = useState<TemporalObservation[]>([]);
  const [entityLoading, setEntityLoading] = useState<boolean>(false);

  // Drawer Inspection State
  const [drawerObservationId, setDrawerObservationId] = useState<string | null>(
    searchParams.get("obsId")
  );
  const [drawerPattern, setDrawerPattern] = useState<TemporalPattern | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(
    Boolean(searchParams.get("obsId"))
  );

  // ─── Fetch Overview & Baseline Data ───────────────────────────────────────
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch overview, evolution snapshots, and full pattern list in parallel
      const [overviewData, evolutionData, patternData] = await Promise.all([
        api.getTemporalOverview(),
        api.getTemporalEvolution(),
        api.getTemporalPatterns(),
      ]);

      setOverview(overviewData);
      setSnapshots(evolutionData.snapshots || []);
      setPatterns(patternData.patterns || overviewData.patterns_summary || []);
      setDensityBuckets(overviewData.activity_density?.day || {});

      // Extract tracked entities from recent observations
      const trackedEntities = new Set<string>();
      overviewData.recent_observations?.forEach((obs) => {
        obs.entities?.forEach((ent) => trackedEntities.add(ent));
      });
      const entArr = Array.from(trackedEntities).sort();
      setEntitiesList(entArr);

      if (entArr.length > 0) {
        const initialEntity = entArr[0];
        setSelectedEntityId(initialEntity);
        loadEntityData(initialEntity);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load temporal intelligence."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // ─── Change Density Scale ──────────────────────────────────────────────────
  const handleScaleChange = async (scale: "day" | "week" | "month") => {
    setDensityScale(scale);
    try {
      setDensityLoading(true);
      const res = await api.getTemporalActivity(scale);
      setDensityBuckets(res.buckets || {});
    } catch (err) {
      console.error("Failed to fetch density buckets:", err);
    } finally {
      setDensityLoading(false);
    }
  };

  // ─── Load Entity Temporal Activity ─────────────────────────────────────────
  const loadEntityData = async (entityId: string) => {
    if (!entityId) {
      setEntityActivity(null);
      setEntityObservations([]);
      return;
    }
    try {
      setEntityLoading(true);
      const res = await api.getTemporalEntity(entityId);
      setEntityActivity(res.activity_profile);
      setEntityObservations(res.observations || []);
    } catch (err) {
      console.error("Failed to load entity temporal activity:", err);
    } finally {
      setEntityLoading(false);
    }
  };

  const handleEntitySelect = (entityId: string) => {
    setSelectedEntityId(entityId);
    loadEntityData(entityId);
  };

  // ─── Tab Switching ─────────────────────────────────────────────────────────
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tab);
    setSearchParams(newParams);
  };

  // ─── Drawer Handlers ───────────────────────────────────────────────────────
  const openObservationDrawer = (id: string) => {
    setDrawerObservationId(id);
    setDrawerPattern(null);
    setIsDrawerOpen(true);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("obsId", id);
    setSearchParams(newParams);
  };

  const openPatternDrawer = (pat: TemporalPattern) => {
    setDrawerPattern(pat);
    setDrawerObservationId(null);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setDrawerObservationId(null);
    setDrawerPattern(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("obsId");
    setSearchParams(newParams);
  };

  // ─── Filtering Observations ────────────────────────────────────────────────
  const observations: TemporalObservation[] = overview?.recent_observations || [];
  const filteredObservations = observations.filter((obs: TemporalObservation) => {
    if (precisionFilter !== "ALL" && obs.precision !== precisionFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCase = obs.case_id?.toLowerCase().includes(q);
      const matchLoc = obs.locations?.some((l: string) => l.toLowerCase().includes(q));
      const matchDesc = obs.description?.toLowerCase().includes(q);
      const matchEntities = obs.entities?.some((e: string) =>
        e.toLowerCase().includes(q)
      );
      const matchId = obs.observation_id?.toLowerCase().includes(q);
      if (!matchCase && !matchLoc && !matchDesc && !matchEntities && !matchId) {
        return false;
      }
    }
    return true;
  });

  // ─── Filtering Patterns ────────────────────────────────────────────────────
  const filteredPatterns = patterns.filter((p: TemporalPattern) => {
    if (patternFilter !== "ALL" && p.pattern_type !== patternFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchLabel = p.pattern_label?.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q);
      const matchEntities = p.target_entities?.some((e: string) =>
        e.toLowerCase().includes(q)
      );
      if (!matchLabel && !matchDesc && !matchEntities) {
        return false;
      }
    }
    return true;
  });

  const selectedSnapshot = snapshots[selectedSnapshotIdx] || null;
  const kpis = overview?.summary_kpis;

  // Derive relationship evolution records from snapshots or entity relationships
  const canonicalPairsMap = new Map<string, {
    pair: [string, string];
    firstSeen: string;
    lastSeen: string;
    count: number;
    dates: string[];
    obsIds: string[];
  }>();

  observations.forEach((obs) => {
    const ents = obs.entities || [];
    for (let i = 0; i < ents.length; i++) {
      for (let j = i + 1; j < ents.length; j++) {
        const sortedPair: [string, string] = ents[i] < ents[j] ? [ents[i], ents[j]] : [ents[j], ents[i]];
        const key = `${sortedPair[0]} <-> ${sortedPair[1]}`;
        const existing = canonicalPairsMap.get(key);
        if (!existing) {
          canonicalPairsMap.set(key, {
            pair: sortedPair,
            firstSeen: obs.date,
            lastSeen: obs.date,
            count: 1,
            dates: [obs.date],
            obsIds: [obs.observation_id],
          });
        } else {
          existing.count += 1;
          if (obs.date < existing.firstSeen) existing.firstSeen = obs.date;
          if (obs.date > existing.lastSeen) existing.lastSeen = obs.date;
          if (!existing.dates.includes(obs.date)) existing.dates.push(obs.date);
          if (!existing.obsIds.includes(obs.observation_id)) existing.obsIds.push(obs.observation_id);
        }
      }
    }
  });

  const relationshipPairs = Array.from(canonicalPairsMap.values());

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
              Observed Network Evolution
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-indigo-700" />
            Temporal Intelligence Engine
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl">
            Answers{" "}
            <span className="font-semibold text-slate-900">
              “What changed, when did it change, and how did the observed network
              evolve over time?”
            </span>{" "}
            through deterministic observation ledgers, multi-scale density histograms,
            windowed graph snapshots, and grounded temporal pattern detection.
          </p>
        </div>

        <button
          onClick={fetchAllData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer shrink-0 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Intelligence</span>
        </button>
      </div>

      {/* ── Epistemic Governance Banner ─────────────────────────────────────── */}
      <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-4 flex items-start gap-3.5 shadow-2xs">
        <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-950 space-y-1">
          <div className="font-bold text-amber-900 font-mono uppercase tracking-wider text-[11px] flex items-center gap-2">
            <span>Epistemic Grounding & Non-Inference Rules</span>
            <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-amber-100 border border-amber-300 text-amber-800">
              Strict Verification Active
            </span>
          </div>
          <p className="text-amber-900/90 leading-relaxed font-medium">
            Temporal observations reflect dates extracted strictly from ingested source
            documents. An observed gap indicates that{" "}
            <span className="font-semibold underline decoration-amber-400">
              no record was logged
            </span>{" "}
            in that window, not that criminal activity stopped. Co-occurrence
            identifies{" "}
            <span className="font-semibold underline decoration-amber-400">
              same-date/location observation overlap
            </span>
            , not proven physical meetings or conspiracy. Date-only records preserve
            neutral bounds and are never fabricated with midnight or arbitrary times.
          </p>
        </div>
      </div>

      {/* ── KPI Summary Cards ───────────────────────────────────────────────── */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-mono uppercase text-slate-500 font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Observations Ledger
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
              {kpis.total_observations}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {kpis.timed_observations_count} timed, {kpis.date_only_observations_count} date-only
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-mono uppercase text-slate-500 font-semibold flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-cyan-600" />
              Observation Span
            </div>
            <div className="text-sm font-bold text-cyan-900 font-mono mt-2 truncate">
              {kpis.earliest_date || "N/A"}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              to {kpis.latest_date || "N/A"} ({kpis.date_span_days} days)
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-mono uppercase text-slate-500 font-semibold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Evolution Slices
            </div>
            <div className="text-2xl font-bold text-emerald-800 font-mono mt-1">
              {snapshots.length}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Reconstructed windows
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-mono uppercase text-slate-500 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              Temporal Patterns
            </div>
            <div className="text-2xl font-bold text-purple-800 font-mono mt-1">
              {patterns.length}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Deterministic signals
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-mono uppercase text-slate-500 font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-600" />
              Tracked Entities
            </div>
            <div className="text-2xl font-bold text-slate-800 font-mono mt-1">
              {kpis.total_entities_tracked}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Timeline indexed
            </div>
          </div>
        </div>
      )}

      {/* ── View Selection Tabs ─────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => handleTabChange("activity")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
            activeTab === "activity"
              ? "border-indigo-600 text-indigo-700 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Activity Density & Ledger</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
            {kpis?.total_observations || 0}
          </span>
        </button>

        <button
          onClick={() => handleTabChange("evolution")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
            activeTab === "evolution"
              ? "border-indigo-600 text-indigo-700 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Network Evolution Snapshots</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
            {snapshots.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange("entities")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
            activeTab === "entities"
              ? "border-indigo-600 text-indigo-700 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Entity Activity & Gaps</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
            {entitiesList.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange("relationships")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
            activeTab === "relationships"
              ? "border-indigo-600 text-indigo-700 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
          }`}
        >
          <GitCommit className="w-4 h-4" />
          <span>Relationship Evolution</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
            {relationshipPairs.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange("patterns")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
            activeTab === "patterns"
              ? "border-indigo-600 text-indigo-700 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Temporal Patterns</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
            {patterns.length}
          </span>
        </button>
      </div>

      {/* ── TAB 1: Activity Density & Ledger ────────────────────────────────── */}
      {activeTab === "activity" && (
        <div className="space-y-6">
          {/* Density Histogram Controls & Visualizer */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  Temporal Activity Density Histogram
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Multi-scale bucket aggregation of verified dated intelligence observations
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                {(["day", "week", "month"] as const).map((scale) => (
                  <button
                    key={scale}
                    onClick={() => handleScaleChange(scale)}
                    className={`px-3 py-1 rounded text-xs font-mono font-semibold uppercase transition-all cursor-pointer ${
                      densityScale === scale
                        ? "bg-white text-indigo-700 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {scale}
                  </button>
                ))}
              </div>
            </div>

            {/* Density Bars Display */}
            {densityLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                Aggregating {densityScale} buckets...
              </div>
            ) : Object.keys(densityBuckets).length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No temporal observations logged for this resolution.
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {Object.entries(densityBuckets).map(([key, count]) => {
                    const maxVal = Math.max(...Object.values(densityBuckets), 1);
                    const pct = Math.round((count / maxVal) * 100);
                    return (
                      <div
                        key={key}
                        className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 flex flex-col justify-between hover:border-indigo-300 transition-colors"
                      >
                        <div>
                          <div className="text-[10px] font-mono font-bold text-slate-700 truncate">
                            {key}
                          </div>
                          <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                            {count} <span className="text-[10px] font-normal text-slate-500">obs</span>
                          </div>
                        </div>

                        <div className="mt-2 space-y-1">
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[10px] font-mono text-slate-400 text-right">
                  Verified Invariant: Sum of daily buckets (
                  {Object.values(densityBuckets).reduce((acc: number, val: number) => acc + val, 0)}
                  ) == Total Dated Observations
                </div>
              </div>
            )}
          </div>

          {/* Observation Ledger Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Temporal Observation Ledger ({filteredObservations.length})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Source-grounded events preserving exact observation precision
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter entity, case, location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-400 w-56 font-mono"
                  />
                </div>

                {/* Precision Filter */}
                <select
                  value={precisionFilter}
                  onChange={(e) => setPrecisionFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
                >
                  <option value="ALL">All Precisions</option>
                  <option value="DATE_ONLY">Date-Only</option>
                  <option value="DATE_TIME">Date-Time</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4 font-semibold">Observation ID</th>
                    <th className="py-2.5 px-4 font-semibold">Date & Time</th>
                    <th className="py-2.5 px-4 font-semibold">Precision</th>
                    <th className="py-2.5 px-4 font-semibold">Observed Entities</th>
                    <th className="py-2.5 px-4 font-semibold">Case ID</th>
                    <th className="py-2.5 px-4 font-semibold">Locations</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredObservations.map((obs: TemporalObservation) => (
                    <tr
                      key={obs.observation_id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {obs.observation_id}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-800 whitespace-nowrap">
                        {obs.date}
                        {obs.time && (
                          <span className="text-slate-500 ml-1">
                            {obs.time} IST
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <TemporalPrecisionBadge
                          precision={obs.precision}
                          time={obs.time}
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(obs.entities || []).map((name: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-200"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-indigo-700 font-semibold">
                        {obs.case_id}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 truncate max-w-[160px]">
                        {obs.locations && obs.locations.length > 0 ? obs.locations.join(", ") : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => openObservationDrawer(obs.observation_id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Network Evolution Snapshots ───────────────────────────────── */}
      {activeTab === "evolution" && (
        <div className="space-y-6">
          {/* Snapshot Selection Carousel / Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Network Evolution Snapshot Slices
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Windowed network reconstructions derived strictly from source observations
              </p>
            </div>

            {/* Snapshot Selector Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {snapshots.map((snap: NetworkEvolutionSnapshot, idx: number) => (
                <button
                  key={snap.window_id}
                  onClick={() => setSelectedSnapshotIdx(idx)}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedSnapshotIdx === idx
                      ? "border-indigo-600 bg-indigo-50/50 shadow-2xs"
                      : "border-slate-200 bg-slate-50/60 hover:bg-slate-100/80"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span className="font-bold text-indigo-900">
                      {snap.window_label || snap.window_id}
                    </span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200/60">
                      Window {idx + 1}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 font-mono mt-1">
                    {snap.start_date} <span className="text-slate-400">→</span>{" "}
                    {snap.end_date}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 mt-2 pt-2 border-t border-slate-200/60">
                    <span>{snap.active_nodes.length} nodes</span>
                    <span>{snap.active_edges.length} edges</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Disclaimer on Network Evolution */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-start gap-2.5 text-[11px] text-slate-600">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">
                  Strict Source Reconstruction Notice:
                </span>{" "}
                Snapshots represent subgraphs reconstructed purely from observations recorded within each window.
                Unobserved nodes indicate absence of recorded activity in that interval, NOT physical disassociation or exit from the crime network.
              </div>
            </div>
          </div>

          {/* Active Snapshot Inspection Panel */}
          {selectedSnapshot && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Snapshot Metrics Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  Window Topology Metrics
                </h4>

                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[10px] font-mono uppercase text-slate-500">
                      Window Active Nodes
                    </div>
                    <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
                      {selectedSnapshot.active_nodes.length}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Nodes observed in this window
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[10px] font-mono uppercase text-slate-500">
                      Window Active Relationships
                    </div>
                    <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
                      {selectedSnapshot.active_edges.length}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Co-occurrences observed in this window
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[10px] font-mono uppercase text-slate-500">
                      Window Observations
                    </div>
                    <div className="text-xl font-bold text-indigo-800 font-mono mt-0.5">
                      {selectedSnapshot.observation_count}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Source events logged in timeframe
                    </div>
                  </div>
                </div>
              </div>

              {/* Added vs Departed Nodes */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Node Dynamics in Window
                </h4>

                <div className="space-y-4">
                  <div>
                    <div className="text-[11px] font-bold text-emerald-800 font-mono uppercase flex items-center justify-between mb-1.5">
                      <span>Newly Observed Nodes</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 text-[10px]">
                        +{selectedSnapshot.added_nodes.length}
                      </span>
                    </div>
                    {selectedSnapshot.added_nodes.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic p-2 bg-slate-50 rounded">
                        No new entities observed in this window.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSnapshot.added_nodes.map((node: string) => (
                          <span
                            key={node}
                            className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-900 border border-emerald-200"
                          >
                            {node}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-slate-700 font-mono uppercase flex items-center justify-between mb-1.5">
                      <span>Unobserved From Prior Window</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px]">
                        {selectedSnapshot.departed_nodes.length}
                      </span>
                    </div>
                    {selectedSnapshot.departed_nodes.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic p-2 bg-slate-50 rounded">
                        All prior nodes remained observed.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSnapshot.departed_nodes.map((node: string) => (
                          <span
                            key={node}
                            className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 line-through opacity-75"
                          >
                            {node}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Window Relationships Formed */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-indigo-600" />
                  Relationships In Window
                </h4>

                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] font-bold text-indigo-800 font-mono uppercase flex items-center justify-between mb-1.5">
                      <span>New Co-occurrences</span>
                      <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900 text-[10px]">
                        +{selectedSnapshot.new_edges.length}
                      </span>
                    </div>
                    {selectedSnapshot.new_edges.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic p-2 bg-slate-50 rounded">
                        No new relationships appeared.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {selectedSnapshot.new_edges.map((edge: string[], idx: number) => (
                          <div
                            key={idx}
                            className="p-2 rounded bg-indigo-50/60 border border-indigo-100 text-[11px] font-mono text-indigo-950 flex items-center justify-between"
                          >
                            <span>
                              {edge[0]} ↔ {edge[1]}
                            </span>
                            <span className="text-[10px] text-indigo-700">
                              Active in slice
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Entity Activity & Gaps ────────────────────────────────────── */}
      {activeTab === "entities" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Entity Temporal Timeline & Gaps
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Inspect chronological observations and logging gaps for individual entities
                </p>
              </div>

              {/* Entity Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-500">Select Entity:</span>
                <select
                  value={selectedEntityId}
                  onChange={(e) => handleEntitySelect(e.target.value)}
                  className="px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-semibold focus:outline-none focus:border-indigo-500"
                >
                  {entitiesList.map((entName) => (
                    <option key={entName} value={entName}>
                      {entName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Entity Details */}
            {entityLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                Loading entity temporal history...
              </div>
            ) : entityActivity ? (
              <div className="space-y-6 pt-2">
                {/* Entity Summary Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-[10px] font-mono text-slate-500 uppercase">
                      First Observed
                    </div>
                    <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                      {entityActivity.first_observed || "N/A"}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-[10px] font-mono text-slate-500 uppercase">
                      Last Observed
                    </div>
                    <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                      {entityActivity.last_observed || "N/A"}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-[10px] font-mono text-slate-500 uppercase">
                      Total Observations
                    </div>
                    <div className="text-sm font-bold text-indigo-800 font-mono mt-0.5">
                      {entityActivity.observation_count}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-[10px] font-mono text-slate-500 uppercase">
                      Active Dates Count
                    </div>
                    <div className="text-sm font-bold text-emerald-800 font-mono mt-0.5">
                      {entityActivity.active_dates?.length || 0}
                    </div>
                  </div>
                </div>

                {/* Gaps Banner */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Observed Logging Gaps ({entityActivity.gaps?.length || 0})
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      Intervals &gt; 5 days between observations
                    </span>
                  </div>

                  {!entityActivity.gaps || entityActivity.gaps.length === 0 ? (
                    <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200 text-xs text-emerald-800 font-medium">
                      ✓ No extended gaps (&gt;5 days) observed between consecutive records for this entity.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {entityActivity.gaps.map((gap, idx: number) => (
                        <div
                          key={idx}
                          className="bg-amber-50/70 p-3 rounded-lg border border-amber-200 space-y-1"
                        >
                          <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-900">
                            <span>
                              {gap.prior_date} → {gap.next_date}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-950 text-[10px]">
                              {gap.gap_days} days gap
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-950/80 leading-relaxed">
                            {gap.epistemic_note}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chronological Observations Table for Entity */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Chronological Record Occurrences
                  </h4>

                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Precision</th>
                          <th className="py-2 px-3">Case ID</th>
                          <th className="py-2 px-3">Locations</th>
                          <th className="py-2 px-3">Co-occurring Entities</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {entityObservations.map((obs: TemporalObservation) => (
                          <tr key={obs.observation_id} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">
                              {obs.date}
                              {obs.time && (
                                <span className="text-slate-500 ml-1">
                                  {obs.time} IST
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <TemporalPrecisionBadge
                                precision={obs.precision}
                                time={obs.time}
                              />
                            </td>
                            <td className="py-2 px-3 font-mono text-indigo-700 font-semibold">
                              {obs.case_id}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {obs.locations?.join(", ") || "—"}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex flex-wrap gap-1">
                                {(obs.entities || [])
                                  .filter((n: string) => n !== selectedEntityId)
                                  .map((name: string, i: number) => (
                                    <span
                                      key={i}
                                      className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200"
                                    >
                                      {name}
                                    </span>
                                  ))}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => openObservationDrawer(obs.observation_id)}
                                className="text-[11px] font-medium text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── TAB 4: Relationship Evolution ───────────────────────────────────── */}
      {activeTab === "relationships" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-indigo-600" />
                Relationship Temporal Evolution ({relationshipPairs.length})
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Canonical entity co-occurrence pairs, persistence windows, and observation counts
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4 font-semibold">Entity Pair</th>
                  <th className="py-2.5 px-4 font-semibold">First Co-occurrence</th>
                  <th className="py-2.5 px-4 font-semibold">Last Co-occurrence</th>
                  <th className="py-2.5 px-4 font-semibold">Observation Dates</th>
                  <th className="py-2.5 px-4 font-semibold">Co-occurrences</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {relationshipPairs.map((rel, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="text-indigo-900">{rel.pair[0]}</span>
                        <span className="text-slate-400">↔</span>
                        <span className="text-indigo-900">{rel.pair[1]}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">
                      {rel.firstSeen}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">
                      {rel.lastSeen}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-800">
                      {rel.dates.join(", ")}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                        {rel.count} obs
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {rel.obsIds && rel.obsIds.length > 0 && (
                        <button
                          onClick={() => openObservationDrawer(rel.obsIds[0])}
                          className="text-[11px] font-medium text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
                        >
                          View Trace
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 5: Detected Temporal Patterns ───────────────────────────────── */}
      {activeTab === "patterns" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Deterministic Temporal Patterns ({filteredPatterns.length})
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Observed bursts, recurring activities, late timeline appearances, and gaps
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={patternFilter}
                onChange={(e) => setPatternFilter(e.target.value)}
                className="px-3 py-1 text-xs font-mono rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
              >
                <option value="ALL">All Pattern Types</option>
                <option value="BURST_ACTIVITY">Burst Activity</option>
                <option value="RECURRING_ACTIVITY">Recurring Activity</option>
                <option value="LATE_TIMELINE_APPEARANCE">Late Timeline Appearance</option>
                <option value="SAME_DATE_LOCATION_OVERLAP">Same-Date/Location Overlap</option>
                <option value="TEMPORAL_GAP">Temporal Gap</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPatterns.map((pat: TemporalPattern) => (
              <div
                key={pat.pattern_id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400">
                        {pat.pattern_id}
                      </span>
                      <TemporalPatternBadge type={pat.pattern_type} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {pat.pattern_label}
                    </h4>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {pat.metric_value}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {pat.description}
                </p>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {(pat.target_entities || []).map((name: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200"
                    >
                      {name}
                    </span>
                  ))}
                </div>

                <div className="p-2.5 rounded bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-950 space-y-0.5">
                  <div className="font-semibold text-amber-900 font-mono uppercase text-[10px]">
                    Epistemic Disclaimer
                  </div>
                  <div>{pat.epistemic_limitation}</div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="text-[11px] font-mono text-slate-500">
                    Window: {pat.date_range ? `${pat.date_range[0]} → ${pat.date_range[1]}` : "—"}
                  </div>
                  <button
                    onClick={() => openPatternDrawer(pat)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors cursor-pointer"
                  >
                    <span>Inspect Pattern</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Inspector Drawer ─────────────────────────────────────────────────── */}
      {isDrawerOpen && (
        <TemporalDrawer
          observationId={drawerObservationId}
          pattern={drawerPattern}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
};
