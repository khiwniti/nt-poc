import type { RULPrediction, RULPredictionResponse } from '../types/rulPrediction';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function fetchWithAuth<T>(url: string): Promise<T> {
  const token = localStorage.getItem('token');
  const response = await fetch(url, {
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

export async function getRULPredictions(
  batterySystemId: string,
  limit = 100,
  offset = 0
): Promise<RULPrediction[]> {
  const url = `${API_BASE_URL}/v1/predictions/${batterySystemId}?limit=${limit}&offset=${offset}`;
  const response = await fetchWithAuth<RULPredictionResponse>(url);
  return Array.isArray(response.data) ? response.data : [response.data];
}

export async function getLatestRULPrediction(batterySystemId: string): Promise<RULPrediction> {
  const url = `${API_BASE_URL}/v1/predictions/${batterySystemId}/latest`;
  const response = await fetchWithAuth<RULPredictionResponse>(url);
  return Array.isArray(response.data) ? response.data[0] : response.data;
}
