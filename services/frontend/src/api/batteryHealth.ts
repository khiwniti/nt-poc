import axios from 'axios';
import type {
  BatteryHealthSummary,
  HealthDistribution,
  AtRiskBattery,
  HealthTrendPoint,
  ZoneHealthStats
} from '../types/batteryHealth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function getHealthSummary(facilityId: string): Promise<BatteryHealthSummary> {
  const response = await api.get(`/api/v1/battery-health/facility/${facilityId}/summary`);
  return response.data;
}

export async function getHealthDistribution(facilityId: string): Promise<HealthDistribution[]> {
  const response = await api.get(`/api/v1/battery-health/facility/${facilityId}/distribution`);
  return response.data.data;
}

export async function getAtRiskBatteries(facilityId: string, threshold = 70): Promise<{ data: AtRiskBattery[]; total: number; threshold: number }> {
  const response = await api.get(`/api/v1/battery-health/facility/${facilityId}/at-risk`, {
    params: { threshold }
  });
  return response.data;
}

export async function getHealthTrend(facilityId: string, days = 30): Promise<HealthTrendPoint[]> {
  const response = await api.get(`/api/v1/battery-health/facility/${facilityId}/trend`, {
    params: { days }
  });
  return response.data.data;
}

export async function getZoneHealthStats(facilityId: string): Promise<{ data: ZoneHealthStats[]; total: number }> {
  const response = await api.get(`/api/v1/battery-health/facility/${facilityId}/by-zone`);
  return response.data;
}

export async function exportHealthReport(facilityId: string): Promise<Blob> {
  const response = await api.get(`/api/v1/battery-health/facility/${facilityId}/export`, {
    responseType: 'blob'
  });
  return response.data;
}
