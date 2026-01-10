import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FacilityPopup } from '../FacilityPopup';
import type { FacilityLocation } from '../../types/facilityMap';

const mockFacility: FacilityLocation = {
  id: 'test-facility-1',
  name: 'Test Energy Facility',
  location: 'Bangkok, Thailand',
  coordinates: { latitude: 13.7563, longitude: 100.5018 },
  timezone: 'Asia/Bangkok',
  totalZones: 5,
  status: 'active',
  healthStatus: 'healthy',
  healthScore: 92,
  activeAlerts: 0,
  lastUpdated: new Date('2024-01-15T10:30:00Z').toISOString(),
};

describe('FacilityPopup', () => {
  it('renders facility name', () => {
    render(<FacilityPopup facility={mockFacility} />);
    expect(screen.getByText('Test Energy Facility')).toBeInTheDocument();
  });

  it('renders facility location', () => {
    render(<FacilityPopup facility={mockFacility} />);
    expect(screen.getByText('Bangkok, Thailand')).toBeInTheDocument();
  });

  it('displays health status', () => {
    render(<FacilityPopup facility={mockFacility} />);
    expect(screen.getByText('healthy')).toBeInTheDocument();
  });

  it('displays health score', () => {
    render(<FacilityPopup facility={mockFacility} />);
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('displays zone count', () => {
    render(<FacilityPopup facility={mockFacility} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Zones')).toBeInTheDocument();
  });

  it('displays active alerts count', () => {
    render(<FacilityPopup facility={mockFacility} />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Active Alerts')).toBeInTheDocument();
  });

  it('shows view details button when handler provided', () => {
    const onViewDetails = vi.fn();
    render(<FacilityPopup facility={mockFacility} onViewDetails={onViewDetails} />);

    const button = screen.getByRole('button', { name: /view details/i });
    expect(button).toBeInTheDocument();
  });

  it('calls onViewDetails when button clicked', () => {
    const onViewDetails = vi.fn();
    render(<FacilityPopup facility={mockFacility} onViewDetails={onViewDetails} />);

    const button = screen.getByRole('button', { name: /view details/i });
    fireEvent.click(button);

    expect(onViewDetails).toHaveBeenCalledTimes(1);
  });

  it('does not show button when onViewDetails not provided', () => {
    render(<FacilityPopup facility={mockFacility} />);
    expect(screen.queryByRole('button', { name: /view details/i })).not.toBeInTheDocument();
  });

  it('renders correctly for facility with critical status', () => {
    const criticalFacility: FacilityLocation = {
      ...mockFacility,
      healthStatus: 'critical',
      healthScore: 35,
      activeAlerts: 3,
    };

    render(<FacilityPopup facility={criticalFacility} />);
    expect(screen.getByText('critical')).toBeInTheDocument();
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders correctly for facility with warning status', () => {
    const warningFacility: FacilityLocation = {
      ...mockFacility,
      healthStatus: 'warning',
      healthScore: 68,
      activeAlerts: 2,
    };

    render(<FacilityPopup facility={warningFacility} />);
    expect(screen.getByText('warning')).toBeInTheDocument();
    expect(screen.getByText('68%')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
