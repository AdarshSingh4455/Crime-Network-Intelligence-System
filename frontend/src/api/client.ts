import axios from 'axios';
import {
  HealthStatus,
  OverviewMetrics,
  NetworkData,
  NetworkNode,
  SuspiciousPattern,
  AnomalyDetail,
  TimelineEvent,
  EntityDetail,
  LocationItem,
  IntelligenceReport,
  SearchResponse,
  SourcesResponse,
  SourceDetail,
  IngestResponse,
  CasesResponse,
  CaseDetail,
  CaseWorkflowState,
  CaseWorkflowStatus,
  FollowUpItem,
  FollowUpCategory,
  FollowUpStatus,
  SystemConfigResponse,
  SystemHealthResponse,
  ResetSessionResponse,
  InvestigationResponse,
  InvestigationPathResponse,
  FixtureCatalogue,
  DataQualityResults,
  EvidenceOverviewResponse,
  SingleEvidenceResponse,
  RelationshipEvidenceResponse,
  ExplainabilityOverviewResponse,
  IntelligenceExplanation,
  EntityExplanationsResponse,
  TemporalOverviewResponse,
  TemporalActivityResponse,
  TemporalEvolutionResponse,
  TemporalPatternsResponse,
  TemporalEntityResponse,
  TemporalCaseResponse,
  TemporalRelationshipEvolution,
  TemporalObservation,
  GraphOverview,
  GraphNeighborhood,
  GraphPath,
  BridgeAnalysis,
  CommunityAnalysis,
  GraphCentralityComparison,
  MotifAnalysis,
  GraphComparison,
  FIRRecord,
  FIRListResponse,
  FIRSearchResponse,
  FIRKPIsResponse,
  FIRLegalCatalogResponse,
} from '../types';

const API_BASE = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  checkHealth: async (): Promise<HealthStatus> => {
    const res = await apiClient.get<HealthStatus>('/health');
    return res.data;
  },

  getOverview: async (): Promise<OverviewMetrics> => {
    const res = await apiClient.get<OverviewMetrics>('/overview');
    return res.data;
  },

  getNetwork: async (): Promise<NetworkData> => {
    const res = await apiClient.get<NetworkData>('/network');
    return res.data;
  },

  getEntities: async (): Promise<NetworkNode[]> => {
    const res = await apiClient.get<NetworkNode[]>('/entities');
    return res.data;
  },

  getEntityDetail: async (entityId: string): Promise<EntityDetail> => {
    const res = await apiClient.get<EntityDetail>(`/entities/${encodeURIComponent(entityId)}`);
    return res.data;
  },

  getEntityResolutionOverview: async (): Promise<any> => {
    const res = await apiClient.get('/entity-resolution');
    return res.data;
  },

  getEntityResolutionDetail: async (entityId: string): Promise<any> => {
    const res = await apiClient.get(`/entity-resolution/${encodeURIComponent(entityId)}`);
    return res.data;
  },

  getAnomalies: async (): Promise<SuspiciousPattern[]> => {
    const res = await apiClient.get<SuspiciousPattern[]>('/anomalies');
    return res.data;
  },

  getAnomalyDetail: async (anomalyId: string): Promise<AnomalyDetail> => {
    const res = await apiClient.get<AnomalyDetail>(`/anomalies/${encodeURIComponent(anomalyId)}`);
    return res.data;
  },

  getTimeline: async (): Promise<TimelineEvent[]> => {
    const res = await apiClient.get<TimelineEvent[]>('/timeline');
    return res.data;
  },

  getLocations: async (): Promise<LocationItem[]> => {
    const res = await apiClient.get<LocationItem[]>('/locations');
    return res.data;
  },

  getLocationDetail: async (locationId: string): Promise<LocationItem> => {
    const res = await apiClient.get<LocationItem>(`/locations/${encodeURIComponent(locationId)}`);
    return res.data;
  },

  getReports: async (): Promise<IntelligenceReport> => {
    const res = await apiClient.get<IntelligenceReport>('/reports');
    return res.data;
  },

  getSearchResults: async (query: string): Promise<SearchResponse> => {
    const res = await apiClient.get<SearchResponse>(`/search?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  search: async (query: string): Promise<SearchResponse> => {
    const res = await apiClient.get<SearchResponse>(`/search?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  getSources: async (): Promise<SourcesResponse> => {
    const res = await apiClient.get<SourcesResponse>('/sources');
    return res.data;
  },

  getSourceDetail: async (sourceId: string): Promise<SourceDetail> => {
    const res = await apiClient.get<SourceDetail>(`/sources/${encodeURIComponent(sourceId)}`);
    return res.data;
  },

  triggerIngestion: async (): Promise<IngestResponse> => {
    const res = await apiClient.post<IngestResponse>('/ingest', {});
    return res.data;
  },

  getCases: async (): Promise<CasesResponse> => {
    const res = await apiClient.get<CasesResponse>('/cases');
    return res.data;
  },

  getCaseDetail: async (caseId: string): Promise<CaseDetail> => {
    const res = await apiClient.get<CaseDetail>(`/cases/${encodeURIComponent(caseId)}`);
    return res.data;
  },
  getCaseWorkflow: async (caseId: string): Promise<CaseWorkflowState> => {
    const res = await apiClient.get<CaseWorkflowState>(`/cases/${encodeURIComponent(caseId)}/workflow`);
    return res.data;
  },

  updateCaseWorkflowStatus: async (caseId: string, status: CaseWorkflowStatus): Promise<CaseWorkflowState> => {
    const res = await apiClient.patch<CaseWorkflowState>(`/cases/${encodeURIComponent(caseId)}/workflow`, { status });
    return res.data;
  },

  toggleChecklistItem: async (caseId: string, itemId: string, completed: boolean): Promise<CaseWorkflowState> => {
    const res = await apiClient.patch<CaseWorkflowState>(`/cases/${encodeURIComponent(caseId)}/checklist`, { item_id: itemId, completed });
    return res.data;
  },

  addCaseFollowup: async (caseId: string, payload: { title: string; category: FollowUpCategory; related_target?: string; notes?: string }): Promise<FollowUpItem> => {
    const res = await apiClient.post<FollowUpItem>(`/cases/${encodeURIComponent(caseId)}/followups`, payload);
    return res.data;
  },

  updateCaseFollowup: async (caseId: string, followupId: string, payload: { status?: FollowUpStatus; notes?: string }): Promise<FollowUpItem> => {
    const res = await apiClient.patch<FollowUpItem>(`/cases/${encodeURIComponent(caseId)}/followups/${encodeURIComponent(followupId)}`, payload);
    return res.data;
  },

  getSystemConfig: async (): Promise<SystemConfigResponse> => {
    const res = await apiClient.get<SystemConfigResponse>('/system/config');
    return res.data;
  },

  getSystemHealth: async (): Promise<SystemHealthResponse> => {
    const res = await apiClient.get<SystemHealthResponse>('/system/health');
    return res.data;
  },

  resetSessionWorkflow: async (): Promise<ResetSessionResponse> => {
    const res = await apiClient.post<ResetSessionResponse>('/system/reset-session', {});
    return res.data;
  },

  getInvestigation: async (
    targetType: string = 'case',
    targetId: string = 'CR-1001',
    temporalWindow: string = 'all'
  ): Promise<InvestigationResponse> => {
    const res = await apiClient.get<InvestigationResponse>(
      `/investigation?target_type=${encodeURIComponent(targetType)}&target_id=${encodeURIComponent(targetId)}&temporal_window=${encodeURIComponent(temporalWindow)}`
    );
    return res.data;
  },

  getPathAnalysis: async (start: string, end: string): Promise<InvestigationPathResponse> => {
    const res = await apiClient.get<InvestigationPathResponse>(
      `/investigation/path?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    );
    return res.data;
  },

  // ─── Phase 3F: Data Quality & Robustness Testing ───────────────────────────

  getFixtureCatalogue: async (): Promise<FixtureCatalogue> => {
    const res = await apiClient.get<FixtureCatalogue>('/data-quality/catalogue');
    return res.data;
  },

  getDataQualityResults: async (): Promise<DataQualityResults> => {
    const res = await apiClient.get<DataQualityResults>('/data-quality/results');
    return res.data;
  },

  // ─── Phase 3H: Evidence & Provenance Engine ───────────────────────────────

  getEvidenceOverview: async (params?: Record<string, string>): Promise<EvidenceOverviewResponse> => {
    const res = await apiClient.get<EvidenceOverviewResponse>('/evidence', { params });
    return res.data;
  },

  getEvidenceItem: async (evidenceId: string): Promise<SingleEvidenceResponse> => {
    const res = await apiClient.get<SingleEvidenceResponse>(`/evidence/${encodeURIComponent(evidenceId)}`);
    return res.data;
  },

  getRelationshipEvidence: async (source: string, target: string): Promise<RelationshipEvidenceResponse> => {
    const res = await apiClient.get<RelationshipEvidenceResponse>(
      `/evidence/relationship/${encodeURIComponent(source)}/${encodeURIComponent(target)}`
    );
    return res.data;
  },

  // ─── Phase 3I: Explainable Intelligence Engine ─────────────────────────────

  getExplainabilityOverview: async (params?: Record<string, string>): Promise<ExplainabilityOverviewResponse> => {
    const res = await apiClient.get<ExplainabilityOverviewResponse>('/explainability', { params });
    return res.data;
  },

  getExplanation: async (explanationId: string): Promise<IntelligenceExplanation> => {
    const res = await apiClient.get<IntelligenceExplanation>(`/explainability/${encodeURIComponent(explanationId)}`);
    return res.data;
  },

  getEntityExplanations: async (entityId: string): Promise<EntityExplanationsResponse> => {
    const res = await apiClient.get<EntityExplanationsResponse>(`/explainability/entity/${encodeURIComponent(entityId)}`);
    return res.data;
  },

  getAnomalyExplanation: async (anomalyId: string): Promise<IntelligenceExplanation> => {
    const res = await apiClient.get<IntelligenceExplanation>(`/explainability/anomaly/${encodeURIComponent(anomalyId)}`);
    return res.data;
  },

  getRelationshipExplanation: async (source: string, target: string): Promise<IntelligenceExplanation> => {
    const res = await apiClient.get<IntelligenceExplanation>(
      `/explainability/relationship/${encodeURIComponent(source)}/${encodeURIComponent(target)}`
    );
    return res.data;
  },

  getPathExplanation: async (source: string, target: string): Promise<IntelligenceExplanation> => {
    const res = await apiClient.get<IntelligenceExplanation>(
      `/explainability/path/${encodeURIComponent(source)}/${encodeURIComponent(target)}`
    );
    return res.data;
  },

  // ─── Phase 3J: Temporal Intelligence ───────────────────────────────────────

  getTemporalOverview: async (): Promise<TemporalOverviewResponse> => {
    const res = await apiClient.get<TemporalOverviewResponse>('/temporal');
    return res.data;
  },

  getTemporalActivity: async (granularity: string = 'day'): Promise<TemporalActivityResponse> => {
    const res = await apiClient.get<TemporalActivityResponse>('/temporal/activity', {
      params: { granularity },
    });
    return res.data;
  },

  getTemporalEvolution: async (): Promise<TemporalEvolutionResponse> => {
    const res = await apiClient.get<TemporalEvolutionResponse>('/temporal/evolution');
    return res.data;
  },

  getTemporalPatterns: async (type?: string): Promise<TemporalPatternsResponse> => {
    const res = await apiClient.get<TemporalPatternsResponse>('/temporal/patterns', {
      params: type ? { type } : {},
    });
    return res.data;
  },

  getTemporalEntity: async (entityId: string): Promise<TemporalEntityResponse> => {
    const res = await apiClient.get<TemporalEntityResponse>(
      `/temporal/entity/${encodeURIComponent(entityId)}`
    );
    return res.data;
  },

  getTemporalCase: async (caseId: string): Promise<TemporalCaseResponse> => {
    const res = await apiClient.get<TemporalCaseResponse>(
      `/temporal/case/${encodeURIComponent(caseId)}`
    );
    return res.data;
  },

  getTemporalRelationship: async (
    source: string,
    target: string
  ): Promise<TemporalRelationshipEvolution> => {
    const res = await apiClient.get<TemporalRelationshipEvolution>(
      `/temporal/relationship/${encodeURIComponent(source)}/${encodeURIComponent(target)}`
    );
    return res.data;
  },

  getTemporalObservation: async (temporalId: string): Promise<TemporalObservation> => {
    const res = await apiClient.get<TemporalObservation>(
      `/temporal/${encodeURIComponent(temporalId)}`
    );
    return res.data;
  },

  // --------------------------------------------------------------------------
  // Phase 3K: Advanced Graph Intelligence Methods
  // --------------------------------------------------------------------------

  getGraphOverview: async (): Promise<GraphOverview> => {
    const res = await apiClient.get<GraphOverview>('/graph-intelligence/overview');
    return res.data;
  },

  getGraphNeighborhood: async (entityId: string): Promise<GraphNeighborhood> => {
    const res = await apiClient.get<GraphNeighborhood>(
      `/graph-intelligence/neighborhood/${encodeURIComponent(entityId)}`
    );
    return res.data;
  },

  getGraphPath: async (source: string, target: string): Promise<GraphPath> => {
    const res = await apiClient.get<GraphPath>(
      `/graph-intelligence/path/${encodeURIComponent(source)}/${encodeURIComponent(target)}`
    );
    return res.data;
  },

  getBridgeAnalysis: async (): Promise<BridgeAnalysis> => {
    const res = await apiClient.get<BridgeAnalysis>('/graph-intelligence/bridges');
    return res.data;
  },

  getCommunityAnalysis: async (communityId?: number): Promise<CommunityAnalysis> => {
    const res = await apiClient.get<CommunityAnalysis>('/graph-intelligence/communities', {
      params: communityId !== undefined ? { community_id: communityId } : {},
    });
    return res.data;
  },

  getCentralityComparison: async (): Promise<GraphCentralityComparison> => {
    const res = await apiClient.get<GraphCentralityComparison>('/graph-intelligence/centrality');
    return res.data;
  },

  getGraphMotifs: async (motifType?: string): Promise<MotifAnalysis> => {
    const res = await apiClient.get<MotifAnalysis>('/graph-intelligence/motifs', {
      params: motifType ? { motif_type: motifType } : {},
    });
    return res.data;
  },

  compareEntities: async (entityA: string, entityB: string): Promise<GraphComparison> => {
    const res = await apiClient.get<GraphComparison>(
      `/graph-intelligence/compare/${encodeURIComponent(entityA)}/${encodeURIComponent(entityB)}`
    );
    return res.data;
  },

  // ─── Phase 4: FIR Module ──────────────────────────────────────────────────

  listFirs: async (params?: Record<string, any>): Promise<FIRListResponse> => {
    const res = await apiClient.get<FIRListResponse>('/fir', { params });
    return res.data;
  },

  getFir: async (firId: string): Promise<FIRRecord> => {
    const res = await apiClient.get<FIRRecord>(`/fir/${encodeURIComponent(firId)}`);
    return res.data;
  },

  createFir: async (payload: Record<string, any>): Promise<FIRRecord> => {
    const res = await apiClient.post<FIRRecord>('/fir', payload);
    return res.data;
  },

  updateFir: async (firId: string, payload: Record<string, any>): Promise<FIRRecord> => {
    const res = await apiClient.put<FIRRecord>(`/fir/${encodeURIComponent(firId)}`, payload);
    return res.data;
  },

  deleteFir: async (firId: string): Promise<{ status: string; fir_id: string }> => {
    const res = await apiClient.delete<{ status: string; fir_id: string }>(`/fir/${encodeURIComponent(firId)}`);
    return res.data;
  },

  searchFirs: async (params: Record<string, any>): Promise<FIRSearchResponse> => {
    const res = await apiClient.get<FIRSearchResponse>('/fir/search/query', { params });
    return res.data;
  },

  getFirKPIs: async (): Promise<FIRKPIsResponse> => {
    const res = await apiClient.get<FIRKPIsResponse>('/fir/kpis');
    return res.data;
  },

  getFirLegalProvisions: async (): Promise<FIRLegalCatalogResponse> => {
    const res = await apiClient.get<FIRLegalCatalogResponse>('/fir/reference/legal-provisions');
    return res.data;
  },

  login: async (credentials: { username: string; password: string }): Promise<{ status: string; token: string; user: any }> => {
    const res = await apiClient.post('/auth/login', credentials);
    return res.data;
  },

  suggestBnsProvisions: async (category?: string, narrative?: string): Promise<any> => {
    const res = await apiClient.get('/fir/suggest-bns', {
      params: { category, narrative },
    });
    return res.data;
  },
};



