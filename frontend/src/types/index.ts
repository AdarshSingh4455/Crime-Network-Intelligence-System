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
}

export interface NetworkLink {
  source: string;
  target: string;
  weight: number;
  records: string[];
  dates: string[];
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
}

export interface ConnectedEntity {
  entity: string;
  weight: number;
  records: string[];
  dates: string[];
}

export interface EntityDetail extends NetworkNode {
  connected_entities: ConnectedEntity[];
  associated_records: CaseRecord[];
  detected_anomalies: SuspiciousPattern[];
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
