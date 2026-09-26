import React, { useState } from "react";
import {
  GraphNeighborhood,
  GraphPath,
  StructuralMotif,
  BridgeAnalysis,
  GraphComparison,
} from "../types";
import {
  X,
  Shield,
  Share2,
  Route,
  Layers,
  GitFork,
  ArrowRight,
  Sparkles,
  Link,
  ChevronRight,
  Info,
} from "lucide-react";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { ExplanationDrawer } from "./ExplanationDrawer";

interface GraphIntelligenceDrawerProps {
  neighborhood?: GraphNeighborhood | null;
  path?: GraphPath | null;
  motif?: StructuralMotif | null;
  bridgeNode?: string | null;
  bridgeData?: BridgeAnalysis | null;
  comparison?: GraphComparison | null;
  onClose: () => void;
  onSelectEntity?: (entityId: string) => void;
}

export const GraphIntelligenceDrawer: React.FC<GraphIntelligenceDrawerProps> = ({
  neighborhood,
  path,
  motif,
  bridgeNode,
  bridgeData,
  comparison,
  onClose,
  onSelectEntity,
}) => {
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
  const [activeExplanationId, setActiveExplanationId] = useState<string | null>(null);

  if (!neighborhood && !path && !motif && !bridgeNode && !comparison) {
    return null;
  }

  // Find bridge detail if bridgeNode is provided
  const bridgeDetail =
    bridgeNode && bridgeData
      ? bridgeData.betweenness_bridges.find((b) => (b.node || b.entity) === bridgeNode)
      : null;
  const bridgeEvidence =
    bridgeNode && bridgeData?.evidence_ids_by_bridge
      ? bridgeData.evidence_ids_by_bridge[bridgeNode] || []
      : [];

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
        <div
          className="w-full max-w-2xl bg-white dark:bg-[#0A1220] h-full shadow-2xl flex flex-col transform transition-transform duration-300 border-l border-slate-200 dark:border-white/10"
          role="dialog"
          aria-modal="true"
        >
          {/* Drawer Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#080E1A] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-700/50 rounded-lg text-indigo-700 dark:text-indigo-400">
                {neighborhood && <Share2 className="w-5 h-5" />}
                {path && <Route className="w-5 h-5" />}
                {motif && <Layers className="w-5 h-5" />}
                {bridgeNode && <GitFork className="w-5 h-5" />}
                {comparison && <Sparkles className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">
                  Graph Intelligence Inspector
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {neighborhood && `Neighborhood: ${neighborhood.center_node || neighborhood.entity_id}`}
                  {path && `Relational Path: ${path.source} → ${path.target}`}
                  {motif && `Motif: ${motif.title || motif.motif_name}`}
                  {bridgeNode && `Structural Bridge: ${bridgeNode}`}
                  {comparison && `Entity Comparison: ${comparison.entity_a} vs ${comparison.entity_b}`}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close graph intelligence inspector drawer"
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 dark:hover:text-slate-200 rounded-md transition-colors"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-700">
            {/* 1. Neighborhood View */}
            {neighborhood && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-500 uppercase font-mono">1-Hop Direct Neighbors</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {neighborhood.one_hop_count ?? neighborhood.one_hop_degree ?? 0}
                    </p>
                    <span className="text-[11px] text-slate-500">Documented direct co-occurrences</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-500 uppercase font-mono">2-Hop Distance Neighbors</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{neighborhood.two_hop_count ?? 0}</p>
                    <span className="text-[11px] text-slate-500">Indirect topological connections</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                    Direct Adjacency (1-Hop)
                  </h4>
                  <div className="space-y-2">
                    {(neighborhood.one_hop_neighbors || []).map((nb: any) => (
                      <div
                        key={nb.node || nb.target || nb}
                        className="p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onSelectEntity && onSelectEntity(nb.node || nb.target || nb)}
                              className="font-semibold text-slate-900 hover:text-indigo-600 text-left"
                            >
                              {nb.node || nb.target || nb}
                            </button>
                            {nb.node_type && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">
                                {nb.node_type}
                              </span>
                            )}
                            {nb.connecting_edge_type && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-mono">
                                {nb.connecting_edge_type}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {nb.evidence_count || nb.evidence_ids?.length || 0} evidence records (
                            {(nb.record_ids || nb.records || []).join(", ") || "Recorded co-occurrence"})
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {nb.evidence_ids && nb.evidence_ids.length > 0 && (
                            <button
                              onClick={() => setActiveEvidenceId(nb.evidence_ids[0])}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 bg-indigo-50 rounded flex items-center gap-1"
                            >
                              <Link className="w-3 h-3" /> Evidence ({nb.evidence_ids.length})
                            </button>
                          )}
                          {nb.explanation_id && (
                            <button
                              onClick={() => setActiveExplanationId(nb.explanation_id!)}
                              className="text-xs text-purple-600 hover:text-purple-800 font-medium px-2 py-1 bg-purple-50 rounded flex items-center gap-1"
                            >
                              Why?
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {(neighborhood.two_hop_neighbors || []).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                      Indirect Reach (2-Hop)
                    </h4>
                    <div className="space-y-2">
                      {(neighborhood.two_hop_neighbors || []).map((nb: any) => (
                        <div
                          key={nb.node || nb}
                          className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onSelectEntity && onSelectEntity(nb.node || nb)}
                                className="font-semibold text-slate-900 hover:text-indigo-600 text-left"
                              >
                                {nb.node || nb}
                              </button>
                              {nb.via_nodes && nb.via_nodes.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-mono">
                                  via {nb.via_nodes.join(", ")}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">
                              Requires 2-step graph navigation through observed intermediary
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. Path View */}
            {path && (
              <div className="space-y-5">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1">
                    <span>PATH SUMMARY</span>
                    <span>
                      {path.hop_count} HOPS ({(path.path_nodes || path.path || []).length} NODES)
                    </span>
                  </div>
                  <div className="text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                    {(path.path_nodes || path.path || []).map((node, idx, arr) => (
                      <React.Fragment key={node}>
                        <span className="px-2 py-1 bg-white border border-slate-200 rounded shadow-2xs font-mono text-xs">
                          {node}
                        </span>
                        {idx < arr.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Total Relational Path Weight: {(path.total_weight ?? 1.0).toFixed(2)} | Evidence Records:{" "}
                    {(path.all_record_ids || []).join(", ") || "Linked Records"}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                    Step-by-Step Traversal Hops
                  </h4>
                  <div className="space-y-3">
                    {(path.hops || []).map((hop, idx) => {
                      const stepIdx = hop.step_index ?? hop.step ?? idx;
                      const srcNode = hop.source_node || hop.from_node;
                      const tgtNode = hop.target_node || hop.to_node;
                      const relType = hop.relationship_type || "CO_OCCURRENCE";
                      const recs = hop.record_ids || hop.records || [];

                      return (
                        <div
                          key={stepIdx}
                          className="p-3 bg-white border border-slate-200 rounded-lg space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-indigo-600">
                              Hop #{stepIdx + 1}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded font-mono text-slate-600">
                              Weight: {hop.weight.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <span>{srcNode}</span>
                            <span className="text-xs font-mono px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">
                              {relType}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                            <span>{tgtNode}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                            <span>Records: {recs.join(", ") || "Recorded in dataset"}</span>
                            <div className="flex items-center gap-2">
                              {hop.evidence_ids && hop.evidence_ids.length > 0 && (
                                <button
                                  onClick={() => setActiveEvidenceId(hop.evidence_ids[0])}
                                  className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                                >
                                  <Link className="w-3 h-3" /> Evidence ({hop.evidence_ids.length})
                                </button>
                              )}
                              {hop.explanation_id && (
                                <button
                                  onClick={() => setActiveExplanationId(hop.explanation_id!)}
                                  className="text-purple-600 hover:text-purple-800 font-medium"
                                >
                                  Explanation
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Motif View */}
            {motif && (
              <div className="space-y-5">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold">
                      {motif.motif_type}
                    </span>
                    <span className="text-xs font-mono text-slate-500">{motif.motif_id}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{motif.title || motif.motif_name}</h3>
                  <p className="text-xs text-slate-600">{motif.description || motif.metric_basis}</p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                    Participating Entities ({(motif.nodes || motif.entities || []).length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(motif.nodes || motif.entities || []).map((node) => (
                      <button
                        key={node}
                        onClick={() => onSelectEntity && onSelectEntity(node)}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-400 rounded-lg text-xs font-medium text-slate-800 hover:text-indigo-700 shadow-2xs"
                      >
                        {node}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                    Sub-Graph Relational Edges ({(motif.edges || motif.subgraph_edges || []).length})
                  </h4>
                  <div className="space-y-1.5">
                    {(motif.edges || motif.subgraph_edges || []).map((e, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-slate-50 rounded border border-slate-200 text-xs font-mono text-slate-700 flex items-center justify-between"
                      >
                        <span>{e[0]}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span>{e[1]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {motif.evidence_ids && motif.evidence_ids.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                      Linked Evidence Items
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {motif.evidence_ids.map((evId) => (
                        <button
                          key={evId}
                          onClick={() => setActiveEvidenceId(evId)}
                          className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded text-xs font-mono hover:bg-indigo-100 flex items-center gap-1"
                        >
                          <Link className="w-3 h-3" />
                          {evId}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Bridge View */}
            {bridgeNode && (
              <div className="space-y-5">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">
                    STRUCTURAL BRIDGE NODE
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{bridgeNode}</h3>
                  {bridgeDetail && (
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200">
                      <div>
                        <span className="text-[11px] text-slate-500 font-mono">Betweenness Score</span>
                        <p className="text-lg font-bold text-slate-900">
                          {(bridgeDetail.betweenness_score ?? bridgeDetail.betweenness ?? 0).toFixed(4)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 font-mono">Cut Articulation</span>
                        <p className="text-sm font-semibold text-slate-800">
                          {bridgeDetail.is_articulation_point ? "Single Cut Point" : "Biconnected (0 Single Cut)"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
                  <p className="font-semibold mb-1 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-700 shrink-0" />
                    Topological Routing Significance
                  </p>
                  This entity exhibits high betweenness centrality, meaning a large fraction of shortest relational
                  paths across the network pass through it. This reflects recorded information routing position in
                  the observed graph, not proof of criminal brokering.
                </div>

                {bridgeEvidence.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                      Linked Evidence Items ({bridgeEvidence.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {bridgeEvidence.map((evId) => (
                        <button
                          key={evId}
                          onClick={() => setActiveEvidenceId(evId)}
                          className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded text-xs font-mono hover:bg-indigo-100 flex items-center gap-1"
                        >
                          <Link className="w-3 h-3" />
                          {evId}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. Entity Comparison View */}
            {comparison && (
              <div className="space-y-5">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
                    <span>STRUCTURAL SIMILARITY</span>
                    <span>Jaccard: {((comparison.jaccard_similarity ?? 0) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-slate-900 text-base">
                    <span>{comparison.entity_a}</span>
                    <span className="text-xs text-slate-400 font-mono">VS</span>
                    <span>{comparison.entity_b}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">
                    {comparison.structural_summary ||
                      `Entities differ by degree (${comparison.degree_a} vs ${comparison.degree_b}) and betweenness.`}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                    Shared Direct Neighbors ({comparison.common_neighbor_count ?? comparison.shared_neighbors_count ?? 0})
                  </h4>
                  {(comparison.common_neighbors || comparison.shared_neighbors || []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(comparison.common_neighbors || comparison.shared_neighbors || []).map((cn) => (
                        <button
                          key={cn}
                          onClick={() => onSelectEntity && onSelectEntity(cn)}
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-800 hover:text-indigo-600"
                        >
                          {cn}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No shared 1-hop co-occurrences in recorded data.</p>
                  )}
                </div>

                {(comparison.shortest_path_nodes || []).length > 0 && (
                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <span className="text-xs font-mono text-slate-500 block mb-1">
                      SHORTEST GRAPH DISTANCE: {comparison.shortest_path_distance} HOP(S)
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap font-mono text-xs text-indigo-700">
                      {(comparison.shortest_path_nodes || []).map((node, i, arr) => (
                        <React.Fragment key={node}>
                          <span className="bg-indigo-50 px-2 py-0.5 rounded">{node}</span>
                          {i < arr.length - 1 && <span>→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Epistemic Limitation Banner */}
            <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Shield className="w-4 h-4 text-slate-500" />
                Epistemic Guardrail Notice
              </div>
              <p>
                {neighborhood?.epistemic_limitation ||
                  path?.epistemic_limitation ||
                  motif?.epistemic_limitation ||
                  comparison?.epistemic_limitation ||
                  "Graph intelligence findings reflect purely topological structures in recorded observations. No inferences regarding guilt, coordination, or criminal conspiracies are derived from graph metrics alone."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Nested Drawers */}
      {activeEvidenceId && (
        <EvidenceDrawer
          evidenceId={activeEvidenceId}
          onClose={() => setActiveEvidenceId(null)}
        />
      )}

      {activeExplanationId && (
        <ExplanationDrawer
          explanationId={activeExplanationId}
          onClose={() => setActiveExplanationId(null)}
        />
      )}
    </>
  );
};
