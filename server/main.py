"""
main.py
-------
FastAPI REST API application for Crime Network Intelligence System (CNIS).
Exposes structured endpoints for the React dashboard.
"""

from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
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
    locations = IntelligenceService.get_locations()
    loc = next((l for l in locations if l["id"].lower() == location_id.lower()), None)
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



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host="127.0.0.1", port=8000, reload=True)
