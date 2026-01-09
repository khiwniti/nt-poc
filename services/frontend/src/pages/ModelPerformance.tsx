import React, { useEffect, useState } from 'react';

interface ModelPerformanceData {
  healthScore: {
    score_time: string;
    accuracy_score: number;
    drift_score: number;
    data_quality_score: number;
    overall_health_score: number;
    health_status: string;
  } | null;
  alerts: Array<{
    id: number;
    alert_time: string;
    alert_type: string;
    severity: string;
    message: string;
    acknowledged: boolean;
  }>;
  accuracyMetrics: {
    metric_time: string;
    mae_soc: number;
    mae_soh: number;
    mae_temperature: number;
    mae_power: number;
    rmse_soc: number;
    rmse_soh: number;
    rmse_temperature: number;
    rmse_power: number;
    r2_soc: number;
    r2_soh: number;
    r2_temperature: number;
    r2_power: number;
  }[];
  driftMetrics: {
    metric_time: string;
    voltage_drift_score: number;
    current_drift_score: number;
    temperature_drift_score: number;
    soc_drift_score: number;
    overall_drift_score: number;
  }[];
  dataQualityMetrics: {
    metric_time: string;
    total_records: number;
    missing_voltage_count: number;
    missing_current_count: number;
    missing_temperature_count: number;
    missing_soc_count: number;
    missing_soh_count: number;
    voltage_outlier_count: number;
    current_outlier_count: number;
    temperature_outlier_count: number;
    soc_outlier_count: number;
  }[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function ModelPerformanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ModelPerformanceData>({
    healthScore: null,
    alerts: [],
    accuracyMetrics: [],
    driftMetrics: [],
    dataQualityMetrics: [],
  });
  const [batterySystemId, setBatterySystemId] = useState('battery-001');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    fetchModelPerformanceData();
  }, [batterySystemId, timeRange]);

  const fetchModelPerformanceData = async () => {
    setLoading(true);
    setError(null);

    try {
      const endTime = new Date();
      let startTime = new Date();

      switch (timeRange) {
        case '24h':
          startTime.setHours(endTime.getHours() - 24);
          break;
        case '7d':
          startTime.setDate(endTime.getDate() - 7);
          break;
        case '30d':
          startTime.setDate(endTime.getDate() - 30);
          break;
      }

      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch health score
      const healthScoreResponse = await fetch(
        `${API_BASE_URL}/api/v1/model-performance/health-score?batterySystemId=${batterySystemId}&startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}`,
        { headers }
      );

      if (!healthScoreResponse.ok) {
        throw new Error('Failed to fetch health score');
      }

      const healthScoreData = await healthScoreResponse.json();

      // Fetch alerts
      const alertsResponse = await fetch(
        `${API_BASE_URL}/api/v1/model-performance/alerts?batterySystemId=${batterySystemId}&resolved=false`,
        { headers }
      );

      if (!alertsResponse.ok) {
        throw new Error('Failed to fetch alerts');
      }

      const alertsData = await alertsResponse.json();

      // Fetch accuracy history
      const accuracyHistoryResponse = await fetch(
        `${API_BASE_URL}/api/v1/model-performance/history?batterySystemId=${batterySystemId}&metricType=accuracy&startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}`,
        { headers }
      );

      const accuracyHistoryData = accuracyHistoryResponse.ok
        ? await accuracyHistoryResponse.json()
        : { data: [] };

      // Fetch drift history
      const driftHistoryResponse = await fetch(
        `${API_BASE_URL}/api/v1/model-performance/history?batterySystemId=${batterySystemId}&metricType=drift&startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}`,
        { headers }
      );

      const driftHistoryData = driftHistoryResponse.ok
        ? await driftHistoryResponse.json()
        : { data: [] };

      // Fetch data quality metrics
      const dataQualityResponse = await fetch(
        `${API_BASE_URL}/api/v1/model-performance/data-quality?batterySystemId=${batterySystemId}&startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}`,
        { headers }
      );

      const dataQualityData = dataQualityResponse.ok
        ? await dataQualityResponse.json()
        : { data: [] };

      setData({
        healthScore: healthScoreData.data,
        alerts: alertsData.data || [],
        accuracyMetrics: accuracyHistoryData.data || [],
        driftMetrics: driftHistoryData.data || [],
        dataQualityMetrics: dataQualityData.data || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/v1/model-performance/alerts/${alertId}/acknowledge`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        fetchModelPerformanceData();
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const resolveAlert = async (alertId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/v1/model-performance/alerts/${alertId}/resolve`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        fetchModelPerformanceData();
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return '#22c55e';
      case 'good': return '#84cc16';
      case 'fair': return '#eab308';
      case 'poor': return '#f97316';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#84cc16';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Loading model performance data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', borderRadius: '8px', color: '#991b1b' }}>
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  const { healthScore, alerts, accuracyMetrics, driftMetrics, dataQualityMetrics } = data;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Model Performance Monitoring</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select
            value={batterySystemId}
            onChange={(e) => setBatterySystemId(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="battery-001">Battery System 001</option>
            <option value="battery-002">Battery System 002</option>
            <option value="battery-003">Battery System 003</option>
          </select>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '24h' | '7d' | '30d')}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={fetchModelPerformanceData}
            style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer' }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Health Score */}
      {healthScore && (
        <div style={{
          marginBottom: '2rem',
          padding: '2rem',
          border: '2px solid #ddd',
          borderRadius: '12px',
          backgroundColor: '#f9fafb'
        }}>
          <h3 style={{ marginTop: 0 }}>Overall Model Health</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: getHealthStatusColor(healthScore.health_status) }}>
                {healthScore.overall_health_score.toFixed(1)}
              </div>
              <div style={{ fontSize: '1.2rem', textTransform: 'uppercase', color: getHealthStatusColor(healthScore.health_status) }}>
                {healthScore.health_status}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>Accuracy Score</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{healthScore.accuracy_score.toFixed(1)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>Drift Score</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{healthScore.drift_score.toFixed(1)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>Data Quality Score</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{healthScore.data_quality_score.toFixed(1)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3>Active Alerts ({alerts.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {alerts.map(alert => (
              <div
                key={alert.id}
                style={{
                  padding: '1rem',
                  border: `2px solid ${getSeverityColor(alert.severity)}`,
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      backgroundColor: getSeverityColor(alert.severity),
                      color: 'white'
                    }}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {new Date(alert.alert_time).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                    {alert.alert_type.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <div style={{ color: '#4b5563' }}>{alert.message}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: '#10b981',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accuracy Metrics */}
      <div style={{ marginBottom: '2rem' }}>
        <h3>Prediction Accuracy Metrics</h3>
        {accuracyMetrics.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <MetricCard
              title="State of Charge (SOC)"
              mae={accuracyMetrics[accuracyMetrics.length - 1].mae_soc}
              rmse={accuracyMetrics[accuracyMetrics.length - 1].rmse_soc}
              r2={accuracyMetrics[accuracyMetrics.length - 1].r2_soc}
            />
            <MetricCard
              title="State of Health (SOH)"
              mae={accuracyMetrics[accuracyMetrics.length - 1].mae_soh}
              rmse={accuracyMetrics[accuracyMetrics.length - 1].rmse_soh}
              r2={accuracyMetrics[accuracyMetrics.length - 1].r2_soh}
            />
            <MetricCard
              title="Temperature"
              mae={accuracyMetrics[accuracyMetrics.length - 1].mae_temperature}
              rmse={accuracyMetrics[accuracyMetrics.length - 1].rmse_temperature}
              r2={accuracyMetrics[accuracyMetrics.length - 1].r2_temperature}
            />
            <MetricCard
              title="Power"
              mae={accuracyMetrics[accuracyMetrics.length - 1].mae_power}
              rmse={accuracyMetrics[accuracyMetrics.length - 1].rmse_power}
              r2={accuracyMetrics[accuracyMetrics.length - 1].r2_power}
            />
          </div>
        ) : (
          <div style={{ padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px', textAlign: 'center' }}>
            No accuracy metrics available for the selected time range
          </div>
        )}
      </div>

      {/* Drift Detection */}
      <div style={{ marginBottom: '2rem' }}>
        <h3>Drift Detection</h3>
        {driftMetrics.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <DriftCard title="Voltage" score={driftMetrics[driftMetrics.length - 1].voltage_drift_score} />
            <DriftCard title="Current" score={driftMetrics[driftMetrics.length - 1].current_drift_score} />
            <DriftCard title="Temperature" score={driftMetrics[driftMetrics.length - 1].temperature_drift_score} />
            <DriftCard title="SOC" score={driftMetrics[driftMetrics.length - 1].soc_drift_score} />
            <DriftCard
              title="Overall Drift"
              score={driftMetrics[driftMetrics.length - 1].overall_drift_score}
              isOverall={true}
            />
          </div>
        ) : (
          <div style={{ padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px', textAlign: 'center' }}>
            No drift metrics available for the selected time range
          </div>
        )}
      </div>

      {/* Data Quality */}
      <div>
        <h3>Data Quality Metrics</h3>
        {dataQualityMetrics.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <DataQualityCard
              title="Missing Values"
              metrics={dataQualityMetrics[dataQualityMetrics.length - 1]}
              type="missing"
            />
            <DataQualityCard
              title="Outliers"
              metrics={dataQualityMetrics[dataQualityMetrics.length - 1]}
              type="outliers"
            />
            <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff' }}>
              <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Total Records</h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {dataQualityMetrics[dataQualityMetrics.length - 1].total_records.toLocaleString()}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px', textAlign: 'center' }}>
            No data quality metrics available for the selected time range
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components

function MetricCard({ title, mae, rmse, r2 }: { title: string; mae: number; rmse: number; r2: number }) {
  const getR2Color = (value: number) => {
    if (value >= 0.9) return '#22c55e';
    if (value >= 0.7) return '#84cc16';
    if (value >= 0.5) return '#eab308';
    return '#ef4444';
  };

  return (
    <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff' }}>
      <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>{title}</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280' }}>MAE:</span>
          <span style={{ fontWeight: '500' }}>{mae.toFixed(4)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280' }}>RMSE:</span>
          <span style={{ fontWeight: '500' }}>{rmse.toFixed(4)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280' }}>R²:</span>
          <span style={{ fontWeight: '500', color: getR2Color(r2) }}>{r2.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
}

function DriftCard({ title, score, isOverall = false }: { title: string; score: number; isOverall?: boolean }) {
  const getDriftColor = (value: number) => {
    if (value < 0.1) return '#22c55e';
    if (value < 0.2) return '#84cc16';
    if (value < 0.3) return '#eab308';
    return '#ef4444';
  };

  const getDriftStatus = (value: number) => {
    if (value < 0.1) return 'Stable';
    if (value < 0.2) return 'Minor';
    if (value < 0.3) return 'Moderate';
    return 'Significant';
  };

  return (
    <div style={{
      padding: '1.5rem',
      border: isOverall ? '2px solid #3b82f6' : '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#fff'
    }}>
      <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{title}</h4>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: getDriftColor(score) }}>
        {score.toFixed(4)}
      </div>
      <div style={{ fontSize: '0.875rem', color: getDriftColor(score), fontWeight: '500' }}>
        {getDriftStatus(score)}
      </div>
    </div>
  );
}

function DataQualityCard({
  title,
  metrics,
  type
}: {
  title: string;
  metrics: any;
  type: 'missing' | 'outliers'
}) {
  const getValue = (field: string) => {
    return type === 'missing'
      ? metrics[`missing_${field}_count`]
      : metrics[`${field}_outlier_count`];
  };

  return (
    <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff' }}>
      <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>{title}</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280' }}>Voltage:</span>
          <span style={{ fontWeight: '500' }}>{getValue('voltage')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280' }}>Current:</span>
          <span style={{ fontWeight: '500' }}>{getValue('current')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280' }}>Temperature:</span>
          <span style={{ fontWeight: '500' }}>{getValue('temperature')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280' }}>SOC:</span>
          <span style={{ fontWeight: '500' }}>{getValue('soc')}</span>
        </div>
        {type === 'missing' && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>SOH:</span>
            <span style={{ fontWeight: '500' }}>{metrics.missing_soh_count}</span>
          </div>
        )}
      </div>
    </div>
  );
}


export default ModelPerformance;
