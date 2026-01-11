import type { HeatmapMetric } from './HeatmapOverlay';

interface HeatmapLegendProps {
  metric: HeatmapMetric;
  minValue: number;
  maxValue: number;
  unit?: string;
}

const metricUnits: Record<HeatmapMetric, string> = {
  temperature: '°C',
  voltage: 'V',
  soc: '%',
  soh: '%',
};

const metricLabels: Record<HeatmapMetric, string> = {
  temperature: 'Temperature',
  voltage: 'Voltage',
  soc: 'State of Charge',
  soh: 'State of Health',
};

const gradientStyles: Record<HeatmapMetric, string> = {
  temperature: 'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)',
  voltage: 'linear-gradient(to right, #ff0000, #ff8800, #ffff00, #88ff00, #00ff00)',
  soc: 'linear-gradient(to right, #ff0000, #ff8800, #ffff00, #88ff00, #00ff00)',
  soh: 'linear-gradient(to right, #ff0000, #ff8800, #ffff00, #88ff00, #00ff00)',
};

export function HeatmapLegend({
  metric,
  minValue,
  maxValue,
  unit = metricUnits[metric],
}: HeatmapLegendProps) {
  const formatValue = (value: number) => {
    return value.toFixed(1);
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '16px',
      right: '16px',
      padding: '12px 16px',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      minWidth: '200px',
    }}>
      <div style={{
        marginBottom: '8px',
        fontWeight: 600,
        fontSize: '0.875rem',
        color: '#333',
      }}>
        {metricLabels[metric]}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}>
        <div style={{
          width: '100%',
          height: '16px',
          background: gradientStyles[metric],
          borderRadius: '4px',
          border: '1px solid rgba(0,0,0,0.1)',
        }} />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: '#666',
        }}>
          <span>{formatValue(minValue)}{unit}</span>
          <span>{formatValue((minValue + maxValue) / 2)}{unit}</span>
          <span>{formatValue(maxValue)}{unit}</span>
        </div>
      </div>

      <div style={{
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '1px solid #eee',
        fontSize: '0.7rem',
        color: '#999',
      }}>
        Real-time facility distribution
      </div>
    </div>
  );
}
