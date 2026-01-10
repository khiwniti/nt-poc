import { useMemo } from 'react';
import { HEALTH_STATUS_COLORS } from '../types/facilityMap';

interface ClusterMarkerProps {
  count: number;
  healthBreakdown: {
    healthy: number;
    warning: number;
    critical: number;
  };
  size?: number;
}

export function ClusterMarker({ count, healthBreakdown, size = 40 }: ClusterMarkerProps) {
  // Calculate dominant health status for cluster color
  const { dominantColor, segments } = useMemo(() => {
    const total = healthBreakdown.healthy + healthBreakdown.warning + healthBreakdown.critical;

    let dominant: keyof typeof HEALTH_STATUS_COLORS = 'healthy';
    if (healthBreakdown.critical > 0) {
      dominant = 'critical';
    } else if (healthBreakdown.warning > 0) {
      dominant = 'warning';
    }

    // Calculate pie segments
    const segs: Array<{ color: string; percentage: number; offset: number }> = [];
    let offset = 0;

    if (healthBreakdown.healthy > 0) {
      const percentage = (healthBreakdown.healthy / total) * 100;
      segs.push({ color: HEALTH_STATUS_COLORS.healthy, percentage, offset });
      offset += percentage;
    }
    if (healthBreakdown.warning > 0) {
      const percentage = (healthBreakdown.warning / total) * 100;
      segs.push({ color: HEALTH_STATUS_COLORS.warning, percentage, offset });
      offset += percentage;
    }
    if (healthBreakdown.critical > 0) {
      const percentage = (healthBreakdown.critical / total) * 100;
      segs.push({ color: HEALTH_STATUS_COLORS.critical, percentage, offset });
    }

    return { dominantColor: HEALTH_STATUS_COLORS[dominant], segments: segs };
  }, [healthBreakdown]);

  // Scale size based on count
  const scaledSize = Math.min(size + Math.log10(count) * 10, 70);
  const radius = scaledSize / 2;

  return (
    <div
      data-testid="cluster-marker"
      data-count={count}
      style={{
        cursor: 'pointer',
        transform: 'translate(-50%, -50%)',
      }}
      role="button"
      aria-label={`Cluster of ${count} facilities`}
      tabIndex={0}
    >
      <svg
        width={scaledSize}
        height={scaledSize}
        viewBox={`0 0 ${scaledSize} ${scaledSize}`}
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
        }}
      >
        {/* Background circle */}
        <circle
          cx={radius}
          cy={radius}
          r={radius - 2}
          fill="white"
          stroke={dominantColor}
          strokeWidth="2"
        />

        {/* Pie segments showing health breakdown */}
        {segments.map((segment, index) => {
          const circumference = 2 * Math.PI * (radius - 6);
          const strokeDasharray = `${(segment.percentage / 100) * circumference} ${circumference}`;
          const strokeDashoffset = -(segment.offset / 100) * circumference;

          return (
            <circle
              key={index}
              cx={radius}
              cy={radius}
              r={radius - 6}
              fill="transparent"
              stroke={segment.color}
              strokeWidth="4"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${radius} ${radius})`}
            />
          );
        })}

        {/* Count text */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#374151"
          fontSize={scaledSize / 3}
          fontWeight="bold"
        >
          {count}
        </text>
      </svg>
    </div>
  );
}

export default ClusterMarker;
