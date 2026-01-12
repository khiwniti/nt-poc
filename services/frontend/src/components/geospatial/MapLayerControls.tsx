import { useState, useEffect } from 'react';
import { Layers, Thermometer, Cloud, MapPin, Navigation } from 'lucide-react';

export type MapStyle = 'standard' | 'satellite' | 'street' | 'dark';

export interface LayerPreferences {
  heatmap: boolean;
  weather: boolean;
  clustering: boolean;
  traffic: boolean;
  mapStyle: MapStyle;
}

export interface MapLayerControlsProps {
  layers: LayerPreferences;
  onLayerToggle: (layer: keyof LayerPreferences) => void;
  onStyleChange?: (style: MapStyle) => void;
  onSavePreferences?: () => void;
  className?: string;
}

const STORAGE_KEY = 'map_layer_preferences';

export function saveLayerPreferences(preferences: LayerPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save layer preferences:', error);
  }
}

export function loadLayerPreferences(): LayerPreferences | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as LayerPreferences;
    }
  } catch (error) {
    console.error('Failed to load layer preferences:', error);
  }
  return null;
}

const layerOptions = [
  {
    key: 'heatmap' as const,
    label: 'Heatmap',
    icon: Thermometer,
    description: 'Show thermal heatmap overlay',
  },
  {
    key: 'weather' as const,
    label: 'Weather',
    icon: Cloud,
    description: 'Display weather conditions',
  },
  {
    key: 'clustering' as const,
    label: 'Clustering',
    icon: MapPin,
    description: 'Group nearby markers',
  },
  {
    key: 'traffic' as const,
    label: 'Traffic',
    icon: Navigation,
    description: 'Show traffic conditions',
  },
] as const;

const mapStyleOptions: Array<{ value: MapStyle; label: string; description: string }> = [
  { value: 'standard', label: 'Standard', description: 'OpenStreetMap default' },
  { value: 'satellite', label: 'Satellite', description: 'Aerial imagery' },
  { value: 'street', label: 'Street', description: 'Detailed street view' },
  { value: 'dark', label: 'Dark', description: 'Dark mode friendly' },
];

export function MapLayerControls({
  layers,
  onLayerToggle,
  onStyleChange,
  onSavePreferences,
  className = '',
}: MapLayerControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const saved = loadLayerPreferences();
    if (saved) {
      const isDifferent = Object.keys(layers).some(
        (key) => layers[key as keyof LayerPreferences] !== saved[key as keyof LayerPreferences]
      );
      setHasUnsavedChanges(isDifferent);
    }
  }, [layers]);

  const handleToggle = (layer: keyof LayerPreferences) => {
    onLayerToggle(layer);
    setHasUnsavedChanges(true);
  };

  const handleStyleChange = (style: MapStyle) => {
    if (onStyleChange) {
      onStyleChange(style);
      setHasUnsavedChanges(true);
    }
  };

  const handleSave = () => {
    saveLayerPreferences(layers);
    setHasUnsavedChanges(false);
    onSavePreferences?.();
  };

  const activeLayerCount = Object.entries(layers).filter(
    ([key, value]) => key !== 'mapStyle' && value === true
  ).length;

  return (
    <div
      className={`map-layer-controls ${className}`}
      data-testid="map-layer-controls"
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 1000,
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        minWidth: '200px',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label={`Layer controls. ${activeLayerCount} layers active. ${isExpanded ? 'Collapse' : 'Expand'} panel`}
        data-testid="layer-controls-toggle"
        style={{
          width: '100%',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: 'none',
          background: '#f8f9fa',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '14px',
          color: '#1a1a1a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} />
          <span>Layers</span>
          {activeLayerCount > 0 && (
            <span
              style={{
                backgroundColor: '#2196F3',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {activeLayerCount}
            </span>
          )}
        </div>
        <span
          style={{
            transition: 'transform 0.2s',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▼
        </span>
      </button>

      {/* Layer Options */}
      {isExpanded && (
        <div
          style={{
            padding: '8px',
            borderTop: '1px solid #e0e0e0',
          }}
        >
          {/* Map Style Selector */}
          <div
            style={{
              padding: '10px 8px',
              marginBottom: '8px',
              borderBottom: '1px solid #e0e0e0',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#666',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Map Style
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '6px',
              }}
            >
              {mapStyleOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStyleChange(option.value)}
                  data-testid={`map-style-${option.value}`}
                  aria-label={`${option.label} map style: ${option.description}`}
                  aria-pressed={layers.mapStyle === option.value}
                  style={{
                    padding: '8px',
                    border: '2px solid',
                    borderColor: layers.mapStyle === option.value ? '#2196F3' : '#e0e0e0',
                    borderRadius: '6px',
                    backgroundColor: layers.mapStyle === option.value ? '#e3f2fd' : 'white',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: layers.mapStyle === option.value ? 600 : 500,
                    color: layers.mapStyle === option.value ? '#1976D2' : '#666',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                  }}
                  onMouseEnter={(e) => {
                    if (layers.mapStyle !== option.value) {
                      (e.currentTarget as HTMLElement).style.borderColor = '#bbb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (layers.mapStyle !== option.value) {
                      (e.currentTarget as HTMLElement).style.borderColor = '#e0e0e0';
                    }
                  }}
                >
                  <div>{option.label}</div>
                  <div
                    style={{
                      fontSize: '10px',
                      marginTop: '2px',
                      opacity: 0.8,
                    }}
                  >
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Layer Toggles */}
          {layerOptions.map((option) => {
            const Icon = option.icon;
            const isActive = layers[option.key];

            return (
              <label
                key={option.key}
                htmlFor={`layer-${option.key}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '10px 8px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  transition: 'background-color 0.15s',
                  backgroundColor: isActive ? '#e3f2fd' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#f5f5f5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }
                }}
              >
                <input
                  id={`layer-${option.key}`}
                  type="checkbox"
                  checked={isActive}
                  onChange={() => handleToggle(option.key)}
                  data-testid={`layer-toggle-${option.key}`}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    marginTop: '2px',
                  }}
                  aria-describedby={`layer-${option.key}-description`}
                />
                <div style={{ marginLeft: '10px', flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 500,
                      fontSize: '14px',
                      color: '#1a1a1a',
                      marginBottom: '2px',
                    }}
                  >
                    <Icon size={16} color={isActive ? '#2196F3' : '#666'} />
                    <span>{option.label}</span>
                  </div>
                  <div
                    id={`layer-${option.key}-description`}
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      lineHeight: '1.4',
                    }}
                  >
                    {option.description}
                  </div>
                </div>
              </label>
            );
          })}

          {/* Save Preferences Button */}
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e0e0e0' }}>
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              data-testid="save-preferences-button"
              aria-label={hasUnsavedChanges ? 'Save layer preferences' : 'No changes to save'}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: hasUnsavedChanges ? '#2196F3' : '#e0e0e0',
                color: hasUnsavedChanges ? 'white' : '#999',
                border: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: hasUnsavedChanges ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              {hasUnsavedChanges ? 'Save Preferences' : 'Preferences Saved'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
