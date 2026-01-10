import { AlertTriangle, Activity, MapPin, Clock, ExternalLink } from 'lucide-react';
import { type FacilityLocation, HEALTH_STATUS_COLORS } from '../types/facilityMap';

interface FacilityPopupProps {
  facility: FacilityLocation;
  onViewDetails?: () => void;
}

export function FacilityPopup({ facility, onViewDetails }: FacilityPopupProps) {
  const healthColor = HEALTH_STATUS_COLORS[facility.healthStatus];
  const lastUpdated = new Date(facility.lastUpdated).toLocaleString();

  return (
    <div
      className="facility-popup"
      data-testid="facility-popup"
      style={{
        minWidth: '240px',
        padding: '12px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '12px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600 }}>{facility.name}</h3>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#6b7280',
            fontSize: '12px',
          }}
        >
          <MapPin size={12} />
          <span>{facility.location}</span>
        </div>
      </div>

      {/* Health Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          padding: '8px 12px',
          backgroundColor: `${healthColor}15`,
          borderRadius: '6px',
          border: `1px solid ${healthColor}40`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={16} style={{ color: healthColor }} />
          <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>
            {facility.healthStatus}
          </span>
        </div>
        <div
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: healthColor,
          }}
        >
          {facility.healthScore}%
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            padding: '8px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '18px', fontWeight: 600 }}>{facility.totalZones}</div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>Zones</div>
        </div>
        <div
          style={{
            padding: '8px',
            backgroundColor:
              facility.activeAlerts > 0 ? `${HEALTH_STATUS_COLORS.critical}15` : '#f3f4f6',
            borderRadius: '4px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '18px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              color: facility.activeAlerts > 0 ? HEALTH_STATUS_COLORS.critical : 'inherit',
            }}
          >
            {facility.activeAlerts > 0 && <AlertTriangle size={14} />}
            {facility.activeAlerts}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>Active Alerts</div>
        </div>
      </div>

      {/* Last Updated */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          color: '#9ca3af',
          marginBottom: '12px',
        }}
      >
        <Clock size={10} />
        <span>Updated: {lastUpdated}</span>
      </div>

      {/* View Details Button */}
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          style={{
            width: '100%',
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
        >
          <span>View Details</span>
          <ExternalLink size={14} />
        </button>
      )}
    </div>
  );
}

export default FacilityPopup;
