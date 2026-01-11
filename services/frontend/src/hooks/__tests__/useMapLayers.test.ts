import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMapLayers } from '../useMapLayers';
import type { LayerPreferences } from '../../components/geospatial/MapLayerControls';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useMapLayers', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('initializes with default layers when no saved preferences exist', () => {
      const { result } = renderHook(() => useMapLayers());

      expect(result.current.layers).toEqual({
        heatmap: false,
        weather: false,
        clustering: true,
        traffic: false,
      });
    });

    it('initializes with provided initial layers', () => {
      const initialLayers: Partial<LayerPreferences> = {
        heatmap: true,
        weather: true,
      };

      const { result } = renderHook(() => useMapLayers(initialLayers, false));

      expect(result.current.layers).toEqual({
        heatmap: true,
        weather: true,
        clustering: true,
        traffic: false,
      });
    });

    it('loads saved preferences from localStorage when autoLoad is true', () => {
      const savedPreferences: LayerPreferences = {
        heatmap: true,
        weather: true,
        clustering: false,
        traffic: true,
      };

      localStorageMock.setItem('map_layer_preferences', JSON.stringify(savedPreferences));

      const { result } = renderHook(() => useMapLayers());

      expect(result.current.layers).toEqual(savedPreferences);
    });

    it('does not load saved preferences when autoLoad is false', () => {
      const savedPreferences: LayerPreferences = {
        heatmap: true,
        weather: true,
        clustering: false,
        traffic: true,
      };

      localStorageMock.setItem('map_layer_preferences', JSON.stringify(savedPreferences));

      const { result } = renderHook(() => useMapLayers(undefined, false));

      expect(result.current.layers).toEqual({
        heatmap: false,
        weather: false,
        clustering: true,
        traffic: false,
      });
    });

    it('indicates no unsaved changes initially', () => {
      const { result } = renderHook(() => useMapLayers());

      expect(result.current.hasUnsavedChanges).toBe(false);
    });
  });

  describe('toggleLayer', () => {
    it('toggles a layer from false to true', () => {
      const { result } = renderHook(() => useMapLayers(undefined, false));

      act(() => {
        result.current.toggleLayer('heatmap');
      });

      expect(result.current.layers.heatmap).toBe(true);
    });

    it('toggles a layer from true to false', () => {
      const { result } = renderHook(() =>
        useMapLayers({ clustering: true }, false)
      );

      act(() => {
        result.current.toggleLayer('clustering');
      });

      expect(result.current.layers.clustering).toBe(false);
    });

    it('toggles weather layer', () => {
      const { result } = renderHook(() => useMapLayers(undefined, false));

      act(() => {
        result.current.toggleLayer('weather');
      });

      expect(result.current.layers.weather).toBe(true);
    });

    it('toggles traffic layer', () => {
      const { result } = renderHook(() => useMapLayers(undefined, false));

      act(() => {
        result.current.toggleLayer('traffic');
      });

      expect(result.current.layers.traffic).toBe(true);
    });

    it('does not affect other layers when toggling one', () => {
      const { result } = renderHook(() =>
        useMapLayers({ heatmap: true, weather: true }, false)
      );

      act(() => {
        result.current.toggleLayer('clustering');
      });

      expect(result.current.layers.heatmap).toBe(true);
      expect(result.current.layers.weather).toBe(true);
      expect(result.current.layers.clustering).toBe(false);
      expect(result.current.layers.traffic).toBe(false);
    });

    it('can toggle the same layer multiple times', () => {
      const { result } = renderHook(() => useMapLayers(undefined, false));

      act(() => {
        result.current.toggleLayer('heatmap');
      });
      expect(result.current.layers.heatmap).toBe(true);

      act(() => {
        result.current.toggleLayer('heatmap');
      });
      expect(result.current.layers.heatmap).toBe(false);

      act(() => {
        result.current.toggleLayer('heatmap');
      });
      expect(result.current.layers.heatmap).toBe(true);
    });

    it('indicates unsaved changes after toggling', () => {
      const { result } = renderHook(() => useMapLayers(undefined, false));

      act(() => {
        result.current.toggleLayer('heatmap');
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });
  });

  describe('setLayers', () => {
    it('sets all layers at once', () => {
      const { result } = renderHook(() => useMapLayers(undefined, false));

      const newLayers: LayerPreferences = {
        heatmap: true,
        weather: true,
        clustering: false,
        traffic: true,
      };

      act(() => {
        result.current.setLayers(newLayers);
      });

      expect(result.current.layers).toEqual(newLayers);
    });

    it('completely replaces previous layer state', () => {
      const { result } = renderHook(() =>
        useMapLayers({ heatmap: true, weather: true }, false)
      );

      const newLayers: LayerPreferences = {
        heatmap: false,
        weather: false,
        clustering: false,
        traffic: false,
      };

      act(() => {
        result.current.setLayers(newLayers);
      });

      expect(result.current.layers).toEqual(newLayers);
    });

    it('indicates unsaved changes after setting layers', () => {
      const { result } = renderHook(() => useMapLayers(undefined, false));

      const newLayers: LayerPreferences = {
        heatmap: true,
        weather: true,
        clustering: true,
        traffic: true,
      };

      act(() => {
        result.current.setLayers(newLayers);
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });
  });

  describe('resetLayers', () => {
    it('resets to default layers', () => {
      const { result } = renderHook(() =>
        useMapLayers({ heatmap: true, weather: true, traffic: true }, false)
      );

      act(() => {
        result.current.resetLayers();
      });

      expect(result.current.layers).toEqual({
        heatmap: false,
        weather: false,
        clustering: true,
        traffic: false,
      });
    });

    it('indicates unsaved changes after reset if different from saved', () => {
      const { result } = renderHook(() =>
        useMapLayers({ heatmap: true }, false)
      );

      act(() => {
        result.current.resetLayers();
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });
  });

  describe('savePreferences', () => {
    it('saves current layers to localStorage', () => {
      const { result } = renderHook(() => useMapLayers(undefined, false));

      act(() => {
        result.current.toggleLayer('heatmap');
        result.current.toggleLayer('weather');
      });

      act(() => {
        result.current.savePreferences();
      });

      const saved = localStorageMock.getItem('map_layer_preferences');
      expect(saved).toBe(
        JSON.stringify({
          heatmap: true,
          weather: true,
          clustering: true,
          traffic: false,
        })
      );
    });

    it('clears unsaved changes flag after saving', () => {
      const { result } = renderHook(() => useMapLayers(undefined, false));

      act(() => {
        result.current.toggleLayer('heatmap');
      });

      expect(result.current.hasUnsavedChanges).toBe(true);

      act(() => {
        result.current.savePreferences();
      });

      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('can be called multiple times without issues', () => {
      const { result } = renderHook(() => useMapLayers(undefined, false));

      // First toggle and save
      act(() => {
        result.current.toggleLayer('heatmap');
      });
      
      act(() => {
        result.current.savePreferences();
      });

      // Second toggle and save
      act(() => {
        result.current.toggleLayer('weather');
      });
      
      act(() => {
        result.current.savePreferences();
      });

      // Both should be saved
      const saved = localStorageMock.getItem('map_layer_preferences');
      expect(saved).toBe(
        JSON.stringify({
          heatmap: true,
          weather: true,
          clustering: true,
          traffic: false,
        })
      );
    });
  });

  describe('hasUnsavedChanges', () => {
    it('returns false when no changes have been made', () => {
      const { result } = renderHook(() => useMapLayers(undefined, false));

      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('returns true after toggling a layer', () => {
      const { result } = renderHook(() => useMapLayers(undefined, false));

      act(() => {
        result.current.toggleLayer('heatmap');
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('returns true after setting layers', () => {
      const { result } = renderHook(() => useMapLayers(undefined, false));

      const newLayers: LayerPreferences = {
        heatmap: true,
        weather: true,
        clustering: false,
        traffic: true,
      };

      act(() => {
        result.current.setLayers(newLayers);
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('returns false after saving changes', () => {
      const { result } = renderHook(() => useMapLayers(undefined, false));

      act(() => {
        result.current.toggleLayer('heatmap');
      });
      
      act(() => {
        result.current.savePreferences();
      });

      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('returns true again after making changes post-save', () => {
      const { result } = renderHook(() => useMapLayers(undefined, false));

      act(() => {
        result.current.toggleLayer('heatmap');
        result.current.savePreferences();
      });

      act(() => {
        result.current.toggleLayer('weather');
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });
  });

  describe('Integration', () => {
    it('supports full workflow: toggle, save, load', () => {
      // First render - toggle and save
      const { result: result1 } = renderHook(() => useMapLayers(undefined, false));

      act(() => {
        result1.current.toggleLayer('heatmap');
      });
      
      act(() => {
        result1.current.toggleLayer('weather');
      });
      
      act(() => {
        result1.current.savePreferences();
      });

      // Verify what was saved
      const savedStr = localStorageMock.getItem('map_layer_preferences');
      const savedObj = savedStr ? JSON.parse(savedStr) : null;
      expect(savedObj).toEqual({
        heatmap: true,
        weather: true,
        clustering: true,
        traffic: false,
      });

      // Second render - should load saved preferences
      const { result: result2 } = renderHook(() => useMapLayers());

      expect(result2.current.layers).toEqual({
        heatmap: true,
        weather: true,
        clustering: true,
        traffic: false,
      });
      expect(result2.current.hasUnsavedChanges).toBe(false);
    });

    it('handles multiple layer changes before saving', () => {
      const { result } = renderHook(() => useMapLayers(undefined, false));

      act(() => {
        result.current.toggleLayer('heatmap');
        result.current.toggleLayer('weather');
        result.current.toggleLayer('clustering');
        result.current.toggleLayer('traffic');
      });

      expect(result.current.layers).toEqual({
        heatmap: true,
        weather: true,
        clustering: false,
        traffic: true,
      });

      act(() => {
        result.current.savePreferences();
      });

      const saved = localStorage.getItem('map_layer_preferences');
      expect(JSON.parse(saved!)).toEqual(result.current.layers);
    });
  });
});
