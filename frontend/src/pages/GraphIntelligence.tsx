import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import {
  GraphOverview,
  GraphNeighborhood,
  GraphPath,
  BridgeAnalysis,
  CommunityAnalysis,
  GraphCentralityComparison,
  CentralityComparisonRow,
  MotifAnalysis,
  StructuralMotif,
  GraphComparison,
} from "../types";
import { GraphIntelligenceDrawer } from "../components/GraphIntelligenceDrawer";
import {
  Share2,
  Route,
  GitFork,
  Layers,
  BarChart3,
  Sparkles,
  Shield,
  Search,
  RefreshCw,
  ChevronRight,
  ArrowRight,
  ExternalLink,
  Info,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

type ActiveTab =
  | "topology"
  | "neighborhood"
  | "paths"
  | "bridges"
  | "communities"
  | "centrality"
  | "motifs";

export const GraphIntelligence: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    (searchParams.get("tab") as ActiveTab) || "topology"
  );

  // Global Loading / Error
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Core Data States
  const [overview, setOverview] = useState<GraphOverview | null>(null);
  const [bridges, setBridges] = useState<BridgeAnalysis | null>(null);
  const [communities, setCommunities] = useState<CommunityAnalysis | null>(null);
  const [centrality, setCentrality] = useState<GraphCentralityComparison | null>(null);
  const [motifs, setMotifs] = useState<MotifAnalysis | null>(null);

  // Neighborhood Tab State
  const [selectedEntityForNeighborhood, setSelectedEntityForNeighborhood] = useState<string>("Ravi Malhotra");
  const [neighborhoodData, setNeighborhoodData] = useState<GraphNeighborhood | null>(null);
  const [neighborhoodLoading, setNeighborhoodLoading] = useState<boolean>(false);

  // Paths Tab State
  const [pathSource, setPathSource] = useState<string>("Ravi Malhotra");
  const [pathTarget, setPathTarget] = useState<string>("Vikram Rao");
  const [pathData, setPathData] = useState<GraphPath | null>(null);
  const [pathLoading, setPathLoading] = useState<boolean>(false);

  // Communities Tab State
  const [selectedCommunityId, setSelectedCommunityId] = useState<number>(0);

  // Motifs Tab State
  const [motifFilter, setMotifFilter] = useState<string>("ALL");

  // Comparison State
  const [compareEntityA, setCompareEntityA] = useState<string>("Ravi Malhotra");
  const [compareEntityB, setCompareEntityB] = useState<string>("Amit Patel");
  const [comparisonData, setComparisonData] = useState<GraphComparison | null>(null);
  const [compareLoading, setCompareLoading] = useState<boolean>(false);

  // Centrality Table Filter & Sort
  const [centralitySearch, setCentralitySearch] = useState<string>("");
  const [centralitySortCol, setCentralitySortCol] = useState<keyof CentralityComparisonRow>("composite_rank");
  const [centralitySortAsc, setCentralitySortAsc] = useState<boolean>(true);

  // Drawer States
  const [drawerNeighborhood, setDrawerNeighborhood] = useState<GraphNeighborhood | null>(null);
  const [drawerPath, setDrawerPath] = useState<GraphPath | null>(null);
  const [drawerMotif, setDrawerMotif] = useState<StructuralMotif | null>(null);
  const [drawerBridgeNode, setDrawerBridgeNode] = useState<string | null>(null);
  const [drawerComparison, setDrawerComparison] = useState<GraphComparison | null>(null);

  // Available Entities list for dropdowns
  const entityOptions = centrality?.rankings.map((r) => r.node) || [
    "Ravi Malhotra",
    "Vikram Rao",
    "Amit Patel",
    "Priya Sharma",
    "Sunil Verma",
    "Anil Kapoor",
    "Rajesh Gupta",
    "Sneha Reddy",
    "Deepak Chopra",
    "Kavita Krishnan",
  ];

  // Initial Load
  const fetchAllInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ov, br, comm, cent, mot] = await Promise.all([
        api.getGraphOverview(),
        api.getBridgeAnalysis(),
        api.getCommunityAnalysis(),
        api.getCentralityComparison(),
        api.getGraphMotifs(),
      ]);
      setOverview(ov);
      setBridges(br);
      setCommunities(comm);
      setCentrality(cent);
      setMotifs(mot);
    } catch (err: any) {
      console.error("Failed to load graph intelligence data:", err);
      setError(err.message || "Failed to load graph intelligence data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllInitialData();
  }, []);

  // Fetch Neighborhood
  const fetchNeighborhood = async (entity: string) => {
    if (!entity) return;
    try {
      setNeighborhoodLoading(true);
      const data = await api.getGraphNeighborhood(entity);
      setNeighborhoodData(data);
    } catch (err) {
      console.error("Failed to load neighborhood:", err);
    } finally {
      setNeighborhoodLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "neighborhood" && selectedEntityForNeighborhood) {
      fetchNeighborhood(selectedEntityForNeighborhood);
    }
  }, [activeTab, selectedEntityForNeighborhood]);

  // Fetch Path
  const fetchPath = async (src: string, tgt: string) => {
    if (!src || !tgt) return;
    try {
      setPathLoading(true);
      const data = await api.getGraphPath(src, tgt);
      setPathData(data);
    } catch (err) {
      console.error("Failed to load path:", err);
    } finally {
      setPathLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "paths" && pathSource && pathTarget) {
      fetchPath(pathSource, pathTarget);
    }
  }, [activeTab, pathSource, pathTarget]);

  // Fetch Comparison
  const fetchComparison = async (a: string, b: string) => {
    if (!a || !b) return;
    try {
      setCompareLoading(true);
      const data = await api.compareEntities(a, b);
      setComparisonData(data);
    } catch (err) {
      console.error("Failed to compare entities:", err);
    } finally {
      setCompareLoading(false);
    }
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleInspectEntityNeighborhood = (entity: string) => {
    setSelectedEntityForNeighborhood(entity);
    handleTabChange("neighborhood");
    fetchNeighborhood(entity);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600 font-mono">
          Compiling Phase 3K Advanced Graph Intelligence Topology...
        </p>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-12 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
        <h2 className="text-lg font-bold text-rose-900">Graph Intelligence Unavailable</h2>
        <p className="text-sm text-rose-700">{error || "Could not retrieve graph intelligence data."}</p>
        <button
          onClick={fetchAllInitialData}
          className="px-4 py-2 bg-rose-600 text-white font-medium text-xs rounded-lg hover:bg-rose-700 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Header & Phase Banner ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-mono font-bold rounded">
              PHASE 3K
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
              Deterministic Structural Graph Engine
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Share2 className="w-7 h-7 text-indigo-600" />
            Advanced Graph Intelligence
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Multi-hop relational shortest paths, 1-hop and 2-hop neighborhoods, bridge vs. articulation point
            analysis, community internal/external boundary accounting, and multi-metric centrality comparison.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchAllInitialData}
            className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Topology
          </button>
        </div>
      </div>

      {/* ─── Epistemic Guardrail Notice ────────────────────────────────────── */}
      <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-lg flex items-start gap-3 text-xs text-amber-900">
        <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Investigative Non-Inference Guardrail: </span>
          All graph metrics reflect purely topological properties of recorded co-occurrences in source documents.
          High recorded connectivity, structural bridges, or community clustering do NOT infer criminal guilt,
          conspiracy, or culpable coordination.
        </div>
      </div>

      {/* ─── Metric Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold block">Nodes</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{overview.total_nodes}</p>
          <span className="text-[10px] text-emerald-600 font-mono font-medium">100% Resolved</span>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold block">Edges</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{overview.total_edges}</p>
          <span className="text-[10px] text-slate-500 font-mono">Recorded co-occurrences</span>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold block">Graph Density</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{overview.density.toFixed(3)}</p>
          <span className="text-[10px] text-indigo-600 font-mono font-medium">Dense Connectivity</span>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold block">Diameter</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{overview.diameter}</p>
          <span className="text-[10px] text-slate-500 font-mono">Max shortest path hops</span>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold block">Avg Path Length</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{overview.average_shortest_path_length.toFixed(2)}</p>
          <span className="text-[10px] text-slate-500 font-mono">Hops between nodes</span>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold block">Transitivity</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{overview.transitivity.toFixed(3)}</p>
          <span className="text-[10px] text-slate-500 font-mono">Clustering coefficient</span>
        </div>
      </div>

      {/* ─── Navigation Sub-Tabs ─────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto">
        {[
          { id: "topology", label: "Global Topology", icon: Share2 },
          { id: "neighborhood", label: "Neighborhood Inspector", icon: Layers },
          { id: "paths", label: "Relational Shortest Paths", icon: Route },
          { id: "bridges", label: "Bridges vs Articulations", icon: GitFork },
          { id: "communities", label: "Community Boundaries", icon: Sparkles },
          { id: "centrality", label: "Centrality Matrix", icon: BarChart3 },
          { id: "motifs", label: "Motifs & Comparison", icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-indigo-600 text-indigo-700 bg-indigo-50/50"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: Global Topology ───────────────────────────────────────── */}
      {activeTab === "topology" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Top by Degree */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                <span>Top Degree</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Edges</span>
              </h3>
              <div className="space-y-2">
                {overview.top_by_degree.map((item, idx) => (
                  <div
                    key={item.node}
                    className="flex items-center justify-between text-xs p-2 rounded bg-slate-50/70 hover:bg-indigo-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded-full font-mono text-[10px] font-bold text-slate-700">
                        {idx + 1}
                      </span>
                      <button
                        onClick={() => handleInspectEntityNeighborhood(item.node)}
                        className="font-medium text-slate-900 hover:text-indigo-600 text-left"
                      >
                        {item.node}
                      </button>
                    </div>
                    <span className="font-mono font-bold text-slate-700">{item.degree}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top by Betweenness */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                <span>Top Betweenness</span>
                <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">Routing</span>
              </h3>
              <div className="space-y-2">
                {overview.top_by_betweenness.map((item, idx) => (
                  <div
                    key={item.node}
                    className="flex items-center justify-between text-xs p-2 rounded bg-slate-50/70 hover:bg-amber-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded-full font-mono text-[10px] font-bold text-slate-700">
                        {idx + 1}
                      </span>
                      <button
                        onClick={() => handleInspectEntityNeighborhood(item.node)}
                        className="font-medium text-slate-900 hover:text-indigo-600 text-left"
                      >
                        {item.node}
                      </button>
                    </div>
                    <span className="font-mono font-bold text-amber-700">{item.betweenness.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top by Closeness */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                <span>Top Closeness</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">Proximity</span>
              </h3>
              <div className="space-y-2">
                {overview.top_by_closeness.map((item, idx) => (
                  <div
                    key={item.node}
                    className="flex items-center justify-between text-xs p-2 rounded bg-slate-50/70 hover:bg-emerald-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded-full font-mono text-[10px] font-bold text-slate-700">
                        {idx + 1}
                      </span>
                      <button
                        onClick={() => handleInspectEntityNeighborhood(item.node)}
                        className="font-medium text-slate-900 hover:text-indigo-600 text-left"
                      >
                        {item.node}
                      </button>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">{item.closeness.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top by PageRank */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                <span>Top PageRank</span>
                <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">Prominence</span>
              </h3>
              <div className="space-y-2">
                {overview.top_by_pagerank.map((item, idx) => (
                  <div
                    key={item.node}
                    className="flex items-center justify-between text-xs p-2 rounded bg-slate-50/70 hover:bg-purple-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded-full font-mono text-[10px] font-bold text-slate-700">
                        {idx + 1}
                      </span>
                      <button
                        onClick={() => handleInspectEntityNeighborhood(item.node)}
                        className="font-medium text-slate-900 hover:text-indigo-600 text-left"
                      >
                        {item.node}
                      </button>
                    </div>
                    <span className="font-mono font-bold text-purple-700">{item.pagerank.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-900 block mb-1">Graph Connectivity Architecture:</span>
            The network forms a single connected component ({overview.number_connected_components} component, is_connected: {String(overview.is_connected)}) with a topological diameter of {overview.diameter} hops.
            Every entity can reach any other entity across an average shortest distance of {overview.average_shortest_path_length.toFixed(2)} hops.
          </div>
        </div>
      )}

      {/* ─── TAB 2: Neighborhood Inspector ─────────────────────────────────── */}
      {activeTab === "neighborhood" && (
        <div className="space-y-6">
          <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <label htmlFor="entity-select" className="text-xs font-bold text-slate-700 uppercase font-mono">
                Center Entity:
              </label>
              <select
                id="entity-select"
                value={selectedEntityForNeighborhood}
                onChange={(e) => setSelectedEntityForNeighborhood(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {entityOptions.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            {neighborhoodData && (
              <button
                onClick={() => setDrawerNeighborhood(neighborhoodData)}
                className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Detailed Inspector
              </button>
            )}
          </div>

          {neighborhoodLoading ? (
            <div className="py-12 text-center text-slate-500 text-xs font-mono">
              Loading topological neighborhood...
            </div>
          ) : neighborhoodData ? (
            <div className="space-y-6">
              {/* 1-Hop Direct Neighbors */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      1-Hop Direct Neighbors ({neighborhoodData.one_hop_count})
                    </h3>
                    <p className="text-xs text-slate-500">Documented direct relationships in source records</p>
                  </div>
                  <span className="text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded font-semibold">
                    Direct Adjacency
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {neighborhoodData.one_hop_neighbors.map((nb) => (
                    <div
                      key={nb.node}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setSelectedEntityForNeighborhood(nb.node)}
                          className="font-bold text-xs text-slate-900 hover:text-indigo-600 text-left"
                        >
                          {nb.node}
                        </button>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">
                          {nb.connecting_edge_type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Records: {nb.record_ids.join(", ")}</span>
                        <span className="font-mono">{nb.evidence_count} evidence</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2-Hop Distance Neighbors */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      2-Hop Distance Neighbors ({neighborhoodData.two_hop_count})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Indirect topological connections via recorded intermediary nodes
                    </p>
                  </div>
                  <span className="text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded font-semibold">
                    Indirect Reach
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {neighborhoodData.two_hop_neighbors.map((nb) => (
                    <div
                      key={nb.node}
                      className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setSelectedEntityForNeighborhood(nb.node)}
                          className="font-bold text-xs text-slate-900 hover:text-indigo-600 text-left"
                        >
                          {nb.node}
                        </button>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                          via {nb.via_nodes.slice(0, 2).join(", ")}
                          {nb.via_nodes.length > 2 ? ` +${nb.via_nodes.length - 2}` : ""}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Connected through {nb.via_nodes.length} distinct 1-hop path intermediaries
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ─── TAB 3: Relational Shortest Paths ──────────────────────────────── */}
      {activeTab === "paths" && (
        <div className="space-y-6">
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <label htmlFor="source-entity-select" className="text-xs font-bold text-slate-700 uppercase font-mono block mb-1">
                  Source Entity:
                </label>
                <select
                  id="source-entity-select"
                  value={pathSource}
                  onChange={(e) => setPathSource(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {entityOptions.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>

              <div className="self-center mt-4">
                <ArrowRight className="w-5 h-5 text-indigo-500" />
              </div>

              <div className="flex-1 w-full">
                <label htmlFor="target-entity-select" className="text-xs font-bold text-slate-700 uppercase font-mono block mb-1">
                  Target Entity:
                </label>
                <select
                  id="target-entity-select"
                  value={pathTarget}
                  onChange={(e) => setPathTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {entityOptions.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>

              <div className="self-end mt-4">
                <button
                  onClick={() => fetchPath(pathSource, pathTarget)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-2xs"
                >
                  Trace Path
                </button>
              </div>
            </div>
          </div>

          {pathLoading ? (
            <div className="py-12 text-center text-slate-500 text-xs font-mono">
              Tracing relational shortest path...
            </div>
          ) : pathData ? (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Route className="w-5 h-5 text-indigo-600" />
                    Shortest Relational Traversal: {pathData.hop_count} Hop(s)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Deterministic unweighted shortest path with recorded evidence linkage
                  </p>
                </div>
                <button
                  onClick={() => setDrawerPath(pathData)}
                  className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 flex items-center gap-1.5 shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Inspect Path Evidence
                </button>
              </div>

              {/* Traversal Pipeline Visualizer */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 overflow-x-auto">
                {pathData.path_nodes.map((node, idx) => (
                  <React.Fragment key={node}>
                    <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-2xs font-mono text-xs font-bold text-slate-900 shrink-0">
                      {node}
                    </div>
                    {idx < pathData.path_nodes.length - 1 && (
                      <div className="flex items-center gap-1 text-slate-400 shrink-0">
                        <ArrowRight className="w-4 h-4 text-indigo-600" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Hops Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-600">
                  Step-by-Step Relational Hops
                </h4>
                <div className="space-y-2">
                  {pathData.hops.map((hop) => (
                    <div
                      key={hop.step_index}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 flex items-center justify-center bg-indigo-100 text-indigo-800 rounded font-mono text-xs font-bold">
                          {hop.step_index + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 font-semibold text-xs text-slate-900">
                            <span>{hop.source_node}</span>
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-mono">
                              {hop.relationship_type}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            <span>{hop.target_node}</span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Source records: {hop.record_ids.join(", ")} | Weight: {hop.weight.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start md:self-auto">
                        <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                          {hop.evidence_ids.length} Evidence Link(s)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ─── TAB 4: Bridges vs Articulations ──────────────────────────────── */}
      {activeTab === "bridges" && bridges && (
        <div className="space-y-6">
          {/* Mathematical Distinction Notice */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 space-y-2">
            <h3 className="font-bold text-indigo-900 flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-indigo-700" />
              Mathematical Clarification: Bridge vs. Articulation Point
            </h3>
            <p className="leading-relaxed">{bridges.distinction_explanation}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Betweenness Bridges */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Structural Bridge Nodes ({bridges.total_bridges_betweenness})
                  </h3>
                  <p className="text-xs text-slate-500">Nodes with high betweenness centrality routing score</p>
                </div>
                <span className="text-xs font-mono bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                  Betweenness &gt; 0.05
                </span>
              </div>

              <div className="space-y-2.5">
                {bridges.betweenness_bridges.map((bridge) => (
                  <div
                    key={bridge.node}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-amber-300 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <button
                        onClick={() => {
                          setDrawerBridgeNode(bridge.node);
                        }}
                        className="font-bold text-xs text-slate-900 hover:text-indigo-600 text-left"
                      >
                        {bridge.node}
                      </button>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Connected communities: {bridge.connected_communities.map((c) => `C${c}`).join(", ")}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-amber-700 text-xs block">
                        {bridge.betweenness_score.toFixed(4)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Routing Score</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Articulation Points */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Articulation Points ({bridges.total_articulation_points})
                  </h3>
                  <p className="text-xs text-slate-500">Single vertices whose removal disconnects the graph</p>
                </div>
                <span className="text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-semibold">
                  Graph Cut Points
                </span>
              </div>

              {bridges.articulation_points.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-800">Graph is Biconnected</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Zero single-vertex cut points exist in the observed network. Every node is protected by
                    redundant co-occurrence paths. Removing any single node leaves the network connected.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bridges.articulation_points.map((node) => (
                    <div key={node} className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-mono">
                      {node}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: Community Boundaries ──────────────────────────────────── */}
      {activeTab === "communities" && communities && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {communities.communities.map((comm) => (
              <div
                key={comm.community_id}
                onClick={() => setSelectedCommunityId(comm.community_id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedCommunityId === comm.community_id
                    ? "bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-200"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-mono text-xs font-bold">
                    Community C{comm.community_id}
                  </span>
                  <span className="text-xs font-mono text-slate-500">{comm.member_count} Members</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mt-3 pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono">Internal Edges</span>
                    <p className="font-bold text-slate-800">{comm.internal_edge_count}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono">External Boundary</span>
                    <p className="font-bold text-slate-800">{comm.external_edge_count}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Selected Community View */}
          {(() => {
            const comm = communities.communities.find((c) => c.community_id === selectedCommunityId);
            if (!comm) return null;
            return (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Community C{comm.community_id} Structural Profile
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Algorithmic modularity partition with internal density {comm.density.toFixed(3)}
                    </p>
                  </div>
                  <span className="text-xs font-mono bg-slate-100 px-3 py-1 rounded text-slate-700">
                    Total Boundary Links: {comm.external_edge_count}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Members */}
                  <div>
                    <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-600 mb-2">
                      Cluster Members ({comm.members.length})
                    </h4>
                    <div className="space-y-1.5">
                      {comm.members.map((member) => (
                        <div
                          key={member}
                          className="p-2 bg-slate-50 rounded border border-slate-200 text-xs flex items-center justify-between"
                        >
                          <button
                            onClick={() => handleInspectEntityNeighborhood(member)}
                            className="font-semibold text-slate-900 hover:text-indigo-600 text-left"
                          >
                            {member}
                          </button>
                          {comm.boundary_nodes.includes(member) ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                              Boundary Node
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                              Internal
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Inter-Community Boundary Links */}
                  <div>
                    <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-600 mb-2">
                      Cross-Cluster Adjacency
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(comm.boundary_targets_by_community).map(([targetComm, count]) => (
                        <div
                          key={targetComm}
                          className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <span className="font-semibold text-slate-800">
                            Connections to Community C{targetComm}
                          </span>
                          <span className="font-mono font-bold text-indigo-700">{count} edge(s)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ─── TAB 6: Multi-Metric Centrality Comparison Matrix ──────────────── */}
      {activeTab === "centrality" && centrality && (
        <div className="space-y-6">
          <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search entity name..."
                value={centralitySearch}
                onChange={(e) => setCentralitySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-mono">
              High Rank Divergence Nodes: {centrality.high_divergence_nodes.join(", ") || "None"}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-mono text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-3 py-3 text-center">Degree (#/Rank)</th>
                    <th className="px-3 py-3 text-center">Betweenness (Val/Rank)</th>
                    <th className="px-3 py-3 text-center">Closeness (Val/Rank)</th>
                    <th className="px-3 py-3 text-center">PageRank (Val/Rank)</th>
                    <th className="px-3 py-3 text-center">Composite (Score/Rank)</th>
                    <th className="px-3 py-3 text-center">Divergence</th>
                    <th className="px-4 py-3">Structural Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {centrality.rankings
                    .filter((r) => r.node.toLowerCase().includes(centralitySearch.toLowerCase()))
                    .map((row) => (
                      <tr key={row.node} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          <button
                            onClick={() => handleInspectEntityNeighborhood(row.node)}
                            className="hover:text-indigo-600 text-left"
                          >
                            {row.node}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-center font-mono">
                          {row.degree}{" "}
                          <span className="text-[10px] text-slate-400">#{row.degree_rank}</span>
                        </td>
                        <td className="px-3 py-3 text-center font-mono">
                          {row.betweenness.toFixed(3)}{" "}
                          <span className="text-[10px] text-slate-400">#{row.betweenness_rank}</span>
                        </td>
                        <td className="px-3 py-3 text-center font-mono">
                          {row.closeness.toFixed(3)}{" "}
                          <span className="text-[10px] text-slate-400">#{row.closeness_rank}</span>
                        </td>
                        <td className="px-3 py-3 text-center font-mono">
                          {row.pagerank.toFixed(3)}{" "}
                          <span className="text-[10px] text-slate-400">#{row.pagerank_rank}</span>
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-indigo-700">
                          {row.composite_influence.toFixed(3)}{" "}
                          <span className="text-[10px] text-indigo-400">#{row.composite_rank}</span>
                        </td>
                        <td className="px-3 py-3 text-center font-mono">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              row.max_rank_divergence >= 3
                                ? "bg-amber-100 text-amber-800 font-bold"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            ±{row.max_rank_divergence}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-[11px]">{row.structural_role_note}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 7: Motifs & Entity Comparison ────────────────────────────── */}
      {activeTab === "motifs" && (
        <div className="space-y-6">
          {/* Side-by-Side Comparison Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              Side-by-Side Entity Structural Comparison
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <label htmlFor="compare-a-select" className="text-[11px] font-mono uppercase text-slate-500 font-semibold block mb-1">
                  Entity A:
                </label>
                <select
                  id="compare-a-select"
                  value={compareEntityA}
                  onChange={(e) => setCompareEntityA(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {entityOptions.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs font-mono text-slate-400 font-bold mt-4">VS</div>

              <div className="flex-1 w-full">
                <label htmlFor="compare-b-select" className="text-[11px] font-mono uppercase text-slate-500 font-semibold block mb-1">
                  Entity B:
                </label>
                <select
                  id="compare-b-select"
                  value={compareEntityB}
                  onChange={(e) => setCompareEntityB(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {entityOptions.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>

              <div className="self-end mt-4">
                <button
                  onClick={() => fetchComparison(compareEntityA, compareEntityB)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-2xs"
                >
                  Compare
                </button>
              </div>
            </div>

            {compareLoading ? (
              <div className="py-4 text-center text-slate-500 text-xs font-mono">
                Calculating topological comparison...
              </div>
            ) : comparisonData ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">
                    Jaccard Similarity: {(comparisonData.jaccard_similarity * 100).toFixed(1)}%
                  </span>
                  <span className="font-mono text-indigo-700">
                    Distance: {comparisonData.shortest_path_distance} Hop(s)
                  </span>
                </div>
                <p className="text-xs text-slate-600">{comparisonData.structural_summary}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-xs text-slate-500">
                    Shared Neighbors ({comparisonData.common_neighbor_count}): {comparisonData.common_neighbors.join(", ") || "None"}
                  </span>
                  <button
                    onClick={() => setDrawerComparison(comparisonData)}
                    className="text-xs text-indigo-600 font-medium hover:underline"
                  >
                    Open Comparison Drawer →
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Motifs Grid */}
          {motifs && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Topological Motifs ({motifs.total_motifs})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Triangles ({motifs.triangles_count}), Star Hubs ({motifs.star_hubs_count})
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {motifs.motifs.map((motif) => (
                  <div
                    key={motif.motif_id}
                    onClick={() => setDrawerMotif(motif)}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 hover:border-indigo-300 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                        {motif.motif_type}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{motif.motif_id}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">{motif.motif_name}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{motif.metric_basis}</p>
                    <div className="text-[10px] font-mono text-indigo-600 pt-1 border-t border-slate-200 flex items-center justify-between">
                      <span>{motif.nodes.length} Nodes / {motif.edges.length} Edges</span>
                      <span>Inspect →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Inspection Drawer ────────────────────────────────────────────── */}
      <GraphIntelligenceDrawer
        neighborhood={drawerNeighborhood}
        path={drawerPath}
        motif={drawerMotif}
        bridgeNode={drawerBridgeNode}
        bridgeData={bridges}
        comparison={drawerComparison}
        onClose={() => {
          setDrawerNeighborhood(null);
          setDrawerPath(null);
          setDrawerMotif(null);
          setDrawerBridgeNode(null);
          setDrawerComparison(null);
        }}
        onSelectEntity={handleInspectEntityNeighborhood}
      />
    </div>
  );
};
