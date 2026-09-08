import axios from 'axios';
import { HealthStatus, OverviewMetrics, NetworkData, NetworkNode, SuspiciousPattern, TimelineEvent, EntityDetail } from '../types';

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

  getTimeline: async (): Promise<TimelineEvent[]> => {
    const res = await apiClient.get<TimelineEvent[]>('/timeline');
    return res.data;
  },

  getLocations: async (): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/locations');
    return res.data;
  },

  getReports: async (): Promise<any> => {
    const res = await apiClient.get<any>('/reports');
    return res.data;
  },
};
