import { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { calculateFacilityHealth, getHealthColor } from '../utils/facilityHealth';

interface Facility {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  status: string;
  total_zones?: number;
  averageSoH?: number;
  averageSoC?: number;
  activeAlerts?: number;
}

interface FacilityMapProps {
  facilities: Facility[];
  onMarkerClick?: (facility: Facility) => void;
  isMobile?: boolean;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_API_KEY || '';

export const FacilityMap: React.FC<FacilityMapProps> = ({
  facilities,
  onMarkerClick,
  isMobile = false,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  const facilitiesWithHealth = useMemo(() => {
    return facilities.map((facility) => ({
      ...facility,
      health: calculateFacilityHealth({
        averageSoH: facility.averageSoH,
        averageSoC: facility.averageSoC,
        activeAlerts: facility.activeAlerts,
        status: facility.status,
      }),
    }));
  }, [facilities]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!MAPBOX_TOKEN) {
      console.warn('Mapbox token not found. Using fallback display.');
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const initialCenter: [number, number] =
      facilities.length > 0
        ? [
            facilities.reduce((sum, f) => sum + f.longitude, 0) / facilities.length,
            facilities.reduce((sum, f) => sum + f.latitude, 0) / facilities.length,
          ]
        : [-98.5795, 39.8283];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: initialCenter,
      zoom: 3,
      attributionControl: true,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: false,
      }),
      'top-right'
    );

    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    if (!isMobile) {
      map.current.addControl(new mapboxgl.ScaleControl({ unit: 'imperial' }), 'bottom-left');
    }

    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-right'
    );

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !mapLoaded || facilitiesWithHealth.length === 0) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    const geojsonData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: facilitiesWithHealth.map((facility) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [facility.longitude, facility.latitude],
        },
        properties: {
          id: facility.id,
          name: facility.name,
          location: facility.location,
          status: facility.status,
          health: facility.health,
          total_zones: facility.total_zones,
          activeAlerts: facility.activeAlerts,
        },
      })),
    };

    if (map.current.getSource('facilities')) {
      (map.current.getSource('facilities') as mapboxgl.GeoJSONSource).setData(geojsonData);
    } else {
      map.current.addSource('facilities', {
        type: 'geojson',
        data: geojsonData,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'facilities',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6',
            10,
            '#f1f075',
            30,
            '#f28cb1',
          ],
          'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 30, 40],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'facilities',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      map.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'facilities',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': isMobile ? 8 : 10,
          'circle-color': [
            'match',
            ['get', 'health'],
            'healthy',
            '#10b981',
            'warning',
            '#f59e0b',
            'critical',
            '#ef4444',
            '#64748b',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      map.current.on('click', 'clusters', (e) => {
        const features = map.current?.queryRenderedFeatures(e.point, {
          layers: ['clusters'],
        });
        if (!features || features.length === 0 || !map.current) return;

        const clusterId = features[0].properties?.cluster_id;
        const source = map.current.getSource('facilities') as mapboxgl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || !map.current) return;

          const coordinates = (features[0].geometry as GeoJSON.Point).coordinates;
          map.current.easeTo({
            center: coordinates as [number, number],
            zoom: zoom || map.current.getZoom() + 2,
          });
        });
      });

      map.current.on('click', 'unclustered-point', (e) => {
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [
          number,
          number,
        ];
        const props = feature.properties!;

        const facility = facilitiesWithHealth.find((f) => f.id === props.id);
        if (facility && onMarkerClick) {
          onMarkerClick(facility);
        }

        const healthColor = getHealthColor(props.health);
        const statusEmoji =
          props.status === 'active' ? '✓' : props.status === 'maintenance' ? '⚙' : '⚠';

        const popupHTML = `
          <div style="padding: 12px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
              ${props.name}
            </h3>
            <p style="margin: 4px 0; font-size: 14px; color: #666;">
              📍 ${props.location}
            </p>
            ${props.total_zones ? `<p style="margin: 4px 0; font-size: 14px;">🔋 ${props.total_zones} zones</p>` : ''}
            ${props.activeAlerts ? `<p style="margin: 4px 0; font-size: 14px; color: #ef4444;">⚠ ${props.activeAlerts} active alerts</p>` : ''}
            <div style="
              margin-top: 8px;
              padding: 4px 8px;
              background-color: ${healthColor}15;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
              text-align: center;
              color: ${healthColor};
              border: 2px solid ${healthColor};
            ">
              ${statusEmoji} ${props.health.toUpperCase()}
            </div>
          </div>
        `;

        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        new mapboxgl.Popup({ offset: 25 }).setLngLat(coordinates).setHTML(popupHTML).addTo(map.current!);
      });

      map.current.on('mouseenter', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
      map.current.on('mouseenter', 'unclustered-point', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'unclustered-point', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    }

    facilitiesWithHealth.forEach((facility) => {
      bounds.extend([facility.longitude, facility.latitude]);
    });

    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, {
        padding: isMobile ? 40 : 80,
        maxZoom: 15,
      });
    }
  }, [facilitiesWithHealth, mapLoaded, isMobile, onMarkerClick]);

  if (!MAPBOX_TOKEN) {
    return (
      <div
        style={{
          width: '100%',
          height: isMobile ? '100vh' : '600px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f3f4f6',
          color: '#6b7280',
          fontSize: '16px',
          textAlign: 'center',
          padding: '20px',
        }}
      >
        <div>
          <p style={{ marginBottom: '8px', fontWeight: 'bold' }}>Mapbox token not configured</p>
          <p style={{ fontSize: '14px' }}>Set VITE_MAPBOX_API_KEY environment variable</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: isMobile ? '100vh' : '600px',
        position: 'relative',
      }}
    />
  );
};
