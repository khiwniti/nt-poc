import React, { useState, useCallback, useEffect } from 'react';
import MapGL, { NavigationControl, ScaleControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapStore } from '../../stores/mapStore';
import { FacilityMarkers } from './FacilityMarkers';
import { FacilityPopup } from './FacilityPopup';
import { MapStyleSwitcher } from './MapStyleSwitcher';
import { MapLoadingSkeleton } from './MapLoadingSkeleton';
import { DEFAULT_MAP_CONFIG } from './constants';
import type { Facility } from './types';

interface MapProps {
  facilities: Facility[];
}

export const Map: React.FC<MapProps> = ({ facilities }) => {
  const { mapStyle, selectedFacility, setSelectedFacility } = useMapStore();
  const [viewState, setViewState] = useState({
    longitude: DEFAULT_MAP_CONFIG.center[0],
    latitude: DEFAULT_MAP_CONFIG.center[1],
    zoom: DEFAULT_MAP_CONFIG.zoom,
  });
  const [isLoading, setIsLoading] = useState(true);

  const mapboxToken = import.meta.env.VITE_MAPBOX_API_KEY;

  // Load style preference on mount
  useEffect(() => {
    const { loadStylePreference } = useMapStore.getState();
    loadStylePreference();
  }, []);

  const handleMarkerClick = useCallback(
    (facility: Facility) => {
      setSelectedFacility(facility);
      // Center map on selected facility
      setViewState((prev) => ({
        ...prev,
        longitude: facility.longitude,
        latitude: facility.latitude,
        zoom: Math.max(prev.zoom, 10), // Zoom in if not already zoomed
      }));
    },
    [setSelectedFacility]
  );

  const handleClosePopup = useCallback(() => {
    setSelectedFacility(null);
  }, [setSelectedFacility]);

  const handleMapLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // If no API key, show error
  if (!mapboxToken) {
    return (
      <div className="map-error" role="alert">
        <p>
          Mapbox API key is not configured. Please set VITE_MAPBOX_API_KEY in your environment
          variables.
        </p>
      </div>
    );
  }

  return (
    <div className="map-container mapbox-container" id="map">
      {isLoading && <MapLoadingSkeleton />}

      <MapGL
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onLoad={handleMapLoad}
        mapStyle={mapStyle}
        mapboxAccessToken={mapboxToken}
        style={{ width: '100%', height: '100%' }}
        minZoom={DEFAULT_MAP_CONFIG.minZoom}
        maxZoom={DEFAULT_MAP_CONFIG.maxZoom}
        attributionControl={true}
      >
        {/* Zoom Controls */}
        <NavigationControl position="bottom-right" showCompass={true} />

        {/* Scale Control */}
        <ScaleControl position="bottom-left" />

        {/* Map Style Switcher */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 1,
          }}
        >
          <MapStyleSwitcher />
        </div>

        {/* Facility Markers */}
        <FacilityMarkers
          facilities={facilities}
          selectedFacility={selectedFacility}
          onMarkerClick={handleMarkerClick}
        />

        {/* Facility Popup */}
        {selectedFacility && (
          <FacilityPopup facility={selectedFacility} onClose={handleClosePopup} />
        )}
      </MapGL>
    </div>
  );
};
