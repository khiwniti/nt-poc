import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MapLayerControls,
  saveLayerPreferences,
  loadLayerPreferences,
  type LayerPreferences,
} from '../MapLayerControls';

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

describe('MapLayerControls', () => {
  const defaultLayers: LayerPreferences = {
    heatmap: false,
    weather: false,
    clustering: false,
    traffic: false,
  };

  const mockOnLayerToggle = vi.fn();
  const mockOnSavePreferences = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('Rendering', () => {
    it('renders the layer controls panel', () => {
      render(
        <MapLayerControls layers={defaultLayers} onLayerToggle={mockOnLayerToggle} />
      );

      expect(screen.getByTestId('map-layer-controls')).toBeInTheDocument();
      expect(screen.getByTestId('layer-controls-toggle')).toBeInTheDocument();
    });

    it('displays the correct active layer count', () => {
      const activeLayers: LayerPreferences = {
        heatmap: true,
        weather: true,
        clustering: false,
        traffic: false,
      };

      render(
        <MapLayerControls layers={activeLayers} onLayerToggle={mockOnLayerToggle} />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('does not show count badge when no layers are active', () => {
      render(
        <MapLayerControls layers={defaultLayers} onLayerToggle={mockOnLayerToggle} />
      );

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('initially renders collapsed', () => {
      render(
        <MapLayerControls layers={defaultLayers} onLayerToggle={mockOnLayerToggle} />
      );

      expect(screen.getByTestId('layer-controls-toggle')).toHaveAttribute(
        'aria-expanded',
        'false'
      );
      expect(screen.queryByTestId('layer-toggle-heatmap')).not.toBeInTheDocument();
    });
  });

  describe('Expansion/Collapse', () => {
    it('expands panel when toggle button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MapLayerControls layers={defaultLayers} onLayerToggle={mockOnLayerToggle} />
      );

      const toggleButton = screen.getByTestId('layer-controls-toggle');
      await user.click(toggleButton);

      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByTestId('layer-toggle-heatmap')).toBeInTheDocument();
      expect(screen.getByTestId('layer-toggle-weather')).toBeInTheDocument();
      expect(screen.getByTestId('layer-toggle-clustering')).toBeInTheDocument();
      expect(screen.getByTestId('layer-toggle-traffic')).toBeInTheDocument();
    });

    it('collapses panel when toggle button is clicked again', async () => {
      const user = userEvent.setup();
      render(
        <MapLayerControls layers={defaultLayers} onLayerToggle={mockOnLayerToggle} />
      );

      const toggleButton = screen.getByTestId('layer-controls-toggle');
      await user.click(toggleButton);
      await user.click(toggleButton);

      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('layer-toggle-heatmap')).not.toBeInTheDocument();
    });
  });

  describe('Layer Toggles', () => {
    it('renders all four layer toggle options when expanded', async () => {
      const user = userEvent.setup();
      render(
        <MapLayerControls layers={defaultLayers} onLayerToggle={mockOnLayerToggle} />
      );

      await user.click(screen.getByTestId('layer-controls-toggle'));

      expect(screen.getByText('Heatmap')).toBeInTheDocument();
      expect(screen.getByText('Weather')).toBeInTheDocument();
      expect(screen.getByText('Clustering')).toBeInTheDocument();
      expect(screen.getByText('Traffic')).toBeInTheDocument();
    });

    it('calls onLayerToggle when heatmap is toggled', async () => {
      const user = userEvent.setup();
      render(
        <MapLayerControls layers={defaultLayers} onLayerToggle={mockOnLayerToggle} />
      );

      await user.click(screen.getByTestId('layer-controls-toggle'));
      await user.click(screen.getByTestId('layer-toggle-heatmap'));

      expect(mockOnLayerToggle).toHaveBeenCalledWith('heatmap');
    });

    it('calls onLayerToggle when weather is toggled', async () => {
      const user = userEvent.setup();
      render(
        <MapLayerControls layers={defaultLayers} onLayerToggle={mockOnLayerToggle} />
      );

      await user.click(screen.getByTestId('layer-controls-toggle'));
      await user.click(screen.getByTestId('layer-toggle-weather'));

      expect(mockOnLayerToggle).toHaveBeenCalledWith('weather');
    });

    it('calls onLayerToggle when clustering is toggled', async () => {
      const user = userEvent.setup();
      render(
        <MapLayerControls layers={defaultLayers} onLayerToggle={mockOnLayerToggle} />
      );

      await user.click(screen.getByTestId('layer-controls-toggle'));
      await user.click(screen.getByTestId('layer-toggle-clustering'));

      expect(mockOnLayerToggle).toHaveBeenCalledWith('clustering');
    });

    it('calls onLayerToggle when traffic is toggled', async () => {
      const user = userEvent.setup();
      render(
        <MapLayerControls layers={defaultLayers} onLayerToggle={mockOnLayerToggle} />
      );

      await user.click(screen.getByTestId('layer-controls-toggle'));
      await user.click(screen.getByTestId('layer-toggle-traffic'));

      expect(mockOnLayerToggle).toHaveBeenCalledWith('traffic');
    });

    it('displays checkboxes in correct state', async () => {
      const user = userEvent.setup();
      const activeLayers: LayerPreferences = {
        heatmap: true,
        weather: false,
        clustering: true,
        traffic: false,
      };

      render(
        <MapLayerControls layers={activeLayers} onLayerToggle={mockOnLayerToggle} />
      );

      await user.click(screen.getByTestId('layer-controls-toggle'));

      expect(screen.getByTestId('layer-toggle-heatmap')).toBeChecked();
      expect(screen.getByTestId('layer-toggle-weather')).not.toBeChecked();
      expect(screen.getByTestId('layer-toggle-clustering')).toBeChecked();
      expect(screen.getByTestId('layer-toggle-traffic')).not.toBeChecked();
    });
  });

  describe('Save Preferences', () => {
    it('renders save preferences button when expanded', async () => {
      const user = userEvent.setup();
      render(
        <MapLayerControls layers={defaultLayers} onLayerToggle={mockOnLayerToggle} />
      );

      await user.click(screen.getByTestId('layer-controls-toggle'));

      expect(screen.getByTestId('save-preferences-button')).toBeInTheDocument();
    });

    it('enables save button when preferences change', async () => {
      const user = userEvent.setup();
      render(
        <MapLayerControls layers={defaultLayers} onLayerToggle={mockOnLayerToggle} />
      );

      await user.click(screen.getByTestId('layer-controls-toggle'));
      await user.click(screen.getByTestId('layer-toggle-heatmap'));

      const saveButton = screen.getByTestId('save-preferences-button');
      expect(saveButton).not.toBeDisabled();
      expect(saveButton).toHaveTextContent('Save Preferences');
    });

    it('saves preferences to localStorage', async () => {
      const user = userEvent.setup();
      const layers: LayerPreferences = {
        heatmap: true,
        weather: true,
        clustering: false,
        traffic: false,
      };

      render(
        <MapLayerControls
          layers={layers}
          onLayerToggle={mockOnLayerToggle}
          onSavePreferences={mockOnSavePreferences}
        />
      );

      await user.click(screen.getByTestId('layer-controls-toggle'));
      
      // Toggle a layer to make unsaved changes
      await user.click(screen.getByTestId('layer-toggle-clustering'));
      
      // Now save
      await user.click(screen.getByTestId('save-preferences-button'));

      const saved = loadLayerPreferences();
      // The saved state should reflect the toggle
      expect(saved).toEqual({
        heatmap: true,
        weather: true,
        clustering: false,
        traffic: false,
      });
    });

    it('calls onSavePreferences callback when save button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MapLayerControls
          layers={defaultLayers}
          onLayerToggle={mockOnLayerToggle}
          onSavePreferences={mockOnSavePreferences}
        />
      );

      await user.click(screen.getByTestId('layer-controls-toggle'));
      
      // Toggle a layer to enable the save button
      await user.click(screen.getByTestId('layer-toggle-heatmap'));
      
      await user.click(screen.getByTestId('save-preferences-button'));

      expect(mockOnSavePreferences).toHaveBeenCalled();
    });

    it('disables save button after saving', async () => {
      const user = userEvent.setup();
      render(
        <MapLayerControls
          layers={defaultLayers}
          onLayerToggle={mockOnLayerToggle}
          onSavePreferences={mockOnSavePreferences}
        />
      );

      await user.click(screen.getByTestId('layer-controls-toggle'));
      await user.click(screen.getByTestId('save-preferences-button'));

      const saveButton = screen.getByTestId('save-preferences-button');
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveTextContent('Preferences Saved');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels on toggle button', () => {
      render(
        <MapLayerControls layers={defaultLayers} onLayerToggle={mockOnLayerToggle} />
      );

      const toggleButton = screen.getByTestId('layer-controls-toggle');
      expect(toggleButton).toHaveAttribute('aria-label');
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('updates ARIA expanded state', async () => {
      const user = userEvent.setup();
      render(
        <MapLayerControls layers={defaultLayers} onLayerToggle={mockOnLayerToggle} />
      );

      const toggleButton = screen.getByTestId('layer-controls-toggle');
      await user.click(toggleButton);

      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('associates checkboxes with labels using htmlFor/id', async () => {
      const user = userEvent.setup();
      render(
        <MapLayerControls layers={defaultLayers} onLayerToggle={mockOnLayerToggle} />
      );

      await user.click(screen.getByTestId('layer-controls-toggle'));

      const heatmapCheckbox = screen.getByTestId('layer-toggle-heatmap');
      expect(heatmapCheckbox).toHaveAttribute('id', 'layer-heatmap');

      const label = screen.getByText('Heatmap').closest('label');
      expect(label).toHaveAttribute('for', 'layer-heatmap');
    });

    it('provides descriptions for each layer option', async () => {
      const user = userEvent.setup();
      render(
        <MapLayerControls layers={defaultLayers} onLayerToggle={mockOnLayerToggle} />
      );

      await user.click(screen.getByTestId('layer-controls-toggle'));

      expect(screen.getByText('Show thermal heatmap overlay')).toBeInTheDocument();
      expect(screen.getByText('Display weather conditions')).toBeInTheDocument();
      expect(screen.getByText('Group nearby markers')).toBeInTheDocument();
      expect(screen.getByText('Show traffic conditions')).toBeInTheDocument();
    });

    it('has aria-describedby linking checkboxes to descriptions', async () => {
      const user = userEvent.setup();
      render(
        <MapLayerControls layers={defaultLayers} onLayerToggle={mockOnLayerToggle} />
      );

      await user.click(screen.getByTestId('layer-controls-toggle'));

      const heatmapCheckbox = screen.getByTestId('layer-toggle-heatmap');
      expect(heatmapCheckbox).toHaveAttribute('aria-describedby', 'layer-heatmap-description');
    });
  });

  describe('Preference Storage', () => {
    it('saveLayerPreferences saves to localStorage', () => {
      const preferences: LayerPreferences = {
        heatmap: true,
        weather: false,
        clustering: true,
        traffic: true,
      };

      saveLayerPreferences(preferences);

      const stored = localStorage.getItem('map_layer_preferences');
      expect(stored).toBe(JSON.stringify(preferences));
    });

    it('loadLayerPreferences retrieves from localStorage', () => {
      const preferences: LayerPreferences = {
        heatmap: false,
        weather: true,
        clustering: false,
        traffic: true,
      };

      localStorage.setItem('map_layer_preferences', JSON.stringify(preferences));

      const loaded = loadLayerPreferences();
      expect(loaded).toEqual(preferences);
    });

    it('loadLayerPreferences returns null when no preferences exist', () => {
      const loaded = loadLayerPreferences();
      expect(loaded).toBeNull();
    });

    it('handles localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock localStorage to throw error
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const preferences: LayerPreferences = {
        heatmap: true,
        weather: true,
        clustering: true,
        traffic: true,
      };

      saveLayerPreferences(preferences);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save layer preferences:',
        expect.any(Error)
      );

      // Restore
      localStorageMock.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      render(
        <MapLayerControls
          layers={defaultLayers}
          onLayerToggle={mockOnLayerToggle}
          className="custom-class"
        />
      );

      const container = screen.getByTestId('map-layer-controls');
      expect(container.className).toContain('custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('handles all layers active', () => {
      const allActive: LayerPreferences = {
        heatmap: true,
        weather: true,
        clustering: true,
        traffic: true,
      };

      render(
        <MapLayerControls layers={allActive} onLayerToggle={mockOnLayerToggle} />
      );

      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('handles rapid toggling', async () => {
      const user = userEvent.setup();
      render(
        <MapLayerControls layers={defaultLayers} onLayerToggle={mockOnLayerToggle} />
      );

      await user.click(screen.getByTestId('layer-controls-toggle'));

      const heatmapToggle = screen.getByTestId('layer-toggle-heatmap');
      await user.click(heatmapToggle);
      await user.click(heatmapToggle);
      await user.click(heatmapToggle);

      expect(mockOnLayerToggle).toHaveBeenCalledTimes(3);
    });
  });
});
