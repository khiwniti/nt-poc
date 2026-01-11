import { ThermometerSun, Zap, Battery, Activity } from 'lucide-react';
import type { HeatmapMetric } from './HeatmapOverlay';

interface HeatmapControlsProps {
  enabled: boolean;
  metric: HeatmapMetric;
  onToggle: () => void;
  onMetricChange: (metric: HeatmapMetric) => void;
}

const metricOptions: Array<{ value: HeatmapMetric; label: string; icon: React.ReactNode }> = [
  { value: 'temperature', label: 'Temperature', icon: <ThermometerSun size={16} /> },
  { value: 'voltage', label: 'Voltage', icon: <Zap size={16} /> },
  { value: 'soc', label: 'SoC', icon: <Battery size={16} /> },
  { value: 'soh', label: 'SoH', icon: <Activity size={16} /> },
];

export function HeatmapControls({
  enabled,
  metric,
  onToggle,
  onMetricChange,
}: HeatmapControlsProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      alignItems: 'center',
      padding: '0.75rem',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        cursor: 'pointer',
        fontWeight: 500,
      }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggle}
          style={{
            width: '18px',
            height: '18px',
            cursor: 'pointer',
          }}
        />
        Heatmap Overlay
      </label>

      {enabled && (
        <>
          <div style={{
            width: '1px',
            height: '24px',
            backgroundColor: '#ddd',
          }} />

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {metricOptions.map(option => (
              <button
                key={option.value}
                onClick={() => onMetricChange(option.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: '1px solid',
                  borderColor: metric === option.value ? '#2196F3' : '#ddd',
                  borderRadius: '6px',
                  backgroundColor: metric === option.value ? '#E3F2FD' : '#fff',
                  color: metric === option.value ? '#2196F3' : '#666',
                  cursor: 'pointer',
                  fontWeight: metric === option.value ? 600 : 400,
                  fontSize: '0.875rem',
                  transition: 'all 0.2s',
                }}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
