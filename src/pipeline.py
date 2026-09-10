"""
pipeline.py
------------
End-to-end orchestration: ingest -> extract entities -> build graph ->
analyze network -> detect anomalies -> export investigator outputs.

Run:  python3 src/pipeline.py
"""

from __future__ import annotations
import json
import os

from ingestion import IngestionManager, JSONFileConnector
from entity_extraction import extract_entities, co_occurrence_edges, RuleBasedNER
from entity_resolution import EntityResolutionEngine
from graph_builder import build_graph, graph_summary, export_gexf
from network_analysis import (
    compute_centrality, rank_key_players, detect_communities,
    critical_bridge_nodes,
)
from anomaly_detection import (
    detect_burst_activity, detect_structuring, detect_new_entity_spikes,
    isolation_forest_outliers,
)
from visualize import export_interactive_html, plot_top_players

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "sample_records.json")
OUT_DIR = os.path.join(BASE_DIR, "output")


def run_pipeline():
    os.makedirs(OUT_DIR, exist_ok=True)

    # 1. INGESTION -----------------------------------------------------
    manager = IngestionManager()
    manager.register(JSONFileConnector(DATA_PATH))
    records = manager.collect()
    print(f"[1/6] Ingested {len(records)} records from {len({r.source for r in records})} source(s).")

    # 2. ENTITY EXTRACTION & RESOLUTION (Phase 3G) ---------------------
    extracted = extract_entities(records, backend=RuleBasedNER())
    total_entities = sum(len(r.entities) for r in extracted)
    print(f"[2/6] Extracted {total_entities} entity mentions.")

    resolution_engine = EntityResolutionEngine()
    canonical_registry = resolution_engine.resolve(extracted)
    resolution_summary = resolution_engine.get_summary()
    print(f"[2b/6] Entity Resolution: {resolution_summary['total_canonical_entities']} canonical entities, "
          f"{resolution_summary['entities_requiring_review']} flagged for review.")

    # 3. GRAPH CONSTRUCTION ----------------------------------------------
    edges = co_occurrence_edges(extracted)
    G = build_graph(edges)
    summary = graph_summary(G)
    print(f"[3/6] Built graph: {summary}")

    # 4. NETWORK ANALYSIS -------------------------------------------------
    centrality = compute_centrality(G)
    key_players = rank_key_players(centrality)
    communities = detect_communities(G)
    bridges = critical_bridge_nodes(G)
    print(f"[4/6] Identified {len(key_players)} ranked key players, "
          f"{len(communities)} communities, top bridge: "
          f"{bridges[0][0] if bridges else 'n/a'}")

    # 5. ANOMALY / PATTERN DETECTION ---------------------------------------
    anomalies = (
        detect_burst_activity(edges)
        + detect_structuring(records)
        + detect_new_entity_spikes(extracted)
        + isolation_forest_outliers(centrality)
    )
    print(f"[5/6] Flagged {len(anomalies)} suspicious pattern(s).")

    # 6. EXPORT INVESTIGATOR OUTPUTS ---------------------------------------
    influence_lookup = {p["entity"]: p["influence_score"] for p in key_players}
    export_interactive_html(G, influence_lookup, os.path.join(OUT_DIR, "network_graph.html"))
    plot_top_players(key_players, os.path.join(OUT_DIR, "top_players.png"))
    export_gexf(G, os.path.join(OUT_DIR, "network.gexf"))

    report = {
        "graph_summary": summary,
        "key_players": key_players,
        "communities": [sorted(list(c)) for c in communities],
        "critical_bridge_nodes": [{"entity": n, "betweenness": round(v, 4)} for n, v in bridges],
        "suspicious_patterns": anomalies,
        "entity_resolution": resolution_summary,
    }
    with open(os.path.join(OUT_DIR, "intelligence_report.json"), "w") as f:
        json.dump(report, f, indent=2)
    print(f"[6/6] Exported outputs to {OUT_DIR}/ "
          f"(network_graph.html, top_players.png, network.gexf, intelligence_report.json)")

    return report


if __name__ == "__main__":
    run_pipeline()
