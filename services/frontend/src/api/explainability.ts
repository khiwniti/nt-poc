/**
 * API client for SHAP explainability endpoints
 * T156: Implement prediction explainability (SHAP)
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface ExplainabilityRequest {
  batterySystemId: string;
  features: Record<string, number>;
  predictionValue: number;
  predictionType?: 'RUL' | 'anomaly' | 'risk';
  topN?: number;
}

export interface FeatureContribution {
  feature: string;
  value: number;
  shap_value: number;
  contribution: number;
}

export interface WaterfallPlotData {
  type: 'waterfall';
  base_value: number;
  prediction_value: number;
  feature_contributions: FeatureContribution[];
  image_base64: string | null;
}

export interface ForcePlotData {
  type: 'force';
  base_value: number;
  prediction_value: number;
  positive_contributions: FeatureContribution[];
  negative_contributions: FeatureContribution[];
  html: string;
}

export interface TextExplanation {
  explanation: string;
  base_value: number;
  prediction_value: number;
  top_features: FeatureContribution[];
}

export interface ExportReportData {
  waterfall_plot: string;
  force_plot: string;
  explanation_text: string;
  output_directory: string;
}

export interface ExplainabilityResponse<T> {
  data: T;
  batterySystemId: string;
  predictionType: string;
  message?: string;
}

/**
 * Generate SHAP waterfall plot
 */
export async function generateWaterfallPlot(
  request: ExplainabilityRequest
): Promise<WaterfallPlotData> {
  const token = localStorage.getItem('token');
  
  const response = await axios.post<ExplainabilityResponse<WaterfallPlotData>>(
    `${API_BASE_URL}/explainability/shap/waterfall`,
    request,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return response.data.data;
}

/**
 * Generate SHAP force plot
 */
export async function generateForcePlot(
  request: ExplainabilityRequest
): Promise<ForcePlotData> {
  const token = localStorage.getItem('token');
  
  const response = await axios.post<ExplainabilityResponse<ForcePlotData>>(
    `${API_BASE_URL}/explainability/shap/force`,
    request,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return response.data.data;
}

/**
 * Generate natural language explanation
 */
export async function generateTextExplanation(
  request: ExplainabilityRequest
): Promise<TextExplanation> {
  const token = localStorage.getItem('token');
  
  const response = await axios.post<ExplainabilityResponse<TextExplanation>>(
    `${API_BASE_URL}/explainability/explanation`,
    request,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return response.data.data;
}

/**
 * Export complete explanation report
 */
export async function exportExplanationReport(
  request: ExplainabilityRequest
): Promise<ExportReportData> {
  const token = localStorage.getItem('token');
  
  const response = await axios.post<ExplainabilityResponse<ExportReportData>>(
    `${API_BASE_URL}/explainability/export`,
    request,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return response.data.data;
}

/**
 * Get explanation for an existing prediction
 */
export async function getPredictionExplanation(
  predictionId: string,
  type: 'waterfall' | 'force' | 'text' = 'waterfall'
): Promise<any> {
  const token = localStorage.getItem('token');
  
  const response = await axios.get(
    `${API_BASE_URL}/explainability/prediction/${predictionId}/explain`,
    {
      params: { type },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  
  return response.data;
}
