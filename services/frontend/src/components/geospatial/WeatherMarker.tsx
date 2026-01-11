import type { CSSProperties } from 'react';
import type { WeatherData } from '../types/weather';

export interface WeatherMarkerProps {
  weather: WeatherData;
  position: { xPercent: number; yPercent: number };
  facilityName: string;
  onClick?: () => void;
  highContrastMode?: boolean;
}

function getWeatherEmoji(icon: string): string {
  const iconMap: Record<string, string> = {
    '01d': '☀️', // clear sky day
    '01n': '🌙', // clear sky night
    '02d': '⛅', // few clouds day
    '02n': '☁️', // few clouds night
    '03d': '☁️', // scattered clouds
    '03n': '☁️',
    '04d': '☁️', // broken clouds
    '04n': '☁️',
    '09d': '🌧️', // shower rain
    '09n': '🌧️',
    '10d': '🌦️', // rain day
    '10n': '🌧️', // rain night
    '11d': '⛈️', // thunderstorm
    '11n': '⛈️',
    '13d': '❄️', // snow
    '13n': '❄️',
    '50d': '🌫️', // mist
    '50n': '🌫️',
  };

  return iconMap[icon] || '🌡️';
}

function getTemperatureColor(temperature: number, highContrast: boolean): string {
  if (highContrast) {
    if (temperature >= 40 || temperature <= -20) return '#ff0000';
    if (temperature >= 35 || temperature <= -10) return '#ffff00';
    return '#00ff00';
  }

  if (temperature >= 40) return '#dc2626'; // extreme heat
  if (temperature >= 35) return '#f59e0b'; // high heat
  if (temperature >= 25) return '#fbbf24'; // warm
  if (temperature >= 15) return '#10b981'; // mild
  if (temperature >= 5) return '#3b82f6'; // cool
  if (temperature >= -10) return '#6366f1'; // cold
  return '#8b5cf6'; // extreme cold
}

export function WeatherMarker({
  weather,
  position,
  facilityName,
  onClick,
  highContrastMode = false,
}: WeatherMarkerProps) {
  const hasAlerts = weather.alerts && weather.alerts.length > 0;
  const emoji = getWeatherEmoji(weather.icon);
  const tempColor = getTemperatureColor(weather.temperature, highContrastMode);

  const containerStyle: CSSProperties = {
    position: 'absolute',
    left: `${position.xPercent}%`,
    top: `${position.yPercent}%`,
    transform: 'translate(-50%, -50%)',
    cursor: onClick ? 'pointer' : 'default',
    zIndex: hasAlerts ? 20 : 10,
  };

  const cardStyle: CSSProperties = {
    background: highContrastMode ? '#000000' : 'rgba(255, 255, 255, 0.95)',
    border: hasAlerts
      ? `3px solid ${tempColor}`
      : highContrastMode
        ? '2px solid #ffffff'
        : '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '8px 12px',
    boxShadow: highContrastMode
      ? 'none'
      : hasAlerts
        ? '0 4px 12px rgba(0, 0, 0, 0.2)'
        : '0 2px 8px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 100,
    transition: 'all 0.2s ease-in-out',
    color: highContrastMode ? '#ffffff' : '#1f2937',
  };

  const tempStyle: CSSProperties = {
    fontSize: 18,
    fontWeight: 'bold',
    color: tempColor,
  };

  const alertBadgeStyle: CSSProperties = {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: tempColor,
    border: '2px solid white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  };

  const alertMessage = weather.alerts?.[0]?.message || '';

  return (
    <div
      className="weather-marker"
      data-testid={`weather-marker-${facilityName}`}
      style={containerStyle}
      onClick={onClick}
      role={onClick ? 'button' : 'presentation'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`Weather at ${facilityName}: ${weather.temperature}°C, ${weather.description}${hasAlerts ? `. ${alertMessage}` : ''}`}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div style={{ position: 'relative' }}>
        <div style={cardStyle}>
          <span role="img" aria-label={weather.description} style={{ fontSize: 24 }}>
            {emoji}
          </span>
          <div>
            <div style={tempStyle}>{Math.round(weather.temperature)}°C</div>
            <div style={{ fontSize: 10, opacity: 0.8 }}>{weather.description}</div>
          </div>
        </div>
        {hasAlerts && (
          <div style={alertBadgeStyle} aria-label="Weather alert" title={alertMessage}>
            !
          </div>
        )}
      </div>
    </div>
  );
}
