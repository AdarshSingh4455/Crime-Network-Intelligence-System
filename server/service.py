"""
service.py
----------
Intelligence Service layer for FastAPI backend.
Wraps the existing Python intelligence engine in src/ and caches
the computed intelligence graph and analytics in memory.
"""

from __future__ import annotations
import os
import sys
import json
from typing import Dict, Any, List

# Add src/ to sys.path so existing intelligence modules are loaded directly
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(BASE_DIR, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from ingestion import IngestionManager, JSONFileConnector
from entity_extraction import extract_entities, co_occurrence_edges, RuleBasedNER
from graph_builder import build_graph, graph_summary
from network_analysis import (
    compute_centrality, rank_key_players, detect_communities,
    critical_bridge_nodes,
)
from anomaly_detection import (
    detect_burst_activity, detect_structuring, detect_new_entity_spikes,
    isolation_forest_outliers,
)

DATA_PATH = os.path.join(BASE_DIR, "data", "sample_records.json")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")


class IntelligenceService:
    _cached_data: Dict[str, Any] | None = None

    @classmethod
    def get_data(cls, force_reload: bool = False) -> Dict[str, Any]:
        """Loads and executes the intelligence engine once per session."""
        if cls._cached_data is not None and not force_reload:
            return cls._cached_data

        # 1. Ingestion
        manager = IngestionManager()
        manager.register(JSONFileConnector(DATA_PATH))
        records = manager.collect()

        # 2. Entity extraction
        extracted = extract_entities(records, backend=RuleBasedNER())
        total_entity_mentions = sum(len(r.entities) for r in extracted)

        # 3. Graph construction
        edges = co_occurrence_edges(extracted)
        G = build_graph(edges)
        summary = graph_summary(G)

        # 4. Network analysis
        centrality = compute_centrality(G)
        key_players = rank_key_players(centrality)
        communities = detect_communities(G)
        bridges = critical_bridge_nodes(G)

        # 5. Anomaly detection
        anomalies = (
            detect_burst_activity(edges)
            + detect_structuring(records)
            + detect_new_entity_spikes(extracted)
            + isolation_forest_outliers(centrality)
        )

        # Build community lookup per node
        community_map = {}
        comm_list_serializable = []
        for idx, comm in enumerate(communities):
            sorted_comm = sorted(list(comm))
            comm_list_serializable.append(sorted_comm)
            for node in comm:
                community_map[node] = idx + 1

        bridge_lookup = {b[0]: round(b[1], 4) for b in bridges}
        key_player_set = {kp["entity"] for kp in key_players}

        # Build node list for API
        nodes = []
        for node, data in G.nodes(data=True):
            c_info = centrality.get(node, {})
            entity_anomalies = [a for a in anomalies if a.get("entity") == node]
            nodes.append({
                "id": node,
                "type": data.get("type", "UNKNOWN"),
                "degree": c_info.get("degree", 0.0),
                "betweenness": c_info.get("betweenness", 0.0),
                "eigenvector": c_info.get("eigenvector", 0.0),
                "pagerank": c_info.get("pagerank", 0.0),
                "influence_score": next((kp["influence_score"] for kp in key_players if kp["entity"] == node), 0.0),
                "community": community_map.get(node, 0),
                "is_key_player": node in key_player_set,
                "is_bridge_node": node in bridge_lookup,
                "bridge_betweenness": bridge_lookup.get(node, 0.0),
                "anomaly_count": len(entity_anomalies),
            })

        # Build edge list for API
        links = []
        for u, v, d in G.edges(data=True):
            links.append({
                "source": u,
                "target": v,
                "weight": d.get("weight", 1),
                "records": d.get("records", []),
                "dates": d.get("dates", []),
            })

        # Format records
        formatted_records = [
            {
                "record_id": r.record_id,
                "source": r.source,
                "date": r.date,
                "text": r.text,
                "extracted_entities": [
                    {"text": e.text, "label": e.label}
                    for e in next((ex.entities for ex in extracted if ex.record_id == r.record_id), [])
                ]
            }
            for r in records
        ]

        cls._cached_data = {
            "summary": summary,
            "total_records": len(records),
            "total_entity_mentions": total_entity_mentions,
            "key_players": key_players,
            "communities": comm_list_serializable,
            "critical_bridge_nodes": [{"entity": n, "betweenness": round(v, 4)} for n, v in bridges],
            "suspicious_patterns": anomalies,
            "nodes": nodes,
            "links": links,
            "records": formatted_records,
            "status": "ACTIVE_INVESTIGATION",
        }
        return cls._cached_data

    @classmethod
    def get_overview(cls) -> Dict[str, Any]:
        data = cls.get_data()
        pattern_counts: Dict[str, int] = {}
        for p in data["suspicious_patterns"]:
            p_type = p.get("pattern", "unknown")
            pattern_counts[p_type] = pattern_counts.get(p_type, 0) + 1

        sources = sorted(list({r["source"] for r in data["records"]}))

        return {
            "total_records": data["total_records"],
            "total_entities": data["summary"]["num_nodes"],
            "total_relationships": data["summary"]["num_edges"],
            "suspicious_patterns_count": len(data["suspicious_patterns"]),
            "key_players_count": len(data["key_players"]),
            "communities_count": len(data["communities"]),
            "bridge_nodes_count": len(data["critical_bridge_nodes"]),
            "sources_count": len(sources),
            "sources": sources,
            "nodes_by_type": data["summary"]["nodes_by_type"],
            "density": data["summary"]["density"],
            "pattern_counts": pattern_counts,
            "top_key_players": data["key_players"][:5],
            "recent_activity": data["suspicious_patterns"][:10],
            "status": data["status"],
        }

    @classmethod
    def get_network(cls) -> Dict[str, Any]:
        data = cls.get_data()
        return {
            "nodes": data["nodes"],
            "links": data["links"],
            "communities": data["communities"],
            "summary": data["summary"],
        }

    @classmethod
    def get_entities(cls) -> List[Dict[str, Any]]:
        data = cls.get_data()
        return data["nodes"]

    @classmethod
    def get_entity_detail(cls, entity_id: str) -> Dict[str, Any] | None:
        data = cls.get_data()
        target_node = next((n for n in data["nodes"] if n["id"].lower() == entity_id.lower()), None)
        if not target_node:
            return None

        actual_id = target_node["id"]
        connected_links = [l for l in data["links"] if l["source"] == actual_id or l["target"] == actual_id]
        connected_entities = []
        for l in connected_links:
            other = l["target"] if l["source"] == actual_id else l["source"]
            connected_entities.append({
                "entity": other,
                "weight": l["weight"],
                "records": l["records"],
                "dates": l["dates"],
            })

        associated_record_ids = set()
        for l in connected_links:
            associated_record_ids.update(l["records"])

        associated_records = [
            r for r in data["records"]
            if r["record_id"] in associated_record_ids or actual_id.lower() in r["text"].lower()
        ]

        associated_anomalies = [
            a for a in data["suspicious_patterns"]
            if a.get("entity") == actual_id or a.get("record_id") in associated_record_ids
        ]

        return {
            **target_node,
            "connected_entities": connected_entities,
            "associated_records": associated_records,
            "detected_anomalies": associated_anomalies,
        }

    @classmethod
    def get_anomalies(cls) -> List[Dict[str, Any]]:
        data = cls.get_data()
        return data["suspicious_patterns"]

    @classmethod
    def get_timeline(cls) -> List[Dict[str, Any]]:
        data = cls.get_data()
        events = []
        for r in data["records"]:
            events.append({
                "id": f"rec-{r['record_id']}",
                "date": r["date"],
                "type": "CASE_RECORD",
                "title": f"Record {r['record_id']} ({r['source']})",
                "description": r["text"],
                "source": r["source"],
                "record_id": r["record_id"],
                "entities": [e["text"] for e in r.get("extracted_entities", [])],
            })
        for idx, a in enumerate(data["suspicious_patterns"]):
            if a.get("date"):
                events.append({
                    "id": f"anom-{idx}",
                    "date": a["date"],
                    "type": "SUSPICIOUS_PATTERN",
                    "title": f"Pattern: {a.get('pattern', 'Anomaly')}",
                    "description": a.get("note", ""),
                    "source": "Anomaly Engine",
                    "record_id": a.get("record_id", ""),
                    "entities": [a["entity"]] if a.get("entity") else [],
                })
        events.sort(key=lambda x: x["date"])
        return events

    @classmethod
    def get_locations(cls) -> List[Dict[str, Any]]:
        data = cls.get_data()
        loc_nodes = [n for n in data["nodes"] if n["type"] == "LOCATION"]
        result = []
        for loc in loc_nodes:
            detail = cls.get_entity_detail(loc["id"])
            if detail:
                result.append({
                    "location_name": loc["id"],
                    "type": loc["type"],
                    "degree": loc["degree"],
                    "betweenness": loc["betweenness"],
                    "connected_entities": detail["connected_entities"],
                    "associated_records": detail["associated_records"],
                    "detected_anomalies": detail["detected_anomalies"],
                })
        return result

    @classmethod
    def get_reports(cls) -> Dict[str, Any]:
        data = cls.get_data()
        return {
            "graph_summary": data["summary"],
            "key_players": data["key_players"],
            "communities": data["communities"],
            "critical_bridge_nodes": data["critical_bridge_nodes"],
            "suspicious_patterns": data["suspicious_patterns"],
        }
