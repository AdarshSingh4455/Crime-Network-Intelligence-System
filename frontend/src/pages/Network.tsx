import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ForceGraph2D, { ForceGraphMethods, NodeObject, LinkObject } from "react-force-graph-2d";
import { api } from "../api/client";
import { NetworkData, NetworkNode, NetworkLink, EntityType } from "../types";
import {
  Search, RefreshCw, Maximize2, Filter, X, Users, Phone, Car, MapPin,
  Building2, DollarSign, AlertTriangle, ChevronRight, Cpu, Share2,
  TrendingUp, Activity, Info, Shield, Circle, FileText, Lightbulb,
  Layers
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { EvidenceDrawer } from "../components/EvidenceDrawer";
import { useTheme } from "../context/ThemeContext";

// ─── Entity config ────────────────────────────────────────────────────────────
interface EntityCfg {
  color: string; border: string; bg: string; label: string; icon: LucideIcon;
}

const ENTITY_CONFIG: Record<string, EntityCfg> = {
  PERSON:   { color: "#E11D48", border: "#9F1239", bg: "#FFF1F2", label: "Person",   icon: Users      },
  PHONE:    { color: "#6366F1", border: "#4338CA", bg: "#EEF2FF", label: "Phone",    icon: Phone      },
  VEHICLE:  { color: "#D97706", border: "#92400E", bg: "#FFFBEB", label: "Vehicle",  icon: Car        },
  LOCATION: { color: "#059669", border: "#065F46", bg: "#ECFDF5", label: "Location", icon: MapPin     },
  ORG:      { color: "#2563EB", border: "#1E3A8A", bg: "#EFF6FF", label: "Org",      icon: Building2  },
  MONEY:    { color: "#7C3AED", border: "#4C1D95", bg: "#F5F3FF", label: "Money",    icon: DollarSign },
  UNKNOWN:  { color: "#6B7280", border: "#374151", bg: "#F9FAFB", label: "Unknown",  icon: Circle     },
};

const getEntityConfig = (type: string): EntityCfg =>
  ENTITY_CONFIG[type] ?? ENTITY_CONFIG["UNKNOWN"];

// ─── Force-graph extended node / link ─────────────────────────────────────────
type FGNode = NetworkNode & NodeObject;
type FGLink = NetworkLink & LinkObject<FGNode>;

const resolveId = (endpoint: string | FGNode | undefined): string => {
  if (!endpoint) return "";
  if (typeof endpoint === "string") return endpoint;
  return endpoint.id ?? "";
};

// ─── Network Component ────────────────────────────────────────────────────────
export const Network: React.FC = () => {
  const navigate = useNavigate();
  const graphRef = useRef<ForceGraphMethods<FGNode, FGLink>>(undefined!);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphDims, setGraphDims] = useState({ width: 800, height: 600 });
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const focusParam = searchParams.get("focus");
  const [selectedNode, setSelectedNode] = useState<FGNode | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [focusNeighbors, setFocusNeighbors] = useState<Set<string>>(new Set());
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [drawerEvidenceId, setDrawerEvidenceId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isLegendOpen) {
        setIsLegendOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLegendOpen]);

  const handleInspectRelationship = async (sourceId: string, targetId: string) => {
    try {
      const res = await api.getRelationshipEvidence(sourceId, targetId);
      if (res && res.item?.evidence_id) {
        setDrawerEvidenceId(res.item.evidence_id);
      }
    } catch (err) {
      console.error("Failed to load relationship evidence:", err);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const d = await api.getNetwork() as NetworkData;
      setNetworkData(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load network data");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setGraphDims({ width: r.width, height: r.height });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const filteredGraphData = useMemo(() => {
    if (!networkData) return { nodes: [] as FGNode[], links: [] as FGLink[] };
    let nodes = networkData.nodes as FGNode[];
    if (activeFilters.size > 0) nodes = nodes.filter(n => activeFilters.has(n.type));
    const nodeIds = new Set(nodes.map(n => n.id));
    const links = (networkData.links as FGLink[]).filter(
      l => nodeIds.has(resolveId(l.source)) && nodeIds.has(resolveId(l.target))
    );
    return { nodes, links };
  }, [networkData, activeFilters]);

  useEffect(() => {
    if (focusParam && networkData) {
      const match = networkData.nodes.find(n => n.id.toLowerCase() === focusParam.toLowerCase());
      if (match) {
        setSelectedNode(match as FGNode);
        setHighlightedNodeId(match.id);
        const timer = setTimeout(() => {
          const fgNode = filteredGraphData.nodes.find(n => n.id === match.id) as (FGNode & { x?: number; y?: number }) | undefined;
          if (fgNode?.x !== undefined && fgNode?.y !== undefined) {
            graphRef.current?.centerAt(fgNode.x, fgNode.y, 600);
            graphRef.current?.zoom(2.5, 600);
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [focusParam, networkData, filteredGraphData.nodes]);

  useEffect(() => {
    if (!focusMode || !selectedNode || !networkData) { setFocusNeighbors(new Set()); return; }
    const nb = new Set<string>([selectedNode.id ?? ""]);
    for (const link of networkData.links) {
      const s = resolveId(link.source as string | FGNode | undefined);
      const t = resolveId(link.target as string | FGNode | undefined);
      if (s === selectedNode.id) nb.add(t);
      if (t === selectedNode.id) nb.add(s);
    }
    setFocusNeighbors(nb);
  }, [focusMode, selectedNode, networkData]);

  const nodeCanvasObject = useCallback(
    (node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const cfg = getEntityConfig(node.type);
      const radius = Math.max(5, Math.min(16, 6 + (node.influence_score || 0) * 14));
      const nx = (node as FGNode & { x?: number }).x ?? 0;
      const ny = (node as FGNode & { y?: number }).y ?? 0;
      const isSelected = selectedNode?.id === node.id;
      const isHighlighted = highlightedNodeId === node.id;
      const isDimmed = focusMode && !focusNeighbors.has(node.id ?? "");
      ctx.save();
      ctx.globalAlpha = isDimmed ? 0.12 : 1;
      if (node.anomaly_count > 0 && !isDimmed) {
        ctx.beginPath(); ctx.arc(nx, ny, radius + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = "#F97316"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 2]); ctx.stroke(); ctx.setLineDash([]);
      }
      if (isSelected || isHighlighted) {
        ctx.beginPath(); ctx.arc(nx, ny, radius + (isSelected ? 5 : 3), 0, 2 * Math.PI);
        ctx.strokeStyle = isSelected ? (isDark ? "#38BDF8" : "#0F172A") : cfg.color; ctx.lineWidth = isSelected ? 2.5 : 1.5; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(nx, ny, radius, 0, 2 * Math.PI);
      ctx.fillStyle = cfg.color; ctx.fill(); ctx.strokeStyle = cfg.border; ctx.lineWidth = 1; ctx.stroke();
      if (node.is_bridge_node) {
        ctx.beginPath(); ctx.arc(nx, ny, radius * 0.32, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.fill();
      }
      if (node.is_key_player) {
        ctx.beginPath(); ctx.arc(nx, ny, radius + 2, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(255,215,0,0.9)"; ctx.lineWidth = 1.5; ctx.stroke();
      }
      const showLabel = globalScale > 1.2 || isSelected || isHighlighted;
      if (showLabel) {
        const label = (node.id ?? "").length > 16 ? (node.id ?? "").slice(0, 15) + "\u2026" : (node.id ?? "");
        const fontSize = Math.max(8, 10 / globalScale);
        ctx.font = `${isSelected ? 600 : 500} ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const textW = ctx.measureText(label).width; const pad = 3;
        ctx.fillStyle = isDark ? "rgba(15, 23, 42, 0.92)" : "rgba(255,255,255,0.88)";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(nx - textW / 2 - pad, ny + radius + 2, textW + pad * 2, fontSize + 4, 2);
        else ctx.rect(nx - textW / 2 - pad, ny + radius + 2, textW + pad * 2, fontSize + 4);
        ctx.fill();
        ctx.fillStyle = isSelected ? (isDark ? "#38BDF8" : "#0F172A") : (isDark ? "#F8FAFC" : "#334155");
        ctx.fillText(label, nx, ny + radius + fontSize / 2 + 4);
      }
      ctx.restore();
    },
    [selectedNode, highlightedNodeId, focusMode, focusNeighbors, isDark]
  );

  const linkColor = useCallback((link: FGLink): string => {
    if (!focusMode || focusNeighbors.size === 0) return isDark ? "rgba(100,116,139,0.45)" : "rgba(148,163,184,0.45)";
    const s = resolveId(link.source); const t = resolveId(link.target);
    return focusNeighbors.has(s) && focusNeighbors.has(t)
      ? (isDark ? "rgba(129,140,248,0.85)" : "rgba(99,102,241,0.7)")
      : (isDark ? "rgba(51,65,85,0.15)" : "rgba(148,163,184,0.07)");
  }, [focusMode, focusNeighbors, isDark]);

  const linkWidth = useCallback((link: FGLink): number => {
    const base = Math.max(1, Math.min(4, ((link as NetworkLink).weight || 1) * 0.8));
    if (!focusMode || focusNeighbors.size === 0) return base;
    const s = resolveId(link.source); const t = resolveId(link.target);
    return focusNeighbors.has(s) && focusNeighbors.has(t) ? base + 1 : base * 0.3;
  }, [focusMode, focusNeighbors]);

  const handleNodeClick = useCallback((node: FGNode) => {
    if (selectedNode?.id === node.id) { setSelectedNode(null); setFocusMode(false); }
    else {
      setSelectedNode(node);
      const nx = (node as FGNode & { x?: number }).x;
      const ny = (node as FGNode & { y?: number }).y;
      graphRef.current?.centerAt(nx, ny, 600);
      graphRef.current?.zoom(2.2, 600);
    }
  }, [selectedNode]);

  const handleSearch = useCallback(() => {
    if (!networkData || !searchQuery.trim()) { setHighlightedNodeId(null); return; }
    const q = searchQuery.trim().toLowerCase();
    const match = networkData.nodes.find(n => n.id.toLowerCase().includes(q));
    if (match) {
      setHighlightedNodeId(match.id);
      const fgNode = filteredGraphData.nodes.find(n => n.id === match.id) as (FGNode & { x?: number; y?: number }) | undefined;
      if (fgNode?.x !== undefined) {
        graphRef.current?.centerAt(fgNode.x, fgNode.y, 600);
        graphRef.current?.zoom(2.8, 600);
      }
    } else setHighlightedNodeId(null);
  }, [networkData, searchQuery, filteredGraphData.nodes]);

  const handleFitToScreen = useCallback(() => graphRef.current?.zoomToFit(400, 40), []);
  const toggleFilter = useCallback((type: string) => setActiveFilters(prev => {
    const n = new Set(prev); if (n.has(type)) n.delete(type); else n.add(type); return n;
  }), []);
  const clearFilters = useCallback(() => setActiveFilters(new Set()), []);

  useEffect(() => {
    if (graphRef.current) {
      // Repulsion force: strong enough to naturally scatter 15 nodes with 52 relationships
      const charge = graphRef.current.d3Force("charge");
      if (charge && typeof charge.strength === "function") {
        charge.strength(-550);
      }

      // Link resting distance: increased from default 30px to 120px to prevent central clumping
      const linkForce = graphRef.current.d3Force("link");
      if (linkForce && typeof linkForce.distance === "function") {
        linkForce.distance(120);
      }

      // Center force with moderate strength for bounded canvas centering
      const center = graphRef.current.d3Force("center");
      if (center && typeof center.strength === "function") {
        center.strength(0.08);
      }
    }
  }, [filteredGraphData]);

  const connectedEntities = useMemo(() => {
    if (!selectedNode || !networkData) return [] as Array<{ id: string; type: string; weight: number }>;
    return networkData.links
      .filter(l => resolveId(l.source as string | FGNode) === selectedNode.id || resolveId(l.target as string | FGNode) === selectedNode.id)
      .map(l => {
        const otherId = resolveId(l.source as string | FGNode) === selectedNode.id
          ? resolveId(l.target as string | FGNode)
          : resolveId(l.source as string | FGNode);
        const other = networkData.nodes.find(n => n.id === otherId);
        return { id: otherId, type: other?.type ?? "UNKNOWN", weight: l.weight };
      })
      .sort((a, b) => b.weight - a.weight);
  }, [selectedNode, networkData]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center h-full bg-[#F8FAFC]">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-600 font-medium">Loading Network Intelligence…</p>
        <p className="text-slate-400 text-sm">Fetching graph from Python engine</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex-1 flex items-center justify-center h-full bg-[#F8FAFC]">
      <div className="text-center space-y-4 max-w-md">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <p className="text-slate-800 font-semibold text-lg">Network load failed</p>
        <p className="text-slate-500 text-sm">{error}</p>
        <button onClick={loadData} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 transition-colors">Retry</button>
      </div>
    </div>
  );

  if (!networkData) return null;
  const { summary } = networkData;
  const entityTypes = Object.keys(ENTITY_CONFIG).filter(t => t !== "UNKNOWN");

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 flex-shrink-0 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Share2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Network Investigation</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Interactive link-analysis graph · Real-time entity relationship mapping</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button onClick={handleFitToScreen} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Maximize2 className="w-3.5 h-3.5" /> Fit to Screen
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 flex-shrink-0 transition-colors">
        <div className="flex items-center gap-6 text-sm flex-wrap">
          <StatChip icon={<Cpu className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />} label="Nodes" value={summary.num_nodes} color={isDark ? "text-slate-100" : "text-slate-800"} />
          <StatChip icon={<Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />} label="Relationships" value={summary.num_edges} color={isDark ? "text-slate-100" : "text-slate-800"} />
          <StatChip icon={<Activity className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />} label="Density" value={summary.density.toFixed(4)} color={isDark ? "text-slate-100" : "text-slate-800"} />
          <StatChip icon={<TrendingUp className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />} label="Communities" value={networkData.communities.length} color={isDark ? "text-slate-100" : "text-slate-800"} />
          <StatChip icon={<Shield className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />} label="Bridge Nodes" value={networkData.nodes.filter(n => n.is_bridge_node).length} color={isDark ? "text-slate-100" : "text-slate-800"} />
          <StatChip icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />} label="Anomaly Flags" value={networkData.nodes.filter(n => n.anomaly_count > 0).length} color="text-amber-600 dark:text-amber-400" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 flex-shrink-0 transition-colors">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            <div className="flex items-center gap-1.5 flex-wrap">
              {entityTypes.map(type => {
                const cfg = getEntityConfig(type);
                const Icon = cfg.icon;
                const active = activeFilters.has(type);
                const count = networkData.nodes.filter(n => n.type === type).length;
                if (count === 0) return null;
                return (
                  <button key={type} onClick={() => toggleFilter(type)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${active ? "text-white border-transparent" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"}`}
                    style={active ? { backgroundColor: cfg.color, borderColor: cfg.border } : {}}>
                    <Icon className="w-3 h-3" />
                    {cfg.label}
                    <span className={`ml-0.5 ${active ? "text-white/80" : "text-slate-400 dark:text-slate-500"}`}>{count}</span>
                  </button>
                );
              })}
              {activeFilters.size > 0 && (
                <button onClick={clearFilters} className="flex items-center gap-1 px-2 py-1 text-xs text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors">
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Search entity…"
                className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 w-44" />
            </div>
            <button onClick={handleSearch} className="px-3 py-1.5 text-sm bg-slate-800 dark:bg-cyan-700 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-cyan-600 transition-colors font-medium">Find</button>
            {highlightedNodeId && (
              <button onClick={() => { setHighlightedNodeId(null); setSearchQuery(""); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Graph + Panel */}
      <div className="flex flex-1 overflow-hidden">
        <div ref={containerRef} className="flex-1 relative overflow-hidden bg-slate-50 dark:bg-[#0B0F19] transition-colors">
          {focusMode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-indigo-600 text-white text-xs font-medium px-4 py-1.5 rounded-full shadow-lg">
              <Info className="w-3.5 h-3.5" />
              Focus mode — ego network for&nbsp;<span className="font-bold">{selectedNode?.id}</span>
              <button onClick={() => setFocusMode(false)} className="ml-2 hover:text-indigo-200"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
          <ForceGraph2D<FGNode, FGLink>
            ref={graphRef}
            width={graphDims.width}
            height={graphDims.height}
            graphData={filteredGraphData}
            nodeId="id"
            nodeCanvasObject={nodeCanvasObject}
            nodeCanvasObjectMode={() => "replace"}
            nodePointerAreaPaint={(node, color, ctx) => {
              const nx2 = (node as FGNode & { x?: number }).x ?? 0;
              const ny2 = (node as FGNode & { y?: number }).y ?? 0;
              const r2 = Math.max(5, Math.min(16, 6 + (node.influence_score || 0) * 14));
              ctx.fillStyle = color; ctx.beginPath(); ctx.arc(nx2, ny2, r2 + 6, 0, 2 * Math.PI); ctx.fill();
            }}
            linkColor={linkColor as (link: object) => string}
            linkWidth={linkWidth as (link: object) => number}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={(link: object) => {
              const l = link as FGLink;
              if (!focusMode || focusNeighbors.size === 0) return 1.5;
              const s = resolveId(l.source); const t = resolveId(l.target);
              return focusNeighbors.has(s) && focusNeighbors.has(t) ? 2.5 : 0;
            }}
            linkDirectionalParticleColor={() => (isDark ? "#818CF8" : "#6366F1")}
            onNodeClick={handleNodeClick}
            onLinkClick={(link: FGLink) => {
              if (link.evidence_id) {
                setDrawerEvidenceId(link.evidence_id);
              } else {
                const s = resolveId(link.source);
                const t = resolveId(link.target);
                if (s && t) handleInspectRelationship(s, t);
              }
            }}
            onBackgroundClick={() => { setSelectedNode(null); setFocusMode(false); }}
            cooldownTicks={120}
            d3VelocityDecay={0.35}
            onEngineStop={() => {
              if (graphRef.current && !selectedNode && !focusParam) {
                graphRef.current.zoomToFit(400, 45);
              }
            }}
            backgroundColor={isDark ? "#0B0F19" : "#F8FAFC"}
          />
          {/* Spatial layout disclaimer badge */}
          <div className="absolute top-3 right-4 z-10 pointer-events-none">
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 shadow-2xs">
              Node positions are visualization layout only and do not represent geographic location.
            </span>
          </div>

          {/* Fix 01: Collapsible Network Graph Legend Drawer */}
          <div className="absolute bottom-4 left-4 z-20">
            {!isLegendOpen ? (
              <button
                type="button"
                onClick={() => setIsLegendOpen(true)}
                aria-expanded="false"
                aria-controls="network-graph-legend"
                aria-label="Open network graph legend"
                title="Expand graph legend"
                className="flex items-center gap-2 px-3 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl shadow-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
              >
                <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="font-semibold">Legend</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700">
                  {entityTypes.filter(type => networkData.nodes.some(n => n.type === type)).length}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <div
                id="network-graph-legend"
                role="region"
                aria-label="Network Graph Legend"
                className="w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 text-xs transition-all animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">Graph Legend</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLegendOpen(false)}
                    aria-label="Close graph legend"
                    title="Collapse legend"
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {entityTypes.map(type => {
                    const cfg = getEntityConfig(type);
                    const count = networkData.nodes.filter(n => n.type === type).length;
                    if (count === 0) return null;
                    return (
                      <div key={type} className="flex items-center gap-2 py-0.5">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{cfg.label}</span>
                        <span className="text-slate-400 dark:text-slate-500 font-mono ml-auto pl-3 text-[11px]">{count}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-yellow-400 flex-shrink-0" />
                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">Key Player (Gold border)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-orange-400 border-dashed bg-slate-300 dark:bg-slate-700 flex-shrink-0" />
                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">Anomaly Flag (Dashed border)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-600 flex-shrink-0 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">Bridge Node (White center)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedNode ? (
          <EntityDetailPanel
            node={selectedNode}
            connectedEntities={connectedEntities}
            focusMode={focusMode}
            onEnterFocus={() => setFocusMode(true)}
            onExitFocus={() => setFocusMode(false)}
            onClose={() => { setSelectedNode(null); setFocusMode(false); }}
            onSelectEntity={(id: string) => {
              const n = filteredGraphData.nodes.find(x => x.id === id);
              if (n) handleNodeClick(n);
            }}
            onNavigateToEntity={(id: string) => navigate(`/entities?id=${encodeURIComponent(id)}`)}
            onInspectCentrality={() => {
              if (selectedNode.evidence_id) setDrawerEvidenceId(selectedNode.evidence_id);
            }}
            onInspectRelationship={(targetId: string) => {
              if (selectedNode.id) handleInspectRelationship(selectedNode.id, targetId);
            }}
          />
        ) : (
          <GraphHintPanel nodeCount={summary.num_nodes} edgeCount={summary.num_edges} />
        )}
      </div>

      {/* Evidence & Provenance Trace Drawer */}
      <EvidenceDrawer
        evidenceId={drawerEvidenceId}
        onClose={() => setDrawerEvidenceId(null)}
      />
    </div>
  );
};

// ─── StatChip ─────────────────────────────────────────────────────────────────
interface StatChipProps { icon: React.ReactNode; label: string; value: number | string; color?: string; }
const StatChip: React.FC<StatChipProps> = ({ icon, label, value, color = "text-slate-800" }) => (
  <div className="flex items-center gap-1.5">{icon}<span className="text-slate-500 dark:text-slate-400">{label}:</span><span className={`font-bold ${color}`}>{value}</span></div>
);

// ─── GraphHintPanel ───────────────────────────────────────────────────────────
interface GraphHintPanelProps { nodeCount: number; edgeCount: number; }
const GraphHintPanel: React.FC<GraphHintPanelProps> = ({ nodeCount, edgeCount }) => (
  <div className="w-72 flex-shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center transition-colors">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
      <Share2 className="w-7 h-7 text-slate-400 dark:text-slate-500" />
    </div>
    <p className="text-slate-700 dark:text-slate-200 font-semibold mb-1">Select an Entity</p>
    <p className="text-slate-400 dark:text-slate-400 text-sm leading-relaxed">Click any node in the graph to view entity details, centrality metrics, and connected entities.</p>
    <div className="mt-6 w-full space-y-2">
      <div className="flex justify-between text-sm px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-transparent dark:border-slate-700/50"><span className="text-slate-500 dark:text-slate-400">Total Entities</span><span className="font-bold text-slate-800 dark:text-slate-200">{nodeCount}</span></div>
      <div className="flex justify-between text-sm px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-transparent dark:border-slate-700/50"><span className="text-slate-500 dark:text-slate-400">Relationships</span><span className="font-bold text-slate-800 dark:text-slate-200">{edgeCount}</span></div>
    </div>
  </div>
);

// ─── EntityDetailPanel ────────────────────────────────────────────────────────
interface DetailPanelProps {
  node: FGNode;
  connectedEntities: Array<{ id: string; type: string; weight: number }>;
  focusMode: boolean;
  onEnterFocus: () => void;
  onExitFocus: () => void;
  onClose: () => void;
  onSelectEntity: (id: string) => void;
  onNavigateToEntity: (id: string) => void;
  onInspectCentrality?: () => void;
  onInspectRelationship?: (targetId: string) => void;
}

const EntityDetailPanel: React.FC<DetailPanelProps> = ({
  node,
  connectedEntities,
  focusMode,
  onEnterFocus,
  onExitFocus,
  onClose,
  onSelectEntity,
  onNavigateToEntity,
  onInspectCentrality,
  onInspectRelationship,
}) => {
  const navigate = useNavigate();
  const cfg = getEntityConfig(node.type);
  const Icon = cfg.icon;
  const metrics: Array<{ label: string; value: string; desc: string }> = [
    { label: "Degree Centrality", value: node.degree.toFixed(4), desc: "Normalized connections" },
    { label: "Betweenness", value: node.betweenness.toFixed(4), desc: "Bridge control score" },
    { label: "Eigenvector", value: node.eigenvector.toFixed(4), desc: "Influential neighbor weight" },
    { label: "PageRank", value: node.pagerank.toFixed(4), desc: "Network importance" },
    { label: "Influence Score", value: node.influence_score.toFixed(4), desc: "Composite ranking" },
  ];
  return (
    <div className="w-80 flex-shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden transition-colors">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg.bg }}>
            <Icon className="w-5 h-5" style={{ color: cfg.color }} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: cfg.color }}>{cfg.label}</p>
            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate" title={node.id ?? ""}>{node.id}</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close entity detail panel" className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded flex-shrink-0 transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5 flex-shrink-0">
        <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: cfg.color }}>Community {node.community}</span>
        {node.is_key_player && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">&#9733; Key Player</span>}
        {node.is_bridge_node && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">Bridge Node</span>}
        {node.anomaly_count > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />{node.anomaly_count} Anomal{node.anomaly_count === 1 ? "y" : "ies"}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Centrality Metrics</p>
          <div className="space-y-2.5">
            {metrics.map(m => (
              <div key={m.label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-600 dark:text-slate-300">{m.label}</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">{m.value}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, parseFloat(m.value) * 100 * 3)}%`, backgroundColor: cfg.color, opacity: 0.75 }} />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{m.desc}</p>
              </div>
            ))}
          </div>
          {node.evidence_id && onInspectCentrality && (
            <button
              onClick={onInspectCentrality}
              className="mt-3 w-full py-1.5 px-2 text-xs font-medium border border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 bg-cyan-50/50 dark:bg-cyan-950/40 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Inspect Metric Evidence Trace
            </button>
          )}
          <button
            onClick={() => navigate(`/explainability?q=${encodeURIComponent(node.id ?? "")}`)}
            className="mt-2 w-full py-1.5 px-2 text-xs font-medium border border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 bg-cyan-50/70 dark:bg-cyan-950/40 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
            Explain Intelligence Derivation
          </button>
        </div>
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0 space-y-2">
          {focusMode ? (
            <button onClick={onExitFocus} className="w-full py-2 text-sm font-medium border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center gap-2">
              <X className="w-3.5 h-3.5" /> Exit Focus Mode
            </button>
          ) : (
            <button onClick={onEnterFocus} className="w-full py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
              <Maximize2 className="w-3.5 h-3.5" /> Focus Ego Network
            </button>
          )}
          <button
            onClick={() => onNavigateToEntity(node.id ?? "")}
            className="w-full py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
          >
            <Users className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> Inspect in Entity Explorer
          </button>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Connected Entities <span className="ml-1.5 text-slate-400 dark:text-slate-500 font-normal normal-case">({connectedEntities.length})</span></p>
          {connectedEntities.length === 0 ? <p className="text-xs text-slate-400 italic">No connections visible</p> : (
            <div className="space-y-1.5">
              {connectedEntities.map(conn => {
                const connCfg = getEntityConfig(conn.type);
                const ConnIcon = connCfg.icon;
                return (
                  <div key={conn.id} className="flex items-center gap-1 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group">
                    <button
                      onClick={() => onSelectEntity(conn.id)}
                      className="flex items-center gap-2.5 flex-1 min-w-0 p-1 text-left cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: connCfg.bg }}>
                        <ConnIcon className="w-3.5 h-3.5" style={{ color: connCfg.color }} />
                      </div>
                      <span className="text-xs text-slate-700 dark:text-slate-200 flex-1 truncate font-medium">{conn.id}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">w={conn.weight.toFixed(1)}</span>
                    </button>
                    {onInspectRelationship && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectRelationship(conn.id);
                        }}
                        title="Why are these entities connected? Inspect relationship evidence"
                        className="px-1.5 py-1 text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 rounded text-[11px] font-medium flex items-center gap-0.5 cursor-pointer transition-colors"
                      >
                        <FileText className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                        <span>Why?</span>
                      </button>
                    )}
                    <button onClick={() => onSelectEntity(conn.id)} className="p-1 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 cursor-pointer">
                      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Network;
