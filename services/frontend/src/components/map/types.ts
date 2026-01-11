/**
 * Map-related TypeScript types
 */

import type { MapStyleType } from './constants';

export type FacilityStatus = 'active' | 'maintenance' | 'inactive' | 'critical';

export interface Facility {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: FacilityStatus;
  alertCount?: number;
  description?: string;
}

export interface MapState {
  mapStyle: MapStyleType;
  facilities: Facility[];
  selectedFacility: Facility | null;
  filters: MapFilters;
}

export interface MapFilters {
  statuses: FacilityStatus[];
  severities: string[];
}

export interface MapStylePreference {
  style: MapStyleType;
  timestamp: number;
}

export interface MapProps {
  facilities: Facility[];
  onFacilityClick?: (facility: Facility) => void;
}

export interface MarkerProps {
  facility: Facility;
  onClick: () => void;
}

export interface PopupProps {
  facility: Facility;
  onClose: () => void;
}
