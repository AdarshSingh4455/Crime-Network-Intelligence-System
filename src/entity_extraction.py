"""
entity_extraction.py
---------------------
Extracts structured entities (PERSON, ORG, LOCATION, VEHICLE, PHONE, MONEY)
and candidate relationships out of raw case text.

Design note: this module exposes a `NERBackend` interface. The implementation
here (`RuleBasedNER`) uses regex + a small gazetteer so the whole pipeline
runs with zero external ML downloads in this demo. In production, swap in
`SpacyNERBackend` (spaCy `en_core_web_trf` or a fine-tuned transformer NER
model trained on police-report language) without touching any other module.
"""

from __future__ import annotations
import re
from dataclasses import dataclass, field
from itertools import combinations
from typing import List

PERSON_GAZETTEER = [
    "Ravi Malhotra", "Suresh Nair", "Ajay Kulkarni", "Deepak Shah", "Vikram Rao",
]
ORG_GAZETTEER = ["Global Traders Pvt Ltd"]
LOCATION_GAZETTEER = ["Andheri Warehouse", "Andheri"]

PHONE_RE = re.compile(r"\+?\d{1,3}[-.\s]?\d{10}")
VEHICLE_PLATE_RE = re.compile(r"\b[A-Z]{2}\d{2}[A-Z]{1,2}\d{3,4}\b")
MONEY_RE = re.compile(r"(?:INR|Rs\.?|₹)\s?[\d,]+")


@dataclass
class Entity:
    text: str
    label: str  # PERSON | ORG | LOCATION | VEHICLE | PHONE | MONEY
    record_id: str = ""


@dataclass
class ExtractedRecord:
    record_id: str
    date: str
    source: str
    entities: List[Entity] = field(default_factory=list)
    raw_text: str = ""


class NERBackend:
    def extract(self, text: str) -> List[Entity]:
        raise NotImplementedError


class RuleBasedNER(NERBackend):
    """Lightweight gazetteer + regex NER for demo purposes.
    Replace with SpacyNERBackend for production-grade free-text coverage."""

    def extract(self, text: str) -> List[Entity]:
        found: List[Entity] = []

        for name in PERSON_GAZETTEER:
            if name in text:
                found.append(Entity(name, "PERSON"))
        for org in ORG_GAZETTEER:
            if org in text:
                found.append(Entity(org, "ORG"))
        for loc in LOCATION_GAZETTEER:
            if loc in text:
                found.append(Entity(loc, "LOCATION"))

        for m in PHONE_RE.finditer(text):
            found.append(Entity(_normalize_phone(m.group()), "PHONE"))
        for m in VEHICLE_PLATE_RE.finditer(text):
            found.append(Entity(m.group().replace(" ", ""), "VEHICLE"))
        for m in MONEY_RE.finditer(text):
            found.append(Entity(m.group(), "MONEY"))

        # de-dupe within a single record
        unique = {}
        for e in found:
            unique[(e.text, e.label)] = e
        return list(unique.values())


# Example production swap-in (kept commented so the demo has no hard
# dependency on spaCy models being downloaded):
#
# class SpacyNERBackend(NERBackend):
#     def __init__(self, model="en_core_web_trf"):
#         import spacy
#         self.nlp = spacy.load(model)
#     def extract(self, text):
#         doc = self.nlp(text)
#         label_map = {"PERSON": "PERSON", "ORG": "ORG", "GPE": "LOCATION", "LOC": "LOCATION"}
#         out = [Entity(ent.text, label_map[ent.label_]) for ent in doc.ents if ent.label_ in label_map]
#         out += RuleBasedNER().extract(text)  # still regex-extract phones/plates/money
#         return out


def _normalize_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw)
    return digits[-10:]  # normalize to last 10 digits so formats match across sources


def extract_entities(records, backend: NERBackend | None = None) -> List[ExtractedRecord]:
    backend = backend or RuleBasedNER()
    extracted = []
    for r in records:
        ents = backend.extract(r.text)
        for e in ents:
            e.record_id = r.record_id
        extracted.append(ExtractedRecord(
            record_id=r.record_id, date=r.date, source=r.source,
            entities=ents, raw_text=r.text,
        ))
    return extracted


def co_occurrence_edges(extracted: List[ExtractedRecord]):
    """Two entities that appear in the same record are a candidate
    relationship ('associated via record X'). This is the simplest and most
    common way analysts bootstrap a link-chart before deeper relation
    extraction (e.g. verb-based relation classification) is applied."""
    edges = []
    for rec in extracted:
        ents = list({(e.text, e.label) for e in rec.entities})
        for (t1, l1), (t2, l2) in combinations(ents, 2):
            edges.append({
                "source": t1, "source_type": l1,
                "target": t2, "target_type": l2,
                "record_id": rec.record_id, "date": rec.date,
                "context_source": rec.source,
            })
    return edges
