"""
ingestion.py
------------
Unified ingestion layer for the Crime Network Intelligence System (CNIS).

Responsible for pulling raw records from heterogeneous sources and normalizing
them into a common `Record` shape before they reach the NLP / entity-extraction
stage. In production, each connector below would be replaced with a real
client (DB driver, REST API, message queue consumer, file watcher, etc.),
but the interface (`BaseConnector.fetch()` -> list[Record]) stays the same,
so the rest of the pipeline never needs to know where data came from.

Typical real-world sources for this use case:
  - Police Case Management Systems (CCTNS / RMS databases - SQL)
  - Call Detail Records (CDR) from telecom providers (CSV/API dumps)
  - Financial Intelligence Unit / bank suspicious-transaction reports (API)
  - Vehicle registration & ANPR/CCTV feeds (API/CSV)
  - Open-source intelligence: news, social media (API/scraper)
  - Informant tips / free-text investigator notes (manual entry, JSON)
  - Prior conviction / watchlist databases (SQL)
"""

from __future__ import annotations
import json
import sqlite3
import csv
import io
from dataclasses import dataclass, field
from datetime import datetime
from typing import Iterable


@dataclass
class Record:
    record_id: str
    source: str
    date: str
    text: str = ""
    structured: dict = field(default_factory=dict)


class BaseConnector:
    """All connectors implement fetch() -> Iterable[Record]."""

    def fetch(self) -> Iterable[Record]:
        raise NotImplementedError


class JSONFileConnector(BaseConnector):
    """Reads free-text / semi-structured case notes from a JSON file.
    Stands in for a case-management system export."""

    def __init__(self, path: str, key: str = "case_reports"):
        self.path = path
        self.key = key

    def fetch(self) -> Iterable[Record]:
        with open(self.path, "r") as f:
            data = json.load(f)
        for row in data.get(self.key, []):
            yield Record(
                record_id=row["record_id"],
                source=row.get("source", "unknown"),
                date=row.get("date", ""),
                text=row.get("text", ""),
            )


class SQLConnector(BaseConnector):
    """Generic SQL connector. Point at any DB-API 2.0 compliant connection
    (sqlite3, psycopg2, pyodbc for MS-SQL used by many RMS systems, etc.)."""

    def __init__(self, conn, query: str, source_label: str):
        self.conn = conn
        self.query = query
        self.source_label = source_label

    def fetch(self) -> Iterable[Record]:
        cur = self.conn.cursor()
        cur.execute(self.query)
        cols = [c[0] for c in cur.description]
        for row in cur.fetchall():
            row_dict = dict(zip(cols, row))
            yield Record(
                record_id=str(row_dict.get("record_id") or row_dict.get("id")),
                source=self.source_label,
                date=str(row_dict.get("date", "")),
                text=str(row_dict.get("notes", row_dict.get("text", ""))),
                structured=row_dict,
            )


class CSVConnector(BaseConnector):
    """For CDR dumps, ANPR/vehicle sightings, watchlists, etc. delivered as CSV."""

    def __init__(self, csv_text: str, source_label: str):
        self.csv_text = csv_text
        self.source_label = source_label

    def fetch(self) -> Iterable[Record]:
        reader = csv.DictReader(io.StringIO(self.csv_text))
        for i, row in enumerate(reader):
            yield Record(
                record_id=row.get("record_id", f"{self.source_label}-{i}"),
                source=self.source_label,
                date=row.get("date", ""),
                text=row.get("text", ""),
                structured=row,
            )


class RESTAPIConnector(BaseConnector):
    """Stub for pulling from a live API (financial intel, social media, news).
    Swap `fetch_fn` for a real `requests.get(...).json()` call plus pagination."""

    def __init__(self, fetch_fn, source_label: str):
        self.fetch_fn = fetch_fn
        self.source_label = source_label

    def fetch(self) -> Iterable[Record]:
        for row in self.fetch_fn():
            yield Record(
                record_id=row["record_id"],
                source=self.source_label,
                date=row.get("date", datetime.utcnow().isoformat()),
                text=row.get("text", ""),
                structured=row,
            )


class IngestionManager:
    """Aggregates records from every registered connector into one stream,
    which is what the entity-extraction stage consumes."""

    def __init__(self):
        self.connectors: list[BaseConnector] = []

    def register(self, connector: BaseConnector):
        self.connectors.append(connector)
        return self

    def collect(self) -> list[Record]:
        all_records: list[Record] = []
        for connector in self.connectors:
            all_records.extend(connector.fetch())
        # De-duplicate by record_id in case the same event is reported by
        # more than one source feed.
        seen, deduped = set(), []
        for r in all_records:
            if r.record_id not in seen:
                seen.add(r.record_id)
                deduped.append(r)
        return deduped
