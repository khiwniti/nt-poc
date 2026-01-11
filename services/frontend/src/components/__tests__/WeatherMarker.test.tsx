import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeatherMarker } from '../WeatherMarker';
import type { WeatherData } from '../../types/weather';

describe('WeatherMarker', () => {
  const mockWeatherData: WeatherData = {
    temperature: 22,
    feelsLike: 20,
    humidity: 65,
    pressure: 1013,
    windSpeed: 5.5,
    windDirection: 180,
    description: 'clear sky',
    icon: '01d',
    timestamp: Date.now(),
  };

  const mockPosition = { xPercent: 50, yPercent: 50 };

  it('should render weather marker with temperature', () => {
    render(
      <WeatherMarker
        weather={mockWeatherData}
        position={mockPosition}
        facilityName="Test Facility"
      />
    );

    expect(screen.getByText('22°C')).toBeInTheDocument();
    expect(screen.getByText('clear sky')).toBeInTheDocument();
  });

  it('should display weather alerts badge when alerts exist', () => {
    const weatherWithAlert: WeatherData = {
      ...mockWeatherData,
      temperature: 42,
      alerts: [
        {
          severity: 'extreme',
          type: 'heat',
          message: 'Extreme heat warning',
          temperature: 42,
        },
      ],
    };

    render(
      <WeatherMarker
        weather={weatherWithAlert}
        position={mockPosition}
        facilityName="Test Facility"
      />
    );

    expect(screen.getByTitle('Extreme heat warning')).toBeInTheDocument();
    expect(screen.getByLabelText('Weather alert')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();

    render(
      <WeatherMarker
        weather={mockWeatherData}
        position={mockPosition}
        facilityName="Test Facility"
        onClick={handleClick}
      />
    );

    const marker = screen.getByRole('button');
    marker.click();

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should apply high contrast mode styles', () => {
    render(
      <WeatherMarker
        weather={mockWeatherData}
        position={mockPosition}
        facilityName="Test Facility"
        highContrastMode={true}
      />
    );

    const marker = screen.getByTestId('weather-marker-Test Facility');
    expect(marker).toBeInTheDocument();
  });

  it('should display correct weather emoji for icon code', () => {
    const rainWeather: WeatherData = {
      ...mockWeatherData,
      icon: '10d',
      description: 'rain',
    };

    render(
      <WeatherMarker
        weather={rainWeather}
        position={mockPosition}
        facilityName="Test Facility"
      />
    );

    expect(screen.getByRole('img', { name: 'rain' })).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(
      <WeatherMarker
        weather={mockWeatherData}
        position={mockPosition}
        facilityName="Test Facility"
        onClick={vi.fn()}
      />
    );

    const marker = screen.getByRole('button');
    expect(marker).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Weather at Test Facility')
    );
    expect(marker).toHaveAttribute('tabIndex', '0');
  });
});
