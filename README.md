# Crime Network Intelligence System (CNIS)
### AI-powered link analysis for investigators — reference architecture + runnable demo

This package contains a working reference implementation of the system described
in the requirements: it ingests multi-source case data, extracts entities,
builds a relationship graph, ranks key influencers, flags suspicious patterns,
and produces investigator-facing visual outputs.

### Windows Setup & Execution

1. Open the project folder in VS Code / Cursor:
```powershell
cd Crime-Network-Intelligence-System
```

2. Create and activate a virtual environment:
```powershell
python -m venv .venv
.venv\Scripts\activate
```

3. Upgrade pip and install dependencies:
```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

4. Run the pipeline from the project root:
```powershell
python src\pipeline.py
```

Outputs will be generated in `output/`:
- `network_graph.html`: Interactive link-chart (D3 force-directed graph)
- `network.gexf`: Gephi-compatible network graph export
- `top_players.png`: Ranked key-players chart
- `intelligence_report.json`: Full JSON intelligence report

---

## 1. System Architecture

```
┌────────────────────┐   ┌──────────────────────┐   ┌────────────────────────┐
│   DATA SOURCES      │   │  INGESTION LAYER     │   │  NLP / ENTITY LAYER    │
│ • Police RMS/CCTNS  │──▶│ Connectors:          │──▶│ • NER (person/org/loc) │
│ • Call Detail Recs  │   │  SQL / CSV / JSON /  │   │ • Regex extractors     │
│ • Financial Intel   │   │  REST API / file     │   │  (phone, plate, money) │
│ • Vehicle/ANPR/CCTV │   │ watch, normalized to │   │ • Entity resolution /  │
│ • OSINT (news,      │   │ common Record schema │   │   de-duplication       │
│   social media)     │   │                      │   │                        │
│ • Informant notes   │   └──────────────────────┘   └───────────┬────────────┘
└────────────────────┘                                           │
                                                                  ▼
┌────────────────────┐   ┌──────────────────────┐   ┌────────────────────────┐
│  VISUALIZATION &    │◀──│  ANALYTICS LAYER     │◀──│   GRAPH LAYER          │
│  INVESTIGATOR UI    │   │ • Centrality (degree,│   │ • Typed nodes:         │
│ • Interactive link  │   │   betweenness, eigen,│   │   PERSON/ORG/LOCATION/ │
│   chart (D3)        │   │   PageRank)          │   │   VEHICLE/PHONE/MONEY  │
│ • Gephi export      │   │ • Key-player ranking │   │ • Weighted edges =     │
│ • PDF/report export │   │ • Community detection│   │   corroborating record │
│ • Alerts/dashboard  │   │ • Anomaly detection  │   │   count                │
└────────────────────┘   │   (burst, structuring│   │ • Backed by Neo4j/     │
                          │   outlier models)    │   │   Neptune in production│
                          └──────────────────────┘   └────────────────────────┘
```

## 2. Process Flow (mapped to your requirements)

| # | Requirement | How it's implemented |
|---|---|---|
| 1 | Collect/process multi-source data | `ingestion.py` — pluggable connectors (SQL, CSV, JSON, REST API), all normalized into one `Record` schema and de-duplicated |
| 2 | Extract entities (people, locations, vehicles, phones, orgs) | `entity_extraction.py` — NER backend interface + regex extractors for phone numbers, vehicle plates, currency amounts; gazetteer/NER for names, orgs, locations |
| 3 | Build relationship maps | `graph_builder.py` — co-occurrence graph, edge weight = number of independent corroborating records |
| 4 | Identify key/influential individuals | `network_analysis.py` — degree, betweenness, eigenvector centrality + PageRank blended into a composite influence score |
| 5 | Detect suspicious patterns | `anomaly_detection.py` — burst-activity detection, structuring (money-laundering) language detection, new-entity-spike detection, Isolation Forest statistical outliers |
| 6 | Visual & analytical insights for investigators | `visualize.py` — interactive force-directed HTML link chart, Gephi `.gexf` export, ranked bar chart, full JSON report |

## 3. Data flow, step by step

1. **Ingestion** — Each source (RMS database, telecom CDR dump, FIU/bank
   alerts, ANPR/vehicle feeds, informant notes, OSINT) is read through its
   own connector but yields the same `Record(record_id, source, date, text,
   structured)` object, so downstream code never has to special-case a source.
2. **Entity extraction** — Every record's free text is run through NER to
   pull out `PERSON`, `ORG`, `LOCATION` mentions, and through regex for
   `PHONE`, `VEHICLE` plate, and `MONEY` amounts. Phone numbers are
   normalized (last 10 digits) so the same number written in different
   formats across sources resolves to one entity — a basic form of entity
   resolution. Production systems should extend this with fuzzy name
   matching (Jaro-Winkler / embeddings) to merge spelling variants and
   aliases.
3. **Relationship graph** — Any two entities appearing in the same record
   become a candidate edge ("associated via record X"). Repeated
   co-occurrence across multiple independent records increases edge weight,
   which is a simple but effective proxy for relationship strength/confidence.
4. **Network analysis**:
   - **Degree centrality** → who has the most direct contacts (hubs/organizers).
   - **Betweenness centrality** → who bridges otherwise-separate clusters
     (couriers, brokers — high-value disruption targets).
   - **Eigenvector centrality** → who is connected to other well-connected
     people (often leadership).
   - **PageRank** → a robust blended influence score.
   - **Louvain community detection** → surfaces sub-crews/cells inside a
     larger network automatically.
5. **Anomaly/pattern detection** — Rule-based detectors catch known
   signatures (burst calling, transaction structuring, a new player
   entering fully-linked into an existing cluster); an Isolation Forest
   model on centrality features catches outlier patterns the rules don't
   anticipate.
6. **Visualization & reporting** — An interactive, filterable link chart
   (open in any browser), a Gephi-compatible export for deeper manual
   analysis, a ranked key-player chart, and a structured JSON intelligence
   report that a case-management or BI dashboard can consume directly.

## 4. Taking this to production

| Component | Demo (this repo) | Production upgrade |
|---|---|---|
| NER | Regex + gazetteer | Fine-tuned transformer NER (spaCy/HuggingFace) trained on police-report language; multilingual support |
| Entity resolution | Exact/normalized match | Fuzzy matching, alias/nickname resolution, cross-source identity resolution (e.g. Splink, Zingg) |
| Graph storage | In-memory NetworkX | Neo4j / Amazon Neptune / TigerGraph for scale, live Cypher/Gremlin queries, role-based access control |
| Ingestion | File/manual connectors | Scheduled ETL (Airflow/Prefect), streaming ingestion (Kafka) for CDR/ANPR feeds |
| Anomaly detection | Rule-based + Isolation Forest | Temporal graph neural networks, sequence pattern mining, supervised models trained on closed-case outcomes |
| Access & audit | None | Role-based access control, full query audit logging, chain-of-custody tracking — essential for evidentiary use |
| UI | Static HTML export | Full investigator dashboard (search, case linking, alerting, report export to Word/PDF) |

## 5. Governance note

A system like this touches personal data and can materially affect people's
liberty, so production deployment should be paired with clear legal
authority for each data source, defined retention/purge rules, human review
before any automated "flag" drives an investigative or enforcement action,
and an audit trail of who queried what and why.
