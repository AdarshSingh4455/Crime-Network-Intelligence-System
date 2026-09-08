"""
network_analysis.py
--------------------
Turns the raw graph into investigative insight:

  1. Centrality measures -> "who matters" (key influencers / brokers).
  2. Community detection  -> "what sub-crews / cells exist".
  3. Shortest-path / bridge analysis -> "how is A connected to B".

Centrality interpretation cheat-sheet for investigators:
  - Degree centrality      : most directly connected (hubs / organizers)
  - Betweenness centrality : brokers/couriers who bridge separate clusters
                              (removing them fragments the network)
  - Eigenvector centrality : connected to other well-connected people
                              (likely senior / leadership figures)
  - PageRank               : blended influence score, robust on sparse graphs
"""

from __future__ import annotations
import networkx as nx


def compute_centrality(G: nx.Graph) -> dict:
    degree = nx.degree_centrality(G)
    betweenness = nx.betweenness_centrality(G, weight="weight")
    try:
        eigenvector = nx.eigenvector_centrality(G, max_iter=1000, weight="weight")
    except nx.PowerIterationFailedConvergence:
        eigenvector = {n: 0.0 for n in G.nodes()}
    pagerank = nx.pagerank(G, weight="weight")

    return {
        n: {
            "degree": round(degree[n], 4),
            "betweenness": round(betweenness[n], 4),
            "eigenvector": round(eigenvector[n], 4),
            "pagerank": round(pagerank[n], 4),
            "type": G.nodes[n].get("type", "UNKNOWN"),
        }
        for n in G.nodes()
    }


def rank_key_players(centrality: dict, entity_types=("PERSON", "ORG"), top_n: int = 10):
    """Composite influence score (weighted blend). Only ranks people/orgs -
    phones and vehicles are evidence nodes, not "influencers" in themselves."""
    scored = []
    for node, m in centrality.items():
        if m["type"] not in entity_types:
            continue
        composite = (
            0.25 * m["degree"] +
            0.35 * m["betweenness"] +
            0.25 * m["eigenvector"] +
            0.15 * m["pagerank"]
        )
        scored.append({"entity": node, "type": m["type"], "influence_score": round(composite, 4), **m})
    scored.sort(key=lambda x: x["influence_score"], reverse=True)
    return scored[:top_n]


def detect_communities(G: nx.Graph) -> list[set]:
    """Groups entities into sub-networks (candidate cells / crews)."""
    communities = nx.algorithms.community.louvain_communities(G, weight="weight", seed=42)
    return sorted(communities, key=len, reverse=True)


def shortest_connection(G: nx.Graph, entity_a: str, entity_b: str):
    """Answers the classic investigator question: 'How is X connected to Y?'"""
    try:
        path = nx.shortest_path(G, entity_a, entity_b, weight=None)
        return path
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None


def critical_bridge_nodes(G: nx.Graph, top_n: int = 5):
    """Nodes whose removal would most fragment the network - high-value
    disruption targets or protected-witness/informant risk points."""
    betweenness = nx.betweenness_centrality(G, weight="weight")
    ranked = sorted(betweenness.items(), key=lambda x: x[1], reverse=True)
    return ranked[:top_n]
