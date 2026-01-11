import React from 'react';
import { Marker } from 'react-map-gl/mapbox';
import type { Facility } from './types';
import { FACILITY_COLORS } from './constants';

interface FacilityMarkersProps {
  facilities: Facility[];
  selectedFacility: Facility | null;
  onMarkerClick: (facility: Facility) => void;
}

export const FacilityMarkers: React.FC<FacilityMarkersProps> = ({
  facilities,
  selectedFacility,
  onMarkerClick,
}) => {
  const getMarkerColor = (facility: Facility): string => {
    return FACILITY_COLORS[facility.status] || FACILITY_COLORS.active;
  };

  const getMarkerSize = (facility: Facility): number => {
    // Make critical facilities slightly larger
    return facility.status === 'critical' ? 32 : 24;
  };

  return (
    <>
      {facilities.map((facility) => (
        <Marker
          key={facility.id}
          latitude={facility.latitude}
          longitude={facility.longitude}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            onMarkerClick(facility);
          }}
        >
          <div
            className={`facility-marker map-marker mapbox-marker ${facility.status === 'critical' ? 'critical-marker' : ''} ${selectedFacility?.id === facility.id ? 'selected' : ''}`}
            data-facility-id={facility.id}
            data-status={facility.status}
            data-severity={facility.status === 'critical' ? 'high' : undefined}
            role="button"
            aria-label={`${facility.name} - ${facility.status}`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onMarkerClick(facility);
              }
            }}
          >
            <svg
              width={getMarkerSize(facility)}
              height={getMarkerSize(facility)}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="marker-icon"
            >
              <circle
                cx="12"
                cy="12"
                r="8"
                fill={getMarkerColor(facility)}
                stroke="white"
                strokeWidth="2"
                className={facility.status === 'critical' ? 'pulse' : ''}
              />
              <circle cx="12" cy="12" r="4" fill="white" opacity="0.8" />
            </svg>
          </div>
        </Marker>
      ))}
    </>
  );
};
