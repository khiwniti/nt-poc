import React from 'react';
import { Map, Satellite, Moon } from 'lucide-react';
import { useMapStore } from '../../stores/mapStore';
import { MAP_STYLES } from './constants';
import type { MapStyleType } from './constants';

export const MapStyleSwitcher: React.FC = () => {
  const { mapStyle, setMapStyle } = useMapStore();

  const styles: Array<{ value: MapStyleType; label: string; icon: React.ReactNode }> = [
    { value: MAP_STYLES.STREET, label: 'Street', icon: <Map size={18} /> },
    { value: MAP_STYLES.SATELLITE, label: 'Satellite', icon: <Satellite size={18} /> },
    { value: MAP_STYLES.DARK, label: 'Dark', icon: <Moon size={18} /> },
  ];

  const handleStyleChange = (style: MapStyleType) => {
    setMapStyle(style);
  };

  return (
    <div className="map-style-switcher" role="radiogroup" aria-label="Map style selector">
      {styles.map((style) => (
        <button
          key={style.value}
          type="button"
          role="radio"
          aria-checked={mapStyle === style.value}
          aria-label={`${style.label} map style`}
          className={`style-button ${mapStyle === style.value ? 'active' : ''}`}
          onClick={() => handleStyleChange(style.value)}
          title={style.label}
        >
          {style.icon}
          <span className="style-label">{style.label}</span>
        </button>
      ))}
    </div>
  );
};
