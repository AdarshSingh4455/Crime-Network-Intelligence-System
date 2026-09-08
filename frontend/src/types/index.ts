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

export interface TimelineEvent {
  id: string;
  date: string;
  type: 'CASE_RECORD' | 'SUSPICIOUS_PATTERN';
  title: string;
  description: string;
  source: string;
  record_id: string;
  entities: string[];
}

export interface HealthStatus {
  status: string;
  system: string;
  phase: string;
  engine_cached: boolean;
}
