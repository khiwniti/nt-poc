import type { CSSProperties } from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { FacilityMarker, type FacilityMarkerData } from './FacilityMarker';
import { MapExportControls, type ExportFormat } from './MapExportControls';
import {
  exportMapAsPNG,
  exportFacilitiesAsGeoJSON,
  exportFacilitiesAsKML,
} from '../../geospatial/mapExport';

export interface FacilityMapProps {
  facilities: FacilityMarkerData[];
  selectedFacilityId?: string;
  onSelectFacility?: (facilityId: string) => void;
  ariaLabel?: string;
  height?: number | string;
  highContrastMode?: boolean;
  filters?: Record<string, unknown>;
  showExportControls?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computePositions(facilities: FacilityMarkerData[]) {
  if (facilities.length === 0) return new Map<string, { xPercent: number; yPercent: number }>();
  if (facilities.length === 1) {
    return new Map([[facilities[0].id, { xPercent: 50, yPercent: 50 }]]);
  }

  const lats = facilities.map((f) => f.coordinates.latitude);
  const lngs = facilities.map((f) => f.coordinates.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latSpan = Math.max(1e-9, maxLat - minLat);
  const lngSpan = Math.max(1e-9, maxLng - minLng);

  const positions = new Map<string, { xPercent: number; yPercent: number }>();
  for (const facility of facilities) {
    const x = ((facility.coordinates.longitude - minLng) / lngSpan) * 100;
    const y = (1 - (facility.coordinates.latitude - minLat) / latSpan) * 100;
    positions.set(facility.id, { xPercent: clamp(x, 0, 100), yPercent: clamp(y, 0, 100) });
  }
  return positions;
}

export function FacilityMap({
  facilities,
  selectedFacilityId,
  onSelectFacility,
  ariaLabel = 'Facility map',
  height = 320,
  highContrastMode = false,
  filters,
  showExportControls = true,
}: FacilityMapProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [zoom, setZoom] = useState<number>(1);
  const [announcement, setAnnouncement] = useState<string>('');
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const positions = computePositions(facilities);

  // Focus management
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < facilities.length) {
      const facilityId = facilities[focusedIndex].id;
      const markerElement = markerRefs.current.get(facilityId);
      markerElement?.focus();
    }
  }, [focusedIndex, facilities]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (facilities.length === 0) return;

      let handled = false;
      let newAnnouncement = '';

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) => {
            const nextIndex = (prev + 1) % facilities.length;
            newAnnouncement = `Focused on ${facilities[nextIndex].name}`;
            return nextIndex;
          });
          handled = true;
          break;

        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) => {
            const nextIndex = prev <= 0 ? facilities.length - 1 : prev - 1;
            newAnnouncement = `Focused on ${facilities[nextIndex].name}`;
            return nextIndex;
          });
          handled = true;
          break;

        case '+':
        case '=':
          event.preventDefault();
          setZoom((prev) => Math.min(prev + 0.2, 2));
          newAnnouncement = `Zoomed in to ${Math.round((zoom + 0.2) * 100)}%`;
          handled = true;
          break;

        case '-':
        case '_':
          event.preventDefault();
          setZoom((prev) => Math.max(prev - 0.2, 0.5));
          newAnnouncement = `Zoomed out to ${Math.round((zoom - 0.2) * 100)}%`;
          handled = true;
          break;

        case 'Enter':
        case ' ':
          if (focusedIndex >= 0 && focusedIndex < facilities.length) {
            event.preventDefault();
            const facility = facilities[focusedIndex];
            onSelectFacility?.(facility.id);
            newAnnouncement = `Selected ${facility.name}`;
            handled = true;
          }
          break;

        case 'Home':
          event.preventDefault();
          setFocusedIndex(0);
          if (facilities.length > 0) {
            newAnnouncement = `Focused on first facility: ${facilities[0].name}`;
          }
          handled = true;
          break;

        case 'End':
          event.preventDefault();
          setFocusedIndex(facilities.length - 1);
          if (facilities.length > 0) {
            newAnnouncement = `Focused on last facility: ${facilities[facilities.length - 1].name}`;
          }
          handled = true;
          break;
      }

      if (handled && newAnnouncement) {
        setAnnouncement(newAnnouncement);
      }
    },
    [facilities, focusedIndex, onSelectFacility, zoom]
  );

  // Clear announcements after they've been read
  useEffect(() => {
    if (announcement) {
      const timer = setTimeout(() => setAnnouncement(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [announcement]);

  const handleMarkerRef = useCallback((facilityId: string, element: HTMLButtonElement | null) => {
    if (element) {
      markerRefs.current.set(facilityId, element);
    } else {
      markerRefs.current.delete(facilityId);
    }
  }, []);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!mapRef.current) return;

      try {
        switch (format) {
          case 'png':
            await exportMapAsPNG(mapRef.current, 'facility-map.png');
            setAnnouncement('Map exported as PNG');
            break;
          case 'geojson':
            exportFacilitiesAsGeoJSON(facilities, filters, 'facilities.geojson');
            setAnnouncement('Facilities exported as GeoJSON');
            break;
          case 'kml':
            exportFacilitiesAsKML(facilities, filters, 'facilities.kml');
            setAnnouncement('Facilities exported as KML');
            break;
        }
      } catch (error) {
        console.error('Export failed:', error);
        setAnnouncement('Export failed. Please try again.');
      }
    },
    [facilities, filters]
  );

  const style: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: typeof height === 'number' ? `${height}px` : height,
    background: highContrastMode
      ? '#000000'
      : 'linear-gradient(180deg, #eef2ff 0%, #f8fafc 100%)',
    border: highContrastMode ? '2px solid #ffffff' : '1px solid #e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    transform: `scale(${zoom})`,
    transformOrigin: 'center center',
    transition: 'transform 0.2s ease-in-out',
  };

  const containerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
  };

  const exportControlsStyle: CSSProperties = {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  };

  return (
    <div style={containerStyle}>
      {showExportControls && (
        <div style={exportControlsStyle}>
          <MapExportControls
            onExport={handleExport}
            disabled={facilities.length === 0}
            highContrastMode={highContrastMode}
          />
        </div>
      )}
      <div
        ref={mapRef}
        className="facility-map"
        data-testid="facility-map"
        role="application"
        aria-label={`${ariaLabel}. Use arrow keys to navigate between facilities, plus and minus keys to zoom, Enter or Space to select.`}
        aria-describedby="map-instructions"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={style}
      >
      {/* Screen reader instructions */}
      <div id="map-instructions" className="sr-only">
        Interactive map with {facilities.length} facilities. Use arrow keys to navigate between
        markers, plus and minus keys to zoom in and out, Enter or Space to select a facility, Home
        to go to first facility, End to go to last facility.
      </div>

      {/* Live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="map-announcements"
      >
        {announcement}
      </div>

      {facilities.map((facility, index) => (
        <FacilityMarker
          key={facility.id}
          facility={facility}
          position={positions.get(facility.id)!}
          selected={facility.id === selectedFacilityId}
          focused={index === focusedIndex}
          onSelect={onSelectFacility}
          highContrastMode={highContrastMode}
          ref={(el) => handleMarkerRef(facility.id, el)}
          tabIndex={-1}
        />
      ))}
      </div>
    </div>
  );
}
