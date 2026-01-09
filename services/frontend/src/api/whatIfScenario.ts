import type { ScenarioParameters, ScenarioPrediction, SavedScenario } from '../types/whatIfScenario';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function fetchWithAuth<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

export async function simulateScenario(
  batterySystemId: string,
  parameters: ScenarioParameters
): Promise<ScenarioPrediction> {
  const url = `${API_BASE_URL}/v1/what-if/simulate`;
  return fetchWithAuth<ScenarioPrediction>(url, {
    method: 'POST',
    body: JSON.stringify({
      batterySystemId,
      parameters,
    }),
  });
}

export async function getCurrentPrediction(
  batterySystemId: string
): Promise<ScenarioPrediction> {
  const url = `${API_BASE_URL}/v1/what-if/current/${batterySystemId}`;
  return fetchWithAuth<ScenarioPrediction>(url);
}

export async function saveScenario(
  batterySystemId: string,
  scenario: Omit<SavedScenario, 'id' | 'createdAt'>
): Promise<SavedScenario> {
  const url = `${API_BASE_URL}/v1/what-if/scenarios`;
  return fetchWithAuth<SavedScenario>(url, {
    method: 'POST',
    body: JSON.stringify({
      batterySystemId,
      ...scenario,
    }),
  });
}

export async function getSavedScenarios(
  batterySystemId: string
): Promise<SavedScenario[]> {
  const url = `${API_BASE_URL}/v1/what-if/scenarios/${batterySystemId}`;
  const response = await fetchWithAuth<{ data: SavedScenario[] }>(url);
  return response.data;
}

export async function deleteScenario(scenarioId: string): Promise<void> {
  const url = `${API_BASE_URL}/v1/what-if/scenarios/${scenarioId}`;
  await fetchWithAuth<void>(url, {
    method: 'DELETE',
  });
}
