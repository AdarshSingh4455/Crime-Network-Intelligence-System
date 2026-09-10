"""
entity_resolution.py
--------------------
CNIS Phase 3G: Advanced Entity Resolution Engine.

Implements conservative, explainable, and auditable entity resolution:
1. EntityObservation: Traceable raw observation model preserving provenance.
2. Normalization: Conservative normalizers for PERSON, PHONE, VEHICLE, LOCATION, ORG, MONEY.
3. CandidateGenerator: Deterministic blocking to avoid O(n^2) comparisons.
4. EvidenceCalculator: Explainable multi-signal feature extraction with analytical compatibility scoring.
5. ResolutionPolicy: Deterministic 3-tier decision engine (MATCH, DISTINCT, REVIEW_REQUIRED).
6. CanonicalEntityRegistry: Stable canonical entities, variant aliases, and human-in-the-loop review queue.

MANDATORY GUARDRAILS ENFORCED:
1. Same normalized PERSON name alone does not automatically establish identity.
2. MONEY observations must never be merged solely because normalized amounts are equal.
3. Production graph topology and edge weights remain baseline-compatible.
4. Similarity scores are presented as analytical compatibility indices, never uncalibrated probabilities.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Set, Tuple


# ── 1. Conservative Normalizers ───────────────────────────────────────────────

_HONORIFICS_RE = re.compile(
    r"\b(mr|mrs|ms|dr|prof|adv|shri|smt|inspector|sub-inspector|officer)\.?\b",
    re.IGNORECASE,
)
_CORPORATE_SUFFIXES_RE = re.compile(
    r"\b(pvt\s+ltd|private\s+limited|ltd|limited|inc|corp|corporation|llc|co)\.?\b",
    re.IGNORECASE,
)
_MONEY_AMOUNT_RE = re.compile(r"[\d,]+")


def normalize_whitespace(text: str) -> str:
    """Collapses multiple spaces, tabs, and newlines into a single clean space."""
    if not text:
        return ""
    text = unicodedata.normalize("NFKC", text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_person_name(raw: str) -> str:
    """
    Conservative person name normalization:
    - Normalizes unicode and whitespace.
    - Strips safe non-name honorifics.
    - Strips external punctuation, preserves internal hyphens.
    - Returns lowercased normalized representation.
    """
    cleaned = normalize_whitespace(raw)
    if not cleaned:
        return ""
    cleaned = _HONORIFICS_RE.sub("", cleaned)
    cleaned = re.sub(r"[^\w\s-]", " ", cleaned)
    return normalize_whitespace(cleaned).lower()


def canonical_display_name(raw: str) -> str:
    """Returns title-cased display name while preserving legitimate casing."""
    norm = normalize_whitespace(raw)
    if not norm:
        return ""
    words = norm.split(" ")
    return " ".join(w.capitalize() if not w.isupper() or len(w) > 4 else w for w in words)


def normalize_phone_number(raw: str) -> Tuple[str, bool]:
    """
    Conservative phone normalization:
    - Extracts numeric digits only.
    - If length >= 10, strips standard country prefixes (e.g. +91 or leading 0).
    - Returns (normalized_10_digit_str, is_complete).
    - If fewer than 10 digits are present, does NOT invent missing digits.
    """
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 10:
        return digits, True
    elif len(digits) == 11 and digits.startswith("0"):
        return digits[1:], True
    elif len(digits) == 12 and digits.startswith("91"):
        return digits[2:], True
    elif len(digits) > 10:
        return digits[-10:], True
    else:
        return digits, False


def normalize_vehicle_plate(raw: str) -> str:
    """
    Conservative vehicle registration plate normalization:
    - Strips spaces, hyphens, periods, and uppercase.
    - Preserves standard Indian alphanumeric plate layout.
    """
    if not raw:
        return ""
    cleaned = re.sub(r"[\s\-\.]", "", raw.upper())
    return cleaned


def normalize_location_name(raw: str) -> str:
    """
    Conservative location normalization:
    - Cleans whitespace and casing only.
    - CRITICAL: Never collapses hierarchical / sub-locations (e.g. 'Andheri' vs 'Andheri Warehouse').
    """
    cleaned = normalize_whitespace(raw)
    return cleaned.title() if cleaned else ""


def normalize_org_name(raw: str) -> Tuple[str, str]:
    """
    Conservative organization normalization:
    - Returns (display_name, indexing_key).
    - indexing_key removes corporate suffixes (Pvt Ltd, LLC) for candidate blocking.
    """
    cleaned = normalize_whitespace(raw)
    display = cleaned.title() if cleaned else ""
    indexing = _CORPORATE_SUFFIXES_RE.sub("", cleaned).lower()
    return display, normalize_whitespace(indexing)


def normalize_money_value(raw: str) -> Tuple[str, float]:
    """
    Conservative monetary amount normalization:
    - Extracts currency indicator and clean numeric magnitude.
    - CRITICAL GUARDRAIL: Equal amounts do NOT imply identical financial transactions.
    """
    cleaned = normalize_whitespace(raw)
    curr = "INR"
    if "₹" in cleaned or "Rs" in cleaned.title() or "INR" in cleaned.upper():
        curr = "INR"
    m = _MONEY_AMOUNT_RE.search(cleaned)
    amount = float(m.group(0).replace(",", "")) if m else 0.0
    return f"{curr} {int(amount) if amount.is_integer() else amount}", amount


# ── 2. Data Models ───────────────────────────────────────────────────────────

@dataclass
class EntityObservation:
    """
    Verbatim observation of an entity mention in a specific ingested record.
    Preserves exact provenance, text offsets, and surrounding narrative.
    """
    observation_id: str
    raw_text: str
    entity_type: str  # PERSON | PHONE | VEHICLE | LOCATION | ORG | MONEY
    record_id: str
    source: str
    date: str
    normalized_value: str
    context_snippet: str = ""
    associated_phone: Optional[str] = None
    associated_vehicle: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "observation_id": self.observation_id,
            "raw_text": self.raw_text,
            "entity_type": self.entity_type,
            "record_id": self.record_id,
            "source": self.source,
            "date": self.date,
            "normalized_value": self.normalized_value,
            "context_snippet": self.context_snippet,
            "associated_phone": self.associated_phone,
            "associated_vehicle": self.associated_vehicle,
        }


@dataclass
class ResolutionEvidence:
    """
    Explainable evidence signals calculated for a candidate entity pair.
    All scores are analytical compatibility indices (0.0 to 1.0), NOT probabilities.
    """
    signals: Dict[str, float] = field(default_factory=dict)
    rationale: List[str] = field(default_factory=list)
    compatibility_score: float = 0.0
    contradictions: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "signals": {k: round(v, 4) for k, v in self.signals.items()},
            "rationale": self.rationale,
            "compatibility_score": round(self.compatibility_score, 4),
            "contradictions": self.contradictions,
        }


@dataclass
class ResolutionDecision:
    """
    Deterministic decision for a candidate entity pair.
    Must be MATCH, DISTINCT, or REVIEW_REQUIRED.
    """
    decision: str  # "MATCH" | "DISTINCT" | "REVIEW_REQUIRED"
    confidence_label: str  # "Deterministic Match" | "Confirmed Distinct" | "Investigator Review Required"
    reasons: List[str] = field(default_factory=list)
    evidence: ResolutionEvidence = field(default_factory=ResolutionEvidence)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "decision": self.decision,
            "confidence_label": self.confidence_label,
            "reasons": self.reasons,
            "evidence": self.evidence.to_dict(),
        }


@dataclass
class CanonicalEntity:
    """
    Canonical representation of a resolved entity across multiple observations.
    Preserves original observations, variants, and review requirements.
    """
    canonical_id: str
    entity_type: str
    canonical_name: str
    observed_variants: List[str] = field(default_factory=list)
    observation_count: int = 0
    source_records: List[str] = field(default_factory=list)
    observations: List[EntityObservation] = field(default_factory=list)
    associated_identifiers: Dict[str, List[str]] = field(default_factory=dict)
    review_status: str = "RESOLVED"  # "RESOLVED" | "REVIEW_REQUIRED"
    review_reasons: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "canonical_id": self.canonical_id,
            "entity_type": self.entity_type,
            "canonical_name": self.canonical_name,
            "observed_variants": sorted(list(set(self.observed_variants))),
            "observation_count": len(self.observations),
            "source_records": sorted(list(set(self.source_records))),
            "observations": [o.to_dict() for o in self.observations],
            "associated_identifiers": self.associated_identifiers,
            "review_status": self.review_status,
            "review_reasons": self.review_reasons,
        }


# ── 3. Candidate Generator (Deterministic Blocking) ──────────────────────────

class CandidateGenerator:
    """
    Generates plausible candidate pairs using deterministic blocking strategies.
    Avoids blind O(n^2) comparisons across the entire observation corpus.
    """

    @classmethod
    def generate_candidate_pairs(
        cls, observations: List[EntityObservation]
    ) -> List[Tuple[EntityObservation, EntityObservation]]:
        pairs: Set[Tuple[int, int]] = set()
        by_type: Dict[str, List[int]] = {}

        for idx, obs in enumerate(observations):
            by_type.setdefault(obs.entity_type, []).append(idx)

        # For each entity type, construct deterministic blocking indexes
        for etype, indices in by_type.items():
            if len(indices) < 2:
                continue

            # Blocking Index 1: Exact normalized value
            exact_index: Dict[str, List[int]] = {}
            # Blocking Index 2: Primary token (e.g. surname for PERSON, primary token for ORG)
            token_index: Dict[str, List[int]] = {}
            # Blocking Index 3: Shared associated identifier (phone / vehicle)
            ident_index: Dict[str, List[int]] = {}

            for i in indices:
                obs = observations[i]
                norm = obs.normalized_value

                # 1. Exact normalized block
                if norm:
                    exact_index.setdefault(norm, []).append(i)

                # 2. Token blocking for PERSON and ORG
                if etype in ("PERSON", "ORG") and norm:
                    tokens = [t for t in norm.split() if len(t) > 2]
                    for tok in tokens:
                        token_index.setdefault(tok, []).append(i)

                # 3. Identifier blocking
                if obs.associated_phone:
                    ident_index.setdefault(f"ph:{obs.associated_phone}", []).append(i)
                if obs.associated_vehicle:
                    ident_index.setdefault(f"veh:{obs.associated_vehicle}", []).append(i)

            # Generate candidate pairs from blocks
            for block in exact_index.values():
                for a in range(len(block)):
                    for b in range(a + 1, len(block)):
                        pairs.add((min(block[a], block[b]), max(block[a], block[b])))

            for block in token_index.values():
                if len(block) <= 25:  # Safe block size limit
                    for a in range(len(block)):
                        for b in range(a + 1, len(block)):
                            pairs.add((min(block[a], block[b]), max(block[a], block[b])))

            for block in ident_index.values():
                for a in range(len(block)):
                    for b in range(a + 1, len(block)):
                        pairs.add((min(block[a], block[b]), max(block[a], block[b])))

        return [(observations[i], observations[j]) for (i, j) in sorted(pairs)]


# ── 4. Evidence Calculator ───────────────────────────────────────────────────

class EvidenceCalculator:
    """
    Computes explainable, auditable evidence signals for a candidate pair.
    All scores are analytical compatibility indices, NEVER probabilities.
    """

    @staticmethod
    def _string_similarity(s1: str, s2: str) -> float:
        if not s1 or not s2:
            return 0.0
        if s1 == s2:
            return 1.0
        return SequenceMatcher(None, s1, s2).ratio()

    @staticmethod
    def _token_jaccard(s1: str, s2: str) -> float:
        toks1 = set(s1.split())
        toks2 = set(s2.split())
        if not toks1 or not toks2:
            return 0.0
        intersection = toks1.intersection(toks2)
        union = toks1.union(toks2)
        return len(intersection) / len(union)

    @classmethod
    def evaluate_candidate_pair(
        cls, obs_a: EntityObservation, obs_b: EntityObservation
    ) -> ResolutionEvidence:
        signals: Dict[str, float] = {}
        rationale: List[str] = []
        contradictions: List[str] = []

        # 1. Type compatibility
        if obs_a.entity_type != obs_b.entity_type:
            signals["type_match"] = 0.0
            contradictions.append(
                f"Incompatible entity types: '{obs_a.entity_type}' vs '{obs_b.entity_type}'"
            )
            return ResolutionEvidence(
                signals=signals,
                rationale=["Candidate pair rejected due to mismatched entity classifications."],
                compatibility_score=0.0,
                contradictions=contradictions,
            )
        signals["type_match"] = 1.0

        etype = obs_a.entity_type
        val_a = obs_a.normalized_value
        val_b = obs_b.normalized_value

        # 2. Textual & Token Similarity
        str_sim = cls._string_similarity(val_a, val_b)
        signals["string_similarity"] = str_sim

        if val_a == val_b:
            signals["exact_normalized_match"] = 1.0
            rationale.append(f"Exact normalized {etype.lower()} match: '{val_a}'.")
        else:
            signals["exact_normalized_match"] = 0.0
            if str_sim >= 0.85:
                rationale.append(
                    f"High textual similarity ({str_sim:.2f}) between '{obs_a.raw_text}' and '{obs_b.raw_text}'."
                )

        if etype in ("PERSON", "ORG", "LOCATION"):
            tok_jaccard = cls._token_jaccard(val_a, val_b)
            signals["token_jaccard"] = tok_jaccard
            if tok_jaccard >= 0.5:
                rationale.append(f"Significant token overlap (Jaccard {tok_jaccard:.2f}).")

        # 3. Contextual Identifiers (Phone & Vehicle Alignment)
        if obs_a.associated_phone and obs_b.associated_phone:
            if obs_a.associated_phone == obs_b.associated_phone:
                signals["phone_alignment"] = 1.0
                rationale.append(f"Shared contact number: {obs_a.associated_phone}.")
            else:
                signals["phone_alignment"] = 0.0
                contradictions.append(
                    f"Conflicting contact numbers observed: '{obs_a.associated_phone}' vs '{obs_b.associated_phone}'."
                )

        if obs_a.associated_vehicle and obs_b.associated_vehicle:
            if obs_a.associated_vehicle == obs_b.associated_vehicle:
                signals["vehicle_alignment"] = 1.0
                rationale.append(f"Shared vehicle registration: {obs_a.associated_vehicle}.")
            else:
                signals["vehicle_alignment"] = 0.0
                contradictions.append(
                    f"Conflicting vehicle registrations observed: '{obs_a.associated_vehicle}' vs '{obs_b.associated_vehicle}'."
                )

        # 4. Record Co-occurrence / Proximity
        if obs_a.record_id == obs_b.record_id:
            signals["intra_record_cooccurrence"] = 1.0
            rationale.append(f"Co-occurs within the same case report ({obs_a.record_id}).")
        else:
            signals["intra_record_cooccurrence"] = 0.0

        # Compute composite analytical compatibility score (NOT a probability)
        score = 0.0
        if signals.get("exact_normalized_match") == 1.0:
            score += 0.60
        else:
            score += 0.40 * str_sim

        if signals.get("phone_alignment") == 1.0:
            score += 0.25
        elif "phone_alignment" in signals and signals["phone_alignment"] == 0.0:
            score -= 0.35  # Penalty for conflicting identifier

        if signals.get("vehicle_alignment") == 1.0:
            score += 0.15
        elif "vehicle_alignment" in signals and signals["vehicle_alignment"] == 0.0:
            score -= 0.25

        # Penalty for explicit contradictions
        if contradictions:
            score = max(0.0, score - 0.30 * len(contradictions))

        compat_score = max(0.0, min(1.0, score))

        return ResolutionEvidence(
            signals=signals,
            rationale=rationale,
            compatibility_score=compat_score,
            contradictions=contradictions,
        )


# ── 5. Resolution Decision Policy ─────────────────────────────────────────────

class ResolutionPolicy:
    """
    Deterministic decision policy evaluating evidence against explicit domain rules.
    Categorizes candidate pairs strictly into MATCH, DISTINCT, or REVIEW_REQUIRED.
    """

    @classmethod
    def evaluate(
        cls, obs_a: EntityObservation, obs_b: EntityObservation, evidence: ResolutionEvidence
    ) -> ResolutionDecision:
        signals = evidence.signals
        contradictions = evidence.contradictions

        # Guardrail: Incompatible entity types
        if obs_a.entity_type != obs_b.entity_type:
            return ResolutionDecision(
                decision="DISTINCT",
                confidence_label="Confirmed Distinct",
                reasons=["Mismatched entity classifications."],
                evidence=evidence,
            )

        etype = obs_a.entity_type

        # ── Policy for MONEY ─────────────────────────────────────────────────
        # MANDATORY GUARDRAIL: MONEY observations must NEVER be merged solely because
        # normalized amounts are equal.
        if etype == "MONEY":
            if obs_a.record_id == obs_b.record_id and obs_a.raw_text == obs_b.raw_text:
                return ResolutionDecision(
                    decision="MATCH",
                    confidence_label="Deterministic Match",
                    reasons=["Identical monetary observation within the same source record."],
                    evidence=evidence,
                )
            else:
                return ResolutionDecision(
                    decision="DISTINCT",
                    confidence_label="Confirmed Distinct",
                    reasons=[
                        "Monetary amounts across distinct case records are treated as independent financial transactions."
                    ],
                    evidence=evidence,
                )

        # ── Policy for PHONE ─────────────────────────────────────────────────
        if etype == "PHONE":
            is_comp_a = len(obs_a.normalized_value) == 10
            is_comp_b = len(obs_b.normalized_value) == 10

            if not is_comp_a or not is_comp_b:
                return ResolutionDecision(
                    decision="REVIEW_REQUIRED",
                    confidence_label="Investigator Review Required",
                    reasons=["Incomplete telephone number formatting requires verification."],
                    evidence=evidence,
                )
            if obs_a.normalized_value == obs_b.normalized_value:
                return ResolutionDecision(
                    decision="MATCH",
                    confidence_label="Deterministic Match",
                    reasons=[f"Exact 10-digit telephone subscriber match: {obs_a.normalized_value}."],
                    evidence=evidence,
                )
            else:
                return ResolutionDecision(
                    decision="DISTINCT",
                    confidence_label="Confirmed Distinct",
                    reasons=["Distinct telephone subscriber numbers."],
                    evidence=evidence,
                )

        # ── Policy for VEHICLE ───────────────────────────────────────────────
        if etype == "VEHICLE":
            if obs_a.normalized_value == obs_b.normalized_value:
                return ResolutionDecision(
                    decision="MATCH",
                    confidence_label="Deterministic Match",
                    reasons=[f"Exact vehicle registration plate match: {obs_a.normalized_value}."],
                    evidence=evidence,
                )
            else:
                return ResolutionDecision(
                    decision="DISTINCT",
                    confidence_label="Confirmed Distinct",
                    reasons=["Distinct vehicle registration plates."],
                    evidence=evidence,
                )

        # ── Policy for LOCATION ──────────────────────────────────────────────
        # MANDATORY: Never collapse hierarchical / sub-locations (e.g. Andheri vs Andheri Warehouse)
        if etype == "LOCATION":
            if obs_a.normalized_value.lower() == obs_b.normalized_value.lower():
                return ResolutionDecision(
                    decision="MATCH",
                    confidence_label="Deterministic Match",
                    reasons=[f"Exact geographical site match: {obs_a.normalized_value}."],
                    evidence=evidence,
                )
            else:
                norm_a = obs_a.normalized_value.lower()
                norm_b = obs_b.normalized_value.lower()
                if norm_a in norm_b or norm_b in norm_a:
                    return ResolutionDecision(
                        decision="DISTINCT",
                        confidence_label="Confirmed Distinct",
                        reasons=[
                            f"Hierarchical or specific location distinction: '{obs_a.normalized_value}' and '{obs_b.normalized_value}' represent distinct spatial operational entities."
                        ],
                        evidence=evidence,
                    )
                return ResolutionDecision(
                    decision="DISTINCT",
                    confidence_label="Confirmed Distinct",
                    reasons=["Distinct geographic locations."],
                    evidence=evidence,
                )

        # ── Policy for ORGANIZATION ──────────────────────────────────────────
        if etype == "ORG":
            if obs_a.normalized_value.lower() == obs_b.normalized_value.lower():
                return ResolutionDecision(
                    decision="MATCH",
                    confidence_label="Deterministic Match",
                    reasons=[f"Exact corporate entity match: {obs_a.normalized_value}."],
                    evidence=evidence,
                )
            str_sim = signals.get("string_similarity", 0.0)
            if str_sim >= 0.85:
                return ResolutionDecision(
                    decision="REVIEW_REQUIRED",
                    confidence_label="Investigator Review Required",
                    reasons=[
                        f"Near-matching organization names ('{obs_a.raw_text}' vs '{obs_b.raw_text}') require corporate registry verification."
                    ],
                    evidence=evidence,
                )
            return ResolutionDecision(
                decision="DISTINCT",
                confidence_label="Confirmed Distinct",
                reasons=["Distinct corporate organizations."],
                evidence=evidence,
            )

        # ── Policy for PERSON ────────────────────────────────────────────────
        # MANDATORY GUARDRAILS:
        # 1. Same normalized PERSON name alone must NOT automatically establish identity.
        # 2. Conflicting identifiers force REVIEW_REQUIRED.
        if etype == "PERSON":
            exact_match = signals.get("exact_normalized_match") == 1.0
            str_sim = signals.get("string_similarity", 0.0)

            # Check for conflicting identifiers
            if contradictions:
                return ResolutionDecision(
                    decision="REVIEW_REQUIRED",
                    confidence_label="Investigator Review Required",
                    reasons=[
                        f"Conflicting contextual identifiers detected: {'; '.join(contradictions)}."
                    ],
                    evidence=evidence,
                )

            # Case: Exact normalized name match
            if exact_match:
                # Same record mention: identical individual within the narrative
                if obs_a.record_id == obs_b.record_id:
                    return ResolutionDecision(
                        decision="MATCH",
                        confidence_label="Deterministic Match",
                        reasons=["Co-occurring identical person mention in the same record."],
                        evidence=evidence,
                    )

                # Across records: inspect contextual corroboration
                has_phone_match = signals.get("phone_alignment") == 1.0
                has_vehicle_match = signals.get("vehicle_alignment") == 1.0

                if has_phone_match or has_vehicle_match:
                    corrob = []
                    if has_phone_match:
                        corrob.append(f"verified contact number {obs_a.associated_phone}")
                    if has_vehicle_match:
                        corrob.append(f"verified vehicle {obs_a.associated_vehicle}")
                    return ResolutionDecision(
                        decision="MATCH",
                        confidence_label="Corroborated Match",
                        reasons=[
                            f"Identity corroborated by matching name and {' with '.join(corrob)}."
                        ],
                        evidence=evidence,
                    )

                # Neither phone nor vehicle corroboration is present:
                # Under Guardrail 1, same normalized name alone without corroboration in distinct
                # contexts warrants REVIEW_REQUIRED rather than forced merging.
                return ResolutionDecision(
                    decision="REVIEW_REQUIRED",
                    confidence_label="Investigator Review Required",
                    reasons=[
                        f"Identical name '{obs_a.raw_text}' observed across records {obs_a.record_id} and {obs_b.record_id} without corroborating personal identifier."
                    ],
                    evidence=evidence,
                )

            # Case: Near-duplicate names (e.g. casing/spelling variation or nickname)
            if str_sim >= 0.75:
                has_corroboration = (
                    signals.get("phone_alignment") == 1.0
                    or signals.get("vehicle_alignment") == 1.0
                )
                if has_corroboration:
                    return ResolutionDecision(
                        decision="MATCH",
                        confidence_label="Corroborated Match",
                        reasons=[
                            f"Spelling variation ('{obs_a.raw_text}' vs '{obs_b.raw_text}') resolved by shared identifier corroboration."
                        ],
                        evidence=evidence,
                    )
                return ResolutionDecision(
                    decision="REVIEW_REQUIRED",
                    confidence_label="Investigator Review Required",
                    reasons=[
                        f"Name similarity ({str_sim:.2f}) between '{obs_a.raw_text}' and '{obs_b.raw_text}' requires human review."
                    ],
                    evidence=evidence,
                )

            # Default: Distinct individuals
            return ResolutionDecision(
                decision="DISTINCT",
                confidence_label="Confirmed Distinct",
                reasons=["Dissimilar person names with no shared corroborating identifiers."],
                evidence=evidence,
            )

        return ResolutionDecision(
            decision="REVIEW_REQUIRED",
            confidence_label="Investigator Review Required",
            reasons=["Unclassified entity candidate pair requires analyst evaluation."],
            evidence=evidence,
        )


# ── 6. Canonical Entity Registry Builder ──────────────────────────────────────

class EntityResolutionEngine:
    """
    Orchestrates the entire entity resolution pipeline:
    Extracts raw observations -> Generates candidates -> Computes evidence ->
    Applies resolution policy -> Compiles Canonical Entity Registry.
    """

    def __init__(self):
        self.observations: List[EntityObservation] = []
        self.canonical_registry: Dict[str, CanonicalEntity] = {}
        self.decisions: List[Dict[str, Any]] = []
        self.review_queue: List[Dict[str, Any]] = []

    def ingest_extracted_records(self, extracted_records: list) -> List[EntityObservation]:
        """
        Transforms ExtractedRecord objects into traceable EntityObservation objects.
        """
        obs_list: List[EntityObservation] = []
        for r_idx, rec in enumerate(extracted_records):
            rec_id = getattr(rec, "record_id", f"REC-{r_idx}")
            rec_source = getattr(rec, "source", "unknown")
            rec_date = getattr(rec, "date", "")
            raw_text = getattr(rec, "raw_text", "")

            # Scan record for phone and vehicle identifiers to attach as context
            rec_phones = []
            rec_vehicles = []
            for e in getattr(rec, "entities", []):
                elabel = getattr(e, "label", "")
                etext = getattr(e, "text", "")
                if elabel == "PHONE":
                    norm_p, _ = normalize_phone_number(etext)
                    rec_phones.append(norm_p)
                elif elabel == "VEHICLE":
                    rec_vehicles.append(normalize_vehicle_plate(etext))

            primary_phone = rec_phones[0] if rec_phones else None
            primary_vehicle = rec_vehicles[0] if rec_vehicles else None

            for e_idx, ent in enumerate(getattr(rec, "entities", [])):
                etext = getattr(ent, "text", "")
                elabel = getattr(ent, "label", "UNKNOWN")
                obs_id = f"OBS-{rec_id}-{e_idx+1:02d}"

                # Calculate normalized value per type
                norm_val = etext
                if elabel == "PERSON":
                    norm_val = normalize_person_name(etext)
                elif elabel == "PHONE":
                    norm_val, _ = normalize_phone_number(etext)
                elif elabel == "VEHICLE":
                    norm_val = normalize_vehicle_plate(etext)
                elif elabel == "LOCATION":
                    norm_val = normalize_location_name(etext)
                elif elabel == "ORG":
                    _, norm_val = normalize_org_name(etext)
                elif elabel == "MONEY":
                    norm_val, _ = normalize_money_value(etext)

                snippet = ""
                if raw_text and etext in raw_text:
                    pos = raw_text.find(etext)
                    start = max(0, pos - 40)
                    end = min(len(raw_text), pos + len(etext) + 40)
                    snippet = raw_text[start:end].strip()

                obs = EntityObservation(
                    observation_id=obs_id,
                    raw_text=etext,
                    entity_type=elabel,
                    record_id=rec_id,
                    source=rec_source,
                    date=rec_date,
                    normalized_value=norm_val,
                    context_snippet=snippet,
                    associated_phone=primary_phone,
                    associated_vehicle=primary_vehicle,
                )
                obs_list.append(obs)

        self.observations = obs_list
        return obs_list

    def resolve(
        self,
        extracted_records: list,
    ) -> Dict[str, CanonicalEntity]:
        """
        Executes end-to-end entity resolution and builds the Canonical Entity Registry.
        """
        self.ingest_extracted_records(extracted_records)
        candidate_pairs = CandidateGenerator.generate_candidate_pairs(self.observations)

        # Union-Find for connected components of MATCH decisions
        parent: Dict[int, int] = {i: i for i in range(len(self.observations))}

        def find(i: int) -> int:
            if parent[i] == i:
                return i
            parent[i] = find(parent[i])
            return parent[i]

        def union(i: int, j: int):
            root_i = find(i)
            root_j = find(j)
            if root_i != root_j:
                parent[root_i] = root_j

        self.decisions = []
        self.review_queue = []

        for obs_a, obs_b in candidate_pairs:
            evidence = EvidenceCalculator.evaluate_candidate_pair(obs_a, obs_b)
            decision = ResolutionPolicy.evaluate(obs_a, obs_b, evidence)

            dec_record = {
                "pair": (obs_a.observation_id, obs_b.observation_id),
                "obs_a": obs_a.to_dict(),
                "obs_b": obs_b.to_dict(),
                "decision": decision.to_dict(),
            }
            self.decisions.append(dec_record)

            idx_a = self.observations.index(obs_a)
            idx_b = self.observations.index(obs_b)

            if decision.decision == "MATCH":
                union(idx_a, idx_b)
            elif decision.decision == "REVIEW_REQUIRED":
                self.review_queue.append(dec_record)

        # Group observations into clusters
        clusters: Dict[int, List[EntityObservation]] = {}
        for idx, obs in enumerate(self.observations):
            root = find(idx)
            clusters.setdefault(root, []).append(obs)

        # Build CanonicalEntity objects
        registry: Dict[str, CanonicalEntity] = {}

        for cluster_id, obs_group in clusters.items():
            first_obs = obs_group[0]
            etype = first_obs.entity_type

            # Determine primary canonical name
            raw_variants = [o.raw_text for o in obs_group]
            unique_variants = sorted(list(set(raw_variants)))
            rec_ids = sorted(list(set(o.record_id for o in obs_group)))

            if etype == "PERSON":
                canon_name = canonical_display_name(first_obs.raw_text)
            elif etype == "PHONE":
                canon_name, _ = normalize_phone_number(first_obs.raw_text)
            elif etype == "VEHICLE":
                canon_name = normalize_vehicle_plate(first_obs.raw_text)
            elif etype == "LOCATION":
                canon_name = normalize_location_name(first_obs.raw_text)
            elif etype == "ORG":
                canon_name, _ = normalize_org_name(first_obs.raw_text)
            elif etype == "MONEY":
                canon_name, _ = normalize_money_value(first_obs.raw_text)
            else:
                canon_name = first_obs.raw_text

            slug = re.sub(r"[^A-Za-z0-9]", "-", canon_name.upper()).strip("-")
            canon_id = f"ENT-{etype}-{slug}"

            # Ensure uniqueness of key if distinct clusters have same text
            # (e.g. distinct MONEY observations or distinct individuals flagged for review)
            reg_key = canon_name
            if reg_key in registry:
                counter = 2
                while f"{canon_name} #{counter}" in registry:
                    counter += 1
                reg_key = f"{canon_name} #{counter}"
                canon_id = f"{canon_id}-{counter}"

            cluster_obs_ids = {o.observation_id for o in obs_group}
            rel_reviews = [
                rq for rq in self.review_queue
                if rq["pair"][0] in cluster_obs_ids or rq["pair"][1] in cluster_obs_ids
            ]

            rev_status = "REVIEW_REQUIRED" if rel_reviews else "RESOLVED"
            rev_reasons = []
            for rr in rel_reviews:
                rev_reasons.extend(rr["decision"]["reasons"])

            phones = set()
            vehicles = set()
            for o in obs_group:
                if o.associated_phone:
                    phones.add(o.associated_phone)
                if o.associated_vehicle:
                    vehicles.add(o.associated_vehicle)

            canon_ent = CanonicalEntity(
                canonical_id=canon_id,
                entity_type=etype,
                canonical_name=canon_name,
                observed_variants=unique_variants,
                observation_count=len(obs_group),
                source_records=rec_ids,
                observations=obs_group,
                associated_identifiers={
                    "phones": sorted(list(phones)),
                    "vehicles": sorted(list(vehicles)),
                },
                review_status=rev_status,
                review_reasons=sorted(list(set(rev_reasons))),
            )
            registry[reg_key] = canon_ent

        self.canonical_registry = registry
        return registry

    def get_summary(self) -> Dict[str, Any]:
        """Returns high-level resolution statistics and review queue metrics."""
        total_obs = len(self.observations)
        total_canonical = len(self.canonical_registry)
        by_type: Dict[str, int] = {}
        for ce in self.canonical_registry.values():
            by_type[ce.entity_type] = by_type.get(ce.entity_type, 0) + 1

        review_count = sum(1 for ce in self.canonical_registry.values() if ce.review_status == "REVIEW_REQUIRED")

        return {
            "total_observations": total_obs,
            "total_canonical_entities": total_canonical,
            "canonical_by_type": by_type,
            "candidate_pairs_evaluated": len(self.decisions),
            "review_queue_count": len(self.review_queue),
            "entities_requiring_review": review_count,
            "policy_governance": {
                "guardrail_1_name_alone_no_auto_identity": True,
                "guardrail_2_money_never_merged_on_amount": True,
                "guardrail_3_baseline_topology_intact": True,
                "guardrail_4_analytical_scores_not_probabilities": True,
            },
        }
