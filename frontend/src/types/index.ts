export type EntityType = 'PERSON' | 'ORG' | 'LOCATION' | 'VEHICLE' | 'PHONE' | 'MONEY' | 'UNKNOWN';

export interface OverviewMetrics {
  total_records: number;
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

export interface SearchResponse {
  query: string;
  total_results: number;
  entities: SearchEntityResult[];
  records: SearchRecordResult[];
  anomalies: SearchAnomalyResult[];
  locations: SearchLocationResult[];
}

