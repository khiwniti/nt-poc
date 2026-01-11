import { Marker, Popup } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { FacilityPopup } from './FacilityPopup';
import { FacilityHealthStatus } from '../../types';

interface FacilityMarkerProps {
  facility: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    status: string;
  };
  health: FacilityHealthStatus;
  onClick?: (facilityId: string) => void;
}

const healthColorMap: Record<FacilityHealthStatus['status'], string> = {
  healthy: '#10b981',   // green-500
  warning: '#f59e0b',   // amber-500
  critical: '#ef4444',  // red-500
  offline: '#6b7280'    // gray-500
};

/**
 * FacilityMarker - Custom Leaflet marker with health-based coloring
 *
 * - Marker color changes based on facility health status (300ms CSS transition)
 * - Shows alert count badge when facility has active alerts
 * - Opens popup on click with facility details
 */
export function FacilityMarker({ facility, health, onClick }: FacilityMarkerProps) {
  const color = healthColorMap[health.status];
  const hasAlerts = health.activeAlertCount > 0;

  // Create custom marker icon with color and badge
  const icon = divIcon({
    className: 'facility-marker',
    html: `
      <div class="marker-icon" style="background-color: ${color}">
        <div class="marker-pin"></div>
        ${hasAlerts ? `<div class="alert-badge">${health.activeAlertCount}</div>` : ''}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  return (
    <Marker
      position={[facility.latitude, facility.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(facility.id)
      }}
    >
      <Popup>
        <FacilityPopup facility={facility} health={health} />
      </Popup>
    </Marker>
  );
}
