import { Link } from 'react-router-dom';
import { FacilityHealthStatus } from '../../types';

interface FacilityPopupProps {
  facility: {
    id: string;
    name: string;
    status: string;
  };
  health: FacilityHealthStatus;
}

/**
 * FacilityPopup - Popup content shown when clicking facility marker
 *
 * Displays facility name, status, alert counts by severity, and link to details
 */
export function FacilityPopup({ facility, health }: FacilityPopupProps) {
  return (
    <div className="facility-popup">
      <h3 className="text-lg font-semibold mb-2">{facility.name}</h3>

      <div className="space-y-1 mb-3">
        <div>
          <span className="font-medium">Status:</span>{' '}
          <span className={`status-${health.status}`}>{health.status}</span>
        </div>

        {health.activeAlertCount > 0 && (
          <div className="alert-summary">
            <span className="font-medium">Active Alerts:</span> {health.activeAlertCount}
            <ul className="ml-4 mt-1 text-sm">
              {health.criticalCount > 0 && (
                <li className="text-red-600">Critical: {health.criticalCount}</li>
              )}
              {health.highCount > 0 && (
                <li className="text-amber-600">High: {health.highCount}</li>
              )}
              {health.mediumCount > 0 && (
                <li className="text-yellow-600">Medium: {health.mediumCount}</li>
              )}
              {health.infoCount > 0 && (
                <li className="text-blue-600">Info: {health.infoCount}</li>
              )}
            </ul>
          </div>
        )}
      </div>

      <Link
        to={`/?facilityId=${facility.id}`}
        className="text-blue-600 hover:underline popup-view-details"
      >
        View Details →
      </Link>
    </div>
  );
}
