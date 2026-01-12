import { LeafletMap } from '../components/Map/LeafletMap';
import { FacilityMarker } from '../components/Map/FacilityMarker';
import { ConnectionIndicator } from '../components/Map/ConnectionIndicator';
import { useRealtimeFacilityMap } from '../hooks/useRealtimeFacilityMap';
import { useMapLayers } from '../hooks/useMapLayers';
import { MapLayerControls } from '../components/geospatial/MapLayerControls';

/**
 * MapPage - Real-time facility status map
 *
 * Features:
 * - Interactive map with facility markers
 * - Real-time marker color updates via SSE
 * - Alert count badges on markers
 * - Facility popups with health details
 * - Connection state indicator
 * - Map style switcher (Standard, Satellite, Street, Dark)
 */
export function MapPage() {
  const { facilities, healthMap, loading, error, connectionState } = useRealtimeFacilityMap();
  const { layers, toggleLayer, setMapStyle, savePreferences } = useMapLayers();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="map-loading-skeleton">Loading map...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="map-error text-red-600" role="alert">{error}</div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full">
      {/* Connection indicator overlay */}
      <div className="absolute top-4 right-4 z-[1000]">
        <ConnectionIndicator state={connectionState} />
      </div>

      {/* Map layer controls */}
      <div className="absolute top-4 left-4 z-[1000]">
        <MapLayerControls
          layers={layers}
          onLayerToggle={toggleLayer}
          onStyleChange={setMapStyle}
          onSavePreferences={savePreferences}
        />
      </div>

      {/* Map container */}
      <LeafletMap mapStyle={layers.mapStyle}>
        {facilities.map(facility => {
          const health = healthMap.get(facility.id);
          if (!health || !facility.latitude || !facility.longitude) return null;

          return (
            <FacilityMarker
              key={facility.id}
              facility={facility}
              health={health}
            />
          );
        })}
      </LeafletMap>
    </div>
  );
}
