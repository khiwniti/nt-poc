import type { CSSProperties } from 'react';
import type { Coordinate } from '../../geospatial/types';

export interface FacilityMarkerData {
  id: string;
  name: string;
  coordinates: Coordinate;
}

export interface FacilityMarkerProps {
  facility: FacilityMarkerData;
  position: { xPercent: number; yPercent: number };
  selected?: boolean;
  onSelect?: (facilityId: string) => void;
}

export function FacilityMarker({ facility, position, selected, onSelect }: FacilityMarkerProps) {
  const style: CSSProperties = {
    position: 'absolute',
    left: `${position.xPercent}%`,
    top: `${position.yPercent}%`,
    transform: 'translate(-50%, -50%)',
  };

  return (
    <button
      type="button"
      className="facility-marker"
      data-testid={`facility-marker-${facility.id}`}
      data-facility-id={facility.id}
      aria-label={facility.name}
      aria-pressed={selected ? 'true' : 'false'}
      onClick={() => onSelect?.(facility.id)}
      style={style}
    >
      <span aria-hidden="true">📍</span>
    </button>
  );
}
