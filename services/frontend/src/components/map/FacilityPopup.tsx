import React from 'react';
import { X, AlertCircle, Activity } from 'lucide-react';
import { Popup } from 'react-map-gl/mapbox';
import { useNavigate } from 'react-router-dom';
import type { PopupProps } from './types';

export const FacilityPopup: React.FC<PopupProps> = ({ facility, onClose }) => {
  const navigate = useNavigate();

  const handleViewDetails = () => {
    navigate(`/zones/${facility.id}`);
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusClass = (status: string) => {
    return `status-${status}`;
  };

  return (
    <Popup
      latitude={facility.latitude}
      longitude={facility.longitude}
      onClose={onClose}
      closeButton={false}
      closeOnClick={false}
      className="facility-popup map-popup"
      anchor="bottom"
      offset={[0, -10] as [number, number]}
    >
      <div className="popup-content marker-popup">
        <button
          className="popup-close leaflet-popup-close-button mapbox-popup-close-button"
          onClick={onClose}
          aria-label="Close popup"
          type="button"
        >
          <X size={16} />
        </button>

        <div className="popup-header">
          <h3 className="popup-title">{facility.name}</h3>
          <span className={`popup-status ${getStatusClass(facility.status)}`}>
            <Activity size={14} />
            {getStatusLabel(facility.status)}
          </span>
        </div>

        {facility.alertCount !== undefined && facility.alertCount > 0 && (
          <div className="popup-alerts">
            <AlertCircle size={14} />
            <span>{facility.alertCount} active alert{facility.alertCount !== 1 ? 's' : ''}</span>
          </div>
        )}

        {facility.description && <p className="popup-description">{facility.description}</p>}

        <button
          className="popup-view-details"
          onClick={handleViewDetails}
          type="button"
          aria-label={`View details for ${facility.name}`}
        >
          View Details →
        </button>
      </div>
    </Popup>
  );
};
