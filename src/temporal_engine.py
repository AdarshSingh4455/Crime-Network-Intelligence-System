"""
temporal_engine.py
-------------------
CNIS Phase 3J: Deterministic Temporal Intelligence Engine.

Answers the investigator question:
    "What changed, when did it change, and how did the observed network evolve over time?"

Phase 3H answered: "What evidence supports this?" (Provenance & Grounding)
Phase 3I answered: "How was this finding derived?" (Explainable Derivation)
Phase 3J answers: "How did the observed intelligence evolve over time?" (Temporal Reasoning)

Strict Epistemic Principles (Enforced throughout):
  1. Temporal proximity != coordination.
  2. Temporal overlap != communication.
  3. Sequence != causation.
  4. Repeated activity != criminal intent.
  5. Increased activity != increased criminality.
  6. A temporal pattern is an analytical observation, not proof of crime.
  7. A relationship absent from a time window means 'not observed in this window',
     NOT 'relationship ended in reality'.
  8. A temporal gap means 'no observation was recorded between these two dates',
     NOT 'entity was inactive in reality'.
  9. Observations sharing same date/location represent 'Same-Date/Location Observation Overlap',
     NOT proof of physical meeting or conspiracy.
  10. Zero external runtime LLMs; 100% deterministic and idempotent.
  11. Average-case O(1) indexed lookups for observations, entities, cases, and relationships.
  12. Strict preservation of DATE_ONLY vs DATE_TIME precision without timestamp fabrication.
"""

from __future__ import annotations

import datetime
import re
from dataclasses import dataclass, field
from itertools import combinations
from typing import Any, Dict, List, Optional, Set, Tuple


# ── 1. Epistemic Constants & Limitation Statements ────────────────────────────

LIMITATIONS_TEMPORAL_GENERAL = (
    "Chronological sequencing reflects recorded dates of incident reporting in intelligence feeds. "
    "Temporal proximity indicates chronological correlation, not verified coordination or intent."
)

LIMITATIONS_NETWORK_EVOLUTION = (
    "Network snapshots represent entities and co-occurrences observed within specific time windows. "
    "The absence of an entity or relationship from a time window indicates lack of recorded observation, "
    "not cessation of association or operational activity in reality."
)

LIMITATIONS_TEMPORAL_GAP = (
    "A temporal gap indicates that no intelligence observations were recorded between the two dates. "
    "It does not demonstrate that the entity was inactive or disassociated in reality."
)

LIMITATIONS_SAME_DATE_LOCATION = (
    "Same-date or same-location observations indicate contextual co-occurrence in incident reports. "
    "They do not establish direct communication, illicit coordination, or verified physical meetings."
)

LIMITATIONS_BURST_ACTIVITY = (
    "Burst activity flags an elevated frequency of recorded events within a short time span. "
    "Frequency metrics reflect data transmission patterns, not verified criminal conspiracy."
)

LIMITATIONS_LATE_APPEARANCE = (
    "Late timeline appearance identifies entities first observed in the latter portion of the recorded timeline. "
    "This is an analytical observation reflecting collection chronology, not evidence of covert onboarding or guilt."
)

LIMITATIONS_RELATIONSHIP_EVOLUTION = (
    "Relationship evolution tracks the first and last dates when two entities co-occurred in source records. "
    "Observed co-occurrence does not establish criminal partnership, command structure, or unlawful coordination."
)


# ── 2. Helper Slug & Canonical Pair Functions ─────────────────────────────────

def _slug(val: str) -> str:
    """Creates a deterministic, URL-safe uppercase slug from a string."""
    s = re.sub(r"[^A-Za-z0-9]+", "-", str(val).strip()).strip("-").upper()
    return s or "UNKNOWN"


def canonical_pair(u: str, v: str) -> Tuple[str, str]:
    """Canonicalizes an unordered entity pair so (A, B) and (B, A) are identical."""
    u_clean = u.strip()
    v_clean = v.strip()
    return (u_clean, v_clean) if u_clean <= v_clean else (v_clean, u_clean)


# ── 3. Data Models ────────────────────────────────────────────────────────────

@dataclass
class TemporalObservation:
    """Atomic, timestamped intelligence observation grounded in a source record."""
    observation_id: str
    record_id: str
    case_id: str
    date: str                        # YYYY-MM-DD
    time: Optional[str]              # HH:MM (24-hour) if genuinely present, else None
    iso_timestamp: str               # ISO 8601 string
    precision: str                   # 'DATE_TIME' | 'DATE_ONLY'
    timezone: str                    # 'Asia/Kolkata (IST, UTC+05:30)'
    source: str                      # Ingestion source connector
    source_label: str                # Human-readable source label
    entities: List[str]              # Canonical entities present
    locations: List[str]             # Location entities present
    observation_type: str            # INCIDENT | COMMUNICATION | FINANCIAL | TIP | SURVEILLANCE
    description: str                 # Verbatim excerpt or description
    evidence_id: str                 # Phase 3H Evidence Item pointer
    metadata: Dict[str, Any] = field(default_factory=dict)
    epistemic_limitation: str = LIMITATIONS_TEMPORAL_GENERAL

    def to_dict(self) -> Dict[str, Any]:
        return {
            "observation_id": self.observation_id,
            "record_id": self.record_id,
            "case_id": self.case_id,
            "date": self.date,
            "time": self.time,
            "iso_timestamp": self.iso_timestamp,
            "precision": self.precision,
            "timezone": self.timezone,
            "source": self.source,
            "source_label": self.source_label,
            "entities": self.entities,
            "locations": self.locations,
            "observation_type": self.observation_type,
            "description": self.description,
            "evidence_id": self.evidence_id,
            "metadata": self.metadata,
            "epistemic_limitation": self.epistemic_limitation,
        }


@dataclass
class TemporalGap:
    """Deterministic gap between consecutive observations of an entity or relationship."""
    prior_date: str
    next_date: str
    gap_days: int
    prior_record_id: str
    next_record_id: str
    epistemic_note: str = LIMITATIONS_TEMPORAL_GAP

    def to_dict(self) -> Dict[str, Any]:
        return {
            "prior_date": self.prior_date,
            "next_date": self.next_date,
            "gap_days": self.gap_days,
            "prior_record_id": self.prior_record_id,
            "next_record_id": self.next_record_id,
            "epistemic_note": self.epistemic_note,
        }


@dataclass
class TemporalEntityActivity:
    """Chronological activity profile for an entity across all observations."""
    entity_id: str
    entity_type: str
    first_observed: str
    last_observed: str
    span_days: int
    observation_count: int
    active_dates: List[str]
    observation_ids: List[str]
    gaps: List[Dict[str, Any]]
    max_gap_days: int
    related_cases: List[str]
    locations_over_time: List[Dict[str, Any]]
    relationships_over_time: List[Dict[str, Any]]
    anomalies_over_time: List[Dict[str, Any]]
    epistemic_limitation: str = LIMITATIONS_TEMPORAL_GENERAL

    def to_dict(self) -> Dict[str, Any]:
        return {
            "entity_id": self.entity_id,
            "entity_type": self.entity_type,
            "first_observed": self.first_observed,
            "last_observed": self.last_observed,
            "span_days": self.span_days,
            "observation_count": self.observation_count,
            "active_dates": self.active_dates,
            "observation_ids": self.observation_ids,
            "gaps": self.gaps,
            "max_gap_days": self.max_gap_days,
            "related_cases": self.related_cases,
            "locations_over_time": self.locations_over_time,
            "relationships_over_time": self.relationships_over_time,
            "anomalies_over_time": self.anomalies_over_time,
            "epistemic_limitation": self.epistemic_limitation,
        }


@dataclass
class TemporalRelationshipEvolution:
    """Chronological co-occurrence trajectory for a pair of entities."""
    relationship_id: str
    source: str
    target: str
    canonical_pair: Tuple[str, str]
    first_observed: str
    last_observed: str
    span_days: int
    observation_count: int
    observation_dates: List[str]
    supporting_records: List[str]
    supporting_evidence_ids: List[str]
    explanation_id: Optional[str] = None
    epistemic_limitation: str = LIMITATIONS_RELATIONSHIP_EVOLUTION

    def to_dict(self) -> Dict[str, Any]:
        return {
            "relationship_id": self.relationship_id,
            "source": self.source,
            "target": self.target,
            "canonical_pair": list(self.canonical_pair),
            "first_observed": self.first_observed,
            "last_observed": self.last_observed,
            "span_days": self.span_days,
            "observation_count": self.observation_count,
            "observation_dates": self.observation_dates,
            "supporting_records": self.supporting_records,
            "supporting_evidence_ids": self.supporting_evidence_ids,
            "explanation_id": self.explanation_id,
            "epistemic_limitation": self.epistemic_limitation,
        }


@dataclass
class NetworkEvolutionSnapshot:
    """Longitudinal time-window slice reconstructed directly from source observations."""
    window_index: int
    window_id: str
    window_label: str
    start_date: str
    end_date: str
    observation_count: int
    active_nodes: List[str]
    active_edges: List[List[str]]
    added_nodes: List[str]
    departed_nodes: List[str]
    new_edges: List[List[str]]
    no_longer_observed_edges: List[List[str]]
    epistemic_limitation: str = LIMITATIONS_NETWORK_EVOLUTION

    def to_dict(self) -> Dict[str, Any]:
        return {
            "window_index": self.window_index,
            "window_id": self.window_id,
            "window_label": self.window_label,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "observation_count": self.observation_count,
            "active_nodes": self.active_nodes,
            "active_edges": self.active_edges,
            "added_nodes": self.added_nodes,
            "departed_nodes": self.departed_nodes,
            "new_edges": self.new_edges,
            "no_longer_observed_edges": self.no_longer_observed_edges,
            "epistemic_limitation": self.epistemic_limitation,
        }


@dataclass
class TemporalPattern:
    """Deterministic pattern detected across actual temporal observations."""
    pattern_id: str
    pattern_type: str
    pattern_label: str
    target_entities: List[str]
    target_records: List[str]
    date_range: Tuple[str, str]
    observation_ids: List[str]
    metric_value: str
    description: str
    supporting_evidence_ids: List[str]
    explanation_id: Optional[str] = None
    epistemic_limitation: str = LIMITATIONS_TEMPORAL_GENERAL

    def to_dict(self) -> Dict[str, Any]:
        return {
            "pattern_id": self.pattern_id,
            "pattern_type": self.pattern_type,
            "pattern_label": self.pattern_label,
            "target_entities": self.target_entities,
            "target_records": self.target_records,
            "date_range": list(self.date_range),
            "observation_ids": self.observation_ids,
            "metric_value": self.metric_value,
            "description": self.description,
            "supporting_evidence_ids": self.supporting_evidence_ids,
            "explanation_id": self.explanation_id,
            "epistemic_limitation": self.epistemic_limitation,
        }


# ── 4. Normalization Engine ───────────────────────────────────────────────────

_ISO_DATE_RE = re.compile(r"^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$")
_TIME_24H_RE = re.compile(r"\b([01]?[0-9]|2[0-3]):([0-5][0-9])\b")


def extract_time_from_text(text: str) -> Optional[str]:
    """
    Deterministically extracts 24-hour time mention (HH:MM) from raw text if present.
    Does NOT invent or fabricate timestamps if absent.
    """
    if not text:
        return None
    match = _TIME_24H_RE.search(text)
    if match:
        h, m = int(match.group(1)), int(match.group(2))
        return f"{h:02d}:{m:02d}"
    return None


def normalize_timestamp(raw_date: Any, text: str = "") -> Tuple[Optional[str], Optional[str], str, str]:
    """
    Normalizes timestamp preserving exact precision without fabrication.
    Returns: (normalized_date, normalized_time, iso_timestamp, precision)
    Where precision is 'DATE_TIME', 'DATE_ONLY', or 'UNKNOWN'.
    """
    if not raw_date:
        return (None, None, "", "UNKNOWN")

    d_str = str(raw_date).strip()
    # Check if raw_date has full ISO datetime (e.g. 2026-01-05T22:00:00)
    if "T" in d_str:
        parts = d_str.split("T")
        d_part = parts[0].strip()
        t_part = parts[1].strip()[:5]
        if _ISO_DATE_RE.match(d_part):
            t_match = _TIME_24H_RE.match(t_part)
            if t_match:
                t_clean = f"{int(t_match.group(1)):02d}:{int(t_match.group(2)):02d}"
                return (d_part, t_clean, f"{d_part}T{t_clean}:00+05:30", "DATE_TIME")
            return (d_part, None, d_part, "DATE_ONLY")

    # Standard YYYY-MM-DD date
    if _ISO_DATE_RE.match(d_str):
        time_found = extract_time_from_text(text)
        if time_found:
            return (d_str, time_found, f"{d_str}T{time_found}:00+05:30", "DATE_TIME")
        return (d_str, None, d_str, "DATE_ONLY")

    return (None, None, "", "UNKNOWN")


def date_diff_days(d1: str, d2: str) -> int:
    """Computes absolute calendar days between two YYYY-MM-DD dates."""
    try:
        dt1 = datetime.date.fromisoformat(d1)
        dt2 = datetime.date.fromisoformat(d2)
        return abs((dt2 - dt1).days)
    except Exception:
        return 0


# ── 5. Deterministic Temporal Engine ──────────────────────────────────────────

class TemporalEngine:
    """
    CNIS Phase 3J: Temporal Intelligence Engine.
    Compiled once during application lifecycle and cached for average-case O(1) queries.
    """

    def __init__(self):
        # Ledgers and indices
        self.observations: List[TemporalObservation] = []
        self.index_by_id: Dict[str, TemporalObservation] = {}
        self.index_by_date: Dict[str, List[TemporalObservation]] = {}
        self.index_by_entity: Dict[str, List[TemporalObservation]] = {}
        self.index_by_case: Dict[str, List[TemporalObservation]] = {}
        self.index_by_relationship: Dict[Tuple[str, str], TemporalRelationshipEvolution] = {}

        # Derived temporal products
        self.entity_activities: Dict[str, TemporalEntityActivity] = {}
        self.relationship_evolutions: List[TemporalRelationshipEvolution] = []
        self.network_snapshots: List[NetworkEvolutionSnapshot] = []
        self.patterns: List[TemporalPattern] = []
        self.activity_density: Dict[str, Dict[str, int]] = {"day": {}, "week": {}, "month": {}}

        # Summary KPIs
        self.summary_kpis: Dict[str, Any] = {}
        self.is_compiled: bool = False

    def compile(
        self,
        records: List[Any],
        extracted: List[Any],
        G: Any,
        anomalies: List[Dict[str, Any]],
        canonical_registry: Optional[Dict[str, Any]] = None,
        evidence_engine: Optional[Any] = None,
        explainability_engine: Optional[Any] = None,
    ) -> None:
        """
        Compiles the temporal intelligence layer from existing pipeline outputs.
        Does NOT re-execute graph algorithms or modify raw data.
        """
        self._reset()

        # Step 1: Build TemporalObservation ledger directly from source records
        self._build_observations(records, extracted, canonical_registry, evidence_engine)

        # Step 2: Compute Activity Density (day, week, month)
        self._compute_activity_density()

        # Step 3: Compute Entity Activity Chronologies & Inactivity Gaps
        self._compute_entity_activities(canonical_registry, anomalies, explainability_engine)

        # Step 4: Compute Canonical Relationship Temporal Evolution
        self._compute_relationship_evolutions(records, extracted, canonical_registry, evidence_engine, explainability_engine)

        # Step 5: Construct Longitudinal Network Evolution Snapshots
        self._construct_network_evolution_snapshots(records, extracted, canonical_registry)

        # Step 6: Detect Grounded Temporal Patterns
        self._detect_temporal_patterns(records, anomalies, evidence_engine, explainability_engine)

        # Step 7: Build Summary KPIs
        self._build_summary_kpis()

        self.is_compiled = True

    def _reset(self) -> None:
        self.observations.clear()
        self.index_by_id.clear()
        self.index_by_date.clear()
        self.index_by_entity.clear()
        self.index_by_case.clear()
        self.index_by_relationship.clear()
        self.entity_activities.clear()
        self.relationship_evolutions.clear()
        self.network_snapshots.clear()
        self.patterns.clear()
        self.activity_density = {"day": {}, "week": {}, "month": {}}
        self.summary_kpis.clear()
        self.is_compiled = False

    def _build_observations(
        self,
        records: List[Any],
        extracted: List[Any],
        canonical_registry: Optional[Dict[str, Any]],
        evidence_engine: Optional[Any],
    ) -> None:
        """Constructs atomic temporal observations for each valid ingested record."""
        # Map record_id -> ExtractedRecord
        rec_extracted_map: Dict[str, Any] = {}
        for ex in extracted:
            rec_extracted_map[ex.record_id] = ex

        # Map variant names to canonical names
        var_to_canon: Dict[str, str] = {}
        if canonical_registry:
            for c_id, ce in canonical_registry.items():
                c_name = getattr(ce, "canonical_name", c_id)
                var_to_canon[c_name] = c_name
                for v in getattr(ce, "observed_variants", []):
                    var_to_canon[v] = c_name

        obs_list: List[TemporalObservation] = []

        for rec in records:
            rid = rec.record_id if hasattr(rec, "record_id") else rec.get("record_id", "")
            rdate = rec.date if hasattr(rec, "date") else rec.get("date", "")
            rtext = rec.text if hasattr(rec, "text") else rec.get("text", "")
            rsource = rec.source if hasattr(rec, "source") else rec.get("source", "unknown")

            norm_date, norm_time, iso_ts, precision = normalize_timestamp(rdate, rtext)
            if not norm_date:
                # Discard invalid or un-dateable records from temporal timeline
                continue

            # Resolve entities for this record
            ex = rec_extracted_map.get(rid)
            ent_names: List[str] = []
            loc_names: List[str] = []
            if ex:
                for ent in ex.entities:
                    c_name = var_to_canon.get(ent.text, ent.text)
                    if c_name not in ent_names:
                        ent_names.append(c_name)
                    if ent.label == "LOCATION" and c_name not in loc_names:
                        loc_names.append(c_name)

            # Determine observation type from source
            src_lower = rsource.lower()
            if "call" in src_lower or "cdr" in src_lower:
                obs_type = "COMMUNICATION"
            elif "finan" in src_lower or "fiu" in src_lower or "bank" in src_lower:
                obs_type = "FINANCIAL_TRANSACTION"
            elif "tip" in src_lower or "informant" in src_lower:
                obs_type = "INTELLIGENCE_TIP"
            elif "anpr" in src_lower or "cctv" in src_lower:
                obs_type = "SURVEILLANCE"
            else:
                obs_type = "INCIDENT"

            source_label = rsource.replace("_", " ").title()
            obs_id = f"TOBS-{rid}-01"
            evidence_id = f"EVID-REC-{_slug(rid)}"

            obs = TemporalObservation(
                observation_id=obs_id,
                record_id=rid,
                case_id=rid,
                date=norm_date,
                time=norm_time,
                iso_timestamp=iso_ts,
                precision=precision,
                timezone="Asia/Kolkata (IST, UTC+05:30)",
                source=rsource,
                source_label=source_label,
                entities=sorted(ent_names),
                locations=sorted(loc_names),
                observation_type=obs_type,
                description=rtext,
                evidence_id=evidence_id,
                metadata={
                    "entity_count": len(ent_names),
                    "location_count": len(loc_names),
                    "has_time_precision": precision == "DATE_TIME",
                },
            )
            obs_list.append(obs)

        # Deterministic sort: date -> time (empty first) -> record_id
        obs_list.sort(key=lambda o: (o.date, o.time or "", o.record_id))
        self.observations = obs_list

        # Populate indices for average-case O(1) lookups
        for o in self.observations:
            self.index_by_id[o.observation_id] = o
            self.index_by_date.setdefault(o.date, []).append(o)
            self.index_by_case.setdefault(o.case_id, []).append(o)
            for ent in o.entities:
                self.index_by_entity.setdefault(ent, []).append(o)

    def _compute_activity_density(self) -> None:
        """Computes deterministic activity density counts by day, week, and month."""
        day_counts: Dict[str, int] = {}
        week_counts: Dict[str, int] = {}
        month_counts: Dict[str, int] = {}

        for o in self.observations:
            # Day bucket
            day_counts[o.date] = day_counts.get(o.date, 0) + 1

            # Week bucket (ISO year-week, e.g. 2026-W01)
            try:
                dt = datetime.date.fromisoformat(o.date)
                iso_year, iso_week, _ = dt.isocalendar()
                week_key = f"{iso_year}-W{iso_week:02d}"
                week_counts[week_key] = week_counts.get(week_key, 0) + 1
            except Exception:
                pass

            # Month bucket (YYYY-MM)
            month_key = o.date[:7]
            month_counts[month_key] = month_counts.get(month_key, 0) + 1

        self.activity_density = {
            "day": dict(sorted(day_counts.items())),
            "week": dict(sorted(week_counts.items())),
            "month": dict(sorted(month_counts.items())),
        }

    def _compute_entity_activities(
        self,
        canonical_registry: Optional[Dict[str, Any]],
        anomalies: List[Dict[str, Any]],
        explainability_engine: Optional[Any],
    ) -> None:
        """Computes chronological activity, gaps, locations, and relationships per entity."""
        for ent, obs_list in self.index_by_entity.items():
            # Sorted chronologically
            sorted_obs = sorted(obs_list, key=lambda o: (o.date, o.time or "", o.record_id))
            dates = sorted(list({o.date for o in sorted_obs}))
            first_obs = dates[0]
            last_obs = dates[-1]
            span = date_diff_days(first_obs, last_obs)

            # Compute inter-observation gaps
            gaps: List[Dict[str, Any]] = []
            max_gap = 0
            for i in range(len(sorted_obs) - 1):
                cur_obs = sorted_obs[i]
                nxt_obs = sorted_obs[i + 1]
                gap_days = date_diff_days(cur_obs.date, nxt_obs.date)
                if gap_days > 0:
                    gaps.append({
                        "prior_date": cur_obs.date,
                        "next_date": nxt_obs.date,
                        "gap_days": gap_days,
                        "prior_record_id": cur_obs.record_id,
                        "next_record_id": nxt_obs.record_id,
                        "epistemic_note": LIMITATIONS_TEMPORAL_GAP,
                    })
                    if gap_days > max_gap:
                        max_gap = gap_days

            # Collect related cases
            cases = sorted(list({o.case_id for o in sorted_obs}))

            # Collect locations over time
            loc_history = []
            for o in sorted_obs:
                for loc in o.locations:
                    loc_history.append({
                        "date": o.date,
                        "time": o.time,
                        "location": loc,
                        "record_id": o.record_id,
                    })

            # Map correlated anomalies
            ent_anoms = []
            for a in anomalies:
                if a.get("entity") == ent:
                    ent_anoms.append({
                        "anomaly_id": a.get("id"),
                        "pattern": a.get("pattern"),
                        "date": a.get("date"),
                        "record_id": a.get("record_id"),
                        "note": a.get("note", ""),
                    })

            # Determine entity type
            ent_type = "UNKNOWN"
            if canonical_registry and ent in canonical_registry:
                ent_type = getattr(canonical_registry[ent], "entity_type", "UNKNOWN")

            self.entity_activities[ent] = TemporalEntityActivity(
                entity_id=ent,
                entity_type=ent_type,
                first_observed=first_obs,
                last_observed=last_obs,
                span_days=span,
                observation_count=len(sorted_obs),
                active_dates=dates,
                observation_ids=[o.observation_id for o in sorted_obs],
                gaps=gaps,
                max_gap_days=max_gap,
                related_cases=cases,
                locations_over_time=loc_history,
                relationships_over_time=[],  # Populated in relationship pass
                anomalies_over_time=ent_anoms,
            )

    def _compute_relationship_evolutions(
        self,
        records: List[Any],
        extracted: List[Any],
        canonical_registry: Optional[Dict[str, Any]],
        evidence_engine: Optional[Any],
        explainability_engine: Optional[Any],
    ) -> None:
        """Computes chronological trajectory for every observed co-occurrence pair."""
        # Track co-occurrences by (canon_u, canon_v) -> list of observations
        pair_obs_map: Dict[Tuple[str, str], List[TemporalObservation]] = {}

        for obs in self.observations:
            ents = obs.entities
            if len(ents) >= 2:
                for u, v in combinations(ents, 2):
                    cp = canonical_pair(u, v)
                    pair_obs_map.setdefault(cp, []).append(obs)

        evolutions: List[TemporalRelationshipEvolution] = []

        for (u, v), p_obs in sorted(pair_obs_map.items()):
            p_sorted = sorted(p_obs, key=lambda o: (o.date, o.time or "", o.record_id))
            dates = sorted(list({o.date for o in p_sorted}))
            first_seen = dates[0]
            last_seen = dates[-1]
            span = date_diff_days(first_seen, last_seen)
            recs = sorted(list({o.record_id for o in p_sorted}))

            evid_id = f"EVID-REL-{_slug(u)}-{_slug(v)}"
            expl_id = f"EXPL-REL-{_slug(u)}-{_slug(v)}" if explainability_engine else None

            rel_id = f"TREL-{_slug(u)}-{_slug(v)}"

            rel_evo = TemporalRelationshipEvolution(
                relationship_id=rel_id,
                source=u,
                target=v,
                canonical_pair=(u, v),
                first_observed=first_seen,
                last_observed=last_seen,
                span_days=span,
                observation_count=len(recs),
                observation_dates=dates,
                supporting_records=recs,
                supporting_evidence_ids=[evid_id],
                explanation_id=expl_id,
            )
            evolutions.append(rel_evo)
            self.index_by_relationship[(u, v)] = rel_evo

            # Enrich entity activity with relationship chronological milestones
            if u in self.entity_activities:
                self.entity_activities[u].relationships_over_time.append({
                    "date": first_seen,
                    "target_entity": v,
                    "relationship_id": rel_id,
                    "first_observed": first_seen,
                    "observation_count": len(recs),
                })
            if v in self.entity_activities:
                self.entity_activities[v].relationships_over_time.append({
                    "date": first_seen,
                    "target_entity": u,
                    "relationship_id": rel_id,
                    "first_observed": first_seen,
                    "observation_count": len(recs),
                })

        self.relationship_evolutions = evolutions

    def _construct_network_evolution_snapshots(
        self,
        records: List[Any],
        extracted: List[Any],
        canonical_registry: Optional[Dict[str, Any]],
    ) -> None:
        """
        Reconstructs longitudinal network slices directly from actual source observations.
        Does NOT assign timestamps to the aggregate graph or distribute edges post-hoc.
        """
        if not self.observations:
            return

        all_dates = sorted(list(self.index_by_date.keys()))
        min_date = datetime.date.fromisoformat(all_dates[0])
        max_date = datetime.date.fromisoformat(all_dates[-1])

        # Generate deterministic 7-day windows spanning from min_date to max_date
        cur_start = min_date
        window_slices: List[Tuple[datetime.date, datetime.date]] = []
        while cur_start <= max_date:
            cur_end = cur_start + datetime.timedelta(days=6)
            window_slices.append((cur_start, cur_end))
            cur_start = cur_start + datetime.timedelta(days=7)

        snapshots: List[NetworkEvolutionSnapshot] = []
        prev_nodes: Set[str] = set()
        prev_edges: Set[Tuple[str, str]] = set()

        for idx, (w_start, w_end) in enumerate(window_slices):
            w_start_str = w_start.isoformat()
            w_end_str = w_end.isoformat()
            w_id = f"TWIN-{idx+1:02d}"
            w_label = f"{w_start_str} to {w_end_str} (Window {idx+1})"

            # Find all observations falling within this window
            win_obs: List[TemporalObservation] = []
            for o in self.observations:
                o_d = datetime.date.fromisoformat(o.date)
                if w_start <= o_d <= w_end:
                    win_obs.append(o)

            # Reconstruct active nodes and edges directly from these observations
            win_nodes: Set[str] = set()
            win_edges: Set[Tuple[str, str]] = set()

            for o in win_obs:
                for ent in o.entities:
                    win_nodes.add(ent)
                if len(o.entities) >= 2:
                    for u, v in combinations(o.entities, 2):
                        win_edges.add(canonical_pair(u, v))

            # Compute deltas relative to previous window
            added_nodes = sorted(list(win_nodes - prev_nodes)) if idx > 0 else sorted(list(win_nodes))
            departed_nodes = sorted(list(prev_nodes - win_nodes)) if idx > 0 else []
            new_edges = [list(e) for e in sorted(list(win_edges - prev_edges))] if idx > 0 else [list(e) for e in sorted(list(win_edges))]
            no_longer_obs = [list(e) for e in sorted(list(prev_edges - win_edges))] if idx > 0 else []

            sorted_edges = [list(e) for e in sorted(list(win_edges))]

            snap = NetworkEvolutionSnapshot(
                window_index=idx,
                window_id=w_id,
                window_label=w_label,
                start_date=w_start_str,
                end_date=w_end_str,
                observation_count=len(win_obs),
                active_nodes=sorted(list(win_nodes)),
                active_edges=sorted_edges,
                added_nodes=added_nodes,
                departed_nodes=departed_nodes,
                new_edges=new_edges,
                no_longer_observed_edges=no_longer_obs,
            )
            snapshots.append(snap)

            prev_nodes = win_nodes
            prev_edges = win_edges

        self.network_snapshots = snapshots

    def _detect_temporal_patterns(
        self,
        records: List[Any],
        anomalies: List[Dict[str, Any]],
        evidence_engine: Optional[Any],
        explainability_engine: Optional[Any],
    ) -> None:
        """
        Detects deterministic temporal patterns grounded in actual observations.
        No hidden scoring, no probability estimates, no guilt claims.
        """
        patterns: List[TemporalPattern] = []
        pat_counter = 1

        # 1. Burst Activity Pattern (Corroborated by actual burst records)
        burst_recs = [o for o in self.observations if "burst" in o.description.lower() or "calls within" in o.description.lower()]
        for b_obs in burst_recs:
            p_id = f"TPAT-BURST-{pat_counter:03d}"
            pat_counter += 1
            expl_id = f"EXPL-ANOM-ANOM-001" if explainability_engine else None
            patterns.append(TemporalPattern(
                pattern_id=p_id,
                pattern_type="BURST_ACTIVITY",
                pattern_label="Observed Burst Activity",
                target_entities=b_obs.entities,
                target_records=[b_obs.record_id],
                date_range=(b_obs.date, b_obs.date),
                observation_ids=[b_obs.observation_id],
                metric_value="High-frequency communication burst documented in source record",
                description=f"Record {b_obs.record_id} documents high-density event burst involving {len(b_obs.entities)} entities on {b_obs.date}.",
                supporting_evidence_ids=[b_obs.evidence_id],
                explanation_id=expl_id,
                epistemic_limitation=LIMITATIONS_BURST_ACTIVITY,
            ))

        # 2. Recurring Activity Pattern (Entities appearing on >= 3 distinct dates)
        for ent, act in sorted(self.entity_activities.items()):
            if len(act.active_dates) >= 3:
                p_id = f"TPAT-RECUR-{pat_counter:03d}"
                pat_counter += 1
                patterns.append(TemporalPattern(
                    pattern_id=p_id,
                    pattern_type="RECURRING_ACTIVITY",
                    pattern_label="Recurring Multi-Date Observation",
                    target_entities=[ent],
                    target_records=[self.index_by_id[oid].record_id for oid in act.observation_ids if oid in self.index_by_id],
                    date_range=(act.first_observed, act.last_observed),
                    observation_ids=act.observation_ids,
                    metric_value=f"Observed across {len(act.active_dates)} distinct dates spanning {act.span_days} days",
                    description=f"Entity '{ent}' appears in {act.observation_count} source records across {len(act.active_dates)} separate dates.",
                    supporting_evidence_ids=[f"EVID-OBS-{_slug(ent)}"],
                    explanation_id=None,
                    epistemic_limitation="Repeated co-occurrence reflects data presence across records, not criminal intent or ongoing conspiracy.",
                ))

        # 3. Late Timeline Appearance (Entities first appearing in final 25% of timeline)
        if self.observations:
            all_dates = sorted(list(self.index_by_date.keys()))
            d_start = datetime.date.fromisoformat(all_dates[0])
            d_end = datetime.date.fromisoformat(all_dates[-1])
            total_days = max(1, (d_end - d_start).days)
            cutoff_date = d_start + datetime.timedelta(days=int(total_days * 0.75))

            for ent, act in sorted(self.entity_activities.items()):
                first_d = datetime.date.fromisoformat(act.first_observed)
                if first_d >= cutoff_date and act.observation_count <= 2:
                    p_id = f"TPAT-LATE-{pat_counter:03d}"
                    pat_counter += 1
                    patterns.append(TemporalPattern(
                        pattern_id=p_id,
                        pattern_type="LATE_TIMELINE_APPEARANCE",
                        pattern_label="Late Timeline Appearance",
                        target_entities=[ent],
                        target_records=[self.index_by_id[oid].record_id for oid in act.observation_ids if oid in self.index_by_id],
                        date_range=(act.first_observed, act.last_observed),
                        observation_ids=act.observation_ids,
                        metric_value=f"First observed on {act.first_observed} (deterministic threshold cutoff {cutoff_date.isoformat()})",
                        description=f"Entity '{ent}' was first observed on {act.first_observed} during the final 25% of the observation timeline.",
                        supporting_evidence_ids=[f"EVID-OBS-{_slug(ent)}"],
                        explanation_id=None,
                        epistemic_limitation=LIMITATIONS_LATE_APPEARANCE,
                    ))

        # 4. Same-Date/Location Observation Overlap (Entities observed at same date and location)
        date_loc_map: Dict[Tuple[str, str], List[TemporalObservation]] = {}
        for o in self.observations:
            for loc in o.locations:
                date_loc_map.setdefault((o.date, loc), []).append(o)

        for (d, loc), d_obs in sorted(date_loc_map.items()):
            all_ents = sorted(list({e for o in d_obs for e in o.entities if e != loc}))
            if len(all_ents) >= 2:
                p_id = f"TPAT-OVERLAP-{pat_counter:03d}"
                pat_counter += 1
                patterns.append(TemporalPattern(
                    pattern_id=p_id,
                    pattern_type="SAME_DATE_LOCATION_OVERLAP",
                    pattern_label="Same-Date/Location Observation Overlap",
                    target_entities=all_ents,
                    target_records=sorted(list({o.record_id for o in d_obs})),
                    date_range=(d, d),
                    observation_ids=[o.observation_id for o in d_obs],
                    metric_value=f"{len(all_ents)} entities co-observed at location '{loc}' on {d}",
                    description=f"Source records report presence of {', '.join(all_ents[:3])} at '{loc}' on {d}.",
                    supporting_evidence_ids=[o.evidence_id for o in d_obs],
                    explanation_id=None,
                    epistemic_limitation=LIMITATIONS_SAME_DATE_LOCATION,
                ))

        # 5. Temporal Gap Pattern (Entities with observation gaps >= 7 days)
        for ent, act in sorted(self.entity_activities.items()):
            long_gaps = [g for g in act.gaps if g["gap_days"] >= 7]
            for g in long_gaps:
                p_id = f"TPAT-GAP-{pat_counter:03d}"
                pat_counter += 1
                patterns.append(TemporalPattern(
                    pattern_id=p_id,
                    pattern_type="TEMPORAL_GAP",
                    pattern_label="Significant Observation Gap",
                    target_entities=[ent],
                    target_records=[g["prior_record_id"], g["next_record_id"]],
                    date_range=(g["prior_date"], g["next_date"]),
                    observation_ids=[f"TOBS-{g['prior_record_id']}-01", f"TOBS-{g['next_record_id']}-01"],
                    metric_value=f"Gap of {g['gap_days']} calendar days between recorded observations",
                    description=f"No observations recorded for '{ent}' between {g['prior_date']} and {g['next_date']} ({g['gap_days']} days).",
                    supporting_evidence_ids=[f"EVID-REC-{_slug(g['prior_record_id'])}", f"EVID-REC-{_slug(g['next_record_id'])}"],
                    explanation_id=None,
                    epistemic_limitation=LIMITATIONS_TEMPORAL_GAP,
                ))

        self.patterns = patterns

    def _build_summary_kpis(self) -> None:
        """Builds high-level summary KPIs for the temporal intelligence overview."""
        all_dates = sorted(list(self.index_by_date.keys()))
        start_date = all_dates[0] if all_dates else ""
        end_date = all_dates[-1] if all_dates else ""
        span = date_diff_days(start_date, end_date) if start_date and end_date else 0

        # Pattern type counts
        pat_by_type: Dict[str, int] = {}
        for p in self.patterns:
            pat_by_type[p.pattern_type] = pat_by_type.get(p.pattern_type, 0) + 1

        self.summary_kpis = {
            "total_observations": len(self.observations),
            "date_span_days": span,
            "earliest_date": start_date,
            "latest_date": end_date,
            "total_entities_tracked": len(self.entity_activities),
            "total_relationships_tracked": len(self.relationship_evolutions),
            "total_time_windows": len(self.network_snapshots),
            "total_patterns_detected": len(self.patterns),
            "patterns_by_type": pat_by_type,
            "timed_observations_count": sum(1 for o in self.observations if o.precision == "DATE_TIME"),
            "date_only_observations_count": sum(1 for o in self.observations if o.precision == "DATE_ONLY"),
            "activity_density_days": len(self.activity_density.get("day", {})),
        }

    # ── Query API Methods (Average-case O(1) lookups) ──────────────────────────

    def get_overview(self) -> Dict[str, Any]:
        """Returns overall temporal intelligence overview with KPIs, patterns, and density."""
        return {
            "summary_kpis": self.summary_kpis,
            "activity_density": self.activity_density,
            "recent_observations": [o.to_dict() for o in self.observations[-10:]],
            "network_snapshots_count": len(self.network_snapshots),
            "patterns_summary": [p.to_dict() for p in self.patterns],
            "epistemic_limitation": LIMITATIONS_TEMPORAL_GENERAL,
        }

    def get_activity_density(self, granularity: str = "day") -> Dict[str, Any]:
        """Returns activity density buckets (day, week, or month)."""
        gran = granularity.lower() if granularity in ("day", "week", "month") else "day"
        buckets = self.activity_density.get(gran, {})
        return {
            "granularity": gran,
            "total_buckets": len(buckets),
            "buckets": buckets,
            "total_dated_observations": sum(buckets.values()) if gran == "day" else len(self.observations),
            "epistemic_limitation": LIMITATIONS_TEMPORAL_GENERAL,
        }

    def get_network_evolution(self) -> Dict[str, Any]:
        """Returns all longitudinal network evolution snapshots."""
        return {
            "total_snapshots": len(self.network_snapshots),
            "snapshots": [s.to_dict() for s in self.network_snapshots],
            "epistemic_limitation": LIMITATIONS_NETWORK_EVOLUTION,
        }

    def get_patterns(self, pattern_type: Optional[str] = None) -> Dict[str, Any]:
        """Returns detected temporal patterns, optionally filtered by pattern_type."""
        filtered = self.patterns
        if pattern_type and pattern_type != "ALL":
            filtered = [p for p in filtered if p.pattern_type == pattern_type]
        return {
            "total_patterns": len(filtered),
            "filter": pattern_type or "ALL",
            "patterns": [p.to_dict() for p in filtered],
            "epistemic_limitation": LIMITATIONS_TEMPORAL_GENERAL,
        }

    def get_entity_activity(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Returns chronological activity, gaps, locations, and milestones for an entity."""
        # Exact match or case-insensitive match
        act = self.entity_activities.get(entity_id)
        if not act:
            for k, v in self.entity_activities.items():
                if k.upper() == entity_id.upper():
                    act = v
                    break
        if not act:
            return None

        # Resolve observations
        entity_obs = self.index_by_entity.get(act.entity_id, [])
        return {
            "activity_profile": act.to_dict(),
            "observations": [o.to_dict() for o in entity_obs],
            "total_observations": len(entity_obs),
            "epistemic_limitation": act.epistemic_limitation,
        }

    def get_case_chronology(self, case_id: str) -> Optional[Dict[str, Any]]:
        """Returns chronological event stream for a case."""
        # Exact match or case-insensitive match
        cid = case_id.upper()
        matching_obs = []
        for c, obs_list in self.index_by_case.items():
            if c.upper() == cid:
                matching_obs = obs_list
                break
        if not matching_obs:
            return None

        sorted_obs = sorted(matching_obs, key=lambda o: (o.date, o.time or "", o.record_id))
        return {
            "case_id": case_id,
            "total_observations": len(sorted_obs),
            "earliest_observation": sorted_obs[0].date if sorted_obs else None,
            "latest_observation": sorted_obs[-1].date if sorted_obs else None,
            "observations": [o.to_dict() for o in sorted_obs],
            "epistemic_limitation": LIMITATIONS_TEMPORAL_GENERAL,
        }

    def get_relationship_evolution(self, source: str, target: str) -> Optional[Dict[str, Any]]:
        """Returns chronological trajectory for relationship between source and target."""
        cp = canonical_pair(source, target)
        rel = self.index_by_relationship.get(cp)
        if not rel:
            # Try case-insensitive
            for (u, v), r in self.index_by_relationship.items():
                if (u.upper() == source.upper() and v.upper() == target.upper()) or (u.upper() == target.upper() and v.upper() == source.upper()):
                    rel = r
                    break
        if not rel:
            return None
        return rel.to_dict()

    def get_observation(self, observation_id: str) -> Optional[Dict[str, Any]]:
        """Returns a single observation by ID."""
        obs = self.index_by_id.get(observation_id)
        if not obs:
            # Check by record_id as fallback
            for o in self.observations:
                if o.record_id.upper() == observation_id.upper() or o.observation_id.upper() == observation_id.upper():
                    obs = o
                    break
        if not obs:
            return None
        return obs.to_dict()
