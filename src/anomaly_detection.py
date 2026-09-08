"""
anomaly_detection.py
----------------------
Flags suspicious patterns that are easy for a human analyst to miss across
hundreds of records, e.g.:

  - Burst calling  : an unusually high number of calls/contacts in a short
                      window (classic pre-operation coordination signature).
  - Structuring     : multiple cash transactions kept just under a reporting
                      threshold (a well-known money-laundering technique).
  - New-node spikes : previously-unseen entities suddenly linking into an
                      existing cluster (possible new recruit / supplier).
  - Isolation Forest : general-purpose statistical outlier detection over
                      engineered per-entity features, to catch pattern types
                      not covered by the hand-written rules above.
"""

from __future__ import annotations
from collections import defaultdict
from datetime import datetime
import numpy as np
from sklearn.ensemble import IsolationForest


def detect_burst_activity(edges: list[dict], window_hours: int = 2, min_events: int = 5):
    """Groups edges by (entity, day) and flags entities with an unusually
    high count of interactions on a given day - a proxy for the 'many calls
    in a short window' pattern without needing exact timestamps in this demo
    dataset (production version would bucket by real timestamp deltas)."""
    counts = defaultdict(int)
    for e in edges:
        counts[(e["source"], e["date"])] += 1
        counts[(e["target"], e["date"])] += 1

    flags = []
    for (entity, date), c in counts.items():
        if c >= min_events:
            flags.append({
                "entity": entity, "date": date, "event_count": c,
                "pattern": "burst_activity",
                "note": f"{entity} involved in {c} linked events on {date} - "
                        f"possible coordination or operational spike.",
            })
    return flags


def detect_structuring(records, threshold: int = 200000):
    """Looks for language indicating cash transactions deliberately split to
    stay under a reporting threshold."""
    flags = []
    for r in records:
        text = r.text.lower()
        if "structur" in text or ("split" in text and ("deposit" in text or "transaction" in text)):
            flags.append({
                "record_id": r.record_id, "date": r.date,
                "pattern": "structuring",
                "note": "Language indicates transactions may have been split "
                        "to evade reporting thresholds - flag for financial review.",
            })
    return flags


def detect_new_entity_spikes(extracted_records):
    """Flags entities on their first appearance if that first appearance is
    already linked (same record) to 2+ previously-known entities - i.e. a
    new player entering an existing cluster fully formed, rather than
    organically."""
    seen = set()
    flags = []
    for rec in extracted_records:
        ents = list({e.text for e in rec.entities})
        new_ents = [t for t in ents if t not in seen]
        known_ents = [t for t in ents if t in seen]
        for new_e in new_ents:
            if len(known_ents) >= 2:
                flags.append({
                    "entity": new_e, "record_id": rec.record_id, "date": rec.date,
                    "pattern": "new_entity_spike",
                    "note": f"'{new_e}' first appears already linked to "
                            f"{len(known_ents)} known entities ({', '.join(known_ents)}).",
                })
        seen.update(ents)
    return flags


def isolation_forest_outliers(centrality: dict, contamination: float = 0.15):
    """General statistical safety net: entities whose centrality-feature
    profile is far from the norm, independent of hand-written rules above."""
    nodes = list(centrality.keys())
    if len(nodes) < 4:
        return []
    X = np.array([[m["degree"], m["betweenness"], m["eigenvector"], m["pagerank"]] for m in centrality.values()])
    clf = IsolationForest(contamination=contamination, random_state=42)
    preds = clf.fit_predict(X)
    return [
        {"entity": n, "type": centrality[n]["type"], "pattern": "statistical_outlier",
         "note": "Centrality profile is a statistical outlier relative to the rest of the network."}
        for n, p in zip(nodes, preds) if p == -1
    ]
