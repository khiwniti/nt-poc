import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  getHealthSummary,
  getHealthDistribution,
  getAtRiskBatteries,
  getHealthTrend,
  getZoneHealthStats,
  exportHealthReport
} from '../api/batteryHealth';
import type {
  BatteryHealthSummary,
  HealthDistribution,
  AtRiskBattery,
  HealthTrendPoint,
  ZoneHealthStats
} from '../types/batteryHealth';

export function HealthScoreDashboard() {
  const [facilityId, setFacilityId] = useState<string>('');
  const [summary, setSummary] = useState<BatteryHealthSummary | null>(null);
  const [distribution, setDistribution] = useState<HealthDistribution[]>([]);
  const [atRiskBatteries, setAtRiskBatteries] = useState<AtRiskBattery[]>([]);
  const [trend, setTrend] = useState<HealthTrendPoint[]>([]);
  const [zoneStats, setZoneStats] = useState<ZoneHealthStats[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  const loadDashboardData = async () => {
    if (!facilityId.trim()) {
      setError('Please enter a facility ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [summaryData, distData, atRiskData, trendData, zoneData] = await Promise.all([
        getHealthSummary(facilityId),
        getHealthDistribution(facilityId),
        getAtRiskBatteries(facilityId, 70),
        getHealthTrend(facilityId, 30),
        getZoneHealthStats(facilityId)
      ]);

      setSummary(summaryData);
      setDistribution(distData);
      setAtRiskBatteries(atRiskData.data);
      setTrend(trendData);
      setZoneStats(zoneData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      setSummary(null);
      setDistribution([]);
      setAtRiskBatteries([]);
      setTrend([]);
      setZoneStats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!facilityId.trim()) {
      setError('Please enter a facility ID');
      return;
    }

    setExporting(true);
    setError(null);

    try {
      const blob = await exportHealthReport(facilityId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `battery-health-report-${facilityId}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      loadDashboardData();
    }
  };

  const getHealthColor = (score: number): string => {
    if (score >= 90) return '#22c55e'; // green
    if (score >= 70) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  const getDistributionColor = (midpoint: number): string => {
    if (midpoint >= 90) return '#22c55e';
    if (midpoint >= 70) return '#eab308';
    return '#ef4444';
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Health Score Dashboard</h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Monitor battery health scores across your facility and identify at-risk systems
        </p>
      </div>

      {/* Input Section */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        alignItems: 'center',
        padding: '1.5rem',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="facilityId" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Facility ID
          </label>
          <input
            id="facilityId"
            type="text"
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter facility ID"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          />
        </div>
        <button
          onClick={loadDashboardData}
          disabled={loading}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: loading ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
            marginTop: '1.5rem'
          }}
        >
          {loading ? 'Loading...' : 'Load Dashboard'}
        </button>
        {summary && (
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: exporting ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: exporting ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              marginTop: '1.5rem'
            }}
          >
            {exporting ? 'Exporting...' : 'Export Report'}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          marginBottom: '2rem',
          color: '#dc2626'
        }}>
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              padding: '1.5rem',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Total Batteries
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>
                {summary.totalBatteries}
              </p>
            </div>

            <div style={{
              padding: '1.5rem',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Avg Health Score
              </h3>
              <p style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: summary.avgHealthScore ? getHealthColor(summary.avgHealthScore) : '#111827'
              }}>
                {summary.avgHealthScore?.toFixed(1) || 'N/A'}
              </p>
            </div>

            <div style={{
              padding: '1.5rem',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Healthy (≥90)
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e' }}>
                {summary.healthyCount}
              </p>
            </div>

            <div style={{
              padding: '1.5rem',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Warning (70-89)
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#eab308' }}>
                {summary.warningCount}
              </p>
            </div>

            <div style={{
              padding: '1.5rem',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                At Risk (&lt;70)
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>
                {summary.atRiskCount}
              </p>
            </div>
          </div>

          {/* Charts Section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            {/* Health Score Distribution */}
            {distribution.length > 0 && (
              <div style={{
                padding: '1.5rem',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Health Score Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={distribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" />
                    <YAxis label={{ value: 'Number of Batteries', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Battery Count">
                      {distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getDistributionColor(entry.bucket_midpoint)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 30-Day Health Trend */}
            {trend.length > 0 && (
              <div style={{
                padding: '1.5rem',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>30-Day Health Trend</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis domain={[0, 100]} label={{ value: 'Health Score', angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: number) => [value.toFixed(2), 'Health Score']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avg_health_score"
                      name="Avg Health Score"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Zone Health Stats */}
          {zoneStats.length > 0 && (
            <div style={{
              padding: '1.5rem',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginBottom: '2rem'
            }}>
              <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Zone-Level Health Aggregation</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Zone</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Batteries</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Avg Score</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Min Score</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Max Score</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>At Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zoneStats.map((zone) => (
                      <tr key={zone.zone} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.75rem' }}>{zone.zone}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>{zone.battery_count}</td>
                        <td style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          color: getHealthColor(zone.avg_health_score),
                          fontWeight: '600'
                        }}>
                          {zone.avg_health_score.toFixed(1)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {zone.min_health_score.toFixed(1)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {zone.max_health_score.toFixed(1)}
                        </td>
                        <td style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          color: zone.at_risk_count > 0 ? '#ef4444' : '#6b7280'
                        }}>
                          {zone.at_risk_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* At-Risk Batteries List */}
          {atRiskBatteries.length > 0 && (
            <div style={{
              padding: '1.5rem',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', color: '#ef4444' }}>
                At-Risk Batteries (Health Score &lt; 70)
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#fef2f2', borderBottom: '2px solid #fca5a5' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Battery Name</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Zone</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Capacity (kWh)</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Health Score</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Last Reading</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atRiskBatteries.map((battery) => (
                      <tr key={battery.id} style={{ borderBottom: '1px solid #fee2e2' }}>
                        <td style={{ padding: '0.75rem' }}>{battery.name}</td>
                        <td style={{ padding: '0.75rem' }}>{battery.zone || 'N/A'}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {battery.capacity_kwh.toFixed(2)}
                        </td>
                        <td style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          color: '#ef4444',
                          fontWeight: '600'
                        }}>
                          {battery.health_score.toFixed(1)}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                          {new Date(battery.last_reading).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No At-Risk Batteries Message */}
          {atRiskBatteries.length === 0 && summary.totalBatteries > 0 && (
            <div style={{
              padding: '2rem',
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#15803d'
            }}>
              <p style={{ fontSize: '1.125rem', fontWeight: '500' }}>
                ✓ No batteries at risk - all systems are healthy!
              </p>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && !summary && !error && (
        <div style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
            Enter a facility ID to view health score dashboard
          </p>
          <p style={{ fontSize: '0.875rem' }}>
            Monitor battery health, identify at-risk systems, and track trends over time
          </p>
        </div>
      )}
    </div>
  );
}

export default HealthScoreDashboard;
