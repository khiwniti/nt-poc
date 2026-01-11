import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useFacilityWeather } from '../../hooks/useWeather';
import type { WeatherAlert } from '../../types/weather';

export interface WeatherDetailsPanelProps {
  facilityId: string;
  onClose: () => void;
  highContrastMode?: boolean;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getAlertColor(severity: WeatherAlert['severity']): string {
  switch (severity) {
    case 'extreme':
      return '#dc2626';
    case 'high':
      return '#f59e0b';
    case 'moderate':
      return '#fbbf24';
  }
}

export function WeatherDetailsPanel({
  facilityId,
  onClose,
  highContrastMode = false,
}: WeatherDetailsPanelProps) {
  const { loading, weather, forecast, correlation, refreshCorrelation } =
    useFacilityWeather(facilityId);
  const [showCorrelation, setShowCorrelation] = useState(false);
  const [correlationDays, setCorrelationDays] = useState(30);

  const handleLoadCorrelation = async () => {
    await refreshCorrelation(correlationDays);
    setShowCorrelation(true);
  };

  const panelStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    width: 400,
    height: '100vh',
    background: highContrastMode ? '#000000' : '#ffffff',
    color: highContrastMode ? '#ffffff' : '#1f2937',
    border: highContrastMode ? '2px solid #ffffff' : 'none',
    boxShadow: highContrastMode ? 'none' : '-4px 0 12px rgba(0, 0, 0, 0.1)',
    overflowY: 'auto',
    zIndex: 1000,
    padding: 20,
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottom: highContrastMode ? '2px solid #ffffff' : '2px solid #e5e7eb',
    paddingBottom: 10,
  };

  const sectionStyle: CSSProperties = {
    marginBottom: 24,
  };

  const buttonStyle: CSSProperties = {
    background: 'transparent',
    border: 'none',
    fontSize: 24,
    cursor: 'pointer',
    color: highContrastMode ? '#ffffff' : '#1f2937',
    padding: 0,
  };

  if (loading) {
    return (
      <div style={panelStyle} role="dialog" aria-label="Weather details loading">
        <div style={{ textAlign: 'center', marginTop: 40 }}>Loading weather details...</div>
      </div>
    );
  }

  return (
    <div style={panelStyle} role="dialog" aria-label="Weather details panel">
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
          {weather?.facilityName || 'Weather Details'}
        </h2>
        <button
          onClick={onClose}
          style={buttonStyle}
          aria-label="Close weather details"
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Current Weather */}
      {weather?.weather && (
        <div style={sectionStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Current Conditions</h3>
          <div
            style={{
              padding: 16,
              background: highContrastMode ? '#1a1a1a' : '#f9fafb',
              borderRadius: 8,
              border: highContrastMode ? '1px solid #ffffff' : '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontSize: 36, fontWeight: 'bold', marginBottom: 8 }}>
              {Math.round(weather.weather.temperature)}°C
            </div>
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 12 }}>
              Feels like {Math.round(weather.weather.feelsLike)}°C
            </div>
            <div style={{ fontSize: 14, marginBottom: 4 }}>💧 Humidity: {weather.weather.humidity}%</div>
            <div style={{ fontSize: 14, marginBottom: 4 }}>
              💨 Wind: {weather.weather.windSpeed} m/s
            </div>
            <div style={{ fontSize: 14, marginBottom: 4 }}>
              🎯 Pressure: {weather.weather.pressure} hPa
            </div>
            <div style={{ fontSize: 14, textTransform: 'capitalize' }}>
              {weather.weather.description}
            </div>
          </div>
        </div>
      )}

      {/* Weather Alerts */}
      {weather?.weather?.alerts && weather.weather.alerts.length > 0 && (
        <div style={sectionStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>⚠️ Active Alerts</h3>
          {weather.weather.alerts.map((alert, idx) => (
            <div
              key={idx}
              style={{
                padding: 12,
                background: getAlertColor(alert.severity),
                color: 'white',
                borderRadius: 8,
                marginBottom: 8,
                fontSize: 14,
              }}
              role="alert"
            >
              <div style={{ fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>
                {alert.severity} {alert.type} Alert
              </div>
              <div>{alert.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* 7-Day Forecast */}
      {forecast && forecast.length > 0 && (
        <div style={sectionStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>7-Day Forecast</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {forecast.map((day, idx) => (
              <div
                key={idx}
                style={{
                  padding: 12,
                  background: highContrastMode ? '#1a1a1a' : '#f9fafb',
                  borderRadius: 8,
                  border: highContrastMode ? '1px solid #ffffff' : '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500 }}>{formatDate(day.date)}</div>
                <div style={{ fontSize: 12, opacity: 0.8, flex: 1, marginLeft: 12 }}>
                  {day.description}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {Math.round(day.temperature.max)}° / {Math.round(day.temperature.min)}°
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weather Correlation Analysis */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          Historical Correlation
        </h3>
        {!showCorrelation ? (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 14, marginBottom: 4, display: 'block' }}>
                Analysis Period (days):
              </label>
              <select
                value={correlationDays}
                onChange={(e) => setCorrelationDays(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 6,
                  border: highContrastMode ? '1px solid #ffffff' : '1px solid #e5e7eb',
                  background: highContrastMode ? '#1a1a1a' : '#ffffff',
                  color: highContrastMode ? '#ffffff' : '#1f2937',
                }}
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
            <button
              onClick={handleLoadCorrelation}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: highContrastMode ? '1px solid #ffffff' : '1px solid #3b82f6',
                background: highContrastMode ? '#000000' : '#3b82f6',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Load Correlation Analysis
            </button>
          </div>
        ) : correlation ? (
          <div>
            <div
              style={{
                padding: 12,
                background: highContrastMode ? '#1a1a1a' : '#f9fafb',
                borderRadius: 8,
                border: highContrastMode ? '1px solid #ffffff' : '1px solid #e5e7eb',
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                Correlation Coefficients
              </div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                Temperature vs SoC:{' '}
                <strong>{correlation.correlation.temperatureVsSoC.toFixed(3)}</strong>
              </div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                Temperature vs SoH:{' '}
                <strong>{correlation.correlation.temperatureVsSoH.toFixed(3)}</strong>
              </div>
              <div style={{ fontSize: 13 }}>
                Temperature vs Alerts:{' '}
                <strong>{correlation.correlation.temperatureVsAlerts.toFixed(3)}</strong>
              </div>
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Analysis period: {correlation.startDate} to {correlation.endDate}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 14, opacity: 0.7 }}>Loading correlation data...</div>
        )}
      </div>
    </div>
  );
}
