import { useCallback, useMemo, useState, useRef } from 'react';
import Map, {
  Marker,
  Popup,
  NavigationControl,
  FullscreenControl,
  ScaleControl,
  GeolocateControl,
  type ViewStateChangeEvent,
  type MapRef,
} from 'react-map-gl';
import Supercluster from 'supercluster';
import type { BBox } from 'geojson';
import {
  type FacilityLocation,
  type MapViewport,
  type HealthStatus,
  DEFAULT_MAP_CONFIG,
} from '../types/facilityMap';
import { FacilityMarker } from './FacilityMarker';
import { ClusterMarker } from './ClusterMarker';
import { FacilityPopup } from './FacilityPopup';
import 'mapbox-gl/dist/mapbox-gl.css';

interface FacilityMapProps {
  facilities: FacilityLocation[];
  accessToken: string;
  onFacilityClick?: (facility: FacilityLocation) => void;
  onFacilitySelect?: (facility: FacilityLocation | null) => void;
  initialViewport?: MapViewport;
  mapStyle?: string;
  clusterRadius?: number;
  showControls?: boolean;
  className?: string;
}

interface ClusterProperties {
  cluster: boolean;
  cluster_id?: number;
  point_count?: number;
  facilityId?: string;
  healthStatus?: HealthStatus;
  name?: string;
  healthy?: number;
  warning?: number;
  critical?: number;
}

interface PointFeature {
  type: 'Feature';
  properties: ClusterProperties;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export function FacilityMap({
  facilities,
  accessToken,
  onFacilityClick,
  onFacilitySelect,
  initialViewport = DEFAULT_MAP_CONFIG.initialViewport!,
  mapStyle = DEFAULT_MAP_CONFIG.style!,
  clusterRadius = DEFAULT_MAP_CONFIG.clusterRadius!,
  showControls = true,
  className = '',
}: FacilityMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState<MapViewport>(initialViewport);
  const [bounds, setBounds] = useState<BBox | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<FacilityLocation | null>(null);
  const [hoveredFacilityId, setHoveredFacilityId] = useState<string | null>(null);

  // Create supercluster instance
  const supercluster = useMemo(() => {
    const cluster = new Supercluster<ClusterProperties>({
      radius: clusterRadius,
      maxZoom: 16,
      map: (props) => ({
        healthStatus: props.healthStatus,
        healthy: props.healthStatus === 'healthy' ? 1 : 0,
        warning: props.healthStatus === 'warning' ? 1 : 0,
        critical: props.healthStatus === 'critical' ? 1 : 0,
      }),
      reduce: (accumulated, props) => {
        if (accumulated && props) {
          accumulated.healthy = (accumulated.healthy || 0) + (props.healthy || 0);
          accumulated.warning = (accumulated.warning || 0) + (props.warning || 0);
          accumulated.critical = (accumulated.critical || 0) + (props.critical || 0);
        }
      },
    });
    return cluster;
  }, [clusterRadius]);

  // Convert facilities to GeoJSON points
  const points: PointFeature[] = useMemo(
    () =>
      facilities.map((facility) => ({
        type: 'Feature' as const,
        properties: {
          cluster: false,
          facilityId: facility.id,
          healthStatus: facility.healthStatus,
          name: facility.name,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [facility.coordinates.longitude, facility.coordinates.latitude],
        },
      })),
    [facilities]
  );

  // Load points into supercluster
  useMemo(() => {
    supercluster.load(points);
  }, [supercluster, points]);

  // Get clusters based on current viewport
  const clusters = useMemo(() => {
    if (!bounds) return points;

    try {
      return supercluster.getClusters(bounds, Math.floor(viewState.zoom));
    } catch {
      return points;
    }
  }, [supercluster, points, viewState.zoom, bounds]);

  const handleMove = useCallback((evt: ViewStateChangeEvent) => {
    setViewState({
      latitude: evt.viewState.latitude,
      longitude: evt.viewState.longitude,
      zoom: evt.viewState.zoom,
    });
    // Update bounds from the map after move
    const map = mapRef.current?.getMap();
    if (map) {
      const mapBounds = map.getBounds();
      if (mapBounds) {
        setBounds([
          mapBounds.getWest(),
          mapBounds.getSouth(),
          mapBounds.getEast(),
          mapBounds.getNorth(),
        ]);
      }
    }
  }, []);

  const handleMarkerClick = useCallback(
    (facility: FacilityLocation) => {
      setSelectedFacility(facility);
      onFacilitySelect?.(facility);
    },
    [onFacilitySelect]
  );

  const handleClusterClick = useCallback(
    (clusterId: number, latitude: number, longitude: number) => {
      const expansionZoom = Math.min(supercluster.getClusterExpansionZoom(clusterId), 20);
      mapRef.current?.flyTo({
        center: [longitude, latitude],
        zoom: expansionZoom,
        duration: 500,
      });
    },
    [supercluster]
  );

  const handlePopupClose = useCallback(() => {
    setSelectedFacility(null);
    onFacilitySelect?.(null);
  }, [onFacilitySelect]);

  const handleViewDetails = useCallback(
    (facility: FacilityLocation) => {
      onFacilityClick?.(facility);
    },
    [onFacilityClick]
  );

  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) {
      const mapBounds = map.getBounds();
      if (mapBounds) {
        setBounds([
          mapBounds.getWest(),
          mapBounds.getSouth(),
          mapBounds.getEast(),
          mapBounds.getNorth(),
        ]);
      }
    }
  }, []);

  const getFacilityById = useCallback(
    (id: string) => facilities.find((f) => f.id === id),
    [facilities]
  );

  return (
    <div className={`facility-map ${className}`} style={{ width: '100%', height: '100%' }}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleMove}
        onLoad={handleMapLoad}
        mapboxAccessToken={accessToken}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
        attributionControl={true}
        reuseMaps
      >
        {showControls && (
          <>
            <NavigationControl position="top-right" />
            <FullscreenControl position="top-right" />
            <ScaleControl position="bottom-left" />
            <GeolocateControl position="top-right" />
          </>
        )}

        {clusters.map((cluster) => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          const { cluster: isCluster, cluster_id, point_count, facilityId } = cluster.properties;

          if (isCluster) {
            return (
              <Marker
                key={`cluster-${cluster_id}`}
                latitude={latitude}
                longitude={longitude}
                onClick={() => handleClusterClick(cluster_id!, latitude, longitude)}
              >
                <ClusterMarker
                  count={point_count || 0}
                  healthBreakdown={{
                    healthy: cluster.properties.healthy || 0,
                    warning: cluster.properties.warning || 0,
                    critical: cluster.properties.critical || 0,
                  }}
                />
              </Marker>
            );
          }

          const facility = getFacilityById(facilityId!);
          if (!facility) return null;

          return (
            <Marker
              key={facility.id}
              latitude={latitude}
              longitude={longitude}
              onClick={() => handleMarkerClick(facility)}
            >
              <FacilityMarker
                healthStatus={facility.healthStatus}
                isHovered={hoveredFacilityId === facility.id}
                isSelected={selectedFacility?.id === facility.id}
                onMouseEnter={() => setHoveredFacilityId(facility.id)}
                onMouseLeave={() => setHoveredFacilityId(null)}
              />
            </Marker>
          );
        })}

        {selectedFacility && (
          <Popup
            latitude={selectedFacility.coordinates.latitude}
            longitude={selectedFacility.coordinates.longitude}
            onClose={handlePopupClose}
            closeButton={true}
            closeOnClick={false}
            anchor="bottom"
            offset={25}
          >
            <FacilityPopup
              facility={selectedFacility}
              onViewDetails={() => handleViewDetails(selectedFacility)}
            />
          </Popup>
        )}
      </Map>
    </div>
  );
}

export default FacilityMap;
