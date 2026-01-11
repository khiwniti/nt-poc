import type { CSSProperties } from 'react';
import { FacilityMarker, type FacilityMarkerData } from './FacilityMarker';

export interface FacilityMapProps {
  facilities: FacilityMarkerData[];
  selectedFacilityId?: string;
  onSelectFacility?: (facilityId: string) => void;
  ariaLabel?: string;
  height?: number | string;
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
}: FacilityMapProps) {
  const positions = computePositions(facilities);
  const style: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: typeof height === 'number' ? `${height}px` : height,
    background: 'linear-gradient(180deg, #eef2ff 0%, #f8fafc 100%)',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
  };

  return (
    <div
      className="facility-map"
      data-testid="facility-map"
      role="region"
      aria-label={ariaLabel}
      style={style}
    >
      {facilities.map((facility) => (
        <FacilityMarker
          key={facility.id}
          facility={facility}
          position={positions.get(facility.id)!}
          selected={facility.id === selectedFacilityId}
          onSelect={onSelectFacility}
        />
      ))}
    </div>
  );
}
