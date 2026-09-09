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
import uuid
import time
import platform
import inspect
from datetime import datetime, timezone
from typing import Dict, Any, List

_server_start_time = time.time()

def _safe_pkg_version(name: str) -> str:
    try:
        import importlib.metadata
        return importlib.metadata.version(name)
    except Exception:
        try:
            mod = __import__(name)
            return getattr(mod, "__version__", "Version not exposed")
        except Exception:
            return "Version not exposed" 

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



class WorkflowStore:
    """
    Session Review Workspace Store (In-memory server-side state).
    
    IMPORTANT ARCHITECTURAL NOTICE:
    Workflow states, review checklists, follow-up items, and investigation
    session history are maintained in-memory for the active runtime session.
    They are NOT persisted to enterprise storage.
    """
    _case_workflows: Dict[str, Dict[str, Any]] = {}
    _session_activity: List[Dict[str, Any]] = []

    VALID_WORKFLOW_STATUSES = {
        "Review Required",
        "In Review",
        "Follow-up Required",
        "Review Completed",
    }

    ALLOWED_CATEGORIES = {
        "Source Cross-Check",
        "Entity Review",
        "Timeline Review",
        "Location Review",
        "Network Review",
        "Anomaly Review",
        "Additional Record Review",
    }

    DEFAULT_CHECKLIST = [
        {
            "id": "chk-1",
            "label": "Review Primary Source Record & Narrative",
            "description": "Inspect raw ingested text, provenance channel, timestamp, and reporting agency.",
            "completed": False,
            "completed_at": None,
        },
        {
            "id": "chk-2",
            "label": "Review Extracted Entities & Roles",
            "description": "Examine extracted Persons, Organizations, Vehicles, Phones, and verify classifications.",
            "completed": False,
            "completed_at": None,
        },
        {
            "id": "chk-3",
            "label": "Review Correlated Anomaly Signals",
            "description": "Evaluate automated detection signatures (burst activity, structuring, outlier activity).",
            "completed": False,
            "completed_at": None,
        },
        {
            "id": "chk-4",
            "label": "Review Chronological Event Timestamps",
            "description": "Verify sequential consistency, interval spikes, and activity window across source timeline.",
            "completed": False,
            "completed_at": None,
        },
        {
            "id": "chk-5",
            "label": "Review Spatial Sites & Bridge Locations",
            "description": "Inspect geographic sites, transit waypoints, and high-degree location nodes.",
            "completed": False,
            "completed_at": None,
        },
        {
            "id": "chk-6",
            "label": "Review Internal Co-occurrence Subgraph",
            "description": "Analyze network topology, ego-network connections, and community memberships.",
            "completed": False,
            "completed_at": None,
        },
        {
            "id": "chk-7",
            "label": "Cross-Reference Related Cases",
            "description": "Assess shared entities, co-occurring sites, and correlated investigative files.",
            "completed": False,
            "completed_at": None,
        },
        {
            "id": "chk-8",
            "label": "Verify Intelligence Provenance References",
            "description": "Confirm extraction traceability back to raw evidence records before final determination.",
            "completed": False,
            "completed_at": None,
        },
    ]

    @classmethod
    def _now_iso(cls) -> str:
        return datetime.now(timezone.utc).isoformat()

    @classmethod
    def initialize_case_if_needed(cls, case_id: str, case_data: Dict[str, Any]):
        cid = case_id.upper()
        if cid in cls._case_workflows:
            return

        workflow_status = "Review Required"
        followups = []
        fu_counter = 1

        source_name = case_data.get("source_label") or case_data.get("source", "Primary Record")
        followups.append({
            "id": f"FU-{cid}-{fu_counter:02d}",
            "case_id": cid,
            "title": f"Source Cross-Check: Cross-reference ingested narrative against {source_name} logs",
            "category": "Source Cross-Check",
            "status": "Pending",
            "related_target": case_data.get("source"),
            "created_at": cls._now_iso(),
            "completed_at": None,
            "notes": "Verify dispatch transmission or source document reference ID."
        })
        fu_counter += 1

        ents = case_data.get("entities", [])
        if ents:
            primary_ent = ents[0] if isinstance(ents[0], str) else ents[0].get("id", "")
            followups.append({
                "id": f"FU-{cid}-{fu_counter:02d}",
                "case_id": cid,
                "title": f"Entity Review: Verify role classification and identity references for {primary_ent}",
                "category": "Entity Review",
                "status": "Pending",
                "related_target": primary_ent,
                "created_at": cls._now_iso(),
                "completed_at": None,
                "notes": "Assess cross-registry mentions and confirmed identifiers."
            })
            fu_counter += 1

        anoms = case_data.get("anomalies", [])
        if anoms:
            anom_pattern = anoms[0].get("pattern_label") or anoms[0].get("pattern", "Analytical Signal")
            anom_id = anoms[0].get("id", "")
            followups.append({
                "id": f"FU-{cid}-{fu_counter:02d}",
                "case_id": cid,
                "title": f"Anomaly Review: Review detection signal parameters for {anom_pattern}",
                "category": "Anomaly Review",
                "status": "Pending",
                "related_target": anom_id,
                "created_at": cls._now_iso(),
                "completed_at": None,
                "notes": "Review statistical threshold and temporal window triggers."
            })
            fu_counter += 1

        locs = case_data.get("locations", [])
        if locs:
            loc_id = locs[0] if isinstance(locs[0], str) else locs[0].get("id", "")
            followups.append({
                "id": f"FU-{cid}-{fu_counter:02d}",
                "case_id": cid,
                "title": f"Location Review: Review spatial co-occurrence history for {loc_id}",
                "category": "Location Review",
                "status": "Pending",
                "related_target": loc_id,
                "created_at": cls._now_iso(),
                "completed_at": None,
                "notes": "Check geographic convergence across adjacent incident reports."
            })
            fu_counter += 1

        checklist_copy = [dict(item) for item in cls.DEFAULT_CHECKLIST]

        cls._case_workflows[cid] = {
            "case_id": cid,
            "workflow_status": workflow_status,
            "checklist": checklist_copy,
            "followups": followups,
            "created_at": cls._now_iso(),
        }

        cls.log_activity(
            cid,
            "Workflow Initialized",
            f"Case {cid} registered in Session Review Workspace with {len(followups)} review tasks."
        )

    @classmethod
    def log_activity(cls, case_id: str, action: str, details: str):
        cid = case_id.upper()
        event = {
            "id": f"ACT-{uuid.uuid4().hex[:8].upper()}",
            "case_id": cid,
            "action": action,
            "details": details,
            "timestamp": cls._now_iso(),
        }
        cls._session_activity.append(event)
        return event

    @classmethod
    def get_case_activity(cls, case_id: str) -> List[Dict[str, Any]]:
        cid = case_id.upper()
        return [e for e in cls._session_activity if e["case_id"] == cid or e["case_id"] == "ALL"]

    @classmethod
    def get_workflow(cls, case_id: str) -> Dict[str, Any] | None:
        cid = case_id.upper()
        wf = cls._case_workflows.get(cid)
        if not wf:
            return None
        
        checklist = wf["checklist"]
        followups = wf["followups"]
        reviewed_cnt = sum(1 for c in checklist if c["completed"])
        pending_fu_cnt = sum(1 for f in followups if f["status"] != "Completed")

        return {
            "case_id": cid,
            "workflow_status": wf["workflow_status"],
            "checklist": checklist,
            "followups": followups,
            "activity_history": cls.get_case_activity(cid),
            "checklist_reviewed_count": reviewed_cnt,
            "checklist_total_count": len(checklist),
            "pending_followups_count": pending_fu_cnt,
        }

    @classmethod
    def update_workflow_status(cls, case_id: str, status: str) -> Dict[str, Any]:
        cid = case_id.upper()
        if status not in cls.VALID_WORKFLOW_STATUSES:
            raise ValueError(f"Invalid workflow status '{status}'. Must be one of: {sorted(list(cls.VALID_WORKFLOW_STATUSES))}")
        
        wf = cls._case_workflows.get(cid)
        if not wf:
            raise KeyError(f"Case '{cid}' not found in workflow workspace")

        old_status = wf["workflow_status"]
        wf["workflow_status"] = status
        cls.log_activity(
            cid,
            "Workflow Status Changed",
            f"Review state changed from '{old_status}' to '{status}'"
        )
        return cls.get_workflow(cid)

    @classmethod
    def toggle_checklist_item(cls, case_id: str, item_id: str, completed: bool) -> Dict[str, Any]:
        cid = case_id.upper()
        wf = cls._case_workflows.get(cid)
        if not wf:
            raise KeyError(f"Case '{cid}' not found in workflow workspace")

        target_item = next((i for i in wf["checklist"] if i["id"] == item_id), None)
        if not target_item:
            raise ValueError(f"Checklist item '{item_id}' not found in case '{cid}'")

        target_item["completed"] = bool(completed)
        target_item["completed_at"] = cls._now_iso() if completed else None

        cls.log_activity(
            cid,
            "Checklist Item Updated",
            f"{'Completed' if completed else 'Reopened'}: {target_item['label']}"
        )
        return cls.get_workflow(cid)

    @classmethod
    def add_followup(cls, case_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        cid = case_id.upper()
        wf = cls._case_workflows.get(cid)
        if not wf:
            raise KeyError(f"Case '{cid}' not found in workflow workspace")

        category = payload.get("category", "").strip()
        if category not in cls.ALLOWED_CATEGORIES:
            raise ValueError(f"Invalid follow-up category '{category}'. Must be one of: {sorted(list(cls.ALLOWED_CATEGORIES))}")

        title = payload.get("title", "").strip()
        if not title:
            raise ValueError("Follow-up title cannot be empty")

        fu_id = f"FU-{cid}-{uuid.uuid4().hex[:6].upper()}"
        item = {
            "id": fu_id,
            "case_id": cid,
            "title": title,
            "category": category,
            "status": "Pending",
            "related_target": payload.get("related_target") or None,
            "created_at": cls._now_iso(),
            "completed_at": None,
            "notes": payload.get("notes") or "",
        }
        wf["followups"].append(item)

        cls.log_activity(
            cid,
            "Follow-up Task Created",
            f"Created follow-up item: [{category}] {title}"
        )
        return item

    @classmethod
    def update_followup(cls, case_id: str, followup_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        cid = case_id.upper()
        wf = cls._case_workflows.get(cid)
        if not wf:
            raise KeyError(f"Case '{cid}' not found in workflow workspace")

        item = next((f for f in wf["followups"] if f["id"] == followup_id), None)
        if not item:
            raise KeyError(f"Follow-up '{followup_id}' not found in case '{cid}'")

        if "status" in payload and payload["status"]:
            new_status = payload["status"].strip()
            if new_status not in {"Pending", "In Progress", "Completed"}:
                raise ValueError(f"Invalid follow-up status '{new_status}'. Must be 'Pending', 'In Progress', or 'Completed'.")
            item["status"] = new_status
            if new_status == "Completed":
                item["completed_at"] = cls._now_iso()
            else:
                item["completed_at"] = None

        if "notes" in payload:
            item["notes"] = payload["notes"]

        cls.log_activity(
            cid,
            "Follow-up Task Updated",
            f"Follow-up [{item['category']}] {item['title']} marked as '{item['status']}'"
        )
        return item

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

            # Analytical priority strictly derived from intelligence signals
            has_burst_or_structuring = any(a["pattern"] in ("burst_activity", "structuring") for a in rec_anoms)
            if has_burst_or_structuring or len(kp_involved) >= 2 or len(rec_anoms) >= 2:
                priority = "HIGH"
            elif len(kp_involved) >= 1 or len(rec_anoms) >= 1:
                priority = "MEDIUM"
            else:
                priority = "STANDARD"

            source_label = r["source"].replace("_", " ").title()
            short_title = cls.CASE_TITLES.get(rid, f"{source_label} Report {rid}")

            time_match = re.search(r"\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b", r["text"])
            time_str = time_match.group(0) if time_match else None

            # Initialize case in session workflow workspace if needed
            WorkflowStore.initialize_case_if_needed(rid, {
                "source_label": source_label,
                "source": r["source"],
                "entities": ents,
                "anomalies": rec_anoms,
                "locations": loc_names,
            })
            wf = WorkflowStore.get_workflow(rid)
            current_workflow_status = wf["workflow_status"] if wf else "Review Required"

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
                "workflow_status": current_workflow_status,
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
            "in_review_count": sum(1 for c in cases_list if c["workflow_status"] == "In Review"),
            "followup_required_count": sum(1 for c in cases_list if c["workflow_status"] == "Follow-up Required"),
            "review_completed_count": sum(1 for c in cases_list if c["workflow_status"] == "Review Completed"),
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
        non_loc_entities = [e["text"] for e in target_r.get("extracted_entities", []) if e["label"] != "LOCATION"]

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
        elif len(kp_involved) >= 1 or len(rec_anoms) >= 1:
            priority = "MEDIUM"
        else:
            priority = "STANDARD"

        # Initialize session workflow workspace for this case
        WorkflowStore.initialize_case_if_needed(rid, {
            "source_label": source_label,
            "source": target_r["source"],
            "entities": case_entity_names,
            "anomalies": rec_anoms,
            "locations": loc_names,
        })
        wf = WorkflowStore.get_workflow(rid)
        current_workflow_status = wf["workflow_status"] if wf else "Review Required"

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

        # Derived Related Cases
        # Strictly derived: Shared Entity, Shared Location, Shared Analytical Signal (exact anomaly instance)
        target_non_loc_set = set(non_loc_entities)
        target_loc_set = set(loc_names)
        target_anom_ids = {
            a["id"] for a in data["suspicious_patterns"]
            if a.get("record_id") == rid or rid in a.get("records", [])
        }

        related_cases = []
        for other_r in data["records"]:
            oid = other_r["record_id"]
            if oid == rid:
                continue

            o_non_loc = {e["text"] for e in other_r.get("extracted_entities", []) if e["label"] != "LOCATION"}
            o_locs = {e["text"] for e in other_r.get("extracted_entities", []) if e["label"] == "LOCATION"}
            o_anom_ids = {
                a["id"] for a in data["suspicious_patterns"]
                if a.get("record_id") == oid or oid in a.get("records", [])
            }

            shared_e = sorted(list(target_non_loc_set.intersection(o_non_loc)))
            shared_l = sorted(list(target_loc_set.intersection(o_locs)))
            shared_a_ids = sorted(list(target_anom_ids.intersection(o_anom_ids)))

            shared_a = [
                {
                    "id": aid,
                    "pattern": next((a["pattern"] for a in data["suspicious_patterns"] if a["id"] == aid), "signal"),
                    "pattern_label": next((a["pattern"].replace("_", " ").title() for a in data["suspicious_patterns"] if a["id"] == aid), "Analytical Signal"),
                }
                for aid in shared_a_ids
            ]

            bases = []
            if shared_e:
                bases.append("Shared Entity")
            if shared_l:
                bases.append("Shared Location")
            if shared_a:
                bases.append("Shared Analytical Signal")

            if bases:
                o_ents = [e["text"] for e in other_r.get("extracted_entities", [])]
                o_rec_anoms = [
                    a for a in data["suspicious_patterns"]
                    if a.get("record_id") == oid or (a.get("date") == other_r["date"] and a.get("entity") in o_ents)
                ]
                o_kp = [e for e in o_ents if node_lookup.get(e, {}).get("is_key_player")]
                o_burst = any(a["pattern"] in ("burst_activity", "structuring") for a in o_rec_anoms)
                if o_burst or len(o_kp) >= 2 or len(o_rec_anoms) >= 2:
                    o_pri = "HIGH"
                elif len(o_kp) >= 1 or len(o_rec_anoms) >= 1:
                    o_pri = "MEDIUM"
                else:
                    o_pri = "STANDARD"

                WorkflowStore.initialize_case_if_needed(oid, {
                    "source_label": other_r["source"].replace("_", " ").title(),
                    "source": other_r["source"],
                    "entities": o_ents,
                    "anomalies": o_rec_anoms,
                    "locations": list(o_locs),
                })
                other_wf = WorkflowStore.get_workflow(oid)

                related_cases.append({
                    "case_id": oid,
                    "title": f"{oid}: {cls.CASE_TITLES.get(oid, f'Report {oid}')}",
                    "short_title": cls.CASE_TITLES.get(oid, f"Report {oid}"),
                    "relationship_bases": bases,
                    "shared_entities": shared_e,
                    "shared_locations": shared_l,
                    "shared_anomalies": shared_a,
                    "summary": other_r["text"][:130].strip() + ("..." if len(other_r["text"]) > 130 else ""),
                    "priority": o_pri,
                    "workflow_status": other_wf["workflow_status"] if other_wf else "Review Required",
                    "relevance_score": len(shared_e) * 3 + len(shared_l) * 2 + len(shared_a) * 4,
                })

        related_cases.sort(key=lambda x: x["relevance_score"], reverse=True)

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
            ev for ev in tl
            if ev["record_id"] == rid or ev["record_id"] in related_rids
        ]
        case_timeline.sort(key=lambda x: x["date"])

        all_links = data["links"]
        internal_links = [
            l for l in all_links
            if l["source"] in case_entity_set and l["target"] in case_entity_set
        ]

        communities_represented = sorted(list({
            node_lookup[e]["community"]
            for e in case_entity_names
            if e in node_lookup and "community" in node_lookup[e]
        }))

        # Intelligence References with full provenance and navigation metadata
        references = []
        references.append({
            "ref_type": "Ingested Evidence Record",
            "identifier": rid,
            "source_system": source_label,
            "source_label": "Primary Source Ingestion",
            "date": target_r["date"],
            "target_module": "/timeline",
            "navigation_param": f"record_id={rid}",
            "analytical_method": "JSON Source Extraction & Standardization",
            "details": f"Original report text ({len(target_r['text'])} chars) ingested from {source_label} channel."
        })
        for ent in entity_cards:
            references.append({
                "ref_type": "Entity Extraction Lead",
                "identifier": ent["id"],
                "source_system": "Rule-Based NER Pipeline",
                "source_label": f"{ent['type']} (Influence: {ent['influence_score']})",
                "date": target_r["date"],
                "target_module": "/entities",
                "navigation_param": f"id={ent['id']}",
                "analytical_method": "Regex & Keyword Entity Recognition",
                "details": f"Extracted {ent['type']} entity co-occurring with {ent['degree']} network edges across communities."
            })
        for anom in rec_anoms:
            references.append({
                "ref_type": "Anomaly Detection Flag",
                "identifier": anom["id"],
                "source_system": "Analytical Anomaly Engine",
                "source_label": anom["pattern_label"],
                "date": anom.get("date", target_r["date"]),
                "target_module": "/anomalies",
                "navigation_param": f"id={anom['id']}",
                "analytical_method": "Heuristic & Statistical Signal Detection",
                "details": f"Flagged {anom['pattern_label']} signal linked to entity {anom.get('entity')}: {anom.get('note', '')}"
            })
        for loc in case_locations:
            references.append({
                "ref_type": "Geographic Site",
                "identifier": loc["id"],
                "source_system": "Location Intelligence Analysis",
                "source_label": f"Activity Score: {loc['activity_score']}",
                "date": target_r["date"],
                "target_module": "/locations",
                "navigation_param": f"id={loc['id']}",
                "analytical_method": "Spatial Co-occurrence Clustering",
                "details": f"Operational node linking {loc['entity_count']} entities across {loc['record_count']} case records."
            })

        # Activity history for this case
        activity_history = WorkflowStore.get_case_activity(rid)

        return {
            "case_id": rid,
            "title": f"{rid}: {short_title}",
            "short_title": short_title,
            "source": target_r["source"],
            "source_label": source_label,
            "date": target_r["date"],
            "time": time_str,
            "workflow_status": current_workflow_status,
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
                "related_cases_count": len(related_cases),
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
            "related_cases": related_cases,
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
            "workflow": wf,
            "activity_history": activity_history,
            "disclaimer": "Case intelligence is derived from available source records and analytical signals. Investigative conclusions require authorized human review.",
            "workflow_notice": "Session Review Workspace: Workflow state, checklists, and follow-ups are maintained for the active investigation session. Enterprise persistence requires database integration."
        }

    @classmethod
    def get_case_workflow(cls, case_id: str) -> Dict[str, Any] | None:
        clean_id = case_id.strip().upper()
        detail = cls.get_case_detail(clean_id)
        if not detail:
            return None
        return WorkflowStore.get_workflow(clean_id)

    @classmethod
    def update_case_workflow(cls, case_id: str, status: str) -> Dict[str, Any] | None:
        clean_id = case_id.strip().upper()
        detail = cls.get_case_detail(clean_id)
        if not detail:
            return None
        return WorkflowStore.update_workflow_status(clean_id, status)

    @classmethod
    def toggle_case_checklist(cls, case_id: str, item_id: str, completed: bool) -> Dict[str, Any] | None:
        clean_id = case_id.strip().upper()
        detail = cls.get_case_detail(clean_id)
        if not detail:
            return None
        return WorkflowStore.toggle_checklist_item(clean_id, item_id, completed)

    @classmethod
    def add_case_followup(cls, case_id: str, payload: Dict[str, Any]) -> Dict[str, Any] | None:
        clean_id = case_id.strip().upper()
        detail = cls.get_case_detail(clean_id)
        if not detail:
            return None
        return WorkflowStore.add_followup(clean_id, payload)

    @classmethod
    def update_case_followup(cls, case_id: str, followup_id: str, payload: Dict[str, Any]) -> Dict[str, Any] | None:
        clean_id = case_id.strip().upper()
        detail = cls.get_case_detail(clean_id)
        if not detail:
            return None
        return WorkflowStore.update_followup(clean_id, followup_id, payload)

    @classmethod
    def get_system_config(cls) -> Dict[str, Any]:
        """
        Exposes genuine pipeline, algorithm, connector, and runtime configuration
        introspected directly from src/ modules and runtime state.
        """
        import entity_extraction
        import network_analysis
        import anomaly_detection
        import graph_builder
        import ingestion
        import inspect

        # 1. Platform & Environment
        platform_info = {
            "system_name": "Crime Network Intelligence System (CNIS)",
            "version": "2.0.0-prototype",
            "runtime_environment": "Local Development / Hackathon Prototype",
            "python_version": platform.python_version(),
            "fastapi_version": _safe_pkg_version("fastapi"),
            "uvicorn_version": _safe_pkg_version("uvicorn"),
            "networkx_version": _safe_pkg_version("networkx"),
            "scikit_learn_version": _safe_pkg_version("scikit-learn"),
            "numpy_version": _safe_pkg_version("numpy"),
            "pydantic_version": _safe_pkg_version("pydantic"),
            "dataset_reference": "data/sample_records.json",
            "dataset_type": "Synthetic Demonstration Dataset",
        }

        # 2. Pipeline Stages (6 stages verified directly against src/pipeline.py)
        pipeline_stages = [
            {
                "stage_number": 1,
                "name": "Ingestion",
                "module": "src/ingestion.py",
                "class_name": "IngestionManager / JSONFileConnector",
                "execution_order": 1,
                "input_type": "data/sample_records.json (JSON)",
                "output_type": "list[Record]",
                "status": "Active Prototype",
                "description": "Aggregates raw incident and intelligence records into unified Record dataclasses with normalized schema fields.",
            },
            {
                "stage_number": 2,
                "name": "Entity Extraction",
                "module": "src/entity_extraction.py",
                "class_name": "RuleBasedNER / extract_entities",
                "execution_order": 2,
                "input_type": "list[Record]",
                "output_type": "list[ExtractedRecord]",
                "status": "Active Prototype",
                "description": "Extracts entity mentions (PERSON, ORG, LOCATION, VEHICLE, PHONE, MONEY) and normalizes identifiers.",
            },
            {
                "stage_number": 3,
                "name": "Graph Construction",
                "module": "src/graph_builder.py",
                "class_name": "co_occurrence_edges / build_graph",
                "execution_order": 3,
                "input_type": "list[ExtractedRecord]",
                "output_type": "networkx.Graph",
                "status": "Active Prototype",
                "description": "Constructs an undirected co-occurrence multigraph where edge weights increment with each corroborating record.",
            },
            {
                "stage_number": 4,
                "name": "Network Analysis",
                "module": "src/network_analysis.py",
                "class_name": "compute_centrality / rank_key_players / detect_communities / critical_bridge_nodes",
                "execution_order": 4,
                "input_type": "networkx.Graph",
                "output_type": "Centrality dict, Key Players list, Community partitions, Bridge node rankings",
                "status": "Active Prototype",
                "description": "Computes centrality metrics, ranks key influencers via composite formula, discovers Louvain communities, and isolates bridge broker nodes.",
            },
            {
                "stage_number": 5,
                "name": "Anomaly & Pattern Detection",
                "module": "src/anomaly_detection.py",
                "class_name": "detect_burst_activity / detect_structuring / detect_new_entity_spikes / isolation_forest_outliers",
                "execution_order": 5,
                "input_type": "edges, records, extracted_records, centrality",
                "output_type": "list[dict] flagged suspicious patterns",
                "status": "Active Prototype",
                "description": "Detects behavioral burst activity, financial structuring patterns, new entity spikes, and statistical centrality outliers.",
            },
            {
                "stage_number": 6,
                "name": "Investigator Intelligence & Export",
                "module": "src/visualize.py & server/service.py",
                "class_name": "IntelligenceService / export_interactive_html / export_gexf",
                "execution_order": 6,
                "input_type": "nx.Graph, analytics, anomalies, case records",
                "output_type": "REST API JSON, Interactive Link Chart, GEXF Graph, Case Dossiers",
                "status": "Active Prototype",
                "description": "Transforms raw graph and anomaly artifacts into structured investigator views, case dossiers, and API endpoints.",
            },
        ]

        # 3. Entity Extraction Config (Introspected from entity_extraction)
        entity_extraction_cfg = {
            "active_backend": "RuleBasedNER",
            "backend_interface": "NERBackend",
            "planned_backend": "SpacyNERBackend (Planned transformer model: en_core_web_trf)",
            "gazetteers": {
                "persons": entity_extraction.PERSON_GAZETTEER,
                "organizations": entity_extraction.ORG_GAZETTEER,
                "locations": entity_extraction.LOCATION_GAZETTEER,
            },
            "regex_rules": {
                "phone_regex": entity_extraction.PHONE_RE.pattern,
                "vehicle_plate_regex": entity_extraction.VEHICLE_PLATE_RE.pattern,
                "money_regex": entity_extraction.MONEY_RE.pattern,
            },
            "normalization_rules": [
                {"entity_type": "PHONE", "rule": "Extract digits, retain last 10 digits to normalize national/international dial prefixes"},
                {"entity_type": "VEHICLE", "rule": "Strip interior spaces, normalize to uppercase standard plate format"},
                {"entity_type": "MONEY", "rule": "Parse currency symbol (INR / Rs / ₹) and extract numeric amounts"},
                {"entity_type": "ALL", "rule": "De-duplicate identical (text, label) entity tuples within the same record"},
            ],
        }

        # 4. Network Analysis Config (Introspected from network_analysis)
        network_analysis_cfg = {
            "graph_engine": "NetworkX",
            "graph_type": "nx.Graph (Undirected)",
            "edge_weight_rule": "Co-occurrence frequency: repeated appearances across independent records increment weight by 1",
            "centrality_metrics": [
                {"name": "Degree Centrality", "role": "Direct contact hubs & organizers", "weight_in_key_player": 0.25},
                {"name": "Betweenness Centrality", "role": "Brokers and couriers bridging separate clusters (weight='weight')", "weight_in_key_player": 0.35},
                {"name": "Eigenvector Centrality", "role": "Connection to other well-connected entities (max_iter=1000, weight='weight')", "weight_in_key_player": 0.25},
                {"name": "PageRank", "role": "Blended stationary influence distribution (weight='weight')", "weight_in_key_player": 0.15},
            ],
            "key_player_formula": {
                "expression": "0.25 * degree + 0.35 * betweenness + 0.25 * eigenvector + 0.15 * pagerank",
                "entity_types": list(inspect.signature(network_analysis.rank_key_players).parameters["entity_types"].default),
                "top_n": inspect.signature(network_analysis.rank_key_players).parameters["top_n"].default,
                "weights": {
                    "degree": 0.25,
                    "betweenness": 0.35,
                    "eigenvector": 0.25,
                    "pagerank": 0.15,
                },
            },
            "community_detection": {
                "algorithm": "Louvain Community Detection",
                "function": "nx.algorithms.community.louvain_communities",
                "seed": 42,
                "weight_attribute": "weight",
                "resolution": 1.0,
                "description": "Deterministic community partitioning based on edge weight density",
            },
            "critical_bridge_nodes": {
                "function": "nx.betweenness_centrality",
                "top_n": inspect.signature(network_analysis.critical_bridge_nodes).parameters["top_n"].default,
                "weight_attribute": "weight",
                "description": "Identifies top broker nodes whose removal would fragment the network topology",
            },
            "path_analysis": {
                "algorithm": "nx.shortest_path",
                "weight": "None (unweighted BFS shortest path)",
                "description": "Identifies shortest connection path between any two selected entities",
            },
        }

        # 5. Anomaly Detection Config (Introspected from anomaly_detection)
        burst_sig = inspect.signature(anomaly_detection.detect_burst_activity)
        structuring_sig = inspect.signature(anomaly_detection.detect_structuring)
        iforest_sig = inspect.signature(anomaly_detection.isolation_forest_outliers)

        anomaly_detection_cfg = {
            "detectors": [
                {
                    "id": "burst_activity",
                    "name": "Burst Activity Detection",
                    "function": "detect_burst_activity",
                    "pattern": "burst_activity",
                    "parameters": {
                        "window_hours": burst_sig.parameters["window_hours"].default,
                        "min_events": burst_sig.parameters["min_events"].default,
                    },
                    "threshold_summary": f">={burst_sig.parameters['min_events'].default} interactions within {burst_sig.parameters['window_hours'].default}h window / calendar day",
                    "significance": "Operational spike, imminent coordinated activity, or panic calling",
                },
                {
                    "id": "structuring",
                    "name": "Financial Structuring Detection",
                    "function": "detect_structuring",
                    "pattern": "structuring",
                    "parameters": {
                        "threshold": structuring_sig.parameters["threshold"].default,
                        "currency": "INR",
                        "keywords": ["structur", "split + deposit/transaction"],
                    },
                    "threshold_summary": f"Transactions split under INR {structuring_sig.parameters['threshold'].default:,} threshold",
                    "significance": "Smurfing / money laundering to evade mandatory FIU threshold reporting",
                },
                {
                    "id": "new_entity_spike",
                    "name": "New Entity Spike Detection",
                    "function": "detect_new_entity_spikes",
                    "pattern": "new_entity_spike",
                    "parameters": {
                        "min_linked_known_entities": 2,
                    },
                    "threshold_summary": "First appearance linked to >= 2 previously known entities",
                    "significance": "New recruit, outside supplier, or handler entering an established cell",
                },
                {
                    "id": "isolation_forest_outliers",
                    "name": "Isolation Forest Outlier Detection",
                    "function": "isolation_forest_outliers",
                    "pattern": "statistical_outlier",
                    "parameters": {
                        "algorithm": "scikit-learn IsolationForest",
                        "contamination": iforest_sig.parameters["contamination"].default,
                        "random_state": 42,
                        "feature_count": 4,
                        "features": ["degree", "betweenness", "eigenvector", "pagerank"],
                    },
                    "threshold_summary": f"Contamination {iforest_sig.parameters['contamination'].default} over 4D centrality feature space",
                    "significance": "Topological outliers diverging from expected network distribution",
                },
            ]
        }

        # 6. Data Sources Config
        data_sources_cfg = {
            "active_connector": "JSONFileConnector",
            "active_sources_count": len(cls.SOURCE_CONFIGS),
            "prototype_connectors": [
                {"name": "JSONFileConnector", "status": "Active Prototype", "description": "Local JSON file reader for prototype cases"},
                {"name": "SQLConnector", "status": "Implemented in src/ingestion.py", "description": "Generic DB-API 2.0 relational connector"},
                {"name": "CSVConnector", "status": "Implemented in src/ingestion.py", "description": "Tabular CSV parser for CDR / ANPR records"},
                {"name": "RESTAPIConnector", "status": "Implemented in src/ingestion.py", "description": "HTTP REST client for external feeds"},
            ],
            "sources_center_url": "/sources",
        }

        # 7. Storage Model Transparency
        storage_cfg = {
            "workflow_store": "In-memory",
            "intelligence_cache": "In-memory",
            "persistent_database": "Not configured",
            "enterprise_persistence": "Requires production integration",
            "local_storage": "Client UI state only (no database usage)",
            "persistence_note": "Workflow states, review checklists, and session activity are retained in server memory for the active runtime session only.",
        }

        # 8. Production Readiness Gaps
        production_readiness = [
            {
                "category": "Storage & Database",
                "prototype_state": "In-memory Python dictionaries & NetworkX graph",
                "production_requirement": "PostgreSQL for relational case data + Neo4j / AWS Neptune for graph intelligence",
                "gap_level": "High",
                "status": "Planned",
            },
            {
                "category": "Authentication & Authorization",
                "prototype_state": "Single-session prototype; no user credentials or roles",
                "production_requirement": "OAuth2 / OIDC, SSO with Active Directory / Keycloak, Role-Based Access Control (RBAC)",
                "gap_level": "High",
                "status": "Planned",
            },
            {
                "category": "Audit & Compliance",
                "prototype_state": "In-memory session activity log (ephemeral)",
                "production_requirement": "Immutable append-only audit trail with cryptographic verification and query logging",
                "gap_level": "High",
                "status": "Planned",
            },
            {
                "category": "Ingestion Pipeline",
                "prototype_state": "Single JSON file batch ingestion via JSONFileConnector",
                "production_requirement": "Streaming ingestion with Apache Kafka / RabbitMQ, scheduled ETL pipelines",
                "gap_level": "Medium",
                "status": "Planned",
            },
            {
                "category": "Entity Extraction (NER)",
                "prototype_state": "RuleBasedNER (regex + static gazetteer)",
                "production_requirement": "Fine-tuned transformer model (spaCy / HuggingFace) trained on police FIR language",
                "gap_level": "Medium",
                "status": "Planned",
            },
            {
                "category": "High Availability & Scaling",
                "prototype_state": "Single-process FastAPI / Uvicorn server",
                "production_requirement": "Containerized multi-replica deployment on Kubernetes with Redis distributed caching",
                "gap_level": "Medium",
                "status": "Planned",
            },
            {
                "category": "Data Encryption",
                "prototype_state": "Plaintext local storage without TLS",
                "production_requirement": "TLS 1.3 in transit, AES-256 at rest, encrypted secret management (HashiCorp Vault)",
                "gap_level": "High",
                "status": "Planned",
            },
        ]

        # 9. Disclaimers
        disclaimers = {
            "analytical": "Case intelligence is derived from available source records and analytical signals. Investigative conclusions require authorized human review.",
            "configuration": "Configuration visibility reflects the current prototype implementation. Production deployments require appropriate security, persistence, authorization, and operational controls.",
        }

        return {
            "platform": platform_info,
            "pipeline_stages": pipeline_stages,
            "entity_extraction": entity_extraction_cfg,
            "network_analysis": network_analysis_cfg,
            "anomaly_detection": anomaly_detection_cfg,
            "data_sources": data_sources_cfg,
            "storage": storage_cfg,
            "production_readiness": production_readiness,
            "disclaimers": disclaimers,
        }

    @classmethod
    def get_system_health(cls) -> Dict[str, Any]:
        """
        Gathers live operational health diagnostics for the CNIS prototype.
        """
        data = cls.get_data()
        cases = cls.get_cases().get("cases", [])

        dataset_exists = os.path.exists(DATA_PATH)
        dataset_size = os.path.getsize(DATA_PATH) if dataset_exists else 0
        dataset_mtime = (
            datetime.fromtimestamp(os.path.getmtime(DATA_PATH), timezone.utc).isoformat()
            if dataset_exists else None
        )

        wf_cases = WorkflowStore._case_workflows
        total_chk = sum(len(wf.get("checklist", [])) for wf in wf_cases.values())
        done_chk = sum(
            sum(1 for it in wf.get("checklist", []) if it.get("completed"))
            for wf in wf_cases.values()
        )
        total_fu = sum(len(wf.get("followups", [])) for wf in wf_cases.values())
        pending_fu = sum(
            sum(1 for fu in wf.get("followups", []) if fu.get("status") != "Completed")
            for wf in wf_cases.values()
        )

        return {
            "status": "healthy",
            "uptime_seconds": int(time.time() - _server_start_time),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "backend_api": {
                "status": "available",
                "version": "2.0.0-prototype",
                "framework": f"FastAPI {_safe_pkg_version('fastapi')}",
                "server": f"Uvicorn {_safe_pkg_version('uvicorn')}",
            },
            "intelligence_engine": {
                "status": "cached" if cls._cached_data is not None else "ready",
                "last_ingestion_time": cls._last_ingestion_time,
                "record_count": len(data["records"]),
                "entity_count": len(data["nodes"]),
                "relationship_count": len(data["links"]),
                "anomaly_count": len(data["suspicious_patterns"]),
                "case_count": len(cases),
                "key_players_count": len(data["key_players"]),
                "communities_count": len(data["communities"]),
            },
            "dataset": {
                "logical_reference": "data/sample_records.json",
                "exists": dataset_exists,
                "file_size_bytes": dataset_size,
                "last_modified": dataset_mtime,
                "record_count": len(data["records"]),
            },
            "workflow_store": {
                "status": "in_memory",
                "active_cases": len(wf_cases),
                "total_checklist_items": total_chk,
                "completed_checklist_items": done_chk,
                "total_followups": total_fu,
                "pending_followups": pending_fu,
                "session_activity_count": len(WorkflowStore._session_activity),
            },
            "sources_registry": {
                "configured_sources_count": len(cls.SOURCE_CONFIGS),
                "active_sources_count": len(cls.SOURCE_CONFIGS),
            },
        }

    @classmethod
    def reset_session_workflow(cls) -> Dict[str, Any]:
        """
        Safely resets investigator session modifications in WorkflowStore.
        Preserves data/sample_records.json, intelligence cache, entities,
        relationships, and anomalies without alteration.
        """
        WorkflowStore._case_workflows.clear()
        WorkflowStore._session_activity.clear()

        cases = cls.get_cases().get("cases", [])
        for case in cases:
            cid = case.get("case_id") or case.get("id", "")
            WorkflowStore.initialize_case_if_needed(cid, case)

        WorkflowStore.log_activity(
            "ALL",
            "Session Workspace Reset",
            "Investigator session workflow states and checklists were reset to baseline."
        )

        return {
            "success": True,
            "message": "Session workflow states, checklists, follow-ups, and activity history have been reset to baseline.",
            "reset_timestamp": datetime.now(timezone.utc).isoformat(),
            "cases_reset_count": len(cases),
        }
