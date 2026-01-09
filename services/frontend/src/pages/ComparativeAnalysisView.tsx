import React, { useState, useEffect } from 'react';
import {
  getRULComparison,
  getAnomalyComparison,
  getAccuracyMetrics,
  getErrorDistribution,
  getRootCauseAnalysis,
  exportAccuracyReport,
  type RULComparison,
  type AnomalyComparison,
  type AccuracyMetrics,
  type ErrorDistribution,
  type RootCauseAnalysis,
  type ComparativeAnalysisFilters,
} from '../api/comparativeAnalysis';

export function ComparativeAnalysisView() {
  const [filters, setFilters] = useState<ComparativeAnalysisFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const [rulData, setRulData] = useState<RULComparison[]>([]);
  const [anomalyData, setAnomalyData] = useState<AnomalyComparison[]>([]);
  const [accuracyMetrics, setAccuracyMetrics] = useState<AccuracyMetrics[]>([]);
  const [errorDist, setErrorDist] = useState<ErrorDistribution[]>([]);
  const [rootCause, setRootCause] = useState<RootCauseAnalysis[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, [filters]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [rul, anomaly, metrics, errDist, rootCauseData] = await Promise.all([
        getRULComparison(filters),
        getAnomalyComparison(filters),
        getAccuracyMetrics(filters),
        getErrorDistribution(filters),
        getRootCauseAnalysis(filters),
      ]);

      setRulData(rul);
      setAnomalyData(anomaly);
      setAccuracyMetrics(metrics);
      setErrorDist(errDist);
      setRootCause(rootCauseData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    try {
      setExporting(true);
      await exportAccuracyReport(filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem' }}>Loading comparative analysis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ color: '#e53e3e', marginBottom: '1rem' }}>Error: {error}</div>
        <button onClick={loadData}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Comparative Analysis</h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3182ce',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: exporting ? 'not-allowed' : 'pointer',
            fontSize: '0.95rem',
            fontWeight: '500',
          }}
        >
          {exporting ? 'Exporting...' : 'Export Report'}
        </button>
      </div>

      {/* Filters */}
      <div style={{
        padding: '1.5rem',
        backgroundColor: '#f7fafc',
        borderRadius: '8px',
        marginBottom: '2rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Start Date</label>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e0' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>End Date</label>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e0' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Battery Type</label>
          <input
            type="text"
            placeholder="All types"
            value={filters.batteryType || ''}
            onChange={(e) => setFilters({ ...filters, batteryType: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e0' }}
          />
        </div>
      </div>

      {/* RUL Comparison Chart */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
          Predicted RUL vs Actual Lifespan
        </h2>
        <RULComparisonChart data={rulData} />
      </section>

      {/* Anomaly Predictions vs Actual Failures */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
          Anomaly Predictions vs Actual Failures
        </h2>
        <AnomalyComparisonChart data={anomalyData} />
      </section>

      {/* Accuracy Metrics by Battery Type */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
          Accuracy Metrics by Battery Type
        </h2>
        <AccuracyMetricsTable data={accuracyMetrics} />
      </section>

      {/* Error Distribution Histogram */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
          Error Distribution Histogram
        </h2>
        <ErrorDistributionChart data={errorDist} />
      </section>

      {/* Root Cause Analysis */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
          Root Cause Analysis for Poor Predictions
        </h2>
        <RootCauseTable data={rootCause} />
      </section>
    </div>
  );
}

function RULComparisonChart({ data }: { data: RULComparison[] }) {
  if (data.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#718096' }}>No RUL comparison data available</div>;
  }

  const maxValue = Math.max(...data.map(d => Math.max(d.predictedRul, d.actualLifespan || 0)));

  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f7fafc' }}>
              <th style={tableHeaderStyle}>Battery System</th>
              <th style={tableHeaderStyle}>Battery Type</th>
              <th style={tableHeaderStyle}>Predicted RUL (days)</th>
              <th style={tableHeaderStyle}>Actual Lifespan (days)</th>
              <th style={tableHeaderStyle}>Absolute Error</th>
              <th style={tableHeaderStyle}>% Error</th>
              <th style={tableHeaderStyle}>Confidence</th>
              <th style={tableHeaderStyle}>Visual</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 20).map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={tableCellStyle}>{row.batterySystemId.substring(0, 8)}</td>
                <td style={tableCellStyle}>{row.batteryType}</td>
                <td style={tableCellStyle}>{row.predictedRul.toFixed(1)}</td>
                <td style={tableCellStyle}>
                  {row.actualLifespan ? row.actualLifespan.toFixed(1) : 'N/A'}
                </td>
                <td style={tableCellStyle}>{row.absoluteError.toFixed(1)}</td>
                <td style={tableCellStyle}>
                  {row.percentageError ? `${row.percentageError.toFixed(1)}%` : 'N/A'}
                </td>
                <td style={tableCellStyle}>{(row.confidenceScore * 100).toFixed(0)}%</td>
                <td style={tableCellStyle}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <div
                      style={{
                        width: `${(row.predictedRul / maxValue) * 100}px`,
                        height: '12px',
                        backgroundColor: '#3182ce',
                        borderRadius: '2px',
                      }}
                      title={`Predicted: ${row.predictedRul.toFixed(1)}`}
                    />
                    {row.actualLifespan && (
                      <div
                        style={{
                          width: `${(row.actualLifespan / maxValue) * 100}px`,
                          height: '12px',
                          backgroundColor: '#38a169',
                          borderRadius: '2px',
                        }}
                        title={`Actual: ${row.actualLifespan.toFixed(1)}`}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem', fontSize: '0.875rem', color: '#718096' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '20px', height: '12px', backgroundColor: '#3182ce', borderRadius: '2px' }} />
          <span>Predicted RUL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '20px', height: '12px', backgroundColor: '#38a169', borderRadius: '2px' }} />
          <span>Actual Lifespan</span>
        </div>
      </div>
    </div>
  );
}

function AnomalyComparisonChart({ data }: { data: AnomalyComparison[] }) {
  if (data.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#718096' }}>No anomaly comparison data available</div>;
  }

  const metrics = {
    truePositives: data.filter(d => d.predictionType === 'true_positive').length,
    falsePositives: data.filter(d => d.predictionType === 'false_positive').length,
    falseNegatives: data.filter(d => d.predictionType === 'false_negative').length,
    trueNegatives: data.filter(d => d.predictionType === 'true_negative').length,
  };

  const total = metrics.truePositives + metrics.falsePositives + metrics.falseNegatives + metrics.trueNegatives;
  const accuracy = total > 0 ? ((metrics.truePositives + metrics.trueNegatives) / total * 100).toFixed(1) : '0';
  const precision = (metrics.truePositives + metrics.falsePositives) > 0
    ? (metrics.truePositives / (metrics.truePositives + metrics.falsePositives) * 100).toFixed(1)
    : '0';
  const recall = (metrics.truePositives + metrics.falseNegatives) > 0
    ? (metrics.truePositives / (metrics.truePositives + metrics.falseNegatives) * 100).toFixed(1)
    : '0';

  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <MetricCard label="Accuracy" value={`${accuracy}%`} color="#3182ce" />
        <MetricCard label="Precision" value={`${precision}%`} color="#38a169" />
        <MetricCard label="Recall" value={`${recall}%`} color="#d69e2e" />
        <MetricCard label="Total Predictions" value={total.toString()} color="#718096" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        <ConfusionMatrixCell
          label="True Positives"
          value={metrics.truePositives}
          color="#38a169"
          description="Correctly predicted anomalies"
        />
        <ConfusionMatrixCell
          label="False Positives"
          value={metrics.falsePositives}
          color="#e53e3e"
          description="Incorrectly predicted anomalies"
        />
        <ConfusionMatrixCell
          label="False Negatives"
          value={metrics.falseNegatives}
          color="#d69e2e"
          description="Missed actual failures"
        />
        <ConfusionMatrixCell
          label="True Negatives"
          value={metrics.trueNegatives}
          color="#3182ce"
          description="Correctly predicted normal operation"
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: '1rem',
      backgroundColor: '#f7fafc',
      borderRadius: '6px',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: '0.875rem', color: '#718096', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color }}>{value}</div>
    </div>
  );
}

function ConfusionMatrixCell({ label, value, color, description }: {
  label: string;
  value: number;
  color: string;
  description: string;
}) {
  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: 'white',
      border: `2px solid ${color}`,
      borderRadius: '8px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color, marginBottom: '0.5rem' }}>{value}</div>
      <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '0.875rem', color: '#718096' }}>{description}</div>
    </div>
  );
}

function AccuracyMetricsTable({ data }: { data: AccuracyMetrics[] }) {
  if (data.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#718096' }}>No accuracy metrics available</div>;
  }

  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      overflowX: 'auto',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f7fafc' }}>
            <th style={tableHeaderStyle}>Battery Type</th>
            <th style={tableHeaderStyle}>RUL Predictions</th>
            <th style={tableHeaderStyle}>MAE (days)</th>
            <th style={tableHeaderStyle}>RMSE (days)</th>
            <th style={tableHeaderStyle}>Avg Confidence</th>
            <th style={tableHeaderStyle}>Anomaly Precision</th>
            <th style={tableHeaderStyle}>Anomaly Recall</th>
            <th style={tableHeaderStyle}>Anomaly Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ ...tableCellStyle, fontWeight: '600' }}>{row.batteryType}</td>
              <td style={tableCellStyle}>{row.rulPredictionCount}</td>
              <td style={tableCellStyle}>{row.rulMae.toFixed(2)}</td>
              <td style={tableCellStyle}>{row.rulRmse.toFixed(2)}</td>
              <td style={tableCellStyle}>{(row.rulAvgConfidence * 100).toFixed(0)}%</td>
              <td style={tableCellStyle}>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: row.anomalyPrecision > 0.8 ? '#c6f6d5' : row.anomalyPrecision > 0.6 ? '#feebc8' : '#fed7d7',
                  color: row.anomalyPrecision > 0.8 ? '#22543d' : row.anomalyPrecision > 0.6 ? '#7c2d12' : '#742a2a',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                }}>
                  {(row.anomalyPrecision * 100).toFixed(1)}%
                </span>
              </td>
              <td style={tableCellStyle}>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: row.anomalyRecall > 0.8 ? '#c6f6d5' : row.anomalyRecall > 0.6 ? '#feebc8' : '#fed7d7',
                  color: row.anomalyRecall > 0.8 ? '#22543d' : row.anomalyRecall > 0.6 ? '#7c2d12' : '#742a2a',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                }}>
                  {(row.anomalyRecall * 100).toFixed(1)}%
                </span>
              </td>
              <td style={tableCellStyle}>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: row.anomalyAccuracy > 0.8 ? '#c6f6d5' : row.anomalyAccuracy > 0.6 ? '#feebc8' : '#fed7d7',
                  color: row.anomalyAccuracy > 0.8 ? '#22543d' : row.anomalyAccuracy > 0.6 ? '#7c2d12' : '#742a2a',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                }}>
                  {(row.anomalyAccuracy * 100).toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ErrorDistributionChart({ data }: { data: ErrorDistribution[] }) {
  if (data.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#718096' }}>No error distribution data available</div>;
  }

  const bucketSize = 10;
  const maxError = Math.max(...data.map(d => d.errorMagnitude));
  const bucketCount = Math.ceil(maxError / bucketSize);

  const buckets = Array.from({ length: bucketCount }, (_, i) => {
    const min = i * bucketSize;
    const max = (i + 1) * bucketSize;
    const count = data.filter(d => d.errorMagnitude >= min && d.errorMagnitude < max).length;
    return { min, max, count };
  });

  const maxCount = Math.max(...buckets.map(b => b.count));

  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '300px' }}>
        {buckets.map((bucket, idx) => (
          <div
            key={idx}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            <div
              style={{
                width: '100%',
                height: `${(bucket.count / maxCount) * 100}%`,
                backgroundColor: '#3182ce',
                borderRadius: '4px 4px 0 0',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: '4px',
                fontSize: '0.75rem',
                color: 'white',
                fontWeight: '600',
              }}
            >
              {bucket.count > 0 ? bucket.count : ''}
            </div>
            <div style={{
              marginTop: '8px',
              fontSize: '0.75rem',
              color: '#718096',
              transform: 'rotate(-45deg)',
              transformOrigin: 'top center',
              whiteSpace: 'nowrap',
            }}>
              {bucket.min}-{bucket.max}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '3rem', textAlign: 'center', color: '#718096', fontSize: '0.875rem' }}>
        Error Magnitude (days)
      </div>
    </div>
  );
}

function RootCauseTable({ data }: { data: RootCauseAnalysis[] }) {
  if (data.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#718096' }}>No root cause analysis data available</div>;
  }

  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      overflowX: 'auto',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f7fafc' }}>
            <th style={tableHeaderStyle}>Battery Type</th>
            <th style={tableHeaderStyle}>Poor Predictions</th>
            <th style={tableHeaderStyle}>Avg Error (days)</th>
            <th style={tableHeaderStyle}>Avg Confidence</th>
            <th style={tableHeaderStyle}>Primary Root Cause</th>
            <th style={tableHeaderStyle}>Environment Conditions</th>
            <th style={tableHeaderStyle}>Affected Facilities</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ ...tableCellStyle, fontWeight: '600' }}>{row.batteryType}</td>
              <td style={tableCellStyle}>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: row.poorPredictionCount > 10 ? '#fed7d7' : '#feebc8',
                  color: row.poorPredictionCount > 10 ? '#742a2a' : '#7c2d12',
                  borderRadius: '4px',
                  fontWeight: '600',
                }}>
                  {row.poorPredictionCount}
                </span>
              </td>
              <td style={tableCellStyle}>{row.avgError.toFixed(1)}</td>
              <td style={tableCellStyle}>{(row.avgConfidence * 100).toFixed(0)}%</td>
              <td style={{ ...tableCellStyle, fontWeight: '500', color: '#e53e3e' }}>
                {row.primaryRootCause}
              </td>
              <td style={tableCellStyle}>
                <div style={{ fontSize: '0.875rem' }}>
                  {row.environmentConditions.slice(0, 3).join(', ')}
                </div>
              </td>
              <td style={tableCellStyle}>
                <div style={{ fontSize: '0.875rem' }}>
                  {row.facilities.slice(0, 2).join(', ')}
                  {row.facilities.length > 2 && ` +${row.facilities.length - 2} more`}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tableHeaderStyle: React.CSSProperties = {
  padding: '0.75rem',
  textAlign: 'left',
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#2d3748',
  borderBottom: '2px solid #e2e8f0',
};

const tableCellStyle: React.CSSProperties = {
  padding: '0.75rem',
  fontSize: '0.875rem',
  color: '#4a5568',
};

export default ComparativeAnalysisView;
