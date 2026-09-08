"""
graph_builder.py
-----------------
Builds a typed, weighted multigraph of entities and their relationships from
co-occurrence edges. Edge weight = number of independent records that link
two entities (repeated co-occurrence = stronger evidence of a real
relationship, not just a coincidence).

In production this graph would live in a graph database (Neo4j / Amazon
Neptune / TigerGraph) so investigators can run live Cypher/Gremlin queries;
NetworkX is used here so the whole pipeline is runnable in one process for
the reference implementation, and can be swapped for a Neo4j driver behind
the same `build_graph()` interface.
"""

from __future__ import annotations
import networkx as nx
from collections import defaultdict


def build_graph(edges: list[dict]) -> nx.Graph:
    G = nx.Graph()

    for e in edges:
        s, t = e["source"], e["target"]
        if not G.has_node(s):
            G.add_node(s, type=e["source_type"])
        if not G.has_node(t):
            G.add_node(t, type=e["target_type"])

        if G.has_edge(s, t):
            G[s][t]["weight"] += 1
            G[s][t]["records"].append(e["record_id"])
            G[s][t]["dates"].append(e["date"])
        else:
            G.add_edge(s, t, weight=1, records=[e["record_id"]], dates=[e["date"]])

    return G


def graph_summary(G: nx.Graph) -> dict:
    type_counts = defaultdict(int)
    for _, data in G.nodes(data=True):
        type_counts[data.get("type", "UNKNOWN")] += 1
    return {
        "num_nodes": G.number_of_nodes(),
        "num_edges": G.number_of_edges(),
        "nodes_by_type": dict(type_counts),
        "density": round(nx.density(G), 4),
    }


def export_gexf(G: nx.Graph, path: str):
    """GEXF export lets investigators open the network directly in Gephi
    for manual exploration alongside the automated analysis. GEXF doesn't
    support list-valued attributes, so list fields (records/dates) are
    flattened to strings on a copy of the graph before writing."""
    H = G.copy()
    for _, _, data in H.edges(data=True):
        for k, v in list(data.items()):
            if isinstance(v, list):
                data[k] = ", ".join(str(x) for x in v)
    nx.write_gexf(H, path)
