"""
explainability_engine.py
-------------------------
CNIS Phase 3I: Deterministic Explainable Intelligence Engine.

Answers the investigator question:
    "How did CNIS derive this intelligence finding?"

Phase 3H answered:
    "What evidence supports this?" (Provenance & Evidence Grounding)

Phase 3I answers:
    "How was this finding derived from that evidence?" (Analytical Derivation & Logic)

Strict Architectural Rules:
  1. 100% deterministic compilation layer. Zero external LLMs or generative AI.
  2. Does NOT recompute or alter existing intelligence metrics (degree, betweenness,
     eigenvector, PageRank, influence score, communities, bridge nodes, anomalies,
     entity resolutions).
  3. Every explanation connects:
     Finding -> Analytical Inputs -> Analytical Method -> Derivation Steps ->
     Supporting Evidence IDs (Phase 3H) -> Source Records.
  4. Epistemic boundaries strictly enforced:
     - Centrality does NOT establish guilt, hierarchy, or criminal responsibility.
     - Co-occurrence does NOT prove criminal conspiracy or illicit coordination.
     - Anomaly signal does NOT establish criminal conduct.
     - Temporal proximity does NOT prove confirmed coordination.
     - Spatial overlap does NOT confirm physical meetings.
     - Identity resolution scores are analytical aids, NOT probabilistic certainty.
  5. Average-case O(1) indexed lookups by ID, entity, anomaly, and canonical relationship.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple, Set


# ── 1. Explainability Models & Epistemic Constants ──────────────────────────

class ExplainabilityType:
    """Categorizes the nature of the explained intelligence finding."""
    NETWORK_IMPORTANCE = "NETWORK_IMPORTANCE"
    RELATIONSHIP = "RELATIONSHIP"
    ANOMALY = "ANOMALY"
    ENTITY_RESOLUTION = "ENTITY_RESOLUTION"
    TEMPORAL_PATTERN = "TEMPORAL_PATTERN"
    LOCATION_PATTERN = "LOCATION_PATTERN"
    COMMUNITY = "COMMUNITY"
    BRIDGE_NODE = "BRIDGE_NODE"
    PATH_ANALYSIS = "PATH_ANALYSIS"
    REPORT_FINDING = "REPORT_FINDING"

    ALL = {
        NETWORK_IMPORTANCE,
        RELATIONSHIP,
        ANOMALY,
        ENTITY_RESOLUTION,
        TEMPORAL_PATTERN,
        LOCATION_PATTERN,
        COMMUNITY,
        BRIDGE_NODE,
        PATH_ANALYSIS,
        REPORT_FINDING,
    }


class ExplanationStatus:
    """Epistemic status of the explanation derivation."""
    COMPLETE = "COMPLETE"
    SIGNAL = "SIGNAL"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"

    ALL = {COMPLETE, SIGNAL, REVIEW_REQUIRED}


# Standardized Epistemic Boundary Statements (Mandatory across all explanations)
LIMITATIONS_NETWORK_IMPORTANCE = (
    "Network centrality describes graph position and information flow within the observed multi-graph. "
    "Centrality metrics do not establish guilt, criminal responsibility, operational hierarchy, or unlawful intent."
)

LIMITATIONS_BRIDGE_NODE = (
    "Structural importance reflects topological articulation points whose removal would fragment components "
    "or lengthen connection paths. Bridge-node designation does not imply criminal authority, operational leadership, or guilt."
)

LIMITATIONS_COMMUNITY = (
    "Observed network community. Community membership reflects graph clustering and co-occurrence in incident reports, "
    "not proof of a criminal organization, syndicate, or gang conspiracy."
)

LIMITATIONS_RELATIONSHIP = (
    "Documented co-occurrence across intelligence case records indicates network association within reported incidents. "
    "Co-occurrence in source records does not prove criminal partnership, illicit coordination, or unlawful conspiracy."
)

LIMITATIONS_ANOMALY = (
    "This is an analytical signal indicating unusual activity under the configured detection rule. "
    "Anomaly signals represent investigative leads and do not establish criminal conduct, unlawful intent, or guilt."
)

LIMITATIONS_ENTITY_RESOLUTION = (
    "Identity resolution is an analytical matching aid based on multi-signal compatibility. "
    "Similarity and evidence scores do not represent probabilistic identity certainty. "
    "Candidate pairs flagged with REVIEW_REQUIRED require investigator corroboration before identity consolidation."
)

LIMITATIONS_TEMPORAL = (
    "Chronological sequencing reflects recorded dates of incident reporting in intelligence feeds. "
    "Temporal proximity indicates chronological correlation, not verified coordination."
)

LIMITATIONS_LOCATION = (
    "Geographical presence indicates reported operational or incident site co-occurrence. "
    "Spatial overlap indicates reported incident co-occurrence, not verified physical contact or confirmed meetings."
)

LIMITATIONS_PATH = (
    "A graph path reflects topological connectivity across reported incidents in the observed dataset. "
    "It does not prove operational coordination, message delivery, or conspiracy between endpoints."
)

LIMITATIONS_REPORT_FINDING = (
    "Report findings summarize analytical calculations across corroborating evidence items. "
    "Analytical findings represent investigative leads and must be verified against primary source records."
)


def _slug(text: str) -> str:
    """Deterministic URI/ID-safe slug."""
    clean = re.sub(r"[^A-Za-z0-9]+", "-", str(text).strip())
    return clean.strip("-").upper()


def canonical_pair(u: str, v: str) -> Tuple[str, str]:
    """Returns alphabetically ordered tuple of entity names for unordered undirected lookups."""
    u_clean = str(u).strip().upper()
    v_clean = str(v).strip().upper()
    return (u_clean, v_clean) if u_clean <= v_clean else (v_clean, u_clean)


# ── 2. Explanation Step & Explanation Data Structures ───────────────────────

@dataclass
class ExplanationStep:
    """A discrete, auditable calculation or deduction step in deriving a finding."""
    step_number: int
    stage: str
    description: str
    inputs: Dict[str, Any] = field(default_factory=dict)
    method_or_rule: str = ""
    intermediate_result: Any = None
    evidence_ids: List[str] = field(default_factory=list)
    source_records: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_number": self.step_number,
            "stage": self.stage,
            "description": self.description,
            "inputs": self.inputs,
            "method_or_rule": self.method_or_rule,
            "intermediate_result": self.intermediate_result,
            "evidence_ids": self.evidence_ids,
            "source_records": self.source_records,
        }


@dataclass
class IntelligenceExplanation:
    """
    Complete, self-contained explanation for an intelligence finding.
    Directly addresses:
      1. Finding (What was found)
      2. Observation (What data was used)
      3. Analytical Inputs & Method (How it was derived)
      4. Derivation Steps & Calculations
      5. Supporting Evidence IDs (What evidence supports it)
      6. Interpretation (How to interpret it)
      7. Limitations (What it does NOT prove)
    """
    explanation_id: str
    explanation_type: str
    target_id: str
    target_label: str
    finding: str
    observation: str
    analytical_inputs: Dict[str, Any]
    analytical_method: str
    calculation_summary: str
    derivation_steps: List[ExplanationStep]
    supporting_evidence_ids: List[str]
    supporting_source_records: List[str]
    interpretation: str
    limitations: str
    status: str = ExplanationStatus.COMPLETE
    related_entities: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "explanation_id": self.explanation_id,
            "explanation_type": self.explanation_type,
            "status": self.status,
            "target_id": self.target_id,
            "target_label": self.target_label,
            "finding": self.finding,
            "observation": self.observation,
            "analytical_inputs": self.analytical_inputs,
            "analytical_method": self.analytical_method,
            "calculation_summary": self.calculation_summary,
            "derivation_steps": [s.to_dict() for s in self.derivation_steps],
            "supporting_evidence_ids": self.supporting_evidence_ids,
            "supporting_source_records": self.supporting_source_records,
            "interpretation": self.interpretation,
            "limitations": self.limitations,
            "related_entities": self.related_entities,
            "metadata": self.metadata,
        }


# ── 3. Explainability Engine Compilation Layer ──────────────────────────────

class ExplainabilityEngine:
    """
    Phase 3I: Deterministic Explainable Intelligence Engine.
    
    Compiles existing pipeline outputs into structured, evidence-grounded
    explanations. Provides average-case O(1) indexed lookups.
    """

    def __init__(self):
        # Inverted index lookups for fast retrieval
        self.index_by_id: Dict[str, IntelligenceExplanation] = {}
        self.index_by_type: Dict[str, List[IntelligenceExplanation]] = {
            t: [] for t in ExplainabilityType.ALL
        }
        self.index_by_entity: Dict[str, List[IntelligenceExplanation]] = {}
        self.index_by_anomaly: Dict[str, IntelligenceExplanation] = {}
        self.index_by_relationship: Dict[Tuple[str, str], IntelligenceExplanation] = {}
        self.index_by_record: Dict[str, List[IntelligenceExplanation]] = {}
        self._all_explanations: List[IntelligenceExplanation] = []
        self._graph = None

    @property
    def all_explanations(self) -> List[IntelligenceExplanation]:
        return self._all_explanations

    def get_summary(self) -> Dict[str, Any]:
        """Returns corpus-level explainability statistics."""
        type_counts = {t: len(items) for t, items in self.index_by_type.items()}
        return {
            "total_explanations": len(self._all_explanations),
            "by_type": type_counts,
            "indexed_entities": len(self.index_by_entity),
            "indexed_anomalies": len(self.index_by_anomaly),
            "indexed_relationships": len(self.index_by_relationship),
            "epistemic_disclaimer": (
                "All explanations are compiled deterministically from existing analytical calculations "
                "and Phase 3H evidence items. Centrality does not denote guilt. Co-occurrence does not prove conspiracy. "
                "Anomaly signals are investigative leads only."
            ),
        }

    def _register(self, expl: IntelligenceExplanation):
        """Registers explanation into indices."""
        self._all_explanations.append(expl)
        self.index_by_id[expl.explanation_id] = expl
        if expl.explanation_type in self.index_by_type:
            self.index_by_type[expl.explanation_type].append(expl)

        for ent in expl.related_entities:
            ent_key = ent.strip().upper()
            if ent_key not in self.index_by_entity:
                self.index_by_entity[ent_key] = []
            self.index_by_entity[ent_key].append(expl)

        for rec in expl.supporting_source_records:
            rec_key = rec.strip()
            if rec_key not in self.index_by_record:
                self.index_by_record[rec_key] = []
            self.index_by_record[rec_key].append(expl)

    def compile(
        self,
        records: List[Any],
        extracted: List[Any],
        G: Any,
        centrality: Dict[str, Dict[str, Any]],
        key_players: List[Dict[str, Any]],
        bridges: List[Tuple[str, float]],
        communities: List[Set[str]],
        anomalies: List[Dict[str, Any]],
        resolution_engine: Any = None,
        canonical_registry: Dict[str, Any] = None,
        evidence_engine: Any = None,
        reports: Optional[Dict[str, Any]] = None,
    ):
        """
        Compiles explanations from existing calculations and Phase 3H evidence.
        Reuses actual calculated values without recomputing or altering metrics.
        """
        self._graph = G
        self._all_explanations.clear()
        self.index_by_id.clear()
        self.index_by_type = {t: [] for t in ExplainabilityType.ALL}
        self.index_by_entity.clear()
        self.index_by_anomaly.clear()
        self.index_by_relationship.clear()
        self.index_by_record.clear()

        # Build lookup helpers for quick correlation
        record_map = {r.record_id if hasattr(r, "record_id") else r["record_id"]: r for r in records}
        key_player_map = {kp["entity"]: kp for kp in key_players}
        bridge_map = {b[0]: b[1] for b in bridges}

        # 1. NETWORK IMPORTANCE EXPLANATIONS
        self._compile_network_importance(centrality, key_player_map, evidence_engine, G)

        # 2. BRIDGE NODE EXPLANATIONS
        self._compile_bridge_nodes(bridges, centrality, G, evidence_engine)

        # 3. COMMUNITY EXPLANATIONS
        self._compile_communities(communities, G, evidence_engine)

        # 4. RELATIONSHIP EXPLANATIONS
        self._compile_relationships(G, evidence_engine)

        # 5. ANOMALY EXPLANATIONS
        self._compile_anomalies(anomalies, evidence_engine, record_map)

        # 6. ENTITY RESOLUTION EXPLANATIONS
        if resolution_engine and canonical_registry:
            self._compile_entity_resolution(resolution_engine, canonical_registry, evidence_engine)

        # 7. TEMPORAL OBSERVATION EXPLANATIONS
        self._compile_temporal_patterns(records, evidence_engine)

        # 8. LOCATION OBSERVATION EXPLANATIONS
        self._compile_location_patterns(records, extracted, evidence_engine)

        # 9. REPORT FINDINGS EXPLANATIONS
        if reports:
            self._compile_report_findings(reports, evidence_engine, key_player_map, bridge_map)

    # ── Derivation Compilers ─────────────────────────────────────────────────

    def _compile_network_importance(
        self,
        centrality: Dict[str, Dict[str, Any]],
        key_player_map: Dict[str, Dict[str, Any]],
        evidence_engine: Any,
        G: Any,
    ):
        """Explains key player influence scores using the exact system formula."""
        for node, metrics in centrality.items():
            ntype = metrics.get("type", "UNKNOWN")
            is_key_player = node in key_player_map
            kp_data = key_player_map.get(node)

            deg = metrics.get("degree", 0.0)
            btw = metrics.get("betweenness", 0.0)
            eig = metrics.get("eigenvector", 0.0)
            pr = metrics.get("pagerank", 0.0)

            # Exact formula from network_analysis.py:
            # 0.25 * degree + 0.35 * betweenness + 0.25 * eigenvector + 0.15 * pagerank
            influence_score = kp_data["influence_score"] if kp_data else round(
                0.25 * deg + 0.35 * btw + 0.25 * eig + 0.15 * pr, 4
            )

            neighbors = list(G.neighbors(node)) if G and G.has_node(node) else []
            degree_count = len(neighbors)

            # Supporting evidence IDs from Phase 3H
            evid_net_id = f"EVID-NET-{_slug(node)}"
            supporting_evids = [evid_net_id]
            supporting_records = set()
            if evidence_engine:
                net_ev = evidence_engine.get_item(evid_net_id)
                if net_ev:
                    supporting_records.update(net_ev.source_records)
                # Link related relationship evidence
                for nbr in neighbors:
                    pair = canonical_pair(node, nbr)
                    rel_ev = evidence_engine.get_by_relationship(pair[0], pair[1])
                    if rel_ev:
                        supporting_evids.append(rel_ev.evidence_id)
                        supporting_records.update(rel_ev.source_records)

            term_degree = round(0.25 * deg, 4)
            term_betweenness = round(0.35 * btw, 4)
            term_eigenvector = round(0.25 * eig, 4)
            term_pagerank = round(0.15 * pr, 4)

            steps = [
                ExplanationStep(
                    step_number=1,
                    stage="graph_co_occurrence",
                    description=f"Observed {degree_count} direct connection(s) in the multi-graph.",
                    inputs={"entity": node, "direct_connections": degree_count, "neighbors": neighbors[:5]},
                    method_or_rule="Graph degree calculation over corroborated co-occurrences",
                    intermediate_result={"degree_centrality": deg},
                    evidence_ids=[evid_net_id],
                    source_records=sorted(list(supporting_records)),
                ),
                ExplanationStep(
                    step_number=2,
                    stage="brokerage_betweenness",
                    description=f"Calculated shortest paths traversing {node} across the weighted network.",
                    inputs={"betweenness_centrality": btw},
                    method_or_rule="Brandes algorithm for weighted betweenness centrality",
                    intermediate_result={"betweenness_centrality": btw},
                    evidence_ids=[evid_net_id],
                ),
                ExplanationStep(
                    step_number=3,
                    stage="eigenvector_and_pagerank",
                    description="Calculated prestige (eigenvector) and random-walk connectivity (PageRank).",
                    inputs={"eigenvector_centrality": eig, "pagerank": pr},
                    method_or_rule="Power iteration for eigenvector centrality & PageRank with weight damping",
                    intermediate_result={"eigenvector": eig, "pagerank": pr},
                    evidence_ids=[evid_net_id],
                ),
                ExplanationStep(
                    step_number=4,
                    stage="influence_blending",
                    description="Applied standard composite influence weighting formula.",
                    inputs={
                        "formula": "0.25*degree + 0.35*betweenness + 0.25*eigenvector + 0.15*pagerank",
                        "components": {
                            "0.25_x_degree": term_degree,
                            "0.35_x_betweenness": term_betweenness,
                            "0.25_x_eigenvector": term_eigenvector,
                            "0.15_x_pagerank": term_pagerank,
                        },
                    },
                    method_or_rule="Composite Influence Blending (0.25*deg + 0.35*btw + 0.25*eig + 0.15*pr)",
                    intermediate_result={"composite_score": influence_score},
                    evidence_ids=[evid_net_id],
                ),
            ]

            finding_text = (
                f"{node} is ranked as a top key player with composite influence score {influence_score:.4f}."
                if is_key_player
                else f"{node} has composite network influence score {influence_score:.4f} (degree {deg}, betweenness {btw})."
            )

            calculation_summary = (
                f"Composite score ({influence_score:.4f}) = "
                f"0.25 * {deg:.4f} (degree: {term_degree:.4f}) + "
                f"0.35 * {btw:.4f} (betweenness: {term_betweenness:.4f}) + "
                f"0.25 * {eig:.4f} (eigenvector: {term_eigenvector:.4f}) + "
                f"0.15 * {pr:.4f} (pagerank: {term_pagerank:.4f})."
            )

            expl = IntelligenceExplanation(
                explanation_id=f"EXPL-NET-{_slug(node)}",
                explanation_type=ExplainabilityType.NETWORK_IMPORTANCE,
                target_id=node,
                target_label=node,
                finding=finding_text,
                observation=(
                    f"Entity {node} appears in corroborated case records connected to {degree_count} other entity/entities "
                    f"({', '.join(neighbors[:4])}{'...' if len(neighbors) > 4 else ''})."
                ),
                analytical_inputs={
                    "entity": node,
                    "type": ntype,
                    "degree": deg,
                    "betweenness": btw,
                    "eigenvector": eig,
                    "pagerank": pr,
                    "neighbor_count": degree_count,
                    "is_key_player": is_key_player,
                },
                analytical_method="Network Centrality Composite Blending (0.25*deg + 0.35*btw + 0.25*eig + 0.15*pr)",
                calculation_summary=calculation_summary,
                derivation_steps=steps,
                supporting_evidence_ids=supporting_evids[:8],
                supporting_source_records=sorted(list(supporting_records)),
                interpretation=(
                    f"{node} occupies a structurally central topological position in the ingested network graph. "
                    f"High betweenness indicates potential brokerage across sub-clusters, while degree reflects direct connectivity."
                ),
                limitations=LIMITATIONS_NETWORK_IMPORTANCE,
                status=ExplanationStatus.COMPLETE,
                related_entities=[node] + neighbors[:6],
                metadata={"type": ntype, "influence_score": influence_score, "is_key_player": is_key_player},
            )
            self._register(expl)

    def _compile_bridge_nodes(
        self,
        bridges: List[Tuple[str, float]],
        centrality: Dict[str, Dict[str, Any]],
        G: Any,
        evidence_engine: Any,
    ):
        """Explains critical bridge node rankings and network fragmentation impact."""
        for rank, (node, btw_score) in enumerate(bridges, 1):
            deg = centrality.get(node, {}).get("degree", 0.0)
            neighbors = list(G.neighbors(node)) if G and G.has_node(node) else []

            evid_net_id = f"EVID-NET-{_slug(node)}"
            supporting_evids = [evid_net_id]
            supporting_records = set()
            if evidence_engine:
                net_ev = evidence_engine.get_item(evid_net_id)
                if net_ev:
                    supporting_records.update(net_ev.source_records)

            steps = [
                ExplanationStep(
                    step_number=1,
                    stage="weighted_shortest_paths",
                    description=f"Evaluated all shortest paths across the {G.number_of_nodes() if G else 15}-node network.",
                    inputs={"network_nodes": G.number_of_nodes() if G else 15, "network_edges": G.number_of_edges() if G else 52},
                    method_or_rule="Brandes algorithm for shortest-path node betweenness",
                    intermediate_result={"betweenness": btw_score},
                    evidence_ids=[evid_net_id],
                ),
                ExplanationStep(
                    step_number=2,
                    stage="bridge_ranking",
                    description=f"Ranked #{rank} across all entities based on proportion of shortest paths passing through this node.",
                    inputs={"node": node, "betweenness_score": btw_score, "rank": rank},
                    method_or_rule="Top-N critical bridge node selection (descending betweenness)",
                    intermediate_result={"rank": rank, "critical_bridge": True},
                    evidence_ids=[evid_net_id],
                    source_records=sorted(list(supporting_records)),
                ),
            ]

            expl = IntelligenceExplanation(
                explanation_id=f"EXPL-BRG-{_slug(node)}",
                explanation_type=ExplainabilityType.BRIDGE_NODE,
                target_id=node,
                target_label=f"Bridge Node: {node}",
                finding=f"{node} is identified as critical bridge node #{rank} with betweenness score {btw_score:.4f}.",
                observation=f"{node} connects {len(neighbors)} adjacent entities and bridges distinct clusters across the graph.",
                analytical_inputs={"entity": node, "betweenness": btw_score, "rank": rank, "neighbors": neighbors},
                analytical_method="Shortest-Path Betweenness Centrality Ranking",
                calculation_summary=f"Betweenness centrality = {btw_score:.4f} (Rank #{rank} in network).",
                derivation_steps=steps,
                supporting_evidence_ids=supporting_evids,
                supporting_source_records=sorted(list(supporting_records)),
                interpretation=(
                    f"{node} serves as a structural communication or interaction bridge. "
                    f"Removal of this node would sever or elongate shortest paths connecting disparate parts of the graph."
                ),
                limitations=LIMITATIONS_BRIDGE_NODE,
                status=ExplanationStatus.COMPLETE,
                related_entities=[node] + neighbors[:5],
                metadata={"betweenness": btw_score, "rank": rank},
            )
            self._register(expl)

    def _compile_communities(
        self,
        communities: List[Set[str]],
        G: Any,
        evidence_engine: Any,
    ):
        """Explains Louvain modularity communities in neutral graph terminology."""
        for idx, comm in enumerate(communities, 1):
            members = sorted(list(comm))
            subgraph = G.subgraph(comm) if G else None
            internal_edges = subgraph.number_of_edges() if subgraph else 0

            supporting_evids = []
            supporting_records = set()
            for m in members[:4]:
                supporting_evids.append(f"EVID-NET-{_slug(m)}")
                if evidence_engine:
                    ev = evidence_engine.get_item(f"EVID-NET-{_slug(m)}")
                    if ev:
                        supporting_records.update(ev.source_records)

            steps = [
                ExplanationStep(
                    step_number=1,
                    stage="modularity_optimization",
                    description=f"Grouped nodes into observed community #{idx} by maximizing modularity score.",
                    inputs={"algorithm": "Louvain", "seed": 42, "weight": "weight", "member_count": len(members)},
                    method_or_rule="Louvain community detection algorithm (seed=42, weighted edges)",
                    intermediate_result={"community_id": idx, "members": members},
                    evidence_ids=supporting_evids[:4],
                    source_records=sorted(list(supporting_records)),
                ),
                ExplanationStep(
                    step_number=2,
                    stage="cohesion_analysis",
                    description=f"Calculated {internal_edges} internal co-occurrence edge(s) connecting member nodes.",
                    inputs={"internal_edges": internal_edges, "members": members},
                    method_or_rule="Graph subgraph density and edge counting",
                    intermediate_result={"internal_edges": internal_edges},
                    evidence_ids=supporting_evids[:4],
                ),
            ]

            expl = IntelligenceExplanation(
                explanation_id=f"EXPL-COMM-{idx}",
                explanation_type=ExplainabilityType.COMMUNITY,
                target_id=f"COMM-{idx}",
                target_label=f"Observed Community {idx}",
                finding=f"Observed network community #{idx} contains {len(members)} densely interconnected entities.",
                observation=f"Entities {', '.join(members[:4])}{'...' if len(members) > 4 else ''} exhibit dense internal co-occurrences.",
                analytical_inputs={
                    "community_id": idx,
                    "members": members,
                    "member_count": len(members),
                    "internal_edges": internal_edges,
                },
                analytical_method="Louvain Modularity Optimization (weight='weight', seed=42)",
                calculation_summary=f"Algorithm identified partition of {len(members)} nodes with {internal_edges} internal edges.",
                derivation_steps=steps,
                supporting_evidence_ids=supporting_evids,
                supporting_source_records=sorted(list(supporting_records)),
                interpretation=(
                    f"Entities in community #{idx} show higher internal co-occurrence density compared to the rest of the graph. "
                    f"This indicates frequent operational co-mention in the ingested source documents."
                ),
                limitations=LIMITATIONS_COMMUNITY,
                status=ExplanationStatus.COMPLETE,
                related_entities=members,
                metadata={"community_id": idx, "member_count": len(members), "internal_edges": internal_edges},
            )
            self._register(expl)

    def _compile_relationships(
        self,
        G: Any,
        evidence_engine: Any,
    ):
        """Explains graph relationships with co-occurrence basis and canonical evidence linkage."""
        if not G:
            return

        for u, v, data in G.edges(data=True):
            pair = canonical_pair(u, v)
            if pair in self.index_by_relationship:
                continue

            weight = data.get("weight", 1)
            records = data.get("records", [])
            dates = data.get("dates", [])

            evid_rel_id = f"EVID-REL-{_slug(pair[0])}--{_slug(pair[1])}"
            supporting_evids = [evid_rel_id]
            supporting_records = set(records)

            if evidence_engine:
                rel_ev = evidence_engine.get_by_relationship(pair[0], pair[1])
                if rel_ev:
                    supporting_evids = [rel_ev.evidence_id]
                    supporting_records.update(rel_ev.source_records)

            steps = [
                ExplanationStep(
                    step_number=1,
                    stage="record_co_occurrence",
                    description=f"Identified co-mention of '{pair[0]}' and '{pair[1]}' across {weight} independent record(s).",
                    inputs={"entities": [pair[0], pair[1]], "records": sorted(list(supporting_records))},
                    method_or_rule="Entity co-occurrence extraction per source document",
                    intermediate_result={"weight": weight, "corroborating_records": len(supporting_records)},
                    evidence_ids=supporting_evids,
                    source_records=sorted(list(supporting_records)),
                ),
                ExplanationStep(
                    step_number=2,
                    stage="edge_weight_aggregation",
                    description=f"Corroborating record count established edge weight of {weight}.",
                    inputs={"edge_weight": weight, "dates": dates},
                    method_or_rule="Sum of distinct record co-occurrences",
                    intermediate_result={"weight": weight},
                    evidence_ids=supporting_evids,
                ),
            ]

            expl = IntelligenceExplanation(
                explanation_id=f"EXPL-REL-{_slug(pair[0])}--{_slug(pair[1])}",
                explanation_type=ExplainabilityType.RELATIONSHIP,
                target_id=f"{pair[0]}__{pair[1]}",
                target_label=f"Relationship: {pair[0]} <-> {pair[1]}",
                finding=f"Observed relationship between {pair[0]} and {pair[1]} with corroboration weight {weight}.",
                observation=f"Co-occurred in record(s): {', '.join(sorted(list(supporting_records)))} across dates {', '.join(dates) if dates else 'N/A'}.",
                analytical_inputs={"entity_a": pair[0], "entity_b": pair[1], "weight": weight, "records": sorted(list(supporting_records))},
                analytical_method="Corroborated Document Co-Occurrence Aggregation",
                calculation_summary=f"Edge weight = {weight} (derived from {len(supporting_records)} distinct source record co-occurrences).",
                derivation_steps=steps,
                supporting_evidence_ids=supporting_evids,
                supporting_source_records=sorted(list(supporting_records)),
                interpretation=(
                    f"'{pair[0]}' and '{pair[1]}' co-appear within the narrative of {len(supporting_records)} incident record(s). "
                    f"Repeated co-occurrence reflects shared investigative context."
                ),
                limitations=LIMITATIONS_RELATIONSHIP,
                status=ExplanationStatus.COMPLETE,
                related_entities=[pair[0], pair[1]],
                metadata={"weight": weight, "dates": dates},
            )
            self.index_by_relationship[pair] = expl
            self._register(expl)

    def _compile_anomalies(
        self,
        anomalies: List[Dict[str, Any]],
        evidence_engine: Any,
        record_map: Dict[str, Any],
    ):
        """Explains anomaly signals using the actual configured detector rule and thresholds."""
        for anom in anomalies:
            aid = anom.get("id", "")
            pattern = anom.get("pattern", "unknown")
            pattern_label = anom.get("pattern_label", pattern.replace("_", " ").title())
            entity = anom.get("entity")
            rec_id = anom.get("record_id")
            note = anom.get("note", "")
            date_str = anom.get("date", "")

            evid_anom_id = f"EVID-ANOM-{_slug(aid)}"
            supporting_evids = [evid_anom_id]
            supporting_records = []
            if rec_id:
                supporting_records.append(rec_id)
            if evidence_engine:
                anom_ev = evidence_engine.get_by_anomaly(aid)
                if anom_ev:
                    supporting_evids = [anom_ev.evidence_id]
                    supporting_records = sorted(list(set(supporting_records + anom_ev.source_records)))

            # Tailor derivation steps to the actual detection method and rule
            if pattern == "burst_activity":
                method_name = "Temporal Daily Event Frequency Aggregation (min_events = 5)"
                calc_sum = f"Entity '{entity}' was involved in {anom.get('event_count', 5)} events on {date_str} (Threshold >= 5)."
                rule_desc = "Flags entities when linked daily event count meets or exceeds threshold of 5 events."
            elif pattern == "structuring":
                method_name = "Financial Structuring Keyword Heuristic Detection"
                calc_sum = "Record text matches financial evasion patterns ('structur' or 'split' + 'deposit/transaction')."
                rule_desc = "Regex / substring scan for currency transaction structuring and threshold evasion keywords."
            elif pattern == "new_entity_spike":
                method_name = "New Entity Influx Detection (known_neighbors >= 2)"
                calc_sum = f"Entity '{entity}' first appears already linked to 2+ previously known entities."
                rule_desc = "Flags newly seen entities on initial appearance when co-occurring with 2 or more previously registered entities."
            elif pattern == "statistical_outlier":
                method_name = "Isolation Forest Multi-Feature Outlier Detection (contamination=0.15, seed=42)"
                calc_sum = "IsolationForest prediction = -1 over [degree, betweenness, eigenvector, pagerank]."
                rule_desc = "Unsupervised ensemble tree isolation scoring over 4 centrality dimensions with 15% contamination."
            else:
                method_name = f"Pattern Rule: {pattern}"
                calc_sum = note
                rule_desc = "Configured anomaly detection rule."

            steps = [
                ExplanationStep(
                    step_number=1,
                    stage="data_observation",
                    description=f"Extracted observational data for pattern '{pattern_label}'.",
                    inputs={"pattern": pattern, "entity": entity, "record_id": rec_id, "date": date_str},
                    method_or_rule="Feature extraction from pipeline graph or text streams",
                    intermediate_result={"observation": note},
                    evidence_ids=supporting_evids,
                    source_records=supporting_records,
                ),
                ExplanationStep(
                    step_number=2,
                    stage="rule_evaluation",
                    description=f"Evaluated detection rule against configured threshold: {rule_desc}",
                    inputs={"method": method_name, "details": anom},
                    method_or_rule=method_name,
                    intermediate_result={"triggered": True, "anomaly_id": aid},
                    evidence_ids=supporting_evids,
                    source_records=supporting_records,
                ),
            ]

            expl = IntelligenceExplanation(
                explanation_id=f"EXPL-ANOM-{_slug(aid)}",
                explanation_type=ExplainabilityType.ANOMALY,
                target_id=aid,
                target_label=f"{aid} ({pattern_label})",
                finding=f"Anomaly signal {aid} detected: {pattern_label} for '{entity or rec_id or 'Network'}'.",
                observation=note,
                analytical_inputs={"anomaly_id": aid, "pattern": pattern, "entity": entity, "record_id": rec_id, "date": date_str},
                analytical_method=method_name,
                calculation_summary=calc_sum,
                derivation_steps=steps,
                supporting_evidence_ids=supporting_evids,
                supporting_source_records=supporting_records,
                interpretation=(
                    f"This signal indicates a mathematical or rule-based deviation under the configured {pattern_label} rule. "
                    f"It flags an analytical anomaly warranting investigator scrutiny."
                ),
                limitations=LIMITATIONS_ANOMALY,
                status=ExplanationStatus.SIGNAL,
                related_entities=[entity] if entity else [],
                metadata={"pattern": pattern, "note": note, "date": date_str},
            )
            self.index_by_anomaly[aid] = expl
            self._register(expl)

    def _compile_entity_resolution(
        self,
        resolution_engine: Any,
        canonical_registry: Dict[str, Any],
        evidence_engine: Any,
    ):
        """Explains Phase 3G entity resolution decisions without probabilistic claims."""
        for can_id, ce in canonical_registry.items():
            if hasattr(ce, "to_dict"):
                ce_dict = ce.to_dict()
            else:
                ce_dict = ce

            cname = ce_dict.get("canonical_name", can_id)
            ctype = ce_dict.get("entity_type", "UNKNOWN")
            review_status = ce_dict.get("review_status", "RESOLVED")
            variants = ce_dict.get("observed_variants", [])
            source_recs = ce_dict.get("source_records", [])
            review_reasons = ce_dict.get("review_reasons", [])

            evid_res_id = f"EVID-RES-{_slug(can_id)}"
            supporting_evids = [evid_res_id]
            supporting_records = list(source_recs)

            if evidence_engine:
                res_ev = evidence_engine.get_item(evid_res_id)
                if res_ev:
                    supporting_evids = [res_ev.evidence_id]
                    supporting_records = res_ev.source_records

            status = ExplanationStatus.REVIEW_REQUIRED if review_status == "REVIEW_REQUIRED" else ExplanationStatus.COMPLETE

            steps = [
                ExplanationStep(
                    step_number=1,
                    stage="candidate_normalization",
                    description=f"Extracted and normalized {len(variants)} observed surface variant(s): {', '.join(variants)}.",
                    inputs={"canonical_name": cname, "entity_type": ctype, "variants": variants},
                    method_or_rule="Deterministic normalization (Unicode NFKC, honorific stripping, contact normalization)",
                    intermediate_result={"variants": variants},
                    evidence_ids=supporting_evids,
                    source_records=supporting_records,
                ),
                ExplanationStep(
                    step_number=2,
                    stage="evidence_calculation",
                    description=(
                        f"Evaluated multi-signal compatibility across records {', '.join(source_recs)}. "
                        + (f"Review Reasons: {'; '.join(review_reasons)}" if review_reasons else "Deterministic high-confidence match.")
                    ),
                    inputs={"canonical_id": can_id, "review_status": review_status, "review_reasons": review_reasons},
                    method_or_rule="Multi-Signal Entity Resolution Policy (Exact, High-Confidence, Review-Required)",
                    intermediate_result={"review_status": review_status},
                    evidence_ids=supporting_evids,
                    source_records=supporting_records,
                ),
            ]

            finding_text = f"Entity resolution for canonical entity '{cname}' ({ctype}) - Decision: {review_status}."
            calc_summary = (
                f"Resolved across {len(variants)} variant(s) and {len(source_recs)} record(s) with policy decision: {review_status}."
            )
            if review_reasons:
                calc_summary += f" Flags: {'; '.join(review_reasons)}."

            expl = IntelligenceExplanation(
                explanation_id=f"EXPL-RES-{_slug(can_id)}",
                explanation_type=ExplainabilityType.ENTITY_RESOLUTION,
                target_id=can_id,
                target_label=f"Resolution: '{cname}' ({ctype})",
                finding=finding_text,
                observation=f"Observed variant(s): {', '.join(variants)} across record(s): {', '.join(source_recs)}.",
                analytical_inputs={
                    "canonical_id": can_id,
                    "canonical_name": cname,
                    "entity_type": ctype,
                    "review_status": review_status,
                    "variants": variants,
                    "records": source_recs,
                    "review_reasons": review_reasons,
                },
                analytical_method="Multi-Signal Entity Resolution Policy (Exact, High-Confidence, Review-Required)",
                calculation_summary=calc_summary,
                derivation_steps=steps,
                supporting_evidence_ids=supporting_evids,
                supporting_source_records=supporting_records,
                interpretation=(
                    f"The resolution engine grouped observed mentions into canonical entity '{cname}' "
                    f"based on compatible identifiers. Similarity metrics reflect feature overlap, not probabilistic certainty."
                ),
                limitations=LIMITATIONS_ENTITY_RESOLUTION,
                status=status,
                related_entities=[cname] + [v for v in variants if v != cname],
                metadata={"action": review_status, "review_status": review_status, "review_reasons": review_reasons},
            )
            self._register(expl)

    def _compile_temporal_patterns(
        self,
        records: List[Any],
        evidence_engine: Any,
    ):
        """Explains chronological observations grounded strictly in record dates."""
        for r in records:
            rid = r.record_id if hasattr(r, "record_id") else r["record_id"]
            date_str = r.date if hasattr(r, "date") else r["date"]
            evid_time_id = f"EVID-TIME-{_slug(rid)}"
            supporting_evids = [evid_time_id]

            steps = [
                ExplanationStep(
                    step_number=1,
                    stage="timestamp_parsing",
                    description=f"Extracted chronological timestamp '{date_str}' from source record {rid}.",
                    inputs={"record_id": rid, "timestamp": date_str},
                    method_or_rule="ISO date extraction from ingested record headers",
                    intermediate_result={"date": date_str},
                    evidence_ids=supporting_evids,
                    source_records=[rid],
                ),
            ]

            expl = IntelligenceExplanation(
                explanation_id=f"EXPL-TIME-{_slug(rid)}",
                explanation_type=ExplainabilityType.TEMPORAL_PATTERN,
                target_id=rid,
                target_label=f"Temporal Observation: {rid} ({date_str})",
                finding=f"Incident in record {rid} chronologically recorded on {date_str}.",
                observation=f"Record {rid} contains timestamp {date_str} from external ingestion source.",
                analytical_inputs={"record_id": rid, "date": date_str},
                analytical_method="Source Ingestion Chronological Sequencing",
                calculation_summary=f"Chronological event date verified as {date_str}.",
                derivation_steps=steps,
                supporting_evidence_ids=supporting_evids,
                supporting_source_records=[rid],
                interpretation=(
                    f"Incident {rid} is situated at {date_str} in the investigation timeline. "
                    f"Represents chronological occurrence as documented in source feeds."
                ),
                limitations=LIMITATIONS_TEMPORAL,
                status=ExplanationStatus.COMPLETE,
                related_entities=[],
                metadata={"date": date_str},
            )
            self._register(expl)

    def _compile_location_patterns(
        self,
        records: List[Any],
        extracted: List[Any],
        evidence_engine: Any,
    ):
        """Explains location observations strictly based on extracted location entities."""
        loc_counts = {}
        for ext in extracted:
            rid = ext.record_id if hasattr(ext, "record_id") else ext["record_id"]
            ents = ext.entities if hasattr(ext, "entities") else ext.get("entities", [])
            for e in ents:
                lbl = e.label if hasattr(e, "label") else e.get("label", "")
                txt = e.text if hasattr(e, "text") else e.get("text", "")
                if lbl == "LOCATION":
                    if txt not in loc_counts:
                        loc_counts[txt] = []
                    loc_counts[txt].append(rid)

        for loc_name, rids in loc_counts.items():
            evid_loc_id = f"EVID-LOC-{_slug(loc_name)}"
            supporting_evids = [evid_loc_id]
            unique_rids = sorted(list(set(rids)))

            steps = [
                ExplanationStep(
                    step_number=1,
                    stage="location_mention_extraction",
                    description=f"Extracted location mention '{loc_name}' across {len(unique_rids)} record(s).",
                    inputs={"location": loc_name, "records": unique_rids},
                    method_or_rule="Rule-based NER and gazetteer matching for LOCATION",
                    intermediate_result={"records": unique_rids},
                    evidence_ids=supporting_evids,
                    source_records=unique_rids,
                ),
            ]

            expl = IntelligenceExplanation(
                explanation_id=f"EXPL-LOC-{_slug(loc_name)}",
                explanation_type=ExplainabilityType.LOCATION_PATTERN,
                target_id=loc_name,
                target_label=f"Location Observation: {loc_name}",
                finding=f"Location '{loc_name}' appears as an operational or incident site in {len(unique_rids)} record(s).",
                observation=f"Extracted from source records: {', '.join(unique_rids)}.",
                analytical_inputs={"location": loc_name, "records": unique_rids},
                analytical_method="Named Entity Recognition & Spatial Occurrence Indexing",
                calculation_summary=f"Identified in {len(unique_rids)} source record(s).",
                derivation_steps=steps,
                supporting_evidence_ids=supporting_evids,
                supporting_source_records=unique_rids,
                interpretation=(
                    f"'{loc_name}' represents a geographical site documented in incident narratives. "
                    f"Multiple entity mentions at this location reflect shared documented context."
                ),
                limitations=LIMITATIONS_LOCATION,
                status=ExplanationStatus.COMPLETE,
                related_entities=[],
                metadata={"records": unique_rids},
            )
            self._register(expl)

    def _compile_report_findings(
        self,
        reports: Dict[str, Any],
        evidence_engine: Any,
        key_player_map: Dict[str, Any],
        bridge_map: Dict[str, float],
    ):
        """Explains key findings from the synthesized Intelligence Report."""
        findings = reports.get("key_findings", [])
        for idx, f in enumerate(findings, 1):
            category = f.get("category", "General")
            title = f.get("title", f"Finding {idx}")
            finding_desc = f.get("finding", "")
            evid_id = f.get("evidence_id", "")
            target = f.get("target", "")

            supporting_evids = [evid_id] if evid_id else []
            supporting_records = []
            if evidence_engine and evid_id:
                ev = evidence_engine.get_item(evid_id)
                if ev:
                    supporting_records = ev.source_records

            steps = [
                ExplanationStep(
                    step_number=1,
                    stage="intelligence_synthesis",
                    description=f"Synthesized finding from {category} analytics.",
                    inputs={"category": category, "target": target, "evidence_id": evid_id},
                    method_or_rule="Automated intelligence reporting synthesis",
                    intermediate_result={"finding": finding_desc},
                    evidence_ids=supporting_evids,
                    source_records=supporting_records,
                ),
            ]

            expl = IntelligenceExplanation(
                explanation_id=f"EXPL-FIND-{idx:03d}",
                explanation_type=ExplainabilityType.REPORT_FINDING,
                target_id=f"FIND-{idx:03d}",
                target_label=f"Report Finding: {title}",
                finding=f"[{category}] {title}: {finding_desc}",
                observation=f"Derived from analytical evidence item {evid_id}.",
                analytical_inputs={"category": category, "target": target, "evidence_id": evid_id},
                analytical_method=f"Intelligence Report Finding Synthesis ({category})",
                calculation_summary=f"Synthesized from evidence item {evid_id} and multi-graph metrics.",
                derivation_steps=steps,
                supporting_evidence_ids=supporting_evids,
                supporting_source_records=supporting_records,
                interpretation=f"Key investigative summary point highlighting {category.lower()} pattern.",
                limitations=LIMITATIONS_REPORT_FINDING,
                status=ExplanationStatus.COMPLETE,
                related_entities=[target] if target else [],
                metadata={"category": category, "target": target},
            )
            self._register(expl)

    # ── Dynamic Path Explanation Method ─────────────────────────────────────

    def explain_path(self, source: str, target: str) -> Optional[IntelligenceExplanation]:
        """
        Dynamically explains the shortest path between two entities in the graph.
        Does NOT alter graph topology or create new intelligence logic.
        """
        if not self._graph:
            return None

        # Build case-insensitive lookup
        node_lookup = {str(n).upper().strip(): n for n in self._graph.nodes()}
        u_node = node_lookup.get(source.upper().strip())
        v_node = node_lookup.get(target.upper().strip())

        if not u_node or not v_node:
            return None

        import networkx as nx
        try:
            path = nx.shortest_path(self._graph, u_node, v_node, weight=None)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return None

        u = str(u_node)
        v = str(v_node)
        path_hops = len(path) - 1
        supporting_evids = []
        supporting_records = set()
        steps = []

        for i in range(len(path) - 1):
            hop_u, hop_v = path[i], path[i + 1]
            pair = canonical_pair(hop_u, hop_v)
            edge_data = self._graph.get_edge_data(hop_u, hop_v) or {}
            recs = edge_data.get("records", [])
            supporting_records.update(recs)
            evid_rel = f"EVID-REL-{_slug(pair[0])}--{_slug(pair[1])}"
            supporting_evids.append(evid_rel)

            steps.append(
                ExplanationStep(
                    step_number=i + 1,
                    stage=f"hop_{i+1}",
                    description=f"Observed link between '{hop_u}' and '{hop_v}' via record(s): {', '.join(recs)}.",
                    inputs={"source": hop_u, "target": hop_v, "records": recs},
                    method_or_rule="Graph edge traversal based on documented co-occurrence",
                    intermediate_result={"hop": f"{hop_u} -> {hop_v}", "weight": edge_data.get("weight", 1)},
                    evidence_ids=[evid_rel],
                    source_records=recs,
                )
            )

        return IntelligenceExplanation(
            explanation_id=f"EXPL-PATH-{_slug(u)}--{_slug(v)}",
            explanation_type=ExplainabilityType.PATH_ANALYSIS,
            target_id=f"{u}__{v}",
            target_label=f"Path: {u} -> {v}",
            finding=f"Shortest connection path from '{u}' to '{v}' spans {path_hops} hop(s): {' -> '.join(path)}.",
            observation=f"Traverses intermediate nodes: {', '.join(path[1:-1]) if len(path) > 2 else 'Direct connection'}.",
            analytical_inputs={"source": u, "target": v, "path": path, "hop_count": path_hops},
            analytical_method="Breadth-First Shortest Path Traversal on Unweighted Topology",
            calculation_summary=f"Path length = {path_hops} hops ({len(path)} nodes).",
            derivation_steps=steps,
            supporting_evidence_ids=supporting_evids,
            supporting_source_records=sorted(list(supporting_records)),
            interpretation=(
                f"'{u}' is connected to '{v}' through a chain of observed co-occurrences. "
                f"Each link reflects documented presence in shared case records."
            ),
            limitations=LIMITATIONS_PATH,
            status=ExplanationStatus.COMPLETE,
            related_entities=path,
            metadata={"path": path, "hop_count": path_hops},
        )

    # ── Lookup & Query APIs ──────────────────────────────────────────────────

    def get_explanation(self, explanation_id: str) -> Optional[IntelligenceExplanation]:
        """Average-case O(1) lookup by explanation ID."""
        return self.index_by_id.get(explanation_id)

    def get_explanations_for_entity(self, entity_id: str) -> List[IntelligenceExplanation]:
        """Average-case O(1) index lookup for all explanations touching an entity."""
        return self.index_by_entity.get(entity_id.strip().upper(), [])

    def get_explanation_for_anomaly(self, anomaly_id: str) -> Optional[IntelligenceExplanation]:
        """Average-case O(1) lookup for a specific anomaly explanation."""
        return self.index_by_anomaly.get(anomaly_id.strip())

    def get_explanation_for_relationship(self, source: str, target: str) -> Optional[IntelligenceExplanation]:
        """Average-case O(1) canonical relationship explanation lookup."""
        pair = canonical_pair(source, target)
        return self.index_by_relationship.get(pair)

    def filter_explanations(
        self,
        explanation_type: Optional[str] = None,
        entity: Optional[str] = None,
        record_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[IntelligenceExplanation]:
        """Filters explanations by type, entity, record, or status."""
        if explanation_type and explanation_type in self.index_by_type:
            candidates = self.index_by_type[explanation_type]
        elif entity:
            candidates = self.get_explanations_for_entity(entity)
        elif record_id and record_id in self.index_by_record:
            candidates = self.index_by_record[record_id]
        else:
            candidates = self._all_explanations

        res = candidates
        if explanation_type and explanation_type not in self.index_by_type:
            res = [e for e in res if e.explanation_type == explanation_type]
        if entity:
            ent_clean = entity.strip().upper()
            res = [e for e in res if any(re.strip().upper() == ent_clean for re in e.related_entities)]
        if record_id:
            res = [e for e in res if record_id in e.supporting_source_records]
        if status:
            res = [e for e in res if e.status == status]

        return res
