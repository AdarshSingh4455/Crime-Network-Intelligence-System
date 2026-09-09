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
};

