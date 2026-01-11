import { create } from 'zustand';
import type { MapState, Facility, MapFilters, MapStylePreference } from '../components/map/types';
import { MAP_STYLES, MAP_STYLE_STORAGE_KEY } from '../components/map/constants';
import type { MapStyleType } from '../components/map/constants';

interface MapStore extends MapState {
  setMapStyle: (style: MapStyleType) => void;
  setSelectedFacility: (facility: Facility | null) => void;
  setFacilities: (facilities: Facility[]) => void;
  updateFilters: (filters: Partial<MapFilters>) => void;
  loadStylePreference: () => void;
}

// Helper function to load style preference from localStorage
const loadStoredStyle = (): MapStyleType => {
  try {
    const stored = localStorage.getItem(MAP_STYLE_STORAGE_KEY);
    if (stored) {
      const preference: MapStylePreference = JSON.parse(stored);
      // Validate that the stored style is one of the valid styles
      if (Object.values(MAP_STYLES).includes(preference.style)) {
        return preference.style;
      }
    }
  } catch (error) {
    console.error('Failed to load map style preference:', error);
  }
  return MAP_STYLES.STREET; // Default fallback
};

// Helper function to save style preference to localStorage
const saveStylePreference = (style: MapStyleType) => {
  try {
    const preference: MapStylePreference = {
      style,
      timestamp: Date.now(),
    };
    localStorage.setItem(MAP_STYLE_STORAGE_KEY, JSON.stringify(preference));
  } catch (error) {
    console.error('Failed to save map style preference:', error);
  }
};

export const useMapStore = create<MapStore>((set) => ({
  // Initial state
  mapStyle: loadStoredStyle(),
  facilities: [],
  selectedFacility: null,
  filters: {
    statuses: [],
    severities: [],
  },

  // Actions
  setMapStyle: (style: MapStyleType) => {
    saveStylePreference(style);
    set({ mapStyle: style });
  },

  setSelectedFacility: (facility: Facility | null) => {
    set({ selectedFacility: facility });
  },

  setFacilities: (facilities: Facility[]) => {
    set({ facilities });
  },

  updateFilters: (filters: Partial<MapFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  loadStylePreference: () => {
    const style = loadStoredStyle();
    set({ mapStyle: style });
  },
}));
