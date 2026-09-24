"""
main.py
-------
FastAPI REST API application for Crime Network Intelligence System (CNIS).
Exposes structured endpoints for the React dashboard.
"""

from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
from server.service import IntelligenceService


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-cache intelligence data on application startup
    IntelligenceService.get_data()
    yield


app = FastAPI(
    title="Crime Network Intelligence System (CNIS) API",
    description="Investigator-facing Intelligence API powered by Python Graph Engine",
    version="2.0.0",
    lifespan=lifespan,
)

# Enable CORS for local Vite frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    username: str
    password: str


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "system": "Crime Network Intelligence System",
        "phase": "Phase 2A",
        "engine_cached": IntelligenceService._cached_data is not None,
    }


@app.post("/api/auth/login")
def login(credentials: LoginRequest):
    username = credentials.username.strip()
    password = credentials.password

    if not username:
        raise HTTPException(status_code=400, detail="Please enter your email or username.")
    if not password:
        raise HTTPException(status_code=400, detail="Please enter your password.")

    if len(password) < 4:
        raise HTTPException(status_code=401, detail="Invalid email/username or password.")

    token = f"cnis_session_{abs(hash(username)) % 100000000:08d}"
    clean_name = username.split('@')[0].replace('.', ' ').replace('_', ' ').title() if '@' in username else username.replace('.', ' ').replace('_', ' ').title()

    return {
        "status": "success",
        "token": token,
        "user": {
            "username": username,
            "name": clean_name,
            "role": "Intelligence Analyst",
            "unit": "Crime Network Investigation Desk",
            "access_level": "Tier-3 Authorized",
        }
    }


@app.get("/api/overview")
def get_overview():
    return IntelligenceService.get_overview()


@app.get("/api/network")
def get_network():
    return IntelligenceService.get_network()


@app.get("/api/entities")
def get_entities():
    return IntelligenceService.get_entities()


@app.get("/api/entities/{entity_id}")
def get_entity_detail(entity_id: str):
    detail = IntelligenceService.get_entity_detail(entity_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Entity '{entity_id}' not found")
    return detail


@app.get("/api/entity-resolution")
def get_entity_resolution_overview():
    """Phase 3G: Returns overall entity resolution summary, canonical entities, and review queue."""
    return IntelligenceService.get_entity_resolution_overview()


@app.get("/api/entity-resolution/{entity_id}")
def get_entity_resolution_detail(entity_id: str):
    """Phase 3G: Returns detailed resolution dossier, variants, and evidence evaluations for an entity."""
    detail = IntelligenceService.get_entity_resolution_detail(entity_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Canonical resolution for '{entity_id}' not found")
    return detail


# ── Phase 3H: Evidence & Provenance Endpoints ─────────────────────────────────

@app.get("/api/evidence")
def get_evidence_overview(
    entity: Optional[str] = None,
    record: Optional[str] = None,
    anomaly: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
):
    """Phase 3H: Returns evidence corpus summary and filtered evidence items."""
    params = {}
    if entity:
        params["entity"] = entity
    if record:
        params["record"] = record
    if anomaly:
        params["anomaly"] = anomaly
    if type:
        params["type"] = type
    if status:
        params["status"] = status
    return IntelligenceService.get_evidence_overview(params)


@app.get("/api/evidence/relationship/{source}/{target}")
def get_relationship_evidence(source: str, target: str):
    """Phase 3H: Returns canonical co-occurrence evidence and trace between two entities."""
    evidence = IntelligenceService.get_relationship_evidence(source, target)
    if not evidence:
        raise HTTPException(
            status_code=404,
            detail=f"No co-occurrence relationship evidence found between '{source}' and '{target}'"
        )
    return evidence


@app.get("/api/evidence/{evidence_id}")
def get_evidence_item(evidence_id: str):
    """Phase 3H: Returns a single evidence item with full hierarchical provenance trace."""
    evidence = IntelligenceService.get_evidence_item(evidence_id)
    if not evidence:
        raise HTTPException(status_code=404, detail=f"Evidence item '{evidence_id}' not found")
    return evidence


# ── Phase 3I: Explainable Intelligence Endpoints ──────────────────────────────

@app.get("/api/explainability")
def get_explainability_overview(
    entity: Optional[str] = None,
    record: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
):
    """Phase 3I: Returns explainability corpus summary and filtered explanations."""
    params = {}
    if entity:
        params["entity"] = entity
    if record:
        params["record"] = record
    if type:
        params["type"] = type
    if status:
        params["status"] = status
    return IntelligenceService.get_explainability_overview(params)


@app.get("/api/explainability/entity/{entity_id}")
def get_entity_explanations(entity_id: str):
    """Phase 3I: Returns all explanations directly involving an entity."""
    return IntelligenceService.get_entity_explanations(entity_id)


@app.get("/api/explainability/anomaly/{anomaly_id}")
def get_anomaly_explanation(anomaly_id: str):
    """Phase 3I: Returns derivation and rule trigger explanation for an anomaly signal."""
    explanation = IntelligenceService.get_anomaly_explanation(anomaly_id)
    if not explanation:
        raise HTTPException(
            status_code=404,
            detail=f"No explanation found for anomaly signal '{anomaly_id}'"
        )
    return explanation


@app.get("/api/explainability/relationship/{source}/{target}")
def get_relationship_explanation(source: str, target: str):
    """Phase 3I: Returns co-occurrence derivation explanation for a relationship pair."""
    explanation = IntelligenceService.get_relationship_explanation(source, target)
    if not explanation:
        raise HTTPException(
            status_code=404,
            detail=f"No relationship explanation found between '{source}' and '{target}'"
        )
    return explanation


@app.get("/api/explainability/path/{source}/{target}")
def get_path_explanation(source: str, target: str):
    """Phase 3I: Returns shortest-path traversal explanation between two entities."""
    explanation = IntelligenceService.get_path_explanation(source, target)
    if not explanation:
        raise HTTPException(
            status_code=404,
            detail=f"No graph connection path found between '{source}' and '{target}'"
        )
    return explanation


@app.get("/api/explainability/{explanation_id}")
def get_explanation(explanation_id: str):
    """Phase 3I: Returns a single intelligence explanation by its deterministic ID."""
    explanation = IntelligenceService.get_explanation(explanation_id)
    if not explanation:
        raise HTTPException(
            status_code=404,
            detail=f"Explanation '{explanation_id}' not found"
        )
    return explanation


# ── Phase 3J: Temporal Intelligence Endpoints ─────────────────────────────────

@app.get("/api/temporal/activity")
def get_temporal_activity(granularity: str = "day"):
    """Phase 3J: Returns activity density buckets grouped by day, week, or month."""
    return IntelligenceService.get_temporal_activity(granularity)


@app.get("/api/temporal/evolution")
def get_temporal_evolution():
    """Phase 3J: Returns longitudinal network evolution snapshots reconstructed from observations."""
    return IntelligenceService.get_temporal_evolution()


@app.get("/api/temporal/patterns")
def get_temporal_patterns(type: Optional[str] = None):
    """Phase 3J: Returns detected deterministic temporal patterns, optionally filtered by type."""
    return IntelligenceService.get_temporal_patterns(type)


@app.get("/api/temporal/entity/{entity_id}")
def get_temporal_entity(entity_id: str):
    """Phase 3J: Returns chronological activity profile, observation history, and gaps for an entity."""
    res = IntelligenceService.get_temporal_entity(entity_id)
    if not res:
        raise HTTPException(
            status_code=404,
            detail=f"No temporal activity recorded for entity '{entity_id}'"
        )
    return res


@app.get("/api/temporal/case/{case_id}")
def get_temporal_case(case_id: str):
    """Phase 3J: Returns chronological event stream for a case."""
    res = IntelligenceService.get_temporal_case(case_id)
    if not res:
        raise HTTPException(
            status_code=404,
            detail=f"No temporal observations recorded for case '{case_id}'"
        )
    return res


@app.get("/api/temporal/relationship/{source}/{target}")
def get_temporal_relationship(source: str, target: str):
    """Phase 3J: Returns chronological trajectory and milestones for relationship between two entities."""
    res = IntelligenceService.get_temporal_relationship(source, target)
    if not res:
        raise HTTPException(
            status_code=404,
            detail=f"No temporal relationship trajectory found between '{source}' and '{target}'"
        )
    return res


@app.get("/api/temporal")
def get_temporal_overview():
    """Phase 3J: Returns overall temporal intelligence summary, KPIs, and recent observations."""
    return IntelligenceService.get_temporal_overview()


@app.get("/api/temporal/{temporal_id}")
def get_temporal_observation(temporal_id: str):
    """Phase 3J: Returns a single temporal observation by its deterministic ID or record ID."""
    obs = IntelligenceService.get_temporal_observation(temporal_id)
    if not obs:
        raise HTTPException(
            status_code=404,
            detail=f"Temporal observation '{temporal_id}' not found"
        )
    return obs


# ── Phase 3K: Advanced Graph Intelligence Endpoints ──────────────────────────

@app.get("/api/graph-intelligence/overview")
def get_graph_intelligence_overview():
    """Phase 3K: Returns comprehensive graph-wide topological metrics and summary statistics."""
    return IntelligenceService.get_graph_intelligence_overview()


@app.get("/api/graph-intelligence/neighborhood/{entity_id}")
def get_graph_neighborhood(entity_id: str):
    """Phase 3K: Returns 1-hop and 2-hop ego-network neighborhood for an entity."""
    res = IntelligenceService.get_graph_neighborhood(entity_id)
    if not res:
        raise HTTPException(
            status_code=404,
            detail=f"Entity '{entity_id}' not found in intelligence graph"
        )
    return res


@app.get("/api/graph-intelligence/path/{source}/{target}")
def get_graph_intelligence_path(source: str, target: str):
    """Phase 3K: Returns deterministic shortest path with hop-by-hop evidence traces."""
    res = IntelligenceService.get_graph_path(source, target)
    if not res.get("path_exists"):
        raise HTTPException(
            status_code=404,
            detail=f"No graph connection path found between '{source}' and '{target}'"
        )
    return res


@app.get("/api/graph-intelligence/bridges")
def get_bridge_analysis():
    """Phase 3K: Returns betweenness-based bridge nodes, articulation points, and biconnectivity analysis."""
    return IntelligenceService.get_bridge_analysis()


@app.get("/api/graph-intelligence/communities")
def get_community_analysis(community_id: Optional[int] = None):
    """Phase 3K: Returns community structures, internal densities, and boundary cross-links."""
    return IntelligenceService.get_community_analysis(community_id)


@app.get("/api/graph-intelligence/communities/{community_id}")
def get_single_community_analysis(community_id: int):
    """Phase 3K: Returns structural metrics and members for a single community."""
    res = IntelligenceService.get_community_analysis(community_id)
    comms = res.get("communities", [])
    if not comms:
        raise HTTPException(
            status_code=404,
            detail=f"Community '{community_id}' not found"
        )
    return comms[0]


@app.get("/api/graph-intelligence/centrality")
def get_centrality_comparison():
    """Phase 3K: Returns unified multi-metric centrality comparison matrix for all nodes."""
    return IntelligenceService.get_centrality_comparison()


@app.get("/api/graph-intelligence/motifs")
def get_graph_motifs():
    """Phase 3K: Returns detected topological motifs (triangles, star-hubs, community bridges)."""
    return IntelligenceService.get_graph_motifs()


@app.get("/api/graph-intelligence/compare/{entity_a}/{entity_b}")
def compare_graph_entities(entity_a: str, entity_b: str):
    """Phase 3K: Returns factual side-by-side metric comparison of two entities."""
    res = IntelligenceService.compare_entities(entity_a, entity_b)
    if not res:
        raise HTTPException(
            status_code=404,
            detail=f"One or both entities ('{entity_a}', '{entity_b}') not found in intelligence graph"
        )
    return res


@app.get("/api/graph-intelligence")
def get_graph_intelligence_root():
    """Phase 3K: Returns graph intelligence overview as root endpoint."""
    return IntelligenceService.get_graph_intelligence_overview()


@app.get("/api/anomalies")
def get_anomalies():
    return IntelligenceService.get_anomalies()


@app.get("/api/anomalies/{anomaly_id}")
def get_anomaly_detail(anomaly_id: str):
    detail = IntelligenceService.get_anomaly_detail(anomaly_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Anomaly '{anomaly_id}' not found")
    return detail


@app.get("/api/timeline")
def get_timeline():
    return IntelligenceService.get_timeline()


@app.get("/api/locations")
def get_locations():
    return IntelligenceService.get_locations()


@app.get("/api/locations/{location_id}")
def get_location_detail(location_id: str):
    loc = IntelligenceService.get_location_detail(location_id)
    if not loc:
        raise HTTPException(status_code=404, detail=f"Location '{location_id}' not found")
    return loc


@app.get("/api/reports")
def get_reports():
    return IntelligenceService.get_reports()


@app.get("/api/search")
def search(q: str = ""):
    return IntelligenceService.search(q)


@app.get("/api/sources")
def get_sources():
    return IntelligenceService.get_sources()


@app.get("/api/sources/{source_id}")
def get_source_detail(source_id: str):
    detail = IntelligenceService.get_source_detail(source_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Source '{source_id}' not found in registered connectors")
    return detail


@app.post("/api/ingest")
def trigger_ingest():
    """Safely triggers intelligence pipeline re-ingestion and cache refresh."""
    data = IntelligenceService.get_data(force_reload=True)
    return {
        "status": "success",
        "message": "Intelligence pipeline re-executed successfully. Ingestion cache flushed and rebuilt.",
        "reloaded_at": getattr(IntelligenceService, "_last_ingestion_time", None),
        "records_ingested": data["total_records"],
        "entities_extracted": data["summary"]["num_nodes"],
        "relationships_built": data["summary"]["num_edges"],
        "anomalies_detected": len(data["suspicious_patterns"]),
        "sources_active": 4,
    }

@app.get("/api/cases")
def get_cases():
    return IntelligenceService.get_cases()


@app.get("/api/cases/{case_id}")
def get_case_detail(case_id: str):
    detail = IntelligenceService.get_case_detail(case_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found in registered intelligence records")
    return detail




class WorkflowStatusUpdate(BaseModel):
    status: str


class ChecklistItemUpdate(BaseModel):
    item_id: str
    completed: bool


class FollowupCreate(BaseModel):
    title: str
    category: str
    related_target: Optional[str] = None
    notes: Optional[str] = None


class FollowupUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


@app.get("/api/cases/{case_id}/workflow")
def get_case_workflow(case_id: str):
    wf = IntelligenceService.get_case_workflow(case_id)
    if not wf:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found in registered intelligence records")
    return wf


@app.patch("/api/cases/{case_id}/workflow")
def update_case_workflow(case_id: str, payload: WorkflowStatusUpdate):
    try:
        wf = IntelligenceService.update_case_workflow(case_id, payload.status)
        if not wf:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found in registered intelligence records")
        return wf
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.patch("/api/cases/{case_id}/checklist")
def update_checklist_item(case_id: str, payload: ChecklistItemUpdate):
    try:
        wf = IntelligenceService.toggle_case_checklist(case_id, payload.item_id, payload.completed)
        if not wf:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found in registered intelligence records")
        return wf
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/cases/{case_id}/followups")
def create_followup(case_id: str, payload: FollowupCreate):
    try:
        fu = IntelligenceService.add_case_followup(case_id, payload.dict())
        if not fu:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found in registered intelligence records")
        return fu
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.patch("/api/cases/{case_id}/followups/{followup_id}")
def update_followup(case_id: str, followup_id: str, payload: FollowupUpdate):
    try:
        fu = IntelligenceService.update_case_followup(case_id, followup_id, payload.dict(exclude_unset=True))
        if not fu:
            raise HTTPException(status_code=404, detail=f"Follow-up '{followup_id}' not found for case '{case_id}'")
        return fu
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/system/config")
def get_system_config():
    """Returns transparent system architecture, pipeline, and algorithm configurations."""
    return IntelligenceService.get_system_config()


@app.get("/api/system/health")
def get_system_health():
    """Returns live operational diagnostics for API, engine, dataset, and workflow store."""
    return IntelligenceService.get_system_health()


@app.post("/api/system/reset-session")
def reset_system_session():
    """Safely resets investigator session modifications in WorkflowStore without affecting data."""
    return IntelligenceService.reset_session_workflow()


@app.get("/api/investigation")
def get_investigation(
    target_type: str = "case",
    target_id: str = "CR-1001",
    temporal_window: str = "all",
):
    """Unified investigation dossier across case, entity, location, or anomaly targets."""
    dossier = IntelligenceService.get_investigation_dossier(target_type, target_id, temporal_window)
    if not dossier:
        raise HTTPException(
            status_code=404,
            detail=f"Investigation target '{target_id}' of type '{target_type}' not found."
        )
    return dossier


@app.get("/api/investigation/path")
def get_investigation_path(start: str, end: str):
    """Deterministic shortest path analysis between two entities in the intelligence graph."""
    return IntelligenceService.compute_path_analysis(start, end)


# ─── Phase 3F: Data Quality & Adversarial Robustness ─────────────────────────

@app.get("/api/data-quality/catalogue")
def get_data_quality_catalogue():
    """Returns the comprehensive fixture catalogue organized by 20 robustness categories (A–T)."""
    from server.data_quality import DataQualityService
    return DataQualityService.get_fixture_catalogue()


@app.get("/api/data-quality/results")
def get_data_quality_results():
    """Executes the 28 robustness tests against isolated pipeline fixtures and returns report."""
    from server.data_quality import DataQualityService
    return DataQualityService.run_robustness_tests()


@app.get("/api/data-quality/results/{test_id}")
def get_data_quality_result_detail(test_id: str):
    """Returns detailed evaluation and diagnostics for a single robustness test."""
    from server.data_quality import DataQualityService
    result = DataQualityService.get_test_result(test_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Robustness test '{test_id}' not found")
    return result


# ─── Phase 4: FIR Module REST Endpoints ─────────────────────────────────────

@app.get("/api/fir")
def list_firs(
    status: Optional[str] = None,
    police_station: Optional[str] = None,
    district: Optional[str] = None,
    case_id: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """Lists persistent FIR intake records with optional exact filters and pagination."""
    return IntelligenceService.list_firs(
        status=status,
        police_station=police_station,
        district=district,
        case_id=case_id,
        category=category,
        limit=limit,
        offset=offset,
    )


@app.post("/api/fir")
def create_fir(payload: Dict[str, Any] = Body(...)):
    """Registers a new FIR record with validation and atomic disk persistence."""
    success, rec, err = IntelligenceService.create_fir(payload)
    if not success:
        raise HTTPException(status_code=400, detail=err)
    return rec


@app.get("/api/fir/search/query")
def search_firs(
    q: Optional[str] = None,
    police_station: Optional[str] = None,
    district: Optional[str] = None,
    accused: Optional[str] = None,
    complainant: Optional[str] = None,
    category: Optional[str] = None,
    case_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    review_status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """
    Multi-field search across persistent FIR records.
    Registered BEFORE /api/fir/{fir_id} to prevent route shadowing.
    """
    return IntelligenceService.search_firs(
        query=q,
        police_station=police_station,
        district=district,
        accused_name=accused,
        complainant_name=complainant,
        category=category,
        case_id=case_id,
        start_date=start_date,
        end_date=end_date,
        review_status=review_status,
        limit=limit,
        offset=offset,
    )


@app.get("/api/fir/reference/legal-provisions")
def get_fir_legal_provisions():
    """
    Returns canonical Bharatiya Nyaya Sanhita (BNS, 2023) catalog with legacy IPC mappings.
    Registered BEFORE /api/fir/{fir_id} to prevent route shadowing.
    """
    return IntelligenceService.get_fir_legal_provisions()


@app.get("/api/fir/suggest-bns")
def suggest_bns_provisions(category: Optional[str] = None, narrative: Optional[str] = None):
    """
    Returns dynamic BNS 2023 legal-provision suggestions based on incident category and narrative.
    Registered BEFORE /api/fir/{fir_id} to prevent route shadowing.
    """
    return IntelligenceService.suggest_bns_provisions(category=category or "", narrative=narrative or "")


@app.get("/api/fir/kpis")
def get_fir_kpis():
    """
    Returns summary KPI counts and category breakdowns for FIR workspace.
    Registered BEFORE /api/fir/{fir_id} to prevent route shadowing.
    """
    return IntelligenceService.get_fir_kpis()


@app.get("/api/fir/{fir_id}")
def get_fir_detail(fir_id: str):
    """Retrieves an individual FIR record by ID or FIR number."""
    rec = IntelligenceService.get_fir(fir_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"FIR '{fir_id}' not found")
    return rec


@app.put("/api/fir/{fir_id}")
def update_fir(fir_id: str, payload: Dict[str, Any] = Body(...)):
    """Updates an existing FIR record and logs an audit trail entry."""
    success, rec, err = IntelligenceService.update_fir(fir_id, payload)
    if not success:
        raise HTTPException(status_code=400, detail=err)
    return rec


@app.delete("/api/fir/{fir_id}")
def delete_fir(fir_id: str):
    """Deletes an FIR record from persistent storage."""
    success = IntelligenceService.delete_fir(fir_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"FIR '{fir_id}' not found")
    return {"status": "deleted", "fir_id": fir_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host="127.0.0.1", port=8000, reload=True)
