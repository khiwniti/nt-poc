import { type HealthStatus, HEALTH_STATUS_COLORS } from '../types/facilityMap';

interface FacilityMarkerProps {
  healthStatus: HealthStatus;
  isHovered?: boolean;
  isSelected?: boolean;
  size?: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function FacilityMarker({
  healthStatus,
  isHovered = false,
  isSelected = false,
  size = 24,
  onMouseEnter,
  onMouseLeave,
}: FacilityMarkerProps) {
  const color = HEALTH_STATUS_COLORS[healthStatus];
  const scale = isHovered || isSelected ? 1.2 : 1;
  const actualSize = size * scale;

  return (
    <div
      data-testid="facility-marker"
      data-health-status={healthStatus}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        cursor: 'pointer',
        transform: `translate(-50%, -50%)`,
        transition: 'transform 0.2s ease-in-out',
      }}
      role="button"
      aria-label={`Facility marker - ${healthStatus} status`}
      tabIndex={0}
    >
      <svg
        width={actualSize}
        height={actualSize * 1.3}
        viewBox="0 0 24 31"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: isSelected
            ? 'drop-shadow(0 0 4px rgba(0,0,0,0.4))'
            : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
        }}
      >
        {/* Pin shape */}
        <path
          d="M12 0C5.373 0 0 5.373 0 12c0 7.5 12 19 12 19s12-11.5 12-19c0-6.627-5.373-12-12-12z"
          fill={color}
        />
        {/* White inner circle */}
        <circle cx="12" cy="11" r="6" fill="white" />
        {/* Health indicator dot */}
        <circle cx="12" cy="11" r="4" fill={color} />
        {/* Pulse animation for critical */}
        {healthStatus === 'critical' && (
          <circle cx="12" cy="11" r="8" fill={color} opacity="0.3">
            <animate attributeName="r" from="8" to="14" dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.3" to="0" dur="1s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>
    </div>
  );
}

export default FacilityMarker;
