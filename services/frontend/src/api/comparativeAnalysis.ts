const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export interface RULComparison {
  batterySystemId: string;
  predictedRul: number;
  actualLifespan: number | null;
  absoluteError: number;
  percentageError: number | null;
  confidenceScore: number;
  batteryType: string;
  facilityName: string;
  zoneName: string;
  predictionDate: string;
  decommissionDate: string | null;
}

export interface AnomalyComparison {
  batterySystemId: string;
  predictionDate: string;
  anomalyDetected: boolean;
  confidenceScore: number;
  batteryType: string;
  facilityName: string;
  zoneName: string;
  actualFailure: boolean;
  failureTime: string | null;
  severity: string | null;
  alertType: string | null;
  predictionType: 'true_positive' | 'false_positive' | 'false_negative' | 'true_negative';
}

export interface AccuracyMetrics {
  batteryType: string;
  rulPredictionCount: number;
  rulMae: number;
  rulRmse: number;
  rulAvgConfidence: number;
  anomalyTruePositives: number;
  anomalyFalsePositives: number;
  anomalyFalseNegatives: number;
  anomalyTrueNegatives: number;
  anomalyPrecision: number;
  anomalyRecall: number;
  anomalyAccuracy: number;
}

export interface ErrorDistribution {
  errorMagnitude: number;
  batteryType: string;
  confidenceScore: number;
  facilityName: string;
}

export interface RootCauseAnalysis {
  batteryType: string;
  poorPredictionCount: number;
  avgError: number;
  avgConfidence: number;
  avgCapacity: number;
  environmentConditions: string[];
  facilities: string[];
  primaryRootCause: string;
}

export interface ComparativeAnalysisFilters {
  facilityId?: string;
  startDate?: string;
  endDate?: string;
  batteryType?: string;
  errorThreshold?: number;
}

async function fetchWithAuth<T>(url: string): Promise<T> {
  const token = localStorage.getItem('authToken');

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

export async function getRULComparison(filters: ComparativeAnalysisFilters): Promise<RULComparison[]> {
  const params = new URLSearchParams();

  if (filters.facilityId) params.append('facilityId', filters.facilityId);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.batteryType) params.append('batteryType', filters.batteryType);

  const url = `${API_BASE_URL}/comparative-analysis/rul-comparison?${params.toString()}`;
  return fetchWithAuth<RULComparison[]>(url);
}

export async function getAnomalyComparison(filters: ComparativeAnalysisFilters): Promise<AnomalyComparison[]> {
  const params = new URLSearchParams();

  if (filters.facilityId) params.append('facilityId', filters.facilityId);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.batteryType) params.append('batteryType', filters.batteryType);

  const url = `${API_BASE_URL}/comparative-analysis/anomaly-comparison?${params.toString()}`;
  return fetchWithAuth<AnomalyComparison[]>(url);
}

export async function getAccuracyMetrics(filters: ComparativeAnalysisFilters): Promise<AccuracyMetrics[]> {
  const params = new URLSearchParams();

  if (filters.facilityId) params.append('facilityId', filters.facilityId);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const url = `${API_BASE_URL}/comparative-analysis/accuracy-metrics?${params.toString()}`;
  return fetchWithAuth<AccuracyMetrics[]>(url);
}

export async function getErrorDistribution(filters: ComparativeAnalysisFilters): Promise<ErrorDistribution[]> {
  const params = new URLSearchParams();

  if (filters.facilityId) params.append('facilityId', filters.facilityId);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.batteryType) params.append('batteryType', filters.batteryType);

  const url = `${API_BASE_URL}/comparative-analysis/error-distribution?${params.toString()}`;
  return fetchWithAuth<ErrorDistribution[]>(url);
}

export async function getRootCauseAnalysis(filters: ComparativeAnalysisFilters): Promise<RootCauseAnalysis[]> {
  const params = new URLSearchParams();

  if (filters.facilityId) params.append('facilityId', filters.facilityId);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.errorThreshold) params.append('errorThreshold', filters.errorThreshold.toString());

  const url = `${API_BASE_URL}/comparative-analysis/root-cause?${params.toString()}`;
  return fetchWithAuth<RootCauseAnalysis[]>(url);
}

export async function exportAccuracyReport(filters: ComparativeAnalysisFilters): Promise<void> {
  const params = new URLSearchParams();

  if (filters.facilityId) params.append('facilityId', filters.facilityId);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const token = localStorage.getItem('authToken');
  const url = `${API_BASE_URL}/comparative-analysis/export?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `comparative_analysis_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}
