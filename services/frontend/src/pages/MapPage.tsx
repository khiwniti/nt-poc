import { LeafletMap } from '../components/Map/LeafletMap';
import { FacilityMarker } from '../components/Map/FacilityMarker';
import { ConnectionIndicator } from '../components/Map/ConnectionIndicator';
import { useRealtimeFacilityMap } from '../hooks/useRealtimeFacilityMap';

/**
 * MapPage - Real-time facility status map
 *
 * Features:
 * - Interactive map with facility markers
 * - Real-time marker color updates via SSE
 * - Alert count badges on markers
 * - Facility popups with health details
 * - Connection state indicator
 */
export function MapPage() {
  const { facilities, healthMap, loading, error, connectionState } = useRealtimeFacilityMap();

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

      {/* Map container */}
      <LeafletMap>
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
