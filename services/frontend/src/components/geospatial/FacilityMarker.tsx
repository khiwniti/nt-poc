import { forwardRef } from 'react';
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
  focused?: boolean;
  onSelect?: (facilityId: string) => void;
  highContrastMode?: boolean;
  tabIndex?: number;
}

export const FacilityMarker = forwardRef<HTMLButtonElement, FacilityMarkerProps>(
  (
    { facility, position, selected, focused, onSelect, highContrastMode = false, tabIndex = 0 },
    ref
  ) => {
    const baseStyle: CSSProperties = {
      position: 'absolute',
      left: `${position.xPercent}%`,
      top: `${position.yPercent}%`,
      transform: 'translate(-50%, -50%)',
      padding: '8px',
      cursor: 'pointer',
      border: 'none',
      background: 'transparent',
      fontSize: '24px',
      transition: 'all 0.2s ease-in-out',
    };

    // High contrast styles
    const contrastStyle: CSSProperties = highContrastMode
      ? {
          filter: selected ? 'brightness(2) saturate(2)' : 'brightness(1.5)',
          border: focused ? '3px solid #ffffff' : selected ? '2px solid #ffff00' : 'none',
          borderRadius: '50%',
          outline: 'none',
        }
      : {
          filter: selected ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))' : 'none',
          border: focused ? '2px solid #3b82f6' : 'none',
          borderRadius: '50%',
          outline: 'none',
        };

    const style: CSSProperties = {
      ...baseStyle,
      ...contrastStyle,
      transform: selected || focused ? 'translate(-50%, -50%) scale(1.3)' : 'translate(-50%, -50%)',
    };

    const coordinatesText = `latitude ${facility.coordinates.latitude.toFixed(4)}, longitude ${facility.coordinates.longitude.toFixed(4)}`;

    return (
      <button
        ref={ref}
        type="button"
        className="facility-marker"
        data-testid={`facility-marker-${facility.id}`}
        data-facility-id={facility.id}
        aria-label={`${facility.name} at ${coordinatesText}${selected ? ', selected' : ''}${focused ? ', focused' : ''}`}
        aria-pressed={selected ? 'true' : 'false'}
        aria-describedby={`marker-coords-${facility.id}`}
        onClick={() => onSelect?.(facility.id)}
        tabIndex={tabIndex}
        style={style}
      >
        <span aria-hidden="true" role="img" aria-label="location pin">
          📍
        </span>
        <span id={`marker-coords-${facility.id}`} className="sr-only">
          {coordinatesText}
        </span>
      </button>
    );
  }
);

FacilityMarker.displayName = 'FacilityMarker';
