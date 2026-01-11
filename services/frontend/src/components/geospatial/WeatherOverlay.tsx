import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useWeather } from '../../hooks/useWeather';
import { WeatherMarker } from './WeatherMarker';

export interface WeatherOverlayProps {
  visible: boolean;
  highContrastMode?: boolean;
  onFacilitySelect?: (facilityId: string) => void;
  height?: number | string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function WeatherOverlay({
  visible,
  highContrastMode = false,
  onFacilitySelect,
  height = 320,
}: WeatherOverlayProps) {
  const { loading, error, facilitiesWeather, refreshWeather } = useWeather();
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);

  if (!visible) return null;

  const handleFacilityClick = (facilityId: string) => {
    setSelectedFacilityId(facilityId);
    onFacilitySelect?.(facilityId);
  };

  // Calculate positions based on coordinates
  const validFacilities = facilitiesWeather.filter(
    (f) => f.weather && f.latitude && f.longitude
  );

  if (validFacilities.length === 0 && !loading && !error) {
    return (
      <div
        style={{
          padding: 20,
          textAlign: 'center',
          color: highContrastMode ? '#ffffff' : '#6b7280',
        }}
      >
        No weather data available
      </div>
    );
  }

  // Compute positions
  const lats = validFacilities.map((f) => f.latitude);
  const lngs = validFacilities.map((f) => f.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(1e-9, maxLat - minLat);
  const lngSpan = Math.max(1e-9, maxLng - minLng);

  const positions = new Map(
    validFacilities.map((facility) => {
      const x = ((facility.longitude - minLng) / lngSpan) * 100;
      const y = (1 - (facility.latitude - minLat) / latSpan) * 100;
      return [facility.facilityId, { xPercent: clamp(x, 5, 95), yPercent: clamp(y, 5, 95) }];
    })
  );

  const overlayStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: typeof height === 'number' ? `${height}px` : height,
    background: highContrastMode
      ? 'rgba(0, 0, 0, 0.8)'
      : 'linear-gradient(180deg, rgba(135, 206, 235, 0.1) 0%, rgba(176, 224, 230, 0.1) 100%)',
    border: highContrastMode ? '2px solid #ffffff' : '1px solid #e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
  };

  const hasAlerts = validFacilities.some(
    (f) => f.weather?.alerts && f.weather.alerts.length > 0
  );

  return (
    <div
      className="weather-overlay"
      data-testid="weather-overlay"
      role="region"
      aria-label="Weather overlay for facilities"
      style={overlayStyle}
    >
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          right: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
        }}
      >
        <div
          style={{
            background: highContrastMode ? '#000000' : 'rgba(255, 255, 255, 0.95)',
            color: highContrastMode ? '#ffffff' : '#1f2937',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            border: highContrastMode ? '1px solid #ffffff' : '1px solid #e5e7eb',
          }}
        >
          🌦️ Weather Conditions
        </div>
        {hasAlerts && (
          <div
            style={{
              background: '#dc2626',
              color: 'white',
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              animation: 'pulse 2s ease-in-out infinite',
            }}
            role="alert"
          >
            ⚠️ Weather Alerts Active
          </div>
        )}
        <button
          onClick={refreshWeather}
          style={{
            background: highContrastMode ? '#000000' : 'rgba(255, 255, 255, 0.95)',
            color: highContrastMode ? '#ffffff' : '#1f2937',
            border: highContrastMode ? '1px solid #ffffff' : '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 14,
            cursor: 'pointer',
          }}
          aria-label="Refresh weather data"
        >
          🔄
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: highContrastMode ? '#ffffff' : '#6b7280',
          }}
        >
          Loading weather data...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#dc2626',
            textAlign: 'center',
          }}
          role="alert"
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
          <div>{error}</div>
        </div>
      )}

      {/* Weather markers */}
      {!loading &&
        !error &&
        validFacilities.map((facility) => {
          const position = positions.get(facility.facilityId);
          if (!position || !facility.weather) return null;

          return (
            <WeatherMarker
              key={facility.facilityId}
              weather={facility.weather}
              position={position}
              facilityName={facility.facilityName}
              onClick={() => handleFacilityClick(facility.facilityId)}
              highContrastMode={highContrastMode}
            />
          );
        })}

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.7;
            }
          }
        `}
      </style>
    </div>
  );
}
