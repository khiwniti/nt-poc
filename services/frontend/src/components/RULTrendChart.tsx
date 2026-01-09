import { useRef } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceLine,
  Line,
} from 'recharts';
import type { RULPrediction } from '../types/rulPrediction';

interface RULTrendChartProps {
  predictions: RULPrediction[];
  warningThreshold?: number; // in days, default 30
}

interface ChartDataPoint {
  date: string;
  timestamp: number;
  rul: number;
  upperBound: number;
  lowerBound: number;
  confidence: number;
  modelVersion: string;
}

const WARNING_THRESHOLD_DEFAULT = 30; // days

export function RULTrendChart({ predictions, warningThreshold = WARNING_THRESHOLD_DEFAULT }: RULTrendChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  // Transform predictions into chart data with confidence bands
  const chartData: ChartDataPoint[] = predictions
    .map((pred) => {
      const date = new Date(pred.predictionDate);
      const stdDev = pred.predictedRUL * (1 - pred.confidence); // Estimate std dev from confidence
      
      return {
        date: date.toLocaleDateString(),
        timestamp: date.getTime(),
        rul: pred.predictedRUL,
        upperBound: pred.predictedRUL + stdDev,
        lowerBound: Math.max(0, pred.predictedRUL - stdDev),
        confidence: pred.confidence,
        modelVersion: pred.modelVersion,
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);

  const hasThresholdCrossing = chartData.some((d) => d.rul <= warningThreshold);

  const exportToPNG = async () => {
    if (!chartRef.current) return;

    try {
      // Dynamic import of html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `rul-trend-${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Failed to export chart:', error);
      alert('Failed to export chart. Please try again.');
    }
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataPoint }> }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      
      return (
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{data.date}</p>
          <p style={{ margin: '4px 0', color: '#2563eb' }}>
            <strong>Predicted RUL:</strong> {data.rul.toFixed(1)} days
          </p>
          <p style={{ margin: '4px 0', color: '#059669' }}>
            <strong>Confidence:</strong> {(data.confidence * 100).toFixed(1)}%
          </p>
          <p style={{ margin: '4px 0', color: '#7c3aed' }}>
            <strong>Range:</strong> {data.lowerBound.toFixed(1)} - {data.upperBound.toFixed(1)} days
          </p>
          <p style={{ margin: '4px 0', fontSize: '0.875rem', color: '#6b7280' }}>
            Model: {data.modelVersion}
          </p>
        </div>
      );
    }
    return null;
  };

  if (predictions.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        <p>No RUL prediction data available</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>Remaining Useful Life Trend</h3>
          {hasThresholdCrossing && (
            <p style={{ margin: '0.5rem 0 0 0', color: '#dc2626', fontSize: '0.875rem' }}>
              ⚠️ Warning: RUL predictions below {warningThreshold}-day threshold detected
            </p>
          )}
        </div>
        <button
          onClick={exportToPNG}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1d4ed8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb';
          }}
        >
          📥 Export to PNG
        </button>
      </div>

      <div ref={chartRef} style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              style={{ fontSize: '0.75rem' }}
            />
            <YAxis
              label={{ value: 'Days Remaining', angle: -90, position: 'insideLeft' }}
              stroke="#6b7280"
              style={{ fontSize: '0.75rem' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '0.875rem' }}
              iconType="line"
            />
            
            {/* Warning threshold line */}
            <ReferenceLine
              y={warningThreshold}
              stroke="#dc2626"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `${warningThreshold}-day threshold`,
                position: 'right',
                fill: '#dc2626',
                fontSize: 12,
              }}
            />

            {/* Confidence band (±1 std dev) */}
            <Area
              type="monotone"
              dataKey="upperBound"
              stroke="none"
              fill="#93c5fd"
              fillOpacity={0.3}
              name="Upper Bound (±1σ)"
            />
            <Area
              type="monotone"
              dataKey="lowerBound"
              stroke="none"
              fill="#93c5fd"
              fillOpacity={0.3}
              name="Lower Bound (±1σ)"
            />

            {/* Main RUL prediction line */}
            <Line
              type="monotone"
              dataKey="rul"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 4, fill: '#2563eb' }}
              activeDot={{ r: 6 }}
              name="Predicted RUL"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
        <p style={{ margin: '0.25rem 0' }}>
          <strong>Total Predictions:</strong> {predictions.length}
        </p>
        <p style={{ margin: '0.25rem 0' }}>
          <strong>Date Range:</strong> {chartData[0]?.date} - {chartData[chartData.length - 1]?.date}
        </p>
      </div>
    </div>
  );
}
