import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { NetworkNode, EntityDetail, SuspiciousPattern, ConnectedEntity } from "../types";
import {
  Search, X, Users, Phone, Car, MapPin, Building2, DollarSign,
  Circle, AlertTriangle, Shield, Star, ChevronUp, ChevronDown,
  ChevronsUpDown, ExternalLink, Share2, FileText, ChevronRight, Info,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface EntityCfg { color: string; border: string; bg: string; label: string; icon: LucideIcon; }
const ENTITY_CFG: Record<string, EntityCfg> = {
  PERSON:   { color: "#E11D48", border: "#9F1239", bg: "#FFF1F2", label: "Person",   icon: Users      },
  PHONE:    { color: "#6366F1", border: "#4338CA", bg: "#EEF2FF", label: "Phone",    icon: Phone      },
  VEHICLE:  { color: "#D97706", border: "#92400E", bg: "#FFFBEB", label: "Vehicle",  icon: Car        },
  LOCATION: { color: "#059669", border: "#065F46", bg: "#ECFDF5", label: "Location", icon: MapPin     },
  ORG:      { color: "#2563EB", border: "#1E3A8A", bg: "#EFF6FF", label: "Org",      icon: Building2  },
  MONEY:    { color: "#7C3AED", border: "#4C1D95", bg: "#F5F3FF", label: "Money",    icon: DollarSign },
  UNKNOWN:  { color: "#6B7280", border: "#374151", bg: "#F9FAFB", label: "Unknown",  icon: Circle     },
};
const getCfg = (type: string): EntityCfg => ENTITY_CFG[type] ?? ENTITY_CFG["UNKNOWN"];

type SortKey = "id" | "degree" | "betweenness" | "influence_score" | "anomaly_count";
type SortDir = "asc" | "desc";
type TypeFilter = string;

const PATTERN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  burst_activity:      { label: "Burst Activity",        color: "#C2410C", bg: "#FFF7ED" },
  structuring:         { label: "Financial Structuring", color: "#7C3AED", bg: "#F5F3FF" },
  new_entity_spike:    { label: "New Entity Spike",      color: "#B45309", bg: "#FFFBEB" },
  statistical_outlier: { label: "Statistical Outlier",   color: "#0F766E", bg: "#F0FDFA" },
};
const getPStyle = (p: string) => PATTERN_LABELS[p] ?? { label: p, color: "#6B7280", bg: "#F9FAFB" };
const fmt4 = (v: number) => v.toFixed(4);

const FilterChip: React.FC<{
  label: string; count: number; active: boolean; color: string;
  icon?: React.ReactNode; onClick: () => void;
}> = ({ label, count, active, color, icon, onClick }) => (
  <button onClick={onClick}
    className={"inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all " +
      (active ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300")}
    style={active ? { backgroundColor: color } : {}}>
    {icon}{label}
    <span className={"ml-0.5 " + (active ? "text-white/75" : "text-slate-400")}>{count}</span>
  </button>
);

const Th: React.FC<{
  label: string; sortKey?: SortKey; current?: SortKey; dir?: SortDir;
  onSort?: (k: SortKey) => void; wide?: boolean;
}> = ({ label, sortKey, current, dir, onSort, wide }) => {
  const isSorted = sortKey && current === sortKey;
  return (
    <th
      className={"px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap " +
        (sortKey ? "cursor-pointer select-none hover:text-slate-700 " : "") + (wide ? "min-w-[160px]" : "")}
      onClick={() => sortKey && onSort && onSort(sortKey)}>
      <div className="flex items-center gap-1">{label}
        {sortKey && (isSorted
          ? dir === "asc" ? <ChevronUp className="w-3 h-3 text-cyan-600" /> : <ChevronDown className="w-3 h-3 text-cyan-600" />
          : <ChevronsUpDown className="w-3 h-3 text-slate-300" />)}
      </div>
    </th>
  );
};

const EntityHintPanel: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
      <Users className="w-7 h-7 text-slate-400" />
    </div>
    <p className="text-slate-700 font-semibold mb-1">Select an Entity</p>
    <p className="text-slate-400 text-sm leading-relaxed">Click any row in the registry to view entity details, centrality metrics, connections, and anomalies.</p>
    <div className="mt-6 w-full space-y-2 text-xs text-left text-slate-500">
      <div className="flex items-start gap-2"><Star className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />Key Player — high composite influence score</div>
      <div className="flex items-start gap-2"><Shield className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />Bridge Node — controls network information flow</div>
      <div className="flex items-start gap-2"><AlertTriangle className="w-3.5 h-3.5 text-orange-500 mt-0.5 flex-shrink-0" />Anomaly Flagged — one or more investigative leads</div>
    </div>
  </div>
);

const ConnectionsTab: React.FC<{ entities: ConnectedEntity[]; onSelect: (id: string) => void }> = ({ entities, onSelect }) => {
  const sorted = [...entities].sort((a, b) => b.weight - a.weight);
  if (sorted.length === 0) return <p className="text-xs text-slate-400 italic">No connections found.</p>;
  return (
    <div className="space-y-1.5">
      {sorted.map(conn => (
        <button key={conn.entity} onClick={() => onSelect(conn.entity)}
          className="w-full flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left group border border-transparent hover:border-slate-200">
          <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Circle className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-800 truncate">{conn.entity}</span>
              <span className="text-[10px] text-slate-400 ml-2 flex-shrink-0">wt {conn.weight}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {conn.records.length} record{conn.records.length !== 1 ? "s" : ""}
              {conn.dates.length > 0 ? " · " + conn.dates[0] : ""}
              {conn.dates.length > 1 ? " – " + conn.dates[conn.dates.length - 1] : ""}
            </p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 flex-shrink-0 mt-1" />
        </button>
      ))}
    </div>
  );
};

const AnomaliesTab: React.FC<{ anomalies: SuspiciousPattern[] }> = ({ anomalies }) => {
  if (anomalies.length === 0) return (
    <div className="flex flex-col items-center py-8 text-center">
      <Info className="w-7 h-7 text-slate-300 mb-2" />
      <p className="text-xs text-slate-500">No anomalies associated with this entity.</p>
    </div>
  );
  return (
    <div className="space-y-2.5">
      {anomalies.map((a, i) => {
        const ps = getPStyle(a.pattern);
        return (
          <div key={i} className="p-3 rounded-lg border border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                style={{ backgroundColor: ps.bg, color: ps.color }}>{ps.label}</span>
              {a.date && <span className="text-[10px] text-slate-400">{a.date}</span>}
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">{a.note}</p>
            {a.event_count !== undefined && <p className="text-[10px] text-slate-400 mt-1">Events: {a.event_count}</p>}
          </div>
        );
      })}
    </div>
  );
};

const RecordsTab: React.FC<{ records: Array<{ record_id: string; source: string; date: string; text: string }> }> = ({ records }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (records.length === 0) return <p className="text-xs text-slate-400 italic">No associated case records.</p>;
  return (
    <div className="space-y-2">
      {records.map(r => (
        <div key={r.record_id} className="border border-slate-100 rounded-lg overflow-hidden">
          <button onClick={() => setExpanded(expanded === r.record_id ? null : r.record_id)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-800">{r.record_id}</span>
              <span className="text-[10px] text-slate-500 truncate">{r.source.replace(/_/g, " ")}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] text-slate-400">{r.date}</span>
              {expanded === r.record_id
                ? <ChevronUp className="w-3 h-3 text-slate-400" />
                : <ChevronDown className="w-3 h-3 text-slate-400" />}
            </div>
          </button>
          {expanded === r.record_id && (
            <div className="px-3 pb-3 pt-1 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-600 leading-relaxed">{r.text}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const EntityDetailPanel: React.FC<{
  detail: EntityDetail; onClose: () => void;
  onNavigateToNetwork: () => void; onSelectEntity: (id: string) => void;
}> = ({ detail, onClose, onNavigateToNetwork, onSelectEntity }) => {
  const cfg = getCfg(detail.type);
  const Icon = cfg.icon;
  const [tab, setTab] = useState<"connections" | "anomalies" | "records">("connections");
  const metrics = [
    { label: "Degree Centrality", value: fmt4(detail.degree), pct: detail.degree, desc: "Normalised share of connections" },
    { label: "Betweenness", value: fmt4(detail.betweenness), pct: detail.betweenness * 5, desc: "Control over information flow" },
    { label: "PageRank", value: fmt4(detail.pagerank), pct: detail.pagerank * 5, desc: "Recursive network importance" },
    { label: "Eigenvector", value: fmt4(detail.eigenvector), pct: detail.eigenvector, desc: "Influential-neighbour weighting" },
    { label: "Influence Score", value: fmt4(detail.influence_score), pct: detail.influence_score * 3, desc: "Composite investigative ranking" },
  ];
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-start justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg.bg }}>
            <Icon className="w-5 h-5" style={{ color: cfg.color }} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: cfg.color }}>{cfg.label}</p>
            <p className="font-bold text-slate-900 text-sm leading-tight truncate" title={detail.id}>{detail.id}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-4 py-2.5 border-b border-slate-100 flex flex-wrap gap-1.5 flex-shrink-0">
        <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: cfg.color }}>
          Community {detail.community}
        </span>
        {detail.is_key_player && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
            <Star className="w-2.5 h-2.5" />Key Player
          </span>
        )}
        {detail.is_bridge_node && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1">
            <Shield className="w-2.5 h-2.5" />Bridge Node
          </span>
        )}
        {detail.anomaly_count > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200 inline-flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" />{detail.anomaly_count} Anomal{detail.anomaly_count === 1 ? "y" : "ies"}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Centrality Metrics</p>
          <div className="space-y-2.5">
            {metrics.map(m => (
              <div key={m.label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-600">{m.label}</span>
                  <span className="text-xs font-bold text-slate-900 font-mono">{m.value}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, m.pct * 100)}%`, backgroundColor: cfg.color, opacity: 0.75 }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 py-3 border-b border-slate-100">
          <button onClick={onNavigateToNetwork}
            className="w-full py-2 text-sm font-medium border border-slate-200 text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" />View in Network Graph
          </button>
        </div>
        <div className="flex border-b border-slate-100">
          {(["connections", "anomalies", "records"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={"flex-1 py-2 text-xs font-semibold transition-colors " +
                (tab === t ? "border-b-2 border-cyan-500 text-cyan-700 bg-cyan-50/50" : "text-slate-500 hover:text-slate-700")}>
              {t === "connections" ? `Connections (${detail.connected_entities.length})`
               : t === "anomalies" ? `Anomalies (${detail.detected_anomalies.length})`
               : `Records (${detail.associated_records.length})`}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tab === "connections" && <ConnectionsTab entities={detail.connected_entities} onSelect={onSelectEntity} />}
          {tab === "anomalies" && <AnomaliesTab anomalies={detail.detected_anomalies} />}
          {tab === "records" && <RecordsTab records={detail.associated_records} />}
        </div>
      </div>
    </div>
  );
};

export const Entities: React.FC = () => {
  const navigate = useNavigate();
  const [entities, setEntities] = useState<NetworkNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EntityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("influence_score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const loadEntities = useCallback(async () => {
    setLoading(true); setError(null);
    try { setEntities(await api.getEntities()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to load entities"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadEntities(); }, [loadEntities]);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setDetailLoading(true); setDetailError(null); setDetail(null);
    api.getEntityDetail(selectedId)
      .then(d => setDetail(d))
      .catch((e: unknown) => setDetailError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const counts = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    let keyPlayers = 0, bridgeNodes = 0, anomalyFlagged = 0;
    for (const e of entities) {
      typeCounts[e.type] = (typeCounts[e.type] ?? 0) + 1;
      if (e.is_key_player) keyPlayers++;
      if (e.is_bridge_node) bridgeNodes++;
      if (e.anomaly_count > 0) anomalyFlagged++;
    }
    return { typeCounts, keyPlayers, bridgeNodes, anomalyFlagged };
  }, [entities]);

  const displayList = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = entities.filter(e => {
      if (q && !e.id.toLowerCase().includes(q)) return false;
      if (typeFilter === "all") return true;
      if (typeFilter === "key_players") return e.is_key_player;
      if (typeFilter === "bridge_nodes") return e.is_bridge_node;
      if (typeFilter === "anomaly_flagged") return e.anomaly_count > 0;
      return e.type === typeFilter;
    });
    return [...list].sort((a, b) => {
      const av = sortKey === "id" ? a.id : (a[sortKey] as number);
      const bv = sortKey === "id" ? b.id : (b[sortKey] as number);
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [entities, search, typeFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#F8FAFC]">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-600 font-medium">Loading Entity Registry…</p>
        <p className="text-slate-400 text-sm">Fetching from Python intelligence engine</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex-1 flex items-center justify-center bg-[#F8FAFC]">
      <div className="text-center space-y-3 max-w-md">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <p className="font-semibold text-slate-800">Registry load failed</p>
        <p className="text-sm text-slate-500">{error}</p>
        <button onClick={loadEntities}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden bg-[#F8FAFC]">
      {/* Registry */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-cyan-600" />
            <h1 className="text-xl font-bold text-slate-900">Entity Intelligence Explorer</h1>
          </div>
          <p className="text-sm text-slate-500">
            Searchable registry of all CNIS-extracted entities · {entities.length} entities indexed
          </p>
        </div>

        <div className="px-6 py-3 border-b border-slate-200 bg-white flex-shrink-0 space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID, phone, vehicle, org, location…"
              className="w-full pl-10 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <FilterChip label="All" count={entities.length} active={typeFilter === "all"} color="#64748B" onClick={() => setTypeFilter("all")} />
            {Object.entries(ENTITY_CFG).filter(([t]) => t !== "UNKNOWN").map(([type, cfg]) => {
              const cnt = counts.typeCounts[type] ?? 0;
              if (cnt === 0) return null;
              return (
                <FilterChip key={type} label={cfg.label} count={cnt} active={typeFilter === type} color={cfg.color}
                  onClick={() => setTypeFilter(typeFilter === type ? "all" : type)} />
              );
            })}
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <FilterChip label="Key Players" count={counts.keyPlayers} active={typeFilter === "key_players"} color="#D97706"
              icon={<Star className="w-3 h-3" />} onClick={() => setTypeFilter(typeFilter === "key_players" ? "all" : "key_players")} />
            <FilterChip label="Bridge Nodes" count={counts.bridgeNodes} active={typeFilter === "bridge_nodes"} color="#6366F1"
              icon={<Share2 className="w-3 h-3" />} onClick={() => setTypeFilter(typeFilter === "bridge_nodes" ? "all" : "bridge_nodes")} />
            <FilterChip label="Anomaly Flagged" count={counts.anomalyFlagged} active={typeFilter === "anomaly_flagged"} color="#EA580C"
              icon={<AlertTriangle className="w-3 h-3" />} onClick={() => setTypeFilter(typeFilter === "anomaly_flagged" ? "all" : "anomaly_flagged")} />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {displayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <Search className="w-8 h-8 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No entities match your filters</p>
              <p className="text-slate-400 text-sm mt-1">Adjust the search or clear the active filter.</p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                <tr>
                  <Th label="Entity" sortKey="id" current={sortKey} dir={sortDir} onSort={toggleSort} wide />
                  <Th label="Type" />
                  <Th label="Influence" sortKey="influence_score" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <Th label="Degree" sortKey="degree" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <Th label="Betweenness" sortKey="betweenness" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <Th label="Anomalies" sortKey="anomaly_count" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <Th label="Community" />
                  <Th label="Indicators" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayList.map(entity => {
                  const cfg = getCfg(entity.type);
                  const Icon = cfg.icon;
                  const isSelected = selectedId === entity.id;
                  return (
                    <tr key={entity.id} onClick={() => setSelectedId(isSelected ? null : entity.id)}
                      className={"cursor-pointer transition-colors " +
                        (isSelected ? "bg-cyan-50 border-l-2 border-l-cyan-500" : "hover:bg-slate-50 border-l-2 border-l-transparent")}>
                      <td className="px-4 py-2.5 font-medium text-slate-900 max-w-[200px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg.bg }}>
                            <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                          </div>
                          <span className="truncate" title={entity.id}>{entity.id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-14 bg-slate-100 rounded-full h-1.5 flex-shrink-0">
                            <div className="h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, entity.influence_score * 300)}%`, backgroundColor: cfg.color }} />
                          </div>
                          <span className="text-xs font-mono tabular-nums text-slate-600">{fmt4(entity.influence_score)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono tabular-nums text-slate-600">{fmt4(entity.degree)}</td>
                      <td className="px-4 py-2.5 text-xs font-mono tabular-nums text-slate-600">{fmt4(entity.betweenness)}</td>
                      <td className="px-4 py-2.5">
                        {entity.anomaly_count > 0
                          ? <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700">
                              <AlertTriangle className="w-3 h-3" />{entity.anomaly_count}
                            </span>
                          : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                          C{entity.community}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          {entity.is_key_player && (
                            <span title="Key Player" className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-100 text-amber-600">
                              <Star className="w-3 h-3" />
                            </span>
                          )}
                          {entity.is_bridge_node && (
                            <span title="Bridge Node" className="inline-flex items-center justify-center w-5 h-5 rounded bg-indigo-100 text-indigo-600">
                              <Shield className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-2 border-t border-slate-200 bg-white flex-shrink-0">
          <p className="text-xs text-slate-400">
            Showing <span className="font-semibold text-slate-600">{displayList.length}</span> of{" "}
            <span className="font-semibold text-slate-600">{entities.length}</span> entities
            {search && <span> matching <em>"{search}"</em></span>}
          </p>
        </div>
      </div>

      {/* Detail Panel */}
      <div className="w-[360px] flex-shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden">
        {selectedId ? (
          detailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : detailError ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div className="space-y-2">
                <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
                <p className="text-slate-700 text-sm font-medium">Entity not found</p>
                <p className="text-slate-400 text-xs">{detailError}</p>
                <button onClick={() => setSelectedId(null)} className="mt-2 text-xs text-slate-500 hover:text-slate-700">
                  Back to registry
                </button>
              </div>
            </div>
          ) : detail ? (
            <EntityDetailPanel
              detail={detail}
              onClose={() => setSelectedId(null)}
              onNavigateToNetwork={() => navigate("/network")}
              onSelectEntity={setSelectedId}
            />
          ) : null
        ) : (
          <EntityHintPanel />
        )}
      </div>
    </div>
  );
};

export default Entities;