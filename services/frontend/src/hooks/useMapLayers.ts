import { useState, useEffect, useCallback } from 'react';
import type { LayerPreferences } from '../components/geospatial/MapLayerControls';
import { loadLayerPreferences, saveLayerPreferences } from '../components/geospatial/MapLayerControls';

const DEFAULT_LAYERS: LayerPreferences = {
  heatmap: false,
  weather: false,
  clustering: true,
  traffic: false,
};

export interface UseMapLayersReturn {
  layers: LayerPreferences;
  toggleLayer: (layer: keyof LayerPreferences) => void;
  setLayers: (layers: LayerPreferences) => void;
  resetLayers: () => void;
  savePreferences: () => void;
  hasUnsavedChanges: boolean;
}

/**
 * Custom hook for managing map layer state with localStorage persistence
 * 
 * @param initialLayers - Optional initial layer state (defaults to DEFAULT_LAYERS)
 * @param autoLoad - Whether to automatically load saved preferences on mount (default: true)
 * @returns Object with layer state and control functions
 */
export function useMapLayers(
  initialLayers?: Partial<LayerPreferences>,
  autoLoad: boolean = true
): UseMapLayersReturn {
  const [layers, setLayersState] = useState<LayerPreferences>(() => {
    // Try to load saved preferences if autoLoad is enabled
    if (autoLoad) {
      const saved = loadLayerPreferences();
      if (saved) {
        return saved;
      }
    }

    // Otherwise use initial layers or defaults
    return {
      ...DEFAULT_LAYERS,
      ...initialLayers,
    };
  });

  const [savedLayers, setSavedLayers] = useState<LayerPreferences>(layers);

  // Load saved preferences on mount if autoLoad is enabled
  useEffect(() => {
    if (autoLoad) {
      const saved = loadLayerPreferences();
      if (saved) {
        setLayersState(saved);
        setSavedLayers(saved);
      }
    }
  }, [autoLoad]);

  // Toggle a specific layer on/off
  const toggleLayer = useCallback((layer: keyof LayerPreferences) => {
    setLayersState((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  }, []);

  // Set all layers at once
  const setLayers = useCallback((newLayers: LayerPreferences) => {
    setLayersState(newLayers);
  }, []);

  // Reset to default layers
  const resetLayers = useCallback(() => {
    setLayersState(DEFAULT_LAYERS);
  }, []);

  // Save current preferences to localStorage
  const savePreferences = useCallback(() => {
    saveLayerPreferences(layers);
    setSavedLayers(layers);
  }, [layers]);

  // Check if there are unsaved changes
  const hasUnsavedChanges =
    JSON.stringify(layers) !== JSON.stringify(savedLayers);

  return {
    layers,
    toggleLayer,
    setLayers,
    resetLayers,
    savePreferences,
    hasUnsavedChanges,
  };
}
