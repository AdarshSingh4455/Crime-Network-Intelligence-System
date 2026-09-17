"""
graph_intelligence_engine.py
----------------------------
CNIS Phase 3K: Advanced Graph Intelligence Engine.

Provides deterministic, evidence-grounded structural graph analysis:
  1. Global Graph Overview & Topological Metrics
  2. 1-Hop and 2-Hop Node Neighborhood Analysis
  3. Multi-Hop Shortest Path Tracing with Hop Evidence Linkage
  4. Bridge Nodes vs. Graph Articulation Points Distinction
  5. Community Structure, Internal Density & Inter-Community Connectivity
  6. Multi-Metric Centrality Comparison Matrix
  7. Topological Motif Detection (Triangles, Star Hubs, Chains)
  8. Side-by-Side Entity Structural Comparison

EPISTEMIC GUARDRAILS:
  - Graph centrality measures structural position, NOT criminality, guilt, or leadership.
  - Shortest paths reflect documented co-occurrence chains, NOT direct communication or conspiracy.
  - Communities reflect dense document co-occurrence clusters, NOT criminal syndicates.
  - Bridge positions indicate network connectivity intermediaries, NOT operational command.
"""

from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Any, Optional, Set, Tuple
import networkx as nx
from collections import defaultdict


def _extract_id(obj: Any, field_name: str) -> Optional[str]:
    if obj is None:
        return None
    if isinstance(obj, dict):
        return obj.get(field_name)
    return getattr(obj, field_name, None)


# ─── Data Models ──────────────────────────────────────────────────────────────

@dataclass
class GraphOverview:
    node_count: int
    edge_count: int
    connected_components: int
    is_connected: bool
    graph_density: float
    average_degree: float
    max_degree: int
    max_degree_nodes: List[str]
    isolated_nodes: List[str]
    graph_diameter: Optional[int]
    average_shortest_path_length: Optional[float]
    nodes_by_type: Dict[str, int]
    epistemic_limitation: str


@dataclass
class HopDetail:
    step: int
    from_node: str
    to_node: str
    weight: int
    records: List[str]
    dates: List[str]
    evidence_ids: List[str]


@dataclass
class GraphPath:
    source: str
    target: str
    path_exists: bool
    path: List[str]
    hop_count: int
    hops: List[HopDetail]
    alternative_paths: List[List[str]]
    epistemic_limitation: str


@dataclass
class GraphNeighborhood:
    entity_id: str
    entity_type: str
    direct_neighbors: List[str]
    one_hop_degree: int
    two_hop_neighborhood: List[str]
    two_hop_count: int
    total_neighborhood_size: int
    neighbor_types_breakdown: Dict[str, int]
    incident_relationships: List[Dict[str, Any]]
    supporting_evidence_ids: List[str]
    explanation_id: Optional[str]
    epistemic_limitation: str


@dataclass
class BridgeAnalysis:
    betweenness_bridges: List[Dict[str, Any]]
    articulation_points: List[str]
    biconnected_components_count: int
    biconnected_component_sizes: List[int]
    distinction_explanation: str
    epistemic_limitation: str


@dataclass
class CommunityStructuralDetail:
    community_id: int
    size: int
    members: List[str]
    member_types: Dict[str, int]
    internal_edge_count: int
    internal_density: float
    external_edge_count: int
    external_connections_by_community: Dict[int, int]
    bridge_entities: List[str]


@dataclass
class CommunityAnalysis:
    total_communities: int
    communities: List[CommunityStructuralDetail]
    inter_community_edges: List[Dict[str, Any]]
    epistemic_limitation: str


@dataclass
class CentralityComparisonRow:
    entity: str
    entity_type: str
    degree: float
    betweenness: float
    eigenvector: float
    pagerank: float
    composite_influence: float
    degree_rank: int
    betweenness_rank: int
    eigenvector_rank: int
    pagerank_rank: int
    composite_rank: int


@dataclass
class GraphCentralityComparison:
    formula: str
    rows: List[CentralityComparisonRow]
    epistemic_limitation: str


@dataclass
class StructuralMotif:
    motif_id: str
    motif_type: str
    title: str
    description: str
    entities: List[str]
    subgraph_edges: List[List[str]]
    metric_basis: str
    evidence_ids: List[str]
    epistemic_limitation: str


@dataclass
class MotifAnalysis:
    total_motifs: int
    triangles_count: int
    star_hubs_count: int
    chains_count: int
    motifs: List[StructuralMotif]
    epistemic_limitation: str


@dataclass
class GraphComparison:
    entity_a: str
    entity_b: str
    type_a: str
    type_b: str
    degree_a: int
    degree_b: int
    betweenness_a: float
    betweenness_b: float
    eigenvector_a: float
    eigenvector_b: float
    pagerank_a: float
    pagerank_b: float
    composite_influence_a: float
    composite_influence_b: float
    community_a: int
    community_b: int
    shared_neighbors: List[str]
    shared_neighbors_count: int
    shortest_path_distance: Optional[int]
    is_directly_connected: bool
    connection_weight: Optional[int]
    epistemic_limitation: str


# ─── Core Engine ──────────────────────────────────────────────────────────────

class GraphIntelligenceEngine:
    """
    Deterministic Graph Intelligence Engine for CNIS Phase 3K.
    Consumes existing graph and network analysis outputs to provide rich
    structural analytics, neighborhood inspection, path tracing, and motifs.
    """

    def __init__(self):
        self._is_compiled: bool = False
        self._G: Optional[nx.Graph] = None
        self._centrality: Dict[str, Dict[str, Any]] = {}
        self._key_players: List[Dict[str, Any]] = []
        self._communities: List[Set[str]] = []
        self._community_map: Dict[str, int] = {}
        self._bridges: List[Tuple[str, float]] = []
        self._evidence_engine: Any = None
        self._explainability_engine: Any = None

        # Precomputed artifacts
        self._overview: Optional[GraphOverview] = None
        self._neighborhoods: Dict[str, GraphNeighborhood] = {}
        self._bridge_analysis: Optional[BridgeAnalysis] = None
        self._community_analysis: Optional[CommunityAnalysis] = None
        self._centrality_comparison: Optional[GraphCentralityComparison] = None
        self._motif_analysis: Optional[MotifAnalysis] = None

    @property
    def is_compiled(self) -> bool:
        return self._is_compiled

    def compile(
        self,
        G: nx.Graph,
        centrality: Dict[str, Dict[str, Any]],
        key_players: List[Dict[str, Any]],
        communities: List[Set[str]],
        bridges: List[Tuple[str, float]],
        evidence_engine: Any = None,
        explainability_engine: Any = None,
    ):
        """Compiles graph intelligence indices once on startup/refresh."""
        self._G = G
        self._centrality = centrality
        self._key_players = key_players
        self._communities = communities
        self._community_map = {}
        for idx, comm in enumerate(communities):
            for node in comm:
                self._community_map[node] = idx
        self._bridges = bridges
        self._evidence_engine = evidence_engine
        self._explainability_engine = explainability_engine

        # Build all analytical components
        self._overview = self._build_overview()
        self._neighborhoods = self._build_neighborhoods()
        self._bridge_analysis = self._build_bridge_analysis()
        self._community_analysis = self._build_community_analysis()
        self._centrality_comparison = self._build_centrality_comparison()
        self._motif_analysis = self._build_motif_analysis()

        self._is_compiled = True
        return self

    # ─── 1. Graph Overview Builder ────────────────────────────────────────────

    def _build_overview(self) -> GraphOverview:
        G = self._G
        n_nodes = G.number_of_nodes()
        n_edges = G.number_of_edges()
        density = round(nx.density(G), 4)

        connected_components = nx.number_connected_components(G)
        is_conn = nx.is_connected(G)

        degrees = dict(G.degree())
        avg_degree = round(sum(degrees.values()) / max(n_nodes, 1), 4)
        max_deg = max(degrees.values()) if degrees else 0
        max_deg_nodes = sorted([n for n, d in degrees.items() if d == max_deg])
        isolated = sorted([n for n, d in degrees.items() if d == 0])

        diameter = nx.diameter(G) if is_conn and n_nodes > 1 else None
        avg_path = round(nx.average_shortest_path_length(G), 4) if is_conn and n_nodes > 1 else None

        type_counts = defaultdict(int)
        for _, data in G.nodes(data=True):
            type_counts[data.get("type", "UNKNOWN")] += 1

        return GraphOverview(
            node_count=n_nodes,
            edge_count=n_edges,
            connected_components=connected_components,
            is_connected=is_conn,
            graph_density=density,
            average_degree=avg_degree,
            max_degree=max_deg,
            max_degree_nodes=max_deg_nodes,
            isolated_nodes=isolated,
            graph_diameter=diameter,
            average_shortest_path_length=avg_path,
            nodes_by_type=dict(type_counts),
            epistemic_limitation=(
                "Graph overview metrics describe topological properties of the observed co-occurrence network. "
                "Network density and connectivity reflect documentation co-occurrence frequency, not the operational "
                "efficiency or criminal scale of real-world activities."
            ),
        )

    # ─── 2. Neighborhood Builder ──────────────────────────────────────────────

    def _build_neighborhoods(self) -> Dict[str, GraphNeighborhood]:
        G = self._G
        neighborhoods = {}

        for node in sorted(G.nodes()):
            node_type = G.nodes[node].get("type", "UNKNOWN")
            neighbors = sorted(list(G.neighbors(node)))
            deg = len(neighbors)

            # 2-hop neighborhood: nodes at shortest path distance exactly 2
            two_hop_set = set()
            for nbr in neighbors:
                for nbr2 in G.neighbors(nbr):
                    if nbr2 != node and nbr2 not in neighbors:
                        two_hop_set.add(nbr2)
            two_hop_list = sorted(list(two_hop_set))

            type_counts = defaultdict(int)
            for nbr in neighbors:
                t = G.nodes[nbr].get("type", "UNKNOWN")
                type_counts[t] += 1

            incident_rels = []
            evidence_ids = []
            for nbr in neighbors:
                edge_data = G.get_edge_data(node, nbr, default={})
                w = edge_data.get("weight", 1)
                recs = edge_data.get("records", [])
                dates = edge_data.get("dates", [])

                ev_id = None
                if self._evidence_engine:
                    ev_item = self._evidence_engine.get_evidence_for_relationship(node, nbr)
                    ev_id = _extract_id(ev_item, "evidence_id")
                    if ev_id:
                        evidence_ids.append(ev_id)

                incident_rels.append({
                    "target": nbr,
                    "target_type": G.nodes[nbr].get("type", "UNKNOWN"),
                    "weight": w,
                    "records": recs,
                    "dates": dates,
                    "evidence_id": ev_id,
                })

            exp_id = None
            if self._explainability_engine:
                expls = self._explainability_engine.get_explanations_for_entity(node)
                if expls:
                    exp_id = _extract_id(expls[0], "explanation_id")

            neighborhoods[node] = GraphNeighborhood(
                entity_id=node,
                entity_type=node_type,
                direct_neighbors=neighbors,
                one_hop_degree=deg,
                two_hop_neighborhood=two_hop_list,
                two_hop_count=len(two_hop_list),
                total_neighborhood_size=deg + len(two_hop_list),
                neighbor_types_breakdown=dict(type_counts),
                incident_relationships=incident_rels,
                supporting_evidence_ids=sorted(list(set(evidence_ids))),
                explanation_id=exp_id,
                epistemic_limitation=(
                    f"Neighborhood analysis for '{node}' measures topological adjacency in the co-occurrence graph. "
                    "Two-hop reachability reflects network proximity in recorded documents, NOT personal acquaintance, "
                    "physical coordination, or conspiratorial agreement."
                ),
            )

        return neighborhoods

    # ─── 3. Shortest Path Analysis ────────────────────────────────────────────

    def get_shortest_path(self, source: str, target: str) -> GraphPath:
        G = self._G
        if not G or not G.has_node(source) or not G.has_node(target):
            return GraphPath(
                source=source,
                target=target,
                path_exists=False,
                path=[],
                hop_count=0,
                hops=[],
                alternative_paths=[],
                epistemic_limitation=f"One or both entities ('{source}', '{target}') do not exist in the intelligence graph.",
            )

        if source == target:
            return GraphPath(
                source=source,
                target=target,
                path_exists=True,
                path=[source],
                hop_count=0,
                hops=[],
                alternative_paths=[],
                epistemic_limitation="Source and target refer to the same entity.",
            )

        try:
            # Deterministic shortest path
            path = nx.shortest_path(G, source, target, weight=None)
            hop_count = len(path) - 1

            # Find all alternative shortest paths of minimal length (capped at 5)
            all_paths_gen = nx.all_shortest_paths(G, source, target, weight=None)
            alt_paths = []
            for p in all_paths_gen:
                if p != path and len(alt_paths) < 5:
                    alt_paths.append(p)

            hops = []
            for step in range(hop_count):
                u = path[step]
                v = path[step + 1]
                edge_data = G.get_edge_data(u, v, default={})
                w = edge_data.get("weight", 1)
                recs = edge_data.get("records", [])
                dates = edge_data.get("dates", [])

                ev_ids = []
                if self._evidence_engine:
                    ev_item = self._evidence_engine.get_evidence_for_relationship(u, v)
                    eid = _extract_id(ev_item, "evidence_id")
                    if eid:
                        ev_ids.append(eid)

                hops.append(HopDetail(
                    step=step + 1,
                    from_node=u,
                    to_node=v,
                    weight=w,
                    records=recs,
                    dates=dates,
                    evidence_ids=ev_ids,
                ))

            return GraphPath(
                source=source,
                target=target,
                path_exists=True,
                path=path,
                hop_count=hop_count,
                hops=hops,
                alternative_paths=alt_paths,
                epistemic_limitation=(
                    f"Shortest path trace between '{source}' and '{target}' reflects an analytical chain of "
                    "documented co-occurrences. Path existence does NOT establish direct communication, relaying "
                    "of operational instructions, or criminal conspiracy between non-adjacent parties."
                ),
            )
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return GraphPath(
                source=source,
                target=target,
                path_exists=False,
                path=[],
                hop_count=0,
                hops=[],
                alternative_paths=[],
                epistemic_limitation=f"No graph path connects '{source}' and '{target}' in the current network topology.",
            )

    # ─── 4. Bridge & Articulation Analysis ────────────────────────────────────

    def _build_bridge_analysis(self) -> BridgeAnalysis:
        G = self._G
        betweenness_bridges = []
        for entity, score in self._bridges:
            betweenness_bridges.append({
                "entity": entity,
                "entity_type": G.nodes[entity].get("type", "UNKNOWN"),
                "betweenness": round(score, 4),
                "degree": G.degree(entity),
                "community": self._community_map.get(entity, -1),
            })

        # Articulation points (cut vertices)
        art_points = sorted(list(nx.articulation_points(G)))

        # Biconnected components
        biconn_comps = list(nx.biconnected_components(G))
        biconn_sizes = sorted([len(c) for c in biconn_comps], reverse=True)

        return BridgeAnalysis(
            betweenness_bridges=betweenness_bridges,
            articulation_points=art_points,
            biconnected_components_count=len(biconn_comps),
            biconnected_component_sizes=biconn_sizes,
            distinction_explanation=(
                "MATHEMATICAL DISTINCTION:\n"
                "• Betweenness Bridge Node: A node with high flow of all-pairs shortest paths passing through it. "
                "It serves as a topological connector/broker between denser subgraphs, but removing it does NOT necessarily "
                "disconnect the network if alternate paths exist.\n"
                "• Articulation Point: A strict topological cut vertex whose removal mathematically partitions the graph into "
                "two or more disconnected components. In highly connected networks (biconnected graphs), articulation points are absent (0) "
                "even when high-betweenness bridges exist."
            ),
            epistemic_limitation=(
                "Bridge identification is a mathematical property of graph shortest paths. Bridge nodes must NOT be assumed to be "
                "'kingpins', 'couriers', or 'criminal organizers' without explicit corroborating source intelligence."
            ),
        )

    # ─── 5. Community Structure Builder ───────────────────────────────────────

    def _build_community_analysis(self) -> CommunityAnalysis:
        G = self._G
        comm_details = []
        inter_edges = []

        for c_id, members_set in enumerate(self._communities):
            members = sorted(list(members_set))
            subgraph = G.subgraph(members)
            internal_edges_count = subgraph.number_of_edges()
            internal_density = round(nx.density(subgraph), 4)

            # Count member types
            type_counts = defaultdict(int)
            for m in members:
                type_counts[G.nodes[m].get("type", "UNKNOWN")] += 1

            # External edges from this community
            external_by_comm = defaultdict(int)
            ext_edges_count = 0
            bridge_entities_set = set()

            for u in members:
                for v in G.neighbors(u):
                    if v not in members_set:
                        ext_edges_count += 1
                        target_comm = self._community_map.get(v, -1)
                        external_by_comm[target_comm] += 1
                        bridge_entities_set.add(u)

            comm_details.append(CommunityStructuralDetail(
                community_id=c_id,
                size=len(members),
                members=members,
                member_types=dict(type_counts),
                internal_edge_count=internal_edges_count,
                internal_density=internal_density,
                external_edge_count=ext_edges_count,
                external_connections_by_community=dict(external_by_comm),
                bridge_entities=sorted(list(bridge_entities_set)),
            ))

        # Inter-community edges across all pairs
        seen_edges = set()
        for u, v, data in G.edges(data=True):
            cu = self._community_map.get(u, -1)
            cv = self._community_map.get(v, -1)
            if cu != cv and cu != -1 and cv != -1:
                edge_key = tuple(sorted([u, v]))
                if edge_key not in seen_edges:
                    seen_edges.add(edge_key)
                    inter_edges.append({
                        "source": u,
                        "source_community": cu,
                        "target": v,
                        "target_community": cv,
                        "weight": data.get("weight", 1),
                        "records": data.get("records", []),
                    })

        # Deterministic sorting of inter-community edges
        inter_edges.sort(key=lambda x: (x["source_community"], x["target_community"], x["source"], x["target"]))

        return CommunityAnalysis(
            total_communities=len(self._communities),
            communities=comm_details,
            inter_community_edges=inter_edges,
            epistemic_limitation=(
                "Community detection partitions the graph based on observed co-occurrence modularity. "
                "Communities denote clusters of frequent co-documentation, NOT organized crime syndicates, "
                "clandestine cells, or distinct operational units."
            ),
        )

    # ─── 6. Centrality Comparison Builder ─────────────────────────────────────

    def _build_centrality_comparison(self) -> GraphCentralityComparison:
        G = self._G
        nodes = sorted(G.nodes())

        rows_data = []
        for node in nodes:
            c = self._centrality.get(node, {})
            deg = c.get("degree", 0.0)
            btw = c.get("betweenness", 0.0)
            eig = c.get("eigenvector", 0.0)
            pr = c.get("pagerank", 0.0)
            # Standard CNIS Phase 3I composite formula:
            comp = round(0.25 * deg + 0.35 * btw + 0.25 * eig + 0.15 * pr, 4)

            rows_data.append({
                "entity": node,
                "entity_type": G.nodes[node].get("type", "UNKNOWN"),
                "degree": deg,
                "betweenness": btw,
                "eigenvector": eig,
                "pagerank": pr,
                "composite_influence": comp,
            })

        # Calculate ranks (1-indexed, descending)
        def assign_ranks(key: str) -> Dict[str, int]:
            sorted_nodes = sorted(rows_data, key=lambda x: (x[key], x["entity"]), reverse=True)
            return {item["entity"]: idx + 1 for idx, item in enumerate(sorted_nodes)}

        deg_ranks = assign_ranks("degree")
        btw_ranks = assign_ranks("betweenness")
        eig_ranks = assign_ranks("eigenvector")
        pr_ranks = assign_ranks("pagerank")
        comp_ranks = assign_ranks("composite_influence")

        rows = []
        for r in rows_data:
            node = r["entity"]
            rows.append(CentralityComparisonRow(
                entity=node,
                entity_type=r["entity_type"],
                degree=r["degree"],
                betweenness=r["betweenness"],
                eigenvector=r["eigenvector"],
                pagerank=r["pagerank"],
                composite_influence=r["composite_influence"],
                degree_rank=deg_ranks[node],
                betweenness_rank=btw_ranks[node],
                eigenvector_rank=eig_ranks[node],
                pagerank_rank=pr_ranks[node],
                composite_rank=comp_ranks[node],
            ))

        # Sort rows by composite rank
        rows.sort(key=lambda x: x.composite_rank)

        return GraphCentralityComparison(
            formula="Influence Score = 0.25 × Degree + 0.35 × Betweenness + 0.25 × Eigenvector + 0.15 × PageRank",
            rows=rows,
            epistemic_limitation=(
                "Centrality rankings reflect mathematical positions in the co-occurrence topology. "
                "Higher rank indicates high connectivity or bridging across documents, NOT criminal leadership, "
                "culpability, or mastermind status."
            ),
        )

    # ─── 7. Structural Motif Builder ──────────────────────────────────────────

    def _build_motif_analysis(self) -> MotifAnalysis:
        G = self._G
        motifs: List[StructuralMotif] = []
        motif_counter = 1

        # A. Triangles (3-cliques: closed tripartite co-occurrences)
        triangles = []
        cliques = nx.enumerate_all_cliques(G)
        for clq in cliques:
            if len(clq) == 3:
                triangles.append(sorted(clq))

        # Sort triangles deterministically
        triangles.sort()

        for tri in triangles[:10]:  # Top 10 representative triangles
            u, v, w = tri
            edges = [sorted([u, v]), sorted([v, w]), sorted([w, u])]
            ev_ids = []
            if self._evidence_engine:
                for a, b in edges:
                    ev = self._evidence_engine.get_evidence_for_relationship(a, b)
                    eid = _extract_id(ev, "evidence_id")
                    if eid:
                        ev_ids.append(eid)

            motifs.append(StructuralMotif(
                motif_id=f"MOTIF-TRI-{motif_counter:03d}",
                motif_type="TRIANGLE_CLIQUE",
                title=f"Triangle Motif: {u} — {v} — {w}",
                description=f"Closed 3-node triangle where all three entities directly co-occur with each other in documented records.",
                entities=tri,
                subgraph_edges=edges,
                metric_basis="3-Node Complete Clique (K3)",
                evidence_ids=sorted(list(set(ev_ids))),
                epistemic_limitation="Triangles denote mutual pairwise co-occurrence in records, NOT joint conspiracy or collusion.",
            ))
            motif_counter += 1

        # B. Star-Shaped Neighborhoods (Hubs with >= 5 neighbors)
        star_hubs = []
        for n, deg in sorted(G.degree(), key=lambda x: x[1], reverse=True):
            if deg >= 5:
                star_hubs.append(n)

        for hub in star_hubs:
            nbrs = sorted(list(G.neighbors(hub)))
            edges = [sorted([hub, nbr]) for nbr in nbrs]
            ev_ids = []
            if self._evidence_engine:
                for a, b in edges:
                    ev = self._evidence_engine.get_evidence_for_relationship(a, b)
                    eid = _extract_id(ev, "evidence_id")
                    if eid:
                        ev_ids.append(eid)

            motifs.append(StructuralMotif(
                motif_id=f"MOTIF-STAR-{motif_counter:03d}",
                motif_type="STAR_HUB",
                title=f"Star-Shaped Neighborhood: {hub} (Degree {len(nbrs)})",
                description=f"Radial hub configuration where {hub} directly connects to {len(nbrs)} surrounding entities.",
                entities=[hub] + nbrs,
                subgraph_edges=edges,
                metric_basis=f"Radial Star Topology (Center Degree = {len(nbrs)})",
                evidence_ids=sorted(list(set(ev_ids))),
                epistemic_limitation="Star patterns reflect high document co-occurrence concentration, NOT criminal ring leadership.",
            ))
            motif_counter += 1

        # C. Bridge Structures (Spanning between communities)
        for u, v, data in sorted(G.edges(data=True), key=lambda x: (x[0], x[1])):
            cu = self._community_map.get(u, -1)
            cv = self._community_map.get(v, -1)
            if cu != cv and cu != -1 and cv != -1:
                ev_ids = []
                if self._evidence_engine:
                    ev = self._evidence_engine.get_evidence_for_relationship(u, v)
                    eid = _extract_id(ev, "evidence_id")
                    if eid:
                        ev_ids.append(eid)

                motifs.append(StructuralMotif(
                    motif_id=f"MOTIF-BRIDGE-{motif_counter:03d}",
                    motif_type="COMMUNITY_BRIDGE",
                    title=f"Cross-Community Link: {u} (C{cu}) ↔ {v} (C{cv})",
                    description=f"Inter-community connector edge bridging Community {cu} and Community {cv} with weight {data.get('weight', 1)}.",
                    entities=[u, v],
                    subgraph_edges=[sorted([u, v])],
                    metric_basis=f"Inter-Community Boundary Edge (C{cu} - C{cv})",
                    evidence_ids=ev_ids,
                    epistemic_limitation="Cross-community links indicate recorded overlap across analytical clusters, NOT courier or broker conspiracy.",
                ))
                motif_counter += 1
                if motif_counter > 25:
                    break

        return MotifAnalysis(
            total_motifs=len(motifs),
            triangles_count=len(triangles),
            star_hubs_count=len(star_hubs),
            chains_count=0,
            motifs=motifs,
            epistemic_limitation=(
                "Graph motifs represent structural subgraphs derived directly from adjacency topology. "
                "Motif configurations denote geometric connectivity patterns in records, NOT criminal syndicates, "
                "cells, or conspiracies."
            ),
        )

    # ─── 8. Entity Structural Comparison ──────────────────────────────────────

    def compare_entities(self, entity_a: str, entity_b: str) -> Optional[GraphComparison]:
        G = self._G
        if not G or not G.has_node(entity_a) or not G.has_node(entity_b):
            return None

        ca = self._centrality.get(entity_a, {})
        cb = self._centrality.get(entity_b, {})

        deg_a = G.degree(entity_a)
        deg_b = G.degree(entity_b)

        nbrs_a = set(G.neighbors(entity_a))
        nbrs_b = set(G.neighbors(entity_b))
        shared = sorted(list(nbrs_a.intersection(nbrs_b)))

        comp_a = round(0.25 * ca.get("degree", 0.0) + 0.35 * ca.get("betweenness", 0.0) + 0.25 * ca.get("eigenvector", 0.0) + 0.15 * ca.get("pagerank", 0.0), 4)
        comp_b = round(0.25 * cb.get("degree", 0.0) + 0.35 * cb.get("betweenness", 0.0) + 0.25 * cb.get("eigenvector", 0.0) + 0.15 * cb.get("pagerank", 0.0), 4)

        is_connected = G.has_edge(entity_a, entity_b)
        weight = G[entity_a][entity_b]["weight"] if is_connected else None

        dist = None
        try:
            dist = nx.shortest_path_length(G, entity_a, entity_b)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            dist = None

        res = GraphComparison(
            entity_a=entity_a,
            entity_b=entity_b,
            type_a=G.nodes[entity_a].get("type", "UNKNOWN"),
            type_b=G.nodes[entity_b].get("type", "UNKNOWN"),
            degree_a=deg_a,
            degree_b=deg_b,
            betweenness_a=ca.get("betweenness", 0.0),
            betweenness_b=cb.get("betweenness", 0.0),
            eigenvector_a=ca.get("eigenvector", 0.0),
            eigenvector_b=cb.get("eigenvector", 0.0),
            pagerank_a=ca.get("pagerank", 0.0),
            pagerank_b=cb.get("pagerank", 0.0),
            composite_influence_a=comp_a,
            composite_influence_b=comp_b,
            community_a=self._community_map.get(entity_a, -1),
            community_b=self._community_map.get(entity_b, -1),
            shared_neighbors=shared,
            shared_neighbors_count=len(shared),
            shortest_path_distance=dist,
            is_directly_connected=is_connected,
            connection_weight=weight,
            epistemic_limitation=(
                f"Comparative metrics for '{entity_a}' and '{entity_b}' present factual topological differences. "
                "Differences in centrality or degrees reflect evidentiary prominence, NOT degree of culpability or guilt."
            ),
        )
        return asdict(res)

    # ─── Public Getters ───────────────────────────────────────────────────────

    def get_overview(self) -> Dict[str, Any]:
        return asdict(self._overview) if self._overview else {}

    def get_neighborhood(self, entity_id: str) -> Optional[Dict[str, Any]]:
        nb = self._neighborhoods.get(entity_id)
        return asdict(nb) if nb else None

    def get_path(self, source: str, target: str) -> Dict[str, Any]:
        p = self.get_shortest_path(source, target)
        return asdict(p)

    def get_bridges(self) -> Dict[str, Any]:
        return asdict(self._bridge_analysis) if self._bridge_analysis else {}

    def get_communities(self) -> Dict[str, Any]:
        return asdict(self._community_analysis) if self._community_analysis else {}

    def get_centrality_matrix(self) -> Dict[str, Any]:
        return asdict(self._centrality_comparison) if self._centrality_comparison else {}

    def get_motifs(self) -> Dict[str, Any]:
        return asdict(self._motif_analysis) if self._motif_analysis else {}
