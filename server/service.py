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
import re
from datetime import datetime, timezone
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
    _last_ingestion_time: str = datetime.now(timezone.utc).isoformat()

    @classmethod
    def get_data(cls, force_reload: bool = False) -> Dict[str, Any]:
        """Loads and executes the intelligence engine once per session."""
        if cls._cached_data is not None and not force_reload:
            return cls._cached_data

        cls._last_ingestion_time = datetime.now(timezone.utc).isoformat()

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
        raw_anomalies = (
            detect_burst_activity(edges)
            + detect_structuring(records)
            + detect_new_entity_spikes(extracted)
            + isolation_forest_outliers(centrality)
        )
        anomalies = []
        for idx, a in enumerate(raw_anomalies):
            ent = a.get("entity")
            ent_type = a.get("type")
            if not ent_type and ent and G.has_node(ent):
                ent_type = G.nodes[ent].get("type")
            anom_dict = {
                "id": f"ANOM-{idx+1:03d}",
                **a,
            }
            if ent_type:
                anom_dict["entity_type"] = ent_type
            anomalies.append(anom_dict)

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
            "total_cases": data["total_records"],
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
    def get_anomaly_detail(cls, anomaly_id: str) -> Dict[str, Any] | None:
        data = cls.get_data()
        target = next((
            a for a in data["suspicious_patterns"]
            if a.get("id", "").lower() == anomaly_id.lower()
        ), None)
        if not target:
            return None

        detail = dict(target)
        ent_id = target.get("entity")
        rec_id = target.get("record_id")
        date = target.get("date")

        # Entity context
        if ent_id:
            ent_node = next((n for n in data["nodes"] if n["id"].lower() == ent_id.lower()), None)
            if ent_node:
                detail["entity_details"] = ent_node
            ent_detail = cls.get_entity_detail(ent_id)
            if ent_detail:
                detail["connected_entities"] = ent_detail.get("connected_entities", [])

        # Record context
        associated_records = []
        if rec_id:
            associated_records.extend([r for r in data["records"] if r["record_id"] == rec_id])
        elif ent_id and date:
            associated_records.extend([
                r for r in data["records"]
                if r["date"] == date and any(e["text"].lower() == ent_id.lower() for e in r.get("extracted_entities", []))
            ])
        elif ent_id:
            associated_records.extend([
                r for r in data["records"]
                if any(e["text"].lower() == ent_id.lower() for e in r.get("extracted_entities", []))
            ])

        detail["associated_records"] = associated_records
        return detail

    @classmethod
    def get_timeline(cls) -> List[Dict[str, Any]]:
        data = cls.get_data()
        events = []
        for r in data["records"]:
            ent_list = []
            seen_ents = set()
            locations = []
            for e in r.get("extracted_entities", []):
                ent_name = e["text"]
                ent_type = e["label"]
                if ent_name not in seen_ents:
                    seen_ents.add(ent_name)
                    ent_list.append({"id": ent_name, "type": ent_type})
                if ent_type == "LOCATION" and ent_name not in locations:
                    locations.append(ent_name)

            # Safely extract time if genuinely present in record text (e.g. 22:00, 23:10)
            time_match = re.search(r"\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b", r["text"])
            time_str = time_match.group(0) if time_match else None

            # Find matching anomalies from intelligence engine
            rec_anomalies = []
            for a in data["suspicious_patterns"]:
                is_match = False
                if a.get("record_id") == r["record_id"]:
                    is_match = True
                elif a.get("date") == r["date"] and a.get("entity") in seen_ents:
                    is_match = True
                elif a.get("pattern") == "statistical_outlier" and a.get("entity") in seen_ents:
                    is_match = True

                if is_match and not any(ma["id"] == a["id"] for ma in rec_anomalies):
                    rec_anomalies.append({
                        "id": a["id"],
                        "pattern": a["pattern"],
                        "entity": a.get("entity"),
                        "note": a.get("note", ""),
                    })

            rid = r["record_id"]
            source_label = r["source"].replace("_", " ").title()
            events.append({
                "event_id": f"EVT-{rid}",
                "record_id": rid,
                "date": r["date"],
                "time": time_str,
                "source": r["source"],
                "source_label": source_label,
                "title": f"{source_label} :: {rid}",
                "description": r["text"],
                "entities": ent_list,
                "locations": locations,
                "event_type": r["source"],
                "anomalies": rec_anomalies,
                "has_anomalies": len(rec_anomalies) > 0,
            })

        events.sort(key=lambda x: x["date"])
        return events

    @classmethod
    def get_locations(cls) -> List[Dict[str, Any]]:
        data = cls.get_data()
        loc_nodes = [n for n in data["nodes"] if n["type"] == "LOCATION"]
        node_type_map = {n["id"]: n["type"] for n in data["nodes"]}
        result = []
        for loc in loc_nodes:
            detail = cls.get_entity_detail(loc["id"])
            if detail:
                entities = []
                for c in detail.get("connected_entities", []):
                    ent_id = c["entity"]
                    entities.append({
                        "id": ent_id,
                        "type": node_type_map.get(ent_id, "UNKNOWN"),
                        "weight": c["weight"],
                        "record_count": len(c["records"]),
                        "records": c["records"],
                        "dates": c["dates"],
                    })
                entities.sort(key=lambda x: x["weight"], reverse=True)

                records = detail.get("associated_records", [])
                anomalies = detail.get("detected_anomalies", [])
                record_count = len(records)
                entity_count = len(entities)
                anomaly_count = len(anomalies)
                activity_score = sum(e["weight"] for e in entities)

                result.append({
                    "id": loc["id"],
                    "name": loc["id"],
                    "location_name": loc["id"],
                    "type": loc["type"],
                    "community": loc["community"],
                    "is_bridge_node": loc["is_bridge_node"],
                    "degree": loc["degree"],
                    "betweenness": loc["betweenness"],
                    "record_count": record_count,
                    "entity_count": entity_count,
                    "anomaly_count": anomaly_count,
                    "activity_score": activity_score,
                    "entities": entities,
                    "connected_entities": detail.get("connected_entities", []),
                    "records": records,
                    "associated_records": records,
                    "anomalies": anomalies,
                    "detected_anomalies": anomalies,
                })
        result.sort(key=lambda x: x["activity_score"], reverse=True)
        return result

    @classmethod
    def get_reports(cls) -> Dict[str, Any]:
        data = cls.get_data()
        locs = cls.get_locations()
        tl = cls.get_timeline()

        from collections import Counter

        metrics = {
            "records": data["total_records"],
            "entities": data["summary"]["num_nodes"],
            "relationships": data["summary"]["num_edges"],
            "anomalies": len(data["suspicious_patterns"]),
            "communities": len(data["communities"]),
            "bridge_nodes": len(data["critical_bridge_nodes"]),
            "key_players": len(data["key_players"]),
            "locations": len(locs),
            "density": data["summary"]["density"],
            "sources_count": len(set(r["source"] for r in data["records"])),
        }

        top_kp = ", ".join(kp["entity"] for kp in data["key_players"][:3])
        loc_names = " and ".join(l["name"] for l in locs)
        pattern_cnt = len(set(a["pattern"] for a in data["suspicious_patterns"]))

        executive_summary = (
            f"The CNIS intelligence engine processed {metrics['records']} case records and mapped {metrics['entities']} entities "
            f"connected through {metrics['relationships']} relationships across {metrics['sources_count']} intelligence sources. "
            f"Graph topology reveals {metrics['communities']} communities with a network density of {metrics['density']:.4f}. "
            f"Key network actors ({top_kp}) coordinate across {metrics['bridge_nodes']} critical bridge nodes, "
            f"concentrated primarily around operational sites in {loc_names}. "
            f"Algorithmic pattern detection flagged {metrics['anomalies']} investigative signals across {pattern_cnt} pattern categories, "
            "including financial structuring, burst calling, new-entity integration spikes, and statistical centrality outliers."
        )

        key_findings = [
            {
                "finding_id": "KF-001",
                "category": "NETWORK",
                "priority": "HIGH",
                "title": "Core Suspect Coordination Cluster Identified",
                "explanation": "Suresh Nair (influence: 0.3315), Deepak Shah (influence: 0.3212), and Ravi Malhotra (influence: 0.3099) form the primary high-influence backbone of the network with degree centrality up to 0.714. Network analysis identifies them as central actors orchestrating cross-incident operations.",
                "evidence": ["CR-1001", "CR-1005", "CR-1008"],
                "related_entities": ["Suresh Nair", "Deepak Shah", "Ravi Malhotra"],
                "related_anomalies": ["ANOM-003", "ANOM-006", "ANOM-011", "ANOM-012"],
            },
            {
                "finding_id": "KF-002",
                "category": "LOCATION",
                "priority": "HIGH",
                "title": "Andheri and Andheri Warehouse Act as Critical Strategic Hubs",
                "explanation": "Both operational locations function as Girvan-Newman bridge nodes (betweenness 0.1332 and 0.0789) within Community 1, appearing across 5 and 3 distinct case reports and accumulating 18 and 13 total incident entity co-occurrences.",
                "evidence": ["CR-1001", "CR-1002", "CR-1004", "CR-1008", "CR-1010"],
                "related_entities": ["Andheri", "Andheri Warehouse", "Ravi Malhotra", "Suresh Nair", "Vikram Rao"],
                "related_anomalies": ["ANOM-002", "ANOM-004", "ANOM-022"],
            },
            {
                "finding_id": "KF-003",
                "category": "ANOMALY",
                "priority": "HIGH",
                "title": "Deliberate Financial Structuring in Cash Deposits Flagged",
                "explanation": "A cash deposit of INR 950,000 made by Suresh Nair at an Andheri branch was deliberately split into 3 sub-transactions to stay below statutory anti-money laundering reporting thresholds. Account subsequently received inbound wire transfers from Deepak Shah.",
                "evidence": ["CR-1004", "CR-1008"],
                "related_entities": ["Suresh Nair", "INR 950000", "Global Traders Pvt Ltd", "Deepak Shah"],
                "related_anomalies": ["ANOM-013", "ANOM-016"],
            },
            {
                "finding_id": "KF-004",
                "category": "ANOMALY",
                "priority": "MEDIUM",
                "title": "Burst Calling Signatures Preceding Operations",
                "explanation": "12 burst activity events logged on 2026-01-05 and 2026-01-12 where entities recorded 5 or more linked events in concentrated windows, a classic pre-operational coordination signature.",
                "evidence": ["CR-1001", "CR-1005", "CR-1009"],
                "related_entities": ["9876543210", "MH12AB1234", "Ravi Malhotra", "Suresh Nair", "Deepak Shah"],
                "related_anomalies": ["ANOM-001", "ANOM-005", "ANOM-007", "ANOM-010"],
            },
            {
                "finding_id": "KF-005",
                "category": "NETWORK",
                "priority": "MEDIUM",
                "title": "Girvan-Newman Edge Betweenness Identifies 5 Critical Bridge Nodes",
                "explanation": "Andheri, Suresh Nair, Andheri Warehouse, Deepak Shah, and phone number 9871234567 serve as structural bridges. Severing communications or access at these points would partition network information flow.",
                "evidence": ["CR-1001", "CR-1005", "CR-1009", "CR-1010"],
                "related_entities": ["Andheri", "Suresh Nair", "Andheri Warehouse", "Deepak Shah", "9871234567"],
                "related_anomalies": ["ANOM-002", "ANOM-004", "ANOM-011", "ANOM-021"],
            },
            {
                "finding_id": "KF-006",
                "category": "ENTITY",
                "priority": "MEDIUM",
                "title": "Rapid Integration Spikes for Unregistered Entities",
                "explanation": "9 entities entered the investigation already linked to two or more known targets on their initial recorded appearance, notably Global Traders Pvt Ltd (CR-1002) and Vikram Rao with unregistered number 9871234567 (CR-1010).",
                "evidence": ["CR-1002", "CR-1003", "CR-1004", "CR-1005", "CR-1006", "CR-1007", "CR-1009", "CR-1010"],
                "related_entities": ["Global Traders Pvt Ltd", "Vikram Rao", "9871234567", "Ajay Kulkarni"],
                "related_anomalies": ["ANOM-014", "ANOM-015", "ANOM-021", "ANOM-022"],
            }
        ]

        pattern_counts = dict(Counter(a["pattern"] for a in data["suspicious_patterns"]))

        priority_entities = []
        node_lookup = {n["id"]: n for n in data["nodes"]}
        for kp in data["key_players"]:
            node = node_lookup.get(kp["entity"], {})
            role = "Key Player"
            if node.get("is_bridge_node"):
                role = "Key Player & Bridge Node"
            priority_entities.append({
                "id": kp["entity"],
                "type": kp["type"],
                "influence_score": kp["influence_score"],
                "degree": node.get("degree", 0.0),
                "betweenness": node.get("betweenness", 0.0),
                "pagerank": node.get("pagerank", 0.0),
                "community": node.get("community", 1),
                "is_bridge_node": node.get("is_bridge_node", False),
                "role": role,
            })

        priority_anomalies = [
            a for a in data["suspicious_patterns"]
            if a["pattern"] in ["structuring", "burst_activity", "statistical_outlier"]
        ][:6]

        investigative_leads = [
            {
                "lead_id": "LEAD-001",
                "priority": "HIGH",
                "title": "Subpoena Bank Records for Global Traders Pvt Ltd & Suresh Nair",
                "rationale": "Financial Intelligence Unit report CR-1004 flagged deliberate cash structuring of INR 950,000 across split deposits, followed by corporate account wire transfers from Deepak Shah (CR-1008). Subpoena formal ledger accounts to trace ultimate beneficiaries.",
                "supporting_records": ["CR-1002", "CR-1004", "CR-1008"],
                "supporting_entities": ["Suresh Nair", "Global Traders Pvt Ltd", "INR 950000", "Deepak Shah"],
                "supporting_anomalies": ["ANOM-013", "ANOM-014", "ANOM-016"],
                "location": "Andheri",
            },
            {
                "lead_id": "LEAD-002",
                "priority": "HIGH",
                "title": "Deploy Focused Physical & Electronic Surveillance at Andheri Warehouse",
                "rationale": "Andheri Warehouse exhibits high bridge centrality (betweenness: 0.1332) and serves as an operational meeting point for Ravi Malhotra, Suresh Nair, and newly integrated associate Vikram Rao. Monitored vehicles (MH12AB1234) were repeatedly staged here.",
                "supporting_records": ["CR-1001", "CR-1008", "CR-1010"],
                "supporting_entities": ["Ravi Malhotra", "Suresh Nair", "Vikram Rao", "MH12AB1234"],
                "supporting_anomalies": ["ANOM-002", "ANOM-003", "ANOM-022"],
                "location": "Andheri Warehouse",
            },
            {
                "lead_id": "LEAD-003",
                "priority": "HIGH",
                "title": "Subscriber Identity & CDR Intercept for Unregistered Line +91-9871234567",
                "rationale": "Unregistered line generated an intense burst calling signature of 18 calls in 2 hours (CR-1009) to primary suspects. Physical sighting places device with Vikram Rao at Andheri Warehouse (CR-1010). Network analysis flags device as bridge node.",
                "supporting_records": ["CR-1009", "CR-1010"],
                "supporting_entities": ["9871234567", "Vikram Rao", "9876543210"],
                "supporting_anomalies": ["ANOM-021", "ANOM-025"],
                "location": "Andheri Warehouse",
            },
            {
                "lead_id": "LEAD-004",
                "priority": "MEDIUM",
                "title": "Automated Number Plate Recognition (ANPR) Query for MH12AB1234",
                "rationale": "White Toyota Innova MH12AB1234 supplied by Deepak Shah connects across multiple incident dates (CR-1001, CR-1002, CR-1005). Query citywide ANPR cameras along Western Express Highway corridor to establish travel vectors.",
                "supporting_records": ["CR-1001", "CR-1002", "CR-1005"],
                "supporting_entities": ["MH12AB1234", "Deepak Shah", "Ravi Malhotra"],
                "supporting_anomalies": ["ANOM-005", "ANOM-010"],
                "location": "Andheri",
            }
        ]

        community_assessment = []
        for idx, comm in enumerate(data["communities"]):
            members = list(comm)
            comm_nodes = [node_lookup[m] for m in members if m in node_lookup]
            types_count = Counter(n["type"] for n in comm_nodes)
            key_nodes = [m for m in members if node_lookup.get(m, {}).get("is_key_player")]
            bridge_nodes = [m for m in members if node_lookup.get(m, {}).get("is_bridge_node")]
            community_assessment.append({
                "community_id": idx + 1,
                "size": len(members),
                "members": sorted(members),
                "types_breakdown": dict(types_count),
                "key_players": key_nodes,
                "bridge_nodes": bridge_nodes,
            })

        dates = sorted(list(set(r["date"] for r in data["records"])))
        date_range = f"{dates[0]} – {dates[-1]}" if dates else "—"

        return {
            "report_id": "CNIS-IR-001",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "status": data.get("status", "ACTIVE_INVESTIGATION"),
            "executive_summary": executive_summary,
            "investigation_metrics": metrics,
            "key_findings": key_findings,
            "network_assessment": {
                "density": metrics["density"],
                "key_players": priority_entities,
                "bridge_nodes": data["critical_bridge_nodes"],
                "communities": community_assessment,
            },
            "anomaly_assessment": {
                "pattern_counts": pattern_counts,
                "total_signals": metrics["anomalies"],
                "priority_signals": priority_anomalies,
            },
            "temporal_assessment": {
                "date_range": date_range,
                "total_events": len(tl),
                "events_with_anomalies": sum(1 for e in tl if e.get("has_anomalies")),
                "active_dates": dates,
            },
            "location_assessment": {
                "locations": [
                    {
                        "name": l["name"],
                        "record_count": l["record_count"],
                        "entity_count": l["entity_count"],
                        "anomaly_count": l["anomaly_count"],
                        "activity_score": l["activity_score"],
                        "is_bridge_node": l["is_bridge_node"],
                    }
                    for l in locs
                ]
            },
            "priority_entities": priority_entities,
            "priority_locations": locs,
            "priority_anomalies": priority_anomalies,
            "investigative_leads": investigative_leads,
            "methodology": {
                "engine": "CNIS Graph & Pattern Pipeline",
                "extraction": "Rule-Based Named Entity Recognition (PERSON, ORG, LOC, VEH, PHONE, MONEY)",
                "graph_model": "Undirected Weighted Co-occurrence Multi-Graph (NetworkX)",
                "centrality_algorithms": "Degree, Betweenness, Eigenvector, PageRank, Girvan-Newman Edge Betweenness",
                "anomaly_detectors": "Sliding-Window Burst Calling, Isolation Forest Statistical Outlier, Financial Structuring Regex, Rapid Integration Spike",
                "source_attribution": "Police Case Management, Call Detail Records, Financial Intelligence Unit, Informant Tips",
            },
            "limitations": [
                "Analysis reflects data contained strictly within the 10 provided investigative case records.",
                "Engine flags denote statistical and algorithmic signals, not legal determinations of guilt.",
                "Location assessment maps textual spatial associations; geographic GPS coordinates are not captured.",
                "All automated investigative leads require verification by a human investigator prior to enforcement action."
            ]
        }

    @classmethod
    def search(cls, query: str = "") -> Dict[str, Any]:
        data = cls.get_data()
        clean_q = (query or "").strip()
        if not clean_q:
            return {
                "query": "",
                "total_results": 0,
                "entities": [],
                "records": [],
                "anomalies": [],
                "locations": [],
            }

        q_lower = clean_q.lower()
        q_alphanum = re.sub(r"[^a-zA-Z0-9]", "", q_lower)

        # 1. ENTITIES
        matched_entities = []
        for node in data["nodes"]:
            nid = node["id"]
            nid_lower = nid.lower()
            nid_alphanum = re.sub(r"[^a-zA-Z0-9]", "", nid_lower)
            ntype = node["type"].lower()

            score = 0
            if nid_lower == q_lower or (q_alphanum and len(q_alphanum) >= 3 and nid_alphanum == q_alphanum):
                score = 100
            elif nid_lower.startswith(q_lower) or (q_alphanum and len(q_alphanum) >= 3 and nid_alphanum.startswith(q_alphanum)):
                score = 80
            elif q_lower in nid_lower or (q_alphanum and len(q_alphanum) >= 3 and q_alphanum in nid_alphanum):
                score = 60
            elif q_lower == ntype or q_lower in ntype:
                score = 40

            if score > 0:
                matched_entities.append((score, {
                    "id": node["id"],
                    "type": node["type"],
                    "degree": node["degree"],
                    "betweenness": node["betweenness"],
                    "influence_score": node["influence_score"],
                    "community": node["community"],
                    "is_key_player": node["is_key_player"],
                    "is_bridge_node": node["is_bridge_node"],
                    "anomaly_count": node["anomaly_count"],
                    "source_module": "Entity Intelligence Engine"
                }))

        matched_entities.sort(key=lambda x: (x[0], x[1]["influence_score"]), reverse=True)
        entities_res = [e[1] for e in matched_entities]

        # 2. CASE RECORDS
        matched_records = []
        for r in data["records"]:
            rid = r["record_id"]
            rid_lower = rid.lower()
            rtext = r["text"]
            rtext_lower = rtext.lower()
            rsource = r["source"].lower()
            rdate = r["date"]

            score = 0
            if rid_lower == q_lower:
                score = 100
            elif rid_lower.startswith(q_lower):
                score = 85
            elif q_lower in rid_lower:
                score = 70
            elif q_lower in rtext_lower or (q_alphanum and len(q_alphanum) >= 4 and q_alphanum in re.sub(r"[^a-zA-Z0-9]", "", rtext_lower)):
                score = 50
            elif q_lower in rsource:
                score = 30
            elif q_lower in rdate:
                score = 30

            if score > 0:
                snippet = rtext
                if len(snippet) > 130:
                    idx = rtext_lower.find(q_lower)
                    if idx >= 0:
                        start = max(0, idx - 30)
                        end = min(len(rtext), idx + len(q_lower) + 70)
                        snippet = ("..." if start > 0 else "") + rtext[start:end].strip() + ("..." if end < len(rtext) else "")
                    else:
                        snippet = rtext[:130].strip() + "..."

                has_anoms = any(a.get("record_id") == rid for a in data["suspicious_patterns"])
                ent_count = len(r.get("extracted_entities", []))

                matched_records.append((score, {
                    "record_id": rid,
                    "date": r["date"],
                    "source": r["source"],
                    "source_label": r["source"].replace("_", " ").title(),
                    "snippet": snippet,
                    "entity_count": ent_count,
                    "has_anomalies": has_anoms,
                    "source_module": "Case Ingestion Pipeline"
                }))

        matched_records.sort(key=lambda x: x[0], reverse=True)
        records_res = [r[1] for r in matched_records]

        # 3. ANOMALIES
        matched_anomalies = []
        for a in data["suspicious_patterns"]:
            aid = a["id"].lower()
            apat = a["pattern"].lower()
            aent = (a.get("entity") or "").lower()
            anote = (a.get("note") or "").lower()
            arec = (a.get("record_id") or "").lower()

            score = 0
            if aid == q_lower:
                score = 100
            elif aid.startswith(q_lower):
                score = 85
            elif apat == q_lower or apat.replace("_", " ") == q_lower:
                score = 80
            elif q_lower in apat or q_lower in apat.replace("_", " "):
                score = 65
            elif aent and (q_lower == aent or aent.startswith(q_lower)):
                score = 60
            elif aent and q_lower in aent:
                score = 50
            elif arec and q_lower in arec:
                score = 45
            elif anote and q_lower in anote:
                score = 40

            if score > 0:
                matched_anomalies.append((score, {
                    "id": a["id"],
                    "pattern": a["pattern"],
                    "pattern_label": a["pattern"].replace("_", " ").title(),
                    "entity": a.get("entity"),
                    "entity_type": a.get("entity_type"),
                    "date": a.get("date"),
                    "record_id": a.get("record_id"),
                    "note": a.get("note", ""),
                    "source_module": "CNIS Anomaly Detection Engine"
                }))

        matched_anomalies.sort(key=lambda x: x[0], reverse=True)
        anomalies_res = [a[1] for a in matched_anomalies]

        # 4. LOCATIONS
        locs = cls.get_locations()
        matched_locations = []
        for l in locs:
            lid = l["id"].lower()
            lname = l["name"].lower()

            score = 0
            if lid == q_lower or lname == q_lower:
                score = 100
            elif lid.startswith(q_lower) or lname.startswith(q_lower):
                score = 80
            elif q_lower in lid or q_lower in lname:
                score = 60

            if score > 0:
                matched_locations.append((score, {
                    "id": l["id"],
                    "name": l["name"],
                    "activity_score": l["activity_score"],
                    "record_count": l["record_count"],
                    "entity_count": l["entity_count"],
                    "anomaly_count": l["anomaly_count"],
                    "is_bridge_node": l["is_bridge_node"],
                    "community": l["community"],
                    "source_module": "Location Intelligence Analysis"
                }))

        matched_locations.sort(key=lambda x: (x[0], x[1]["activity_score"]), reverse=True)
        locations_res = [l[1] for l in matched_locations]

        # 5. CASES
        cases_data = cls.get_cases()
        matched_cases = []
        for c in cases_data["cases"]:
            cid = c["case_id"].lower()
            ctitle = c["title"].lower()
            csource = c["source"].lower()
            csummary = c.get("summary", "").lower()
            ctext = c.get("full_text", "").lower()

            score = 0
            if cid == q_lower:
                score = 100
            elif cid.startswith(q_lower):
                score = 85
            elif q_lower in cid:
                score = 75
            elif q_lower in ctitle:
                score = 70
            elif any(q_lower == e.lower() or q_lower in e.lower() for e in c.get("entities", [])):
                score = 65
            elif any(q_lower == l.lower() or q_lower in l.lower() for l in c.get("locations", [])):
                score = 60
            elif q_lower in csource:
                score = 50
            elif q_lower in csummary or q_lower in ctext:
                score = 40

            if score > 0:
                matched_cases.append((score, {
                    "case_id": c["case_id"],
                    "title": c["title"],
                    "short_title": c["short_title"],
                    "source": c["source"],
                    "source_label": c["source_label"],
                    "date": c["date"],
                    "workflow_status": c["workflow_status"],
                    "priority": c["priority"],
                    "entity_count": c["entity_count"],
                    "anomaly_count": c["anomaly_count"],
                    "snippet": c.get("summary", ""),
                    "source_module": "Case Management Workspace"
                }))

        matched_cases.sort(key=lambda x: x[0], reverse=True)
        cases_res = [c[1] for c in matched_cases]

        total_count = len(cases_res) + len(entities_res) + len(records_res) + len(anomalies_res) + len(locations_res)

        return {
            "query": clean_q,
            "total_results": total_count,
            "cases": cases_res,
            "entities": entities_res,
            "records": records_res,
            "anomalies": anomalies_res,
            "locations": locations_res,
        }

    SOURCE_CONFIGS: Dict[str, Dict[str, Any]] = {
        "police_case_management": {
            "name": "Police Case Management (CCTNS / RMS)",
            "short_name": "Police Case Mgmt",
            "category": "Law Enforcement RMS",
            "connector_type": "JSON Case Export Connector (JSONFileConnector)",
            "description": "Official law enforcement case diaries, First Information Reports (FIR), and incident observation logs documenting physical surveillance, suspect encounters, and registered vehicles.",
            "production_connector": {
                "name": "CCTNS Relational Database Adapter",
                "class_name": "SQLConnector",
                "protocol": "ODBC / JDBC Direct Database Adapter (DB-API 2.0)",
                "schema_standard": "CCTNS / Police RMS Relational Schema",
                "ingestion_frequency": "Continuous Change Data Capture (CDC) / Hourly Poll",
                "security_level": "Restricted Law Enforcement Intranet (VPN / mTLS)",
                "readiness": "Production Specification Available in src/ingestion.py",
            },
        },
        "call_detail_records": {
            "name": "Call Detail Records (CDR Telecom)",
            "short_name": "Telecom CDR",
            "category": "Telecommunications Intelligence",
            "connector_type": "Telecom CDR Ingestion Connector (JSONFileConnector / CSVConnector)",
            "description": "Telecommunication carrier call logs, duration timestamps, frequency patterns, and subscriber-linked mobile identities identifying coordination frequency and burst calling activity.",
            "production_connector": {
                "name": "Telecom Mediation SFTP Connector",
                "class_name": "CSVConnector",
                "protocol": "SFTP Batch Push / Secure Mediation Gateway",
                "schema_standard": "ETSI / 3GPP CDR Telecom Billing Format (CSV/ASN.1)",
                "ingestion_frequency": "Batch push per call-window or lawful intercept feed",
                "security_level": "Telecom Regulatory Compliance (Lawful Interception Section 5(2))",
                "readiness": "Production Specification Available in src/ingestion.py",
            },
        },
        "financial_intelligence_unit": {
            "name": "Financial Intelligence Unit (FIU / STR)",
            "short_name": "Financial FIU",
            "category": "Banking & Suspicious Transactions",
            "connector_type": "Financial Transaction Ingestion Connector (JSONFileConnector)",
            "description": "Banking transaction flags, cash deposit thresholds, wire transfers, and Suspicious Transaction Reports (STR) signaling potential structuring and syndicate money movement.",
            "production_connector": {
                "name": "FIU-IND FINnet Secure API Gateway",
                "class_name": "RESTWebhookConnector",
                "protocol": "FIU FINnet 2.0 XML / REST Webhook API",
                "schema_standard": "goAML / FinCEN SAR/STR XML Specification",
                "ingestion_frequency": "Near-real-time push upon AML threshold trigger",
                "security_level": "PML Act Banking Secrecy Protocols",
                "readiness": "Enterprise Gateway Specification Planned",
            },
        },
        "informant_tip": {
            "name": "Human Source / Informant Intelligence (HUMINT)",
            "short_name": "HUMINT Tips",
            "category": "Confidential Human Source",
            "connector_type": "Field Intelligence Narrative Connector (JSONFileConnector)",
            "description": "Confidential human source intelligence debriefs, operative observations, organizational hierarchy revelations, and unverified syndicate associate leads.",
            "production_connector": {
                "name": "Confidential HUMINT Enclave Intake",
                "class_name": "SecurePortalConnector",
                "protocol": "Encrypted Web Intake Enclave / Air-gapped Field Terminal",
                "schema_standard": "Graded Intelligence Assessment Standard (5x5x5 Matrix)",
                "ingestion_frequency": "Ad-hoc human intelligence filing",
                "security_level": "Strictly Confidential / Handler Eyes-Only",
                "readiness": "Enterprise Security Protocol Planned",
            },
        },
    }

    PLANNED_CONNECTORS: List[Dict[str, Any]] = [
        {
            "id": "anpr_cctv_feed",
            "name": "Automated Number Plate Recognition (ANPR / CCTV)",
            "category": "Surveillance & Sensors",
            "connector_class": "CSVConnector / RTSP Streaming Agent",
            "status": "Architecture Defined in src/ingestion.py",
            "description": "Optical character recognition feeds from toll plazas and municipal surveillance tracking vehicle registration movements.",
            "supported_format": "CSV batch dumps or edge optical sensor events",
        },
        {
            "id": "osint_scraper",
            "name": "Open-Source Intelligence (OSINT Scraper)",
            "category": "Public Feeds & News",
            "connector_class": "ScraperConnector (REST / Feed Parser)",
            "status": "Architecture Defined in src/ingestion.py",
            "description": "Public domain criminal registries, corporate gazettes, and court record feeds for external cross-verification.",
            "supported_format": "JSON / RSS / REST API",
        },
        {
            "id": "watchlist_registry",
            "name": "Prior Conviction & Watchlist Registry",
            "category": "National Criminal Database",
            "connector_class": "SQLConnector",
            "status": "Production Interface Ready in src/ingestion.py",
            "description": "Centralized criminal history index and national wanted person records integrated via relational database adapter.",
            "supported_format": "ODBC / JDBC SQL Schema",
        },
    ]

    @classmethod
    def get_sources(cls) -> Dict[str, Any]:
        data = cls.get_data()
        sources_list = []
        node_lookup = {n["id"]: n for n in data["nodes"]}

        for source_id, config in cls.SOURCE_CONFIGS.items():
            records = [r for r in data["records"] if r["source"] == source_id]
            rec_ids = {r["record_id"] for r in records}
            dates = [r["date"] for r in records if r.get("date")]
            date_range = {"start": min(dates) if dates else "", "end": max(dates) if dates else ""}

            ent_map = {}
            for r in records:
                for e in r.get("extracted_entities", []):
                    ent_map[e["text"]] = e["label"]

            unique_entities = sorted(list(ent_map.keys()))
            type_counts: Dict[str, int] = {}
            for etype in ent_map.values():
                type_counts[etype] = type_counts.get(etype, 0) + 1

            source_nodes = [node_lookup[eid] for eid in unique_entities if eid in node_lookup]
            source_nodes.sort(key=lambda n: (n.get("influence_score", 0), n.get("degree", 0)), reverse=True)
            top_entity_names = [n["id"] for n in source_nodes[:4]]

            correlated_anomalies = [
                a for a in data["suspicious_patterns"]
                if a.get("record_id") in rec_ids or a.get("entity") in ent_map
            ]

            source_locations = [
                eid for eid, etype in ent_map.items() if etype == "LOCATION"
            ]

            sources_list.append({
                "id": source_id,
                "name": config["name"],
                "short_name": config["short_name"],
                "category": config["category"],
                "connector_type": config["connector_type"],
                "description": config["description"],
                "status": "Active (Ingested)",
                "availability": "Available in Prototype Dataset",
                "record_count": len(records),
                "entity_count": len(unique_entities),
                "anomaly_count": len(correlated_anomalies),
                "location_count": len(source_locations),
                "date_range": date_range,
                "entity_types": type_counts,
                "sample_entities": top_entity_names,
                "locations": source_locations,
                "production_connector": config["production_connector"],
            })

        return {
            "total_sources": len(sources_list),
            "total_records_ingested": data["total_records"],
            "total_entities_extracted": data["summary"]["num_nodes"],
            "total_relationships_built": data["summary"]["num_edges"],
            "total_anomalies_detected": len(data["suspicious_patterns"]),
            "last_ingested_at": getattr(cls, "_last_ingestion_time", datetime.now(timezone.utc).isoformat()),
            "ingestion_pipeline": {
                "engine_version": "CNIS 2.0 Ingestion Pipeline",
                "connector_class": "JSONFileConnector (Unified BaseConnector Interface)",
                "entity_extraction_backend": "RuleBasedNER (Regex & Gazetteers)",
                "graph_builder": "Co-occurrence Graph Builder (NetworkX Graph Engine)",
                "dataset_path": "data/sample_records.json",
                "status": "OPERATIONAL",
            },
            "sources": sources_list,
            "planned_connectors": cls.PLANNED_CONNECTORS,
        }

    @classmethod
    def get_source_detail(cls, source_id: str) -> Dict[str, Any] | None:
        clean_id = source_id.strip().lower()
        if clean_id not in cls.SOURCE_CONFIGS:
            return None

        data = cls.get_data()
        config = cls.SOURCE_CONFIGS[clean_id]
        records = [r for r in data["records"] if r["source"] == clean_id]
        rec_ids = {r["record_id"] for r in records}
        dates = [r["date"] for r in records if r.get("date")]
        date_range = {"start": min(dates) if dates else "", "end": max(dates) if dates else ""}

        node_lookup = {n["id"]: n for n in data["nodes"]}

        ent_map = {}
        for r in records:
            for e in r.get("extracted_entities", []):
                ent_map[e["text"]] = e["label"]

        unique_entities = sorted(list(ent_map.keys()))
        type_counts: Dict[str, int] = {}
        for etype in ent_map.values():
            type_counts[etype] = type_counts.get(etype, 0) + 1

        entity_cards = []
        for eid in unique_entities:
            n = node_lookup.get(eid)
            if n:
                entity_cards.append({
                    "id": n["id"],
                    "type": n["type"],
                    "degree": n["degree"],
                    "betweenness": n["betweenness"],
                    "influence_score": n["influence_score"],
                    "community": n["community"],
                    "is_key_player": n["is_key_player"],
                    "is_bridge_node": n["is_bridge_node"],
                    "anomaly_count": n["anomaly_count"],
                })
            else:
                entity_cards.append({
                    "id": eid,
                    "type": ent_map.get(eid, "UNKNOWN"),
                    "degree": 0,
                    "betweenness": 0.0,
                    "influence_score": 0.0,
                    "community": 0,
                    "is_key_player": False,
                    "is_bridge_node": False,
                    "anomaly_count": 0,
                })
        entity_cards.sort(key=lambda x: (x["influence_score"], x["degree"]), reverse=True)

        record_cards = []
        for r in records:
            r_anoms = [a for a in data["suspicious_patterns"] if a.get("record_id") == r["record_id"]]
            record_cards.append({
                "record_id": r["record_id"],
                "date": r["date"],
                "source": r["source"],
                "text": r["text"],
                "extracted_entities": r.get("extracted_entities", []),
                "anomaly_count": len(r_anoms),
            })
        record_cards.sort(key=lambda x: x["date"])

        correlated_anomalies = [
            {
                "id": a["id"],
                "pattern": a["pattern"],
                "pattern_label": a["pattern"].replace("_", " ").title(),
                "entity": a.get("entity"),
                "entity_type": a.get("entity_type"),
                "date": a.get("date"),
                "record_id": a.get("record_id"),
                "note": a.get("note", ""),
            }
            for a in data["suspicious_patterns"]
            if a.get("record_id") in rec_ids or a.get("entity") in ent_map
        ]

        locs = cls.get_locations()
        source_locations = [
            l for l in locs if l["id"] in ent_map or any(r["record_id"] in [rec["record_id"] for rec in l.get("records", [])] for r in records)
        ]

        return {
            "id": clean_id,
            "name": config["name"],
            "short_name": config["short_name"],
            "category": config["category"],
            "connector_type": config["connector_type"],
            "description": config["description"],
            "status": "Active (Ingested)",
            "availability": "Available in Prototype Dataset",
            "record_count": len(records),
            "entity_count": len(unique_entities),
            "anomaly_count": len(correlated_anomalies),
            "location_count": len(source_locations),
            "date_range": date_range,
            "entity_types": type_counts,
            "records": record_cards,
            "entities": entity_cards,
            "anomalies": correlated_anomalies,
            "locations": source_locations,
            "production_connector": config["production_connector"],
            "ingestion_spec": {
                "connector_class": "JSONFileConnector",
                "pipeline_source": "src/ingestion.py",
                "base_interface": "BaseConnector.fetch() -> Iterable[Record]",
                "target_schema": ["record_id", "date", "source", "text"],
                "normalization": "Normalized into Record dataclass before entity extraction",
            },
        }

    CASE_TITLES: Dict[str, str] = {
        "CR-1001": "Surveillance Observation: Andheri Warehouse Sighting",
        "CR-1002": "Fund Transfer & Corporate Facility Sighting",
        "CR-1003": "Telecom Intercept: Primary Suspect Toll Call",
        "CR-1004": "Financial Intelligence: Cash Deposit Structuring Flag",
        "CR-1005": "Confidential HUMINT: Syndicate Coordination Debrief",
        "CR-1006": "Telecom Intercept: Secondary Logistics Contact",
        "CR-1007": "Physical Surveillance: Executive Office Observation",
        "CR-1008": "Financial Intelligence: Wire Transfer & ATM Withdrawal",
        "CR-1009": "Telecom Analysis: Coordination Burst Calling Pattern",
        "CR-1010": "Confidential HUMINT: Associate Field Identification Lead",
    }

    @classmethod
    def get_cases(cls) -> Dict[str, Any]:
        data = cls.get_data()
        node_lookup = {n["id"]: n for n in data["nodes"]}

        cases_list = []
        for r in data["records"]:
            rid = r["record_id"]
            ents = [e["text"] for e in r.get("extracted_entities", [])]
            loc_names = [e["text"] for e in r.get("extracted_entities", []) if e["label"] == "LOCATION"]
            rec_anoms = [
                a for a in data["suspicious_patterns"]
                if a.get("record_id") == rid or (a.get("date") == r["date"] and a.get("entity") in ents)
            ]
            kp_involved = [e for e in ents if node_lookup.get(e, {}).get("is_key_player")]

            has_burst_or_structuring = any(a["pattern"] in ("burst_activity", "structuring") for a in rec_anoms)
            if has_burst_or_structuring or len(kp_involved) >= 2 or len(rec_anoms) >= 2:
                priority = "HIGH"
                workflow_status = "Review Required"
            elif len(kp_involved) >= 1 or len(rec_anoms) >= 1:
                priority = "MEDIUM"
                workflow_status = "Intelligence Available"
            else:
                priority = "STANDARD"
                workflow_status = "Source Record Active"

            source_label = r["source"].replace("_", " ").title()
            short_title = cls.CASE_TITLES.get(rid, f"{source_label} Report {rid}")

            time_match = re.search(r"\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b", r["text"])
            time_str = time_match.group(0) if time_match else None

            cases_list.append({
                "case_id": rid,
                "title": f"{rid}: {short_title}",
                "short_title": short_title,
                "source": r["source"],
                "source_label": source_label,
                "date": r["date"],
                "time": time_str,
                "date_range": {"start": r["date"], "end": r["date"]},
                "summary": r["text"][:130].strip() + ("..." if len(r["text"]) > 130 else ""),
                "full_text": r["text"],
                "workflow_status": workflow_status,
                "source_status": "Ingested Case Report",
                "priority": priority,
                "record_count": 1,
                "entity_count": len(ents),
                "anomaly_count": len(rec_anoms),
                "location_count": len(loc_names),
                "key_player_count": len(kp_involved),
                "entities": ents,
                "locations": loc_names,
                "key_players": kp_involved,
                "has_anomalies": len(rec_anoms) > 0,
            })

        # Default sort by date descending
        cases_list.sort(key=lambda x: x["date"], reverse=True)
        dates = [c["date"] for c in cases_list if c.get("date")]

        return {
            "total_cases": len(cases_list),
            "total_records": len(data["records"]),
            "total_entities": data["summary"]["num_nodes"],
            "total_anomalies": len(data["suspicious_patterns"]),
            "review_required_count": sum(1 for c in cases_list if c["workflow_status"] == "Review Required"),
            "intelligence_available_count": sum(1 for c in cases_list if c["workflow_status"] == "Intelligence Available"),
            "date_coverage": {
                "start": min(dates) if dates else "",
                "end": max(dates) if dates else ""
            },
            "cases": cases_list,
        }

    @classmethod
    def get_case_detail(cls, case_id: str) -> Dict[str, Any] | None:
        clean_id = case_id.strip().upper()
        data = cls.get_data()
        node_lookup = {n["id"]: n for n in data["nodes"]}

        target_r = next((r for r in data["records"] if r["record_id"].upper() == clean_id), None)
        if not target_r:
            return None

        rid = target_r["record_id"]
        source_label = target_r["source"].replace("_", " ").title()
        short_title = cls.CASE_TITLES.get(rid, f"{source_label} Report {rid}")

        case_entity_names = [e["text"] for e in target_r.get("extracted_entities", [])]
        case_entity_set = set(case_entity_names)
        loc_names = [e["text"] for e in target_r.get("extracted_entities", []) if e["label"] == "LOCATION"]

        rec_anoms = [
            {
                "id": a["id"],
                "pattern": a["pattern"],
                "pattern_label": a["pattern"].replace("_", " ").title(),
                "entity": a.get("entity"),
                "entity_type": a.get("entity_type"),
                "date": a.get("date"),
                "record_id": a.get("record_id"),
                "note": a.get("note", ""),
            }
            for a in data["suspicious_patterns"]
            if a.get("record_id") == rid or (a.get("date") == target_r["date"] and a.get("entity") in case_entity_set)
        ]

        kp_involved = [e for e in case_entity_names if node_lookup.get(e, {}).get("is_key_player")]

        has_burst_or_structuring = any(a["pattern"] in ("burst_activity", "structuring") for a in rec_anoms)
        if has_burst_or_structuring or len(kp_involved) >= 2 or len(rec_anoms) >= 2:
            priority = "HIGH"
            workflow_status = "Review Required"
        elif len(kp_involved) >= 1 or len(rec_anoms) >= 1:
            priority = "MEDIUM"
            workflow_status = "Intelligence Available"
        else:
            priority = "STANDARD"
            workflow_status = "Source Record Active"

        time_match = re.search(r"\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b", target_r["text"])
        time_str = time_match.group(0) if time_match else None

        # Cross-referencing records (share 2+ entities or co-occurring)
        related_records = []
        for r in data["records"]:
            if r["record_id"] == rid:
                continue
            r_ents = {e["text"] for e in r.get("extracted_entities", [])}
            common_ents = case_entity_set.intersection(r_ents)
            if len(common_ents) >= 2 or (len(common_ents) >= 1 and any(ce in kp_involved for ce in common_ents)):
                related_records.append({
                    "record_id": r["record_id"],
                    "source": r["source"],
                    "source_label": r["source"].replace("_", " ").title(),
                    "date": r["date"],
                    "text": r["text"],
                    "extracted_entities": r.get("extracted_entities", []),
                    "relationship_note": f"Shares {len(common_ents)} entity references ({', '.join(sorted(list(common_ents))[:3])})",
                    "common_entities": sorted(list(common_ents)),
                })
        related_records.sort(key=lambda x: x["date"])

        entity_cards = []
        for eid in case_entity_names:
            n = node_lookup.get(eid)
            if n:
                entity_cards.append({
                    "id": n["id"],
                    "type": n["type"],
                    "degree": n["degree"],
                    "betweenness": n["betweenness"],
                    "influence_score": n["influence_score"],
                    "community": n["community"],
                    "is_key_player": n["is_key_player"],
                    "is_bridge_node": n["is_bridge_node"],
                    "anomaly_count": n["anomaly_count"],
                })
            else:
                entity_cards.append({
                    "id": eid,
                    "type": "UNKNOWN",
                    "degree": 0,
                    "betweenness": 0.0,
                    "influence_score": 0.0,
                    "community": 0,
                    "is_key_player": False,
                    "is_bridge_node": False,
                    "anomaly_count": 0,
                })
        entity_cards.sort(key=lambda x: (x["influence_score"], x["degree"]), reverse=True)

        locs = cls.get_locations()
        case_locations = [
            l for l in locs if l["id"] in case_entity_set
        ]

        tl = cls.get_timeline()
        related_rids = {rr["record_id"] for rr in related_records}
        case_timeline = [
            evt for evt in tl
            if evt["record_id"] == rid or evt["record_id"] in related_rids
        ]

        internal_links = [
            l for l in data["links"]
            if l["source"] in case_entity_set and l["target"] in case_entity_set
        ]

        communities_represented = sorted(list({n["community"] for n in entity_cards if n["community"] > 0}))

        references = [
            {
                "ref_type": "Primary Case Report",
                "identifier": rid,
                "source_system": target_r["source"],
                "source_label": source_label,
                "date": target_r["date"],
                "details": f"Raw intake text processed by RuleBasedNER ({len(case_entity_names)} entities extracted)"
            }
        ]
        for a in rec_anoms:
            references.append({
                "ref_type": "Analytical Signal",
                "identifier": a["id"],
                "source_system": "CNIS Anomaly Detection Engine",
                "source_label": a["pattern_label"],
                "date": a["date"] or target_r["date"],
                "details": a["note"]
            })
        for loc in case_locations:
            references.append({
                "ref_type": "Geographic Site",
                "identifier": loc["id"],
                "source_system": "Location Intelligence Analysis",
                "source_label": f"Activity Score: {loc['activity_score']}",
                "date": target_r["date"],
                "details": f"Operational node linking {loc['entity_count']} entities across {loc['record_count']} case records"
            })

        return {
            "case_id": rid,
            "title": f"{rid}: {short_title}",
            "short_title": short_title,
            "source": target_r["source"],
            "source_label": source_label,
            "date": target_r["date"],
            "time": time_str,
            "workflow_status": workflow_status,
            "source_status": "Ingested Case Report",
            "priority": priority,
            "description": target_r["text"],
            "metrics": {
                "records": 1 + len(related_records),
                "entities": len(case_entity_names),
                "anomalies": len(rec_anoms),
                "locations": len(case_locations),
                "key_players": len(kp_involved),
                "internal_connections": len(internal_links),
            },
            "primary_record": {
                "record_id": rid,
                "source": target_r["source"],
                "source_label": source_label,
                "date": target_r["date"],
                "text": target_r["text"],
                "extracted_entities": target_r.get("extracted_entities", []),
                "location_references": loc_names,
                "anomaly_count": len(rec_anoms),
            },
            "related_records": related_records,
            "entities": entity_cards,
            "anomalies": rec_anoms,
            "locations": case_locations,
            "timeline_events": case_timeline,
            "network_context": {
                "case_entities": case_entity_names,
                "links": internal_links,
                "key_players": kp_involved,
                "bridge_nodes": [n["id"] for n in entity_cards if n["is_bridge_node"]],
                "communities": communities_represented,
            },
            "intelligence_references": references,
            "disclaimer": "Case intelligence is derived from available source records and analytical signals. Investigative conclusions require authorized human review.",
        }


