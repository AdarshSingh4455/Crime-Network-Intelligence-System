export type EntityType = 'PERSON' | 'ORG' | 'LOCATION' | 'VEHICLE' | 'PHONE' | 'MONEY' | 'UNKNOWN';

export interface OverviewMetrics {
  total_records: number;
  total_cases?: number;
  total_entities: number;
  total_relationships: number;
  suspicious_patterns_count: number;
  key_players_count: number;
  communities_count: number;
  bridge_nodes_count: number;
  sources_count: number;
  sources: string[];
  nodes_by_type: Record<string, number>;
  density: number;
  pattern_counts: Record<string, number>;
  top_key_players: Array<{
    entity: string;
    type: EntityType;
    influence_score: number;
    degree: number;
    betweenness: number;
  }>;
  recent_activity?: SuspiciousPattern[];
  status: string;
}

export interface NetworkNode {
  id: string;
  type: EntityType;
  degree: number;
  betweenness: number;
  eigenvector: number;
  pagerank: number;
  influence_score: number;
  community: number;
  is_key_player: boolean;
  is_bridge_node: boolean;
  bridge_betweenness: number;
  anomaly_count: number;
  evidence_id?: string;
  canonical_id?: string;
  canonical_name?: string;
  resolution_status?: string;
  observed_variants?: string[];
  observation_count?: number;
  review_reasons?: string[];
  associated_identifiers?: {
    phones: string[];
    vehicles: string[];
  };
}

export interface NetworkLink {
  source: string;
  target: string;
  weight: number;
  records: string[];
  dates: string[];
  evidence_id?: string;
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
  communities: string[][];
  summary: {
    num_nodes: number;
    num_edges: number;
    nodes_by_type: Record<string, number>;
    density: number;
  };
}

export interface SuspiciousPattern {
  id?: string;
  evidence_id?: string;
  entity?: string;
  entity_type?: EntityType;
  record_id?: string;
  date?: string;
  event_count?: number;
  pattern: string;
  pattern_label?: string;
  note: string;
  type?: EntityType;
}

export interface AnomalyDetail extends SuspiciousPattern {
  id: string;
  entity_details?: NetworkNode;
  connected_entities?: ConnectedEntity[];
  associated_records?: CaseRecord[];
  evidence_item?: EvidenceItem;
  evidence_trace?: EvidenceTrace;
}

export interface ConnectedEntity {
  entity: string;
  weight: number;
  records: string[];
  dates: string[];
}

export interface ResolutionCandidateEvaluation {
  pair: [string, string];
  obs_a: {
    observation_id: string;
    raw_text: string;
    record_id: string;
    normalized_value: string;
  };
  obs_b: {
    observation_id: string;
    raw_text: string;
    record_id: string;
    normalized_value: string;
  };
  decision: {
    decision: 'MATCH' | 'DISTINCT' | 'REVIEW_REQUIRED';
    confidence_label: string;
    reasons: string[];
    evidence: {
      signals: Record<string, number>;
      rationale: string[];
      compatibility_score: number;
      contradictions: string[];
    };
  };
}

export interface EntityResolutionInfo {
  canonical_id: string;
  canonical_name: string;
  entity_type: EntityType;
  review_status: 'RESOLVED' | 'REVIEW_REQUIRED';
  review_reasons: string[];
  observed_variants: string[];
  observation_count: number;
  source_records: string[];
  associated_identifiers: {
    phones: string[];
    vehicles: string[];
  };
  candidate_evaluations: ResolutionCandidateEvaluation[];
  governance_notice: string;
}

export interface EntityDetail extends NetworkNode {
  connected_entities: ConnectedEntity[];
  associated_records: CaseRecord[];
  detected_anomalies: SuspiciousPattern[];
  resolution?: EntityResolutionInfo | null;
  evidence_items?: EvidenceItem[];
}

export interface CaseRecord {
  record_id: string;
  source: string;
  date: string;
  text: string;
  extracted_entities: Array<{ text: string; label: EntityType }>;
}

export interface TimelineEntity {
  id: string;
  type: EntityType;
}

export interface TimelineAnomaly {
  id: string;
  pattern: string;
  entity?: string;
  note: string;
}

export interface TimelineEvent {
  event_id: string;
  record_id: string;
  date: string;
  time?: string | null;
  source: string;
  source_label: string;
  title: string;
  description: string;
  entities: TimelineEntity[];
  locations: string[];
  event_type: string;
  anomalies: TimelineAnomaly[];
  has_anomalies: boolean;
}

export interface HealthStatus {
  status: string;
  system: string;
  phase: string;
  engine_cached: boolean;
}

export interface LocationEntity {
  id: string;
  type: EntityType;
  weight: number;
  record_count: number;
  records: string[];
  dates: string[];
}

export interface LocationItem {
  id: string;
  name: string;
  location_name: string;
  type: EntityType;
  community: number;
  is_bridge_node: boolean;
  degree: number;
  betweenness: number;
  record_count: number;
  entity_count: number;
  anomaly_count: number;
  activity_score: number;
  entities: LocationEntity[];
  connected_entities: ConnectedEntity[];
  records: CaseRecord[];
  associated_records: CaseRecord[];
  anomalies: SuspiciousPattern[];
  detected_anomalies: SuspiciousPattern[];
}

export interface KeyFinding {
  finding_id: string;
  evidence_id?: string;
  category: 'NETWORK' | 'LOCATION' | 'ANOMALY' | 'ENTITY' | 'TEMPORAL';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  explanation: string;
  evidence: string[];
  related_entities: string[];
  related_anomalies: string[];
}

export interface PriorityEntity {
  id: string;
  type: EntityType;
  influence_score: number;
  degree: number;
  betweenness: number;
  pagerank: number;
  community: number;
  is_bridge_node: boolean;
  role: string;
}

export interface CommunityReport {
  community_id: number;
  size: number;
  members: string[];
  types_breakdown: Record<string, number>;
  key_players: string[];
  bridge_nodes: string[];
}

export interface InvestigativeLead {
  lead_id: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  rationale: string;
  supporting_records: string[];
  supporting_entities: string[];
  supporting_anomalies: string[];
  location?: string;
}

export interface IntelligenceReport {
  report_id: string;
  generated_at: string;
  status: string;
  executive_summary: string;
  investigation_metrics: {
    records: number;
    entities: number;
    relationships: number;
    anomalies: number;
    communities: number;
    bridge_nodes: number;
    key_players: number;
    locations: number;
    density: number;
    sources_count: number;
  };
  key_findings: KeyFinding[];
  network_assessment: {
    density: number;
    key_players: PriorityEntity[];
    bridge_nodes: Array<{ entity: string; betweenness: number }>;
    communities: CommunityReport[];
  };
  anomaly_assessment: {
    pattern_counts: Record<string, number>;
    total_signals: number;
    priority_signals: SuspiciousPattern[];
  };
  temporal_assessment: {
    date_range: string;
    total_events: number;
    events_with_anomalies: number;
    active_dates: string[];
  };
  location_assessment: {
    locations: Array<{
      name: string;
      record_count: number;
      entity_count: number;
      anomaly_count: number;
      activity_score: number;
      is_bridge_node: boolean;
    }>;
  };
  priority_entities: PriorityEntity[];
  priority_locations: LocationItem[];
  priority_anomalies: SuspiciousPattern[];
  investigative_leads: InvestigativeLead[];
  methodology: Record<string, string>;
  limitations: string[];
}

export interface SearchEntityResult {
  id: string;
  type: EntityType;
  degree: number;
  betweenness: number;
  influence_score: number;
  community: number;
  is_key_player: boolean;
  is_bridge_node: boolean;
  anomaly_count: number;
  source_module: string;
}

export interface SearchRecordResult {
  record_id: string;
  date: string;
  source: string;
  source_label: string;
  snippet: string;
  entity_count: number;
  has_anomalies: boolean;
  source_module: string;
}

export interface SearchAnomalyResult {
  id: string;
  pattern: string;
  pattern_label: string;
  entity?: string | null;
  entity_type?: EntityType | null;
  date?: string | null;
  record_id?: string | null;
  note: string;
  source_module: string;
}

export interface SearchLocationResult {
  id: string;
  name: string;
  activity_score: number;
  record_count: number;
  entity_count: number;
  anomaly_count: number;
  is_bridge_node: boolean;
  community: number;
  source_module: string;
}

export interface SearchCaseResult {
  case_id: string;
  title: string;
  short_title: string;
  source: string;
  source_label: string;
  date: string;
  workflow_status: string;
  priority: 'HIGH' | 'MEDIUM' | 'STANDARD';
  entity_count: number;
  anomaly_count: number;
  snippet: string;
  source_module: string;
}

export interface SearchResponse {
  query: string;
  total_results: number;
  cases?: SearchCaseResult[];
  entities: SearchEntityResult[];
  records: SearchRecordResult[];
  anomalies: SearchAnomalyResult[];
  locations: SearchLocationResult[];
}

export interface ProductionConnector {
  name: string;
  class_name: string;
  protocol: string;
  schema_standard: string;
  ingestion_frequency: string;
  security_level: string;
  readiness: string;
}

export interface PlannedConnector {
  id: string;
  name: string;
  category: string;
  connector_class: string;
  status: string;
  description: string;
  supported_format: string;
}

export interface SourceItem {
  id: string;
  name: string;
  short_name: string;
  category: string;
  connector_type: string;
  description: string;
  status: string;
  availability: string;
  record_count: number;
  entity_count: number;
  anomaly_count: number;
  location_count: number;
  date_range: { start: string; end: string };
  entity_types: Record<string, number>;
  sample_entities: string[];
  locations: string[];
  production_connector: ProductionConnector;
}

export interface SourceRecordItem {
  record_id: string;
  date: string;
  source: string;
  text: string;
  extracted_entities: Array<{ text: string; label: EntityType }>;
  anomaly_count: number;
}

export interface SourceEntityItem {
  id: string;
  type: EntityType;
  degree: number;
  betweenness: number;
  influence_score: number;
  community: number;
  is_key_player: boolean;
  is_bridge_node: boolean;
  anomaly_count: number;
}

export interface SourceDetail extends Omit<SourceItem, 'locations'> {
  records: SourceRecordItem[];
  entities: SourceEntityItem[];
  anomalies: SuspiciousPattern[];
  locations: LocationItem[];
  ingestion_spec: {
    connector_class: string;
    pipeline_source: string;
    base_interface: string;
    target_schema: string[];
    normalization: string;
  };
}

export interface IngestionPipelineInfo {
  engine_version: string;
  connector_class: string;
  entity_extraction_backend: string;
  graph_builder: string;
  dataset_path: string;
  status: string;
}

export interface SourcesResponse {
  total_sources: number;
  total_records_ingested: number;
  total_entities_extracted: number;
  total_relationships_built: number;
  total_anomalies_detected: number;
  last_ingested_at: string;
  ingestion_pipeline: IngestionPipelineInfo;
  sources: SourceItem[];
  planned_connectors: PlannedConnector[];
}

export interface IngestResponse {
  status: string;
  message: string;
  reloaded_at: string;
  records_ingested: number;
  entities_extracted: number;
  relationships_built: number;
  anomalies_detected: number;
  sources_active: number;
}

export type CaseWorkflowStatus =
  | 'Review Required'
  | 'In Review'
  | 'Follow-up Required'
  | 'Review Completed';

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  completed_at?: string | null;
}

export type FollowUpCategory =
  | 'Source Cross-Check'
  | 'Entity Review'
  | 'Timeline Review'
  | 'Location Review'
  | 'Network Review'
  | 'Anomaly Review'
  | 'Additional Record Review';

export type FollowUpStatus = 'Pending' | 'In Progress' | 'Completed';

export interface FollowUpItem {
  id: string;
  case_id: string;
  title: string;
  category: FollowUpCategory;
  status: FollowUpStatus;
  related_target?: string | null;
  created_at: string;
  completed_at?: string | null;
  notes?: string;
}

export interface ActivityEvent {
  id: string;
  case_id: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface RelatedCaseItem {
  case_id: string;
  title: string;
  short_title: string;
  relationship_bases: string[];
  shared_entities: string[];
  shared_locations: string[];
  shared_anomalies: Array<{ id: string; pattern: string; pattern_label: string }>;
  summary: string;
  priority: 'HIGH' | 'MEDIUM' | 'STANDARD';
  workflow_status: CaseWorkflowStatus;
  relevance_score?: number;
}

export interface CaseWorkflowState {
  case_id: string;
  workflow_status: CaseWorkflowStatus;
  checklist: ChecklistItem[];
  followups: FollowUpItem[];
  activity_history: ActivityEvent[];
  checklist_reviewed_count: number;
  checklist_total_count: number;
  pending_followups_count: number;
}

export interface CaseItem {
  case_id: string;
  title: string;
  short_title: string;
  source: string;
  source_label: string;
  date: string;
  time?: string | null;
  date_range: { start: string; end: string };
  summary: string;
  full_text: string;
  workflow_status: CaseWorkflowStatus;
  source_status: string;
  priority: 'HIGH' | 'MEDIUM' | 'STANDARD';
  record_count: number;
  entity_count: number;
  anomaly_count: number;
  location_count: number;
  key_player_count: number;
  entities: string[];
  locations: string[];
  key_players: string[];
  has_anomalies: boolean;
}

export interface CaseRecordReference {
  record_id: string;
  source: string;
  source_label: string;
  date: string;
  text: string;
  extracted_entities: Array<{ text: string; label: EntityType }>;
  relationship_note?: string;
  common_entities?: string[];
  location_references?: string[];
  anomaly_count?: number;
}

export interface CaseIntelligenceReference {
  ref_type: string;
  identifier: string;
  source_system: string;
  source_label: string;
  date: string;
  details: string;
  target_module?: string;
  navigation_param?: string;
  analytical_method?: string;
}

export interface CaseDetail {
  case_id: string;
  title: string;
  short_title: string;
  source: string;
  source_label: string;
  date: string;
  time?: string | null;
  workflow_status: CaseWorkflowStatus;
  source_status: string;
  priority: 'HIGH' | 'MEDIUM' | 'STANDARD';
  description: string;
  metrics: {
    records: number;
    entities: number;
    anomalies: number;
    locations: number;
    key_players: number;
    internal_connections: number;
    related_cases_count?: number;
  };
  primary_record: CaseRecordReference;
  related_records: CaseRecordReference[];
  related_cases: RelatedCaseItem[];
  entities: NetworkNode[];
  anomalies: SuspiciousPattern[];
  locations: LocationItem[];
  timeline_events: TimelineEvent[];
  network_context: {
    case_entities: string[];
    links: NetworkLink[];
    key_players: string[];
    bridge_nodes: string[];
    communities: number[];
  };
  intelligence_references: CaseIntelligenceReference[];
  workflow: CaseWorkflowState;
  activity_history: ActivityEvent[];
  disclaimer: string;
  workflow_notice: string;
}

export interface CasesResponse {
  total_cases: number;
  total_records: number;
  total_entities: number;
  total_anomalies: number;
  review_required_count: number;
  in_review_count: number;
  followup_required_count: number;
  review_completed_count: number;
  date_coverage: { start: string; end: string };
  cases: CaseItem[];
}

// ==========================================
// PHASE 3D: SYSTEM CONFIGURATION & HEALTH
// ==========================================

export interface SystemPlatformInfo {
  system_name: string;
  version: string;
  runtime_environment: string;
  python_version: string;
  fastapi_version: string;
  uvicorn_version: string;
  networkx_version: string;
  scikit_learn_version: string;
  numpy_version: string;
  pydantic_version: string;
  dataset_reference: string;
  dataset_type: string;
}

export interface PipelineStageInfo {
  stage_number: number;
  name: string;
  module: string;
  class_name: string;
  execution_order: number;
  input_type: string;
  output_type: string;
  status: string;
  description: string;
}

export interface EntityExtractionConfig {
  active_backend: string;
  backend_interface: string;
  planned_backend: string;
  gazetteers: {
    persons: string[];
    organizations: string[];
    locations: string[];
  };
  regex_rules: {
    phone_regex: string;
    vehicle_plate_regex: string;
    money_regex: string;
  };
  normalization_rules: Array<{
    entity_type: string;
    rule: string;
  }>;
}

export interface NetworkAnalysisConfig {
  graph_engine: string;
  graph_type: string;
  edge_weight_rule: string;
  centrality_metrics: Array<{
    name: string;
    role: string;
    weight_in_key_player: number;
  }>;
  key_player_formula: {
    expression: string;
    entity_types: string[];
    top_n: number;
    weights: {
      degree: number;
      betweenness: number;
      eigenvector: number;
      pagerank: number;
    };
  };
  community_detection: {
    algorithm: string;
    function: string;
    seed: number;
    weight_attribute: string;
    resolution: number;
    description: string;
  };
  critical_bridge_nodes: {
    function: string;
    top_n: number;
    weight_attribute: string;
    description: string;
  };
  path_analysis: {
    algorithm: string;
    weight: string;
    description: string;
  };
}

export interface AnomalyDetectorConfig {
  id: string;
  name: string;
  function: string;
  pattern: string;
  parameters: Record<string, any>;
  threshold_summary: string;
  significance: string;
}

export interface AnomalyDetectionConfig {
  detectors: AnomalyDetectorConfig[];
}

export interface PrototypeConnectorInfo {
  name: string;
  status: string;
  description: string;
}

export interface DataSourcesConfig {
  active_connector: string;
  active_sources_count: number;
  prototype_connectors: PrototypeConnectorInfo[];
  sources_center_url: string;
}

export interface StorageConfig {
  workflow_store: string;
  intelligence_cache: string;
  persistent_database: string;
  enterprise_persistence: string;
  local_storage: string;
  persistence_note: string;
}

export interface ProductionReadinessItem {
  category: string;
  prototype_state: string;
  production_requirement: string;
  gap_level: 'High' | 'Medium' | 'Low';
  status: string;
}

export interface SystemConfigResponse {
  platform: SystemPlatformInfo;
  pipeline_stages: PipelineStageInfo[];
  entity_extraction: EntityExtractionConfig;
  network_analysis: NetworkAnalysisConfig;
  anomaly_detection: AnomalyDetectionConfig;
  data_sources: DataSourcesConfig;
  storage: StorageConfig;
  production_readiness: ProductionReadinessItem[];
  disclaimers: {
    analytical: string;
    configuration: string;
  };
}

export interface SystemHealthResponse {
  status: 'healthy' | 'degraded';
  uptime_seconds: number;
  timestamp: string;
  backend_api: {
    status: string;
    version: string;
    framework: string;
    server: string;
  };
  intelligence_engine: {
    status: string;
    last_ingestion_time: string;
    record_count: number;
    entity_count: number;
    relationship_count: number;
    anomaly_count: number;
    case_count: number;
    key_players_count: number;
    communities_count: number;
  };
  dataset: {
    logical_reference: string;
    exists: boolean;
    file_size_bytes: number;
    last_modified: string | null;
    record_count: number;
  };
  workflow_store: {
    status: string;
    active_cases: number;
    total_checklist_items: number;
    completed_checklist_items: number;
    total_followups: number;
    pending_followups: number;
    session_activity_count: number;
  };
  sources_registry: {
    configured_sources_count: number;
    active_sources_count: number;
  };
}

export interface ResetSessionResponse {
  success: boolean;
  message: string;
  reset_timestamp: string;
  cases_reset_count: number;
}

export interface InvestigationTarget {
  type: 'case' | 'entity' | 'location' | 'anomaly';
  id: string;
  label: string;
  category: string;
}

export interface InvestigationSummary {
  target_label: string;
  target_type: string;
  record_count: number;
  entity_count: number;
  signal_count: number;
  related_case_count: number;
  summary_text: string;
}

export interface InvestigationRelationship {
  source: string;
  target: string;
  weight: number;
  records: string[];
  dates: string[];
  basis: string;
}

export interface InvestigationTraceStep {
  step: number;
  label: string;
  category: string;
  module_url: string;
}

export interface InvestigationAssessment {
  observed: string[];
  derived: string[];
  signals: string[];
  review_required: string[];
}

export interface CrossCaseMatrixAttribute {
  name: string;
  category: string;
  cases_present: Record<string, boolean>;
}

export interface CrossCaseMatrix {
  cases: string[];
  attributes: CrossCaseMatrixAttribute[];
}

export interface InvestigationResponse {
  target: InvestigationTarget;
  summary: InvestigationSummary;
  target_data: any;
  entities: any[];
  relationships: InvestigationRelationship[];
  anomalies: any[];
  timeline: any[];
  locations: any[];
  related_cases: any[];
  cross_case_matrix: CrossCaseMatrix;
  evidence_trace: InvestigationTraceStep[];
  assessment: InvestigationAssessment;
  disclaimer: string;
}

export interface InvestigationPathEdge {
  source: string;
  target: string;
  weight: number;
  records: string[];
  dates: string[];
  basis: string;
}

export interface InvestigationPathResponse {
  start: string;
  end: string;
  found: boolean;
  path: string[];
  length: number;
  edges: InvestigationPathEdge[];
  message: string;
}

// ─── Phase 3F: Data Quality & Robustness Testing ─────────────────────────────

export type RobustnessTestStatus = 'PASS' | 'FAIL' | 'KNOWN_WEAKNESS' | 'WARNING' | 'ERROR';
export type RobustnessCategory =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J'
  | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T';

export interface FixtureRecord {
  record_id: string;
  date: string;
  source: string;
  text: string;
}

export interface RobustnessFixture {
  fixture_id: string;
  category: string;
  robustness_category: RobustnessCategory;
  input_condition: string;
  source_records: FixtureRecord[];
  expected_behavior: string;
  expected_outcome: string;
  rationale: string;
  known_weakness: boolean;
  weakness_description: string | null;
}

export interface FixtureCategoryGroup {
  category_label: string;
  robustness_category: RobustnessCategory;
  fixture_count: number;
  fixtures: RobustnessFixture[];
  has_known_weakness: boolean;
}

export interface FixtureCatalogue {
  total_fixtures: number;
  categories_covered: number;
  category_ids_covered: RobustnessCategory[];
  categories: FixtureCategoryGroup[];
  generated_at: string;
}

export interface RobustnessTestDetail {
  fixture_id?: string;
  entities_found?: number;
  edges_found?: number;
  regex_match?: boolean;
  matches?: string[];
  no_match_variants?: string[];
  pipeline_result?: Record<string, unknown>;
  error?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface RobustnessTestResult {
  test_id: string;
  test_name: string;
  category: string;
  status: RobustnessTestStatus;
  description: string;
  observed_behavior: string;
  expected_behavior: string;
  weakness_documented: boolean;
  weakness_description?: string | null;
  detail: RobustnessTestDetail;
}

export interface DataQualityResults {
  total_tests: number;
  passed: number;
  failed: number;
  known_weaknesses: number;
  warnings: number;
  errors: number;
  overall_status: 'HEALTHY' | 'WEAKNESSES_DOCUMENTED' | 'NEEDS_ATTENTION';
  baseline_intact: boolean;
  baseline_summary: {
    records: number;
    entities: number;
    relationships: number;
    anomalies: number;
    cases: number;
  };
  test_results: RobustnessTestResult[];
  completed_at: string;
  disclaimer: string;
}

// ─── Phase 3H: Evidence & Provenance Engine Types ─────────────────────────────

export type EvidenceClassification =
  | 'SOURCE_RECORD'
  | 'ENTITY_OBSERVATION'
  | 'RELATIONSHIP'
  | 'ANOMALY_SIGNAL'
  | 'NETWORK_METRIC'
  | 'TEMPORAL_OBSERVATION'
  | 'LOCATION_OBSERVATION'
  | 'ENTITY_RESOLUTION';

export type EpistemicStatus =
  | 'OBSERVED'
  | 'DERIVED'
  | 'SIGNAL'
  | 'REVIEW_REQUIRED';

export interface RawExcerpt {
  record_id: string;
  source: string;
  date: string;
  verbatim_text: string;
}

export interface EvidenceReference {
  target_id: string;
  target_type: string;
  description: string;
}

export interface EvidenceItem {
  evidence_id: string;
  evidence_type: EvidenceClassification;
  epistemic_status: EpistemicStatus;
  finding: string;
  source_records: string[];
  raw_excerpts: RawExcerpt[];
  entities: string[];
  temporal_context?: string | null;
  spatial_context?: string | null;
  analytical_method: string;
  rationale: string;
  limitations: string;
  references?: EvidenceReference[];
  metadata?: Record<string, unknown>;
}

export interface TraceStep {
  stage: string;
  epistemic_status?: EpistemicStatus;
  record_id?: string;
  source?: string;
  date?: string;
  description?: string;
  verbatim_excerpt?: string;
  entities_observed?: string[];
  analytical_method?: string;
  rationale?: string;
  limitations?: string;
  [key: string]: unknown;
}

export interface EvidenceTrace {
  target_id: string;
  target_type: string;
  evidence_id: string;
  steps: TraceStep[];
}

export interface EvidenceOverviewResponse {
  summary: {
    total_evidence_items: number;
    indexed_entities: number;
    indexed_records: number;
    indexed_relationships: number;
    indexed_anomalies: number;
    counts_by_classification: Record<string, number>;
    counts_by_epistemic_status: Record<string, number>;
    epistemic_guardrails_enforced: boolean;
  };
  total_items: number;
  items: EvidenceItem[];
  governance_notice: string;
}

export interface SingleEvidenceResponse {
  item: EvidenceItem;
  trace?: EvidenceTrace | null;
}

export interface RelationshipEvidenceResponse {
  item: EvidenceItem;
  trace?: EvidenceTrace | null;
  source: string;
  target: string;
}

// ─── Phase 3I: Explainable Intelligence Types ─────────────────────────────────

export type ExplainabilityType =
  | 'NETWORK_IMPORTANCE'
  | 'RELATIONSHIP'
  | 'ANOMALY'
  | 'ENTITY_RESOLUTION'
  | 'TEMPORAL_PATTERN'
  | 'LOCATION_PATTERN'
  | 'COMMUNITY'
  | 'BRIDGE_NODE'
  | 'PATH_ANALYSIS'
  | 'REPORT_FINDING';

export type ExplanationStatus = 'COMPLETE' | 'SIGNAL' | 'REVIEW_REQUIRED';

export interface ExplanationStep {
  step_number: number;
  stage: string;
  description: string;
  inputs?: Record<string, unknown>;
  method_or_rule?: string;
  intermediate_result?: unknown;
  evidence_ids?: string[];
  source_records?: string[];
}

export interface IntelligenceExplanation {
  explanation_id: string;
  explanation_type: ExplainabilityType;
  status: ExplanationStatus;
  target_id: string;
  target_label: string;
  finding: string;
  observation: string;
  analytical_inputs: Record<string, unknown>;
  analytical_method: string;
  calculation_summary: string;
  derivation_steps: ExplanationStep[];
  supporting_evidence_ids: string[];
  supporting_source_records: string[];
  interpretation: string;
  limitations: string;
  related_entities: string[];
  metadata?: Record<string, unknown>;
}

export interface ExplainabilityOverviewResponse {
  summary: {
    total_explanations: number;
    by_type: Record<string, number>;
    indexed_entities: number;
    indexed_anomalies: number;
    indexed_relationships: number;
    epistemic_disclaimer: string;
  };
  total_explanations: number;
  explanations: IntelligenceExplanation[];
  governance_notice: string;
}

export interface EntityExplanationsResponse {
  entity: string;
  total: number;
  explanations: IntelligenceExplanation[];
}

// ─── Phase 3J: Temporal Intelligence Types ────────────────────────────────────

export type TemporalPrecision = 'DATE_TIME' | 'DATE_ONLY' | 'UNKNOWN';

export type TemporalPatternType =
  | 'BURST_ACTIVITY'
  | 'RECURRING_ACTIVITY'
  | 'LATE_TIMELINE_APPEARANCE'
  | 'SAME_DATE_LOCATION_OVERLAP'
  | 'TEMPORAL_GAP';

export interface TemporalObservation {
  observation_id: string;
  record_id: string;
  case_id: string;
  date: string;
  time?: string | null;
  iso_timestamp: string;
  precision: TemporalPrecision;
  timezone: string;
  source: string;
  source_label: string;
  entities: string[];
  locations: string[];
  observation_type: string;
  description: string;
  evidence_id: string;
  metadata: Record<string, unknown>;
  epistemic_limitation: string;
}

export interface TemporalGap {
  prior_date: string;
  next_date: string;
  gap_days: number;
  prior_record_id: string;
  next_record_id: string;
  epistemic_note: string;
}

export interface TemporalEntityActivity {
  entity_id: string;
  entity_type: string;
  first_observed: string;
  last_observed: string;
  span_days: number;
  observation_count: number;
  active_dates: string[];
  observation_ids: string[];
  gaps: TemporalGap[];
  max_gap_days: number;
  related_cases: string[];
  locations_over_time: Array<{
    date: string;
    time?: string | null;
    location: string;
    record_id: string;
  }>;
  relationships_over_time: Array<{
    date: string;
    target_entity: string;
    relationship_id: string;
    first_observed: string;
    observation_count: number;
  }>;
  anomalies_over_time: Array<{
    anomaly_id: string;
    pattern: string;
    date: string;
    record_id?: string;
    note: string;
  }>;
  epistemic_limitation: string;
}

export interface TemporalRelationshipEvolution {
  relationship_id: string;
  source: string;
  target: string;
  canonical_pair: [string, string];
  first_observed: string;
  last_observed: string;
  span_days: number;
  observation_count: number;
  observation_dates: string[];
  supporting_records: string[];
  supporting_evidence_ids: string[];
  explanation_id?: string | null;
  epistemic_limitation: string;
}

export interface NetworkEvolutionSnapshot {
  window_index: number;
  window_id: string;
  window_label: string;
  start_date: string;
  end_date: string;
  observation_count: number;
  active_nodes: string[];
  active_edges: string[][];
  added_nodes: string[];
  departed_nodes: string[];
  new_edges: string[][];
  no_longer_observed_edges: string[][];
  epistemic_limitation: string;
}

export interface TemporalPattern {
  pattern_id: string;
  pattern_type: TemporalPatternType;
  pattern_label: string;
  target_entities: string[];
  target_records: string[];
  date_range: [string, string];
  observation_ids: string[];
  metric_value: string;
  description: string;
  supporting_evidence_ids: string[];
  explanation_id?: string | null;
  epistemic_limitation: string;
}

export interface TemporalOverviewResponse {
  summary_kpis: {
    total_observations: number;
    date_span_days: number;
    earliest_date: string;
    latest_date: string;
    total_entities_tracked: number;
    total_relationships_tracked: number;
    total_time_windows: number;
    total_patterns_detected: number;
    patterns_by_type: Record<string, number>;
    timed_observations_count: number;
    date_only_observations_count: number;
    activity_density_days: number;
  };
  activity_density: {
    day: Record<string, number>;
    week: Record<string, number>;
    month: Record<string, number>;
  };
  recent_observations: TemporalObservation[];
  network_snapshots_count: number;
  patterns_summary: TemporalPattern[];
  epistemic_limitation: string;
}

export interface TemporalActivityResponse {
  granularity: string;
  total_buckets: number;
  buckets: Record<string, number>;
  total_dated_observations: number;
  epistemic_limitation: string;
}

export interface TemporalEvolutionResponse {
  total_snapshots: number;
  snapshots: NetworkEvolutionSnapshot[];
  epistemic_limitation: string;
}

export interface TemporalPatternsResponse {
  total_patterns: number;
  filter: string;
  patterns: TemporalPattern[];
  epistemic_limitation: string;
}

export interface TemporalEntityResponse {
  activity_profile: TemporalEntityActivity;
  observations: TemporalObservation[];
  total_observations: number;
  epistemic_limitation: string;
}

export interface TemporalCaseResponse {
  case_id: string;
  total_observations: number;
  earliest_observation?: string | null;
  latest_observation?: string | null;
  observations: TemporalObservation[];
  epistemic_limitation: string;
}

// ============================================================================
// Phase 3K: Advanced Graph Intelligence Interfaces
// ============================================================================

export interface GraphOverview {
  node_count: number;
  edge_count: number;
  connected_components: number;
  is_connected: boolean;
  graph_density: number;
  average_degree: number;
  max_degree: number;
  max_degree_nodes: string[];
  isolated_nodes: string[];
  graph_diameter?: number | null;
  average_shortest_path_length?: number | null;
  nodes_by_type: Record<string, number>;
  epistemic_limitation: string;
  total_nodes?: number;
  total_edges?: number;
  density?: number;
  diameter?: number;
  transitivity?: number;
  top_by_degree?: Array<{ node: string; degree: number }>;
  top_by_betweenness?: Array<{ node: string; betweenness: number }>;
  top_by_closeness?: Array<{ node: string; closeness: number }>;
  top_by_pagerank?: Array<{ node: string; pagerank: number }>;
}

export interface HopDetail {
  step: number;
  from_node: string;
  to_node: string;
  weight: number;
  records: string[];
  dates: string[];
  evidence_ids: string[];
  step_index?: number;
  source_node?: string;
  target_node?: string;
  relationship_type?: string;
  record_ids?: string[];
  explanation_id?: string | null;
}

export interface GraphNeighborhood {
  entity_id: string;
  entity_type: string;
  direct_neighbors: string[];
  one_hop_degree: number;
  two_hop_neighborhood: string[];
  two_hop_count: number;
  total_neighborhood_size: number;
  neighbor_types_breakdown: Record<string, number>;
  incident_relationships: Array<{
    target: string;
    type: string;
    weight: number;
    records: string[];
    evidence_ids: string[];
  }>;
  supporting_evidence_ids: string[];
  explanation_id?: string | null;
  epistemic_limitation: string;
  center_node?: string;
  center_node_type?: string;
  one_hop_count?: number;
  one_hop_neighbors?: any[];
  two_hop_neighbors?: any[];
  all_boundary_evidence_ids?: string[];
  all_boundary_record_ids?: string[];
}

export interface GraphPath {
  source: string;
  target: string;
  path_exists: boolean;
  path: string[];
  hop_count: number;
  hops: HopDetail[];
  alternative_paths: string[][];
  epistemic_limitation: string;
  path_nodes?: string[];
  total_weight?: number;
  all_evidence_ids?: string[];
  all_record_ids?: string[];
  explanation_ids?: string[];
}

export interface BetweennessBridgeItem {
  entity: string;
  betweenness: number;
  is_bridge: boolean;
  is_articulation_point: boolean;
  explanation: string;
  node?: string;
  betweenness_score?: number;
  cut_component_count?: number;
  structural_role?: string;
  connected_communities?: number[];
}

export interface BridgeAnalysis {
  betweenness_bridges: BetweennessBridgeItem[];
  articulation_points: string[];
  biconnected_components_count: number;
  biconnected_component_sizes: number[];
  distinction_explanation: string;
  epistemic_limitation: string;
  total_bridges_betweenness?: number;
  total_articulation_points?: number;
  evidence_ids_by_bridge?: Record<string, string[]>;
}

export interface CommunityStructuralDetail {
  community_id: number;
  size: number;
  members: string[];
  member_types: Record<string, number>;
  internal_edge_count: number;
  internal_density: number;
  external_edge_count: number;
  external_connections_by_community: Record<string, number>;
  bridge_entities: string[];
  member_count?: number;
  density?: number;
  top_internal_nodes?: string[];
  boundary_nodes?: string[];
  boundary_targets_by_community?: Record<string, number>;
}

export interface CommunityAnalysis {
  total_communities: number;
  communities: CommunityStructuralDetail[];
  inter_community_edges: any[];
  epistemic_limitation: string;
  inter_community_edges_total?: number;
}

export interface CentralityComparisonRow {
  entity: string;
  entity_type: string;
  degree: number;
  betweenness: number;
  eigenvector: number;
  pagerank: number;
  composite_influence: number;
  degree_rank: number;
  betweenness_rank: number;
  eigenvector_rank: number;
  pagerank_rank: number;
  composite_rank: number;
  node?: string;
  node_type?: string;
  closeness?: number;
  closeness_rank?: number;
  max_rank_divergence?: number;
  structural_role_note?: string;
}

export interface GraphCentralityComparison {
  formula: string;
  rows: CentralityComparisonRow[];
  epistemic_limitation: string;
  total_entities?: number;
  rankings?: CentralityComparisonRow[];
  high_divergence_nodes?: string[];
}

export interface StructuralMotif {
  motif_id: string;
  motif_type: string;
  title: string;
  description: string;
  entities: string[];
  subgraph_edges: string[][];
  metric_basis: string;
  evidence_ids: string[];
  epistemic_limitation: string;
  motif_name?: string;
  nodes?: string[];
  edges?: string[][];
}

export interface MotifAnalysis {
  total_motifs: number;
  triangles_count: number;
  star_hubs_count: number;
  chains_count: number;
  motifs: StructuralMotif[];
  epistemic_limitation: string;
}

export interface GraphComparison {
  entity_a: string;
  entity_b: string;
  type_a: string;
  type_b: string;
  degree_a: number;
  degree_b: number;
  betweenness_a: number;
  betweenness_b: number;
  eigenvector_a: number;
  eigenvector_b: number;
  pagerank_a: number;
  pagerank_b: number;
  composite_influence_a: number;
  composite_influence_b: number;
  community_a: number;
  community_b: number;
  shared_neighbors: string[];
  shared_neighbors_count: number;
  shortest_path_distance?: number | null;
  is_directly_connected: boolean;
  connection_weight?: number | null;
  epistemic_limitation: string;
  common_neighbors?: string[];
  common_neighbor_count?: number;
  jaccard_similarity?: number;
  shortest_path_nodes?: string[];
  centrality_comparison?: Record<string, any>;
  structural_summary?: string;
  evidence_ids?: string[];
}

// ─── Phase 4: FIR Module Types ──────────────────────────────────────────────

export interface FIRAdministrativeInfo {
  fir_number: string;
  police_station: string;
  district: string;
  state?: string;
  registration_date?: string;
  occurrence_date_from?: string;
  occurrence_date_to?: string;
  general_diary_ref?: string;
  investigating_officer?: string;
  officer_rank?: string;
  officer_id?: string;
}

export interface FIRComplainant {
  name: string;
  contact_number?: string;
  address?: string;
  relationship_to_victim?: string;
  complainant_role?: string;
}

export interface FIRAccusedPerson {
  accused_id: string;
  name: string;
  alias?: string;
  status: string;
  identifiers?: Record<string, string>;
  alleged_role?: string;
  epistemic_notice?: string;
}

export interface FIRIncidentInfo {
  incident_location: string;
  jurisdiction: string;
  incident_date: string;
  incident_category: string;
  summary: string;
}

export interface FIRVictim {
  victim_id: string;
  name: string;
  contact?: string;
  injuries_or_loss?: string;
}

export interface FIRWitness {
  witness_id: string;
  name: string;
  contact?: string;
  statement_summary?: string;
}

export interface FIRPropertyEvidence {
  property_id: string;
  item_type: string;
  description: string;
  seizure_memo_ref?: string;
  linked_evidence_id?: string | null;
}

export interface FIRLegalProvision {
  provision_id: string;
  bns_section: string;
  ipc_legacy_section: string;
  offense_name: string;
  review_status: string;
  officer_notes?: string;
  epistemic_notice?: string;
}

export interface FIRIntelligenceLinks {
  case_id?: string | null;
  linked_entity_ids?: string[];
  linked_evidence_ids?: string[];
  linked_record_ids?: string[];
  provenance_note?: string;
}

export interface FIRAuditEntry {
  timestamp: string;
  action: string;
  user: string;
  summary: string;
}

export interface FIRRecord {
  fir_id: string;
  fir_number: string;
  status: string;
  created_at: string;
  updated_at: string;
  administrative: FIRAdministrativeInfo;
  complainant: FIRComplainant;
  accused: FIRAccusedPerson[];
  incident: FIRIncidentInfo;
  victims: FIRVictim[];
  witnesses: FIRWitness[];
  property_evidence: FIRPropertyEvidence[];
  narrative: string;
  legal_provisions: FIRLegalProvision[];
  intelligence_links: FIRIntelligenceLinks;
  audit_trail: FIRAuditEntry[];
  epistemic_guardrail?: string;
}

export interface FIRListResponse {
  total: number;
  limit: number;
  offset: number;
  firs: FIRRecord[];
}

export interface FIRSearchResponse {
  total: number;
  limit: number;
  offset: number;
  search_mode: string;
  firs: FIRRecord[];
}

export interface FIRKPIsResponse {
  total_firs: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  linked_case_count: number;
  total_accused_count: number;
  pending_review_provisions: number;
}

export interface FIRLegalCatalogItem {
  bns_section: string;
  ipc_legacy_section: string;
  offense_name: string;
  category: string;
  bailable: string;
  cognizable: string;
  punishment?: string;
  description: string;
  keywords?: string[];
}

export interface FIRLegalCatalogResponse {
  primary_framework: string;
  legacy_framework: string;
  statutory_effective_date: string;
  total_provisions: number;
  provisions: FIRLegalCatalogItem[];
  epistemic_notice: string;
}

export interface BNSSuggestionItem {
  bns_section: string;
  ipc_legacy_section: string;
  offense_name: string;
  category: string;
  bailable: string;
  cognizable: string;
  punishment: string;
  description: string;
  confidence: number;
  confidence_percentage: string;
  confidence_level: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
  match_reason: string;
  matched_keywords: string[];
  review_status: string;
  officer_review_notice: string;
}

export interface BNSSuggestionResponse {
  status: string;
  category: string;
  total_suggestions: number;
  suggestions: BNSSuggestionItem[];
  epistemic_notice: string;
}


