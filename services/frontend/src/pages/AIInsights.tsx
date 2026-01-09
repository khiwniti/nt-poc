import { useState } from 'react';
import { RULTrendChart } from '../components/RULTrendChart';
import { getRULPredictions } from '../api/rulPredictions';
import type { RULPrediction } from '../types/rulPrediction';

export function AIInsights() {
  const [batterySystemId, setBatterySystemId] = useState<string>('');
  const [predictions, setPredictions] = useState<RULPrediction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadPredictions = async () => {
    if (!batterySystemId.trim()) {
      setError('Please enter a battery system ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getRULPredictions(batterySystemId, 100, 0);
      setPredictions(data);
      
      if (data.length === 0) {
        setError('No predictions found for this battery system');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load predictions');
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      loadPredictions();
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>AI Insights - RUL Predictions</h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Monitor Remaining Useful Life predictions and track battery system health over time
        </p>
      </div>

      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <label
            htmlFor="batterySystemId"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
            }}
          >
            Battery System ID
          </label>
          <input
            id="batterySystemId"
            type="text"
            value={batterySystemId}
            onChange={(e) => setBatterySystemId(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter battery system UUID"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
            }}
          />
        </div>
        <button
          onClick={loadPredictions}
          disabled={loading}
          style={{
            marginTop: '1.75rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: loading ? '#9ca3af' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Loading...' : 'Load Predictions'}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#dc2626',
            marginBottom: '2rem',
          }}
        >
          {error}
        </div>
      )}

      {!loading && predictions.length > 0 && (
        <div
          style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1.5rem',
          }}
        >
          <RULTrendChart predictions={predictions} warningThreshold={30} />
        </div>
      )}

      {!loading && !error && predictions.length === 0 && batterySystemId && (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#6b7280',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
          }}
        >
          <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No predictions loaded</p>
          <p style={{ fontSize: '0.875rem' }}>
            Enter a battery system ID and click "Load Predictions" to view the RUL trend chart
          </p>
        </div>
      )}
    </div>
  );
}

export default AIInsights;
