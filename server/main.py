"""
main.py
-------
FastAPI REST API application for Crime Network Intelligence System (CNIS).
Exposes structured endpoints for the React dashboard.
"""

from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
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


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "system": "Crime Network Intelligence System",
        "phase": "Phase 2A",
        "engine_cached": IntelligenceService._cached_data is not None,
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host="127.0.0.1", port=8000, reload=True)
